// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDiagramPlanCommand } from "@aof/work/commands/diagram/plan";
import { planLoopWaves } from "@aof/work/ready-wave";
import { loopConcurrencyFromConfig, loopDispatchConcurrencyFromConfig, REFINE_FIRST_CONCURRENCY } from "@aof/contracts/loop-bounds";
import { generatorFor } from "../../../../diagrams/generators.mjs";

export function assembleCommandsDiagramPlan({ configInspectServices, commandsResolveServices, workDispatchServices }) {
  // Core constructs this application service from its owning package.

  const { resolveWorkDiagrams } = configInspectServices;

  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;

  const { dispatchConcurrencyFromConfig } = workDispatchServices;
  const { narrowDispatchBound } = workDispatchServices;

  // 145 — the loop's own lane bound, resolved as the loop's dispatch admission resolves it: the
  // pool's `work.dispatch.concurrency`, narrowed by `work.loop.dispatch.concurrency`.
  const loopLaneBound = (workspace) => narrowDispatchBound(dispatchConcurrencyFromConfig(workspace), loopDispatchConcurrencyFromConfig(workspace));

  const { diagramPlanCommand } = createDiagramPlanCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact, planLoopWaves, loopLaneBound, loopConcurrency: loopConcurrencyFromConfig, refineFirst: REFINE_FIRST_CONCURRENCY });

  return { diagramPlanCommand };
}
