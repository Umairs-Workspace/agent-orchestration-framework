// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRegressionGateCommand } from "@aof/work/commands/regression-gate";
import { execFile } from "node:child_process";

export function assembleCommandsRegressionGate({ meshWorktreeServices, commandsResolveServices, commandsTestServices, workToolchainServices }) {
  // Core composition for work-owned regression-gate commands.

  const { headCommit } = meshWorktreeServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { runTest } = commandsTestServices;
  const { gateToolchain, launchRunner, resolveTestGate, resolveTestToolchain } = workToolchainServices;

  const { DIRTY_TREE, JOBS_INVALID, JOBS_UNDECLARED, SETTINGS_CONFLICT, regressionGateCommand, runRegressionGate } = createRegressionGateCommand({ execFile, gateToolchain, headCommit, launchRunner, requireLocalCheckout, resolveItemExact, resolveTestGate, resolveTestToolchain, runTest });

  return { DIRTY_TREE, JOBS_INVALID, JOBS_UNDECLARED, SETTINGS_CONFLICT, regressionGateCommand, runRegressionGate };
}
