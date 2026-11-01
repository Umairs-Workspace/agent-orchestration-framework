// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createIntegrationRouting } from "@aof/work/integration-routing";
import { INTEGRATIONS } from "../../../integrations.mjs";
import * as api0 from "@aof/work/integration-routing";
import * as api1 from "@aof/work/legacy-milestone-discovery";

export function assembleIntegrationsRouting({ degradeServices }, integrations = INTEGRATIONS) {
  // Core supplies configured workspace routing policy; each integration contributes its own routing
  // over the one descriptor reader (chore 176).

  const { reportDegrade } = degradeServices;

  const { readRouting, writeRouting, hasRouting } = createIntegrationRouting({ reportDegrade });
  const contributed = Object.assign({}, ...integrations
    .filter((integration) => typeof integration.routing === "function")
    .map((integration) => integration.routing({ readRouting })));

  return { "INTEGRATIONS_FILE": api0.INTEGRATIONS_FILE, "resolveMilestoneFolderByRef": api1.resolveMilestoneFolderByRef, ...contributed, readRouting, writeRouting, hasRouting };
}
