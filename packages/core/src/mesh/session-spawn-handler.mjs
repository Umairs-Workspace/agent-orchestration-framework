// Compatibility entry; construction belongs to core application assembly.
import { meshSessionSpawnHandler } from "../application/default.mjs";
export const {
  SESSION_PING_INTERVAL_MS,
  resolveDefaultShell,
  createMeshWorkerSessionSpawnHandler,
} = meshSessionSpawnHandler;
