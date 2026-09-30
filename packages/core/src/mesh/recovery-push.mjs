// Compatibility entry; construction belongs to core application assembly.
import { meshRecoveryPush } from "../application/default.mjs";
export const {
  RECOVERY_PUSH_KIND,
  RECOVERY_PUSH_RESULT_KIND,
  RECOVERY_PUSH_REQUESTED,
  RECOVERY_PUSH_DISPATCHED,
  RECOVERY_PUSH_PUSHED,
  RECOVERY_PUSH_FAILED,
  ensureRecoveryPushTable,
  requestRecoveryPush,
  readRecoveryPush,
  listRecoveryPushRequests,
  markRecoveryPushState,
  buildRecoveryPushFrame,
  buildRecoveryPushResultFrame,
  applyRecoveryPushResultFrame,
  runRecoveryPushDispatchTick,
} = meshRecoveryPush;
