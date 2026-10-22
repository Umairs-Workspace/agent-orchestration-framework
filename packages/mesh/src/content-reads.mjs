import { canonicalArtifactDocKey } from "@aof/work/artifacts";

// src/content-reads.mjs — the READS over the streamed content tables (`work_item_docs`,
// `work_item_runs`), moved out of projection-store.mjs at 167/06 and called from it.
//
// WHY A MODULE OF ITS OWN. projection-store.mjs is the declared single writer of the fact tables
// and a 17-dependent fan-in node, held under a 1,280-line ratchet (43/ADR-012 B4) whose stated
// escape is "put the next block in its own module and call it from here". 167/ADR-008 added the
// presence tick's running-row read to this family, which took the store over the line; the reads
// are the block with no writer in it, so they are the block that moves. The store factory still
// returns every one of them, so no importer changed: cache-read.mjs, the control stream server and
// the logs command reach them exactly as before.
//
// Every read here is over a handle the caller opened and owns. None writes.
export function createContentReads({ reportDegrade }) {
  // readWorkItemDoc(store, workspaceId, ref, doc) — the board-face read over
  // work_item_docs. Null when nothing was ever streamed for that (ref, doc).
  function readWorkItemDoc(store, workspaceId, ref, doc) {
    const key = canonicalArtifactDocKey(doc);
    const row = store.db.prepare(
      "SELECT body, node_id, updated_at FROM work_item_docs WHERE workspace_id = ? AND ref = ? AND doc = ?"
    ).get(workspaceId, ref, key);
    return row == null ? null : { ref, doc: key, body: row.body, nodeId: row.node_id, updatedAt: row.updated_at };
  }

  // readWorkItemDocMembers(store, workspaceId, ref, name) — the dir-kind read: every
  // streamed member of one manifest entry for one ref (`TASKS/*`), oldest key first.
  // The prefix is anchored with `/` so a file-kind name can never be matched by it.
  function readWorkItemDocMembers(store, workspaceId, ref, name) {
    const prefix = `${canonicalArtifactDocKey(name)}/`;
    return store.db.prepare(
      "SELECT doc, body, node_id, updated_at FROM work_item_docs WHERE workspace_id = ? AND ref = ? AND doc LIKE ? ESCAPE '\\' ORDER BY doc"
    ).all(workspaceId, ref, `${prefix.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`)
      .map((row) => ({ doc: row.doc, body: row.body, nodeId: row.node_id, updatedAt: row.updated_at }));
  }

  // readWorkItemRuns(store, workspaceId, ref) — the board-face read over
  // work_item_runs. Empty array when nothing was ever streamed; a torn record_json
  // row is skipped (the run-store torn-file discipline, carried over).
  function readWorkItemRuns(store, workspaceId, ref) {
    const rows = store.db.prepare(
      "SELECT run_id, record_json, node_id, updated_at FROM work_item_runs WHERE workspace_id = ? AND ref = ? ORDER BY updated_at, run_id"
    ).all(workspaceId, ref);
    const out = [];
    for (const row of rows) {
      try {
        out.push({ record: JSON.parse(row.record_json), nodeId: row.node_id, updatedAt: row.updated_at });
      } catch (error) {
        // Torn/garbage record_json: skip the one bad row, keep the rest — the same
        // tolerance run-store's readRuns applies to a torn file on disk.
        reportDegrade("global-work-store", error); }
    }
    return out;
  }

  // readNodeRunningRuns(store, nodeId, workspaceIds) — the presence tick's read (167/ADR-008):
  // every row `nodeId` reported for the given workspaces whose record reads `running`, in ONE
  // query over the handle the tick already holds. The filter runs in SQL (json_extract over the
  // record), so the tick's cost is the number of running runs, never the number of items or the
  // length of the run history. A row another node reported is not this node's run and is not
  // returned; a torn record_json row is skipped, as readWorkItemRuns skips it.
  function readNodeRunningRuns(store, nodeId, workspaceIds = []) {
    const wanted = (Array.isArray(workspaceIds) ? workspaceIds : []).filter((id) => typeof id === "string" && id.length > 0);
    if (typeof nodeId !== "string" || nodeId.length === 0 || wanted.length === 0) return [];
    const rows = store.db.prepare(
      `SELECT workspace_id, ref, run_id, record_json, node_id, updated_at FROM work_item_runs
       WHERE node_id = ? AND json_extract(record_json, '$.state') = 'running'
         AND workspace_id IN (${wanted.map(() => "?").join(", ")})
       ORDER BY workspace_id, ref, run_id`,
    ).all(nodeId, ...wanted);
    const out = [];
    for (const row of rows) {
      try {
        out.push({ workspaceId: row.workspace_id, ref: row.ref, runId: row.run_id, record: JSON.parse(row.record_json), nodeId: row.node_id, updatedAt: row.updated_at });
      } catch (error) {
        reportDegrade("global-work-store", error); }
    }
    return out;
  }

  return { readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, readNodeRunningRuns };
}
