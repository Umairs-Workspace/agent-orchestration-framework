// Domain-owned effect handlers. Core supplies the services; this package imports no assembled application.
export function createWorkEffects(getServices) {
  if (typeof getServices !== 'function') throw new TypeError('createWorkEffects requires a service provider.');
  async function advanceStatusOnRunStart(event) {
    const { setItemStatus, typeHasRecordDoc } = await getServices();
    const { ref, itemDir, itemType, phase } = event.payload ?? {};
    // A mint site with no local folder (the worker's no-workspace path) has no record doc
    // to move; nothing is owed rather than a fabricated path (the ADR-010/R6.4 reading).
    if (!itemDir) return { skipped: true, reason: "no-item-dir" };
    // 147/01 — A REPAIR RUN NEVER STARTS ITS ITEM. The loop mints it on the ref whose LANE halted
    // (a lane that would not merge home or reopen); the item's own status lives in that lane, and a
    // move in the primary would both lie about it and collide with the lane's record when the repair
    // merges it home. Bookkeeping about the lane, never work on the item: nothing is owed.
    if (phase === "repair") return { skipped: true, reason: "repair-run" };
    // …and neither does an item whose TYPE carries none. An adhoc top-level `task` is a
    // folder holding one `.feature` and nothing else — "a task has no status field"
    // (add-task) — so there is no status to advance and no fault in there not being one.
    // Stated HERE rather than at the writer (74/01): the writer is right to refuse, because
    // a caller that asked it to move a status did ask for something impossible; it is this
    // reactor that was never owed the move.
    if (!typeHasRecordDoc(itemType)) return { skipped: true, reason: "type-has-no-record-doc" };
    try {
      await setItemStatus({ ref, dir: itemDir, type: itemType }, "in-progress", { expectFrom: ["not-started", "blocked"] });
      return { advanced: true, status: "in-progress" };
    } catch (error) {
      if (error?.code === "status-edge-not-applicable") return { skipped: true, reason: "status-edge-not-applicable" };
      throw error;
    }
  }

  async function rollbackStatusIfFailed(event) {
    const { rollbackItemStatus, typeHasRecordDoc } = await getServices();
    const { outcome, ref, itemDir, itemType, phase } = event.payload ?? {};
    if (outcome !== "failed") return { skipped: true, reason: "outcome-not-failed" };
    // 147/01 — the mirror of the start: a repair run that failed did not start its item, so it has
    // nothing to roll back; the item's status is the lane's and is left exactly as it stands.
    if (phase === "repair") return { skipped: true, reason: "repair-run" };
    // The advance-status mirror: an item type that carries no record doc was never owed a
    // rollback either, and must not be reported as a document fault.
    if (!typeHasRecordDoc(itemType)) return { skipped: true, reason: "type-has-no-record-doc" };
    try {
      await rollbackItemStatus({ ref, dir: itemDir, type: itemType }, "not-started");
      return { rolledBack: true };
    } catch (error) {
      if (error?.code === "rollback-not-applicable") {
        return { skipped: true, reason: "rollback-not-applicable" };
      }
      throw error;
    }
  }

  async function remapRunRecordRefs(event) {
    const { loadWorkspace, listItems, rewriteRunItemRef } = await getServices();
    const { workspaceRoot, remap } = event.payload ?? {};
    if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
    if (!Array.isArray(remap) || remap.length === 0) return { skipped: true, reason: "empty-remap" };
    const workspace = await loadWorkspace(workspaceRoot);
    const items = await listItems(workspace.workDir);
    const byRef = new Map(items.map((item) => [item.ref, item]));
    let rewritten = 0;
    for (const { from, to } of remap) {
      const item = byRef.get(to);
      if (!item) continue; // the item moved again, or was removed — nothing owed here
      rewritten += (await rewriteRunItemRef(item, { from, to })).rewritten;
    }
    return { rewritten };
  }

  async function stampRulingEvidence(event) {
    const { appendRuling } = await getServices();
    const { workspaceRoot, rulingId, ruling } = event.payload ?? {};
    const result = await appendRuling(workspaceRoot, { rulingId: rulingId ?? event.eventId, ruling });
    return {
      recorded: true,
      appended: result.appended,
      path: result.path,
      total: result.total,
      ...(result.appended ? {} : { reason: result.reason }),
    };
  }


  return Object.freeze({ name: '@aof/work', events: Object.freeze({
    "run.started": Object.freeze([
      Object.freeze({ key: "advance-status", locus: "checkout", apply: advanceStatusOnRunStart }),
    ]),
    "run.completed": Object.freeze([
      Object.freeze({ key: "rollback-status", locus: "checkout", apply: rollbackStatusIfFailed }),
    ]),
    "stream.reindexed": Object.freeze([
      Object.freeze({ key: "remap-run-refs", locus: "checkout", apply: remapRunRecordRefs }),
    ]),
    "harness.ruled": Object.freeze([
      Object.freeze({ key: "stamp-evidence", locus: "checkout", apply: stampRulingEvidence }),
    ]),
  }) });
}
