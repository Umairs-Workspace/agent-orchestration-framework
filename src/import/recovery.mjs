// Compatibility entry; construction belongs to core application assembly.
import { importRecovery } from "../application/default.mjs";
export const {
  listRecoverableMilestones,
  resolveCandidate,
  recoverMilestone,
} = importRecovery;
