// Transitional core composition for work-owned testing.
import { createTestCommand } from "@aof/work/commands/test";
import { walkSuiteFiles } from "../work-audit/census.mjs";
import { changedFiles } from "../work/test-changed.mjs";
import { resolveItemExact } from "./resolve.mjs";
import { selectSuites } from "../work/test-select.mjs";
import { launchRunner, resolveTestToolchain } from "../work/toolchain.mjs";

export const { NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand } = createTestCommand({ walkSuiteFiles, changedFiles, resolveItemExact, selectSuites, launchRunner, resolveTestToolchain });
