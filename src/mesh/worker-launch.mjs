// Transitional core composition for mesh-owned runtime services.
import { createWorkerLaunch } from "@aof/mesh/worker-launch";
import { compileFrozenSet, readFrozenSet } from "../frozen-set.mjs";


export const { ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, readDirectiveCommand, readDirectiveLaunch, composeDirectiveLaunchOptions } = createWorkerLaunch({ compileFrozenSet, readFrozenSet });
