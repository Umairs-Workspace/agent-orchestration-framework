import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runStore as store } from "./support/run-store.mjs";
import { resolveExecution } from "../src/runtime-selection.mjs";
import { normalizeCodexActivity } from "../src/runtime-events.mjs";

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
