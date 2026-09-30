// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiscordGateway } from "@aof/messaging/gateway";

export function assembleDiscordGateway({ degradeServices }) {
  // Core composition for messaging-owned services.

  const { reportDegrade } = degradeServices;

  const { GATEWAY_INTENTS, IDENTIFY_FLOOR, startGateway } = createDiscordGateway({ reportDegrade });

  return { GATEWAY_INTENTS, IDENTIFY_FLOOR, startGateway };
}
