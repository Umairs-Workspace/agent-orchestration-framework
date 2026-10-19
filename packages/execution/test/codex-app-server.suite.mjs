import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCodexAppServerAdapter } from "../src/codex-app-server.mjs";
import { createRuntimeSession } from "../src/runtime-session.mjs";
import { codexExecutables, selectCodexExecutable } from "../src/codex-executable.mjs";
import { codexProcessEnvironment } from "../src/codex-process-environment.mjs";
import { CODEX_PROFILE } from "../src/codex-protocol-profile.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixtures/codex-app-server-v1.json", import.meta.url), "utf8"));
const secret = "FIXTURE_CREDENTIAL_MUST_NOT_APPEAR";
export const reviewProfiles = JSON.parse(await readFile(new URL("./fixtures/codex-auto-review-profiles.json", import.meta.url), "utf8"));
export function reviewFrame(status = "inProgress", changes = {}, version = fixture.cliVersion) {
  const frame = structuredClone(reviewProfiles[version][status === "inProgress" ? "started" : "completed"]);
  Object.assign(frame.params, changes); frame.params.review.status = status;
  return frame;
}
export function finishFrames() {
  return [{ method: "item/completed", params: { threadId: fixture.nativeThreadId, turnId: fixture.nativeTurnId,
    item: { type: "agentMessage", phase: "final_answer", text: JSON.stringify(fixture.complete) } } },
  { method: "turn/completed", params: { threadId: fixture.nativeThreadId, turn: { id: fixture.nativeTurnId, status: "completed" } } }];
}
export function codexFixture({ scenario = "complete", delivery = "ordinary", version = fixture.cliVersion, models = fixture.models, ignoreClose = false, adapterFactory = createCodexAppServerAdapter, acknowledgement = { approvalsReviewer: "auto_review", approvalPolicy: "on-request" }, onStart = null, nativeIdentity = {} } = {}) {
  const wire = { ...structuredClone(fixture), ...nativeIdentity };
  for (const params of [wire.question, wire.usage]) { params.threadId = wire.nativeThreadId; params.turnId = wire.nativeTurnId; }
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
          else reply(request, wire.initialize);
        } else if (request.method === "model/list") reply(request, { data: models, nextCursor: null });
        else if (["thread/start", "thread/resume", "thread/read"].includes(request.method)) {
          if (acknowledgement === "rejected") emit({ id: request.id, error: { code: -1, message: secret } });
          else reply(request, { thread: { id: scenario === "missing-identity" ? "" : wire.nativeThreadId }, ...acknowledgement });
        }
        else if (request.method === "turn/interrupt") { events.push("interrupt"); if (scenario !== "stops-replying") reply(request, {}); }
        else if (request.method === "turn/start") {
          reply(request, { turn: { id: wire.nativeTurnId, status: "inProgress" } });
          emit({ method: "turn/started", params: { threadId: wire.nativeThreadId, turn: { id: wire.nativeTurnId } } });
          if (onStart) { onStart({ emit, close, calls }); return; }
          if (["active", "stops-replying"].includes(scenario)) return;
          if (scenario.startsWith("permission:")) { emit({ id: "approval-1", method: scenario.slice(11), params: { threadId: wire.nativeThreadId, turnId: wire.nativeTurnId, itemId: "item-1", startedAtMs: 1000, cwd: "C:/fixture", permissions: {}, command: secret } }); return; }
          if (scenario === "native-question" || scenario === "question-missing-identity") { emit({ id: "ephemeral-question-rpc", method: "item/tool/requestUserInput", params: { ...wire.question, ...(scenario === "question-missing-identity" ? { threadId: "" } : {}) } }); return; }
          if (scenario === "malformed") { emit('{"secret":"' + secret + '"'); return; }
          if (scenario === "oversized") { emit(" ".repeat(1024 * 1024 + 1) + secret); return; }
          if (scenario === "unmatched") { emit({ id: 9999, result: secret }); return; }
          if (scenario === "unknown-request") { emit({ id: "unknown", method: "fixture/mandatory", params: { secret } }); return; }
          if (scenario === "disconnect") { close(); return; }
          if (scenario === "stderr-error") { child.stderr.emit("error", new Error(secret)); return; }
          const result = scenario === "structured-question" ? { status: "needs_input", question: { token: "structured-token", text: "Choose a behaviour", choices: ["First", "Second"] }, failureReason: null } : wire.complete;
          const frames = [{ method: "thread/tokenUsage/updated", params: wire.usage }];
          if (delivery === "notification-burst") for (let i = 0; i < 512; i++) frames.push({
            method: ["codex/event/exec_command_output_delta", "item/commandExecution/outputDelta", "fixture/harmless"][i % 3],
            params: { threadId: wire.nativeThreadId, turnId: wire.nativeTurnId, delta: secret },
          });
          if (delivery === "unknown" || delivery === "interleaved") frames.push({ method: "fixture/harmless", params: {} });
          if (scenario !== "transport-only") frames.push({ method: "item/completed", params: { threadId: wire.nativeThreadId, turnId: wire.nativeTurnId, item: { type: "agentMessage", phase: "final_answer", text: JSON.stringify(result) } } });
          frames.push({ method: "turn/completed", params: { threadId: wire.nativeThreadId, turn: { id: wire.nativeTurnId, status: "completed" } } });
          emit(...frames);
        }
      });
    }
  });
  const adapter = adapterFactory({ selectExecutable: async () => ({ bin: "codex.exe", cliVersion: version }), readVersion: async () => version, spawnChild: (bin, args, options) => { children.push({ bin, args, options }); return child; }, terminate: async owned => { assert.equal(owned, child); owned.kill(); }, composePhaseBriefInput: (command, context) => `${command}\n${context?.text ?? ""}` });
  const brief = { worktreeCwd: path.resolve(".tmp"), itemRef: "154/02", phase: "continue", procedure: "aof-continue", arguments: ["154/02", "--solo"], command: "$aof-continue 154/02 --solo", context: { text: "BOUNDED_CONTEXT" } };
  const options = { requestTimeoutMs: 100, timeoutMs: 1000, closeMs: 20, interruptMs: 20 };
  return { adapter, brief, options, calls, events, children, child, fixture: wire };
}
function released(probe) {
  assert.ok(probe.child.stdin.destroyed && probe.child.stdout.destroyed && probe.child.stderr.destroyed);
  assert.notEqual(probe.child.exitCode, null);
  assert.equal(probe.children.length, 1);
}
export const codexAppServerTests = [
  { name: "Codex minimum version accepts newer releases and prereleases and rejects old or malformed versions", async run() {
    const candidates = async function* () { yield "codex"; };
    for (const version of ["0.160.0", "0.160.0+build.1", "0.160.1", "0.161.0", "0.162.0-alpha.2", "0.162.0-alpha.17.2", "0.162.0-alpha.17.2+desktop.1", "0.1000.0", "1.0.0", "9.0.0"]) {
      assert.deepEqual(await selectCodexExecutable({}, { candidates, readVersion: async () => version }), { bin: "codex", cliVersion: version });
    }
    for (const version of ["0.130.0", "0.159.999", "0.16.0", "0.160.0-alpha.17.2", "0.160.0-rc.1+build", "unknown", "0.160", "v0.160.0", "0.0160.0", "0.162.0-alpha..2", "0.162.0-alpha.02", "0.162.0+", null]) {
      await assert.rejects(selectCodexExecutable({}, { candidates, readVersion: async () => version }), { code: "unsupported_profile" }, String(version));
    }
  } },
  { name: "Newer Codex versions still require native automatic review and the expected protocol", async run() {
    for (const [scenario, acknowledgement, expected] of [["complete", {}, "automatic_review_unavailable"], ["unknown-request", undefined, "protocol_unknown_request"]]) {
      const p = codexFixture({ version: "0.162.0-alpha.17.2", scenario, acknowledgement });
      const result = await p.adapter.drive(p.brief, p.options);
      assert.equal(result.failureReason, expected);
      if (expected === "automatic_review_unavailable") assert.equal(p.calls.some(c => c.method === "turn/start"), false);
      released(p);
    }
  } },
  { name: "Codex capabilities declare the minimum version and newer builds pass catalog preflight", async run() {
    const p = codexFixture({ version: "0.162.0-alpha.17.2" });
    assert.equal(p.adapter.capabilities.minimumCliVersion, CODEX_PROFILE.minimumVersion);
    assert.deepEqual((await p.adapter.inspectCapabilities({ ...p.options, cwd: p.brief.worktreeCwd })).models, fixture.models);
    released(p);
  } },
  { name: "158 task01 E7 — simultaneous native lanes with equal review ids never cross outcomes", async run() {
    const observed = [[], []];
    const probes = [0, 1].map(i => codexFixture({ nativeIdentity: { nativeThreadId: `s${i}`, nativeTurnId: `t${i}` }, onStart: ({ emit }) => {
      const identity = { threadId: `s${i}`, turnId: `t${i}` };
      emit(reviewFrame("inProgress", identity));
      if (i === 0) emit(reviewFrame("approved", identity), ...finishFrames().map(frame => ({ ...frame, params: { ...frame.params, ...identity, ...(frame.params.turn ? { turn: { ...frame.params.turn, id: identity.turnId } } : {}) } })));
      else emit(reviewFrame("approved", { threadId: "s0", turnId: "t0" }));
    } }));
    const results = await Promise.all(probes.map((p, i) => p.adapter.drive(p.brief, { ...p.options, timeoutMs: 60, onActivity: event => observed[i].push(event) })));
    assert.equal(results[0].outcome, "done"); assert.equal(results[1].failureReason, "timeout");
    assert.equal(observed[0].filter(e => e.status === "approved").length, 1);
    assert.equal(observed[1].some(e => e.status === "approved"), false); assert.equal(observed[1].at(-1).observationState, "unknown");
    probes.forEach(released);
  } },
  ...Object.keys(reviewProfiles).flatMap(version => [false, true].map(resumed => ({ name: `158 task00 E1 E4 — ${version} ${resumed ? "resume" : "start"} delegates native review and preserves model`, async run() {
    const observations = []; let questions = 0;
    const models = [{ model: "gpt-6-astra", id: "gpt-6-astra", isDefault: true, defaultReasoningEffort: "high", supportedReasoningEfforts: [{ reasoningEffort: "high" }] }];
    const p = codexFixture({ version, models, acknowledgement: reviewProfiles[version].acknowledgement,
      onStart: ({ emit }) => emit(reviewFrame("inProgress", {}, version), reviewFrame("approved", {}, version), ...finishFrames()) });
    const r = await p.adapter.drive(p.brief, { ...p.options, ...(resumed ? { resumeSessionId: fixture.nativeThreadId } : {}), onActivity: e => observations.push(e), onQuestion: () => questions++ });
    assert.equal(r.outcome, "done"); assert.equal(questions, 0);
    const thread = p.calls.find(c => c.method === (resumed ? "thread/resume" : "thread/start"));
    assert.equal(thread.params.approvalsReviewer, "auto_review"); assert.equal(thread.params.approvalPolicy, "on-request");
    assert.equal(thread.params.model, "gpt-6-astra");
    const turn = p.calls.find(c => c.method === "turn/start"); assert.equal(turn.params.model, "gpt-6-astra"); assert.equal(turn.params.effort, "high");
    assert.match(turn.params.input[0].text, /delegating task-related permission decisions/);
    for (const c of p.calls) for (const key of ["sandbox", "sandboxPolicy", "writableRoots", "config"]) assert.equal(Object.hasOwn(c.params ?? {}, key), false);
    assert.deepEqual(observations.filter(e => e.kind === "permission-review").map(e => e.status), ["inProgress", "approved"]);
    assert.doesNotMatch(JSON.stringify(observations), /CANARY/); assert.equal(p.calls.filter(c => c.result).length, 0); released(p);
  } }))),
  ...["rejected", {}, { approvalsReviewer: "user", approvalPolicy: "on-request" }, { approvalsReviewer: "auto_review", approvalPolicy: "never" }].map((acknowledgement, i) => ({ name: `158 task00 — unavailable effective automatic review fails before tools ${i}`, async run() {
    const p = codexFixture({ acknowledgement }); const r = await p.adapter.drive(p.brief, p.options);
    assert.equal(r.failureReason, "automatic_review_unavailable"); assert.equal(p.calls.some(c => c.method === "turn/start"), false); released(p);
  } })),
  ...["command", "applyPatch", "requestPermissions", "networkAccess", "execve", "writeStdin", "mcpToolCall"].flatMap(type => ["approved", "denied", "timedOut", "aborted"].map(status => ({ name: `158 task02 E5 E10 — ${type} ${status} is observation, never phase success`, async run() {
    const action = { type, command: "ACTION_CANARY", cwd: "C:/CWD_CANARY", source: "shell", files: ["PATH_CANARY"], permissions: { fileSystem: { write: ["PERMISSION_CANARY"] } }, host: "example.test", target: "example.test", port: 443, protocol: "https", program: "node", argv: [], approvalId: "cb-1", processId: "proc-1", stdin: "INPUT_CANARY", server: "test", toolName: "test" };
    const changes = { action, ...(type === "networkAccess" ? { targetItemId: null } : {}) };
    const observations = []; const p = codexFixture({ onStart: ({ emit }) => emit(reviewFrame("inProgress", changes), reviewFrame(status, changes)) });
    const r = await p.adapter.drive(p.brief, { ...p.options, timeoutMs: 40, onActivity: e => observations.push(e) });
    assert.equal(r.failureReason, "timeout", "approval alone cannot finish a phase");
    assert.equal(observations.at(-1).status, status); assert.doesNotMatch(JSON.stringify(observations), /CANARY/);
    assert.equal(p.calls.some(c => c.result), false); released(p);
  } }))),
  ...["wrong-session", "wrong-turn", "duplicate", "conflict", "missing-id", "bad-status", "bad-time", "missing-start"].map(condition => ({ name: `158 task02 E3 — review identity and history ${condition}`, async run() {
    const observed = []; const first = reviewFrame(); let done = reviewFrame("approved");
    if (condition === "wrong-session") done.params.threadId = "other";
    if (condition === "wrong-turn") done.params.turnId = "other";
    if (condition === "missing-id") delete done.params.reviewId;
    if (condition === "bad-status") done.params.review.status = "invented";
    if (condition === "bad-time") done.params.completedAtMs = "2000";
    const frames = condition === "missing-start" ? [done] : [first, done];
    if (condition === "duplicate") frames.push(done);
    if (condition === "conflict") frames.push(reviewFrame("denied"));
    const p = codexFixture({ onStart: ({ emit }) => emit(...frames, ...finishFrames()) });
    const r = await p.adapter.drive(p.brief, { ...p.options, onActivity: e => observed.push(e) });
    const expected = ["duplicate", "missing-start"].includes(condition) ? null : condition.startsWith("wrong-") ? "native_review_incomplete" : "native_review_invalid";
    assert.equal(r.failureReason ?? null, expected); assert.equal(r.outcome, expected ? "failed" : "done");
    if (condition === "duplicate") assert.equal(observed.filter(e => e.status === "approved").length, 1);
    if (condition.startsWith("wrong-")) assert.equal(observed.some(e => e.status === "approved"), false);
    released(p);
  } })),
  ...["abort", "timeout", "disconnect", "incomplete", "queue-limit", "start-persistence", "end-persistence"].map(condition => ({ name: `158 task03 E8 E9 — pending review cleanup ${condition}`, async run() {
    const observed = []; const controller = new AbortController();
    const p = codexFixture({ onStart: ({ emit }) => {
      emit(reviewFrame());
      if (condition === "incomplete") emit(...finishFrames());
      if (condition === "queue-limit") for (let i = 0; i < 140; i++) emit(reviewFrame("inProgress", { reviewId: `r-${i}` }));
      if (condition === "end-persistence") emit(reviewFrame("approved"), ...finishFrames());
    } });
    const boundary = createRuntimeSession({ adapters: { codex: p.adapter } });
    const r = await boundary.drive(p.brief, { ...p.options, runtime: "codex", signal: controller.signal, timeoutMs: 60, onActivity: e => {
      observed.push(e);
      if (e.kind === "permission-review") {
        if (condition === "abort") controller.abort();
        if (condition === "disconnect") p.child.kill();
        if ((condition === "start-persistence" && e.status === "inProgress") || (condition === "end-persistence" && e.status === "approved")) throw Error(secret);
      }
    } });
    assert.equal(r.failureReason, ({ abort: "abort", timeout: "timeout", disconnect: "protocol_disconnected", incomplete: "native_review_incomplete", "queue-limit": "protocol_queue_limit", "start-persistence": "persistence_failed", "end-persistence": "persistence_failed" })[condition]);
    assert.equal(r.outcome, "failed"); assert.doesNotMatch(JSON.stringify(r), /CANARY/); released(p);
    if (["abort", "timeout", "disconnect", "incomplete"].includes(condition)) assert.equal(observed.at(-1).observationState, condition === "abort" ? "interrupted" : "unknown");
  } })),
  ...["no-rpc-id", "no-item", "wrong-thread", "wrong-turn", "bad-permissions"].map(condition => ({ name: `158 task02 — malformed approval RPC ${condition}`, async run() {
    const params = { threadId: fixture.nativeThreadId, turnId: fixture.nativeTurnId, itemId: "item", startedAtMs: 1000, cwd: "C:/fixture", permissions: {} };
    if (condition === "no-item") delete params.itemId;
    if (condition === "wrong-thread") params.threadId = "other";
    if (condition === "wrong-turn") params.turnId = "other";
    if (condition === "bad-permissions") params.permissions = { all: true };
    const p = codexFixture({ onStart: ({ emit }) => emit({ ...(condition === "no-rpc-id" ? {} : { id: "approval" }), method: "item/permissions/requestApproval", params }) });
    assert.equal((await p.adapter.drive(p.brief, p.options)).failureReason, "protocol_invalid_permission_request");
    assert.equal(p.calls.some(c => c.result), false); released(p);
  } })),
  { name: "156 — Windows Codex child avoids Store PowerShell without changing host PATH or sandbox policy", async run() {
    const store = 'C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7\\';
    const aliases = 'C:\\Users\\fixture\\AppData\\Local\\Microsoft\\WindowsApps';
    const system = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0';
    const env = { Path: `C:\\tools;"${store}";${aliases};${system}`, KEEP: "unchanged" };
    const files = [path.win32.join(store, "pwsh.exe"), path.win32.join(aliases, "pwsh.exe"), path.win32.join(system, "powershell.exe")];
    const exists = file => files.includes(file);
    const selected = codexProcessEnvironment(env, { platform: "win32", exists });
    assert.deepEqual(selected, { Path: `C:\\tools;${system}`, KEEP: "unchanged" });
    assert.ok(env.Path.includes(store));
    assert.equal(codexProcessEnvironment(env, { platform: "linux", exists }), env);
    assert.equal(codexProcessEnvironment(env, { platform: "win32", exists: file => files.slice(0, 2).includes(file) }), env, "retain the only installed shell");
    const preferred = { Path: `C:\\portable;${env.Path}` };
    assert.equal(codexProcessEnvironment(preferred, { platform: "win32", exists: file => file === 'C:\\portable\\pwsh.exe' || exists(file) }), preferred);
    const unrelated = { PATH: `C:\\WindowsApps;${system}` };
    assert.equal(codexProcessEnvironment(unrelated, { platform: "win32", exists }), unrelated, "unrelated app directories are untouched");
  } },
  ...["x64", "arm64"].map(arch => ({ name: `156 Windows Codex discovery resolves npm ${arch} launchers and compatible desktop without a shell`, async run() {
    const root = "C:\\Program Files\\nodejs";
    const manifest = `${root}\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-${arch}\\package.json`;
    const native = path.win32.join(path.win32.dirname(manifest), "vendor", arch === "x64" ? "x86_64-pc-windows-msvc" : "aarch64-pc-windows-msvc", "codex", "codex.exe");
    const desktopRoot = "C:\\Program Files\\WindowsApps\\OpenAI.Codex_fixture";
    const desktop = path.win32.join(desktopRoot, "app", "resources", "codex.exe");
    const files = new Set([`${root}\\codex.cmd`, `${root}\\codex.ps1`, native, desktop]);
    let discoveries = 0;
    const dependencies = { platform: "win32", arch, exists: name => files.has(name), resolvePackage: () => manifest,
      installedDesktopLocations: async () => { discoveries++; return [desktopRoot]; } };
    const candidates = options => codexExecutables(options, dependencies);
    const options = { env: { Path: `"${root}"` } };
    const first = await selectCodexExecutable(options, { candidates, readVersion: async () => "0.160.0" });
    assert.equal(first.bin, native); assert.equal(discoveries, 0, "compatible PATH installation avoids desktop discovery");
    const selected = await selectCodexExecutable(options, { candidates, readVersion: async bin => bin === native ? "0.130.0" : "0.162.0-alpha.17.2" });
    assert.equal(selected.bin, desktop); assert.equal(discoveries, 1);
    await assert.rejects(selectCodexExecutable({ ...options, codexBin: `${root}\\codex.cmd` }, { candidates, readVersion: async () => "0.130.0" }), { code: "unsupported_profile", detectedVersions: ["0.130.0"] });
    assert.equal(discoveries, 1, "explicit executable never falls back to another installation");
  } })),
  { name: "156 Codex executable discovery preserves direct PATH and POSIX launches and refuses missing installations", async run() {
    const collect = async generator => { const values = []; for await (const value of generator) values.push(value); return values; };
    assert.deepEqual(await collect(codexExecutables({}, { platform: "linux" })), ["codex"]);
    assert.deepEqual(await collect(codexExecutables({ codexBin: "/opt/codex" }, { platform: "darwin" })), ["/opt/codex"]);
    const win = { platform: "win32", exists: value => value === "C:\\bin\\codex.exe", installedDesktopLocations: async () => [] };
    assert.deepEqual(await collect(codexExecutables({env:{PATH:"C:\\bin"}}, win)), ["C:\\bin\\codex.exe"]);
    await assert.rejects(selectCodexExecutable({}, { candidates: async function* () {}, readVersion: async () => {} }), { code: "runtime_unavailable" });
    await assert.rejects(selectCodexExecutable({}, { candidates: async function* () { yield "codex"; }, readVersion: async () => { throw Object.assign(new Error(secret), {code:"unsupported_profile"}); } }), { code: "unsupported_profile" });
  } },
  { name: "156 Codex preflight reports missing or incompatible executables without leaking subprocess diagnostics", async run() {
    for (const code of ["runtime_unavailable", "unsupported_profile"]) {
      const adapter = createCodexAppServerAdapter({ selectExecutable: async () => { throw Object.assign(new Error(secret), {code,detectedVersions:["0.130.0",secret]}); } });
      await assert.rejects(adapter.inspectCapabilities({cwd:path.resolve(".tmp")}), error => error.code === code && !error.message.includes(secret) && (code !== "unsupported_profile" || (error.message.includes("0.130.0") && error.message.includes("Required: Codex CLI 0.160.0 or newer."))));
    }
  } },
  { name: "156 admitted desktop Codex profile retains result, usage, resume and permission semantics", async run() {
    for (const version of ["0.162.0-alpha.2", "0.162.0-alpha.17.2", "0.163.0", "1.0.0"]) for (const scenario of ["complete", "native-question", "permission:item/commandExecution/requestApproval", "permission:item/fileChange/requestApproval", "permission:item/permissions/requestApproval"]) {
      const p = codexFixture({version,scenario});
      const result = await p.adapter.drive(p.brief,p.options);
      assert.equal(result.cliVersion,version);
      assert.equal(result.outcome, scenario === "complete" ? "done" : scenario === "native-question" ? "needs-input" : "failed");
      if (scenario.startsWith("permission:")) assert.equal(result.failureReason,"automatic_review_routing_failed");
      released(p);
    }
  } },
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
    assert.equal(result.failureReason, "automatic_review_routing_failed"); assert.equal(questions, 0);
    const answer = p.calls.find(call => call.id === "approval-1");
    assert.deepEqual(answer.result, method.includes("permissions") ? { permissions: {}, scope: "turn" } : { decision: "decline" });
    assert.equal(p.calls.find(call => call.method === "thread/start").params.approvalPolicy, "on-request");
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
  { name: "154/02 task00 — unsupported version never starts the server", async run() { const p = codexFixture({ version: "0.159.0" }); const r = await p.adapter.drive(p.brief, p.options); assert.equal(r.failureReason, "unsupported_profile"); assert.equal(p.children.length, 0); } },
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
