// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshLogsCommands } from "@aof/mesh/commands/logs";

export function assembleCommandsMeshLogs({ diagnosticsLogServices, globalWorkStoreServices, workspaceServices }) {
  // Core composition for mesh-owned commands.

  const { readApplicationLog: readMeshLog } = diagnosticsLogServices;
  const { applicationLogPath: meshLogPath } = diagnosticsLogServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { readNodeLogEntries } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;

  const { meshLogsCommand } = createMeshLogsCommands({ readMeshLog, meshLogPath, openGlobalWorkProjectionStore, readNodeLogEntries, globalMeshPaths });

  return { meshLogsCommand };
}
