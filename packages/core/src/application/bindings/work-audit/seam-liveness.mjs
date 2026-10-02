// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditSeamLiveness } from "@aof/work/audit/seam-liveness";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "@aof/knowledge/graph-normalize";

export function assembleWorkAuditSeamLiveness({ workAuditCensusServices }) {
  // Core composition for work-owned audit services.

  const { TEST_ROOTS } = workAuditCensusServices;

  const {
    SEAM_LIVENESS_FINDING_CODES,
    SEAM_LIVENESS_SWEEPS,
    dependentsIndex,
    exportedNames,
    runSeamLiveness,
  } = createAuditSeamLiveness({ graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, TEST_ROOTS });

  return { SEAM_LIVENESS_FINDING_CODES, SEAM_LIVENESS_SWEEPS, dependentsIndex, exportedNames, runSeamLiveness };
}
