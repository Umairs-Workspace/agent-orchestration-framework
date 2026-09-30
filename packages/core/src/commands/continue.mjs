// Compatibility entry; construction belongs to core application assembly.
import { commandsContinue } from "../application/default.mjs";
export const {
  continueCommand,
  createPhaseDoorCommand,
  refineDoorCommand,
  resolveContinueDecision,
  resolveDirectivePhase,
  verifyDoorCommand,
} = commandsContinue;
