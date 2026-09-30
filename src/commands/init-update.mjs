// Compatibility entry; construction belongs to core application assembly.
import { commandsInitUpdate } from "../application/default.mjs";
export const {
  workInitCommand,
  workInitConfigCommand,
  workUpdateCommand,
} = commandsInitUpdate;
