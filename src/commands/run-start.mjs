// Transitional core composition for work-owned run-start commands.
import { createRunStartCommand } from "@aof/work/commands/run-start";
import { resolveItemExact, requireLocalCheckout, resolveDrivenRun } from "./resolve.mjs";
import { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } from "../work/read.mjs";
import { readRuns, runsDir, shouldRetry } from "../run-store.mjs";
import { isNodeStale, resolveStalenessSeconds, readPresenceRecord } from "../mesh/presence.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { transitionRunStart, transitionStaleRunsReclaimed } from "../effects/run-transitions.mjs";
import { renderWithPropagationWarnings, threadPropagationWarnings } from "../global-work-publisher.mjs";
import { lockContextFor } from "../item-lock.mjs";
import { resolveSessionIdFromLiveStore } from "../mesh/session.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export const { runStartCommand } = createRunStartCommand({ resolveItemExact, requireLocalCheckout, resolveDrivenRun, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readRuns, runsDir, shouldRetry, isNodeStale, resolveStalenessSeconds, readPresenceRecord, meshNodeIdOf, transitionRunStart, transitionStaleRunsReclaimed, renderWithPropagationWarnings, threadPropagationWarnings, lockContextFor, resolveSessionIdFromLiveStore, resolveWorkspaceId });
