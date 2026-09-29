// Compatibility composition; @aof/work-loop owns the implementation.
import { createAskOrchestration } from "@aof/work-loop/ask";
import { ASK_STATES, askRequestPath, clearAsk, loopAsksDir, openAsk, parkAsk, readAsk, readAsks } from "./ask-request.mjs";
import { answerRunAsk, isStale, openRunAsk, parkRunAsk, readRuns } from "../run-store.mjs";
import { enqueueHeartbeat as enqueueHeartbeatDefault } from "../run-heartbeat-consumption.mjs";
import { readAskQuestion } from "../work/observe.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";
import { accountLine } from "../notify/form.mjs";
import { reportDegrade } from "../degrade.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

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

export const PHASE_WORDS = implementation.PHASE_WORDS;
export const askBlockLines = implementation.askBlockLines;
export const askContext = implementation.askContext;
export const askEnvFor = implementation.askEnvFor;
export const askFileFor = implementation.askFileFor;
export const awaitAnswer = implementation.awaitAnswer;
export const defaultAskWait = implementation.defaultAskWait;
export const isParkedHalt = implementation.isParkedHalt;
export const liveOwnerHolds = implementation.liveOwnerHolds;
export const parkedHalt = implementation.parkedHalt;
export const phaseWord = implementation.phaseWord;
export const reenterStandingAsks = implementation.reenterStandingAsks;
export const standingAsk = implementation.standingAsk;
export const sweepStaleAsks = implementation.sweepStaleAsks;
