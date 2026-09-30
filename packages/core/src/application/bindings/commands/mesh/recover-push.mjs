// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRecoverPushCommands } from "@aof/mesh/commands/recover-push";

export function assembleCommandsMeshRecoverPush({ globalWorkStoreServices, workspaceServices, meshRecoveryPushServices }) {
  // Core composition for mesh-owned commands.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;
  const { requestRecoveryPush } = meshRecoveryPushServices;
  const { readRecoveryPush } = meshRecoveryPushServices;
  const { RECOVERY_PUSH_PUSHED } = meshRecoveryPushServices;
  const { RECOVERY_PUSH_FAILED } = meshRecoveryPushServices;

  const { recoverPush, meshRecoverPushCommand } = createMeshRecoverPushCommands({ openGlobalWorkProjectionStore, globalMeshPaths, requestRecoveryPush, readRecoveryPush, RECOVERY_PUSH_PUSHED, RECOVERY_PUSH_FAILED });

  return { recoverPush, meshRecoverPushCommand };
}
