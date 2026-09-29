// Transitional core composition for work-owned run-status commands.
import { createRunStatusCommand } from "@aof/work/commands/run-status";
import { resolveItem } from "./resolve.mjs";
import { readRuns } from "../run-store.mjs";
import { readWorkerRuns, readStreamedItemRow } from "../cache-read.mjs";
import { executionScopeRef } from "../board-mesh-execution.mjs";
import { attemptElapsedMs } from "../work/loop.mjs";

export const { runStatusCommand } = createRunStatusCommand({ resolveItem, readRuns, readWorkerRuns, readStreamedItemRow, executionScopeRef, attemptElapsedMs });
