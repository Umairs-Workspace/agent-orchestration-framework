// Transitional core composition for work-owned resume commands.
import { createReentryCommands } from "@aof/work/commands/resume";
import { resolveItem, resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { readRuns, retryReadiness, isStale } from "../run-store.mjs";
import { transitionRunStart, transitionStaleRunsReclaimed } from "../effects/run-transitions.mjs";
import { listStreamCacheFirst } from "../work/read.mjs";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { lockContextFor } from "../item-lock.mjs";
import { answerAsk, loopAsksDir } from "../loop/ask-request.mjs";
import { askEnvFor } from "../loop/ask.mjs";
import { readExecutionOverlay, resolveScopedExecution, executionScopeRef, awaitsAnswer } from "../board-mesh-execution.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";

// Deferred: command-core registers this command; a static reverse import would close that registry cycle.
const loadCommandCore = () => import("../command-core.mjs");

export const { answerCommand, resumeCommand } = createReentryCommands({ resolveItem, resolveItemExact, requireLocalCheckout, readRuns, retryReadiness, isStale, transitionRunStart, transitionStaleRunsReclaimed, listStreamCacheFirst, meshNodeIdOf, lockContextFor, answerAsk, loopAsksDir, askEnvFor, readExecutionOverlay, resolveScopedExecution, executionScopeRef, awaitsAnswer, resolveWorkspaceId, buildNotifyEnvelope, notify, loadCommandCore });
