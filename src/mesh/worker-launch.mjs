// Compatibility entry; construction belongs to core application assembly.
import { meshWorkerLaunch } from "../application/default.mjs";
export const {
  ASSIGNMENT_LOOP_LAUNCH_UNDECLARED,
  ASSIGNMENT_LOOP_LAUNCH_SCOPELESS,
  readDirectiveCommand,
  readDirectiveLaunch,
  composeDirectiveLaunchOptions,
} = meshWorkerLaunch;
