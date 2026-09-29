// Compatibility composition; implementation is owned by @aof/work-loop.
import { createChildDrive } from "@aof/work-loop/child-drive";
import { globalMeshPaths } from "../workspace.mjs";
import { fileURLToPath } from "node:url";
import { isPackaged } from "../asset-base.mjs";
import { runBounded } from "@aof/execution/bounded-process";
export { LANE_CANCEL_GRACE_MS } from "@aof/work-loop/child-drive";

export const {
  loopFixFilePath,
  childDriveOutcome,
  spawnLaneDrive
} = createChildDrive({
  getRuntimeRoot: (env) => globalMeshPaths({ env }).meshRoot,
  isPackaged,
  getCliEntry: () => fileURLToPath(new URL("../cli.mjs", import.meta.url)),
  runBounded,
});
