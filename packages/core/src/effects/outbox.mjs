// Compatibility entry; construction belongs to core application assembly.
import { effectsOutbox } from "../application/default.mjs";
export const {
  EFFECT_STEP_FRAME_KIND,
  EFFECT_ACK_FRAME_KIND,
  remoteSteps,
  drainOutbox,
  applyEffectAck,
} = effectsOutbox;
