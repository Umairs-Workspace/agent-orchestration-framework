// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditDeclaredBounds } from "@aof/work/audit/declared-bounds";
import { HARNESS_REFERENCE_ROWS, parseCheckedDate } from "../../../harness-reference.mjs";
import { LOOP_BOUND_CONFIG_KEYS, resolvesLoopBoundConfigKey, LOOP_BOUND_CONFIG_RESOLVERS } from "@aof/contracts/loop-bounds";

export function assembleWorkAuditDeclaredBounds({  } = {}) {
  // Core composition for work-owned audit services.

  const {
    BOUND_CONFIG_KEYS,
    DECLARED_BOUNDS_FINDING_CODES,
    DECLARED_BOUNDS_SWEEPS,
    DEFAULT_REFERENCE_STALE_WINDOW_MS,
    boundConfigKeyProblems,
    boundRange,
    declaredBoundValues,
    runDeclaredBounds,
  } = createAuditDeclaredBounds({ HARNESS_REFERENCE_ROWS, parseCheckedDate, LOOP_BOUND_CONFIG_KEYS, resolvesLoopBoundConfigKey, LOOP_BOUND_CONFIG_RESOLVERS });

  return { BOUND_CONFIG_KEYS, DECLARED_BOUNDS_FINDING_CODES, DECLARED_BOUNDS_SWEEPS, DEFAULT_REFERENCE_STALE_WINDOW_MS, boundConfigKeyProblems, boundRange, declaredBoundValues, runDeclaredBounds };
}
