// Core assembly: construct once per application; collaborators are supplied explicitly.
// 169/ADR-002, chore 175 — every registered integration that composes services builds them here, from
// the one set of core collaborators, and the verbs it contributes are handed the same set. Core names
// no integration: it reads them from the registry.
import { commandError } from "@aof/contracts/error";
import { descriptorFor } from "../../../tool-store.mjs";
import { toolkitNode } from "../../../work-audit/toolkit.mjs";
import { INTEGRATIONS } from "../../../integrations.mjs";

export function assembleIntegrationsServices({ workspaceServices, workServices, workReadServices, commandsResolveServices, integrationsRoutingServices, effectsJournalServices, effectsDispatchServices, degradeServices }, integrations = INTEGRATIONS) {
  // Core supplies policy (paths, tool identity, diagnostics, work reads, routing, the effects journal);
  // each integration package owns what it builds from them.

  const { workspacePaths } = workspaceServices;
  const { parseFrontmatter, recordDoc } = workServices;
  const { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } = workReadServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { readRouting, writeRouting, hasRouting, resolveMilestoneFolderByRef } = integrationsRoutingServices;
  const { effectsJournalPath, openEffectsJournal, pendingSteps } = effectsJournalServices;
  const { drainEffects, LOCAL_LOCI } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  const collaborators = Object.freeze({
    commandError, workspacePaths, descriptorFor, reportDegrade, nodeExecutable: toolkitNode,
    parseFrontmatter, recordDoc, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, requireLocalCheckout,
    readRouting, writeRouting, hasRouting, resolveMilestoneFolderByRef, routing: integrationsRoutingServices,
    effectsJournalPath, openEffectsJournal, pendingSteps, drainEffects, LOCAL_LOCI,
  });

  const built = Object.freeze(Object.fromEntries(integrations
    .filter((integration) => typeof integration.services === "function")
    .map((integration) => [integration.id, integration.services(collaborators)])));

  return { collaborators, built };
}
