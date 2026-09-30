// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createObserveCommand } from "@aof/work/commands/observe";

export function assembleCommandsObserve({ workObserveServices, workServices }) {
  // Core composition for work-owned observation.

  const { observeMilestone } = workObserveServices;
  const { observabilityEnabled } = workObserveServices;
  const { loadWorkspace } = workServices;

  const { observeCommand } = createObserveCommand({ observeMilestone, observabilityEnabled, loadWorkspace });

  return { observeCommand };
}
