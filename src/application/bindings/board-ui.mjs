// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createBoardApi } from "@aof/server/board-ui";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";

export function assembleBoardUi({ commandCoreServices }) {
  // Core composition for server-owned transports.

  const { invoke } = commandCoreServices;
  const { loadWorkspace } = commandCoreServices;

  const { handleWorkApi, handleDiagramApi } = createBoardApi({ invoke, loadWorkspace, resolveCacheStalenessSeconds });

  return { handleWorkApi, handleDiagramApi };
}
