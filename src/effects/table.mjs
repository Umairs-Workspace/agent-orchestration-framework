// src/effects/table.mjs — THE effects ledger (m42 wave (d) leg d2; PRD-command-spine-
// effects-ledger). One executable table owning every consequence and its
// topology: EFFECTS maps each domain event to its reactors, each tagged with the
// LOCUS of the one store it mutates. This file is the executable replacement for
// the prose coupling registry ("the scan ORCHESTRATES, work.mjs WRITES", "MUST
// NEVER touch", …): adding a consequence is one line HERE, never a re-remembered
// call-site copy. Rule three of TECH_DEBT item 0: one home per fact, one door
// per act, ONE LEDGER PER CONSEQUENCE.
//
// Reactor contract (dispatch enforces the discipline, this file declares it):
//   - `apply(event)` where event = { eventId, name, payload } — the payload is
//     the event's own evidence (never an empty ping that forces a racing
//     re-read); a reactor rebuilds everything it needs from it.
//   - IDEMPOTENT or event-id-deduped: delivery is at-least-once by design
//     (crash between write and drain, redelivery over the bridge in d3).
//   - Mutates exactly ONE store — the one its locus names.
//   - OPTIONAL `applies(payload, ctx)` — the APPLICABILITY PREDICATE (m42 wave
//     (d) leg d4, port 4): a consequence that can NEVER apply to this event's
//     workspace is not owed at all. Evaluated ONCE, by the transition seam at
//     append time (applicableReactors below) — never by the drain, because a
//     step that reached the journal IS owed and stays owed until terminal.
//     Absent ⇒ always applicable. Without this, a locus no process drains
//     (integration:* in a workspace with no such integration configured) would
//     accumulate pending steps owed to nobody, forever.
//
// Loci (where the mutated store's one writer can run):
//   checkout            — the repo folder holding the item (frontmatter, runs/)
//   control-store       — the authoritative mesh SQLite (d3 wires its reactors)
//   local               — this node's own projection/logs
//   integration:<name>  — an external system + credentials (d4 wires Notion)
import { loadWorkspace, rollbackItemStatus, setItemStatus, listItems, typeHasRecordDoc } from "../work.mjs";
import { publishGlobalWorkSnapshot } from "../global-work-publisher.mjs";
import { openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs, remapWorkspaceFactRefs, workspaceIdFor } from "../global-work-store.mjs";
import { setItemBranch } from "../mesh/assignment-directive.mjs";
import { restoreParkedAssignmentResume } from "../assignment-record.mjs";
import { rewriteRunItemRef } from "../run-store.mjs";
import { remapMappingRefs } from "../notion/mapping.mjs";
import { syncMilestoneWork } from "../notion/sync-work.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { reportDegrade } from "../degrade.mjs";
// milestone 61 / ADR-007 §2a — the acceptor's ONE I/O home. The ledger append is this
// table's ninth consequence, and it is reached through the store rather than written
// here: the store holds BOTH of a ruling's writes, which is what makes the harness value
// and the record that justifies it one working-tree change.
import { appendRuling } from "../work-acceptor/store.mjs";

export const KNOWN_LOCI = Object.freeze(["checkout", "control-store", "local"]);

export function isKnownLocus(locus) {
  return KNOWN_LOCI.includes(locus) || String(locus).startsWith("integration:");
}

// ---------------------------------------------------------------- reactors --

// run.started / advance-status — the WRITE-FORWARD half of the item lifecycle, and the
// cure for the defect that a run could be `running` for hours while its item's record doc
// still said `not-started`. A minted run is the one unambiguous "work has started" fact in
// the system, so it is the fact that moves the item to `in-progress` — declared here
// beside its mirror (rollback-status, below) rather than remembered by each of the four
// mint sites, and reached by all of them because none can mint without the seam.
//
// Bounded to `not-started|blocked` (setItemStatus's `expectFrom`): a mint against an item
// already `in-review` must not drag it back to the bench, and the self-edge an
// at-least-once redelivery asks for is refused rather than re-written — which is exactly
// what makes this reactor idempotent. `status-edge-not-applicable` is therefore the
// SANCTIONED no-op here, the same shape rollback-not-applicable is below.
//
// AND IT IS NOW NARROW ENOUGH TO BE HONEST (74/01, finding F-73-G). Until the writer grew
// `record-doc-unusable`, three doc-shape faults arrived under this very code, so a mint
// against an item whose record doc is malformed — the `<!-- aof-generated: bundle -->`
// trap — reported `{ skipped: true }` and the fault never surfaced. The catch below is
// unchanged; what changed is that the fault no longer wears its name. It propagates,
// which marks THIS step `failed` (+ a degrade report) while leaving the mint itself
// untouched — dispatch never fails an event's producer for a reactor's fault.
//
// Deliberately NOT its counterpart on run.completed: a `done` run does not tell us WHICH
// phase completed (a run carries no phase — the same run vocabulary serves refine, build
// and verify), so advancing to `in-review` on a completed run would mark a refined-but-
// unbuilt story accept-ready. Everything past `in-progress` is a judgement, and judgements
// come through the explicit `work:status` door.
async function advanceStatusOnRunStart(event) {
  const { ref, itemDir, itemType } = event.payload ?? {};
  // A mint site with no local folder (the worker's no-workspace path) has no record doc
  // to move; nothing is owed rather than a fabricated path (the ADR-010/R6.4 reading).
  if (!itemDir) return { skipped: true, reason: "no-item-dir" };
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

// run.completed / rollback-status — 20/ADR-005 made declarative: a run completed
// as FAILED rolls its in-progress item back to not-started so the stream stays
// honest. Rebuilt from the event's own evidence; rollback-not-applicable (the item
// is not in-progress) is the sanctioned no-op, exactly the inline behaviour this
// reactor replaced in commands/run-complete.mjs — and no longer covers "no record
// doc", which is the DOCUMENT's fault (`record-doc-unusable`, 74/01) and surfaces
// as a failed step rather than as ordinary idempotence.
async function rollbackStatusIfFailed(event) {
  const { outcome, ref, itemDir, itemType } = event.payload ?? {};
  if (outcome !== "failed") return { skipped: true, reason: "outcome-not-failed" };
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

// publish-projection — publish-on-mutate as a LOCAL-locus reactor. This ONE
// function is now the whole of publish-on-mutate for the command layer (m42 wave
// (d) leg d4, port 1): `withGlobalWorkPropagation` — the per-command import
// decision that let each mutation verb choose whether its workspace propagated —
// is DELETED, and the three events below declare the consequence instead. A verb
// can no longer forget to publish, and a new mutation opts in by adding a row to
// EFFECTS rather than by remembering an import.
//
// Naturally idempotent — the snapshot publish upserts the workspace's current
// truth, so an at-least-once redelivery is a re-publish of the same facts. The
// publisher returns a warning as DATA because the local mutation must keep its own
// success result. This reactor turns that warning into a RETRYABLE effect failure,
// carrying the same warning as structured failure detail: the journal therefore
// keeps the consequence owed while the transition's caller still threads it back
// onto the command result
// (global-work-publisher.mjs's threadPropagationWarnings — the ONE home for that
// threading, so `propagationWarnings` reaches renders/--json exactly as it did
// before this port).
//
// ctx.publisherOptions is the command's own ctx passed through by the transition
// seam — the publisher's established injection seam (globalPublisher,
// globalWorkStoreOptions, now, fabricPeers…), which is what the retired wrapper
// forwarded. A crash-recovery drain supplies none and the reactor opens its own,
// exactly as the reactor contract requires.
//
// m43 / ADR-004 + ADR-010/D1 — THIS reactor is the OPERATOR DOOR. Publish-on-mutate
// fires because a verb on THIS node changed an item, so the control legitimately takes
// authorship of that item's cached row ("a gate is where authorship changes hands"),
// while the rest of the publish stays an ordinary disk-derived tick that steps over rows
// other nodes authored. The operator's reach is therefore exactly the refs the event
// itself names — never the whole workspace, which is what a bare `operator: true` flag
// would have meant and would have let one `work:feedback` seize every worker's row.
async function publishItemProjection(event, ctx = {}) {
  const { workspaceRoot } = event.payload ?? {};
  if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
  const workspace = await loadWorkspace(workspaceRoot);
  const publish = await publishGlobalWorkSnapshot(workspace, {
    ...(ctx.publisherOptions ?? {}),
    operatorRefs: operatorRefsFor(event.payload),
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

// operatorRefsFor(payload) — the refs the operator's verb actually mutated, read from
// the event's OWN evidence (the reactor contract: rebuild from the payload, never
// re-read racing state). A run/feedback event names one `ref`. A reindex names BOTH
// ENDS of every remap entry, because a renumber rewrites a pair: `to` gains an item, and
// `from` — the ref the renumber VACATED — now means something else entirely, so a row
// left there under the old meaning is wrong data at a live ref rather than a stale copy
// of the right one. Both ends, and nothing wider: the operator's reach is the refs its
// own act touched, never the workspace.
function operatorRefsFor(payload = {}) {
  const refs = [];
  if (typeof payload?.ref === "string" && payload.ref.length > 0) refs.push(payload.ref);
  for (const entry of Array.isArray(payload?.remap) ? payload.remap : []) {
    for (const end of [entry?.from, entry?.to]) {
      if (typeof end === "string" && end.length > 0) refs.push(end);
    }
  }
  return refs;
}

// run.completed / notion-status-sync — the Notion status sync as a LEDGERED
// consequence (m42 wave (d) leg d4, port 4). Today's defect: forgetting to run
// `aof work integrations notion sync-work` is INVISIBLE — nothing records that a
// completed run's status never reached the board. Now a completion in a
// Notion-configured workspace owes a durable `integration:notion` step. Who pays
// it is the port's recorded operator decision (2026-07-31): with
// `work.integrations.notion.autoSync: true` the completion's own drain reaches
// the integration locus (dispatch.reachableLoci) and the sync happens in place;
// WITHOUT autoSync the step stays deferred until the sync-work verb — the
// operator's "do Notion egress now" door — drains it.
//
// IDEMPOTENT BY THE SIDECAR, not event-id-deduped: the core re-projects from
// local facts and the sidecar's lastStatus/lastContentHash decide noop for an
// already-covered item, so an at-least-once redelivery issues ZERO egress. The
// sync scope is the completed item's MILESTONE (the sync-work unit — a story's
// status ride shares the board write with its milestone's routing).
//
// ctx.publisherOptions is the command's own ctx passed through by the transition
// seam (the table's established injection convention) — its `notionSpawn` is the
// same spy seam the verb honours, so a test drives the reactor without egress. A
// crash-recovery drain supplies none and the core builds the real
// provisioned-CLI spawn from the workspace's own config.
async function syncNotionStatus(event, ctx = {}) {
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

// The applicability predicate: a workspace with NO `work.integrations.notion`
// block can never sync, so its completions owe no step (the port-4 leak fix —
// without this, every completion in every unconfigured workspace would append a
// step no process ever drains). The worker's no-workspace mint/settle sites
// (payload workspaceRoot null) are not applicable by the same reading.
async function notionSyncApplies(payload, ctx = {}) {
  const root = payload?.workspaceRoot;
  if (!root) return false;
  const config =
    ctx.workspace?.projectRoot === root ? ctx.workspace.config : (await loadWorkspace(root)).config;
  return config?.work?.integrations?.notion != null;
}

// assignment.settled / record-item-branch — the cascade that lived inline in
// `applyAssignmentStatusFrame` (m42 wave (d) leg d3): a `done` means the worker's
// push SUCCEEDED (it sends done only after pushing), so the branch it reported
// becomes this item's active branch and the next continue/verify reuses it.
// Keyed by the assignment ROW's OWN workspace/item — never a self-reported id
// (the same T6 discipline the transition's holder guard keeps). Absent branch (a
// pre-upgrade worker, or any non-done edge) is the sanctioned no-op.
//
// control-store locus: it writes the authoritative mesh SQLite. It takes the
// open store from ctx when the caller has one (the transition and the control
// tick both do) and opens its own otherwise, so a crash-recovery drain from any
// control-node process behaves identically.
async function recordItemBranch(event, ctx = {}) {
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

// assignment.reported / settle-assignment — the WORKER->CONTROL fact (m42 wave
// (d) leg d3). A worker that has finished with an assignment must settle its row
// on the CONTROL node's store, which is why this reactor's locus is
// `control-store`: on a control-node process it runs in place; on a WORKER it is
// unreachable, so it stays a pending step and travels by outbox (outbox.mjs) —
// delivered at-least-once, acked by (eventId, reactorKey), redelivered after a
// dropped connection. That is the structural cure for the measured fire-once
// defect (a stranded worktree's `failed` report dying on a dead socket while the
// control row read `running` for 35+ minutes).
//
// It settles through the SAME transition every other writer uses, so the holder
// guard (this connection's authenticated node, via ctx.byNode) and the
// terminal-never-regresses rule apply to a bridged fact exactly as they do to a
// status frame — a worker cannot use this door to write something the other door
// would refuse. Non-terminal states are refused here rather than silently
// forwarded, with ONE exception: running + needs-input is the capacity-moving
// PARK fact. It must survive a disconnected worker and is acknowledged only after
// this reactor has put the code on the authoritative assignment row. Ordinary
// accepted/running posture remains best-effort on the status frame.
async function settleAssignment(event, ctx = {}) {
  const { assignmentId, state, runId, branch, sessionId, code } = event.payload ?? {};
  if (!assignmentId) return { skipped: true, reason: "no-assignment" };
  const park = state === "running" && code === "needs-input";
  if (state !== "done" && state !== "failed" && !park) return { skipped: true, reason: `state-not-terminal:${state}` };
  // DYNAMIC IMPORT, deliberately: the transition seam resolves its own reactors
  // through this table, so a static import here would close a module-init cycle.
  // Deferring past init is exactly what the layering gate documents as the
  // sanctioned escape hatch, and this is the one place that needs it.
  const { transitionAssignmentState } = await import("./assignment-transitions.mjs");
  const store = ctx.store ?? (await openGlobalWorkProjectionStore(ctx.globalWorkStoreOptions ?? {}));
  try {
    const result = await transitionAssignmentState(
      store,
      assignmentId,
      state,
      { byNode: ctx.byNode ?? null, now: ctx.now, runId, sessionId, branch, code },
      { journalOptions: ctx.journalOptions ?? {} },
    );
    if (!result.applied) return { settled: false, code: result.code };
    // `code` is transition evidence, not a refusal. Returning it in the reactor
    // detail would make the bridge ACK interpret a successful needs-input apply as
    // a coded rejection and pay the worker's step without a success receipt.
    return { settled: true, state };
  } finally {
    if (!ctx.store) store.close?.();
  }
}

// terminal.resume-refused / restore-parked-resume — the durable negative ACK for
// a control-side resume reservation. The complete reservation identity is event
// evidence, so a redelivery can only restore the exact `resumed` CAS and can put
// an operator-overridden row back on its previous target. A clean return is the
// control confirmation that permits the worker's outbox step to be acknowledged.
async function restoreParkedResume(event, ctx = {}) {
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

// stream.reindexed — THE CASCADE AN INSERT NEVER HAD (m42 wave (d) leg d4, port 3).
// `aof work insert-*` renumbers folders and rewrites depends/parent, and stops
// there. But a REF is the join key of six stores, and the renumber told none of
// them: run records keep saying `03` while the item is now `04`; the Notion sidecar
// keeps `03 -> <pageId>`, so the next sync PATCHes that page with a DIFFERENT item's
// content (the visible symptom, and the reason this port is in the arc); the
// streamed doc/run rows, assignment rows and item branches all key on the old ref.
//
// The event carries the OLD → NEW list itself, in the collision-free order the
// engine computed it (descending by the number that moved), because after the
// renames the old refs exist nowhere to be re-derived from — the PRD's "never an
// empty ping that forces reactors to re-read racing state" in its sharpest form.
//
// DELIBERATELY ABSENT FROM THE REF-REMAP: `work_items`. It carries `parent` and
// `source_path` beside `ref`, so remapping one column would leave the row
// self-inconsistent. What reconciles it instead is the cascade's LAST step,
// `publish-projection` — which, until m43/43/02 (ADR-012/B6), this comment claimed
// existed when it did not. It exists now, it is declared in the EFFECTS entry above,
// and it re-derives the renumbered refs from the renamed stream on disk with the
// operator's own remapped refs taking authorship.

// stream.reindexed / remap-run-refs — the checkout half: each renumbered item's own
// run records. Resolved by the item's NEW ref against the CURRENT stream, so a
// redelivery finds records that already say `to` and rewrites nothing.
async function remapRunRecordRefs(event) {
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

// stream.reindexed / remap-notion-map — the sidecar's ref-keyed bindings. CHECKOUT
// locus, deliberately NOT integration:notion: the sidecar is a plain JSON file in
// this workspace's own `.aof/`, needing no credentials and reaching no external
// system. Declaring it integration:notion would leave the step permanently deferred
// on every ordinary CLI process (which reaches checkout + local only) and the
// mis-binding would survive the very port that exists to kill it. Talking TO Notion
// is the integration locus; rewriting our own map of it is not.
async function remapNotionSidecar(event) {
  const { workspaceRoot, remap } = event.payload ?? {};
  if (!workspaceRoot) return { skipped: true, reason: "no-workspace-root" };
  return await remapMappingRefs(workspaceRoot, remap, { eventId: event.eventId });
}

// stream.reindexed / remap-projection — this node's own STREAMED-MIRROR rows
// (work_item_docs / work_item_runs — the `local`-locus half of the d5 split; the
// table list derives from the store classification). `work_items` is NOT among
// them by design: it is re-derived from the renamed stream by the publish reactor
// declared LAST on this same event, which is also what makes an insert propagate at
// all. (Pre-m43 this comment said "rebuilt wholesale" and named a reactor that did
// not exist; the sweep is gone — `work_items` is a fact — and the reactor is real.)
// The payload's own workspaceId is preferred; the derivation survives as the
// fallback for a pre-d5 journaled event redelivered across an upgrade.
async function remapProjectionRefs(event, ctx = {}) {
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

// stream.reindexed / remap-control-facts — the DISPATCH-FACT rows
// (global_assignments.item_ref, global_item_branches — the `control-store` half
// of the d5 split, which port 3 deferred). These rows belong to the
// authoritative mesh store's writer, so the step defers past an ordinary CLI
// drain and is paid by the control daemon's converge tick — or arrives over the
// d3 bridge when the reindex ran on a worker machine, which is why it keys by
// the payload's OWN workspaceId and never dereferences workspaceRoot (a foreign
// checkout path on the applying node). Event-id-deduped on its own watermark
// (`lastReindexFactsEventId`) — the two halves drain at different times and must
// not read each other's stamp.
async function remapControlFactRefs(event, ctx = {}) {
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

// Applicability (the port-4 machinery, reused): dispatch facts exist only for a
// MESH workspace — a solo workspace's reindex owes no control-store rewrite, and
// without this predicate every insert in every non-mesh workspace would append a
// step no drain on that machine ever reaches.
async function meshFactsApply(payload, ctx = {}) {
  const root = payload?.workspaceRoot;
  if (!root) return false;
  const config =
    ctx.workspace?.projectRoot === root ? ctx.workspace.config : (await loadWorkspace(root)).config;
  return config?.mesh?.enabled === true;
}

// harness.ruled / stamp-evidence — THE ACCEPTOR'S RECORD (milestone 61 / ADR-007 §2).
//
// A CHECKOUT-locus reactor, because it writes into the workspace's own tracked state:
// `.aof/acceptor-ledger.jsonl`, beside the `.aof/aof.config.json` the ruling concerns. A
// per-node store was the obvious alternative and is refused by ADR-006 — the evidence has
// to revert with the change it justifies, and one `git revert` can only take back both if
// both are in the same tree.
//
// IT NEVER RE-DERIVES A VERDICT. The event carries the whole ruling as its payload (the
// d2 rule: an event is evidence, never a ping), so this reactor writes what the acceptor
// rendered rather than an answer reconstructed later against a criterion or a ledger that
// may have moved since. A drain on another process therefore reproduces the identical
// line, which is the property the redelivery rule rests on.
//
// IDEMPOTENT BY THE RULING'S IDENTITY, mirroring the journal's own INSERT OR IGNORE. The
// identity is minted by the seam and travels on the payload, so it survives the
// journal-less path (where the event id is null) and every redelivery shape. This is not
// ceremony: the ledger IS the evidence the acceptor weighs, so a second copy is a ruling
// that never happened, and enough of them carry a proposal over a threshold set precisely
// so that noise could not.
//
// IT CANNOT DECLINE. Every reactor above may skip on a payload with no `workspaceRoot` —
// a run minted with no workspace owes no projection — and this one deliberately may NOT,
// which is the one place its shape departs from theirs. A ruling is owed its record in
// EVERY workspace (that is why it carries no applicability predicate), so there is no
// shape of this event with nothing to record: a payload without a root is a malformed
// event, not a quiet no-op. Measured, the skip was the hole — `{ skipped: true }` is a
// RETURN, the dispatcher marks a returning reactor `done`, and a seam that trusted that
// status returned success over a harness value written and no ledger line, with the step
// settled so no later drain would ever pay it. So the absent root falls through to the
// store's own door, which refuses it with a code; the step is then `failed` and still
// owed, which is what an unpayable consequence is supposed to look like.
async function stampRulingEvidence(event) {
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

// ------------------------------------------------------------- the ledger --

// The CLOSED event vocabulary, like the tag set: a name not declared here is
// REFUSED — by `applicableReactors` below, which every seam resolves through
// before it appends (61/ADR-007 §4).
//
// This comment used to say `appendEvent` did the refusing, and it was FALSE for
// as long as it stood: the journal validates only that a name is non-empty, so a
// misspelled name appended silently and resolved to zero reactors — the fact
// filed, and the thing that was supposed to happen because of it owed to nobody,
// with the seam getting back exactly what a correctly spelled event with nothing
// to do would give it. The fix is here rather than there on purpose: the journal
// is DUMB STORAGE that never imports the vocabulary (the d2 layering), and
// teaching storage the vocabulary in order to police it would invert the one
// arrangement this family is built on. The door is the module that knows what a
// name means.
//
// Array order IS cascade order within a locus pass — rollback lands before the
// projection publishes, so the published snapshot carries the rolled-back
// status (the inline ordering run-complete.mjs relied on, now structural).
export const EFFECTS = Object.freeze({
  // m42 wave (d) leg d4 port 1 — the run MINT, raised by transitionRunStart for
  // every mint site (work:run-start, work:run-retry, the worker's two). It joins
  // the vocabulary now because a real reactor wants it: publish-on-mutate, which
  // work:run-start used to remember as its own `withGlobalWorkPropagation` import.
  // The mint sites that never propagated still don't — they pass no workspace, so
  // the payload's workspaceRoot is null and the reactor skips (the d2 precedent
  // for the worker's completeRun sites, kept verbatim: worker-side publishing is
  // its own decision, not a side effect of this port).
  // Array order is cascade order: the status advance lands FIRST (checkout locus), so
  // the snapshot the publish reactor derives from disk carries `in-progress` — the board
  // and the fleet see the item start, rather than reading `not-started` under a running
  // run until something later happened to rewrite it.
  "run.started": Object.freeze([
    Object.freeze({ key: "advance-status", locus: "checkout", apply: advanceStatusOnRunStart }),
    Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
  ]),
  // Array order is cascade order: rollback lands FIRST, so both the published
  // snapshot and the Notion sync (m42 wave (d) leg d4 port 4 — appended only
  // when its applicability predicate says the workspace is Notion-configured)
  // read the rolled-back status, never the pre-rollback lie.
  "run.completed": Object.freeze([
    Object.freeze({ key: "rollback-status", locus: "checkout", apply: rollbackStatusIfFailed }),
    Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    Object.freeze({
      key: "notion-status-sync",
      locus: "integration:notion",
      apply: syncNotionStatus,
      applies: notionSyncApplies,
    }),
  ]),
  // m42 wave (d) leg d4 port 1 — the record-doc mutation (a bullet under the
  // verbatim `## Feedback (for retro)` heading), raised by the doc transition
  // seam. Its one consequence is the same publish work:feedback used to import
  // for itself. Both faces (CLI + the board's POST /api/work/feedback) inherit
  // it, because both reach the fact through the one seam.
  "feedback.recorded": Object.freeze([
    Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
  ]),
  // The ITEM LIFECYCLE move, raised by effects/item-transitions.mjs — the explicit door
  // (`aof work status <ref> <status>`) every judgement transition comes through, beside
  // the automatic `not-started -> in-progress` the run mint's own reactor writes. Its
  // consequences are the two a status change owes: the projection the board and the fleet
  // read (so a story that just went in-review is not still shown building), and the
  // Notion status sync — the SAME reactor `run.completed` declares, because "the item's
  // status reached the board" is one consequence with one home, not one per event.
  "item-status.changed": Object.freeze([
    Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
    Object.freeze({
      key: "notion-status-sync",
      locus: "integration:notion",
      apply: syncNotionStatus,
      applies: notionSyncApplies,
    }),
  ]),
  // m42 wave (d) leg d4 port 3 — the insert/reindex cascade. Array order is
  // cascade order: the two checkout remaps and the projection remap run over the
  // OLD refs the payload names, and the publish LAST — over the renamed stream.
  //
  // THE PUBLISH STEP IS REAL AS OF m43/43/02 (ADR-012/B6); until then this comment
  // described one that did not exist. It is not decoration: after the authority cut a
  // renumber can no longer self-heal on the next tick, because the tick may not write a
  // ref another node authored — so `43/03 -> 43/04` left the cache answering for `43/03`
  // with the PREVIOUS occupant's slug, title and status, permanently, at a ref the
  // operator had just given to a different item. This reactor is the cure and it is the
  // ONLY caller that carries `remap` in its payload: the publish takes authorship of
  // exactly the refs the renumber rewrote (both ends), and of nothing else.
  //
  // It still publishes an INTERMEDIATE stream — the slot is open, the caller scaffolds
  // the new item on its next step — so the newly created ref appears on the following
  // tick. That eventual consistency is unchanged from before this reactor existed; what
  // changes is that a vacated ref stops carrying another item's data in the meantime.
  "stream.reindexed": Object.freeze([
    Object.freeze({ key: "remap-run-refs", locus: "checkout", apply: remapRunRecordRefs }),
    Object.freeze({ key: "remap-notion-map", locus: "checkout", apply: remapNotionSidecar }),
    Object.freeze({ key: "remap-projection", locus: "local", apply: remapProjectionRefs }),
    // m42 wave (d) leg d5 — the fact half of the ref-remap, split from the
    // mirror half by the store classification; owed only by mesh workspaces
    // (the applicability predicate) and drained where the authoritative store's
    // writer runs (the control tick, or the d3 bridge for a worker-side insert).
    Object.freeze({
      key: "remap-control-facts",
      locus: "control-store",
      apply: remapControlFactRefs,
      applies: meshFactsApply,
    }),
    Object.freeze({ key: "publish-projection", locus: "local", apply: publishItemProjection }),
  ]),
  // m42 wave (d) leg d3 — every assignment state change flows through
  // effects/assignment-transitions.mjs, which raises this. Its one declared
  // consequence today is the branch record the apply seam used to write inline;
  // the reclaim/publish cascades join it in d4.
  // m42 wave (d) leg d3 — the WORKER'S REPORT that its assignment reached a
  // terminal state. Raised by the worker at the moment it knows the final answer
  // (after the push, for a done), which is why it is its own event rather than a
  // reactor on run.completed: a run can complete `done` and still fail to push,
  // and "a done means the push succeeded" is the contract control depends on.
  // Its one reactor is control-locus, so on a worker the step stays pending and
  // travels by outbox — the fire-once cure.
  "assignment.reported": Object.freeze([
    Object.freeze({ key: "settle-assignment", locus: "control-store", apply: settleAssignment }),
  ]),
  "terminal.resume-refused": Object.freeze([
    Object.freeze({ key: "restore-parked-resume", locus: "control-store", apply: restoreParkedResume }),
  ]),
  "assignment.settled": Object.freeze([
    Object.freeze({ key: "record-item-branch", locus: "control-store", apply: recordItemBranch }),
  ]),
  // milestone 61 / ADR-007 §1 — THE NINTH NAME, and it is named for the RULING rather
  // than for the change.
  //
  // None of the eight above carries a configuration or harness change, and the one writer
  // seam that touches editable resources records no prior value, no evidence and no
  // provenance — so an acceptor that moves a harness value could leave the change in git
  // and the reason nowhere. This is the event that carries the reason.
  //
  // `harness.changed` was the obvious name and is refused. Report-only is this acceptor's
  // PERMANENT steady state, not a phase it grows out of, so an event meaning "the harness
  // changed" would fire almost never and every honest refusal — the overwhelming majority
  // of the work, and the part an operator most needs to read — would leave no trace at
  // all. One name covers both outcomes; the payload's `verdict` tells them apart.
  //
  // ONE reactor. The applicability machinery already discriminates by predicate and the
  // fact is one fact — the harness the accruing evidence was gathered under is no longer
  // the harness that runs — so a second event (or a second consequence) would be one
  // consequence spelled twice.
  "harness.ruled": Object.freeze([
    Object.freeze({ key: "stamp-evidence", locus: "checkout", apply: stampRulingEvidence }),
  ]),
});

// The declared-name refusal's code, and it is a CONSTRUCTION refusal: it is thrown,
// which means no event was produced at all. It is deliberately disjoint from the
// journal's storage faults (`invalid-event`, `event-id-conflict`, `sqlite-unavailable`)
// — "nobody knows that name" and "the event could not be stored" are different answers
// and a caller must be able to branch on which it got.
export const EVENT_NOT_DECLARED = "event-not-declared";

export class UndeclaredEventError extends Error {
  constructor(offered, declared) {
    const shown = typeof offered === "string"
      ? JSON.stringify(offered)
      : `a ${offered === null ? "null" : typeof offered} value`;
    super(
      `Refusing to raise ${shown}: the effects vocabulary does not declare that name, so nothing could be owed for it and nothing would ever say so. `
      + `Declared: ${declared.join(", ")}.`,
    );
    this.name = "UndeclaredEventError";
    this.code = EVENT_NOT_DECLARED;
    this.status = 400;
    // The name AS GIVEN, so a caller reporting the refusal can show the misspelling
    // rather than a normalised guess at what was meant.
    this.event = offered;
    this.declared = declared;
  }
}

// `Object.hasOwn`, never `in` or a bare index: `EFFECTS["toString"]` inherits a FUNCTION
// off the prototype, so an index test would read an inherited member as a declaration and
// hand back something that is not a reactor list at all.
function isDeclared(effects, name) {
  return typeof name === "string" && Object.hasOwn(effects, name);
}

export function effectsFor(name) {
  return isDeclared(EFFECTS, name) ? EFFECTS[name] : null;
}

// applicableReactors(name, payload, ctx) — the append-time resolution every
// transition seam uses (m42 wave (d) leg d4, port 4): the declared reactors,
// minus any whose applicability predicate says this consequence can never apply
// to this event's workspace. Evaluated ONCE, before the append — a step that
// reaches the journal is owed, and the drain never re-litigates it. An
// unanswerable predicate (the config read threw) resolves NOT OWED, loudly: the
// alternative — owing a step in a workspace that may never drain its locus — is
// the permanent-leak class this machinery exists to close, while a wrongly
// skipped optional sync is recoverable by running the verb.
//
// ── AND AN UNDECLARED NAME IS REFUSED HERE (61/ADR-007 §4) ─────────────────
//
// The distinction the old silent `?? []` destroyed: "no consequence applies
// here" and "nobody knows that name" are DIFFERENT ANSWERS. A workspace with no
// external integration configured genuinely owes nothing for an event only that
// integration reacts to, and that stays a clean resolution to the empty list — a
// declared name with nothing to do is not an error. A typo owes nothing for an
// entirely different reason, and gets a coded refusal its caller can act on.
//
// The refusal is against the SUPPLIED table, which is what makes it true of a
// vocabulary that has moved: a name a past version declared and this one does not
// is refused by the table it is actually offered to.
//
// It comes BEFORE anything is stored, structurally rather than by convention:
// every seam resolves through here and appends afterwards, so a refused name
// leaves no event, no partially owed step and nothing for a later pass to find.
export async function applicableReactors(name, payload, ctx = {}, effects = EFFECTS) {
  if (!isDeclared(effects, name)) throw new UndeclaredEventError(name, Object.keys(effects));
  const declared = effects[name];
  const owed = [];
  for (const reactor of declared) {
    if (typeof reactor.applies !== "function") {
      owed.push(reactor);
      continue;
    }
    try {
      if (await reactor.applies(payload, ctx)) owed.push(reactor);
    } catch (error) {
      reportDegrade("effect-applies", error, { path: `${name}/${reactor.key}` });
    }
  }
  return owed;
}

export function knownEvents() {
  return Object.keys(EFFECTS);
}
