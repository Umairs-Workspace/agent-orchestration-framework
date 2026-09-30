// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunCompleteCommand } from "@aof/work/commands/run-complete";

export function assembleCommandsRunComplete({ commandsResolveServices, effectsRunTransitionsServices, runStoreServices, globalWorkPublisherServices }) {
  // Core composition for work-owned run-complete commands.

  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveDrivenRun } = commandsResolveServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;
  const { parseResumeAfter } = runStoreServices;
  const { renderWithPropagationWarnings } = globalWorkPublisherServices;
  const { threadPropagationWarnings } = globalWorkPublisherServices;

  const { runCompleteCommand } = createRunCompleteCommand({ resolveItemExact, requireLocalCheckout, resolveDrivenRun, transitionRunComplete, parseResumeAfter, renderWithPropagationWarnings, threadPropagationWarnings });

  return { runCompleteCommand };
}
