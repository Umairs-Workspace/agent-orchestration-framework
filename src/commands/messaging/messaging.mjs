// Transitional core composition for messaging-owned services.
import { createMessagingCommands } from "@aof/messaging/commands";
import { CHANNELS, DEFAULT_TOKEN_ENV, sendTestMessage } from "../../notify/notify.mjs";
import { messagingSecretPath, messagingSecretPresent, writeMessagingSecret } from "../../notify/secret.mjs";
import { readConfig, writeConfig } from "../../work/delegation.mjs";


export const { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand, messagingTestCommand, messagingContribution } = createMessagingCommands({ CHANNELS, DEFAULT_TOKEN_ENV, sendTestMessage, messagingSecretPath, messagingSecretPresent, writeMessagingSecret, readConfig, writeConfig });
