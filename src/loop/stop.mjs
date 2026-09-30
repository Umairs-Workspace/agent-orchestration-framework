// Compatibility entry; construction belongs to core application assembly.
import { loopStop } from "../application/default.mjs";
export const {
  HAND_OFF_REFUSALS,
  STOP_REFUSALS,
  handOffLoop,
  hasLoopOn,
  stopLoop,
} = loopStop;
