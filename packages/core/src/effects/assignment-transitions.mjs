// Compatibility entry; construction belongs to core application assembly.
import { effectsAssignmentTransitions } from "../application/default.mjs";
export const {
  ASSIGNMENT_UNKNOWN,
  ASSIGNMENT_NOT_HOLDER,
  ASSIGNMENT_ALREADY_TERMINAL,
  guardAssignmentTransition,
  reportAssignmentSettled,
  reportTerminalResumeRefused,
  claimAssignmentParkResume,
  completeAssignmentParkResume,
  transitionAssignmentState,
} = effectsAssignmentTransitions;
