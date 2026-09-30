// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAskMessages } from "@aof/messaging/ask-messages";

export function assembleNotifyAskMessages({ notifySecretServices }) {
  // Core composition for messaging-owned services.

  const { messagingStoreDir } = notifySecretServices;

  const { ASK_MESSAGE_KEYS, ASK_MESSAGE_TTL_MS, askMessagesDir, recordAskMessage, readAskMessage, findAskMessage } = createAskMessages({ messagingStoreDir });

  return { ASK_MESSAGE_KEYS, ASK_MESSAGE_TTL_MS, askMessagesDir, recordAskMessage, readAskMessage, findAskMessage };
}
