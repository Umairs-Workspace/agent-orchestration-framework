// Transitional core composition for work-owned reads.
import { createListCommand } from "@aof/work/commands/list";
import { listStreamCacheFirst, withoutAnsweringSide } from "../work/read.mjs";
import { readExecutionOverlay, applyExecutionOverlay, awaitsAnswer } from "../board-mesh-execution.mjs";
import { readWorkerItems, mergeWorkerItems, readCachedProvenance, applyCachedProvenance } from "../cache-read.mjs";
import { ASK_STATES, loopAsksDir, readAsks } from "../loop/ask-request.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { reportDegrade } from "../degrade.mjs";

export const { applyAskOverlay, listCommand } = createListCommand({ listStreamCacheFirst, withoutAnsweringSide, readExecutionOverlay, applyExecutionOverlay, awaitsAnswer, readWorkerItems, mergeWorkerItems, readCachedProvenance, applyCachedProvenance, ASK_STATES, loopAsksDir, readAsks, resolveWorkspaceId, reportDegrade });
