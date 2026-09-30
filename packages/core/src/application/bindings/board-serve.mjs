// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createBoardServer } from "@aof/server/board-serve";
import { assetPath } from "../../asset-base.mjs";

export function assembleBoardServe({ setupUiServices, claudeTrustServices }) {
  // Core composition for server-owned transports.

  const { serveSetupUi } = setupUiServices;
  const { ensureWorktreeTrusted } = claudeTrustServices;

  const { boardUiDist, boardUiProbe, serveBoard } = createBoardServer({ serveSetupUi, ensureWorktreeTrusted, assetPath });

  return { boardUiDist, boardUiProbe, serveBoard };
}
