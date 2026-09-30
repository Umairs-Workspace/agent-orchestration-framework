// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunRetryCommand } from "@aof/work/commands/run-retry";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleCommandsRunRetry({ commandsResolveServices, effectsRunTransitionsServices, itemLockServices }) {
  // Core composition for work-owned run-retry commands.

  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { transitionRunStart } = effectsRunTransitionsServices;

  const { lockContextFor } = itemLockServices;

  const { resolveAttemptCeiling, runRetryCommand } = createRunRetryCommand({ resolveItemExact, requireLocalCheckout, transitionRunStart, meshNodeIdOf, lockContextFor });

  return { resolveAttemptCeiling, runRetryCommand };
}
