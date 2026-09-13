// Deterministic counter-metrics for the review and autonomous-cascade loops
// (57/04), and — added beside them by 61/04 — the acceptor's TRIAL METRIC
// (61/ADR-002 §7). The repository edge supplies already-read item, feedback and
// run records; this leaf performs arithmetic only and writes nothing.
//
// ONE COUNTERS HOME, NOT TWO. `roundsToAccept` lands here rather than in a module
// of the acceptor's own because this leaf is already the deterministic-counter
// home, and a system whose whole subject is not having two of anything may not
// open a second one (61/ADR-002 §7). The acceptor holds only a POINTER at it; the
// engine spells no metric name.
//
// EVERY READING DECLARES ITS OWN POLARITY AND ITS OWN COMPARABLE VALUE. `better`
// says which direction is an improvement and `value` is the single number two arms
// are compared on. Both are the METRIC's declaration, made here where the metric
// lives, because the alternative is a polarity table in the engine — and a table
// keyed by metric name is the engine naming the metric, which 61/ADR-002 §5
// refuses. A reading that could not be taken carries `value: null`, never 0: a
// comparison nobody could perform is not a comparison that came out even.

export const COUNTER_STATUS = Object.freeze({
  MEASURED: "measured",
  UNMEASURABLE: "unmeasurable",
});

// Lower is better for all three: fewer rounds to accept, fewer escapes after
// accepting, fewer interventions.
export const LOWER_IS_BETTER = "lower";

const DEFAULT_RETRYABLE_REASONS = new Set(["runtime_offline", "timeout", "session_limit"]);

function instant(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const text = value.trim();
  // Native work records stamp lifecycle moves as dates. Treat that coarse
  // acceptance observation conservatively: only feedback on a later day is an
  // escape. Injected/full ISO instants retain their exact ordering.
  const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/u.test(text) ? `${text}T23:59:59.999Z` : text);
  return Number.isFinite(parsed) ? parsed : null;
}

function unmeasurable(kind, reason, extra = {}) {
  return { kind, status: COUNTER_STATUS.UNMEASURABLE, better: LOWER_IS_BETTER, value: null, reason, ...extra };
}

function rawFeedback(records) {
  return (records ?? []).filter((record) => record?.kind === "raw" && instant(record.at) != null);
}

export function countFindingEscapes(items = []) {
  const accepted = (items ?? [])
    .map((item) => ({ ...item, acceptedAtMs: instant(item?.acceptedAt) }))
    .filter((item) => item.status === "done" && item.acceptedAtMs != null);

  if (accepted.length === 0) {
    return unmeasurable("escape", "accepted-items-absent", {
      measuredItems: 0,
      unmeasuredItems: (items ?? []).length,
      items: [],
    });
  }

  const measured = [];
  const missing = [];
  for (const item of accepted) {
    const records = rawFeedback(item.feedbackRecords);
    if (records.length === 0) {
      missing.push(item.ref);
      continue;
    }
    const escapes = records.filter((record) => instant(record.at) > item.acceptedAtMs);
    measured.push({
      ref: item.ref,
      count: escapes.length,
      feedbackRecords: records.length,
      escapes: escapes.map((record) => ({ id: record.id, at: record.at })),
    });
  }

  if (measured.length === 0) {
    return unmeasurable("escape", "feedback-absent", {
      measuredItems: 0,
      unmeasuredItems: missing.length,
      items: [],
    });
  }

  const escapes = measured.reduce((sum, item) => sum + item.count, 0);
  return {
    kind: "escape",
    status: COUNTER_STATUS.MEASURED,
    better: LOWER_IS_BETTER,
    value: escapes,
    count: escapes,
    feedbackRecords: measured.reduce((sum, item) => sum + item.feedbackRecords, 0),
    measuredItems: measured.length,
    unmeasuredItems: missing.length,
    missing,
    items: measured,
  };
}

// ── THE TRIAL METRIC (61/ADR-002 §1, §6) ─────────────────────────────────────
//
// `rounds-to-accept` — the agent rounds an item consumed between its first
// `run.started` and its transition into `done`. It is the metric because it is the
// one quantity ALL THREE admitted knobs move: a metric only one knob moves makes
// the other two structurally silent, which is the §5 hazard installed by choice.
//
// AN ARM IS UNMEASURABLE WHENEVER THE ATTRIBUTION IS ABSENT, AND THAT IS NOT ZERO.
// A round can only be counted against a harness configuration if the run that
// consumed it can be attributed to a session; `sessionId` is null in 61 of 61
// records at HEAD, so at HEAD every arm is unmeasurable and this function says so
// by name rather than returning a count of 0 as though it had looked. Calling that
// a tie would discard evidence never gathered; calling it favourable would
// fabricate it (61/ADR-002 §6).
const attributed = (run) => typeof run?.sessionId === "string" && run.sessionId.length > 0;

export function roundsToAccept(items = []) {
  const accepted = (items ?? [])
    .map((item) => ({ ...item, acceptedAtMs: instant(item?.acceptedAt) }))
    .filter((item) => item.status === "done" && item.acceptedAtMs != null);

  if (accepted.length === 0) {
    return unmeasurable("rounds", "accepted-items-absent", {
      measuredItems: 0,
      unmeasuredItems: (items ?? []).length,
      items: [],
    });
  }

  const measured = [];
  const missing = [];
  for (const item of accepted) {
    const runs = Array.isArray(item?.runs) ? item.runs : [];
    // The rounds an item consumed ON ITS WAY IN: a run minted after the item was
    // accepted belongs to whatever happened next, not to the cost of accepting it.
    const consumed = runs.filter((run) => {
      const at = instant(run?.createdAt ?? run?.startedAt);
      return at != null && at <= item.acceptedAtMs;
    });
    const countable = consumed.filter(attributed);
    if (consumed.length === 0 || countable.length !== consumed.length) {
      missing.push(item.ref);
      continue;
    }
    measured.push({ ref: item.ref, count: countable.length, runs: runs.length });
  }

  if (measured.length === 0) {
    return unmeasurable("rounds", "run-attribution-absent", {
      measuredItems: 0,
      unmeasuredItems: missing.length,
      items: [],
      missing,
    });
  }

  const rounds = measured.reduce((sum, item) => sum + item.count, 0);
  return {
    kind: "rounds",
    status: COUNTER_STATUS.MEASURED,
    better: LOWER_IS_BETTER,
    // The arm's comparable reading is rounds PER accepted item: two arms that
    // accepted different numbers of items are otherwise compared on their sizes.
    value: rounds / measured.length,
    count: rounds,
    rounds,
    measuredItems: measured.length,
    unmeasuredItems: missing.length,
    missing,
    items: measured,
  };
}

function terminalFailure(run) {
  return run?.state === "failed" || run?.outcome === "failed";
}

function interventionEvents(runs, { maxAttempts, isRetryableReason }) {
  const byId = new Map(runs.map((run) => [run.runId, run]));
  const events = [];
  for (const run of runs) {
    if (run?.retryOf != null) {
      const prior = byId.get(run.retryOf);
      events.push({
        runId: run.runId,
        kind: prior?.resumeAfter != null ? "resume" : "retry",
      });
      // The rate is "runs that needed intervention / runs observed". A retried
      // run is one intervened run even if that same attempt later terminates in
      // failure; counting both facts would let count exceed its run denominator.
      continue;
    }
    if (!terminalFailure(run) || typeof run.failureReason !== "string" || run.failureReason === "") continue;
    const retryable = isRetryableReason(run.failureReason);
    const exhausted = run.failureReason === "attempts_exhausted"
      || (retryable && Number.isSafeInteger(run.attempt) && run.attempt >= maxAttempts);
    if (exhausted) events.push({ runId: run.runId, kind: "attempts-exhausted" });
    else if (!retryable) events.push({ runId: run.runId, kind: "non-retryable-failure" });
  }
  return events;
}

export function countInterventions(items = [], {
  maxAttempts = 3,
  isRetryableReason = (reason) => DEFAULT_RETRYABLE_REASONS.has(reason),
} = {}) {
  const ceiling = Number.isSafeInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 3;
  const measured = [];
  const missing = [];
  for (const item of items ?? []) {
    const runs = Array.isArray(item?.runs) ? item.runs : [];
    if (runs.length === 0) {
      missing.push(item?.ref ?? null);
      continue;
    }
    const events = interventionEvents(runs, { maxAttempts: ceiling, isRetryableReason });
    measured.push({ ref: item.ref, count: events.length, runs: runs.length, interventions: events });
  }

  if (measured.length === 0) {
    return unmeasurable("intervention", "runs-absent", {
      measuredItems: 0,
      unmeasuredItems: missing.length,
      items: [],
    });
  }

  const count = measured.reduce((sum, item) => sum + item.count, 0);
  const runs = measured.reduce((sum, item) => sum + item.runs, 0);
  return {
    kind: "intervention",
    status: COUNTER_STATUS.MEASURED,
    better: LOWER_IS_BETTER,
    value: count / runs,
    count,
    runs,
    rate: count / runs,
    measuredItems: measured.length,
    unmeasuredItems: missing.length,
    missing,
    items: measured,
  };
}

export function computeWorkCounters(items = [], options = {}) {
  return {
    escape: countFindingEscapes(items),
    intervention: countInterventions(items, options),
  };
}
