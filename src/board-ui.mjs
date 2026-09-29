// Transitional core composition for server-owned transports.
import { createBoardApi } from "@aof/server/board-ui";
import { invoke, loadWorkspace } from "./command-core.mjs";
import { resolveCacheStalenessSeconds } from "./cache-provenance.mjs";

export const { handleWorkApi, handleDiagramApi } = createBoardApi({ invoke, loadWorkspace, resolveCacheStalenessSeconds });
