// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSessionSpawnServices } from "@aof/mesh/session-spawn-handler";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleMeshSessionSpawnHandler({ terminalWsServices, meshWorktreeServices, meshSessionServices, workServices, degradeServices }) {
  // Core composition for mesh-owned runtime services.

  const { createTerminalSpawn } = terminalWsServices;
  const { loadNodePty } = terminalWsServices;
  const { addSessionWorktree } = meshWorktreeServices;
  const { meshSessionWorktreePath } = meshWorktreeServices;
  const { sessionWorktreeSlug } = meshWorktreeServices;
  const { findItemWorktree } = meshWorktreeServices;
  const { startSession } = meshSessionServices;
  const { pingSession } = meshSessionServices;
  const { endSession } = meshSessionServices;
  const { loadWorkspace } = workServices;

  const { reportDegrade } = degradeServices;

  const { SESSION_PING_INTERVAL_MS, resolveDefaultShell, createMeshWorkerSessionSpawnHandler } = createSessionSpawnServices({ createTerminalSpawn, loadNodePty, addSessionWorktree, meshSessionWorktreePath, sessionWorktreeSlug, findItemWorktree, startSession, pingSession, endSession, loadWorkspace, resolveWorkspaceId, reportDegrade });

  return { SESSION_PING_INTERVAL_MS, resolveDefaultShell, createMeshWorkerSessionSpawnHandler };
}
