// Core assembly: construct once per application; collaborators are supplied explicitly.
import { watch } from "node:fs";
import path from "node:path";
import { createBoardApi } from "@aof/server/board-ui";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
import { processCostMeter, requestClient } from "@aof/foundation/cost-meter";
import { CONVERSATION_UNAVAILABLE, createConversations } from "@aof/execution/conversation-session";
import { resolveSessionLaunch } from "@aof/execution/session-model";

// 172/ADR-001 §5 — the one test seam: a stand-in session that speaks stream-json, launched instead of
// the resolved `claude` (a `.mjs` runs under this server's own node). Nothing else reads it.
const ARCHITECT_EXECUTABLE = "AOF_ARCHITECT_EXECUTABLE";
const unavailable = (reason) => Object.assign(new Error(reason), { code: CONVERSATION_UNAVAILABLE, status: 503 });

export function assembleBoardUi({ commandCoreServices, degradeServices, terminalProvidersServices }) {
  // Core composition for server-owned transports.

  const { invoke } = commandCoreServices;
  const { loadWorkspace } = commandCoreServices;
  // 167/ADR-001 — the board face counts its requests on this process's one cost meter.
  const countRequest = (route, clientHeader) => processCostMeter.count("request", { route, client: requestClient(clientHeader) });

  // 171/ADR-003 — the diagram events stream watches the folders `diagram:scene` names; the watch and the
  // degrade reporter are composed here, so the server transport imports no filesystem of its own.
  const watchDirectory = (directory, onChange) => watch(directory, { recursive: true }, onChange);
  const { reportDegrade } = degradeServices;

  // 172/ADR-001 — the architect's headless conversations: `claude` resolved through the provider seam,
  // launched at the refine phase's model and effort. The sessions are ended with the process that
  // holds them; the exit hook is armed by the first launch, so a verb that never opens one adds none.
  let exitHooked = false;
  const resolveExecutable = () => {
    if (!exitHooked) { exitHooked = true; process.once("exit", () => { void conversations.close(); }); }
    const standIn = process.env[ARCHITECT_EXECUTABLE];
    if (standIn) return /\.m?js$/u.test(standIn) ? { command: process.execPath, args: [path.resolve(standIn)] } : { command: standIn, args: [] };
    const provider = terminalProvidersServices?.resolveProvider("claude");
    const bin = provider?.resolveBinaryPath(process.env) ?? null;
    if (!bin) throw unavailable("No claude executable resolves on this server's PATH.");
    // An npm `.cmd` shim runs only through a shell, and the architect's session is never spawned through one.
    if (/\.(?:cmd|bat)$/iu.test(bin)) throw unavailable(`claude resolves to ${bin}, a shell shim; install the native claude so it can be launched without a shell.`);
    return { command: bin, args: [] };
  };
  const launch = async (cwd) => resolveSessionLaunch((await loadWorkspace(cwd)).config, "refine");
  const conversations = createConversations({ resolveExecutable, launch, reportDegrade });

  const { handleWorkApi, handleDiagramApi } = createBoardApi({ invoke, loadWorkspace, resolveCacheStalenessSeconds, countRequest, watchDirectory, reportDegrade, conversations });

  return { handleWorkApi, handleDiagramApi };
}
