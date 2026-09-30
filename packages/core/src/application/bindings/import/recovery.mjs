// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createImportRecovery } from "@aof/knowledge/import/recovery";

export function assembleImportRecovery({ importStoreServices }) {
  // Core composition for knowledge-owned import services.

  const { slugifySource } = importStoreServices;

  const { listRecoverableMilestones, resolveCandidate, recoverMilestone } = createImportRecovery({ slugifySource });

  return { listRecoverableMilestones, resolveCandidate, recoverMilestone };
}
