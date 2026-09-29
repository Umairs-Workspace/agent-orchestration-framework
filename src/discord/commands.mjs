// Transitional core composition for messaging-owned services.
import { createDiscordCommands } from "@aof/messaging/discord-commands";
import { reportDegrade } from "../degrade.mjs";
import { findAskMessage } from "../notify/ask-messages.mjs";
import { STOP_STATES } from "../loop/stop-request.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";

async function hasLoopOnDefault(workspace, scope) {
  const { hasLoopOn } = await import("../loop/stop.mjs");
  return await hasLoopOn(workspace, scope);
}

export const { REGISTER_INTERVAL_MS, COMMANDS, createRegistrar, clipReply, statusLine, handleInteraction } = createDiscordCommands({ reportDegrade, findAskMessage, STOP_STATES, resolveWorkspaceId, hasLoopOnDefault });
