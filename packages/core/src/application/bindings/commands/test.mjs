// Core assembly: construct once per application; collaborators are supplied explicitly.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createTestCommand } from "@aof/work/commands/test";
import { createTestRecord } from "@aof/work/testing/record";
import { runBounded } from "@aof/execution/bounded-process";

export function assembleCommandsTest({ workAuditCensusServices, workTestChangedServices, commandsResolveServices, workTestSelectServices, workToolchainServices, degradeServices }) {
  // Core composition for work-owned testing.

  const { walkSuiteFiles, workspaceExportMap } = workAuditCensusServices;
  const { changedFiles } = workTestChangedServices;
  const { resolveItemExact } = commandsResolveServices;
  const { selectSuites } = workTestSelectServices;
  const { launchRunner } = workToolchainServices;
  const { resolveTestToolchain } = workToolchainServices;

  // 190/00 — the record leaf, composed here rather than in `assemble.mjs`: the test command is its
  // one consumer, as it is the one consumer of the five services above.
  const { reportDegrade } = degradeServices;
  const testRecord = createTestRecord({ runBounded, reportDegrade });

  // 190/01 — what the selector may know about files, composed here because the selector reads no
  // file of its own (179/04). A file that cannot be read is no source, never an empty one.
  const selectionSources = (projectRoot) => ({
    exists: async (file) => existsSync(path.join(projectRoot, file)),
    read: async (file) => readFile(path.join(projectRoot, file), "utf8").catch(() => null),
    exports: async () => workspaceExportMap(projectRoot),
  });

  const { COMMIT_NEEDS_PLAN, NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand } = createTestCommand({ walkSuiteFiles, changedFiles, resolveItemExact, selectSuites, launchRunner, resolveTestToolchain, testRecord, selectionSources });

  // `testRecord` is returned for the regression gate's binding (190/02): the gate records through the
  // same leaf, so there is one store and one writer.
  return { COMMIT_NEEDS_PLAN, NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand, testRecord };
}
