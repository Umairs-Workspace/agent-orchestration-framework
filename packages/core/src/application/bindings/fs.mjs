// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTempFileSweeper } from "@aof/foundation/fs";
import * as api0 from "@aof/foundation/fs";

export function assembleFs({ degradeServices }) {
  // Core composition for the shared filesystem API. Core supplies diagnostics only.

  const { reportDegrade } = degradeServices;

  const sweepStaleTempFiles = createTempFileSweeper({ reportDegrade });

  return { "readJson": api0.readJson, "writeText": api0.writeText, "normalizeId": api0.normalizeId, sweepStaleTempFiles };
}
