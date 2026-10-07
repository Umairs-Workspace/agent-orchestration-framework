import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { resolveStartToCloseMs } from "@aof/contracts/loop-bounds";
import { resolveExecution, validateExecutionEnvelope } from "./runtime-selection.mjs";
import { CODEX_PROFILE, CODEX_RESULT_SCHEMA, parseCodexPhaseResult, permissionReply, nativeQuestion, nativeUsage } from "./codex-protocol-profile.mjs";

const named = value => typeof value === "string" && value.trim().length > 0;
const positive = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
const failure = code => Object.assign(new Error(code), { code });
export const codexServerCommand = (bin = process.platform === "win32" ? "codex.exe" : "codex") => ({ bin, args: ["app-server", "--listen", "stdio://"] });
function probeVersion(bin, options) {
  return new Promise((resolve, reject) => {
    execFile(bin, ["--version"], { cwd: options.cwd, env: options.env, signal: options.signal, timeout: 5000, maxBuffer: 65536, windowsHide: true }, (error, stdout) => {
      if (error) reject(failure("runtime_unavailable"));
      else { const match = /^codex-cli (\d+\.\d+\.\d+)\s*$/u.exec(String(stdout).trim()); match ? resolve(match[1]) : reject(failure("unsupported_profile")); }
    });
  });
}
async function terminateOwned(child) {
  if (child.exitCode !== null && child.exitCode !== undefined) return;
  if (process.platform === "win32" && Number.isSafeInteger(child.pid) && child.pid > 0) {
    await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { timeout: 2000, windowsHide: true }, error => { if (error) child.kill("SIGKILL"); resolve(); }));
  } else if (Number.isSafeInteger(child.pid) && child.pid > 0) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  } else child.kill("SIGKILL");
}

// One owned server per operation. No shell, permission override, auth mutation or fallback.
export function createCodexAppServerAdapter({ spawnChild = spawn, readVersion = probeVersion, terminate = terminateOwned, composePhaseBriefInput = null } = {}) {
  async function operate(brief, options, readOnly = false) {
    let child, sessionId = null, turnId = null, cliVersion = null, execution = null, terminal = null;
    let closed = false, finishing = false, finalText = null, queued = 0, sequence = 0, partial = "";
    let events = Promise.resolve();
    let releaseTurn;
    const turnReady = new Promise(resolve => { releaseTurn = resolve; });
    const pending = new Map();
    const cleanupWarnings = [];
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const requestMs = positive(options.requestTimeoutMs, CODEX_PROFILE.requestMs);
    const interruptMs = positive(options.interruptMs, CODEX_PROFILE.interruptMs);
    const closeMs = positive(options.closeMs, CODEX_PROFILE.closeMs);
    let resolveTerminal, resolveClosed;
    const settled = new Promise(resolve => { resolveTerminal = resolve; });
    const exited = new Promise(resolve => { resolveClosed = resolve; });
    const fail = code => settle({ outcome: "failed", failureReason: code });
    function settle(result) {
      if (terminal) return;
      terminal = result; resolveTerminal(result);
      for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(failure(result.failureReason ?? "operation_settled")); }
      pending.clear();
    }
    function write(message) {
      if (!child?.stdin?.writable || closed) throw failure("protocol_disconnected");
      const data = JSON.stringify(message);
      if (Buffer.byteLength(data) > CODEX_PROFILE.frameBytes) throw failure("protocol_frame_too_large");
      child.stdin.write(data + "\n");
    }
    function request(method, params, ms = requestMs) {
      if (closed || (terminal && !finishing)) return Promise.reject(failure("operation_settled"));
      if (pending.size >= 32) return Promise.reject(failure("protocol_request_limit"));
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(failure("protocol_timeout")); if (!finishing) fail("protocol_timeout"); }, ms);
        pending.set(id, { resolve, reject, timer });
        try { write({ id, method, params }); } catch (error) { pending.delete(id); clearTimeout(timer); reject(error); }
      });
    }
    async function publishQuestion(question) {
      if (!sessionId || !question) { fail("question_invalid"); return; }
      await persist(options.onQuestion, question);
      settle({ outcome: "needs-input", question });
    }
    async function persist(callback, value) {
      if (!callback) return;
      await Promise.race([Promise.resolve().then(() => callback(value)), settled.then(() => { throw failure("operation_settled"); })]);
    }
    async function event(message) {
      if (terminal || finishing) return;
      await Promise.race([turnReady, settled]);
      if (terminal || finishing) return;
      const { method, params = {} } = message;
      if (Object.hasOwn(message, "id")) {
        const reply = permissionReply(method);
        if (reply) { write({ id: message.id, result: reply }); fail("operator_action_required"); return; }
        if (method === "item/tool/requestUserInput") {
          if (!turnId || params.turnId !== turnId) { fail("question_invalid"); return; }
          await publishQuestion(nativeQuestion(params, sessionId)); return;
        }
        write({ id: message.id, error: { code: -32601, message: "Unsupported server request" } });
        fail("protocol_unknown_request"); return;
      }
      if (method === "turn/started" && params.threadId === sessionId) {
        if (!named(params.turn?.id) || (turnId && turnId !== params.turn.id)) { fail("protocol_identity_mismatch"); return; }
        turnId = params.turn.id;
      }
      if (params.threadId !== sessionId || (params.turnId && params.turnId !== turnId)) return;
      await persist(options.onActivity, { type: "protocol", method: ["turn/started", "item/completed", "turn/completed", "thread/tokenUsage/updated"].includes(method) ? method : "notification", sessionId });
      if (method === "thread/tokenUsage/updated") {
        const usage = nativeUsage(params, sessionId, turnId);
        if (!usage) { fail("usage_invalid"); return; }
        await persist(options.onUsage, usage);
      } else if (method === "item/completed" && params.item?.type === "agentMessage" && [undefined, null, "final_answer"].includes(params.item.phase)) {
        if (typeof params.item.text !== "string" || Buffer.byteLength(params.item.text) > CODEX_PROFILE.resultBytes) { fail("result_invalid"); return; }
        finalText = params.item.text;
      } else if (method === "turn/completed" && params.turn?.id === turnId) {
        if (params.turn.status !== "completed") { fail(params.turn.status === "interrupted" ? "abort" : "phase_failed"); return; }
        const result = parseCodexPhaseResult(finalText);
        if (!result) { fail("result_invalid"); return; }
        if (result.status === "needs_input") await publishQuestion({ ...result.question, sessionId });
        else settle(result.status === "complete" ? { outcome: "done" } : { outcome: "failed", failureReason: result.failureReason });
      }
    }
    function frame(line) {
      if (!line.trim()) return;
      if (Buffer.byteLength(line) > CODEX_PROFILE.frameBytes) { fail("protocol_frame_too_large"); return; }
      let message; try { message = JSON.parse(line); } catch { fail("protocol_invalid_json"); return; }
      if (message === null || typeof message !== "object" || Array.isArray(message)) { fail("protocol_invalid_message"); return; }
      if (Object.hasOwn(message, "id") && !Object.hasOwn(message, "method")) {
        const entry = pending.get(message.id);
        if (!entry || (Object.hasOwn(message, "result") === Object.hasOwn(message, "error"))) { fail("protocol_unmatched_response"); return; }
        pending.delete(message.id); clearTimeout(entry.timer);
        Object.hasOwn(message, "error") ? entry.reject(failure("protocol_rpc_error")) : entry.resolve(message.result);
        return;
      }
      if (!named(message.method)) { fail("protocol_invalid_message"); return; }
      if (finishing || terminal) return;
      if (++queued > CODEX_PROFILE.queuedMessages) { fail("protocol_queue_limit"); return; }
      events = events.then(() => event(message)).catch(() => fail("persistence_failed")).finally(() => { queued--; });
    }
    function data(chunk) {
      if (terminal && !finishing) return;
      try {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          partial += lines[i];
          if (Buffer.byteLength(partial) > CODEX_PROFILE.frameBytes) { fail("protocol_frame_too_large"); return; }
          if (i < lines.length - 1) { frame(partial); partial = ""; }
          if (terminal) return;
        }
      } catch { fail("protocol_invalid_json"); }
    }
    const abort = () => fail("abort");
    const deadline = setTimeout(() => fail("timeout"), resolveStartToCloseMs(options.deadlinePolicy?.startToCloseMs ?? options.timeoutMs));
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      if (options.signal?.aborted) { abort(); return { ...terminal, sessionId, processStarted: false }; }
      if (!named(brief.worktreeCwd) || !path.isAbsolute(brief.worktreeCwd)) throw failure("invalid_worktree");
      const command = codexServerCommand(options.codexBin);
      cliVersion = await readVersion(command.bin, { cwd: brief.worktreeCwd, env: options.env, signal: options.signal });
      if (terminal) return { ...terminal, sessionId, processStarted: false };
      if (!CODEX_PROFILE.supportedVersions.includes(cliVersion)) throw failure("unsupported_profile");
      child = spawnChild(command.bin, command.args, { cwd: brief.worktreeCwd, env: options.env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, detached: true, shell: false });
      child.stdout.on("data", data);
      child.stderr.resume(); // Drain without retaining or publishing potentially sensitive diagnostics.
      child.stderr.on("error", () => fail("protocol_disconnected"));
      child.stdin.on("error", () => fail("protocol_disconnected"));
      child.stdout.on("error", () => fail("protocol_disconnected"));
      child.on("error", () => fail("runtime_unavailable"));
      child.on("close", () => { closed = true; resolveClosed(); if (!finishing) events.then(() => { if (!terminal) fail("protocol_disconnected"); }); });
      options.onProcessLive?.(child);
      const init = await request("initialize", { clientInfo: { name: "aof", version: "0.1.0" }, capabilities: { experimentalApi: true } });
      if (!named(init?.userAgent)) throw failure("protocol_initialization_invalid");
      write({ method: "initialized", params: {} });
      if (readOnly === "catalog") {
        const catalog = await request("model/list", { limit: 100, includeHidden: false });
        if (!Array.isArray(catalog?.data) || catalog.nextCursor != null) throw failure("runtime_capabilities_unavailable");
        settle({ outcome: "done", models: catalog.data });
      } else if (readOnly) {
        const result = await request("thread/read", { threadId: options.resumeSessionId, includeTurns: false });
        settle({ outcome: result?.thread?.id === options.resumeSessionId ? "done" : "failed", ...(result?.thread?.id === options.resumeSessionId ? {} : { failureReason: "resume_unavailable" }) });
      } else {
        const catalog = await request("model/list", { limit: 100, includeHidden: false });
        if (!Array.isArray(catalog?.data) || catalog.nextCursor != null) throw failure("runtime_capabilities_unavailable");
        execution = options.execution === undefined ? resolveExecution(options.config ?? {}, { runtime: "codex", choices: options.choices ?? {}, capabilities: { codex: { models: catalog.data } } }) : validateExecutionEnvelope(options.execution);
        if (execution.runtime !== "codex") throw failure("unsupported_runtime");
        const phase = brief.phase ?? "continue";
        const phaseChoice = execution.phases[phase];
        if (!phaseChoice) throw failure("invalid_phase");
        const roleChoice = brief.role == null ? null : execution.roles[brief.role];
        const choice = { ...phaseChoice, model: roleChoice?.model ?? phaseChoice.model, effort: roleChoice?.effort ?? phaseChoice.effort };
        // Revalidate pinned choices against this server without rewriting their provenance.
        const choices = Object.fromEntries(Object.entries(execution.phases).map(([key, value]) => [key, { model: value.model, effort: value.effort }]));
        resolveExecution({}, { runtime: "codex", choices, capabilities: { codex: { models: catalog.data } } });
        if (roleChoice != null) resolveExecution({}, { runtime: "codex", choices: { ...choices, [phase]: { model: choice.model, effort: choice.effort } }, capabilities: { codex: { models: catalog.data } } });
        const resumed = options.resumeSessionId;
        if (resumed !== undefined && !named(resumed)) throw failure("resume_unavailable");
        const response = await request(resumed ? "thread/resume" : "thread/start", { cwd: brief.worktreeCwd, model: choice.model, ...(resumed ? { threadId: resumed, excludeTurns: true } : {}) });
        sessionId = response?.thread?.id;
        if (!named(sessionId) || (resumed && sessionId !== resumed)) throw failure("protocol_identity_mismatch");
        try { await persist(options.onIdentity, sessionId); await persist(options.onSessionIdCaptured, sessionId); } catch { throw failure("persistence_failed"); }
        const metadata = { itemRef: brief.itemRef, phase, procedure: brief.procedure ?? null, arguments: brief.arguments ?? [], task: brief.task ?? null, command: brief.command ?? null, ...(brief.role == null ? {} : { role: brief.role }) };
        if (brief.context != null && typeof composePhaseBriefInput !== "function") throw failure("phase_input_invalid");
        const composed = typeof composePhaseBriefInput === "function" ? composePhaseBriefInput(brief.command ?? brief.procedure ?? "", brief.context) : brief.command ?? brief.procedure ?? "";
        const text = JSON.stringify(metadata) + "\n" + composed + "\nReturn only the phase result JSON matching the output schema. Use complete only when the requested procedure has finished; needs_input for a blocking business question. Never approve permission requests.";
        if (Buffer.byteLength(text) > CODEX_PROFILE.resultBytes) throw failure("phase_input_too_large");
        const started = await request("turn/start", { threadId: sessionId, cwd: brief.worktreeCwd, model: choice.model, effort: choice.effort, input: [{ type: "text", text, text_elements: [] }], outputSchema: CODEX_RESULT_SCHEMA });
        if (!named(started?.turn?.id) || (turnId && started.turn.id !== turnId)) throw failure("protocol_identity_mismatch");
        turnId = started.turn.id;
        await persist(options.onTurnStarted, { sessionId, turnId });
        releaseTurn();
        await settled; await events;
      }
    } catch (error) {
      // Never expose error.message, stderr, arbitrary server codes or payloads.
      const allowed = ["runtime_unavailable", "unsupported_profile", "invalid_worktree", "unsupported_runtime", "invalid_phase", "resume_unavailable", "protocol_identity_mismatch", "protocol_initialization_invalid", "runtime_capabilities_unavailable", "phase_input_too_large", "phase_input_invalid", "persistence_failed", "protocol_timeout", "protocol_rpc_error", "protocol_disconnected", "protocol_frame_too_large", "protocol_request_limit"];
      fail(allowed.includes(error?.code) ? error.code : "execution_invalid");
    } finally {
      releaseTurn();
      clearTimeout(deadline); options.signal?.removeEventListener("abort", abort);
      finishing = true;
      if (child) {
        if (!closed && sessionId && turnId && terminal?.outcome !== "done") {
          try { await request("turn/interrupt", { threadId: sessionId, turnId }, interruptMs); } catch { cleanupWarnings.push("interrupt_failed"); }
        }
        try { child.stdin.end(); } catch { cleanupWarnings.push("stdin_close_failed"); }
        const graceful = await Promise.race([exited.then(() => true), new Promise(resolve => { const timer = setTimeout(() => resolve(false), closeMs); exited.then(() => clearTimeout(timer)); })]);
        if (!graceful) {
          let timer;
          try {
            await Promise.race([Promise.resolve().then(() => terminate(child)), new Promise((_, reject) => { timer = setTimeout(() => reject(failure("cleanup_failed")), 2000); })]);
          } catch {
            try { child.kill("SIGKILL"); } catch { terminal = { outcome: "failed", failureReason: "cleanup_failed" }; }
          } finally { clearTimeout(timer); }
        }
        child.stdout.removeListener("data", data);
        child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
      }
      for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(failure("operation_settled")); } pending.clear();
    }
    return { ...terminal, sessionId, processStarted: Boolean(child), cliVersion, profile: CODEX_PROFILE.name, profileVersion: CODEX_PROFILE.version, ...(execution ? { execution } : {}), ...(cleanupWarnings.length ? { cleanupWarnings } : {}) };
  }
  return Object.freeze({ capabilities: Object.freeze({ transport: "app-server-stdio", profile: CODEX_PROFILE.name, profileVersion: 1,
    compatibility: "live-probed", cliVersions: CODEX_PROFILE.supportedVersions, nativeIdentity: true, resume: true, usage: true,
    questions: true, structuredQuestionFallback: true, nativeQuestions: "runtime-dependent" }),
    drive: (brief, options = {}) => operate(brief, options),
    async inspectCapabilities(options = {}) {
      const result = await operate({ worktreeCwd: options.cwd }, options, "catalog");
      if (result.outcome !== "done") throw failure(result.failureReason);
      return { models: result.models, profile: CODEX_PROFILE.name, profileVersion: CODEX_PROFILE.version };
    },
    async canResume(sessionId, options = {}) {
      if (!named(sessionId)) return false;
      return (await operate({ worktreeCwd: options.cwd }, { ...options, resumeSessionId: sessionId }, true)).outcome === "done";
    } });
}
