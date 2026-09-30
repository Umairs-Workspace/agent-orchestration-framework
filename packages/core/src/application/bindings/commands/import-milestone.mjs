// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createImportMilestoneCommand } from "@aof/knowledge/commands/import-milestone";

export function assembleCommandsImportMilestone({ importRecoveryServices, importMaterializeServices, importStoreServices, workMemoryServices }) {
  // Core composition for knowledge-owned import services.

  const { recoverMilestone } = importRecoveryServices;
  const { listRecoverableMilestones } = importRecoveryServices;
  const { resolveCandidate } = importRecoveryServices;
  const { writeColocatedDigest } = importMaterializeServices;
  const { slugifySource } = importStoreServices;
  const { resolveConfiguredBackend } = workMemoryServices;

  const { importMilestoneCommand } = createImportMilestoneCommand({ recoverMilestone, listRecoverableMilestones, resolveCandidate, writeColocatedDigest, slugifySource, resolveConfiguredBackend });

  return { importMilestoneCommand };
}
