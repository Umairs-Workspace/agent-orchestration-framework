// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRegressionGateCommand } from "@aof/work/commands/regression-gate";
import { execFile } from "node:child_process";

export function assembleCommandsRegressionGate({ meshWorktreeServices, commandsResolveServices, commandsTestServices }) {
  // Core composition for work-owned regression-gate commands.

  const { headCommit } = meshWorktreeServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { runTest } = commandsTestServices;

  const { DIRTY_TREE, regressionGateCommand, runRegressionGate } = createRegressionGateCommand({ execFile, headCommit, requireLocalCheckout, resolveItemExact, runTest });

  return { DIRTY_TREE, regressionGateCommand, runRegressionGate };
}
