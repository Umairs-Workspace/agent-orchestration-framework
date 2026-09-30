// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAcceptorCommand } from "@aof/work/commands/acceptor";

export function assembleCommandsAcceptor({ workLoopsServices, workAcceptorCriterionServices, workAcceptorObservationsServices, effectsJournalServices, effectsHarnessTransitionsServices }) {
  // Core composition for work-owned acceptor commands.

  const { loadLoops } = workLoopsServices;
  const { criterionDigest } = workAcceptorCriterionServices;
  const { readCriterion } = workAcceptorCriterionServices;
  const { rulingsUnderCurrentCriterion } = workAcceptorCriterionServices;
  const { readObservationCensus } = workAcceptorObservationsServices;
  const { effectsJournalPath } = effectsJournalServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { readHarnessRulings } = effectsHarnessTransitionsServices;
  const { transitionHarnessRuled } = effectsHarnessTransitionsServices;

  const { DWELL_UNCOUNTED, REFUSAL_REMOVALS, RULING_REFUSAL_ORDER, YIELD_BOUND, acceptorCommand, buildAcceptorReport, reversionDecision, withdrawalOnHarm } = createAcceptorCommand({ loadLoops, criterionDigest, readCriterion, rulingsUnderCurrentCriterion, readObservationCensus, effectsJournalPath, openEffectsJournal, readHarnessRulings, transitionHarnessRuled });

  return { DWELL_UNCOUNTED, REFUSAL_REMOVALS, RULING_REFUSAL_ORDER, YIELD_BOUND, acceptorCommand, buildAcceptorReport, reversionDecision, withdrawalOnHarm };
}
