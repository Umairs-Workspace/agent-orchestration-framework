// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkResolvers } from "@aof/work/commands/resolve";

export function assembleCommandsResolve({ workReadServices, runStoreServices }) {
  // Core composition for work-owned reads.

  const { findWorkCacheFirst } = workReadServices;
  const { readRuns } = runStoreServices;

  const { requireLocalCheckout, resolveDrivenRun, resolveItem, resolveItemExact } = createWorkResolvers({ findWorkCacheFirst, readRuns });

  return { requireLocalCheckout, resolveDrivenRun, resolveItem, resolveItemExact };
}
