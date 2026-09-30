// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRecoveryPush } from "@aof/mesh/recovery-push";

export function assembleMeshRecoveryPush({ meshWorktreeServices, provideGlobalWorkStore }) {
  // Core composition for mesh-owned coordination.

  const { meshItemBranchName } = meshWorktreeServices;

  const { RECOVERY_PUSH_KIND, RECOVERY_PUSH_RESULT_KIND, RECOVERY_PUSH_REQUESTED, RECOVERY_PUSH_DISPATCHED, RECOVERY_PUSH_PUSHED, RECOVERY_PUSH_FAILED, ensureRecoveryPushTable, requestRecoveryPush, readRecoveryPush, listRecoveryPushRequests, markRecoveryPushState, buildRecoveryPushFrame, buildRecoveryPushResultFrame, applyRecoveryPushResultFrame, runRecoveryPushDispatchTick } = createRecoveryPush({ meshItemBranchName, loadProjectionStore: () => provideGlobalWorkStore() });

  return { RECOVERY_PUSH_KIND, RECOVERY_PUSH_RESULT_KIND, RECOVERY_PUSH_REQUESTED, RECOVERY_PUSH_DISPATCHED, RECOVERY_PUSH_PUSHED, RECOVERY_PUSH_FAILED, ensureRecoveryPushTable, requestRecoveryPush, readRecoveryPush, listRecoveryPushRequests, markRecoveryPushState, buildRecoveryPushFrame, buildRecoveryPushResultFrame, applyRecoveryPushResultFrame, runRecoveryPushDispatchTick };
}
