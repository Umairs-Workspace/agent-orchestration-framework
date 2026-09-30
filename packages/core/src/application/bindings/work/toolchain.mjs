// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkToolchain } from "@aof/work/testing/toolchain";
import { runBounded } from "@aof/execution/bounded-process";

export function assembleWorkToolchain({  } = {}) {
  // Core composition for work-owned testing.

  const { DEFAULT_REPORT_FORMAT, FILE_TOKEN, REPORT_FORMATS, SHIM_EXTENSIONS, TEST_RUNNER_DECLARATION_INVALID, TEST_RUNNER_UNDECLARED, TEST_RUNNER_UNRESOLVABLE, TOOLCHAIN_CONFIG_KEYS, TOOLCHAIN_REFUSAL_CODES, TOOLCHAIN_VERDICTS, WORKTREE_PREPARE_DECLARATION_INVALID, WORKTREE_PREPARE_UNRESOLVABLE, argumentVector, launchRunner, launchStep, resolveProgram, resolveTestToolchain, resolveWorktreePrepare, selectionArgs, shimProblem, toolchainReport } = createWorkToolchain({ runBounded });

  return { DEFAULT_REPORT_FORMAT, FILE_TOKEN, REPORT_FORMATS, SHIM_EXTENSIONS, TEST_RUNNER_DECLARATION_INVALID, TEST_RUNNER_UNDECLARED, TEST_RUNNER_UNRESOLVABLE, TOOLCHAIN_CONFIG_KEYS, TOOLCHAIN_REFUSAL_CODES, TOOLCHAIN_VERDICTS, WORKTREE_PREPARE_DECLARATION_INVALID, WORKTREE_PREPARE_UNRESOLVABLE, argumentVector, launchRunner, launchStep, resolveProgram, resolveTestToolchain, resolveWorktreePrepare, selectionArgs, shimProblem, toolchainReport };
}
