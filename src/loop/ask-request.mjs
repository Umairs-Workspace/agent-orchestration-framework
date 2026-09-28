// Compatibility composition; implementation is owned by @aof/work-loop.
import { createAskRequests } from "@aof/work-loop/ask-request";
import { globalMeshPaths } from "../workspace.mjs";
import { reportDegrade } from "../degrade.mjs";
export { ASK_STATES } from "@aof/work-loop/ask-request";

export const {
  loopAsksDir,
  askRequestPath,
  readAsk,
  readAsks,
  openAsk,
  parkAsk,
  clearAsk,
  answerAsk,
  createAskPoll
} = createAskRequests({
  getRuntimeRoot: (env) => globalMeshPaths({ env }).meshRoot,
  reportDegrade,
});
