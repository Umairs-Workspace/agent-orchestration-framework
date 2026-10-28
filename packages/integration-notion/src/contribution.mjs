// The Notion integration's ONE contribution to core (169/ADR-002, chore 175) — everything the package
// ships reaches core through this object, read by core's registry (`packages/core/src/integrations.mjs`):
//
//   id       the `work.integrations` key that enables it (absent ⇒ every verb is an honest no-op)
//   services the package's composition (./services.mjs) — mapping, apply, CLI seam and sync body —
//            built once per application from core's injected collaborators
//   commands the two `notion:*` verbs, built from core's injected services plus what `services` built
//
// Notion ships no bundle members, so it carries no `assets`. The verb modules are descriptor
// factories: neither imports the sync body, which arrives through `services`.
import { createNotionServices } from "./services.mjs";
import { createNotionAssociateCommand } from "./notion-associate.mjs";
import { createNotionSyncWorkCommand } from "./notion-sync-work.mjs";
import { isPageId, asBoardsRegistry } from "./routing.mjs";

export const contribution = Object.freeze({
  id: "notion",
  name: "@aof/integration-notion",
  services: createNotionServices,
  commands(services, own = {}) {
    const { commandError, effectsJournalPath, openEffectsJournal, pendingSteps, drainEffects, LOCAL_LOCI, reportDegrade,
      listItemsCacheFirst, requireLocalCheckout, readRouting, writeRouting, hasRouting, resolveMilestoneFolderByRef } = services;
    const syncWork = createNotionSyncWorkCommand({
      commandError, syncMilestoneWork: own.syncWork?.syncMilestoneWork, effectsJournalPath, openEffectsJournal, pendingSteps, drainEffects, LOCAL_LOCI, reportDegrade,
    });
    const associate = createNotionAssociateCommand({
      commandError, listItemsCacheFirst, requireLocalCheckout, readRouting, writeRouting, hasRouting, isPageId, asBoardsRegistry, resolveMilestoneFolderByRef,
    });
    return [syncWork, associate];
  },
});
