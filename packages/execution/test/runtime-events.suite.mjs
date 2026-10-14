import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runStore as store } from "./support/run-store.mjs";
import { resolveExecution } from "../src/runtime-selection.mjs";
import { normalizeCodexActivity } from "../src/runtime-events.mjs";
import { codexFixture, reviewFrame, finishFrames } from "./codex-app-server.suite.mjs";
import { createRuntimeSession } from "../src/runtime-session.mjs";

const execution = resolveExecution({}, { runtime: "codex", capabilities: { codex: { models: [{ id: "native", model: "native", isDefault: true,
  defaultReasoningEffort: "low", supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "ultra"].map(reasoningEffort => ({ reasoningEffort })) }] } } });
const total = (input, output = 20) => ({ inputTokens: input, outputTokens: output, totalTokens: input + output, cachedInputTokens: 7, reasoningOutputTokens: 2 });
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-native-facts-"));
  const item = { ref: "154/08", dir: path.join(root, "item") }; await mkdir(item.dir);
  const record = await store.startRun(item, { sessionId: "native-thread", execution });
  const event = (kind, turnId, extra = {}, runId = record.runId) => store.recordRuntimeEvent(item, { runId, event: { kind, sessionId: "native-thread", turnId, ...extra } });
  const read = async (runId = record.runId) => (await store.readRuns(item)).find(row => row.runId === runId);
  try { await run({ item, record, event, read }); } finally { await rm(root, { recursive: true, force: true }); }
}

export const runtimeEventsTests = [
  { name: "158 task02 E2 — an ordinary approve answer cannot decide a pending native review", run: () => fixture(async ({ item, record, event, read }) => {
    await event("turn", "turn-1", { resumed: false });
    await event("permission-review", "turn-1", { reviewId: "r", targetItemId: "i", actionType: "command", status: "inProgress", startedAtMs: 10 });
    const before = (await read()).brief.runtimeObservation;
    await store.openRunAsk(item, record.runId, { question: "Approve the proposed product wording?", phase: "continue" });
    await store.answerRunAsk(item, record.runId, { answer: "approve" });
    const after = await read(); assert.equal(after.asks[0].answer, "approve");
    assert.deepEqual(after.brief.runtimeObservation, before);
  }) },
  ...["failed", "cancelled", "reclaimed"].map(outcome => ({ name: `158 task03 — ${outcome} owner leaves unknown review evidence without a grant`, run: () => fixture(async ({ item, record, event, read }) => {
    await event("turn", "turn-1", { resumed: false });
    await event("permission-review", "turn-1", { reviewId: "r", targetItemId: "i", actionType: "command", status: "inProgress", startedAtMs: 10 });
    await assert.rejects(store.completeRun(item, { runId: record.runId, outcome: "done" }), { code: "runtime-review-incomplete" });
    if (outcome === "reclaimed") await store.reclaimRun(item, record.runId);
    else await store.completeRun(item, { runId: record.runId, outcome });
    const row = (await read()).brief.runtimeObservation.turns[0];
    assert.equal(row.activity, null); assert.equal(row.reviews[0].status, "inProgress");
    assert.equal(row.reviews[0].observationState, outcome === "cancelled" ? "interrupted" : "unknown");
  }) })),
  { name: "158 task01 E6 E7 task02 E2 — real native review persists in its run without counting useful work", run: () => fixture(async ({ item, record, read }) => {
    const p = codexFixture({ onStart: ({ emit }) => emit(reviewFrame(), reviewFrame("inProgress", { reviewId: "review-8" }), reviewFrame("approved"), reviewFrame("denied", { reviewId: "review-8" }), ...finishFrames()) });
    const boundary = createRuntimeSession({ adapters: { codex: p.adapter } });
    const states = [];
    const r = await boundary.drive(p.brief, { ...p.options, runtime: "codex",
      onIdentity: sessionId => store.recordSessionId(item, { runId: record.runId, sessionId }),
      onTurnStarted: e => store.recordRuntimeEvent(item, { runId: record.runId, event: { ...e, kind: "turn", resumed: false } }),
      onActivity: async event => {
        await store.recordRuntimeEvent(item, { runId: record.runId, event });
        if (event.kind === "permission-review") states.push((await read()).brief.runtimeObservation);
      },
    });
    assert.equal(r.outcome, "done");
    assert.deepEqual(states.map(s => s.turns[0].activity), ["waiting-for-permission", "waiting-for-permission", "waiting-for-permission", null]);
    assert.ok(states.every(s => s.lastActivityAt === null));
    assert.equal(states[3].turns[0].approvalsReviewer, "auto_review");
    assert.equal(states[3].turns[0].reviews[0].startObserved, true);
    assert.equal((await read()).asks.length, 0); assert.doesNotMatch(JSON.stringify(await read()), /CANARY/);
  }) },
  { name: "158 task02 — missing-start evidence and duplicate decisions persist without invented history", run: () => fixture(async ({ event, read }) => {
    await event("turn", "turn-1", { resumed: false });
    const review = { reviewId: "r", targetItemId: null, actionType: "networkAccess", status: "approved", startedAtMs: 10, completedAtMs: 20, decisionSource: "agent" };
    await event("permission-review", "turn-1", review);
    const prior = await read(); await event("permission-review", "turn-1", review); assert.deepEqual(await read(), prior);
    assert.equal(prior.brief.runtimeObservation.turns[0].reviews[0].startObserved, false);
    await assert.rejects(event("permission-review", "turn-1", { ...review, status: "denied" }), { code: "runtime-observation-invalid" });
    assert.deepEqual(await read(), prior);
  }) },
  { name: "158 task01 E7 task03 — equal ids and persisted decisions cannot cross lanes or authorize restart", run: () => fixture(async ({ item, record, event, read }) => {
    const review = { reviewId: "review-7", targetItemId: "item", actionType: "command", status: "inProgress", startedAtMs: 10 };
    await event("turn", "turn-1", { resumed: false }); await event("permission-review", "turn-1", review);
    await event("permission-review-interrupted", "turn-1", { observationState: "unknown" });
    await store.completeRun(item, { runId: record.runId, outcome: "failed", failureReason: "timeout" });
    const prior = await read(); const next = await store.startRun(item, { sessionId: "native-thread", execution });
    await event("turn", "turn-2", { resumed: true }, next.runId);
    await event("permission-review", "turn-2", review, next.runId);
    await event("permission-review", "turn-1", { ...review, status: "approved", completedAtMs: 20, decisionSource: "agent" }, next.runId);
    assert.equal((await read(next.runId)).brief.runtimeObservation.turns[0].reviews[0].status, "inProgress");
    assert.deepEqual(await read(), prior);
    assert.equal(prior.brief.runtimeObservation.turns[0].reviews[0].status, "inProgress");
    assert.equal(prior.brief.runtimeObservation.turns[0].reviews[0].observationState, "unknown");
  }) },
  { name: "154/08 task00 — E1 repeated cumulative usage counts once with native thread and turn", run: () => fixture(async ({ event, read, item, record }) => {
    await event("turn", "turn-1", { resumed: false });
    await event("usage", "turn-1", { total: total(100) });
    const bytes = await readFile(store.runRecordPath(item, record.runId), "utf8");
    await event("usage", "turn-1", { total: total(100) });
    assert.equal(await readFile(store.runRecordPath(item, record.runId), "utf8"), bytes);
    const observation = (await read()).brief.runtimeObservation;
    assert.equal(observation.tokens.input, 100); assert.equal(observation.tokens.output, 20);
    assert.equal(observation.turns[0].sessionId, "native-thread"); assert.equal(observation.turns[0].turnId, "turn-1");
  }) },
  { name: "154/08 task00 — E2 tokens do not invent monetary cost or subscription zero", run: () => fixture(async ({ event, read }) => {
    await event("turn", "turn-1", { resumed: false }); await event("usage", "turn-1", { total: total(100) });
    const record = await read(); assert.equal(record.spend, null);
    assert.equal(record.brief.runtimeObservation.costUsd, null); assert.equal(record.brief.runtimeObservation.costUnavailable, "native-cost-not-reported");
  }) },
  ...["cumulative 100 then 150", "replayed settled turn", "two new turns", "older counter", "no usage", "unknown fields"].map(scenario => ({
    name: `154/08 task00 — Usage aggregation does not cross run boundaries: ${scenario}`,
    run: () => fixture(async ({ item, record, event, read }) => {
      await event("turn", "turn-1", { resumed: false });
      if (scenario !== "no usage") await event("usage", "turn-1", { total: { ...total(100), ...(scenario === "unknown fields" ? { arbitrary: "do not retain" } : {}) } });
      if (scenario === "cumulative 100 then 150") await event("usage", "turn-1", { total: total(150) });
      if (scenario === "older counter") await event("usage", "turn-1", { total: total(50, 10) });
      if (scenario === "two new turns") { await event("turn", "turn-2", { resumed: true }); await event("usage", "turn-2", { total: total(150, 30) }); }
      if (scenario === "replayed settled turn") {
        await store.completeRun(item, { runId: record.runId, outcome: "done" });
        const next = await store.startRun(item, { sessionId: "native-thread", execution });
        await event("turn", "turn-1", { resumed: true }, next.runId); await event("usage", "turn-1", { total: total(100) }, next.runId);
        assert.equal((await read(next.runId)).brief.runtimeObservation, undefined); return;
      }
      const observation = (await read()).brief.runtimeObservation;
      if (scenario === "no usage") { assert.equal(observation.tokens, null); assert.equal(observation.usageUnavailable, "native-usage-not-reported"); }
      else { assert.equal(observation.tokens.input, ["cumulative 100 then 150", "two new turns"].includes(scenario) ? 150 : 100); assert.ok(!JSON.stringify(observation).includes("arbitrary")); assert.equal(observation.tokens.cacheCreate, null, "an absent native field is unavailable, never zero"); }
    }),
  })),
  { name: "154/08 task00 — resumed run counts only new thread counter deltas and keeps earlier records unchanged", run: () => fixture(async ({ item, record, event, read }) => {
    await event("turn", "turn-1", { resumed: false }); await event("usage", "turn-1", { total: total(100) });
    await store.completeRun(item, { runId: record.runId, outcome: "done" }); const prior = await read();
    const next = await store.startRun(item, { sessionId: "native-thread", execution });
    await event("turn", "turn-2", { resumed: true }, next.runId); await event("usage", "turn-2", { total: total(150, 30) }, next.runId);
    assert.equal((await read(next.runId)).brief.runtimeObservation.tokens.input, 50); assert.equal((await read(next.runId)).brief.runtimeObservation.tokens.output, 10);
    assert.deepEqual(await read(), prior);
  }) },
  { name: "154/08 task00 — unknown resume baseline remains unavailable and partial known fields survive", run: () => fixture(async ({ event, read }) => {
    await event("turn", "turn-1", { resumed: true }); await event("usage", "turn-1", { total: total(999) });
    let observation = (await read()).brief.runtimeObservation;
    assert.equal(observation.tokens, null); assert.equal(observation.usageUnavailable, "native-usage-baseline-unavailable");
    assert.equal(observation.turns[0].latest.input, 999);
  }) },
  { name: "154/08 task01 — liveness and useful progress persist independently without record overwrite", run: () => fixture(async ({ item, record, event, read }) => {
    await event("turn", "turn-1", { resumed: false });
    await Promise.all([store.heartbeat(item, record.runId, { now: "2026-10-07T20:00:00.000Z" }), event("usage", "turn-1", { total: total(100) })]);
    let row = await read(); assert.equal(row.heartbeatAt, "2026-10-07T20:00:00.000Z"); assert.equal(row.brief.runtimeObservation.tokens.input, 100); assert.equal(row.brief.runtimeObservation.lastActivityAt, null);
    await event("text", "turn-1", { at: "2026-10-07T20:01:00.000Z" });
    row = await read(); assert.equal(row.brief.runtimeObservation.lastActivityAt, "2026-10-07T20:01:00.000Z"); assert.equal(row.heartbeatAt, "2026-10-07T20:00:00.000Z"); assert.equal(row.createdAt, record.createdAt);
    await Promise.all([event("usage", "turn-1", { total: total(150) }), store.reclaimStaleRuns([item], { now: "2026-10-11T20:00:00.000Z", stalenessThreshold: 1 })]);
    row = await read(); assert.equal(row.state, "failed"); assert.equal(row.failureReason, "runtime_offline"); assert.equal(row.brief.runtimeObservation.tokens.input, 150, "array-wide reclaim shares each item's write queue");
  }) },
  { name: "154/08 task01 — only attributable text and tool events normalize; protocol noise and content are discarded", run() {
    const params = { threadId: "thread", turnId: "turn", delta: "sensitive text" };
    assert.deepEqual(normalizeCodexActivity("item/agentMessage/delta", params, "thread", "turn", "now"), { kind: "text", sessionId: "thread", turnId: "turn", at: "now" });
    assert.equal(normalizeCodexActivity("thread/tokenUsage/updated", params, "thread", "turn", "now"), null);
    assert.equal(normalizeCodexActivity("item/agentMessage/delta", params, "thread", "other", "now"), null);
    assert.equal(normalizeCodexActivity("item/started", { ...params, item: { type: "commandExecution", command: "sensitive" } }, "thread", "turn", "now").kind, "tool");
  } },
  { name: "154/08 task00 — invalid attribution writes nothing; retry never inherits old observations", run: () => fixture(async ({ item, record, event, read }) => {
    await assert.rejects(() => event("usage", "unowned", { total: total(100) }), error => error.code === "runtime-observation-invalid");
    await event("turn", "turn-1", { resumed: false }); await event("usage", "turn-1", { total: total(100) });
    await store.completeRun(item, { runId: record.runId, outcome: "failed", failureReason: "timeout" });
    const retry = await store.retryRun(item, { runId: record.runId }); assert.equal(retry.brief.runtimeObservation, undefined);
    assert.equal((await read()).brief.runtimeObservation.tokens.input, 100);
  }) },
];
