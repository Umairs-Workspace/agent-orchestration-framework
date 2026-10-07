import { stat } from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";

// Runtime policy ends at this boundary; adapters own their native lifecycle and cleanup.
export function createRuntimeSession({ adapters }) {
  const registered = new Map(Object.entries(adapters ?? {}));
  for (const [runtime, adapter] of registered) {
    if (typeof adapter?.drive !== "function") throw new TypeError(`${runtime}: adapter.drive is required`);
  }

  function capabilities(runtime) {
    return registered.get(runtime)?.capabilities ?? null;
  }

  async function canResume(runtime, sessionId, options = {}) {
    const adapter = registered.get(runtime);
    if (typeof sessionId !== "string" || !sessionId || typeof adapter?.canResume !== "function") return false;
    return adapter.canResume(sessionId, options);
  }

  async function drive(brief, options = {}) {
    const runtime = options.execution?.runtime ?? options.runtime ?? "claude";
    const adapter = registered.get(runtime);
    if (!adapter) return { outcome: "failed", failureReason: "unsupported_runtime", sessionId: null, processStarted: false };
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    let sessionId = null;
    let persistenceFailure = null;
    let pending = Promise.resolve();
    const publish = (kind, value) => {
      // Adapters may emit synchronously. Attach the rejection handler immediately, and
      // retain it here even when a legacy transport treats callback faults as advisory.
      pending = pending.then(async () => {
        if (persistenceFailure) return;
        if (kind === "Identity") sessionId = value;
        await options[`on${kind}`]?.(value);
      }).catch(() => {
        persistenceFailure ??= kind.toLowerCase();
        controller.abort();
      });
      return pending;
    };
    let result;
    try {
      result = await adapter.drive(brief, {
        ...options,
        signal: controller.signal,
        onIdentity: value => publish("Identity", value),
        onActivity: value => publish("Activity", value),
        onQuestion: value => publish("Question", value),
        onUsage: value => publish("Usage", value),
      });
      await pending;
      if (result?.sessionId && result.sessionId !== sessionId) await publish("Identity", result.sessionId);
      // Wait for every event queued before terminal settlement, including unawaited
      // synchronous producers. Completion never outruns durable identity or questions.
      await pending;
      if (persistenceFailure) return { ...result, outcome: "failed", failureReason: "persistence_failed", persistenceEvent: persistenceFailure, sessionId };
      if (!["done", "failed", "needs-input"].includes(result?.outcome)) {
        return { outcome: "failed", failureReason: "invalid_session_result", sessionId };
      }
      return { ...result, sessionId: result.sessionId ?? sessionId };
    } catch {
      await pending;
      return { outcome: "failed", failureReason: persistenceFailure ? "persistence_failed" : "agent_error", sessionId, ...(persistenceFailure ? { persistenceEvent: persistenceFailure } : {}) };
    } finally {
      options.signal?.removeEventListener("abort", abort);
      controller.abort();
    }
  }

  return Object.freeze({ drive, capabilities, canResume });
}

export function createClaudeSessionAdapter({ driveInteractiveClaudeSession, claudeProjectsDir, readAskQuestion, readPendingAsk }) {
  if (typeof driveInteractiveClaudeSession !== "function") throw new TypeError("Claude session driver is required");
  return Object.freeze({
    capabilities: Object.freeze({ transport: "pty", nativeIdentity: true, resume: true, questions: true, usage: false }),
    async canResume(sessionId, { cwd, env } = {}) {
      if (!/^[A-Za-z0-9_-]+$/.test(sessionId) || typeof cwd !== "string" || typeof claudeProjectsDir !== "function") return false;
      try {
        return (await stat(path.join(claudeProjectsDir({ cwd, env }), `${sessionId}.jsonl`))).isFile();
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
        throw error;
      }
    },
    async drive(brief, options = {}) {
      const since = new Date().toISOString();
      let output = "";
      const result = await driveInteractiveClaudeSession(brief, {
        ...options,
        driver: "claude",
        onSessionIdCaptured: async id => {
          await options.onIdentity?.(id);
          await options.onSessionIdCaptured?.(id);
        },
        onOutputChunk: (chunk, id) => {
          output = (output + stripVTControlCharacters(String(chunk))).slice(-8192);
          options.onActivity?.({ type: "output", sessionId: id });
          options.onOutputChunk?.(chunk, id);
        },
      });
      if (result?.outcome === "needs-input") {
        const lookup = { cwd: brief.worktreeCwd, env: options.env, sessionId: result.sessionId };
        const pending = options.heartbeat?.itemDir && readPendingAsk
          ? await readPendingAsk({ ...lookup, itemDir: options.heartbeat.itemDir, since }) : null;
        // Native records remain authoritative. The bounded four-line producer is
        // also available when the terminal sentinel arrives before its transcript.
        const terminalQuestion = output.match(/(?:^|\n)(Decision needed:[^\n]*\nOptions:[^\n]*\nI would pick:[^\n]*\nWhat the answer changes:[^\n]*)/g)?.at(-1)?.trim();
        const question = result.question ?? pending?.question ?? await readAskQuestion?.(lookup) ?? terminalQuestion ?? null;
        if (question != null) {
          await options.onQuestion?.(question);
          return { ...result, question };
        }
      }
      return result;
    },
  });
}
