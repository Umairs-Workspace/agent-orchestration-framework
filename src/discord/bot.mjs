// Transitional core composition for messaging-owned services.
import { createDiscordBot } from "@aof/messaging/bot";
import { reportDegrade } from "../degrade.mjs";
import { REGISTER_INTERVAL_MS, createRegistrar, handleInteraction } from "./commands.mjs";
import { startGateway } from "./gateway.mjs";
import { handleReply } from "./replies.mjs";

async function invokeRegistered(id, input, ctx) {
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}
async function loadProject(projectRoot) {
  const { loadWorkspace } = await import("../work.mjs");
  return await loadWorkspace(projectRoot);
}
async function resolveNodeWorkspaces(...args) { const api = await import("../mesh/presence.mjs"); return await api.resolveNodeWorkspaces(...args); }
async function foldDispatchWorktree(...args) { const api = await import("../work-acceptor/observations.mjs"); return api.foldDispatchWorktree(...args); }

export const { startDiscordBot } = createDiscordBot({ reportDegrade, REGISTER_INTERVAL_MS, createRegistrar, handleInteraction, startGateway, handleReply, invokeRegistered, loadProject, resolveNodeWorkspaces, foldDispatchWorktree });
