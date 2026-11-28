// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { createTestCommand } from "@aof/work/commands/test";
import { createTestRecord } from "@aof/work/testing/record";
import { scanImporters } from "@aof/work/testing/importers";
import { createBaseline } from "@aof/work/testing/baseline";
import { buildNoProgressRoundsFromConfig } from "@aof/contracts/loop-bounds";
import { runBounded } from "@aof/execution/bounded-process";
import { createWorktreeOperations } from "@aof/execution/worktrees";

export function assembleCommandsTest({ workAuditCensusServices, workTestChangedServices, workReadServices, workToolchainServices, degradeServices, runStoreServices }) {
  // Core composition for work-owned testing. 210/ADR-003: the suggestion is the importer scan over
  // the census's workspace export map, and no code-relations port is composed here (FF-21001).

  const { walkSuiteFiles, workspaceExportMap } = workAuditCensusServices;
  const { changedBetween, changedFiles } = workTestChangedServices;
  const { launchRunner, launchStep, resolveTestToolchain, resolveWorktreePrepare } = workToolchainServices;
  const { listStreamCacheFirst } = workReadServices;
  const { isRunning, readRuns } = runStoreServices;

  // 190/00 — the record leaf, composed here rather than in `assemble.mjs`: the test command is its
  // one consumer, as it is the one consumer of the services above.
  const { reportDegrade } = degradeServices;
  const testRecord = createTestRecord({ runBounded, reportDegrade });

  // 210/ADR-007 — the stream story work is read from: every item with a local folder, as the
  // command's own `storyWorkOf` reads it through the run store.
  const storyWorkItems = async (ctx) => (await listStreamCacheFirst(ctx.workspace, { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} }))
    .filter((row) => typeof row.dir === "string" && row.dir.length > 0)
    .map((row) => ({ ref: row.ref, type: row.type, dir: path.resolve(ctx.workspace.projectRoot, row.dir) }));

  // 210/ADR-006 — the work's base, in a prepared tree of its own. 38/ADR-006 — the tree is added by
  // the execution package's one worktree implementation, whose add runs the toolchain's prepare step,
  // as every lane's does. The tree is detached and never committed to or merged, so the operations'
  // identity and merge message are never asked for. 210/ADR-005 — the no-progress bound, read from
  // its one home.
  const { runWorktreeAdd } = createWorktreeOperations({
    reportDegrade: (...args) => reportDegrade("test-baseline", ...args),
    prepareWorktree: async (projectRoot, worktreePath, { config = {}, launch } = {}) => {
      const compiled = resolveWorktreePrepare(config, { projectRoot });
      if (compiled.ok !== true) throw new Error(compiled.message);
      if (compiled.prepare == null) return null;
      const report = await launchStep(compiled.prepare, { cwd: worktreePath, launch });
      if (report.status !== 0) throw new Error(`the declared worktree prepare step failed: ${report.message}`);
      return report;
    },
    identityArgs: () => [],
    mergeMessage: () => "",
  });
  const addTree = (projectRoot, tree, sha, options) => runWorktreeAdd(projectRoot, tree, sha, options, { subject: `the baseline at ${sha.slice(0, 12)}` });
  const baselineServices = createBaseline({ runBounded, addTree });
  const noProgressBound = (config) => buildNoProgressRoundsFromConfig({ config });

  const { ALL_IN_STORY_WORK, FAILED_NO_RED, FAILED_UNATTRIBUTED, FIX_ROUND_LINE, FIX_STOPPED, FORM_CONFLICT, FORM_MISSING, NO_FORM, NOT_A_SUITE, REASON_MISSING, TEST_FORMS, chainStop, runTest, storyWorkOf, testCommand } = createTestCommand({ walkSuiteFiles, changedFiles, changedBetween, scanImporters, workspaceExportMap, launchRunner, resolveTestToolchain, testRecord, storyWorkItems, readRuns, isRunning, baselineServices, noProgressBound });

  // `testRecord` is returned for the regression gate's binding (190/02): the gate records through the
  // same leaf, so there is one store and one writer.
  return { ALL_IN_STORY_WORK, FAILED_NO_RED, FAILED_UNATTRIBUTED, FIX_ROUND_LINE, FIX_STOPPED, FORM_CONFLICT, FORM_MISSING, NO_FORM, NOT_A_SUITE, REASON_MISSING, TEST_FORMS, baselineServices, chainStop, runTest, storyWorkOf, testCommand, testRecord };
}
