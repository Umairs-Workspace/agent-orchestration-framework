// Compatibility entry; construction belongs to core application assembly.
import { effectsDispatch } from "../application/default.mjs";
export const {
  EFFECT_MAX_ATTEMPTS,
  LOCAL_LOCI,
  CONTROL_LOCI,
  reachableLoci,
  drainEffects,
  runEffectsEphemeral,
} = effectsDispatch;
