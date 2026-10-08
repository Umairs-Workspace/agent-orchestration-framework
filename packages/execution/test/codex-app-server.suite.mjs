import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCodexAppServerAdapter } from "../src/codex-app-server.mjs";
import { createRuntimeSession } from "../src/runtime-session.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixtures/codex-app-server-v1.json", import.meta.url), "utf8"));
const secret = "FIXTURE_CREDENTIAL_MUST_NOT_APPEAR";
export function codexFixture({ scenario = "complete", delivery = "ordinary", version = fixture.cliVersion, models = fixture.models, ignoreClose = false, adapterFactory = createCodexAppServerAdapter } = {}) {
  const calls = [], events = [], children = [];
  const child = new EventEmitter(); Object.assign(child, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), exitCode: null });
  let input = "";
  const close = () => { if (child.exitCode !== null) return; child.exitCode = 0; child.emit("close", 0); events.push("closed"); };
  child.kill = () => { events.push("kill"); close(); return true; };
  child.stdin.on("finish", () => { if (!ignoreClose) close(); });
  function emit(...messages) {
    const bytes = Buffer.from(messages.map(message => typeof message === "string" ? message : JSON.stringify(message)).join("\n") + "\n");
    if (delivery === "split") { for (let at = 0; at < bytes.length; at += 7) child.stdout.write(bytes.subarray(at, at + 7)); }
    else child.stdout.write(bytes);
  }
  const reply = (request, result) => emit({ id: request.id, result });
  child.stdin.on("data", chunk => {
    input += chunk;
    for (let at; (at = input.indexOf("\n")) >= 0;) {
      const request = JSON.parse(input.slice(0, at)); input = input.slice(at + 1); calls.push(request);
      queueMicrotask(() => {
        if (request.method === "initialize") {
          if (scenario === "request-timeout") return;
          if (scenario === "initialization-error") emit({ id: request.id, error: { code: -1, message: secret } });
          else reply(request, fixture.initialize);
        } else if (request.method === "model/list") reply(request, { data: models, nextCursor: null });
        else if (["thread/start", "thread/resume", "thread/read"].includes(request.method)) reply(request, { thread: { id: scenario === "missing-identity" ? "" : fixture.nativeThreadId } });
        else if (request.method === "turn/interrupt") { events.push("interrupt"); if (scenario !== "stops-replying") reply(request, {}); }
        else if (request.method === "turn/start") {
          reply(request, { turn: { id: fixture.nativeTurnId, status: "inProgress" } });
          emit({ method: "turn/started", params: { threadId: fixture.nativeThreadId, turn: { id: fixture.nativeTurnId } } });
          if (["active", "stops-replying"].includes(scenario)) return;
          if (scenario.startsWith("permission:")) { emit({ id: "approval-1", method: scenario.slice(11), params: { threadId: fixture.nativeThreadId, turnId: fixture.nativeTurnId, command: secret } }); return; }
          if (scenario === "native-question" || scenario === "question-missing-identity") { emit({ id: "ephemeral-question-rpc", method: "item/tool/requestUserInput", params: { ...fixture.question, ...(scenario === "question-missing-identity" ? { threadId: "" } : {}) } }); return; }
          if (scenario === "malformed") { emit('{"secret":"' + secret + '"'); return; }
          if (scenario === "oversized") { emit(" ".repeat(1024 * 1024 + 1) + secret); return; }
          if (scenario === "unmatched") { emit({ id: 9999, result: secret }); return; }
          if (scenario === "unknown-request") { emit({ id: "unknown", method: "fixture/mandatory", params: { secret } }); return; }
          if (scenario === "disconnect") { close(); return; }
          if (scenario === "stderr-error") { child.stderr.emit("error", new Error(secret)); return; }
          const result = scenario === "structured-question" ? { status: "needs_input", question: { token: "structured-token", text: "Choose a behaviour", choices: ["First", "Second"] }, failureReason: null } : fixture.complete;
          const frames = [{ method: "thread/tokenUsage/updated", params: fixture.usage }];
          if (delivery === "notification-burst") for (let i = 0; i < 512; i++) frames.push({
            method: ["codex/event/exec_command_output_delta", "item/commandExecution/outputDelta", "fixture/harmless"][i % 3],
            params: { threadId: fixture.nativeThreadId, turnId: fixture.nativeTurnId, delta: secret },
          });
          if (delivery === "unknown" || delivery === "interleaved") frames.push({ method: "fixture/harmless", params: {} });
          if (scenario !== "transport-only") frames.push({ method: "item/completed", params: { threadId: fixture.nativeThreadId, turnId: fixture.nativeTurnId, item: { type: "agentMessage", phase: "final_answer", text: JSON.stringify(result) } } });
          frames.push({ method: "turn/completed", params: { threadId: fixture.nativeThreadId, turn: { id: fixture.nativeTurnId, status: "completed" } } });
          emit(...frames);
        }
      });
    }
  });
  const adapter = adapterFactory({ readVersion: async () => version, spawnChild: (bin, args, options) => { children.push({ bin, args, options }); return child; }, terminate: async owned => { assert.equal(owned, child); owned.kill(); }, composePhaseBriefInput: (command, context) => `${command}\n${context?.text ?? ""}` });
  const brief = { worktreeCwd: path.resolve(".tmp"), itemRef: "154/02", phase: "continue", procedure: "aof-continue", arguments: ["154/02", "--solo"], command: "$aof-continue 154/02 --solo", context: { text: "BOUNDED_CONTEXT" } };
  const options = { requestTimeoutMs: 100, timeoutMs: 1000, closeMs: 20, interruptMs: 20 };
  return { adapter, brief, options, calls, events, children, child, fixture };
}
function released(probe) {
  assert.ok(probe.child.stdin.destroyed && probe.child.stdout.destroyed && probe.child.stderr.destroyed);
  assert.notEqual(probe.child.exitCode, null);
  assert.equal(probe.children.length, 1);
}
export const codexAppServerTests = [
  ...["ordinary", "split", "coalesced", "interleaved", "unknown", "notification-burst"].map(delivery => ({ name: `154/02 task00 — attributable phase input and completed result: ${delivery}`, async run() {
    const p = codexFixture({ delivery }); const identities = [], usage = [];
    const result = await p.adapter.drive(p.brief, { ...p.options, onIdentity: async id => identities.push(id), onUsage: async value => usage.push(value) });
    assert.equal(result.outcome, "done"); assert.equal(result.sessionId, fixture.nativeThreadId); assert.deepEqual(identities, [fixture.nativeThreadId]);
    const start = p.calls.find(call => call.method === "turn/start");
    for (const token of ["154/02", "aof-continue", "--solo", "BOUNDED_CONTEXT"]) assert.ok(start.params.input[0].text.includes(token));
    assert.deepEqual(p.children[0].args, ["app-server", "--listen", "stdio://"]); assert.equal(p.children[0].options.shell, false);
    assert.equal(usage[0].total.totalTokens, 26); assert.equal(Object.hasOwn(usage[0], "costUsd"), false); released(p);
  } })),
  ...[["transport-only", "result_invalid"], ["malformed", "protocol_invalid_json"], ["oversized", "protocol_frame_too_large"], ["unmatched", "protocol_unmatched_response"], ["initialization-error", "protocol_rpc_error"], ["unknown-request", "protocol_unknown_request"], ["disconnect", "protocol_disconnected"], ["missing-identity", "protocol_identity_mismatch"]].map(([scenario, code]) => ({ name: `154/02 task00 — bounded explicit failure without sensitive diagnostics: ${scenario}`, async run() {
    const p = codexFixture({ scenario }); const result = await p.adapter.drive(p.brief, p.options);
    assert.equal(result.outcome, "failed"); assert.equal(result.failureReason, code); assert.ok(!JSON.stringify(result).includes(secret)); released(p);
  } })),
  ...["item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/permissions/requestApproval"].map(method => ({ name: `154/02 task01 — operator permissions are declined: ${method}`, async run() {
    const p = codexFixture({ scenario: `permission:${method}` }); let questions = 0;
    const result = await p.adapter.drive(p.brief, { ...p.options, onQuestion: () => { questions++; } });
    assert.equal(result.failureReason, "operator_action_required"); assert.equal(questions, 0);
    const answer = p.calls.find(call => call.id === "approval-1");
    assert.deepEqual(answer.result, method.includes("permissions") ? { permissions: {}, scope: "turn" } : { decision: "decline" });
    for (const call of p.calls) assert.equal(Object.hasOwn(call.params ?? {}, "approvalPolicy"), false);
    released(p);
  } })),
  ...["native-question", "structured-question"].map(scenario => ({ name: `154/02 task01 — persist a complete business question before interruption: ${scenario}`, async run() {
    const p = codexFixture({ scenario }); const questions = [];
    const result = await p.adapter.drive(p.brief, { ...p.options, onQuestion: async q => { await Promise.resolve(); questions.push(q); p.events.push("persisted"); } });
    assert.equal(result.outcome, "needs-input"); assert.equal(result.sessionId, fixture.nativeThreadId); assert.deepEqual(result.question, questions[0]);
    assert.ok(p.events.indexOf("persisted") < p.events.indexOf("interrupt"));
    if (scenario === "native-question") { assert.equal(result.question.token, fixture.question.questions[0].id); assert.deepEqual(result.question.choices, fixture.question.questions[0].options); assert.deepEqual(result.question.questions, fixture.question.questions); }
    assert.ok(!JSON.stringify(result.question).includes("ephemeral-question-rpc")); released(p);
  } })),
  { name: "154/02 task01 — missing question identity fails visibly", async run() { const p = codexFixture({ scenario: "question-missing-identity" }); assert.equal((await p.adapter.drive(p.brief, p.options)).failureReason, "question_invalid"); released(p); } },
  ...["operator cancellation", "parent abort", "start-to-close", "stops-replying"].map(stop => ({ name: `154/02 task01 — bounded owned interrupt and release: ${stop}`, async run() {
    const p = codexFixture({ scenario: stop === "stops-replying" ? stop : "active", ignoreClose: true }); const controller = new AbortController();
    const timer = setTimeout(() => { if (["operator cancellation", "parent abort"].includes(stop)) controller.abort(); }, 30);
    const began = Date.now(); const result = await p.adapter.drive(p.brief, { ...p.options, signal: controller.signal, timeoutMs: 70 }); clearTimeout(timer);
    assert.equal(result.outcome, "failed"); assert.ok(Date.now() - began < 1000); assert.ok(p.events.includes("interrupt")); released(p);
    if (stop === "stops-replying") assert.deepEqual(result.cleanupWarnings, ["interrupt_failed"]);
  } })),
  { name: "154/02 task00 — resume reads actual native thread and retains identity", async run() {
    const p = codexFixture(); assert.equal(await p.adapter.canResume(fixture.nativeThreadId, { ...p.options, cwd: p.brief.worktreeCwd }), true); released(p);
    const q = codexFixture(); const r = await q.adapter.drive(q.brief, { ...q.options, resumeSessionId: fixture.nativeThreadId });
    assert.equal(r.sessionId, fixture.nativeThreadId); assert.equal(q.calls.filter(c => c.method === "thread/start").length, 0); assert.equal(q.calls.find(c => c.method === "thread/resume").params.threadId, fixture.nativeThreadId); released(q);
  } },
  { name: "154/02 task00 — unsupported version never starts the server", async run() { const p = codexFixture({ version: "9.0.0" }); const r = await p.adapter.drive(p.brief, p.options); assert.equal(r.failureReason, "unsupported_profile"); assert.equal(p.children.length, 0); } },
  { name: "154/02 task01 — identity persistence failure stops through the normalized boundary", async run() { const p = codexFixture(); const boundary = createRuntimeSession({ adapters: { codex: p.adapter } }); const r = await boundary.drive(p.brief, { ...p.options, runtime: "codex", onIdentity: () => { throw new Error(secret); } }); assert.equal(r.failureReason, "persistence_failed"); assert.equal(p.calls.filter(c => c.method === "turn/start").length, 0); released(p); } },
  ...["onActivity", "onUsage", "onQuestion"].map(callback => ({ name: `154/02 task01 — persistence failure cannot be reported as success: ${callback}`, async run() {
    const p = codexFixture({ scenario: callback === "onQuestion" ? "structured-question" : "complete" });
    const r = await p.adapter.drive(p.brief, { ...p.options, [callback]: () => { throw new Error(secret); } });
    assert.equal(r.failureReason, "persistence_failed"); assert.ok(!JSON.stringify(r).includes(secret)); released(p);
  } })),
  { name: "154/02 task01 — a stalled identity persistence callback respects cancellation", async run() {
    const p = codexFixture(); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30);
    const r = await p.adapter.drive(p.brief, { ...p.options, signal: controller.signal, onIdentity: () => new Promise(() => {}) }); clearTimeout(timer);
    assert.equal(r.failureReason, "abort"); assert.equal(p.calls.filter(c => c.method === "turn/start").length, 0); released(p);
  } },
  ...[["request-timeout", "protocol_timeout"], ["stderr-error", "protocol_disconnected"]].map(([scenario, reason]) => ({ name: `154/02 task01 — bounded transport failure: ${scenario}`, async run() {
    const p = codexFixture({ scenario }); const r = await p.adapter.drive(p.brief, p.options); assert.equal(r.failureReason, reason); released(p);
  } })),
  { name: "154/02 task01 — an already aborted parent never starts a server", async run() {
    const p = codexFixture(); const controller = new AbortController(); controller.abort();
    assert.equal((await p.adapter.drive(p.brief, { ...p.options, signal: controller.signal })).failureReason, "abort"); assert.equal(p.children.length, 0);
  } },
  { name: "154/02 task01 — cancellation also releases a stalled callback through the shared boundary", async run() {
    const p = codexFixture(); const boundary = createRuntimeSession({ adapters: { codex: p.adapter } }); const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30); const began = Date.now();
    const r = await boundary.drive(p.brief, { ...p.options, runtime: "codex", signal: controller.signal, onIdentity: () => new Promise(() => {}) }); clearTimeout(timer);
    assert.equal(r.failureReason, "abort"); assert.ok(Date.now() - began < 1000); released(p);
  } },
];
