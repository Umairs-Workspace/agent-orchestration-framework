// Transitional core composition for mesh-owned runtime services.
import { createSessionSpawnServices } from "@aof/mesh/session-spawn-handler";
import { createTerminalSpawn, loadNodePty } from "../terminal-ws.mjs";
import { addSessionWorktree, meshSessionWorktreePath, sessionWorktreeSlug, findItemWorktree } from "./worktree.mjs";
import { startSession, pingSession, endSession } from "./session.mjs";
import { loadWorkspace } from "../work.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { reportDegrade } from "../degrade.mjs";


export const { SESSION_PING_INTERVAL_MS, resolveDefaultShell, createMeshWorkerSessionSpawnHandler } = createSessionSpawnServices({ createTerminalSpawn, loadNodePty, addSessionWorktree, meshSessionWorktreePath, sessionWorktreeSlug, findItemWorktree, startSession, pingSession, endSession, loadWorkspace, resolveWorkspaceId, reportDegrade });
