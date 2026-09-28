// Transitional core composition for work-owned audit services.
import { createAuditSeamLiveness } from "@aof/work/audit/seam-liveness";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "../graph-normalize.mjs";
import { TEST_ROOTS } from "./census.mjs";

export const {
  SEAM_LIVENESS_FINDING_CODES,
  SEAM_LIVENESS_SWEEPS,
  dependentsIndex,
  exportedNames,
  runSeamLiveness,
} = createAuditSeamLiveness({ graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, TEST_ROOTS });
