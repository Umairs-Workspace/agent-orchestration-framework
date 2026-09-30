// Compatibility entry; construction belongs to core application assembly.
import { workAuditSeamLiveness } from "../application/default.mjs";
export const {
  SEAM_LIVENESS_FINDING_CODES,
  SEAM_LIVENESS_SWEEPS,
  dependentsIndex,
  exportedNames,
  runSeamLiveness,
} = workAuditSeamLiveness;
