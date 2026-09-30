// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTestCommand } from "@aof/work/commands/test";

export function assembleCommandsTest({ workAuditCensusServices, workTestChangedServices, commandsResolveServices, workTestSelectServices, workToolchainServices }) {
  // Core composition for work-owned testing.

  const { walkSuiteFiles } = workAuditCensusServices;
  const { changedFiles } = workTestChangedServices;
  const { resolveItemExact } = commandsResolveServices;
  const { selectSuites } = workTestSelectServices;
  const { launchRunner } = workToolchainServices;
  const { resolveTestToolchain } = workToolchainServices;

  const { NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand } = createTestCommand({ walkSuiteFiles, changedFiles, resolveItemExact, selectSuites, launchRunner, resolveTestToolchain });

  return { NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand };
}
