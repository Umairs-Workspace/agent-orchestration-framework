// Transitional core composition for work-owned acceptor commands.
import { createAcceptorCommand } from "@aof/work/commands/acceptor";
import { loadLoops } from "../work/loops.mjs";
import {
  criterionDigest,
  readCriterion,
  rulingsUnderCurrentCriterion,
} from "../work-acceptor/criterion.mjs";
import { readObservationCensus } from "../work-acceptor/observations.mjs";
import { effectsJournalPath, openEffectsJournal } from "../effects/journal.mjs";
import { readHarnessRulings, transitionHarnessRuled } from "../effects/harness-transitions.mjs";

export const { DWELL_UNCOUNTED, REFUSAL_REMOVALS, RULING_REFUSAL_ORDER, YIELD_BOUND, acceptorCommand, buildAcceptorReport, reversionDecision, withdrawalOnHarm } = createAcceptorCommand({ loadLoops, criterionDigest, readCriterion, rulingsUnderCurrentCriterion, readObservationCensus, effectsJournalPath, openEffectsJournal, readHarnessRulings, transitionHarnessRuled });
