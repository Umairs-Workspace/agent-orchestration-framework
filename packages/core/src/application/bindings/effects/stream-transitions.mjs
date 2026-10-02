// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createStreamTransitions } from "@aof/work/stream-transitions";
import { reindexForInsert, refsTouchedByInsert } from "@aof/work/reindex";
import { archiveItems, refsMovedByArchive } from "@aof/work/archive";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleEffectsStreamTransitions({ itemLockServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, degradeServices }) {
  // Core composition for work-owned domain transitions.

  const { guardItemLock } = itemLockServices;
  const { lockContextFor } = itemLockServices;
  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  const { transitionStreamReindexed, transitionStreamArchived } = createStreamTransitions({ reindexForInsert, refsTouchedByInsert, archiveItems, refsMovedByArchive, resolveWorkspaceId, guardItemLock, lockContextFor, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reportDegrade });

  return { transitionStreamReindexed, transitionStreamArchived };
}
