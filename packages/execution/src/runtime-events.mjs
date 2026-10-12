// Metadata only. Codex cache/reasoning are subsets of input/output, never extra buckets.
const named = value => typeof value === "string" && value.length > 0;
const count = value => Number.isSafeInteger(value) && value >= 0;
const fields = Object.freeze({ input: "inputTokens", output: "outputTokens", cacheRead: "cachedInputTokens",
  cacheCreate: "cacheWriteInputTokens", reasoningOutput: "reasoningOutputTokens", total: "totalTokens" });
const empty = () => Object.fromEntries(Object.keys(fields).map(key => [key, null]));
const error = () => Object.assign(new Error("Native observation requires attributable metadata"), { code: "runtime-observation-invalid", status: 400 });
const latestAt = (a, b) => a == null || Date.parse(b) > Date.parse(a) ? b : a;

// Observation state is not a permission cache. Only native terminal facts carry decisions.
export function reducePermissionReviews(reviews = [], event) {
  if (!named(event.reviewId) || !["inProgress", "approved", "denied", "timedOut", "aborted"].includes(event.status)
    || !["command", "execve", "writeStdin", "applyPatch", "networkAccess", "mcpToolCall", "requestPermissions"].includes(event.actionType)
    || (event.targetItemId !== null && !named(event.targetItemId)) || !count(event.startedAtMs)
    || (event.status !== "inProgress" && (!count(event.completedAtMs) || event.completedAtMs < event.startedAtMs || event.decisionSource !== "agent"))) throw error();
  const row = Object.fromEntries(["reviewId", "targetItemId", "actionType", "status", "startedAtMs", "completedAtMs", "decisionSource"]
    .filter(key => Object.hasOwn(event, key)).map(key => [key, event[key]]));
  const prior = reviews.find(value => value.reviewId === row.reviewId);
  if (prior) {
    if (["targetItemId", "actionType", "startedAtMs"].some(key => prior[key] !== row[key])) throw error();
    if (row.status === "inProgress" && prior.startObserved) return reviews;
    if (prior.status !== "inProgress" || prior.observationState !== "pending") {
      const same = Object.keys(row).every(key => prior[key] === row[key]);
      if (!same) throw error();
      return reviews;
    }
    if (row.status === "inProgress") return reviews;
  }
  const observationState = row.status === "inProgress" ? "pending" : "observed-completion";
  return [...reviews.filter(value => value.reviewId !== row.reviewId), { ...row, observationState,
    startObserved: prior?.startObserved ?? row.status === "inProgress" }];
}

export function settleRuntimeReviews(record, outcome) {
  const prior = record.brief?.runtimeObservation;
  if (record.execution?.runtime !== "codex" || !prior?.turns?.some(turn => turn.reviews?.some(row => row.observationState === "pending"))) return record.brief;
  if (outcome === "done") throw Object.assign(new Error("Native review evidence is incomplete"), { code: "runtime-review-incomplete", status: 409 });
  return { ...record.brief, runtimeObservation: { ...prior, turns: prior.turns.map(turn => ({ ...turn,
    ...(turn.reviews == null ? {} : { activity: null, reviews: turn.reviews.map(row => row.observationState === "pending"
      ? { ...row, observationState: outcome === "cancelled" ? "interrupted" : "unknown" } : row) }),
  })) } };
}

export function normalizeCodexActivity(method, params, sessionId, turnId, at) {
  if (!named(sessionId) || !named(turnId) || params?.threadId !== sessionId || params.turnId !== turnId) return null;
  let kind = null;
  if (method === "item/agentMessage/delta" && named(params.delta)) kind = "text";
  if (["item/started", "item/completed"].includes(method)) {
    if (params.item?.type === "agentMessage" && named(params.item.text)) kind = "text";
    if (["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "webSearch", "imageView"].includes(params.item?.type)) kind = "tool";
  }
  return kind == null ? null : { kind, sessionId, turnId, at };
}

// Pure reduction, loaned history. The run store remains the sole disk writer.
// Claim each turn before events; replay cannot transfer an already owned turn.
export function reduceRuntimeObservation(record, history, event) {
  if (record.execution?.runtime !== "codex" || !named(event?.sessionId) || !named(event.turnId)
    || record.sessionId !== event.sessionId || !["turn", "usage", "text", "tool", "permission-review", "permission-review-interrupted"].includes(event.kind)) throw error();
  const prior = record.brief?.runtimeObservation;
  const otherTurns = history.filter(run => run.runId !== record.runId && run.execution?.runtime === "codex")
    .flatMap(run => run.brief?.runtimeObservation?.turns ?? []);
  if (otherTurns.some(turn => turn.sessionId === event.sessionId && turn.turnId === event.turnId)) return prior ?? null;
  const observation = structuredClone(prior ?? { version: 1, runtime: "codex", turns: [], tokens: null,
    costUsd: null, costUnavailable: "native-cost-not-reported", usageUnavailable: "native-usage-not-reported", lastActivityAt: null });
  let turn = observation.turns.find(row => row.sessionId === event.sessionId && row.turnId === event.turnId);
  if (event.kind === "turn") {
    if (turn) return prior;
    if (typeof event.resumed !== "boolean") throw error();
    const previous = [...otherTurns, ...observation.turns].filter(row => row.sessionId === event.sessionId);
    const baseline = Object.fromEntries(Object.keys(fields).map(key => {
      const values = previous.map(row => row.latest?.[key]).filter(count);
      return [key, event.resumed ? (values.length ? Math.max(...values) : null) : 0];
    }));
    turn = { sessionId: event.sessionId, turnId: event.turnId, baseline, latest: empty(), tokens: null, lastActivityAt: null };
    if (event.approvalsReviewer === "auto_review" && event.approvalPolicy === "on-request") {
      turn.approvalsReviewer = event.approvalsReviewer; turn.approvalPolicy = event.approvalPolicy;
    }
    observation.turns.push(turn);
  } else {
    if (!turn) throw error();
    if (event.kind === "permission-review" || event.kind === "permission-review-interrupted") {
      if (event.kind === "permission-review") turn.reviews = reducePermissionReviews(turn.reviews, event);
      else {
        if (!["unknown", "interrupted"].includes(event.observationState)) throw error();
        turn.reviews = (turn.reviews ?? []).map(row => row.observationState === "pending" ? { ...row, observationState: event.observationState } : row);
      }
      turn.activity = turn.reviews.some(row => row.observationState === "pending") ? "waiting-for-permission" : null;
    } else if (event.kind === "usage") {
      turn.tokens ??= empty();
      for (const [key, native] of Object.entries(fields)) {
        if (!count(event.total?.[native])) continue;
        turn.latest[key] = Math.max(turn.latest[key] ?? 0, event.total[native]);
        if (turn.baseline[key] != null) turn.tokens[key] = Math.max(turn.tokens[key] ?? 0, turn.latest[key] - turn.baseline[key]);
      }
    } else {
      if (!Number.isFinite(Date.parse(event.at))) throw error();
      turn.lastActivityAt = latestAt(turn.lastActivityAt, event.at);
      observation.lastActivityAt = latestAt(observation.lastActivityAt, event.at);
    }
  }
  const tokens = Object.fromEntries(Object.keys(fields).map(key => {
    const values = observation.turns.map(row => row.tokens?.[key]);
    return [key, values.every(count) ? values.reduce((sum, value) => sum + value, 0) : null];
  }));
  observation.tokens = Object.values(tokens).some(count) ? tokens : null;
  observation.usageUnavailable = observation.tokens == null
    ? observation.turns.some(row => row.tokens != null) ? "native-usage-baseline-unavailable" : "native-usage-not-reported" : null;
  return observation;
}
