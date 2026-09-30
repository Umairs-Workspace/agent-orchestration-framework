// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMessagingCommands } from "@aof/messaging/commands";
import { readConfig, writeConfig } from "../../../../work/delegation.mjs";

export function assembleCommandsMessagingMessaging({ notifyNotifyServices, notifySecretServices }) {
  // Core composition for messaging-owned services.

  const { CHANNELS } = notifyNotifyServices;
  const { DEFAULT_TOKEN_ENV } = notifyNotifyServices;
  const { sendTestMessage } = notifyNotifyServices;
  const { messagingSecretPath } = notifySecretServices;
  const { messagingSecretPresent } = notifySecretServices;
  const { writeMessagingSecret } = notifySecretServices;

  const { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand, messagingTestCommand, messagingContribution } = createMessagingCommands({ CHANNELS, DEFAULT_TOKEN_ENV, sendTestMessage, messagingSecretPath, messagingSecretPresent, writeMessagingSecret, readConfig, writeConfig });

  return { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand, messagingTestCommand, messagingContribution };
}
