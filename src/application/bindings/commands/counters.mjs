// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createCountersCommand } from "@aof/work/commands/counters";

export function assembleCommandsCounters({ runStoreServices, commandsResolveServices, commandsRunRetryServices }) {
  // Core composition for work-owned commands/counters.

  const { isRetryable } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { resolveItem } = commandsResolveServices;
  const { resolveAttemptCeiling } = commandsRunRetryServices;

  const { countersCommand, observeCounters } = createCountersCommand({ isRetryable, readRuns, resolveItem, resolveAttemptCeiling });

  return { countersCommand, observeCounters };
}
