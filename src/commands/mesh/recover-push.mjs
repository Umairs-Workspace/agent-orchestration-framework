// Transitional core composition for mesh-owned commands.
import { createMeshRecoverPushCommands } from "@aof/mesh/commands/recover-push";
import { openGlobalWorkProjectionStore } from "../../global-work-store.mjs";
import { globalMeshPaths } from "../../workspace.mjs";
import {
  requestRecoveryPush,
  readRecoveryPush,
  RECOVERY_PUSH_PUSHED,
  RECOVERY_PUSH_FAILED,
} from "../../mesh/recovery-push.mjs";

export const { recoverPush, meshRecoverPushCommand } = createMeshRecoverPushCommands({ openGlobalWorkProjectionStore, globalMeshPaths, requestRecoveryPush, readRecoveryPush, RECOVERY_PUSH_PUSHED, RECOVERY_PUSH_FAILED });
