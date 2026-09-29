// Transitional core composition for server-owned transports.
import { createBoardServer } from "@aof/server/board-serve";
import { serveSetupUi } from "./setup-ui.mjs";
import { ensureWorktreeTrusted } from "./claude-trust.mjs";
import { assetPath } from "./asset-base.mjs";

export const { boardUiDist, boardUiProbe, serveBoard } = createBoardServer({ serveSetupUi, ensureWorktreeTrusted, assetPath });
