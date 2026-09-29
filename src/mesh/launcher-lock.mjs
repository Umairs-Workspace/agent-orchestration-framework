// Transitional core composition for mesh-owned persistence.
import { createMeshLauncherLock } from "@aof/mesh/launcher-lock";
import { globalMeshPaths } from "../workspace.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { meshLauncherLockPaths, readMeshLauncherLockStatus, acquireMeshLauncherLock } = createMeshLauncherLock({ globalMeshPaths, reportDegrade });
