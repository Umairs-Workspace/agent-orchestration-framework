// src/discord/bot.mjs — THE BOT (milestone 131 / stories 10-11; ADR-008 §1, ADR-009). The composer the
// control node's launcher starts, by a deferred import, when this node is the control and a bot token
// resolves: it holds the token, opens the one gateway connection (`./gateway.mjs`) and routes each
// dispatch by its `t` to a handler. `MESSAGE_CREATE` is the answer by reply (`./replies.mjs`, 10);
// `INTERACTION_CREATE` is a slash command (`./commands.mjs`, 11), and READY registers the commands in
// every guild an aof channel lives in, then again every hour.
//
// Every Discord call a handler makes goes through `discordRequest` with this bot's token, and every
// verb a handler runs goes through `invoke`, reached by a deferred import of `command-core.mjs` — as
// `declarations.mjs` reaches it — so nothing here sits in a guarded static closure (72/FF-7205) and
// the registry ring stays open. The workspaces a command serves are read per event — this daemon's
// own project and the node's mesh members, each loaded fresh — so a project enabled, or an `allow`
// edited, after the daemon started needs no restart.
import { reportDegrade } from "../degrade.mjs";
import { discordRequest } from "../notify/discord.mjs";
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

// The served workspaces (ADR-009 §2): this daemon's own project and the node's mesh members
// (`resolveNodeWorkspaces`), one per project root, each loaded fresh. A member that cannot be loaded
// degrades by name and is left out.
function servedWorkspacesOf({ workspace, nodeId, globalWorkStoreOptions, loadWorkspace }) {
  return async () => {
    const roots = [];
    if (typeof workspace?.projectRoot === "string") roots.push(workspace.projectRoot);
    if (typeof nodeId === "string" && nodeId.length > 0) {
      const { resolveNodeWorkspaces } = await import("../mesh/presence.mjs");
      // A dispatch lane's worktree is not a project: presence can record a lane's root as its
      // workspace's (F-131-18, measured at 07), so each member is folded home to its primary.
      const { foldDispatchWorktree } = await import("../work-acceptor/observations.mjs");
      const resolved = await resolveNodeWorkspaces(nodeId, { globalWorkStoreOptions: globalWorkStoreOptions ?? {} });
      for (const member of resolved?.ok === true ? resolved.workspaces : []) {
        if (typeof member?.projectRoot === "string") roots.push(foldDispatchWorktree(member.projectRoot).workspace ?? member.projectRoot);
      }
    }
    const served = [];
    for (const root of [...new Set(roots)]) {
      try {
        served.push(await loadWorkspace(root));
      } catch (error) {
        reportDegrade("discord-workspace-unreadable", new Error(`a served project could not be read (${error instanceof Error ? error.name : "error"}), so the bot's commands leave it out`), { path: root });
      }
    }
    return served;
  };
}

// startDiscordBot({ token, workspace, nodeId, globalWorkStoreOptions, fetch, socketFactory, timers,
// random, invoke, loadWorkspace, servedWorkspaces, now, gateway }) → `{ stop, handlers }`. Every
// collaborator is injectable, so no test opens a socket or reaches the network: `gateway` is the
// connection's factory (default `startGateway`), `timers` pace the hourly registration, and `fetch` is
// handed to every request the bot makes — the gateway's, the handlers', and the `session-answered`
// post an answer makes through `work:answer`'s notifier.
export function startDiscordBot({
  token,
  workspace = null,
  nodeId = null,
  globalWorkStoreOptions = {},
  fetch = globalThis.fetch,
  socketFactory,
  timers = { setTimeout, clearTimeout },
  random,
  invoke = invokeRegistered,
  loadWorkspace = loadProject,
  servedWorkspaces,
  now = () => new Date(),
  gateway = startGateway,
} = {}) {
  const request = (method, route, body) => discordRequest(token, method, route, body, { fetch });
  const served = servedWorkspaces ?? servedWorkspacesOf({ workspace, nodeId, globalWorkStoreOptions, loadWorkspace });
  const context = {
    request,
    invoke,
    loadWorkspace,
    servedWorkspaces: served,
    now,
    answerContext: { notifyOptions: { fetch } },
  };
  const registrar = createRegistrar({ request, servedWorkspaces: served });
  let applicationId = null;
  let hourly = null;
  let stopped = false;
  const register = (force) => registrar.register(applicationId, { force }).catch((error) => {
    reportDegrade("discord-command-register-failed", new Error(`a registration pass failed (${error instanceof Error ? error.name : "error"})`));
  });
  const scheduleHourly = () => {
    if (stopped) return;
    hourly = timers.setTimeout(() => {
      hourly = null;
      register(false).finally(scheduleHourly);
    }, REGISTER_INTERVAL_MS);
  };
  const onReady = (d) => {
    const id = d?.application?.id;
    if (typeof id !== "string") return undefined;
    applicationId = id;
    if (hourly != null) timers.clearTimeout(hourly);
    hourly = null;
    scheduleHourly();
    return register(true);
  };

  // The dispatch table: `t` → handler. A `t` with no handler is ignored.
  const handlers = Object.freeze({
    READY: onReady,
    MESSAGE_CREATE: (d) => handleReply(d, context),
    INTERACTION_CREATE: (d) => handleInteraction(d, context),
  });
  const connection = gateway({
    token,
    fetch,
    ...(socketFactory ? { socketFactory } : {}),
    timers,
    ...(random ? { random } : {}),
    onDispatch: (t, d) => (Object.hasOwn(handlers, t) ? handlers[t](d) : undefined),
  });
  return {
    stop: () => {
      stopped = true;
      if (hourly != null) timers.clearTimeout(hourly);
      hourly = null;
      connection.stop();
    },
    handlers,
  };
}
