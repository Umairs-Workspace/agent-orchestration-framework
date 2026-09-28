// Compatibility composition; the work-graph package owns the command.
import { createLoopRecordCommand } from "@aof/work-graph/commands/loop-record";
export * from "@aof/work-graph/commands/loop-record";
import { loadLoops } from "../work/loops.mjs";
import { readRuns } from "../run-store.mjs";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";
export const loopRecordCommand = createLoopRecordCommand({ loadLoops, readRuns, requireLocalCheckout, resolveItemExact });
