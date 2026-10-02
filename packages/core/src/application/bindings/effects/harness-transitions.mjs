// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createHarnessTransitions } from "@aof/work/harness-transitions";

export function assembleEffectsHarnessTransitions({ effectsTableServices, effectsJournalServices, effectsDispatchServices, degradeServices, workAcceptorStoreServices }) {
  // Core composition for work-owned domain transitions.

  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { readEventSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { reachableLoci } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;
  const { LEDGER_LINE_KEY } = workAcceptorStoreServices;
  const { readLedger } = workAcceptorStoreServices;
  const { requireProjectDir } = workAcceptorStoreServices;
  const { writeKnobValue } = workAcceptorStoreServices;

  const { HARNESS_RULED, STAMP_EVIDENCE, HARNESS_RECORD_NOT_STAMPED, HARNESS_DRAIN_NOT_OPTIONAL, readHarnessRulings, HarnessTransitionError, transitionHarnessRuled } = createHarnessTransitions({ applicableReactors, openEffectsJournal, appendEvent, readEventSteps, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade, LEDGER_LINE_KEY, readLedger, requireProjectDir, writeKnobValue });

  return { HARNESS_RULED, STAMP_EVIDENCE, HARNESS_RECORD_NOT_STAMPED, HARNESS_DRAIN_NOT_OPTIONAL, readHarnessRulings, HarnessTransitionError, transitionHarnessRuled };
}
