// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiscordCommands } from "@aof/messaging/discord-commands";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleDiscordCommands({ degradeServices, notifyAskMessagesServices, loopStopRequestServices, provideLoopStop }) {
  // Core composition for messaging-owned services.

  const { reportDegrade } = degradeServices;
  const { findAskMessage } = notifyAskMessagesServices;
  const { STOP_STATES } = loopStopRequestServices;

  async function hasLoopOnDefault(workspace, scope) {
    const { hasLoopOn } = await provideLoopStop();
    return await hasLoopOn(workspace, scope);
  }

  const { REGISTER_INTERVAL_MS, COMMANDS, createRegistrar, clipReply, statusLine, handleInteraction } = createDiscordCommands({ reportDegrade, findAskMessage, STOP_STATES, resolveWorkspaceId, hasLoopOnDefault });

  return { REGISTER_INTERVAL_MS, COMMANDS, createRegistrar, clipReply, statusLine, handleInteraction };
}
