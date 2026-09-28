// Transitional core composition for work-owned audit services.
import { createAuditPromptLayer } from "@aof/work/audit/prompt-layer";
import { RESOURCE_KINDS, RUNTIMES } from "../model.mjs";

export const {
  CAPABILITY_PROGRAMS,
  PROMPT_LAYER_FINDING_CODES,
  PROMPT_LAYER_SWEEPS,
  ROLE_WORDS,
  SENTENCE_FLOOR,
  runPromptLayer,
} = createAuditPromptLayer({ RESOURCE_KINDS, RUNTIMES });
