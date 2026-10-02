// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createIntegrationRouting } from "@aof/work/integration-routing";
import { createNotionRouting } from "@aof/integration-notion/routing";
import * as api0 from "@aof/work/integration-routing";
import * as api1 from "@aof/work/legacy-milestone-discovery";
import * as api2 from "@aof/integration-notion/routing";

export function assembleIntegrationsRouting({ degradeServices }) {
  // Core supplies configured workspace routing policy.

  const { reportDegrade } = degradeServices;

  const { readRouting, writeRouting, hasRouting } = createIntegrationRouting({ reportDegrade });
  const { resolveNotionRouting } = createNotionRouting({ readRouting });

  return { "INTEGRATIONS_FILE": api0.INTEGRATIONS_FILE, "resolveMilestoneFolderByRef": api1.resolveMilestoneFolderByRef, "isPageId": api2.isPageId, "classifyParent": api2.classifyParent, "asBoardsRegistry": api2.asBoardsRegistry, "RoutingError": api2.RoutingError, readRouting, writeRouting, hasRouting, resolveNotionRouting };
}
