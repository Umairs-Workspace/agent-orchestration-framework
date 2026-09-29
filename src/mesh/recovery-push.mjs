// Transitional core composition for mesh-owned coordination.
import { createRecoveryPush } from "@aof/mesh/recovery-push";
import { meshItemBranchName } from "./worktree.mjs";

export const { RECOVERY_PUSH_KIND, RECOVERY_PUSH_RESULT_KIND, RECOVERY_PUSH_REQUESTED, RECOVERY_PUSH_DISPATCHED, RECOVERY_PUSH_PUSHED, RECOVERY_PUSH_FAILED, ensureRecoveryPushTable, requestRecoveryPush, readRecoveryPush, listRecoveryPushRequests, markRecoveryPushState, buildRecoveryPushFrame, buildRecoveryPushResultFrame, applyRecoveryPushResultFrame, runRecoveryPushDispatchTick } = createRecoveryPush({ meshItemBranchName, loadProjectionStore: () => import("../global-work-store.mjs") });
