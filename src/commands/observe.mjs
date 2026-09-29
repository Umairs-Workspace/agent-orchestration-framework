// Transitional core composition for work-owned observation.
import { createObserveCommand } from "@aof/work/commands/observe";
import { observeMilestone, observabilityEnabled } from "../work/observe.mjs";
import { loadWorkspace } from "../work.mjs";

export const { observeCommand } = createObserveCommand({ observeMilestone, observabilityEnabled, loadWorkspace });
