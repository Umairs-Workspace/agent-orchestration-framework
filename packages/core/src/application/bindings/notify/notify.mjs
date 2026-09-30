// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotifier } from "@aof/messaging/notify";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleNotifyNotify({ degradeServices, notifyAskMessagesServices, notifySecretServices }) {
  // Core composition for messaging-owned services.

  const { reportDegrade } = degradeServices;

  const { recordAskMessage } = notifyAskMessagesServices;
  const { readMessagingSecret } = notifySecretServices;

  const { EVENTS, DEFAULT_TOKEN_ENV, NOTIFY_TIMEOUT_MS, ASK_EVENTS, CHANNELS, resolveNotifyConfig, buildNotifyEnvelope, resolveBotToken, notify, sendTestMessage } = createNotifier({ reportDegrade, resolveWorkspaceId, recordAskMessage, readMessagingSecret });

  return { EVENTS, DEFAULT_TOKEN_ENV, NOTIFY_TIMEOUT_MS, ASK_EVENTS, CHANNELS, resolveNotifyConfig, buildNotifyEnvelope, resolveBotToken, notify, sendTestMessage };
}
