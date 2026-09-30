// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAskOrchestration } from "@aof/work-loop/ask";
import { accountLine } from "@aof/messaging/form";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleLoopAsk({ loopAskRequestServices, runStoreServices, runHeartbeatConsumptionServices, workObserveServices, notifyNotifyServices, degradeServices }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { ASK_STATES } = loopAskRequestServices;
  const { askRequestPath } = loopAskRequestServices;
  const { clearAsk } = loopAskRequestServices;
  const { loopAsksDir } = loopAskRequestServices;
  const { openAsk } = loopAskRequestServices;
  const { parkAsk } = loopAskRequestServices;
  const { readAsk } = loopAskRequestServices;
  const { readAsks } = loopAskRequestServices;
  const { answerRunAsk } = runStoreServices;
  const { isStale } = runStoreServices;
  const { openRunAsk } = runStoreServices;
  const { parkRunAsk } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { enqueueHeartbeat: enqueueHeartbeatDefault } = runHeartbeatConsumptionServices;
  const { readAskQuestion } = workObserveServices;
  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;

  const { reportDegrade } = degradeServices;

  const implementation = createAskOrchestration({
    askRequests: { ASK_STATES, askRequestPath, clearAsk, loopAsksDir, openAsk, parkAsk, readAsk, readAsks },
    runs: { answerRunAsk, isStale, openRunAsk, parkRunAsk, readRuns },
    heartbeats: { enqueueHeartbeat: enqueueHeartbeatDefault },
    transcripts: { readAskQuestion },
    notifications: { buildNotifyEnvelope, notify },
    notificationFormatting: { accountLine },
    diagnostics: { reportDegrade },
    workspaceIdentity: { resolveWorkspaceId },
  });

  const PHASE_WORDS = implementation.PHASE_WORDS;
  const askBlockLines = implementation.askBlockLines;
  const askContext = implementation.askContext;
  const askEnvFor = implementation.askEnvFor;
  const askFileFor = implementation.askFileFor;
  const awaitAnswer = implementation.awaitAnswer;
  const defaultAskWait = implementation.defaultAskWait;
  const isParkedHalt = implementation.isParkedHalt;
  const liveOwnerHolds = implementation.liveOwnerHolds;
  const parkedHalt = implementation.parkedHalt;
  const phaseWord = implementation.phaseWord;
  const reenterStandingAsks = implementation.reenterStandingAsks;
  const standingAsk = implementation.standingAsk;
  const sweepStaleAsks = implementation.sweepStaleAsks;

  return { PHASE_WORDS, askBlockLines, askContext, askEnvFor, askFileFor, awaitAnswer, defaultAskWait, isParkedHalt, liveOwnerHolds, parkedHalt, phaseWord, reenterStandingAsks, standingAsk, sweepStaleAsks };
}
