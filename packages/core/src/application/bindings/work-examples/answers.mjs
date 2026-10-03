// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createExampleAnswers } from "@aof/specification-by-example/answers";

export function assembleWorkExamplesAnswers({ agentSessionDriverServices, degradeServices, runStoreServices, runSpendIngestServices, workObserveServices }) {
  // Core constructs this application service from its owning package.

  const { HUMAN_INPUT_TOOL_NAMES } = agentSessionDriverServices;
  const { reportDegrade } = degradeServices;
  const { readRuns } = runStoreServices;
  const { isRunning } = runStoreServices;
  const { readTranscriptTree } = runSpendIngestServices;
  const { claudeProjectsDir } = workObserveServices;
  const { readAnswers, readSessionAnswers, collectAnswers } = createExampleAnswers({ HUMAN_INPUT_TOOL_NAMES, reportDegrade, readRuns, isRunning, readTranscriptTree, claudeProjectsDir });

  return { readAnswers, readSessionAnswers, collectAnswers };
}
