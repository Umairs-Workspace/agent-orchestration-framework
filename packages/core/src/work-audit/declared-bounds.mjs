// Compatibility entry; construction belongs to core application assembly.
import { workAuditDeclaredBounds } from "../application/default.mjs";
export const {
  BOUND_CONFIG_KEYS,
  DECLARED_BOUNDS_FINDING_CODES,
  DECLARED_BOUNDS_SWEEPS,
  DEFAULT_REFERENCE_STALE_WINDOW_MS,
  boundConfigKeyProblems,
  boundRange,
  declaredBoundValues,
  runDeclaredBounds,
} = workAuditDeclaredBounds;
