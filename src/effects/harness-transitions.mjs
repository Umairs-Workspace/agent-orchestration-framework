// Compatibility entry; construction belongs to core application assembly.
import { effectsHarnessTransitions } from "../application/default.mjs";
export const {
  HARNESS_RULED,
  STAMP_EVIDENCE,
  HARNESS_RECORD_NOT_STAMPED,
  HARNESS_DRAIN_NOT_OPTIONAL,
  readHarnessRulings,
  HarnessTransitionError,
  transitionHarnessRuled,
} = effectsHarnessTransitions;
