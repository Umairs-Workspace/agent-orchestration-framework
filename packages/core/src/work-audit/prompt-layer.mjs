// Compatibility entry; construction belongs to core application assembly.
import { workAuditPromptLayer } from "../application/default.mjs";
export const {
  CAPABILITY_PROGRAMS,
  PROMPT_LAYER_FINDING_CODES,
  PROMPT_LAYER_SWEEPS,
  ROLE_WORDS,
  SENTENCE_FLOOR,
  runPromptLayer,
} = workAuditPromptLayer;
