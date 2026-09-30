// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshStore } from "@aof/mesh/store";

export function assembleMeshStore({ workspaceServices }) {
  // Core composition for mesh-owned persistence.

  const { globalMeshPaths } = workspaceServices;

  const { aofHome, meshDir, nodeRecordPath, presenceRecordPath, publishNodeRecord, readNodeRecord, readNodeRecords } = createMeshStore({ globalMeshPaths });

  // Preserve the historical run API while execution owns its implementation.

  return { aofHome, meshDir, nodeRecordPath, presenceRecordPath, publishNodeRecord, readNodeRecord, readNodeRecords };
}
