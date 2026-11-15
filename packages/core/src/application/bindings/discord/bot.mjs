// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiscordBot } from "@aof/messaging/bot";
import { createDiscordButtons } from "@aof/messaging/discord-buttons";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleDiscordBot({ degradeServices, discordCommandsServices, discordGatewayServices, discordRepliesServices, loopAskRequestServices, notifyAskMessagesServices, provideCommandCore, provideWork, provideMeshPresence, provideWorkAcceptorObservations }) {
  // Core composition for messaging-owned services.

  const { reportDegrade } = degradeServices;
  const { REGISTER_INTERVAL_MS } = discordCommandsServices;
  const { createRegistrar } = discordCommandsServices;
  const { handleInteraction } = discordCommandsServices;
  const { startGateway } = discordGatewayServices;
  const { handleReply, discordActor } = discordRepliesServices;
  const { loopAsksDir, readAsks } = loopAskRequestServices;
  const { readIndexedMessage } = notifyAskMessagesServices;

  // 191/07 (ADR-007 §5): the press handler is composed HERE, beside the bot that routes a type-3
  // interaction to it, rather than in a binding module of its own — a module of its own would sit on
  // every verb's synchronous path (FF-16004's ceiling) for a handler only the control's bot calls.
  const { handleButton } = createDiscordButtons({ readIndexedMessage, readAsks, loopAsksDir, resolveWorkspaceId, discordActor });

  async function invokeRegistered(id, input, ctx) {
    const { invoke } = await provideCommandCore();
    return await invoke(id, input, ctx);
  }
  async function loadProject(projectRoot) {
    const { loadWorkspace } = await provideWork();
    return await loadWorkspace(projectRoot);
  }
  async function resolveNodeWorkspaces(...args) { const api = await provideMeshPresence(); return await api.resolveNodeWorkspaces(...args); }
  async function foldDispatchWorktree(...args) { const api = await provideWorkAcceptorObservations(); return api.foldDispatchWorktree(...args); }

  const { startDiscordBot } = createDiscordBot({ reportDegrade, REGISTER_INTERVAL_MS, createRegistrar, handleInteraction, handleButton, startGateway, handleReply, invokeRegistered, loadProject, resolveNodeWorkspaces, foldDispatchWorktree });

  return { startDiscordBot, handleButton };
}
