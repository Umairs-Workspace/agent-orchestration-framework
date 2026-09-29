// Transitional composition for work-owned domain transitions.
import { createItemTransitions } from "@aof/work/item-transitions";
import { setItemStatus } from "../work.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, reachableLoci } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { transitionItemStatus } = createItemTransitions({ setItemStatus, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade });
