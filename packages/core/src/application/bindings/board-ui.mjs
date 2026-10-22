// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createBoardApi } from "@aof/server/board-ui";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
import { processCostMeter, requestClient } from "@aof/foundation/cost-meter";

export function assembleBoardUi({ commandCoreServices }) {
  // Core composition for server-owned transports.

  const { invoke } = commandCoreServices;
  const { loadWorkspace } = commandCoreServices;
  // 167/ADR-001 — the board face counts its requests on this process's one cost meter.
  const countRequest = (route, clientHeader) => processCostMeter.count("request", { route, client: requestClient(clientHeader) });

  const { handleWorkApi, handleDiagramApi } = createBoardApi({ invoke, loadWorkspace, resolveCacheStalenessSeconds, countRequest });

  return { handleWorkApi, handleDiagramApi };
}
