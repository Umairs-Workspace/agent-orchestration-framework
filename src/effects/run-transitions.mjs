// Transitional composition for execution-owned domain transitions.
import { createRunTransitions } from "@aof/execution/run-transitions";
import { completeRun, startRun, retryRun, reclaimRun, staleRunningRuns } from "../run-store.mjs";
import { consumeHeartbeatQueue } from "../run-heartbeat-consumption.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, reachableLoci } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";
import { guardItemLock } from "../item-lock.mjs";
import { claudeProjectsDir } from "../work/observe.mjs";

export const { transitionRunStart, transitionRunComplete, transitionRunReclaimed, transitionStaleRunsReclaimed } = createRunTransitions({ completeRun, startRun, retryRun, reclaimRun, staleRunningRuns, consumeHeartbeatQueue, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade, guardItemLock, claudeProjectsDir });
