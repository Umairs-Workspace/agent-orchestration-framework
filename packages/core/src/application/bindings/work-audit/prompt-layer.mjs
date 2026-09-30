// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditPromptLayer } from "@aof/work/audit/prompt-layer";
import { RESOURCE_KINDS, RUNTIMES } from "../../../model.mjs";

export function assembleWorkAuditPromptLayer({  } = {}) {
  // Core composition for work-owned audit services.

  const {
    CAPABILITY_PROGRAMS,
    PROMPT_LAYER_FINDING_CODES,
    PROMPT_LAYER_SWEEPS,
    ROLE_WORDS,
    SENTENCE_FLOOR,
    runPromptLayer,
  } = createAuditPromptLayer({ RESOURCE_KINDS, RUNTIMES });

  return { CAPABILITY_PROGRAMS, PROMPT_LAYER_FINDING_CODES, PROMPT_LAYER_SWEEPS, ROLE_WORDS, SENTENCE_FLOOR, runPromptLayer };
}
