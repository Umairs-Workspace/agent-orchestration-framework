// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkObserver } from "@aof/work/observe";

export function assembleWorkObserve({ degradeServices }) {
  // Core composition for work-owned observation.

  const { reportDegrade } = degradeServices;

  const { BUILD_ROLES, DEFAULT_HUMAN_WAIT_MS, DEFAULT_STALL_MS, HUMAN_INPUT_TOOL_NAMES, NEEDS_INPUT_SENTINEL, PRE68_DERIVATION_MARKER, PRE68_JSON_KEY, PRE68_MINER, analyzeSessionThread, analyzeTranscript, analyzeWaves, applyCacheTarget, askQuestionFromTurn, buildSessionItemIndex, cacheTargetIsHonourable, classifyToolCallResult, claudeProjectsDir, clusterInfraKills, collectMilestoneAgents, collectSessionSignals, fmtDur, humanTurnText, markLegacySnapshot, markLegacySnapshots, mergeIntervals, observabilityEnabled, observeMilestone, overlapMs, pre68DerivationHeader, pre68JsonHeader, projectSlug, readAskQuestion, readLastAssistantTurn, readLatestSnapshot, readPendingAsk, renderReportMarkdown, resolveMilestoneFolder, rollupRunsByPhase, snapshotTimestamp, tokenSplit, unionMs, verdictForCacheBucket } = createWorkObserver({ reportDegrade });

  return { BUILD_ROLES, DEFAULT_HUMAN_WAIT_MS, DEFAULT_STALL_MS, HUMAN_INPUT_TOOL_NAMES, NEEDS_INPUT_SENTINEL, PRE68_DERIVATION_MARKER, PRE68_JSON_KEY, PRE68_MINER, analyzeSessionThread, analyzeTranscript, analyzeWaves, applyCacheTarget, askQuestionFromTurn, buildSessionItemIndex, cacheTargetIsHonourable, classifyToolCallResult, claudeProjectsDir, clusterInfraKills, collectMilestoneAgents, collectSessionSignals, fmtDur, humanTurnText, markLegacySnapshot, markLegacySnapshots, mergeIntervals, observabilityEnabled, observeMilestone, overlapMs, pre68DerivationHeader, pre68JsonHeader, projectSlug, readAskQuestion, readLastAssistantTurn, readLatestSnapshot, readPendingAsk, renderReportMarkdown, resolveMilestoneFolder, rollupRunsByPhase, snapshotTimestamp, tokenSplit, unionMs, verdictForCacheBucket };
}
