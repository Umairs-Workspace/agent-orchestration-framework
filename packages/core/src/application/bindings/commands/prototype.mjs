// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPrototypeCommand } from "@aof/work/commands/prototype";

export function assembleCommandsPrototype({ commandsPromoteServices, commandsResolveServices, effectsItemTransitionsServices }) {
  // Core composition for work-owned prototype moves (168/ADR-004): the one mint through
  // `runInsertTopLevel`, exact resolution, and the item-status seam the status verb uses.

  const { runInsertTopLevel } = commandsPromoteServices;
  const { resolveItemExact, requireLocalCheckout } = commandsResolveServices;
  const { transitionItemStatus } = effectsItemTransitionsServices;

  const { prototypeCommand } = createPrototypeCommand({ runInsertTopLevel, resolveItemExact, requireLocalCheckout, transitionItemStatus });

  return { prototypeCommand };
}
