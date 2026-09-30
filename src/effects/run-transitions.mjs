// Compatibility entry; construction belongs to core application assembly.
import { effectsRunTransitions } from "../application/default.mjs";
export const {
  transitionRunStart,
  transitionRunComplete,
  transitionRunReclaimed,
  transitionStaleRunsReclaimed,
} = effectsRunTransitions;
