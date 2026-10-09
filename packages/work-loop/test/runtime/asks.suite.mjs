import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaultApplication as a } from "aof/default-application";
import { nativePhaseFixture } from "./phases.suite.mjs";
import { createDiscordReplies } from "../../../messaging/src/replies.mjs";
import { codexFixture } from "../../../execution/test/codex-app-server.suite.mjs";

async function pending(f, token = "154/06 Q1") {
  const run = await f.mint();
  const sessionId = codexFixture().fixture.nativeThreadId;
  await a.execution.runs.recordSessionId(f.item, { runId: run.runId, sessionId });
  const question = { token, text: "Choose the loop behaviour", choices: ["First", "Second", "Third"], sessionId };
  await f.asks.persistNativeQuestion({ item: f.item, runId: run.runId, question, phase: "continue", ctx: f.ctx });
  return { run, question, dir: f.requests.loopAsksDir(), sessionId };
}
async function answerOwn(f, p) {
  const file = await f.requests.readAsk(p.dir, p.run.runId);
  return f.requests.answerAsk(p.dir, { workspaceId: file.workspaceId, ref: f.item.ref, runId: p.run.runId, text: "Second", by: { actor: "operator" } });
}

export const runtimeAskTests = [
  { name: "154/06 task01 — a failed ask projection after the ledger write recovers one pending decision before settlement", async run() {
    const f = await nativePhaseFixture({ scenario: "structured-question", failFirstAskFile: true });
    try {
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, f.ctx);
      assert.equal(result.outcome, "needs-input", JSON.stringify(result));
      const run = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(run.state, "running"); assert.equal(run.asks.length, 1); assert.equal(run.asks[0].answeredAt, null);
      const file = await f.requests.readAsk(f.requests.loopAsksDir(), run.runId);
      assert.equal(file.state, "parked"); assert.equal(file.questionToken, run.asks[0].questionToken);
      assert.equal(file.sessionId, run.sessionId); assert.deepEqual(file.choices, run.asks[0].choices);
      assert.notEqual(f.probes.at(-1).child.exitCode, null);
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — a stop after question persistence preserves one recoverable pending decision", async run() {
    const f = await nativePhaseFixture({ scenario: "structured-question" });
    try {
      const controller = new AbortController();
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, agentSessionDriverOptions: { signal: controller.signal, onQuestion: async () => { controller.abort(); } } });
      assert.equal(result.outcome, "needs-input", JSON.stringify(result));
      const run = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(run.state, "running"); assert.equal(run.asks.length, 1); assert.equal(run.asks[0].answeredAt, null);
      const file = await f.requests.readAsk(f.requests.loopAsksDir(), run.runId);
      assert.equal(file.state, "parked"); assert.equal(file.questionToken, run.asks[0].questionToken);
      assert.notEqual(f.probes.at(-1).child.exitCode, null);
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — core-composed one-shot native question is durably parked and forbids cold-fix discard", async run() {
    const f = await nativePhaseFixture({ scenario: "structured-question", available: false });
    try {
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, f.ctx);
      assert.equal(result.outcome, "needs-input", JSON.stringify(result));
      const run = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(run.state, "running"); assert.ok(run.asks[0].parkedAt);
      const file = await f.requests.readAsk(f.requests.loopAsksDir(), run.runId);
      assert.equal(file.state, "parked"); assert.equal(file.questionToken, "structured-token");
      await assert.rejects(f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, loopDrive: { runId: run.runId, fix: { buildRun: run, resumeBuildRun: null } } }), { code: "native-question-pending" });
      assert.equal(f.probes.filter(p => p.calls.some(call => call.method === "turn/start")).length, 1);
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — the existing wait composer recovers a native parked ask without any transcript read", async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f);
      await f.requests.parkAsk(p.dir, p.run.runId); await a.execution.runs.parkRunAsk(f.item, p.run.runId);
      let answered = false;
      const record = (await a.execution.runs.readRuns(f.item))[0];
      const result = await f.asks.awaitAnswer({ item: f.item, record, outcome: { outcome: "needs-input", sessionId: p.sessionId } }, {
        reenter: true, item: f.item, ref: f.item.ref, phase: "continue", cwd: f.root,
        drive: async answer => ({ record: (await a.execution.runs.readRuns(f.item))[0], outcome: await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, loopDrive: { runId: p.run.runId, answer } }) }),
      }, { workspace: f.workspace, dir: p.dir, askWait: {
        now: () => new Date(), read: runId => f.requests.readAsk(p.dir, runId), expired: () => false,
        next: async () => { if (!answered) { await answerOwn(f, p); answered = true; } }, close: () => {},
      } });
      assert.equal(result.phaseRun.outcome.outcome, "done", JSON.stringify(result));
      assert.equal(await f.requests.readAsk(p.dir, p.run.runId), null);
      assert.equal((await a.execution.runs.readRuns(f.item))[0].asks[0].answer, "Second");
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — restart retains question options and delivers a new turn to the original native thread", async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f);
      await f.requests.parkAsk(p.dir, p.run.runId);
      const persisted = JSON.parse(await readFile(f.requests.askRequestPath(p.dir, p.run.runId), "utf8"));
      assert.equal(persisted.questionToken, p.question.token); assert.deepEqual(persisted.choices, p.question.choices);
      await answerOwn(f, p);
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref, answer: f.requests.askRequestPath(p.dir, p.run.runId) }, { ...f.ctx, loopDrive: { runId: p.run.runId } });
      assert.equal(result.outcome, "done", JSON.stringify(result));
      const probe = f.probes.at(-1);
      assert.equal(probe.calls.find(call => call.method === "thread/resume").params.threadId, p.sessionId);
      const text = probe.calls.find(call => call.method === "turn/start").params.input[0].text;
      for (const token of [p.question.token, p.question.text, "Third", "Second"]) assert.ok(text.includes(token), token);
      assert.equal(probe.calls.some(call => call.id === "ephemeral-question-rpc"), false);
      assert.equal((await f.requests.readAsk(p.dir, p.run.runId)).delivery.state, "acknowledged");
      const run = (await a.execution.runs.readRuns(f.item))[0];
      assert.equal(run.asks.length, 1); assert.equal(run.asks[0].answer, "Second"); assert.ok(run.asks[0].answeredAt);
    } finally { await f.cleanup(); }
  } },
  ...["duplicate", "conflict", "distinct", "no-session", "wrong-run"].map(condition => ({ name: `154/06 task01 — native question identity: ${condition}`, async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f), file = f.requests.askRequestPath(p.dir, p.run.runId);
      const before = await readFile(file, "utf8");
      const submit = question => f.asks.persistNativeQuestion({ item: f.item, runId: p.run.runId, question, phase: "continue", ctx: f.ctx });
      if (condition === "duplicate") await submit(p.question);
      else if (condition === "wrong-run") {
        const stored = await f.requests.readAsk(p.dir, p.run.runId);
        await assert.rejects(f.requests.answerAsk(p.dir, { workspaceId: stored.workspaceId, ref: f.item.ref, runId: "another-run", text: "Second" }), { code: "drive-answer-not-own" });
      } else await assert.rejects(submit({ ...p.question, ...(condition === "conflict" ? { text: "Conflicting content" } : condition === "distinct" ? { token: "Q2" } : { sessionId: null }) }));
      assert.equal(await readFile(file, "utf8"), before);
      assert.equal((await a.execution.runs.readRuns(f.item))[0].asks.length, 1);
    } finally { await f.cleanup(); }
  } })),
  { name: "154/06 task01 — unauthorized native reply is refused before the actual answer verb", async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f), file = f.requests.askRequestPath(p.dir, p.run.runId), before = await readFile(file, "utf8");
      let invoked = false;
      const replies = createDiscordReplies({ loopAsksDir: f.requests.loopAsksDir, readAsks: f.requests.readAsks, readAskMessage: async () => ({ channelId: "123456789012345678", projectRoot: f.root, ref: f.item.ref }) });
      const result = await replies.handleReply({ id: "223456789012345678", channel_id: "123456789012345678", message_reference: { message_id: "323456789012345678" }, author: { id: "unauthorized", username: "intruder" }, content: "Second" }, { request: async () => {}, invoke: async () => { invoked = true; }, loadWorkspace: async () => ({ config: { work: { notify: { channels: { discord: { type: "discord", channelId: "123456789012345678", allow: ["operator"] } } } } } }) });
      assert.equal(result.action, "refused"); assert.equal(invoked, false); assert.equal(await readFile(file, "utf8"), before);
    } finally { await f.cleanup(); }
  } },
  ...["recorded", "sending", "acknowledged"].map(checkpoint => ({ name: `154/06 task01 — crash boundary preserves ${checkpoint} delivery without duplicate submission`, async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f); await answerOwn(f, p);
      const identity = { sessionId: p.sessionId, questionToken: p.question.token };
      if (checkpoint !== "recorded") await f.requests.beginNativeDelivery(p.dir, p.run.runId, identity);
      if (checkpoint === "acknowledged") await f.requests.acknowledgeNativeDelivery(p.dir, p.run.runId, { ...identity, turnId: "native-turn-1" });
      const file = f.requests.askRequestPath(p.dir, p.run.runId), before = await readFile(file, "utf8");
      if (checkpoint === "recorded") assert.equal((await f.requests.beginNativeDelivery(p.dir, p.run.runId, identity)).delivery.state, "sending");
      else {
        await assert.rejects(f.requests.beginNativeDelivery(p.dir, p.run.runId, identity), { code: checkpoint === "sending" ? "ask-delivery-ambiguous" : "ask-delivery-acknowledged" });
        assert.equal(await readFile(file, "utf8"), before);
      }
      assert.equal(f.probes.length, 0);
    } finally { await f.cleanup(); }
  } })),
  { name: "154/06 task01 — concurrent delivery owners admit exactly one answer submission", async run() {
    const f = await nativePhaseFixture();
    try {
      const p = await pending(f); await answerOwn(f, p);
      const submit = () => f.requests.beginNativeDelivery(p.dir, p.run.runId, { sessionId: p.sessionId, questionToken: p.question.token });
      const results = await Promise.allSettled([submit(), submit()]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.ok(["ask-write-busy", "ask-delivery-ambiguous"].includes(results.find(result => result.status === "rejected").reason.code));
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — acknowledged first question closes before a second question is persisted on the same run", async run() {
    const f = await nativePhaseFixture({ scenario: "structured-question" });
    try {
      const p = await pending(f); await answerOwn(f, p);
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref, answer: f.requests.askRequestPath(p.dir, p.run.runId) }, { ...f.ctx, loopDrive: { runId: p.run.runId } });
      assert.equal(result.outcome, "needs-input", JSON.stringify(result));
      const run = (await a.execution.runs.readRuns(f.item))[0], file = await f.requests.readAsk(p.dir, p.run.runId);
      assert.equal(run.asks.length, 2); assert.equal(run.asks[0].answer, "Second"); assert.equal(run.asks[1].answeredAt, null);
      assert.equal(file.questionToken, "structured-token"); assert.equal(file.sessionId, p.sessionId); assert.equal(file.answer, null);
    } finally { await f.cleanup(); }
  } },
  { name: "154/06 task01 — persistence failure never claims a parked native question", async run() {
    const f = await nativePhaseFixture({ scenario: "structured-question" });
    try {
      const result = await f.drivers.continueDriverCommand.run({ ref: f.item.ref }, { ...f.ctx, agentSessionDriverOptions: { onIdentity: async () => { throw Error("persist failed"); } } });
      assert.equal(result.outcome, "failed"); assert.equal(result.failureReason, "persistence_failed");
      assert.deepEqual(await f.requests.readAsks(f.requests.loopAsksDir(), { workspaceId: "absent" }), []);
    } finally { await f.cleanup(); }
  } },
];
