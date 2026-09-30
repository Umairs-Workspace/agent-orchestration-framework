// Compatibility entry; construction belongs to core application assembly.
import { commandsRatchet } from "../application/default.mjs";
export const {
  observeRatchet,
  ratchetCommand,
  resolveRatchetBase,
} = commandsRatchet;
