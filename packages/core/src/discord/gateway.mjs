// Compatibility entry; construction belongs to core application assembly.
import { discordGateway } from "../application/default.mjs";
export const {
  GATEWAY_INTENTS,
  IDENTIFY_FLOOR,
  startGateway,
} = discordGateway;
