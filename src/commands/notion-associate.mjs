// Compatibility adapter: the Notion package owns this command's schema, argv, behavior, and rendering.
import { createNotionAssociateCommand } from '@aof/integration-notion/notion-associate';
import { commandError } from "@aof/contracts/error";
import { listItemsCacheFirst } from "../work/read.mjs";
import { requireLocalCheckout } from "./resolve.mjs";
import { readRouting, writeRouting, hasRouting } from "../integrations/routing.mjs";
import { isPageId, asBoardsRegistry } from "@aof/integration-notion/routing";
import { resolveMilestoneFolderByRef } from "@aof/work/legacy-milestone-discovery";
export { CLEAR_SENTINEL } from '@aof/integration-notion/notion-associate';
export const notionAssociateCommand = createNotionAssociateCommand({ commandError, listItemsCacheFirst, requireLocalCheckout, readRouting, writeRouting, hasRouting, isPageId, asBoardsRegistry, resolveMilestoneFolderByRef });
