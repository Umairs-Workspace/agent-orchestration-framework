// Transitional core composition for messaging-owned services.
import { createDiscordReplies } from "@aof/messaging/replies";
import { loopAsksDir, readAsks } from "../loop/ask-request.mjs";
import { readAskMessage } from "../notify/ask-messages.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";


export const { discordActor, handleReply } = createDiscordReplies({ loopAsksDir, readAsks, readAskMessage, resolveWorkspaceId });
