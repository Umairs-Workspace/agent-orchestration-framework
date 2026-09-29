// Transitional composition for work-owned domain transitions.
import { createStreamTransitions } from "@aof/work/stream-transitions";
import { reindexForInsert, refsTouchedByInsert } from "../work/reindex.mjs";
import { archiveItems, refsMovedByArchive } from "../work/archive.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { guardItemLock, lockContextFor } from "../item-lock.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { transitionStreamReindexed, transitionStreamArchived } = createStreamTransitions({ reindexForInsert, refsTouchedByInsert, archiveItems, refsMovedByArchive, resolveWorkspaceId, guardItemLock, lockContextFor, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reportDegrade });
