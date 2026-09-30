// Compatibility entry; construction belongs to core application assembly.
import { discordCommands } from "../application/default.mjs";
export const {
  REGISTER_INTERVAL_MS,
  COMMANDS,
  createRegistrar,
  clipReply,
  statusLine,
  handleInteraction,
} = discordCommands;
