import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRunStore } from "@aof/execution/runs";
import { createRunSpendIngest } from "@aof/execution/spend";
import { createRunHeartbeats } from "@aof/execution/heartbeats";
import { createRunSessionCapture } from "@aof/execution/session-capture";
import { resolveExecution } from "@aof/execution/runtime-selection";

const at = "2026-09-28T10:00:00.000Z";
const codexExecution = () => resolveExecution({}, { runtime: "codex", capabilities: { codex: { models: [{ id: "native-test", model: "native-test", isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "high" }] }] } } });
const unexpected = () => assert.fail("unexpected collaborator call");
const store = (overrides = {}) => createRunStore({ reportDegrade: unexpected, getAnswerTokens: unexpected, readSessionAnswers: unexpected, ...overrides });
async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-execution-package-"));
  try { await run({ root, item: { ref: "42/01", dir: path.join(root, "item") } }); }
  finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

test("run services compose without executing collaborators and reject missing ports", () => {
  const runs = store();
  assert.ok(Object.isFrozen(runs));
  assert.ok(Object.isFrozen(createRunSpendIngest(runs)));
  assert.ok(Object.isFrozen(createRunHeartbeats({ ...runs, reportDegrade: unexpected })));
  assert.ok(Object.isFrozen(createRunSessionCapture({ ...runs, reportDegrade: unexpected })));
  assert.throws(() => createRunStore({}), /reportDegrade is required/);
  assert.throws(() => createRunSpendIngest({}), /readRuns is required/);
});

test("partitioned records preserve bytes on refused transitions and heartbeat only live runs", () => fixture(async ({ item }) => {
  const runs = store();
  const beats = createRunHeartbeats({ ...runs, reportDegrade: unexpected });
  const run = await runs.startRun(item, { now: at, node: "worker", brief: { opaque: { retained: true } } });
  const file = runs.runNodeRecordPath(item, "worker", run.runId);
  await beats.enqueueHeartbeat(item, run.runId, "2026-09-28T10:00:01.000Z");
  assert.equal(await beats.readConsumedHeartbeatAt(item, run.runId), "2026-09-28T10:00:01.000Z");
  await runs.completeRun(item, { runId: run.runId, outcome: "done", now: "2026-09-28T10:00:02.000Z" });
  const bytes = await readFile(file, "utf8");
  await assert.rejects(runs.applyTransition(item, run.runId, "running"), error => error.code === "illegal-transition");
  await beats.enqueueHeartbeat(item, run.runId, "2026-09-28T10:00:03.000Z");
  assert.equal(await readFile(file, "utf8"), bytes);
  assert.deepEqual((await runs.readRuns(item))[0].brief, { opaque: { retained: true } });
}));

test("completion composes local spend ingestion and supplied answer readers without a registry", () => fixture(async ({ item, root }) => {
  const projectsDir = path.join(root, "transcripts");
  await mkdir(projectsDir);
  await writeFile(path.join(projectsDir, "session.jsonl"), JSON.stringify({ type: "assistant", sessionId: "session", message: { model: "claude-sonnet", usage: { input_tokens: 7, output_tokens: 3 }, content: [{ type: "text", text: "done" }] } }) + "\n");
  let tokenReads = 0;
  const answer = { token: "test-token", question: "Choose?", answer: "A", toolUseId: "tool-1", sessionId: "session", at, entrypoint: null };
  const runs = store({
    getAnswerTokens: async () => { tokenReads++; return { mapToken: () => "test-token", readMapToken: token => token === "test-token" ? { storyRef: item.ref, id: "question" } : null }; },
    readSessionAnswers: async (dir, id) => { assert.equal(dir, projectsDir); assert.equal(id, "session"); return [answer]; },
  });
  const run = await runs.startRun(item, { now: at, sessionId: "session" });
  assert.equal(tokenReads, 0);
  await runs.completeRun(item, { runId: run.runId, outcome: "done", projectsDir, now: at });
  const [settled] = await runs.readRuns(item);
  assert.equal(settled.state, "done");
  assert.equal(settled.spend.tokens.input, 7);
  assert.equal(settled.spend.tokens.output, 3);
  assert.deepEqual(settled.brief.answers, [answer]);
  assert.equal(tokenReads, 1);
  const bytes = await readFile(runs.runRecordPath(item, run.runId), "utf8");
  assert.equal((await createRunSpendIngest(runs).settleSpendFromTranscript(item, { runId: run.runId, projectsDir })).reason, "already-settled");
  assert.equal(await readFile(runs.runRecordPath(item, run.runId), "utf8"), bytes);
}));

test("failed answer enrichment reports through the instance and preserves successful settlement", () => fixture(async ({ item, root }) => {
  const events = [];
  const runs = store({ reportDegrade: (...args) => events.push(args), readSessionAnswers: async () => { throw new Error("reader unavailable"); } });
  const run = await runs.startRun(item, { now: at });
  await runs.completeRun(item, { runId: run.runId, outcome: "done", projectsDir: root, settleSpend: false, now: at });
  assert.equal((await runs.readRuns(item))[0].state, "done");
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "run-store");
  assert.match(events[0][1].message, /reader unavailable/);
}));

test("session capture waits for persistence while retaining the caller hook result", async () => {
  let release;
  const persisted = new Promise(resolve => { release = resolve; });
  const calls = [];
  const capture = createRunSessionCapture({ recordSessionId: async (item, options) => { calls.push([item, options]); await persisted; }, reportDegrade: unexpected });
  const item = { ref: "42/01" };
  let done = false;
  const pending = capture.captureSessionIdOnRecord({ item, runId: "r1", onCaptured: () => "hook-result" })("s1").then(value => { done = true; return value; });
  await Promise.resolve();
  assert.equal(done, false);
  release();
  assert.equal(await pending, "hook-result");
  assert.deepEqual(calls, [[item, { runId: "r1", sessionId: "s1" }]]);
});

test("154/01 task01 — actual run mint/read/retry pins execution and native identity, preserving prior bytes", () => fixture(async ({ item }) => {
  const runs = store();
  const execution = codexExecution();
  const original = await runs.startRun(item, { now: at, sessionId: "native-154", execution });
  execution.phases.continue.model = "caller-mutated";
  assert.equal((await runs.readRuns(item))[0].execution.phases.continue.model, "native-test");
  await runs.completeRun(item, { runId: original.runId, outcome: "failed", failureReason: "timeout", now: at });
  const file = runs.runRecordPath(item, original.runId);
  const bytes = await readFile(file, "utf8");
  for (const options of [{ runtime: "claude" }, { choices: { continue: { model: "different", modelFlag: "--model" } } }]) {
    await assert.rejects(runs.retryRun(item, options), error => error.code === "execution-resume-conflict");
    assert.equal(await readFile(file, "utf8"), bytes);
    assert.equal((await runs.readRuns(item)).length, 1);
  }
  const resumed = await runs.retryRun(item, { now: "2026-09-28T10:00:01.000Z" });
  assert.deepEqual(resumed.execution, original.execution); assert.equal(resumed.sessionId, "native-154");
  assert.equal(await readFile(file, "utf8"), bytes);
  await runs.completeRun(item, { runId: resumed.runId, outcome: "done", now: at });
  const fresh = await runs.startRun(item, { now: "2026-09-28T10:00:02.000Z", execution: resolveExecution({}), attempt: 99 });
  assert.equal(fresh.execution.runtime, "claude"); assert.equal(fresh.sessionId, null); assert.equal(fresh.attempt, 1);
  assert.equal(await readFile(file, "utf8"), bytes);
}));

test("154/01 task01 — malformed present metadata survives read and refuses retry without writes; invalid mint writes nothing", () => fixture(async ({ item }) => {
  const runs = store();
  await assert.rejects(runs.startRun(item, { execution: null, now: at }), error => error.code === "invalid-record");
  assert.deepEqual(await runs.readRuns(item), []);
  const run = await runs.startRun(item, { now: at });
  await runs.completeRun(item, { runId: run.runId, outcome: "failed", failureReason: "timeout", now: at });
  const file = runs.runRecordPath(item, run.runId);
  const raw = JSON.parse(await readFile(file, "utf8")); raw.execution = null;
  await writeFile(file, JSON.stringify(raw));
  assert.equal((await runs.readRuns(item))[0].execution, null);
  const bytes = await readFile(file, "utf8");
  await assert.rejects(runs.retryRun(item), error => error.code === "invalid-record");
  assert.equal(await readFile(file, "utf8"), bytes);
}));

test("154/01 task01 — actual legacy retry preserves seventeen-key shape and native identity", () => fixture(async ({ item }) => {
  const runs = store();
  const original = await runs.startRun(item, { now: at, sessionId: "legacy-native" });
  assert.equal(Object.keys(original).length, 17); assert.equal(Object.hasOwn(original, "execution"), false);
  await runs.completeRun(item, { runId: original.runId, outcome: "failed", failureReason: "timeout", now: at });
  const resumed = await runs.retryRun(item, { now: "2026-09-28T10:00:01.000Z" });
  assert.equal(resumed.sessionId, "legacy-native"); assert.equal(Object.keys(resumed).length, 17);
}));
