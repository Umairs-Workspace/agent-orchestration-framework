// Compatibility entry; construction belongs to core application assembly.
import { commandsDispatch } from "../application/default.mjs";
export const {
  dispatchCommand,
  settleLaneProjectionEffects,
} = commandsDispatch;
