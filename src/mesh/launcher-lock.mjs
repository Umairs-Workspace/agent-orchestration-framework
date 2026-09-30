// Compatibility entry; construction belongs to core application assembly.
import { meshLauncherLock } from "../application/default.mjs";
export const {
  meshLauncherLockPaths,
  readMeshLauncherLockStatus,
  acquireMeshLauncherLock,
} = meshLauncherLock;
