// Transitional core composition for messaging-owned services.
import { createNotifier } from "@aof/messaging/notify";
import { reportDegrade } from "../degrade.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { recordAskMessage } from "./ask-messages.mjs";
import { readMessagingSecret } from "./secret.mjs";


export const { EVENTS, DEFAULT_TOKEN_ENV, NOTIFY_TIMEOUT_MS, ASK_EVENTS, CHANNELS, resolveNotifyConfig, buildNotifyEnvelope, resolveBotToken, notify, sendTestMessage } = createNotifier({ reportDegrade, resolveWorkspaceId, recordAskMessage, readMessagingSecret });
