// Core assembly: construct once per application; collaborators are supplied explicitly.
import { watch } from "node:fs";
import { createBoardApi } from "@aof/server/board-ui";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
import { processCostMeter, requestClient } from "@aof/foundation/cost-meter";

export function assembleBoardUi({ commandCoreServices, degradeServices }) {
  // Core composition for server-owned transports.

  const { invoke } = commandCoreServices;
  const { loadWorkspace } = commandCoreServices;
  // 167/ADR-001 — the board face counts its requests on this process's one cost meter.
  const countRequest = (route, clientHeader) => processCostMeter.count("request", { route, client: requestClient(clientHeader) });

  // 171/ADR-003 — the diagram events stream watches the folders `diagram:scene` names; the watch and the
  // degrade reporter are composed here, so the server transport imports no filesystem of its own.
  const watchDirectory = (directory, onChange) => watch(directory, { recursive: true }, onChange);
  const { reportDegrade } = degradeServices;
  const { handleWorkApi, handleDiagramApi } = createBoardApi({ invoke, loadWorkspace, resolveCacheStalenessSeconds, countRequest, watchDirectory, reportDegrade });

  return { handleWorkApi, handleDiagramApi };
}
