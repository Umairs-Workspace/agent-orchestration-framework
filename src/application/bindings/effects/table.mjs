// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createReactorRegistry } from "@aof/effects/registry";
import { createWorkEffects } from "@aof/work/effects";
import { createMeshEffects } from "@aof/mesh/effects";
import { createNotionEffects } from "@aof/integration-notion/effects";
import * as api0 from "@aof/effects/registry";

export function assembleEffectsTable({ degradeServices, provideWork, provideRunStore, provideWorkAcceptorStore, provideGlobalWorkPublisher, provideGlobalWorkStore, provideEffectsAssignmentTransitions, provideMeshParkResume, provideNotionSyncWork, provideNotionMapping }) {
  // Core assembles domain-owned contributions. Event names are REFUSED — by `applicableReactors`
  // before append; the generic journal remains vocabulary-blind. Array order is cascade order.

  const { reportDegrade } = degradeServices;

  const KNOWN_LOCI = Object.freeze(["checkout", "control-store", "local"]);
  function isKnownLocus(locus) {
    return KNOWN_LOCI.includes(locus) || String(locus).startsWith("integration:");
  }

  // Providers resolve existing domain services only when a handler executes. Registration does
  // not import transitions, open stores, load configuration, or start an integration. These explicit
  // adapters remain in core while the rest of each domain implementation is extracted.
  const work = createWorkEffects(async () => {
    const [items, runs, acceptor] = await Promise.all([
      provideWork(), provideRunStore(), provideWorkAcceptorStore(),
    ]);
    return {
      loadWorkspace: items.loadWorkspace, listItems: items.listItems,
      setItemStatus: items.setItemStatus, rollbackItemStatus: items.rollbackItemStatus,
      typeHasRecordDoc: items.typeHasRecordDoc, rewriteRunItemRef: runs.rewriteRunItemRef,
      appendRuling: acceptor.appendRuling,
    };
  });

  const mesh = createMeshEffects(async () => {
    const [items, publisher, store, branches, assignments, identity] = await Promise.all([
      provideWork(), provideGlobalWorkPublisher(), provideGlobalWorkStore(),
      import("@aof/mesh/assignment-directive"), import("@aof/mesh/assignment-record"), import("@aof/mesh/workspace-identity"),
    ]);
    return {
      loadWorkspace: items.loadWorkspace, listItems: items.listItems, isLiveStreamRow: items.isLiveStreamRow,
      publishGlobalWorkSnapshot: publisher.publishGlobalWorkSnapshot,
      openGlobalWorkProjectionStore: store.openGlobalWorkProjectionStore,
      remapWorkspaceProjectionRefs: store.remapWorkspaceProjectionRefs,
      remapWorkspaceFactRefs: store.remapWorkspaceFactRefs,
      setItemBranch: branches.setItemBranch, readAssignment: assignments.readAssignment,
      restoreParkedAssignmentResume: assignments.restoreParkedAssignmentResume,
      resolveWorkspaceId: identity.resolveWorkspaceId,
      transitionAssignmentState: async (...args) => (await provideEffectsAssignmentTransitions()).transitionAssignmentState(...args),
      announceWorkerAsk: async (...args) => (await provideMeshParkResume()).announceWorkerAsk(...args),
    };
  });

  const notion = createNotionEffects(async () => {
    const [items, sync, mapping] = await Promise.all([
      provideWork(), provideNotionSyncWork(), provideNotionMapping(),
    ]);
    return { loadWorkspace: items.loadWorkspace, syncMilestoneWork: sync.syncMilestoneWork, remapMappingRefs: mapping.remapMappingRefs };
  });

  // Preserve public event order independently of contribution order. The same Notion package
  // contributes local remapping BEFORE mesh projection and external sync AFTER publication.
  const eventOrder = [
    "run.started", "run.completed", "feedback.recorded", "item-status.changed", "stream.reindexed",
    "stream.archived", "assignment.reported", "terminal.resume-refused", "assignment.settled", "harness.ruled",
  ];
  const registry = createReactorRegistry([
    { name: "aof", events: Object.fromEntries(eventOrder.map(name => [name, []])) },
    work, notion.local, mesh, notion.integration,
  ], { reportDegrade, isKnownLocus });

  const EFFECTS = registry.table;
  function effectsFor(name) { return registry.effectsFor(name); }
  function knownEvents() { return registry.knownEvents(); }
  async function applicableReactors(name, payload, ctx = {}, effects = EFFECTS) {
    return await registry.applicableReactors(name, payload, ctx, effects);
  }

  return { "EVENT_NOT_DECLARED": api0.EVENT_NOT_DECLARED, "UndeclaredEventError": api0.UndeclaredEventError, KNOWN_LOCI, isKnownLocus, EFFECTS, effectsFor, knownEvents, applicableReactors };
}
