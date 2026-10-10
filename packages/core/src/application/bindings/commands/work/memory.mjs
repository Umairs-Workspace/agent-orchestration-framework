// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMemoryCommand } from "@aof/knowledge/commands/memory";
import { createRecallRecorder } from "@aof/work/commands/feedback";

export function assembleCommandsWorkMemory({ workMemoryServices, commandsResolveServices, effectsDocTransitionsServices, globalWorkPublisherServices }) {
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

  const { memoryCommand } = createMemoryCommand({ MEMORY_USAGE, RECORD_RECALL_VERB, SCOPE_FLAGS, memoryJson, parseMemoryArgv, recordRecall, renderMemory, renderWithPropagationWarnings, resolveConfiguredBackend, runMemoryVerb });

  return { memoryCommand };
}
