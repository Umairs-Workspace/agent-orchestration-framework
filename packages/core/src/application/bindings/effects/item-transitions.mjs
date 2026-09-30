// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createItemTransitions } from "@aof/work/item-transitions";

export function assembleEffectsItemTransitions({ workServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, degradeServices }) {
  // Core composition for work-owned domain transitions.

  const { setItemStatus } = workServices;
  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { reachableLoci } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  const { transitionItemStatus } = createItemTransitions({ setItemStatus, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade });

  return { transitionItemStatus };
}
