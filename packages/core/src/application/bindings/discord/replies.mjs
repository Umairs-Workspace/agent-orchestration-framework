// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiscordReplies } from "@aof/messaging/replies";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleDiscordReplies({ loopAskRequestServices, notifyAskMessagesServices }) {
  // Core composition for messaging-owned services.

  const { loopAsksDir } = loopAskRequestServices;
  const { readAsks } = loopAskRequestServices;
  const { readAskMessage } = notifyAskMessagesServices;

  const { discordActor, handleReply } = createDiscordReplies({ loopAsksDir, readAsks, readAskMessage, resolveWorkspaceId });

  return { discordActor, handleReply };
}
