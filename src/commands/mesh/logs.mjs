// Transitional core composition for mesh-owned commands.
import { createMeshLogsCommands } from "@aof/mesh/commands/logs";
import { readMeshLog, meshLogPath } from "../../mesh/log.mjs";
import { openGlobalWorkProjectionStore, readNodeLogEntries } from "../../global-work-store.mjs";
import { globalMeshPaths } from "../../workspace.mjs";

export const { meshLogsCommand } = createMeshLogsCommands({ readMeshLog, meshLogPath, openGlobalWorkProjectionStore, readNodeLogEntries, globalMeshPaths });
