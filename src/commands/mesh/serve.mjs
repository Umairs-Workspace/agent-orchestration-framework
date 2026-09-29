// Transitional core composition for mesh-owned commands.
import { createMeshServeCommands } from "@aof/mesh/commands/serve";
import { launcherProbe, startLauncher } from "../../mesh/launcher.mjs";
import { acquireMeshLauncherLock } from "../../mesh/launcher-lock.mjs";
import { createMeshLogSink } from "../../mesh/log.mjs";
import { readBuildInfo, buildInfoString } from "../../build-info.mjs";
import { globalMeshPaths } from "../../workspace.mjs";
import { loadWorkspace } from "../../work.mjs";
import { sweepStaleTempFiles } from "../../fs.mjs";

export const { meshServeCommand } = createMeshServeCommands({ launcherProbe, startLauncher, acquireMeshLauncherLock, createMeshLogSink, readBuildInfo, buildInfoString, globalMeshPaths, loadWorkspace, sweepStaleTempFiles });
