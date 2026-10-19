// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAskOrchestration } from "@aof/work-loop/ask";
import { accountLine, formatElapsed } from "@aof/messaging/form";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleLoopAsk({ loopAskRequestServices, runStoreServices, runHeartbeatConsumptionServices, workObserveServices, notifyNotifyServices, degradeServices, commandsResolveServices, workDispatchServices, meshWorktreeServices }) {
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
  const { readAskQuestion, readPendingAsk } = workObserveServices;
  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;

  const { reportDegrade } = degradeServices;
  const { resolveItemExact } = commandsResolveServices;
  const { resolveRefInWorktree } = workDispatchServices;
  const { meshDispatchWorktreePath } = meshWorktreeServices;

  const implementation = createAskOrchestration({
    askRequests: { ASK_STATES, askRequestPath, clearAsk, loopAsksDir, openAsk, parkAsk, readAsk, readAsks, normalizeNativeQuestion: loopAskRequestServices.normalizeNativeQuestion, acknowledgeNativeDelivery: loopAskRequestServices.acknowledgeNativeDelivery },
    runs: { answerRunAsk, isStale, openRunAsk, parkRunAsk, readRuns },
    heartbeats: { enqueueHeartbeat: enqueueHeartbeatDefault },
    transcripts: { readAskQuestion, readPendingAsk },
    notifications: { buildNotifyEnvelope, notify },
    notificationFormatting: { accountLine },
    diagnostics: { reportDegrade },
    workspaceIdentity: { resolveWorkspaceId },
    items: { resolveItemExact },
    lanes: { meshDispatchWorktreePath, resolveRefInWorktree },
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
  const askRunStopped = implementation.askRunStopped;
  const runsBehindAsk = implementation.runsBehindAsk;

  // `formatElapsed` rides out to `work:questions` from here, already one of the form's pinned
  // importers (FF-13108), so the elapsed ladder keeps one home and one importer set.
  return { PHASE_WORDS, askBlockLines, askContext, askEnvFor, askFileFor, askRunStopped, awaitAnswer, defaultAskWait, formatElapsed, isParkedHalt, liveOwnerHolds, parkedHalt, phaseWord, reenterStandingAsks, runsBehindAsk, standingAsk, sweepStaleAsks, persistNativeQuestion: implementation.persistNativeQuestion, acknowledgeNativeAnswer: implementation.acknowledgeNativeAnswer };
}
