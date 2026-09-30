// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkerLaunch } from "@aof/mesh/worker-launch";
import { compileFrozenSet, readFrozenSet } from "../../../frozen-set.mjs";

export function assembleMeshWorkerLaunch({  } = {}) {
  // Core composition for mesh-owned runtime services.

  const { ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, readDirectiveCommand, readDirectiveLaunch, composeDirectiveLaunchOptions } = createWorkerLaunch({ compileFrozenSet, readFrozenSet });

  return { ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, readDirectiveCommand, readDirectiveLaunch, composeDirectiveLaunchOptions };
}
