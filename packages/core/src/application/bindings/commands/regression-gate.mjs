// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRegressionGateCommand } from "@aof/work/commands/regression-gate";
import { execFile } from "node:child_process";
import { runBounded } from "@aof/execution/bounded-process";

export function assembleCommandsRegressionGate({ meshWorktreeServices, commandsResolveServices, commandsTestServices, workToolchainServices, degradeServices, runStoreServices }) {
  // Core composition for work-owned regression-gate commands.

  const { headCommit } = meshWorktreeServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { runTest } = commandsTestServices;
  const { reportDegrade } = degradeServices;
  // 160/ADR-005 §3 — the gate watches its driven run through the run store, and aborts through the bounded seam.
  const { isRunning, readRuns } = runStoreServices;
  const { gateToolchain, launchRunner, resolveTestGate, resolveTestToolchain } = workToolchainServices;

  const { DIRTY_TREE, JOBS_INVALID, JOBS_UNDECLARED, SETTINGS_CONFLICT, STOPPED, cleanLaunchEnv, regressionGateCommand, runRegressionGate } = createRegressionGateCommand({ execFile, gateToolchain, headCommit, isRunning, launchRunner, readRuns, reportDegrade, requireLocalCheckout, resolveItemExact, resolveTestGate, resolveTestToolchain, runBounded, runTest });

  return { DIRTY_TREE, JOBS_INVALID, JOBS_UNDECLARED, SETTINGS_CONFLICT, STOPPED, cleanLaunchEnv, regressionGateCommand, runRegressionGate };
}
