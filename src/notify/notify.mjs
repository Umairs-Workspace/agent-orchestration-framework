// Compatibility entry; construction belongs to core application assembly.
import { notifyNotify } from "../application/default.mjs";
export const {
  EVENTS,
  DEFAULT_TOKEN_ENV,
  NOTIFY_TIMEOUT_MS,
  ASK_EVENTS,
  CHANNELS,
  resolveNotifyConfig,
  buildNotifyEnvelope,
  resolveBotToken,
  notify,
  sendTestMessage,
} = notifyNotify;
