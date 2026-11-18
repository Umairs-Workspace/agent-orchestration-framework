// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { createMemoryCommand } from "@aof/knowledge/commands/memory";
import { readMemoryConfig } from "@aof/knowledge/memory-config";
import { PICK_INSTRUCTION, PICK_MISS, renderPickRequest } from "@aof/knowledge/memory/recall-pick";
import { createRecallRecorder } from "@aof/work/commands/feedback";

// 201/ADR-004 — the one test seam: a stand-in launched instead of the resolved `claude` (a `.mjs`
// runs under this process's own node), as the board's headless conversation has. The recall
// replay script (201/03, `scripts/memory-recall-replay.mjs`) reads it too, for its judge, so one
// stand-in answers both calls; nothing else reads it, and no test starts the real one.
const PICK_EXECUTABLE = "AOF_RECALL_PICK_EXECUTABLE";
// An npm `.cmd` shim runs only through a shell, and the pick is never spawned through one.
const SHELL_SHIM = /\.(?:cmd|bat)$/iu;

// How a model ask's outcome reads as a pick (201/ADR-003 §2). An answer is its text; anything the
// table does not name is a failure.
const ASK_MISSES = Object.freeze({ timeout: PICK_MISS.timeout, failed: PICK_MISS.failed, unreadable: PICK_MISS.unreadable });

export function assembleCommandsWorkMemory({ workMemoryServices, commandsResolveServices, effectsDocTransitionsServices, globalWorkPublisherServices, terminalProvidersServices, degradeServices }) {
  // Core composition for knowledge-owned services.

  const { MEMORY_USAGE } = workMemoryServices;
  const { RECORD_RECALL_VERB } = workMemoryServices;
  const { SCOPE_FLAGS } = workMemoryServices;
  const { memoryJson } = workMemoryServices;
  const { parseMemoryArgv } = workMemoryServices;
  const { renderMemory } = workMemoryServices;
  const { resolveConfiguredBackend } = workMemoryServices;
  const { runMemoryVerb } = workMemoryServices;
  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { transitionRecallRecorded } = effectsDocTransitionsServices;
  const { threadPropagationWarnings } = globalWorkPublisherServices;
  const { renderWithPropagationWarnings } = globalWorkPublisherServices;

  // Knowledge must not import work: the ledger capability is built here, from work's own transition
  // and resolvers, and handed to the memory seam as a function.
  const { recordRecall } = createRecallRecorder({ resolveItemExact, requireLocalCheckout, transitionRecallRecorded, threadPropagationWarnings });

  // 201/ADR-004 — THE RECALL PICK, composed here for the same reason: knowledge starts no process
  // (FF-20102). `claude` is resolved through the provider seam; the settings are the memory node's,
  // read by its one reader; the request's text and the instruction are the contract leaf's; and the
  // one process is execution's to start and to end.
  //
  // `{ executable }` when there is a `claude` to launch, `{ unavailable }` naming why when not.
  const resolvePickExecutable = (env = process.env) => {
    const standIn = env[PICK_EXECUTABLE];
    const bin = standIn ? standIn : terminalProvidersServices?.resolveProvider("claude")?.resolveBinaryPath(env) ?? null;
    if (!bin) return { unavailable: "not-found" };
    if (SHELL_SHIM.test(bin)) return { unavailable: "shell-shim" };
    return { executable: standIn && /\.m?js$/u.test(bin) ? { command: process.execPath, args: [path.resolve(bin)] } : { command: bin, args: [] } };
  };

  const pickRecords = async (request, { config } = {}) => {
    const { enabled, model, timeoutMs } = readMemoryConfig(config).recall.pick;
    if (!enabled) return { code: PICK_MISS.off, model };
    const { executable } = resolvePickExecutable();
    if (!executable) return { code: PICK_MISS.unavailable, model };
    // The launcher is loaded here, when a pick is made, and by no other verb: every `aof` command
    // loads this binding, and only a block recall starts a process (160/FF-16004).
    const { MODEL_ASK, askModel } = await import("@aof/execution/model-ask");
    const asked = await askModel({ executable, model, instruction: PICK_INSTRUCTION, input: renderPickRequest(request), timeoutMs, reportDegrade: degradeServices?.reportDegrade });
    return asked.outcome === MODEL_ASK.answered ? { answer: asked.text, model } : { code: ASK_MISSES[asked.outcome] ?? PICK_MISS.failed, model };
  };

  // `aof memory status` says whether this node can make the pick (201/ADR-004 §6). Added here,
  // after the seam answers, because resolving an executable is core's: it starts no process.
  const runMemoryVerbHere = async (input, options) => {
    const result = await runMemoryVerb(input, options);
    const pick = input?.verb === "status" ? result?.config?.recall?.pick : null;
    if (pick?.enabled) pick.claude = resolvePickExecutable().unavailable ?? "resolves";
    return result;
  };

  const { memoryCommand, memoryAliasCommand } = createMemoryCommand({ MEMORY_USAGE, RECORD_RECALL_VERB, SCOPE_FLAGS, memoryJson, parseMemoryArgv, recordRecall, renderMemory, renderWithPropagationWarnings, resolveConfiguredBackend, runMemoryVerb: runMemoryVerbHere, pickRecords });

  return { memoryCommand, memoryAliasCommand };
}
