// Transitional core composition for messaging-owned services.
import { createAskMessages } from "@aof/messaging/ask-messages";
import { messagingStoreDir } from "./secret.mjs";


export const { ASK_MESSAGE_KEYS, ASK_MESSAGE_TTL_MS, askMessagesDir, recordAskMessage, readAskMessage, findAskMessage } = createAskMessages({ messagingStoreDir });
