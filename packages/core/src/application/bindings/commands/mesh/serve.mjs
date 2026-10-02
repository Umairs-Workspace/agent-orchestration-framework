// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshServeCommands } from "@aof/mesh/commands/serve";
import { readBuildInfo, buildInfoString } from "../../../../build-info.mjs";

export function assembleCommandsMeshServe({ meshLauncherServices, meshLauncherLockServices, diagnosticsLogServices, workspaceServices, workServices, fsServices }) {
  // Core composition for mesh-owned commands.

  const { launcherProbe } = meshLauncherServices;
  const { startLauncher } = meshLauncherServices;
  const { acquireMeshLauncherLock } = meshLauncherLockServices;
  const { createApplicationLogSink: createMeshLogSink } = diagnosticsLogServices;

  const { globalMeshPaths } = workspaceServices;
  const { loadWorkspace } = workServices;
  const { sweepStaleTempFiles } = fsServices;

  const { meshServeCommand } = createMeshServeCommands({ launcherProbe, startLauncher, acquireMeshLauncherLock, createMeshLogSink, readBuildInfo, buildInfoString, globalMeshPaths, loadWorkspace, sweepStaleTempFiles });

  return { meshServeCommand };
}
