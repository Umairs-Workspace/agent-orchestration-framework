// src/effects/stream-transitions.mjs — the WORK STREAM's transition seam (m42 wave
// (d) leg d4, port 3). The fourth seam, beside run-transitions.mjs (the run store),
// assignment-transitions.mjs (the assignment store) and doc-transitions.mjs (the
// record docs).
//
// THE DEFECT THIS CLOSES. `aof work insert-*` opens a slot by renaming folders and
// rewriting the `depends`/`parent` values that name the moved numbers — and stops.
// But an item's REF is the join key of six other stores, and the renumber told none
// of them: the run records inside the renamed folder still stamp the old ref, the
// Notion sidecar still binds `03` to the page that is now item `04` (so the next
// sync overwrites a page with another item's content — the measured symptom), and
// the streamed doc/run rows, assignment rows and item branches all keep the ref they
// were written with. Nothing was wrong at the call site; the consequence simply had
// no home. It has one now: `stream.reindexed`, whose reactors are declared in
// effects/table.mjs.
//
// File-store discipline is run-transitions.mjs's: write-then-append, with the d5
// reconciler scan closing the window between them. The REMAP is computed by the
// engine BEFORE its renames (work-reindex.mjs's buildRefRemap) — after them the old
// refs exist nowhere to be derived from, so the event must carry them.
import { reindexForInsert, refsTouchedByInsert } from "../work/reindex.mjs";
// milestone 127 / ADR-004, story 03 — the stream's OTHER write act: the verbatim MOVE under
// `archive/`. Its engine lives beside the reindex engine (`src/work/archive.mjs`) because THIS
// seam imports its fact-writers and the command imports this seam — a fact-writer inside the
// command would close a cycle. `refsMovedByArchive` is the engine's own selection of what moves
// (each driver and its stories), which the lock below reads rather than deriving a second time.
import { archiveItems, refsMovedByArchive } from "../work/archive.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
// m43 / ADR-003 + ADR-004 — the CONTROL-SIDE MUTATION door. STATE's settled rule
// ("control-side writes refused mid-phase, allowed at a gate") lands in the SAME guard
// as the mint door rather than as a second rule, and it lands HERE — the single seam
// both insert call sites already route through — rather than in the cache's upsert
// seam: an insert RENUMBERS FOLDERS while a worker holds a worktree full of the old
// refs, which is the destructive case the lock exists for, and it is this seam that
// opens the slot.
import { guardItemLock, lockContextFor } from "../item-lock.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";

// transitionStreamReindexed(workspace, edge, opts) — open the slot and raise the
// cascade.
//
//   workspace — the loaded workspace (its workDir is reindexed; its projectRoot is
//               the evidence every reactor rebuilds from)
//   edge      — { at, space, parent } (reindexForInsert's own contract; its coded
//               refusals — reindex-invalid-space / reindex-invalid-folder-name /
//               reindex-number-bump-failed — propagate untouched, and NOTHING is
//               appended)
//   opts      — { publisherOptions, journalOptions, drain = true }
//
// Returns reindexForInsert's own result shape (so its callers are unchanged) plus
// `eventId` and the per-reactor `effects`.
//
// A no-op reindex (nothing shifted, so nothing to remap) raises NO event: an
// insert at the end of the stream moves no ref, and a ledger entry claiming
// otherwise would be a lie the crash-recovery drain would faithfully repeat.
export async function transitionStreamReindexed(workspace, { at, space, parent } = {}, opts = {}) {
  const { publisherOptions = null, journalOptions = {}, drain = true } = opts;

  // (0) THE LOCK — in front of the fact, so a refused insert renames not one folder.
  // Every ref this insert would renumber must be free: a nested insert under a held
  // milestone, and a top-level insert that shifts a held milestone's own number, are
  // both refused with the ONE code naming the holder. The touched set comes from the
  // engine's OWN selection (refsTouchedByInsert), never a second derivation.
  await guardItemLock(await refsTouchedByInsert(workspace.workDir, { at, space, parent }), {
    lock: lockContextFor(workspace, opts.publisherOptions ?? {}),
  });

  // (1) The FACT — the engine's own guarded renumber.
  const result = await reindexForInsert(workspace.workDir, { at, space, parent });
  if (!Array.isArray(result.remap) || result.remap.length === 0) {
    return { ...result, eventId: null, effects: [] };
  }

  // (2) The EVENT — past tense, carrying the remap as its own evidence. It also
  // carries the workspace's RESOLVED id (m42 wave (d) leg d5): the control-facts
  // remap may be applied on a machine where workspaceRoot names a checkout that
  // does not exist (a worker-side insert arriving over the d3 bridge), so the id
  // must ride the payload rather than be re-derived from a path.
  const payload = {
    workspaceRoot: workspace.projectRoot ?? null,
    workspaceId: resolveWorkspaceId(workspace) ?? null,
    at: result.at,
    space: result.space,
    parent: result.parent,
    shifted: result.shifted,
    remap: result.remap,
  };
  // Append-time applicability (m42 wave (d) leg d4, port 4): the seam owes only
  // what can apply — here the mesh predicate on the control-facts remap.
  return { ...result, ...(await raiseStreamEvent("stream.reindexed", payload, { workspace, publisherOptions, journalOptions, drain, now: opts.now })) };
}

// raiseStreamEvent(name, payload, { workspace, publisherOptions, journalOptions, drain, now }) —
// the ONE tail every stream event shares, so the two transitions above and below differ only in
// their lock, their fact and their payload: applicability is evaluated once at append time, the
// journal is opened (its health never gating the cascade — a journal that fails to open degrades
// to the ephemeral run, the d2 rule), the event is appended with `source: "stream-transition"`,
// and the reactors are drained when asked. Returns `{ eventId, effects }`.
async function raiseStreamEvent(name, payload, { workspace, publisherOptions = null, journalOptions = {}, drain = true, now } = {}) {
  const reactorCtx = {
    ...(publisherOptions ? { publisherOptions } : {}),
    workspace,
  };
  const reactors = await applicableReactors(name, payload, reactorCtx);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    // The ledger's own health never gates the cascade (the d2 rule).
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    const effects = drain ? await runEffectsEphemeral(name, payload, { reactors, ctx: reactorCtx }) : [];
    return { eventId: null, effects };
  }

  try {
    const { eventId } = appendEvent(journal, { name, payload, source: "stream-transition", now }, reactors);
    const effects = drain ? await drainEffects({ journal, eventId, now, ctx: reactorCtx }) : [];
    return { eventId, effects };
  } finally {
    journal.close();
  }
}

// transitionStreamArchived(workspace, { names }, opts) — move the named done drivers under
// `archive/` and raise the cascade (milestone 127 / ADR-004 §3-§4, story 03 task 03).
//
//   workspace — the loaded workspace (its workDir is moved within; its projectRoot is what the
//               publish reactor rebuilds from)
//   names     — the FOLDER NAMES at the stream root to move (`12_milestone_theta`); the face has
//               already decided each is a done, un-archived, top-level driver — the engine's own
//               coded refusals (archive-destination-exists / archive-source-missing /
//               archive-rewrite-failed) propagate untouched
//   opts      — { publisherOptions, journalOptions, drain = true }
//
// The same shape as the insert cascade above, with LESS in it: no ref changes, so nothing is
// remapped, and the whole cascade is the publish (ADR-004 §4 — "publish, don't renumber"):
//   (0) THE LOCK — every ref that moves (each driver and each of its stories) must be free; a
//       held ref refuses with the lock's own code naming the holder, before any rename;
//   (1) THE FACT — `archiveItems`: the renames, then the one link-rewrite pass;
//   (2) THE EVENT — `stream.archived`, past tense, carrying what moved and what was rewritten
//       as its own evidence. The journal's health never gates the move (the d2 rule): a journal
//       that fails to open degrades to the ephemeral run, and the fact stands.
//
// Returns the engine's `{ archived, rewritten }` plus `eventId` and the per-reactor `effects`.
// A run that moved nothing (an empty `names`) raises NO event — a ledger entry claiming a move
// that did not happen would be a lie the crash-recovery drain would faithfully repeat.
export async function transitionStreamArchived(workspace, { names = [] } = {}, opts = {}) {
  const { publisherOptions = null, journalOptions = {}, drain = true } = opts;

  // (0) THE LOCK — in front of the fact, so a refused archive renames not one folder. The
  // guarded set is the engine's OWN selection (refsMovedByArchive), never a second derivation.
  await guardItemLock(await refsMovedByArchive(workspace.workDir, { names }), {
    lock: lockContextFor(workspace, opts.publisherOptions ?? {}),
  });

  // (1) The FACT — the engine's renames and rewrite.
  const result = await archiveItems(workspace.workDir, { names });
  const { archived: moved, rewritten } = result;
  if (!Array.isArray(moved) || moved.length === 0) {
    return { ...result, eventId: null, effects: [] };
  }

  // (2) The EVENT — past tense. `archived` carries `{ ref, name, from, to }` per moved driver
  // (the publish reactor takes authorship of exactly those refs and their stories); `rewritten`
  // is the engine's own list, byte-equal to the envelope's.
  const payload = {
    workspaceRoot: workspace.projectRoot ?? null,
    workspaceId: resolveWorkspaceId(workspace) ?? null,
    archived: moved.map(({ ref, name, from, to }) => ({ ref, name, from, to })),
    rewritten,
  };
  return { ...result, ...(await raiseStreamEvent("stream.archived", payload, { workspace, publisherOptions, journalOptions, drain, now: opts.now })) };
}
