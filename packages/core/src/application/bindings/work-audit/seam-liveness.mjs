// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditSeamLiveness } from "@aof/work/audit/seam-liveness";

export function assembleWorkAuditSeamLiveness({ workAuditCensusServices, codeRelationsServices }) {
  // Core composition for work-owned audit services. The graph is the code corpus's `relations`,
  // asked through the port over the graphify code backend's read half (179/ADR-004), which reaches
  // no graphify process.

  const { TEST_ROOTS } = workAuditCensusServices;
  const { relations } = codeRelationsServices;

  const {
    SEAM_LIVENESS_FINDING_CODES,
    SEAM_LIVENESS_SWEEPS,
    dependentsIndex,
    exportedNames,
    runSeamLiveness,
  } = createAuditSeamLiveness({ relations, TEST_ROOTS });

  return { SEAM_LIVENESS_FINDING_CODES, SEAM_LIVENESS_SWEEPS, dependentsIndex, exportedNames, runSeamLiveness };
}
