// mesh:terminal-resume — re-attach a PARKED/KILLED worker session (m42 quick-fix,
// operator-requested: "run `claude --resume <id>` so it can continue from the
// terminated session").
//
// `aof mesh terminal-resume <sessionId> [--node <id>]` — control-node CLI:
//   1. resolve the assignment that captured this session id (the store is the
//      one place the (sessionId -> assignment/worktree/holder) join lives);
//   2. push a terminal-resume envelope into the LOOPBACK relay (the same
//      same-machine IPC the terminal-input lane rides — the serve process's
//      self-subscribed router routes it down the holder's stream connection);
//   3. the worker spawns `claude --resume <sessionId>` in the assignment's
//      RETAINED worktree, stamping its PTY frames with the RESUMED session id —
//      so the fleet's EXISTING (nodeId, sessionId) tuple (the row's own, the one
//      an already-open dock tab is subscribed to) comes back to life, mirrored
//      AND typeable.
//
// The relay push itself has no request/reply channel, so confirmation is read
// from the worker-authored assignment row. A timeout is ambiguous and leaves
// the counted reservation in place; an explicit pre-spawn refusal may repark.
// Control-node only — an unconfigured
// relay (not the control machine) is a loud coded refusal, never a silent no-op.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   m42 quick-fix — mesh:terminal-resume, the control-driven re-attach of a
//   parked/killed worker session (`claude --resume` in the retained worktree).
//   Additive — one import + one COMMANDS entry; takes the `mesh:` prefix so the
//   mesh bijection gate covers it with no edit.
import { commandError } from "../../command-error.mjs";
import { MESH_WORKSPACE_FLAG, guardMeshPositionals } from "./face-shared.mjs";
import { openGlobalWorkProjectionStore, readWorkItemRuns } from "../../global-work-store.mjs";
import { listAllAssignments, readAssignment, reserveParkedAssignmentResume, restoreParkedAssignmentResume } from "../../assignment-record.mjs";
import { countDispatchSlotsByTarget } from "../../mesh/assignment-reclaim.mjs";
import { dispatchConcurrencyFromConfig } from "../../work/dispatch.mjs";
import { globalMeshPaths } from "../../workspace.mjs";
import { buildTerminalResumeEnvelope, createTerminalRelayPushTransport } from "../../mesh/terminal-relay-bridge.mjs";
import { latestAppliedAssignmentParkEventId, openEffectsJournal } from "../../effects/journal.mjs";
import { reportDegrade } from "../../degrade.mjs";

export const meshTerminalResumeCommand = {
  id: "mesh:terminal-resume",
  input: {
    type: "object",
    properties: { session: { type: "string" }, node: { type: "string" } },
    required: ["session"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const sessionId = typeof input.session === "string" ? input.session.trim() : "";
    if (sessionId.length === 0) {
      throw commandError("A session id is required: aof mesh terminal-resume <sessionId>.", "invalid-input", 400);
    }

    // 1. The (sessionId -> assignment) join — the LATEST row that captured it.
    const storeOptions = ctx?.globalWorkStoreOptions ?? {};
    const store = await openGlobalWorkProjectionStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
    let row;
    try {
      row = store.db.prepare(
        "SELECT assignment_id, item_ref, workspace_id, target_node_id, state, run_id, session_id, code, updated_at FROM global_assignments WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1",
      ).get(sessionId);
    } finally {
      store.close?.();
    }
    if (row == null) {
      throw commandError(`No assignment ever captured session "${sessionId}" — nothing to resume (the join key is the assignment row's session_id).`, "session-unknown", 404);
    }
    const requestedNodeId = typeof input.node === "string" && input.node.trim().length > 0 ? input.node.trim() : null;
    let nodeId = requestedNodeId ?? row.target_node_id;
    let previousNodeId = row.target_node_id;

    // 2. Push over the loopback relay — the injectable seam keeps the command
    //    testable without a live broker; production resolves the real transport
    //    from THIS workspace's config (null = not the control machine).
    const createPush = ctx?.createTerminalResumePush ?? createTerminalRelayPushTransport;
    const push = createPush(ctx?.workspace?.config);
    if (push == null) {
      throw commandError(
        "No mesh relay is configured here (config.mesh.relay.url) — terminal-resume runs on the CONTROL node, whose serve daemon routes it to the holder.",
        "relay-unconfigured",
        400,
      );
    }

    // Admission is a transaction over the SAME assignment rows the dispatch tick
    // counts. Marking this parked row `resumed` is the reservation itself: it joins
    // the counted set before the frame can spawn work, so two concurrent answers
    // cannot both observe a free final slot. No lease/claim/run-record state exists.
    const reservedAt = new Date().toISOString();
    let parkId = null;
    let parkJournal = null;
    try { parkJournal = await openEffectsJournal(storeOptions); }
    catch (error) { reportDegrade("mesh-terminal-resume-park-identity", error); }
    let admissionStore = null;
    try {
      admissionStore = await openGlobalWorkProjectionStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
      admissionStore.db.exec("BEGIN IMMEDIATE");
      try {
        const current = readAssignment(admissionStore, row.assignment_id);
        if (current == null || current.state !== "running" || current.code !== "needs-input") {
          const state = current?.state ?? "missing";
          const code = current?.code ?? "none";
          const projectedRun = current == null
            ? null
            : readWorkItemRuns(admissionStore, current.workspaceId, current.itemRef)
              .find((entry) => entry.record?.runId === current.runId)?.record ?? null;
          const attempt = Number.isInteger(projectedRun?.attempt) ? projectedRun.attempt : "unavailable on the control projection";
          throw commandError(
            `Assignment ${row.assignment_id} is not parked (state ${state}, code ${code}, run ${current?.runId ?? row.run_id ?? "unknown"}, attempt ${attempt}) — answer rejected; nothing resumed.`,
            "session-not-parked",
            409,
          );
        }
        previousNodeId = current.targetNodeId;
        nodeId = requestedNodeId ?? current.targetNodeId;
        parkId = parkJournal == null
          ? null
          : latestAppliedAssignmentParkEventId(parkJournal, row.assignment_id, { runId: current.runId, sessionId: current.sessionId });
        // Legacy/best-effort parks predate the durable event bridge. Their row
        // version is still a stable identity for this one park and changes when a
        // later distinct park is applied.
        parkId ??= `assignment-park:${row.assignment_id}:${current.updatedAt}`;
        const bound = dispatchConcurrencyFromConfig(ctx?.workspace);
        // The override is the ACTUAL destination. Count it, and atomically move
        // assignment attribution to it with the reservation before sending.
        const occupied = countDispatchSlotsByTarget(listAllAssignments(admissionStore)).get(nodeId) ?? 0;
        if (occupied >= bound) {
          throw commandError(
            `Assignment ${row.assignment_id} remains parked: target ${nodeId} is at its concurrency bound (${occupied}/${bound}); retry the answer after a slot frees.`,
            "resume-capacity-full",
            409,
          );
        }
        if (reserveParkedAssignmentResume(admissionStore, row.assignment_id, { now: reservedAt, targetNodeId: nodeId }) == null) {
          throw commandError(`Assignment ${row.assignment_id} changed while its answer was admitted — nothing resumed.`, "session-not-parked", 409);
        }
        admissionStore.db.exec("COMMIT");
      } catch (error) {
        // A failed ROLLBACK leaves the admission transaction open, which is the one
        // fault here that outlives the request — reported, never swallowed.
        try { admissionStore.db.exec("ROLLBACK"); } catch (rollbackError) { reportDegrade("mesh-terminal-resume-rollback", rollbackError); }
        throw error;
      }
    } finally {
      admissionStore?.close?.();
      parkJournal?.close?.();
    }

    const restoreParkReservation = async () => {
      const restore = await openGlobalWorkProjectionStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
      try {
        restoreParkedAssignmentResume(restore, row.assignment_id, {
          reservedAt,
          reservedTargetNodeId: nodeId,
          previousTargetNodeId: previousNodeId,
          now: new Date().toISOString(),
        });
      } finally {
        restore.close?.();
      }
    };

    const dispatchedAt = new Date().toISOString();
    try {
      await push.push(buildTerminalResumeEnvelope(nodeId, {
        sessionId,
        assignmentId: row.assignment_id,
        workspaceId: row.workspace_id,
        itemRef: row.item_ref,
        reservedAt,
        previousNodeId,
        parkId,
      }));
    } catch (error) {
      await restoreParkReservation();
      throw error;
    } finally {
      try { push.close?.(); } catch (error) { reportDegrade("mesh-terminal-resume", error); }
    }

    // 3. CONFIRM AT THE SOURCE — never report a fire-and-forget push as success
    //    (measured 2026-07-27: two resumes were dropped — one in a serve-restart
    //    race, one against a dead worker — while this command printed a
    //    success-shaped message both times). The dispatch is real the moment the
    //    WORKER's lifecycle frames land back in the store: poll the assignment
    //    row for an update newer than the dispatch. Not confirmed within the
    //    window = say so, with the exact places the truth lives.
    const confirmTimeoutMs = Number.isFinite(ctx?.confirmTimeoutMs) ? ctx.confirmTimeoutMs : 10_000;
    let confirmedRow = null;
    let refusedRow = null;
    const deadline = Date.now() + confirmTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(500, confirmTimeoutMs)));
      const probe = await openGlobalWorkProjectionStore({ ...storeOptions, paths: storeOptions.paths ?? globalMeshPaths(storeOptions) });
      try {
        const current = probe.db.prepare(
          "SELECT state, run_id, session_id, code, updated_at FROM global_assignments WHERE assignment_id = ?",
        ).get(row.assignment_id);
        if (current != null && typeof current.updated_at === "string" && current.updated_at > dispatchedAt) {
          // `needs-input` after dispatch is the explicit pre-spawn negative
          // acknowledgement. Every other newer lifecycle state proves the
          // worker took the resume (it may even have completed before this poll).
          if (current.state === "running" && current.code === "needs-input") refusedRow = current;
          else confirmedRow = current;
          break;
        }
      } finally {
        probe.close?.();
      }
    }
    // A timeout is AMBIGUOUS: the worker may already have started while its
    // lifecycle frame is delayed. Keep the reservation/count in that case.
    // Reparking is reserved for a provable pre-spawn refusal (push failure here,
    // or the control router's explicit not-connected callback).

    return {
      ok: true,
      dispatched: true,
      confirmed: confirmedRow != null,
      refused: refusedRow != null,
      refusalCode: refusedRow == null ? null : "terminal-resume-not-started",
      sessionId,
      node: nodeId,
      assignmentId: row.assignment_id,
      itemRef: row.item_ref,
      workspaceId: row.workspace_id,
      assignmentState: confirmedRow?.state ?? refusedRow?.state ?? row.state,
      confirmedCode: confirmedRow?.code ?? refusedRow?.code ?? "resumed",
      confirmedRunId: confirmedRow?.run_id ?? refusedRow?.run_id ?? null,
    };
  },

  cli: {
    // m42 wave (d) leg d1 (wave 3) — routed through the registry-derived table +
    // the ONE generic face; meshVerbCli's cli.mjs ladder branch is deleted.
    route: ["mesh", "terminal-resume"],
    spec: {
      usage: "aof mesh terminal-resume <sessionId> [--node <id>] [--workspace <path|id>] [--json]",
      flags: {
        node: { type: "string", description: "the node the session lives on" },
        ...MESH_WORKSPACE_FLAG,
      },
    },

    // `aof mesh terminal-resume <sessionId> [--node <id>]`.
    argv: (positionals, options = {}) => {
      guardMeshPositionals("terminal-resume", positionals, { max: 1 });
      return {
        ...(typeof positionals[0] === "string" && positionals[0].length > 0 ? { session: positionals[0] } : {}),
        ...(typeof options.node === "string" && options.node.length > 0 ? { node: options.node } : {}),
      };
    },

    render(result) {
      if (result.refused) {
        return `resume NOT STARTED (${result.refusalCode}): session ${result.sessionId} remains parked; target ${result.node} rejected the request before spawn, so the answer may be retried.`;
      }
      if (!result.confirmed) {
        return [
          `resume dispatched but NOT CONFIRMED: session ${result.sessionId} -> ${result.node} — the assignment row did not move within the confirmation window.`,
          `The resume reservation remains counted because timeout cannot prove the worker did not start; do NOT send the answer again while the row reads resumed.`,
          `Check: \`aof mesh logs mesh-serve --tail 20\` on the control. A provable terminal-resume-target-not-connected refusal reparks the row; only then may the answer be retried.`,
        ].join("\n");
      }
      return [
        `resume CONFIRMED: session ${result.sessionId} -> ${result.node} (assignment ${result.assignmentId}, item ${result.itemRef})`,
        `row: ${result.assignmentState}${result.confirmedCode ? ` (code: ${result.confirmedCode})` : ""}${result.confirmedRunId ? ` · run ${result.confirmedRunId}` : ""}`,
        `The board's terminal affordance re-arms on the live session as it reports in.`,
      ].join("\n");
    },

    json: (result) => result,
  },
};
