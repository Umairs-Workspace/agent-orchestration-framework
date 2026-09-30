// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDocumentTransitions } from "@aof/work/doc-transitions";

export function assembleEffectsDocTransitions({ effectsTableServices, effectsJournalServices, effectsDispatchServices, degradeServices }) {
  // Core composition for work-owned domain transitions.

  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  const { FEEDBACK_HEADING, transitionFeedbackAppended } = createDocumentTransitions({ applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reportDegrade });

  return { FEEDBACK_HEADING, transitionFeedbackAppended };
}
