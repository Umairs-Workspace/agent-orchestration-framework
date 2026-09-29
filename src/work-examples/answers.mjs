// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createExampleAnswers } from "@aof/work/examples/answers";
import { HUMAN_INPUT_TOOL_NAMES } from "../agent-session-driver.mjs";
import { reportDegrade } from "../degrade.mjs";
import { readRuns, isRunning } from "../run-store.mjs";
import { readTranscriptTree } from "../run-spend-ingest.mjs";
import { claudeProjectsDir } from "../work/observe.mjs";
export const { readAnswers, readSessionAnswers, collectAnswers } = createExampleAnswers({ HUMAN_INPUT_TOOL_NAMES, reportDegrade, readRuns, isRunning, readTranscriptTree, claudeProjectsDir });
