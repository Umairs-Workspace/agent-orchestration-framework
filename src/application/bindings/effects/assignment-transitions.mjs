// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAssignmentTransitions } from "@aof/mesh/assignment-transitions";
import { latestAppliedAssignmentParkEventId } from "@aof/mesh/journal-queries";

export function assembleEffectsAssignmentTransitions({ effectsTableServices, effectsJournalServices, effectsDispatchServices, effectsOutboxServices, degradeServices }) {
  // Core composition for mesh-owned domain transitions.

  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { hasEventId } = effectsJournalServices;

  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { CONTROL_LOCI } = effectsDispatchServices;
  const { LOCAL_LOCI } = effectsDispatchServices;
  const { drainOutbox } = effectsOutboxServices;
  const { reportDegrade } = degradeServices;

  const { ASSIGNMENT_UNKNOWN, ASSIGNMENT_NOT_HOLDER, ASSIGNMENT_ALREADY_TERMINAL, guardAssignmentTransition, reportAssignmentSettled, reportTerminalResumeRefused, claimAssignmentParkResume, completeAssignmentParkResume, transitionAssignmentState } = createAssignmentTransitions({ applicableReactors, openEffectsJournal, appendEvent, hasEventId, latestAppliedAssignmentParkEventId, drainEffects, runEffectsEphemeral, CONTROL_LOCI, LOCAL_LOCI, drainOutbox, reportDegrade });

  return { ASSIGNMENT_UNKNOWN, ASSIGNMENT_NOT_HOLDER, ASSIGNMENT_ALREADY_TERMINAL, guardAssignmentTransition, reportAssignmentSettled, reportTerminalResumeRefused, claimAssignmentParkResume, completeAssignmentParkResume, transitionAssignmentState };
}
