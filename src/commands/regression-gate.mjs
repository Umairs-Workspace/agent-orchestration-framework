// Transitional core composition for work-owned regression-gate commands.
import { createRegressionGateCommand } from "@aof/work/commands/regression-gate";
import { execFile } from "node:child_process";
import { headCommit } from "../mesh/worktree.mjs";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";
import { runTest } from "./test.mjs";

export const { DIRTY_TREE, regressionGateCommand, runRegressionGate } = createRegressionGateCommand({ execFile, headCommit, requireLocalCheckout, resolveItemExact, runTest });
