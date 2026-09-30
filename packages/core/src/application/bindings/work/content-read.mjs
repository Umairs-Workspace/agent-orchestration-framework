// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkContentReader } from "@aof/work/content-read";

export function assembleWorkContentRead({ runStoreServices }) {
  // Core composition for work-owned reads.

  const { readRuns } = runStoreServices;

  const { readWorkspaceContentRecords } = createWorkContentReader({ readRuns });

  return { readWorkspaceContentRecords };
}
