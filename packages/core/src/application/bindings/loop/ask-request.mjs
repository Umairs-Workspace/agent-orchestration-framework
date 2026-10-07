// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAskRequests } from "@aof/work-loop/ask-request";
import * as api0 from "@aof/work-loop/ask-request";

export function assembleLoopAskRequest({ workspaceServices, degradeServices, meshLauncherLockServices }) {
  // Core composition; implementation is owned by @aof/work-loop.

  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  const {
    loopAsksDir,
    askRequestPath,
    readAsk,
    readAsks,
    openAsk,
    parkAsk,
    clearAsk,
    answerAsk,
    createAskPoll, normalizeNativeQuestion, beginNativeDelivery, acknowledgeNativeDelivery
  } = createAskRequests({
    getRuntimeRoot: (env) => globalMeshPaths({ env }).meshRoot,
    reportDegrade,
    acquireLock: meshLauncherLockServices?.acquireMeshLauncherLock,
  });

  return { "ASK_STATES": api0.ASK_STATES, loopAsksDir, askRequestPath, readAsk, readAsks, openAsk, parkAsk, clearAsk, answerAsk, createAskPoll, normalizeNativeQuestion, beginNativeDelivery, acknowledgeNativeDelivery };
}
