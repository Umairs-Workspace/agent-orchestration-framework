// Transitional composition for mesh-owned domain transitions.
import { createAssignmentTransitions } from "@aof/mesh/assignment-transitions";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent, hasEventId, latestAppliedAssignmentParkEventId } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, CONTROL_LOCI, LOCAL_LOCI } from "./dispatch.mjs";
import { drainOutbox } from "./outbox.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { ASSIGNMENT_UNKNOWN, ASSIGNMENT_NOT_HOLDER, ASSIGNMENT_ALREADY_TERMINAL, guardAssignmentTransition, reportAssignmentSettled, reportTerminalResumeRefused, claimAssignmentParkResume, completeAssignmentParkResume, transitionAssignmentState } = createAssignmentTransitions({ applicableReactors, openEffectsJournal, appendEvent, hasEventId, latestAppliedAssignmentParkEventId, drainEffects, runEffectsEphemeral, CONTROL_LOCI, LOCAL_LOCI, drainOutbox, reportDegrade });
