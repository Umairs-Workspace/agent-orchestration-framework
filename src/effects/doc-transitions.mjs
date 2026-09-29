// Transitional composition for work-owned domain transitions.
import { createDocumentTransitions } from "@aof/work/doc-transitions";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { FEEDBACK_HEADING, transitionFeedbackAppended } = createDocumentTransitions({ applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reportDegrade });
