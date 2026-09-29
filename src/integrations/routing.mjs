// Configured routing composition; compatibility removal belongs to Plan 06.
import { createIntegrationRouting } from "@aof/work/integration-routing";
import { createNotionRouting } from "@aof/integration-notion/routing";
import { reportDegrade } from "../degrade.mjs";
export { INTEGRATIONS_FILE } from "@aof/work/integration-routing";
export { resolveMilestoneFolderByRef } from "@aof/work/legacy-milestone-discovery";
export { isPageId, classifyParent, asBoardsRegistry, RoutingError } from "@aof/integration-notion/routing";
export const { readRouting, writeRouting, hasRouting } = createIntegrationRouting({ reportDegrade });
export const { resolveNotionRouting } = createNotionRouting({ readRouting });
