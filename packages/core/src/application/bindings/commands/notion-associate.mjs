// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionAssociateCommand } from "@aof/integration-notion/notion-associate";
import { commandError } from "@aof/contracts/error";
import { isPageId, asBoardsRegistry } from "@aof/integration-notion/routing";
import { resolveMilestoneFolderByRef } from "@aof/work/legacy-milestone-discovery";
import * as api0 from "@aof/integration-notion/notion-associate";

export function assembleCommandsNotionAssociate({ workReadServices, commandsResolveServices, integrationsRoutingServices }) {
  // Core composition: the Notion package owns this command's schema, argv, behavior, and rendering.

  const { listItemsCacheFirst } = workReadServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { readRouting } = integrationsRoutingServices;
  const { writeRouting } = integrationsRoutingServices;
  const { hasRouting } = integrationsRoutingServices;

  const notionAssociateCommand = createNotionAssociateCommand({ commandError, listItemsCacheFirst, requireLocalCheckout, readRouting, writeRouting, hasRouting, isPageId, asBoardsRegistry, resolveMilestoneFolderByRef });

  return { "CLEAR_SENTINEL": api0.CLEAR_SENTINEL, notionAssociateCommand };
}
