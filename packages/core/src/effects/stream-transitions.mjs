// Compatibility entry; construction belongs to core application assembly.
import { effectsStreamTransitions } from "../application/default.mjs";
export const {
  transitionStreamReindexed,
  transitionStreamArchived,
} = effectsStreamTransitions;
