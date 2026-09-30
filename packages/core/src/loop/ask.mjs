// Compatibility entry; construction belongs to core application assembly.
import { loopAsk } from "../application/default.mjs";
export const {
  PHASE_WORDS,
  askBlockLines,
  askContext,
  askEnvFor,
  askFileFor,
  awaitAnswer,
  defaultAskWait,
  isParkedHalt,
  liveOwnerHolds,
  parkedHalt,
  phaseWord,
  reenterStandingAsks,
  standingAsk,
  sweepStaleAsks,
} = loopAsk;
