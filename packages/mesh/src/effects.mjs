// Domain-owned effect handlers. Core supplies the services; this package imports no assembled application.
export function createMeshEffects(getServices) {
  if (typeof getServices !== 'function') throw new TypeError('createMeshEffects requires a service provider.');
  async function publishItemProjection(event, ctx = {}) {
    const { loadWorkspace, publishGlobalWorkSnapshot } = await getServices();
    const { workspaceRoot } = event.payload ?? {};
    if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
    const workspace = await loadWorkspace(workspaceRoot);
    const publish = await publishGlobalWorkSnapshot(workspace, {
      ...(ctx.publisherOptions ?? {}),
      operatorRefs: await operatorRefsWithArchivedStories(workspace, event.payload),
    });
    if (publish.warning) throw projectionPropagationError(publish.warning);
    if (publish.skipped) return { published: false, skipped: true, code: publish.code };
    return { published: publish.published === true };
  }

  function projectionPropagationError(warning) {
    const error = new Error(warning?.message ?? "Global work propagation failed.");
    error.name = "ProjectionPropagationError";
    error.code = warning?.code ?? "global-work-propagation-failed";
    error.effectDetail = { published: false, warning };
    return error;
  }

  function operatorRefsFor(payload = {}) {
    const refs = [];
    if (typeof payload?.ref === "string" && payload.ref.length > 0) refs.push(payload.ref);
    for (const entry of Array.isArray(payload?.remap) ? payload.remap : []) {
      for (const end of [entry?.from, entry?.to]) {
        if (typeof end === "string" && end.length > 0) refs.push(end);
      }
    }
    // milestone 127 / ADR-004 §4 — an ARCHIVE names the drivers it moved. Their refs did not
    // change, but their `source_path` did, and a row another node authored would otherwise keep
    // answering the old folder forever (the disk-derived tick steps over rows it did not author).
    const { archived: moved = [] } = payload ?? {};
    for (const entry of Array.isArray(moved) ? moved : []) {
      if (typeof entry?.ref === "string" && entry.ref.length > 0) refs.push(entry.ref);
    }
    return refs;
  }

  async function operatorRefsWithArchivedStories(workspace, payload = {}) {
    const { listItems, isLiveStreamRow } = await getServices();
    const refs = operatorRefsFor(payload);
    const { archived: moved = [] } = payload ?? {};
    if (!Array.isArray(moved) || moved.length === 0) return refs;
    const numbers = new Set(moved.map((entry) => entry?.ref).filter((ref) => typeof ref === "string" && ref.length > 0));
    for (const item of await listItems(workspace.workDir)) {
      if (item.parent != null && !isLiveStreamRow(item) && numbers.has(item.parent)) refs.push(item.ref);
    }
    return refs;
  }

  async function recordItemBranch(event, ctx = {}) {
    const { openGlobalWorkProjectionStore, setItemBranch } = await getServices();
    const { state, branch, workspaceId, itemRef } = event.payload ?? {};
    if (state !== "done") return { skipped: true, reason: "state-not-done" };
    if (!branch || !workspaceId || !itemRef) return { skipped: true, reason: "no-branch-reported" };
    const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
    try {
      setItemBranch(store, workspaceId, itemRef, branch, { now: ctx.now });
      return { branch, itemRef };
    } finally {
      if (!ctx.store) store.close?.();
    }
  }

  async function settleAssignment(event, ctx = {}) {
    const { transitionAssignmentState, openGlobalWorkProjectionStore, readAssignment, announceWorkerAsk } = await getServices();
    const { assignmentId, state, runId, branch, sessionId, code, ask } = event.payload ?? {};
    if (!assignmentId) return { skipped: true, reason: "no-assignment" };
    const park = state === "running" && code === "needs-input";
    if (state !== "done" && state !== "failed" && !park) return { skipped: true, reason: `state-not-terminal:${state}` };
    const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
    try {
      const before = readAssignment(store, assignmentId);
      const wasWaiting = before?.state === "running" && before?.code === "needs-input";
      const result = await transitionAssignmentState(
        store,
        assignmentId,
        state,
        { byNode: ctx.byNode ?? null, now: ctx.now, runId, sessionId, branch, code, ...(ask == null ? {} : { ask }) },
        { journalOptions: ctx.journalOptions ?? {} },
      );
      if (!result.applied) return { settled: false, code: result.code };
      if (park && !wasWaiting && before != null) {
        await announceWorkerAsk(before, ask ?? null, ctx);
      }
      // `code` is transition evidence, not a refusal. Returning it in the reactor
      // detail would make the bridge ACK interpret a successful needs-input apply as
      // a coded rejection and pay the worker's step without a success receipt.
      return { settled: true, state };
    } finally {
      if (!ctx.store) store.close?.();
    }
  }

  async function restoreParkedResume(event, ctx = {}) {
    const { openGlobalWorkProjectionStore, restoreParkedAssignmentResume } = await getServices();
    const { assignmentId, reservedAt, targetNodeId, previousNodeId, code } = event.payload ?? {};
    if (!assignmentId || !reservedAt || !targetNodeId || !previousNodeId || !code) {
      return { restored: false, code: "terminal-resume-refusal-frame-invalid" };
    }
    if (ctx.byNode != null && ctx.byNode !== targetNodeId) {
      return { restored: false, code: "terminal-resume-refusal-not-holder" };
    }
    const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
    try {
      const restored = restoreParkedAssignmentResume(store, assignmentId, {
        reservedAt,
        reservedTargetNodeId: targetNodeId,
        previousTargetNodeId: previousNodeId,
        now: ctx.now,
      });
      if (restored == null) return { restored: false, code: "terminal-resume-refusal-stale" };
      return { restored: true, assignmentId, refusalCode: code };
    } finally {
      if (!ctx.store) store.close?.();
    }
  }

  async function remapProjectionRefs(event, ctx = {}) {
    const { resolveWorkspaceId, loadWorkspace, openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs } = await getServices();
    const { workspaceRoot, remap } = event.payload ?? {};
    if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
    if (!Array.isArray(remap) || remap.length === 0) return { skipped: true, reason: "empty-remap" };
    const workspaceId = event.payload?.workspaceId ?? resolveWorkspaceId(await loadWorkspace(workspaceRoot));
    if (!workspaceId) return { skipped: true, reason: "workspace-unidentified" };
    const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
    try {
      return remapWorkspaceProjectionRefs(store, workspaceId, remap, { eventId: event.eventId, now: ctx.now });
    } finally {
      if (!ctx.store) store.close?.();
    }
  }

  async function remapControlFactRefs(event, ctx = {}) {
    const { openGlobalWorkProjectionStore, remapWorkspaceFactRefs } = await getServices();
    const { workspaceId, remap } = event.payload ?? {};
    if (!workspaceId) return { skipped: true, reason: "no-workspace-id" };
    if (!Array.isArray(remap) || remap.length === 0) return { skipped: true, reason: "empty-remap" };
    const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
    try {
      return remapWorkspaceFactRefs(store, workspaceId, remap, { eventId: event.eventId, now: ctx.now });
    } finally {
      if (!ctx.store) store.close?.();
    }
  }

  async function meshFactsApply(payload, ctx = {}) {
    const { loadWorkspace } = await getServices();
    const root = payload?.workspaceRoot;
    if (!root) return false;
    const config =
      ctx.workspace?.projectRoot === root ? ctx.workspace.config : (await loadWorkspace(root)).config;
    return config?.mesh?.enabled === true;
  }


  return Object.freeze({ name: '@aof/mesh', events: Object.freeze({
    "run.started": Object.freeze([
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "run.completed": Object.freeze([
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "feedback.recorded": Object.freeze([
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "item-status.changed": Object.freeze([
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "stream.reindexed": Object.freeze([
      Object.freeze({ key: "remap-projection", locus: "local", apply: remapProjectionRefs }),
      Object.freeze({ key: "remap-control-facts", locus: "control-store", apply: remapControlFactRefs, applies: meshFactsApply }),
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "stream.archived": Object.freeze([
      Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    ]),
    "assignment.reported": Object.freeze([
      Object.freeze({ key: "settle-assignment", locus: "control-store", apply: settleAssignment }),
    ]),
    "terminal.resume-refused": Object.freeze([
      Object.freeze({ key: "restore-parked-resume", locus: "control-store", apply: restoreParkedResume }),
    ]),
    "assignment.settled": Object.freeze([
      Object.freeze({ key: "record-item-branch", locus: "control-store", apply: recordItemBranch }),
    ]),
  }) });
}
