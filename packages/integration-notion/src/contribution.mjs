// The Notion integration's ONE contribution to core (169/ADR-002, chore 175) — everything the package
// ships reaches core through this object, read by core's registry (`packages/core/src/integrations.mjs`):
//
//   id       the `work.integrations` key that enables it (absent ⇒ every verb is an honest no-op)
//   services the package's composition (./services.mjs) — mapping, apply, CLI seam and sync body —
//            built once per application from core's injected collaborators
//   commands the two `notion:*` verbs, built from core's injected services plus what `services` built
//   effects  its effects-journal reactors (chore 176): `local` cascades before mesh projection (the
//            sidecar remap on a reindex), `integration` after publication (the board sync)
//   routing  its board routing over core's one descriptor reader (`.aof/integrations.json`)
//   storeMetadata  the stores it owns, for core's store classification (`effects/stores.mjs`)
//
// Notion ships no bundle members, so it carries no `assets`. The verb modules are descriptor
// factories: neither imports the sync body, which arrives through `services`.
import { createNotionServices } from "./services.mjs";
import { createNotionAssociateCommand } from "./notion-associate.mjs";
import { createNotionSyncWorkCommand } from "./notion-sync-work.mjs";
import { createNotionEffects } from "./effects.mjs";
import { createNotionRouting, isPageId, classifyParent, asBoardsRegistry, RoutingError } from "./routing.mjs";
import { FILE_STORE_CLASSIFICATION } from "./store-metadata.mjs";

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
  // `provide` resolves, only when a reactor runs, core's workspace loader and what `services` built.
  effects(provide) {
    return createNotionEffects(async () => {
      const { loadWorkspace, own } = await provide();
      return { loadWorkspace, syncMilestoneWork: own.syncWork.syncMilestoneWork, remapMappingRefs: own.mapping.remapMappingRefs };
    });
  },
  routing({ readRouting }) {
    return Object.freeze({ isPageId, classifyParent, asBoardsRegistry, RoutingError, ...createNotionRouting({ readRouting }) });
  },
  storeMetadata: Object.freeze({ fileStores: FILE_STORE_CLASSIFICATION }),
});
