// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramPlanCommand } from "@aof/work/commands/diagram/plan";
import { generatorFor } from "../../../../diagrams/generators.mjs";

export function assembleCommandsDiagramPlan({ configInspectServices, commandsResolveServices }) {
  // Core constructs this application service from its owning package.

  const { resolveWorkDiagrams } = configInspectServices;

  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;

  const { diagramPlanCommand } = createDiagramPlanCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact });

  return { diagramPlanCommand };
}
