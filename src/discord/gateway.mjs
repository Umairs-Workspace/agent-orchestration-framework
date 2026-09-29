// Transitional core composition for messaging-owned services.
import { createDiscordGateway } from "@aof/messaging/gateway";
import { reportDegrade } from "../degrade.mjs";


export const { GATEWAY_INTENTS, IDENTIFY_FLOOR, startGateway } = createDiscordGateway({ reportDegrade });
