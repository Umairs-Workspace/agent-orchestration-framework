// Transitional core composition for work-owned reads.
import { createWorkResolvers } from "@aof/work/commands/resolve";
import { findWorkCacheFirst } from "../work/read.mjs";
import { readRuns } from "../run-store.mjs";

export const { requireLocalCheckout, resolveDrivenRun, resolveItem, resolveItemExact } = createWorkResolvers({ findWorkCacheFirst, readRuns });
