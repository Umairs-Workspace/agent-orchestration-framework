// Core assembly: construct once per application; collaborators are supplied explicitly.
import { existsSync } from "node:fs";
import { readJson } from "@aof/foundation/fs";
import { commandError } from "@aof/contracts/error";
import { createMessagingCommands } from "@aof/messaging/commands";
import { readConfig, writeConfig } from "../../../../work/delegation.mjs";
import { globalWorkspacePaths } from "../../../../workspace.mjs";

// 194 — the machine-wide `<aof home>/aof.config.json`, as `--global` edits it. Absent reads as `{}`
// (the first `enable --global` creates it); present but unreadable is REFUSED, never treated as
// empty, so a write never replaces a file the operator could not see was broken.
async function readGlobalConfig() {
  const { configPath } = globalWorkspacePaths();
  if (!existsSync(configPath)) return { configPath, config: {} };
  let config;
  try {
    config = await readJson(configPath);
  } catch (error) {
    throw commandError(`The global config ${configPath} could not be read (${error?.code ?? "unreadable"}) — fix it by hand; nothing was changed.`, "messaging-global-config-unreadable", 400);
  }
  if (config == null || typeof config !== "object" || Array.isArray(config)) {
    throw commandError(`The global config ${configPath} is not a JSON object — fix it by hand; nothing was changed.`, "messaging-global-config-unreadable", 400);
  }
  return { configPath, config };
}

export function assembleCommandsMessagingMessaging({ notifyNotifyServices, notifySecretServices, provideWork }) {
  // Core composition for messaging-owned services.

  const { CHANNELS } = notifyNotifyServices;
  const { DEFAULT_TOKEN_ENV } = notifyNotifyServices;
  const { sendTestMessage } = notifyNotifyServices;
  const { messagingSecretPath } = notifySecretServices;
  const { messagingSecretPresent } = notifySecretServices;
  const { writeMessagingSecret } = notifySecretServices;
  // The one loader, which layers the global channels under a project's (194): `status` and `test`
  // read a project's channels through it, so they answer what the notifier and the bot will use.
  const loadWorkspace = async (...args) => (await provideWork()).loadWorkspace(...args);

  const { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand, messagingTestCommand, messagingContribution } = createMessagingCommands({ CHANNELS, DEFAULT_TOKEN_ENV, sendTestMessage, messagingSecretPath, messagingSecretPresent, writeMessagingSecret, readConfig, writeConfig, readGlobalConfig, writeGlobalConfig: writeConfig, loadWorkspace });

  return { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand, messagingTestCommand, messagingContribution };
}
