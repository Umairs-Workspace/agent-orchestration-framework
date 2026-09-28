// Core assembles domain-owned contributions. Event names are REFUSED — by `applicableReactors`
// before append; the generic journal remains vocabulary-blind. Array order is cascade order.
import { createReactorRegistry } from "@aof/effects/registry";
import { createWorkEffects } from "@aof/work/effects";
import { createMeshEffects } from "@aof/mesh/effects";
import { createNotionEffects } from "@aof/integration-notion/effects";
import { reportDegrade } from "../degrade.mjs";
export { EVENT_NOT_DECLARED, UndeclaredEventError } from "@aof/effects/registry";

export const KNOWN_LOCI = Object.freeze(["checkout", "control-store", "local"]);
export function isKnownLocus(locus) {
  return KNOWN_LOCI.includes(locus) || String(locus).startsWith("integration:");
}

// Providers resolve existing domain services only when a handler executes. Registration does
// not import transitions, open stores, load configuration, or start an integration. These explicit
// adapters remain in core while the rest of each domain implementation is extracted.
const work = createWorkEffects(async () => {
  const [items, runs, acceptor] = await Promise.all([
    import("../work.mjs"), import("../run-store.mjs"), import("../work-acceptor/store.mjs"),
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
    import("../work.mjs"), import("../global-work-publisher.mjs"), import("../global-work-store.mjs"),
    import("../mesh/assignment-directive.mjs"), import("../assignment-record.mjs"), import("../workspace-identity.mjs"),
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
    transitionAssignmentState: async (...args) => (await import("./assignment-transitions.mjs")).transitionAssignmentState(...args),
    announceWorkerAsk: async (...args) => (await import("../mesh/park-resume.mjs")).announceWorkerAsk(...args),
  };
});

const notion = createNotionEffects(async () => {
  const [items, sync, mapping] = await Promise.all([
    import("../work.mjs"), import("../notion/sync-work.mjs"), import("../notion/mapping.mjs"),
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

export const EFFECTS = registry.table;
export function effectsFor(name) { return registry.effectsFor(name); }
export function knownEvents() { return registry.knownEvents(); }
export async function applicableReactors(name, payload, ctx = {}, effects = EFFECTS) {
  return await registry.applicableReactors(name, payload, ctx, effects);
}
