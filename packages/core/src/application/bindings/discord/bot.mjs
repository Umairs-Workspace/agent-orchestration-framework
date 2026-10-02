// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiscordBot } from "@aof/messaging/bot";

export function assembleDiscordBot({ degradeServices, discordCommandsServices, discordGatewayServices, discordRepliesServices, provideCommandCore, provideWork, provideMeshPresence, provideWorkAcceptorObservations }) {
  // Core composition for messaging-owned services.

  const { reportDegrade } = degradeServices;
  const { REGISTER_INTERVAL_MS } = discordCommandsServices;
  const { createRegistrar } = discordCommandsServices;
  const { handleInteraction } = discordCommandsServices;
  const { startGateway } = discordGatewayServices;
  const { handleReply } = discordRepliesServices;

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

  const { startDiscordBot } = createDiscordBot({ reportDegrade, REGISTER_INTERVAL_MS, createRegistrar, handleInteraction, startGateway, handleReply, invokeRegistered, loadProject, resolveNodeWorkspaces, foldDispatchWorktree });

  return { startDiscordBot };
}
