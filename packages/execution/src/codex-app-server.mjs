import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { resolveStartToCloseMs } from "@aof/contracts/loop-bounds";
import { resolveExecution, validateExecutionEnvelope } from "./runtime-selection.mjs";
import { CODEX_PROFILE, isSupportedCodexVersion, CODEX_RESULT_SCHEMA, CODEX_AUTO_REVIEW, CODEX_REVIEW_METHODS, parseCodexPhaseResult, permissionReply, validPermissionRequest, nativeReview, nativeQuestion, nativeUsage } from "./codex-protocol-profile.mjs";
import { normalizeCodexActivity, reducePermissionReviews } from "./runtime-events.mjs";
import { selectCodexExecutable } from "./codex-executable.mjs";
import { codexProcessEnvironment } from "./codex-process-environment.mjs";

const named = value => typeof value === "string" && value.trim().length > 0;
const positive = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
const failure = code => Object.assign(new Error(code), { code });
export const codexServerCommand = (bin = process.platform === "win32" ? "codex.exe" : "codex") => ({ bin, args: ["app-server", "--listen", "stdio://"] });
function probeVersion(bin, options) {
  return new Promise((resolve, reject) => {
    execFile(bin, ["--version"], { cwd: options.cwd, env: options.env, signal: options.signal, timeout: 5000, maxBuffer: 65536, windowsHide: true }, (error, stdout) => {
      if (error) reject(failure("runtime_unavailable"));
      else { const match = /^codex-cli (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\s*$/u.exec(String(stdout).trim()); match ? resolve(match[1]) : reject(failure("unsupported_profile")); }
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

// One owned server per operation. Native review owns grants; AOF never widens the sandbox.
export function createCodexAppServerAdapter({ spawnChild = spawn, readVersion = probeVersion, selectExecutable = selectCodexExecutable, terminate = terminateOwned, composePhaseBriefInput = null } = {}) {
  async function operate(brief, options, readOnly = false, selectedExecutable = null) {
    let child, sessionId = null, turnId = null, cliVersion = null, execution = null, terminal = null;
    let closed = false, finishing = false, finalText = null, queued = 0, sequence = 0, partial = "";
    let events = Promise.resolve();
    let reviews = [];
    const reviewPending = () => reviews.some(review => review.observationState === "pending");
    let releaseTurn;
    const turnReady = new Promise(resolve => { releaseTurn = resolve; });
    const pending = new Map();
    const cleanupWarnings = [];
    let detectedVersions = [], discoveryIssues = [], probeIssues = [];
    let executable = null;
    const selectionStop = new AbortController();
    const selectionSignal = options.signal ? AbortSignal.any([options.signal, selectionStop.signal]) : selectionStop.signal;
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
      terminal = result; resolveTerminal(result); selectionStop.abort();
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
        if (!(named(message.id) || Number.isSafeInteger(message.id))) { fail("protocol_invalid_message"); return; }
        const reply = permissionReply(method);
        if (reply) {
          if (!validPermissionRequest(method, params, sessionId, turnId)) { fail("protocol_invalid_permission_request"); return; }
          write({ id: message.id, result: reply }); fail("automatic_review_routing_failed"); return;
        }
        if (method === "item/tool/requestUserInput") {
          if (!turnId || params.turnId !== turnId) { fail("question_invalid"); return; }
          await publishQuestion(nativeQuestion(params, sessionId)); return;
        }
        write({ id: message.id, error: { code: -32601, message: "Unsupported server request" } });
        fail("protocol_unknown_request"); return;
      }
      if (permissionReply(method)) { fail("protocol_invalid_permission_request"); return; }
      if (CODEX_REVIEW_METHODS.includes(method)) {
        let review;
        try {
          review = nativeReview(method, params, sessionId, turnId);
          if (!review) return;
          const next = reducePermissionReviews(reviews, review);
          if (next === reviews) return;
          reviews = next;
        } catch { fail("native_review_invalid"); return; }
        await persist(options.onActivity, review);
        return;
      }
      if (method === "turn/started" && params.threadId === sessionId) {
        if (!named(params.turn?.id) || (turnId && turnId !== params.turn.id)) { fail("protocol_identity_mismatch"); return; }
        turnId = params.turn.id;
      }
      if (params.threadId !== sessionId || (params.turnId && params.turnId !== turnId)) return;
      const activity = normalizeCodexActivity(method, params, sessionId, turnId, new Date().toISOString());
      if (activity) await persist(options.onActivity, activity);
      if (method === "thread/tokenUsage/updated") {
        const usage = nativeUsage(params, sessionId, turnId);
        if (!usage) { fail("usage_invalid"); return; }
        await persist(options.onUsage, usage);
      } else if (method === "item/completed" && params.item?.type === "agentMessage" && [undefined, null, "final_answer"].includes(params.item.phase)) {
        if (typeof params.item.text !== "string" || Buffer.byteLength(params.item.text) > CODEX_PROFILE.resultBytes) { fail("result_invalid"); return; }
        finalText = params.item.text;
      } else if (method === "turn/completed" && params.turn?.id === turnId) {
        if (params.turn.status !== "completed") { fail(params.turn.status === "interrupted" ? "abort" : "phase_failed"); return; }
        if (reviewPending()) { fail("native_review_incomplete"); return; }
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
      // Output deltas and legacy/extension notifications are not consumed here.
      // Discard them before the persistence queue: a verbose native command must
      // not crowd out phase results, usage, questions or approval refusals.
      if (!Object.hasOwn(message, "id") && !["turn/started", "turn/completed", "thread/tokenUsage/updated",
        "item/started", "item/completed", "item/agentMessage/delta", ...CODEX_REVIEW_METHODS].includes(message.method) && !permissionReply(message.method)) return;
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
      const selected = selectedExecutable ?? await selectExecutable({ codexBin: options.codexBin, cwd: brief.worktreeCwd, env: options.env, signal: selectionSignal }, {
        readVersion,
        probeExecutable: async candidate => {
          // Reuse the owned transport for a read-only handshake. No thread, turn,
          // persistence callbacks or permission decisions occur during selection.
          const probe = await operate({ worktreeCwd: brief.worktreeCwd }, {
            env: options.env, signal: selectionSignal, requestTimeoutMs: requestMs,
            timeoutMs: requestMs * 2 + closeMs, closeMs, interruptMs,
          }, "catalog", candidate);
          if (probe.outcome !== "done") throw failure(probe.failureReason);
          return probe;
        },
      });
      if (terminal) return { ...terminal, sessionId, processStarted: false };
      // The successful probe already owns and has closed this catalog connection.
      if (readOnly === "catalog" && selected.probe) return selected.probe;
      executable = selected.bin;
      const command = codexServerCommand(selected.bin);
      cliVersion = selected.cliVersion;
      if (terminal) return { ...terminal, sessionId, processStarted: false };
      if (!isSupportedCodexVersion(cliVersion)) throw failure("unsupported_profile");
      child = spawnChild(command.bin, command.args, { cwd: brief.worktreeCwd, env: codexProcessEnvironment(options.env), stdio: ["pipe", "pipe", "pipe"], windowsHide: true, detached: true, shell: false });
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
        let response;
        try {
          response = await request(resumed ? "thread/resume" : "thread/start", { cwd: brief.worktreeCwd, model: choice.model, ...CODEX_AUTO_REVIEW, ...(resumed ? { threadId: resumed, excludeTurns: true } : {}) });
        } catch (error) { throw error.code === "protocol_rpc_error" ? failure("automatic_review_unavailable") : error; }
        sessionId = response?.thread?.id;
        if (!named(sessionId) || (resumed && sessionId !== resumed)) throw failure("protocol_identity_mismatch");
        if (response.approvalsReviewer !== CODEX_AUTO_REVIEW.approvalsReviewer || response.approvalPolicy !== CODEX_AUTO_REVIEW.approvalPolicy) throw failure("automatic_review_unavailable");
        try { await persist(options.onIdentity, sessionId); await persist(options.onSessionIdCaptured, sessionId); } catch { throw failure("persistence_failed"); }
        const metadata = { itemRef: brief.itemRef, phase, procedure: brief.procedure ?? null, arguments: brief.arguments ?? [], task: brief.task ?? null, command: brief.command ?? null, ...(brief.role == null ? {} : { role: brief.role }) };
        if (brief.context != null && typeof composePhaseBriefInput !== "function") throw failure("phase_input_invalid");
        const composed = typeof composePhaseBriefInput === "function" ? composePhaseBriefInput(brief.command ?? brief.procedure ?? "", brief.context) : brief.command ?? brief.procedure ?? "";
        const text = JSON.stringify(metadata) + "\n" + composed + "\nThe operator launched the item and phase named above, delegating task-related permission decisions to native automatic review. This does not authorize unrelated actions or override native policy. Use the native permission mechanism when needed; native review owns the decision. Return only the phase result JSON matching the output schema. Use complete only when the requested procedure has finished; needs_input for a blocking business question.";
        if (Buffer.byteLength(text) > CODEX_PROFILE.resultBytes) throw failure("phase_input_too_large");
        const started = await request("turn/start", { threadId: sessionId, cwd: brief.worktreeCwd, model: choice.model, effort: choice.effort, input: [{ type: "text", text, text_elements: [] }], outputSchema: CODEX_RESULT_SCHEMA });
        if (!named(started?.turn?.id) || (turnId && started.turn.id !== turnId)) throw failure("protocol_identity_mismatch");
        turnId = started.turn.id;
        await persist(options.onTurnStarted, { sessionId, turnId, ...CODEX_AUTO_REVIEW });
        releaseTurn();
        await settled; await events;
      }
    } catch (error) {
      discoveryIssues = (error.discoveryIssues ?? []).filter(issue => ["editor", "desktop"].includes(issue?.source)
        && ["discovery_failed", "discovery_timeout", "executable_missing"].includes(issue?.code)).map(({ source, code }) => ({ source, code }));
      probeIssues = (error.probeIssues ?? []).filter(issue => ["probe_timeout", "probe_failed", "version_unavailable"].includes(issue?.code))
        .map(issue => ({ code: issue.code, ...(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(issue.version) ? { version: issue.version } : {}) }));
      detectedVersions = (error.detectedVersions ?? []).filter(value => typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(value));
      // Never expose error.message, stderr, arbitrary server codes or payloads.
      const allowed = ["automatic_review_unavailable", "runtime_unavailable", "runtime_discovery_failed", "runtime_preflight_failed", "unsupported_profile", "invalid_worktree", "unsupported_runtime", "invalid_phase", "resume_unavailable", "protocol_identity_mismatch", "protocol_initialization_invalid", "runtime_capabilities_unavailable", "phase_input_too_large", "phase_input_invalid", "persistence_failed", "protocol_timeout", "protocol_rpc_error", "protocol_disconnected", "protocol_frame_too_large", "protocol_request_limit"];
      fail(allowed.includes(error?.code) ? error.code : "execution_invalid");
    } finally {
      releaseTurn();
      selectionStop.abort();
      clearTimeout(deadline); options.signal?.removeEventListener("abort", abort);
      finishing = true;
      if (reviewPending()) {
        // Best-effort bounded observation after stop, never a native decision or rollback.
        // Persistence failure remains failure even if native execution already happened.
        // The write is a persistence operation, so it is bounded by the request bound, not the
        // child's 1 s close grace: under load a successful run-record write outlasted closeMs and a
        // clean withdrawal was recorded failed/persistence_failed (158 E6, 2026-10-14).
        let timer;
        try {
          await Promise.race([Promise.resolve().then(() => options.onActivity?.({ kind: "permission-review-interrupted", sessionId, turnId,
            observationState: terminal?.failureReason === "abort" ? "interrupted" : "unknown" })),
          new Promise((_, reject) => { timer = setTimeout(() => reject(failure("persistence_failed")), requestMs); })]);
        } catch { terminal = { outcome: "failed", failureReason: "persistence_failed" }; }
        finally { clearTimeout(timer); }
      }
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
    return { ...terminal, sessionId, processStarted: Boolean(child), cliVersion, executable, ...(discoveryIssues.length ? { discoveryIssues } : {}), ...(probeIssues.length ? { probeIssues } : {}), profile: CODEX_PROFILE.name, profileVersion: CODEX_PROFILE.version, ...(detectedVersions.length ? { detectedVersions } : {}), ...(execution ? { execution } : {}), ...(cleanupWarnings.length ? { cleanupWarnings } : {}) };
  }
  return Object.freeze({ capabilities: Object.freeze({ transport: "app-server-stdio", profile: CODEX_PROFILE.name, profileVersion: 1,
    compatibility: "live-probed", minimumCliVersion: CODEX_PROFILE.minimumVersion, nativeIdentity: true, resume: true, usage: true,
    questions: true, structuredQuestionFallback: true, nativeQuestions: "runtime-dependent" }),
    drive: (brief, options = {}) => operate(brief, options),
    async inspectCapabilities(options = {}) {
      const result = await operate({ worktreeCwd: options.cwd }, options, "catalog");
      if (result.outcome !== "done") {
        const error = failure(result.failureReason);
        if (result.failureReason === "runtime_unavailable") error.message = "Codex could not be started. Check that Codex is installed and executable; AOF checks PATH, npm launchers, registered VS Code extensions and the Windows Codex desktop app.";
        if (result.failureReason === "unsupported_profile") error.message = `No compatible Codex CLI was found. Detected: ${result.detectedVersions?.join(", ") || result.cliVersion || "unrecognized version"}. Required: Codex CLI ${CODEX_PROFILE.minimumVersion} or newer.`;
        if (result.failureReason === "runtime_discovery_failed") error.message = "Codex discovery was incomplete. AOF could not check every installation.";
        if (result.failureReason === "runtime_preflight_failed") error.message = "Codex installations were found, but none passed the App Server initialize/model-list check.";
        const details = [
          ...(result.discoveryIssues ?? []).map(issue => (issue.source === "desktop" ? "Windows desktop" : "VS Code extensions") + ": " + ({ discovery_timeout: "discovery timed out", discovery_failed: "discovery failed", executable_missing: "registered executable is missing" })[issue.code]),
          ...(result.probeIssues ?? []).map(issue => "Codex" + (issue.version ? " " + issue.version : "") + ": " + ({ probe_timeout: "App Server check timed out", probe_failed: "App Server check failed", version_unavailable: "executable could not report its version" })[issue.code]),
        ];
        if (details.length) error.message += " Checks: " + details.join("; ") + ".";
        if (["runtime_discovery_failed", "runtime_preflight_failed"].includes(result.failureReason) && result.detectedVersions?.length) error.message += " Detected versions: " + result.detectedVersions.join(", ") + ".";
        throw error;
      }
      return { executable: result.executable, cliVersion: result.cliVersion, models: result.models, profile: CODEX_PROFILE.name, profileVersion: CODEX_PROFILE.version };
    },
    async canResume(sessionId, options = {}) {
      if (!named(sessionId)) return false;
      return (await operate({ worktreeCwd: options.cwd }, { ...options, resumeSessionId: sessionId }, true)).outcome === "done";
    } });
}
