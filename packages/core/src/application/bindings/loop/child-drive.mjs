// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createChildDrive } from "@aof/work-loop/child-drive";
import { fileURLToPath } from "node:url";
import { isPackaged } from "../../../asset-base.mjs";
import { runBounded } from "@aof/execution/bounded-process";
import * as api0 from "@aof/work-loop/child-drive";

export function assembleLoopChildDrive({ workspaceServices }) {
  // Core composition; implementation is owned by @aof/work-loop.

  const { globalMeshPaths } = workspaceServices;

  const {
    loopFixFilePath,
    childDriveOutcome,
    spawnLaneDrive
  } = createChildDrive({
    getRuntimeRoot: (env) => globalMeshPaths({ env }).meshRoot,
    isPackaged,
    getCliEntry: () => fileURLToPath(new URL("../../../cli.mjs", import.meta.url)),
    runBounded,
  });

  return { "LANE_CANCEL_GRACE_MS": api0.LANE_CANCEL_GRACE_MS, loopFixFilePath, childDriveOutcome, spawnLaneDrive };
}
