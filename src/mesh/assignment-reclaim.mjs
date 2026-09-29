// Transitional core composition for mesh-owned coordination.
import { createAssignmentReclaim } from "@aof/mesh/assignment-reclaim";
import { isNodeStale, readPresenceRecord, DEFAULT_PRESENCE_STALENESS_SECONDS } from "./presence.mjs";
import { isStale, readRuns } from "../run-store.mjs";
import { consumeHeartbeatQueue } from "../run-heartbeat-consumption.mjs";
import { findWorkCacheFirst } from "../work/read.mjs";
import { transitionAssignmentState } from "../effects/assignment-transitions.mjs";
import { transitionRunReclaimed } from "../effects/run-transitions.mjs";
import { openGlobalWorkProjectionStore, readWorkItemRuns } from "../global-work-store.mjs";
import { headCommit } from "./worktree.mjs";
import { reportDegrade } from "../degrade.mjs";
import { dispatchConcurrencyFromConfig } from "../work/dispatch.mjs";

export const { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS, assignmentOccupiesDispatchSlot, countDispatchSlotsByTarget, dualStalenessDecision, reclaimStaleAssignments, runControlDispatchReclaimTick } = createAssignmentReclaim({ isNodeStale, readPresenceRecord, DEFAULT_PRESENCE_STALENESS_SECONDS, isStale, readRuns, consumeHeartbeatQueue, findWorkCacheFirst, transitionAssignmentState, transitionRunReclaimed, openGlobalWorkProjectionStore, readWorkItemRuns, headCommit, reportDegrade, dispatchConcurrencyFromConfig });
