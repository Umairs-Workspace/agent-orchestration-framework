// Compatibility entry; construction belongs to core application assembly.
import { loopAskRequest } from "../application/default.mjs";
export const {
  ASK_STATES,
  loopAsksDir,
  askRequestPath,
  readAsk,
  readAsks,
  openAsk,
  parkAsk,
  clearAsk,
  answerAsk,
  createAskPoll,
} = loopAskRequest;
