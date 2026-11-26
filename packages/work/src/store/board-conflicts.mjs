import { randomUUID } from "node:crypto";
import { commandError } from "@aof/contracts/error";
import { localBoardItems } from "./board-links.mjs";
import { desiredBoardValues, matchesTracked } from "./board-publication.mjs";

// A conflict is a durable latch on the link entry, distinct from `pending` (AOF's own write in
// flight) and `acknowledged` (the values AOF last verified). Only a verified resync clears it.

export const BOARD_POLL_INTERVAL_MS = 5_000;

function topRef(ref) {
  return String(ref).split("/")[0].replace(/^0+(?=\d)/, "");
}

export function conflictError(entry) {
  const { revision, deleted } = entry.conflict;
  const what = deleted
    ? `Board item ${entry.id} linked to ${entry.ref} was deleted on the board. Restore it from the recycle bin, then run "aof work resync-board ${entry.ref}".`
    : `Board item ${entry.id} linked to ${entry.ref} was changed on the board at revision ${revision}. Run "aof work resync-board ${entry.ref}" to restore AOF's tracked values.`;
  const error = commandError(what, "work-board-conflict", 409);
  error.detail = { ref: entry.ref, id: entry.id, revision, deleted: deleted === true, resync: `aof work resync-board ${entry.ref}` };
  return error;
}

// Every recorded conflict, or with `within` only those a workflow scoped to that ref must stop for:
// a conflict anywhere under the same top-level ref (209/03 Q2).
export function listConflicts(state, { within } = {}) {
  return Object.values(state.links)
    .filter(entry => entry.conflict != null && (within == null || topRef(entry.ref) === topRef(within)))
    .map(entry => ({ ref: entry.ref, id: entry.id, revision: entry.conflict.revision, deleted: entry.conflict.deleted === true }));
}

function latch(entry, revision, deleted = false) {
  if (entry.conflict && entry.conflict.deleted === deleted && entry.conflict.revision >= revision) return false;
  entry.conflict = { revision, deleted, observedAt: new Date().toISOString() };
  return true;
}

// Classify one linked entry against what the board now holds. `observed` is the mapped item, or
// null when the board authoritatively no longer has it.
export function classifyObserved(entry, observed) {
  if (observed == null) return latch(entry, entry.conflict?.revision ?? entry.revision, true);
  if (observed.revision == null || observed.revision <= entry.revision) return false;
  // AOF's own write can be observed before its response arrives; reconcile acknowledges it.
  if (entry.pending && matchesTracked(observed, entry.pending.desired)) return false;
  if (entry.conflict == null && matchesTracked(observed, entry.acknowledged)) {
    entry.revision = observed.revision;
    return true;
  }
  return latch(entry, observed.revision);
}

async function readLinked(board, ids) {
  if (ids.length === 0) return new Map();
  const reply = await board.readItems({ ids });
  if (reply.authoritative === false || reply.fault) {
    throw commandError("Board readback is unavailable.", "work-board-readback", 409);
  }
  return new Map(reply.items.map(item => [item.id, item]));
}

// One poll. The feed is read before linked items are compared, so a change landing between the two
// is either seen by the comparison or after the saved position. The position is saved last: a poll
// that stops early is repeated from the earlier position.
//
// The board is read OUTSIDE the journal's write claim, which refuses a second claimant at once:
// held across these reads, a poll would refuse an operator's status change several times a minute.
// The claim is taken only to classify against the journal as it then stands, so a write AOF
// acknowledged meanwhile is never mistaken for a teammate's edit.
export async function pollBoardChanges({ board, links }) {
  const seen = await links.read();
  const cursor = seen.feed?.cursor ?? null;
  let reply = await board.readChanges(cursor == null ? {} : { cursor });
  let compareAll = cursor == null;
  if (reply.coverage === false) {
    reply = await board.readChanges({});
    compareAll = true;
  }
  const changed = new Map();
  for (const change of reply.changes ?? []) {
    const previous = changed.get(change.id);
    changed.set(change.id, { deleted: change.deleted === true || previous?.deleted === true });
  }
  const linked = Object.values(seen.links).filter(entry => entry.id != null && entry.acknowledged);
  const subjects = new Set((compareAll ? linked : linked.filter(entry => changed.has(entry.id))).map(entry => entry.key));
  const observed = await readLinked(board, linked.filter(entry => subjects.has(entry.key)).map(entry => entry.id));
  return links.claim(async (state, save) => {
    // Another poll advanced the position first; its observations stand and this one is dropped.
    if ((state.feed?.cursor ?? null) !== cursor) return { cursor: state.feed?.cursor ?? null, conflicts: listConflicts(state) };
    let dirty = false;
    for (const entry of Object.values(state.links)) {
      if (!subjects.has(entry.key) || entry.id == null || !entry.acknowledged) continue;
      const current = changed.get(entry.id)?.deleted ? null : observed.get(entry.id) ?? null;
      if (classifyObserved(entry, current)) dirty = true;
    }
    if (dirty) await save();
    state.feed = { cursor: reply.cursor ?? cursor };
    await save();
    return { cursor: state.feed.cursor, conflicts: listConflicts(state) };
  });
}

function sameValues(observed, desired) {
  return observed != null && observed.revision != null && matchesTracked(observed, desired);
}

export async function resyncBoardItem({ workspace, board, file, links }, { ref }) {
  return links.claim(async (state, save) => {
    const local = await file.snapshot();
    const linkedItems = await localBoardItems(workspace.workDir, local, state.links);
    const found = [...linkedItems].find(([, item]) => item.ref === ref);
    if (!found) {
      if (local.items.some(item => item.ref === ref)) return { ref, resynced: false, reason: "not-linked" };
      throw commandError(`No work item matches ${ref}.`, "ref-not-found", 404);
    }
    const [key, item] = found;
    const entry = state.links[key];
    if (entry.conflict == null) return { ref, id: entry.id, resynced: false, reason: "no-conflict" };
    const desired = await desiredBoardValues(item, local, state.links);
    const [before] = (await board.readItems({ ids: [entry.id] })).items.filter(row => row.id === entry.id);
    if (before == null) {
      latch(entry, entry.conflict.revision, true);
      await save();
      throw conflictError(entry);
    }
    const operationKey = randomUUID();
    let reply;
    try {
      reply = await board.applyChanges({ changes: [{
        ...desired, key: operationKey, correlationKey: entry.key, id: entry.id, expectedRevision: before.revision,
      }] });
    } catch {
      reply = null;
    }
    const write = reply?.results?.find(result => result.key === operationKey);
    const [after] = (await board.readItems({ ids: [entry.id] })).items.filter(row => row.id === entry.id);
    const verified = write?.outcome === "applied"
      ? sameValues(after, desired) && after.revision === write.revision
      : write == null && sameValues(after, desired) && after.revision > before.revision;
    if (!verified) {
      if (after == null) latch(entry, entry.conflict.revision, true);
      else latch(entry, Math.max(after.revision, entry.conflict.revision));
      await save();
      throw conflictError(entry);
    }
    Object.assign(entry, { id: after.id, revision: after.revision, acknowledged: desired, desired, pending: null, conflict: null });
    await save();
    return { ref, id: entry.id, revision: entry.revision, resynced: true };
  });
}
