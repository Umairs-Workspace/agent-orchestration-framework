// Transitional core composition for mesh-owned persistence.
import { createMeshStore } from "@aof/mesh/store";
import { globalMeshPaths } from "../workspace.mjs";

export const { aofHome, meshDir, nodeRecordPath, presenceRecordPath, publishNodeRecord, readNodeRecord, readNodeRecords } = createMeshStore({ globalMeshPaths });

// Preserve the historical run API while execution owns its implementation.
export { runsDir, runRecordPath, runNodeRecordPath } from "../run-store.mjs";
