// Compatibility entry; construction belongs to core application assembly.
import { notifyAskMessages } from "../application/default.mjs";
export const {
  ASK_MESSAGE_KEYS,
  ASK_MESSAGE_TTL_MS,
  askMessagesDir,
  recordAskMessage,
  readAskMessage,
  findAskMessage,
} = notifyAskMessages;
