// Domain-owned effect handlers. Core supplies the services; this package imports no assembled application.
export function createNotionEffects(getServices) {
  if (typeof getServices !== 'function') throw new TypeError('createNotionEffects requires a service provider.');
  async function syncNotionStatus(event, ctx = {}) {
    const { loadWorkspace, syncMilestoneWork } = await getServices();
    const { workspaceRoot, ref } = event.payload ?? {};
    if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
    const milestone = typeof ref === "string" && ref.length > 0 ? ref.split("/")[0] : null;
    if (!milestone) return { skipped: true, reason: "no-milestone-ref" };
    const workspace = await loadWorkspace(workspaceRoot);
    try {
      const result = await syncMilestoneWork(workspace, {
        milestone,
        notionSpawn: ctx.publisherOptions?.notionSpawn ?? null,
        // m43 / story 06 — the sync core's traversal is cache-first; the reactor threads the
        // same store options its own ledger runs on.
        globalWorkStoreOptions: ctx.publisherOptions?.globalWorkStoreOptions ?? {},
      });
      // Config removed between append and drain: the consequence can no longer
      // apply, and ending the step honestly beats retrying it forever (the d3
      // "a DECIDED refusal ends the step" rule).
      if (!result.configured) return { skipped: true, reason: "not-configured" };
      return {
        synced: true,
        milestone,
        items: result.items.map(({ ref: itemRef, action }) => ({ ref: itemRef, action })),
      };
    } catch (error) {
      // An item outside any milestone (adhoc) has no board home — nothing owed.
      if (error?.code === "milestone-not-found") return { skipped: true, reason: "milestone-not-found" };
      throw error;
    }
  }

  async function notionSyncApplies(payload, ctx = {}) {
    const { loadWorkspace } = await getServices();
    const root = payload?.workspaceRoot;
    if (!root) return false;
    const config =
      ctx.workspace?.projectRoot === root ? ctx.workspace.config : (await loadWorkspace(root)).config;
    return config?.work?.integrations?.notion != null;
  }

  async function remapNotionSidecar(event) {
    const { remapMappingRefs } = await getServices();
    const { workspaceRoot, remap } = event.payload ?? {};
    if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
    return await remapMappingRefs(workspaceRoot, remap, { eventId: event.eventId });
  }


  return Object.freeze({
    local: Object.freeze({ name: '@aof/integration-notion', events: Object.freeze({
      "stream.reindexed": Object.freeze([
        Object.freeze({ key: "remap-notion-map", locus: "checkout", apply: remapNotionSidecar }),
      ]),
    }) }),
    integration: Object.freeze({ name: '@aof/integration-notion', events: Object.freeze({
      "run.completed": Object.freeze([
        Object.freeze({ key: "notion-status-sync", locus: "integration:notion", apply: syncNotionStatus, applies: notionSyncApplies }),
      ]),
      "item-status.changed": Object.freeze([
        Object.freeze({ key: "notion-status-sync", locus: "integration:notion", apply: syncNotionStatus, applies: notionSyncApplies }),
      ]),
    }) }),
  });
}
