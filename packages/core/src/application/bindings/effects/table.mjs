// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createReactorRegistry } from "@aof/effects/registry";
import { createWorkEffects } from "@aof/work/effects";
import { createMeshEffects } from "@aof/mesh/effects";
import { INTEGRATIONS } from "../../../integrations.mjs";
import * as api0 from "@aof/effects/registry";

export function assembleEffectsTable({ degradeServices, provideWork, provideRunStore, provideWorkAcceptorStore, provideGlobalWorkPublisher, provideGlobalWorkStore, provideEffectsAssignmentTransitions, provideMeshParkResume, provideIntegrations }, integrations = INTEGRATIONS) {
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
    const [items, publisher, store, runs, branches, assignments, identity] = await Promise.all([
      provideWork(), provideGlobalWorkPublisher(), provideGlobalWorkStore(), provideRunStore(),
      import("@aof/mesh/assignment-directive"), import("@aof/mesh/assignment-record"), import("@aof/mesh/workspace-identity"),
    ]);
    return {
      loadWorkspace: items.loadWorkspace, listItems: items.listItems, isLiveStreamRow: items.isLiveStreamRow,
      publishGlobalWorkSnapshot: publisher.publishGlobalWorkSnapshot,
      // 167/ADR-008 — the `publish-run` step: the one propagation predicate, the run record as it
      // stands, and the store's narrow run writer.
      meshGlobalPropagationDecision: publisher.meshGlobalPropagationDecision,
      readRun: runs.readRun,
      publishWorkItemRun: store.publishWorkItemRun,
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

  // Each registered integration's reactors (chore 176), from its contribution in the one registry. An
  // integration is handed the workspace loader and what its own `services` built, when a reactor runs.
  const contributed = integrations
    .filter((integration) => typeof integration.effects === "function")
    .map((integration) => integration.effects(async () => {
      const [items, built] = await Promise.all([provideWork(), provideIntegrations()]);
      return { loadWorkspace: items.loadWorkspace, own: built.built[integration.id] };
    }));

  // Preserve public event order independently of contribution order. An integration contributes local
  // reactors (e.g. Notion's sidecar remap) BEFORE mesh projection and external sync AFTER publication.
  const eventOrder = [
    "run.started", "run.completed", "feedback.recorded", "item-status.changed", "stream.reindexed",
    "stream.archived", "workspace.changed", "assignment.reported", "terminal.resume-refused", "assignment.settled", "harness.ruled",
  ];
  const registry = createReactorRegistry([
    { name: "aof", events: Object.fromEntries(eventOrder.map(name => [name, []])) },
    work, ...contributed.map((effects) => effects.local).filter(Boolean), mesh, ...contributed.map((effects) => effects.integration).filter(Boolean),
  ], { reportDegrade, isKnownLocus });

  const EFFECTS = registry.table;
  function effectsFor(name) { return registry.effectsFor(name); }
  function knownEvents() { return registry.knownEvents(); }
  async function applicableReactors(name, payload, ctx = {}, effects = EFFECTS) {
    return await registry.applicableReactors(name, payload, ctx, effects);
  }

  return { "EVENT_NOT_DECLARED": api0.EVENT_NOT_DECLARED, "UndeclaredEventError": api0.UndeclaredEventError, KNOWN_LOCI, isKnownLocus, EFFECTS, effectsFor, knownEvents, applicableReactors };
}
