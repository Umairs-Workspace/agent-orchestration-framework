// Compatibility entry; construction belongs to core application assembly.
import { commandsResolve } from "../application/default.mjs";
export const {
  requireLocalCheckout,
  resolveDrivenRun,
  resolveItem,
  resolveItemExact,
} = commandsResolve;
