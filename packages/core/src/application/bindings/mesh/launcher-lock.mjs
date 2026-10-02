// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshLauncherLock } from "@aof/mesh/launcher-lock";

export function assembleMeshLauncherLock({ workspaceServices, degradeServices }) {
  // Core composition for mesh-owned persistence.

  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  const { meshLauncherLockPaths, readMeshLauncherLockStatus, acquireMeshLauncherLock } = createMeshLauncherLock({ globalMeshPaths, reportDegrade });

  return { meshLauncherLockPaths, readMeshLauncherLockStatus, acquireMeshLauncherLock };
}
