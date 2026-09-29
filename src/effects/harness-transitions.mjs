// Transitional composition for work-owned domain transitions.
import { createHarnessTransitions } from "@aof/work/harness-transitions";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent, readEventSteps } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, reachableLoci } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";
import { LEDGER_LINE_KEY, readLedger, requireProjectDir, writeKnobValue } from "../work-acceptor/store.mjs";

export const { HARNESS_RULED, STAMP_EVIDENCE, HARNESS_RECORD_NOT_STAMPED, HARNESS_DRAIN_NOT_OPTIONAL, readHarnessRulings, HarnessTransitionError, transitionHarnessRuled } = createHarnessTransitions({ applicableReactors, openEffectsJournal, appendEvent, readEventSteps, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade, LEDGER_LINE_KEY, readLedger, requireProjectDir, writeKnobValue });
