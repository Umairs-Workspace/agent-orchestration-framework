import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { itemRowFault, archivedColumn, rowLocationKeys, wireLocationKeys } from "@aof/work/item-row";
import { executionScopeRef } from "./assignment-record.mjs";
import { canonicalArtifactDocKey } from "@aof/work/artifacts";
import { createContentReads } from "./content-reads.mjs";
import { rowFingerprint, locallyChanged, normalizeSourcePath, projectedRow } from "@aof/work/local-change";
import { processCostMeter } from "@aof/foundation/cost-meter";
import os from "node:os";
export { WORK_ITEM_DOC_FILES } from "@aof/work/artifacts";
export { REQUIRED_ITEM_FIELDS, OPTIONAL_ITEM_FIELDS, itemRowFault, isCompleteItemRow } from "@aof/work/item-row";
export const GLOBAL_WORK_SCHEMA_VERSION = 11;
// The observation row that holds a workspace's stat digest rather than a ref's fingerprint.
export const WORKSPACE_DIGEST_REF = "*";
export const UPSERT_AUTHORITIES = Object.freeze(["reported", "disk-derived"]);
export const NODE_LOG_KEEP = 500;

// Application policy enters explicitly; constructing the service opens no stores or timers.
export function createGlobalWorkProjectionStore({ importSqliteRuntime, globalMeshPaths, readStreamSnapshot, recordDoc, workspaceIdFromPath, resolveWorkspaceId, reportDegrade, tableClass, refRemapTables, deriveNodeId, toWireProvenance }) {
// Provenance of what this module reads rather than spells (the full history is in git): the
// cache row's shape, screen and location widening come from `@aof/work/item-row` (127/04); the
// artifact manifest from `@aof/work/artifacts` (43/ADR-007, re-exported above so the streamed set
// and the requestable set stay one set); the workspace id from `workspace-identity.mjs` (new
// callers use resolveWorkspaceId, never a hand-spelled fallback); the store classification from
// `store-metadata.mjs`, which the wholesale-delete guard and the ref-remap tables both read (m42
// d5); the execution-scope rule from `assignment-record.mjs` (43/ADR-003); the node id from
// `node-identity.mjs` in its in-memory mode (43/ADR-004); the storage→wire provenance mapping
// from its one home (43/ADR-006); and "changed since observed" from `@aof/work/local-change`
// (164/ADR-002). Every former silent catch reports a coded degrade event (m42 item 3).
//
// ADR-011/A1: this module reads NO `global_assignments` state. The lock's answer arrives AS DATA
// (`options.heldScopes`) from the caller that knows whose slice is being written — the
// disk-derived publisher and the two frame doors, which read the leaf themselves.

function globalStoreError(message, code, status = 500, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  Object.assign(error, extra);
  return error;
}

const workspaceIdFor = workspaceIdFromPath;

// wholesaleDelete(db, table, workspaceId) — the ONLY sanctioned way this module
// sweeps a workspace's rows from a table (m42 wave (d) leg d5). A wholesale
// DELETE is a projection-rebuild move: on a fact table it would destroy
// unrecoverable dispatch/streamed state (the exact accident the old "MUST NEVER
// touch" comments warned about), so a misclassified call throws BEFORE the
// statement runs — schema-level gating, not prose.
//
// EXPORTED (m43 / ADR-004): after the authority cut this guard has no `work_items`
// caller at all, so "the sweep is refused" would be provable only by reading source.
// It is the door a projection rebuild goes through, and it is now callable BY that
// name from outside — which makes the refusal an outsider-visible coded error rather
// than an absence. Exporting it widens nothing: the class gate is inside it, so a
// caller reaching for a fact table gets `fact-table-wholesale-delete` and no
// statement runs.
function wholesaleDelete(db, table, workspaceId) {
  const cls = tableClass(table);
  if (cls !== "projection") {
    throw globalStoreError(
      `Refusing wholesale delete of ${table} — classified "${cls}" (only projection tables are rebuilt by sweep).`,
      "fact-table-wholesale-delete",
      500,
    );
  }
  db.prepare(`DELETE FROM ${table} WHERE workspace_id = ?`).run(workspaceId);
}

// applyConcurrencyPragmas(db) — m42, the measured `database is locked` residual: several
// processes open this store at once (desktop poll, board, daemon ticks, every CLI). WAL stops
// readers and the writer blocking each other (persistent in the header; the mesh root is always
// local, WAL's one requirement); busy_timeout waits 2s on the residual two-writer case instead
// of throwing, as the effects journal always has. A per-store tuning, deliberately not shared.
function applyConcurrencyPragmas(db) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 2000");
}

async function openGlobalWorkProjectionStore(options = {}) {
  const paths = options.paths ?? globalMeshPaths(options);
  const sqlite = await resolveSqlite(options);

  await mkdir(paths.workRoot, { recursive: true });
  const db = new sqlite.DatabaseSync(paths.databasePath);
  try {
    applyConcurrencyPragmas(db);
    const existing = readSchemaVersion(db);
    if (existing != null && existing > GLOBAL_WORK_SCHEMA_VERSION) {
      throw globalStoreError(
        `Global work projection schema ${existing} is newer than this AOF build supports (${GLOBAL_WORK_SCHEMA_VERSION}) at ${paths.databasePath}.`,
        "global-store-schema-unsupported",
        409,
        { path: paths.databasePath, schemaVersion: existing },
      );
    }

    // A current schema is only read (160/ADR-013 §3): migrating it again took a write lock, ran every
    // every idempotent table creation again and rewrote the version row on each open, and left the close a WAL checkpoint.
    if (existing !== GLOBAL_WORK_SCHEMA_VERSION) migrateSchema(db, existing);
    return {
      db,
      paths,
      schemaVersion: GLOBAL_WORK_SCHEMA_VERSION,
      close: () => db.close(),
      publishWorkspaceSnapshot: (workspace, publishOptions = {}) => publishWorkspaceSnapshot({ db, paths }, workspace, publishOptions),
      query: (queryOptions = {}) => queryGlobalWorkProjection({ db, paths }, queryOptions),
    };
  } catch (error) {
    try {
      db.close();
    } catch (error) {
      // Closing a failed open is best-effort; the original error is the contract.
      reportDegrade("global-work-store", error); }
    throw error;
  }
}

async function resolveSqlite(options) {
  if (options.sqlite === false) {
    throw globalStoreError(
      "The global work projection requires a supported SQLite runtime.",
      "sqlite-unavailable",
      501,
    );
  }
  if (options.sqlite) return options.sqlite;
  try {
    // The ONE runtime-import home (126/ADR-008 §1-§2) — it filters the SQLite warning and
    // restores `emitWarning` in a `finally`. Every decision below stays this body's own.
    const sqlite = await importSqliteRuntime(options);
    if (typeof sqlite.DatabaseSync !== "function") throw new Error("DatabaseSync unavailable");
    return sqlite;
  } catch {
    throw globalStoreError(
      "The global work projection requires a supported SQLite runtime.",
      "sqlite-unavailable",
      501,
    );
  }
}

function readSchemaVersion(db) {
  const hasSchema = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'aof_schema'").get();
  if (!hasSchema) return null;
  const row = db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get();
  if (row == null) return 0;
  const version = Number.parseInt(String(row.value), 10);
  return Number.isFinite(version) ? version : 0;
}

function migrateSchema(db, existingVersion) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS aof_schema (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        workspace_id TEXT PRIMARY KEY,
        project_root TEXT NOT NULL,
        work_dir TEXT NOT NULL,
        name TEXT,
        last_published_at TEXT
      );
      -- schema v8 (m43 / ADR-004 + ADR-006, placed here by ADR-010/D2): the
      -- PROVENANCE columns. node_id is the node that actually reported this row — the
      -- column authority is decided by (a node may retract only what it authored) and
      -- the column the 43/04 mapper will render as the wire's reportedBy; updated_at is
      -- when that node last reported it (the wire's syncedAt). Same names, same shape
      -- and same nullability as work_item_docs/work_item_runs already carry, because
      -- this table is now the same KIND of thing they are.
      CREATE TABLE IF NOT EXISTS work_items (
        workspace_id TEXT NOT NULL,
        ref TEXT NOT NULL,
        type TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT,
        title TEXT,
        parent TEXT,
        source_path TEXT NOT NULL,
        node_id TEXT,
        updated_at TEXT,
        backlog TEXT,
        archived INTEGER,
        PRIMARY KEY (workspace_id, ref)
      );
      CREATE INDEX IF NOT EXISTS idx_work_items_workspace ON work_items(workspace_id);
      CREATE TABLE IF NOT EXISTS projection_metadata (
        workspace_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        updated_at TEXT,
        PRIMARY KEY (workspace_id, key)
      );
      CREATE TABLE IF NOT EXISTS projection_errors (
        workspace_id TEXT NOT NULL,
        source_path TEXT NOT NULL,
        message TEXT NOT NULL,
        code TEXT,
        occurred_at TEXT,
        PRIMARY KEY (workspace_id, source_path)
      );
      CREATE TABLE IF NOT EXISTS global_nodes (
        node_id TEXT PRIMARY KEY,
        role TEXT,
        control_node INTEGER NOT NULL DEFAULT 0,
        host TEXT,
        os TEXT,
        runtimes_json TEXT NOT NULL DEFAULT '[]',
        skills_json TEXT NOT NULL DEFAULT '[]',
        aof_version TEXT,
        published_at TEXT,
        last_seen_at TEXT,
        fabric_address TEXT,
        fabric_online INTEGER,
        record_source TEXT,
        descriptor_path TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS global_workspace_descriptors (
        workspace_id TEXT PRIMARY KEY,
        project_root TEXT NOT NULL,
        work_dir TEXT NOT NULL,
        name TEXT,
        mesh_enabled INTEGER NOT NULL DEFAULT 0,
        control_node TEXT,
        member_node_ids_json TEXT NOT NULL DEFAULT '[]',
        published_at TEXT,
        descriptor_path TEXT NOT NULL,
        clone_url TEXT
      );
      CREATE TABLE IF NOT EXISTS global_node_workspaces (
        node_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        PRIMARY KEY (node_id, workspace_id)
      );
      CREATE INDEX IF NOT EXISTS idx_global_node_workspaces_workspace ON global_node_workspaces(workspace_id);
      -- schema v3 (milestone 35 / story 00, ADR-001) — the assignment record is
      -- operator/worker-CREATED state, never a projection of any doc, so it is a
      -- NEW, ADDITIVE table that publishWorkspaceSnapshot (below) MUST NEVER touch —
      -- the DELETE-ALL-then-reinsert cycle it ran until m43/ADR-004 would have wiped a
      -- dispatch fact on the very next converge tick. (That sweep is gone now, for
      -- work_items too; the rule it taught stands, and the class registry enforces it.)
      -- Keyed by assignment_id (PRIMARY KEY); dedicated single-row
      -- writers (insertAssignment/updateAssignmentState, assignment-record.mjs) are the
      -- ONLY mutators. (mining prior-lesson R2/m20: the state column's SOLE producer
      -- per value is enforced by assignment-record.mjs's single source-of-truth enum,
      -- not by this schema — a frozen+classified column with no named writer is a
      -- contract hole; ADR-001 closes it at the enum, this table just carries it.)
      CREATE TABLE IF NOT EXISTS global_assignments (
        assignment_id TEXT PRIMARY KEY,
        item_ref TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        issuer TEXT NOT NULL,
        state TEXT NOT NULL,
        run_id TEXT,
        assigned_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        reclaimed_at TEXT,
        session_id TEXT,
        code TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_global_assignments_item ON global_assignments(workspace_id, item_ref);
      -- schema v5 (TECH_DEBT item 6 — finish the board bridge). Worker-STREAMED
      -- record-doc bodies + run records for items whose truth lives on another
      -- machine's worktree: the board's drill-downs (doc body, RUNS tab) read
      -- these when the ref does not resolve on the local disk, riding the SAME
      -- projection file the item rows already ride — never a git branch, never a
      -- new inter-process route. Like global_assignments, these are STREAM-written
      -- state no publish may sweep; applyWorktreeContentFrame's upsert is the only
      -- writer. (m43/ADR-004: the row publisher no longer deletes-then-reinserts
      -- anything — work_items joined these tables as a fact rather than the other way
      -- round — and only the named workspace-removal path clears them.)
      CREATE TABLE IF NOT EXISTS work_item_docs (
        workspace_id TEXT NOT NULL,
        ref TEXT NOT NULL,
        doc TEXT NOT NULL,
        body TEXT NOT NULL,
        node_id TEXT,
        updated_at TEXT,
        PRIMARY KEY (workspace_id, ref, doc)
      );
      CREATE TABLE IF NOT EXISTS work_item_runs (
        workspace_id TEXT NOT NULL,
        ref TEXT NOT NULL,
        run_id TEXT NOT NULL,
        record_json TEXT NOT NULL,
        node_id TEXT,
        updated_at TEXT,
        PRIMARY KEY (workspace_id, ref, run_id)
      );
      CREATE INDEX IF NOT EXISTS idx_work_item_runs_ref ON work_item_runs(workspace_id, ref);
      -- schema v6 (m42 wave (a) follow-up, TECH_DEBT item 2's REMOTE read): a
      -- worker's log events stream up its existing connection and land here, so
      -- \`aof mesh logs --node <id>\` answers from the control's own store — no SSH,
      -- no request/reply round-trip. Ring-bounded by the applier (newest
      -- NODE_LOG_KEEP rows per node); stream-written, never touched by the row
      -- publisher (the global_assignments discipline).
      CREATE TABLE IF NOT EXISTS node_logs (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        at TEXT,
        level TEXT,
        code TEXT,
        message TEXT,
        path TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_node_logs_node ON node_logs(node_id, seq);
      -- schema v11 (164/ADR-002): what THIS node last observed of each ref on its own disk —
      -- the baseline "changed since observed" is asked against. Node-local bookkeeping, never
      -- truth: only a successful write advances it, and a lost table costs one re-baseline.
      -- The ref '*' row holds the workspace's stat digest, the gate before any row is hashed.
      CREATE TABLE IF NOT EXISTS work_item_observations (
        workspace_id TEXT NOT NULL,
        ref TEXT NOT NULL,
        node_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        observed_at TEXT,
        PRIMARY KEY (workspace_id, ref, node_id)
      );
    `);

    // schema v4 (milestone 38 / ADR-010 Gap A, extended) — CREATE TABLE IF NOT
    // EXISTS above never adds a column to an ALREADY-EXISTING table (every
    // pre-v4 database on a real machine already has global_workspace_descriptors
    // with no clone_url). An explicit, idempotent ALTER TABLE closes that: a
    // worker that has never checked out a workspace has no local config to read
    // config.mesh.repo.cloneUrl from — clone-on-miss was structurally unable to
    // resolve a clone source for any workspace but the worker's own launch one,
    // found live on the FIRST real cross-machine dispatch this mechanism ever ran.
    const hasCloneUrlColumn = db.prepare("PRAGMA table_info(global_workspace_descriptors)").all()
      .some((column) => column.name === "clone_url");
    if (!hasCloneUrlColumn) {
      db.exec("ALTER TABLE global_workspace_descriptors ADD COLUMN clone_url TEXT");
    }

    // milestone 38 / story 06 / task 04 (BLOCKER F-38.06c; ADR-013 + ADR-014
    // invariant 4) — the SAME idempotent, PRAGMA-checked ALTER TABLE idiom as
    // clone_url above, for the assignment record's `session_id`. ADR-013 says the
    // captured `session_id` is "surfaced on the assignment record"; it was being
    // dropped at the control node (the worker DOES send it on its
    // assignment-status frame), so the fleet had no (nodeId, sessionId) join key
    // to open a terminal-VIEW with. The column is the join key's home.
    //
    // Why an explicit ALTER and not just the CREATE TABLE column above: every
    // pre-v4-era database ALREADY on a real machine has a global_assignments
    // table, and `CREATE TABLE IF NOT EXISTS` never adds a column to an existing
    // table. The migration is IN PLACE — the table is never dropped, recreated,
    // or wiped, so a live fleet's dispatch history survives the upgrade (an
    // assignment row is operator/worker-CREATED state, unrecoverable if lost).
    const assignmentColumns = db.prepare("PRAGMA table_info(global_assignments)").all();
    const hasSessionIdColumn = assignmentColumns.some((column) => column.name === "session_id");
    if (!hasSessionIdColumn) {
      db.exec("ALTER TABLE global_assignments ADD COLUMN session_id TEXT");
    }
    // schema v7 (m42 interactive worker terminals) — the status-refinement `code`
    // a worker's assignment-status frame carries (today: `needs-input`), persisted
    // so the board/fleet can RENDER a session waiting on a human (the code used to
    // ride the frame and die there). Same in-place ALTER discipline as session_id.
    const hasCodeColumn = assignmentColumns.some((column) => column.name === "code");
    if (!hasCodeColumn) {
      db.exec("ALTER TABLE global_assignments ADD COLUMN code TEXT");
    }
    if (!assignmentColumns.some((column) => column.name === "ask")) db.exec("ALTER TABLE global_assignments ADD COLUMN ask TEXT"); // v10 (131/ADR-010 §3): a worker's ask, JSON
    // schema v8 (m43 / ADR-004 + ADR-006; OWNED BY 43/02 per ADR-010/D2 — the columns
    // are the shape this story's own upsert seam produces, so the retraction predicate
    // has something to read). The SAME in-place, PRAGMA-checked ALTER discipline as
    // clone_url/session_id/code above: every store already on a real machine has a
    // work_items table, and `CREATE TABLE IF NOT EXISTS` never adds a column to one.
    // The table is never dropped or wiped — a live fleet's cached rows survive the
    // upgrade carrying `node_id IS NULL`, which reads as "no recorded author" and is
    // therefore retractable by NOBODY (the migration residue task 02's last Examples
    // row pins) until its author reports it again.
    const workItemColumns = db.prepare("PRAGMA table_info(work_items)").all();
    if (!workItemColumns.some((column) => column.name === "node_id")) {
      db.exec("ALTER TABLE work_items ADD COLUMN node_id TEXT");
    }
    if (!workItemColumns.some((column) => column.name === "updated_at")) {
      db.exec("ALTER TABLE work_items ADD COLUMN updated_at TEXT");
    }
    // schema v9 (m127 / ADR-006 §1, story 04): the two LOCATION columns — `backlog` (a backlog
    // row's group path, `""` at the top) and `archived` (`1`, else NULL). The SAME in-place,
    // PRAGMA-checked ALTER as v8: the table is never dropped or wiped, and every pre-existing row
    // reads both as NULL — a live row, which is what every row was before the archive existed.
    if (!workItemColumns.some((column) => column.name === "backlog")) {
      db.exec("ALTER TABLE work_items ADD COLUMN backlog TEXT");
    }
    if (!workItemColumns.some((column) => column.name === "archived")) {
      db.exec("ALTER TABLE work_items ADD COLUMN archived INTEGER");
    }

    if (existingVersion != null && existingVersion < GLOBAL_WORK_SCHEMA_VERSION) {
      db.prepare(`
        INSERT OR REPLACE INTO projection_metadata (workspace_id, key, value, updated_at)
        VALUES ('_global', ?, ?, ?)
      `).run(`migration:${GLOBAL_WORK_SCHEMA_VERSION}`, String(existingVersion), new Date().toISOString());
    }

    db.prepare("INSERT OR REPLACE INTO aof_schema (key, value) VALUES ('version', ?)").run(GLOBAL_WORK_SCHEMA_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// The insert/reindex ref-remap, SPLIT BY LOCUS (m42 d5). The table lists derive from the store
// classification's `refRemap` rows: the streamed mirrors (`work_item_docs`/`work_item_runs`)
// rewrite at `local`; the dispatch facts (`global_assignments`/`global_item_branches`) at
// `control-store`, keyed by the payload's workspaceId. `work_items` (and its observations) is in
// NEITHER list: a renumber is re-REPORTED by each row's author, and a column remap would leave
// `parent`/`source_path` naming the old numbers. A remap is a PERMUTATION, applied in the engine's
// order (descending, so no update lands on a ref yet to be vacated) in ONE transaction and
// EVENT-ID DEDUPED, since applying it twice shifts every row again; the two halves stamp separate
// watermarks because they drain independently.
function remapRefKeyedTables(store, workspaceId, remap, tables, stampKey, { eventId = null, now } = {}) {
  if (!Array.isArray(remap) || remap.length === 0) return { remapped: 0, skipped: true, reason: "empty-remap" };
  const db = store.db;
  const stamp = now ?? new Date().toISOString();

  const applied = db
    .prepare("SELECT value FROM projection_metadata WHERE workspace_id = ? AND key = ?")
    .get(workspaceId, stampKey);
  if (eventId != null && applied?.value === eventId) {
    return { remapped: 0, skipped: true, reason: "already-applied" };
  }

  let remapped = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const present = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name),
    );
    for (const { table, column } of tables) {
      // The side tables are created lazily by their own feature module (the
      // self-contained `CREATE TABLE IF NOT EXISTS` idiom), so a store that has
      // never seen a branch/assignment simply has nothing to remap there.
      if (!present.has(table)) continue;
      const update = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE workspace_id = ? AND ${column} = ?`);
      for (const { from, to } of remap) {
        remapped += update.run(to, workspaceId, from).changes ?? 0;
      }
    }
    if (eventId != null) {
      db.prepare(`
        INSERT OR REPLACE INTO projection_metadata (workspace_id, key, value, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(workspaceId, stampKey, eventId, stamp);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { remapped };
}

// The local half: the streamed-mirror rows of this node's own file. Keeps the
// port-3 stamp key, so a store that already applied a pre-split remap does not
// re-apply its mirror half on redelivery after an upgrade.
function remapWorkspaceProjectionRefs(store, workspaceId, remap = [], options = {}) {
  return remapRefKeyedTables(store, workspaceId, remap, refRemapTables("local"), "lastReindexEventId", options);
}

// The control-store half: the dispatch facts of the authoritative mesh store.
function remapWorkspaceFactRefs(store, workspaceId, remap = [], options = {}) {
  return remapRefKeyedTables(store, workspaceId, remap, refRemapTables("control-store"), "lastReindexFactsEventId", options);
}

// ------------------------------------------------ THE SHARED UPSERT SEAM (ADR-004) --
//
// A row that cannot be stored is SKIPPED AND COUNTED rather than thrown — one bad row must never
// take the frame's other rows with it. The SCREEN (every value the statement binds, ADR-012/B5)
// lives in `@aof/work/item-row` and is re-exported above for every importer and the ratchet.
//
// The two AUTHORITIES a writer can have — "whose slice is being written" (ADR-011/A1; the lock
// gate runs FIRST for every writer, ADR-012/B1):
//   "reported"     — a worker reporting its OWN live slice: never filtered by who authored the
//                    cached row, since taking authorship IS what reporting means.
//   "disk-derived" — a node republishing its own DISK slice: authoritative ONLY over rows it
//                    authored and rows nobody has yet (ADR-010/D1), plus the refs an operator
//                    verb or a local change hands it (164/ADR-001).
// There is no default: either would silently re-open a measured regression, so a caller that
// does not say is refused.

// upsertWorkItems(store, workspaceId, rows, options) — THE row-level write seam for
// work_items, and the structural twin of upsertWorkItemContent below: per-(workspace_id,
// ref) upsert, stamping the WRITING node and the instant it reported, inside ONE
// transaction that no single bad row can abort. Both writers use it — the control's own
// publish with its own node id, a worker's frame with the CONNECTION-authenticated one.
//
//   nodeId            — the node this write is attributed to. REQUIRED: an unattributed
//                       row could never be retracted by anyone, nor protected by the
//                       lock (`missing-node-id`, the code applyLogEntriesFrame already
//                       answers a node-less frame with).
//   authority         — "reported" | "disk-derived" (above). REQUIRED.
//   syncedAt          — the provenance stamp (storage `updated_at`; the wire's
//                       `syncedAt`, mapped in 43/04). Defaults to now.
//   heldScopes        — Map<scopeRef, { holderNode, assignmentId, state }>, the ADR-003
//                       lock's answer supplied AS DATA by the caller that read it. The
//                       seam never queries `global_assignments` itself (ADR-011/A1).
//   authoritativeRefs — the full ref set this node claims to be authoritative for.
//                       ABSENT ⇒ this is a partial report and retracts NOTHING; present
//                       (even EMPTY) ⇒ rows THIS node authored and no longer claims are
//                       retracted. Absent-vs-empty is the boundary between "I am telling
//                       you about some items" and "I am telling you I have none".
//   operatorRefs      — the refs an OPERATOR verb just mutated on this node. That door
//                       TAKES authorship, and may retract those refs whoever authored them
//                       (ADR-010/D1) — a gate is where authorship changes hands.
//                       Deliberately a REF SET, not a flag: publish-on-mutate carries the
//                       whole workspace, and the operator touched one item.
//   localChangeRefs   — the refs whose own record changed since this node observed them
//                       (164/ADR-001): a local edit is an operator act that happens not to go
//                       through a verb, so it takes authorship exactly as `operatorRefs` does.
//                       The lock still wins. It does not widen retraction.
//   observe           — { fingerprints: Map<ref, fp>, digest? } (164/ADR-002). In THIS
//                       transaction, every ref written or stepped over as authored-elsewhere
//                       records its fingerprint; a held or failed ref records nothing, so its
//                       change stays owed. The digest is recorded only when no change is owed.
//
// Returns { workspaceId, upserted, retracted, syncedAt, skipped: [...] } where each skip
// names its ref, its execution scope, its reason and whoever the reason points at.
function upsertWorkItems(store, workspaceId, rows = [], options = {}) {
  const { nodeId, authority, syncedAt, heldScopes = new Map(), authoritativeRefs, operatorRefs, localChangeRefs, observe } = options;

  const reporter = typeof nodeId === "string" && nodeId.length > 0 ? nodeId : null;
  if (reporter == null) {
    throw globalStoreError(
      "Refusing to write a work_items row with no reporting node — an unattributed row can be retracted by nobody and protected by nothing.",
      "missing-node-id",
      400,
    );
  }
  if (!UPSERT_AUTHORITIES.includes(authority)) {
    throw globalStoreError(
      `upsertWorkItems needs an explicit authority (${UPSERT_AUTHORITIES.join(" | ")}) — "whose slice is being written" is the decision, and it has no safe default.`,
      "upsert-authority-unknown",
      500,
    );
  }
  const at = typeof syncedAt === "string" && syncedAt.length > 0 && Number.isFinite(Date.parse(syncedAt))
    ? syncedAt
    : new Date().toISOString();
  const operator = operatorRefs instanceof Set ? operatorRefs : new Set(operatorRefs ?? []);
  const localChange = new Set(localChangeRefs ?? []);
  const observed = new Set();
  const claimed = authoritativeRefs === undefined || authoritativeRefs === null
    ? null
    : new Set(authoritativeRefs);

  const db = store.db;
  const skipped = new Map();
  const skip = (ref, reason, detail = {}) => {
    if (skipped.has(ref)) return;
    skipped.set(ref, { ref, scopeRef: ref == null ? null : executionScopeRef(ref), reason, ...detail });
  };
  // heldBy(ref) — the node holding this ref's execution scope, or null when it is free
  // or held by the writer itself. ONE predicate, used by both the write and the
  // retraction: a ref a non-holder may not write is also one it may not delete.
  const heldBy = (ref) => {
    const holder = heldScopes instanceof Map ? heldScopes.get(executionScopeRef(ref)) : null;
    if (holder == null) return null;
    const holderNode = holder.holderNode ?? holder.targetNodeId ?? null;
    return holderNode === reporter ? null : holder;
  };

  let upserted = 0;
  let retracted = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const readRow = db.prepare("SELECT node_id, updated_at FROM work_items WHERE workspace_id = ? AND ref = ?");
    const upsert = db.prepare(`
      INSERT INTO work_items (workspace_id, ref, type, slug, status, title, parent, source_path, node_id, updated_at, backlog, archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, ref) DO UPDATE SET
        type = excluded.type,
        slug = excluded.slug,
        status = excluded.status,
        title = excluded.title,
        parent = excluded.parent,
        source_path = excluded.source_path,
        node_id = excluded.node_id,
        updated_at = excluded.updated_at,
        backlog = excluded.backlog,
        archived = excluded.archived
    `);

    for (const row of Array.isArray(rows) ? rows : []) {
      const fault = itemRowFault(row);
      if (fault != null) {
        // An unstorable entry still has to be COUNTED, and it may carry no usable ref
        // at all (a null, a non-object, a row with no `ref`) — so the skip is keyed by
        // whatever identity it does have and never collapses two bad entries into one.
        // It names the REF and the SOURCE PATH it came from, never a bind-parameter
        // index: the operator's remedy is to edit one record doc, and a number tells
        // them nothing about which.
        const ref = typeof row?.ref === "string" && row.ref.length > 0 ? row.ref : null;
        skipped.set(ref ?? `unstorable:${skipped.size}`, {
          ref,
          scopeRef: ref == null ? null : executionScopeRef(ref),
          reason: fault.reason,
          column: fault.column,
          ...(typeof row?.sourcePath === "string" && row.sourcePath.length > 0 ? { sourcePath: row.sourcePath } : {}),
        });
        continue;
      }

      // (1) THE LOCK, for every writer. While an assignment covers this ref's execution
      // scope, only its holder may write the ref — which is what stops the control's
      // tick republishing over a live phase AND what stops a second worker writing over
      // the holder. It is NOT what decides between a node and its own frames: a holder
      // writing its own scope passes straight through (heldBy returns null for itself),
      // which is the ADR-011/A1 regression stated as code.
      const holder = heldBy(row.ref);
      if (holder != null) {
        skip(row.ref, "held-by-assignment", {
          holderNode: holder.holderNode ?? holder.targetNodeId ?? null,
          assignmentId: holder.assignmentId ?? null,
          state: holder.state ?? null,
        });
        continue;
      }

      const existing = readRow.get(workspaceId, row.ref);

      // (2) AUTHORSHIP, for a disk-derived writer only. A node re-reading its own
      // checkout knows nothing about another node's work, so it may refresh rows it
      // authored and adopt rows nobody has authored yet — and it steps over the rest.
      // This is the cure for the permanent revert: after a worker settles and stops
      // ticking, the control's tick sees `node_id = <worker>` and skips FOREVER.
      if (authority === "disk-derived" && !operator.has(row.ref) && !localChange.has(row.ref)) {
        if (existing != null && existing.node_id != null && existing.node_id !== reporter) {
          skip(row.ref, "authored-elsewhere", { reportedBy: existing.node_id });
          observed.add(row.ref);
          continue;
        }
      }

      // (3) ORDERING WITHIN ONE AUTHOR — a node never moves its OWN row backwards in
      // time. Frames are re-sent on reconnect by construction, so a redelivered older
      // report is a real ordering, not a hypothetical one, and letting it land would
      // undo a completion the same node already reported.
      //
      // Deliberately scoped to the SAME author, and deliberately NOT a tiebreaker
      // between nodes (ADR-010/D1: `syncedAt` is provenance for display and staleness
      // only, never authority). Comparing two NODES' clocks would hand the outcome to
      // clock skew: a worker whose clock trails the control's would have its holder
      // frames silently rejected as stale, which is the ADR-011/A1 regression by
      // another route. Within one node there is one clock, so the comparison is sound.
      if (existing?.node_id === reporter && typeof existing.updated_at === "string" && existing.updated_at > at) {
        skip(row.ref, "stale-report", { reportedAt: existing.updated_at });
        continue;
      }

      // Every row-derived value below is screened above, and that COVERAGE is ratcheted
      // rather than remembered: `acd-work-items-single-writer` reads this statement's
      // bindings and fails if one of them is not in the screen's field lists. A defensive
      // try/catch here would absorb the symptom instead — and, measured, would hide the
      // screen's own absence from four of the five tests that exist to catch it.
      upsert.run(
        workspaceId,
        row.ref,
        row.type,
        row.slug,
        row.status ?? null,
        row.title ?? null,
        row.parent ?? null,
        row.sourcePath,
        reporter,
        at,
        // 127/04 — the two location columns, screened above like every other bound value:
        // `backlog` rides `OPTIONAL_ITEM_FIELDS`, `archived` is mapped `true → 1` (else NULL)
        // because SQLite refuses the boolean the row carries. Both are in the DO UPDATE SET, so
        // a re-report that drops the flag CLEARS it — a folder moved back out of the archive
        // reads live again on its next publish.
        row.backlog ?? null,
        archivedColumn(row),
      );
      upserted += 1;
      observed.add(row.ref);
    }

    // (3) AUTHOR RETRACTION — the ONLY deletion a publish can perform, and never a
    // sweep. The predicate is `node_id = <this node> AND ref NOT IN <claimed>`: a node
    // removes exactly the rows it authored and no longer claims. It can never reach
    // another node's row by AUTHORSHIP alone, and is never predicated on time (ADR-006's
    // settled never-evict rule — age deletes nothing, ever). A ref whose scope is held
    // by someone else is left alone for the same reason it is not written: it is not
    // this node's to touch. The one widening — the operator's own rewritten refs — is
    // named below and is bounded by the event that raised it.
    if (claimed != null) {
      // WHOSE rows this publish may retract: its own, plus any row sitting on a ref an
      // OPERATOR verb on this node just rewrote (ADR-010/D1's operator door, which "may
      // retract the ref regardless of `node_id`"). The second set is what makes a
      // RENUMBER honest: after `43/03 -> 43/04` the ref `43/03` means a different item,
      // so another node's row left there is not a stale copy of the right item — it is
      // WRONG DATA at a live ref, and only the node that rewrote the ref can know that.
      const retract = db.prepare("DELETE FROM work_items WHERE workspace_id = ? AND ref = ? AND node_id IS ?");
      const reachable = db.prepare("SELECT ref, node_id FROM work_items WHERE workspace_id = ?").all(workspaceId)
        .filter((row) => row.node_id === reporter || operator.has(row.ref));
      for (const { ref, node_id: author } of reachable) {
        if (claimed.has(ref)) continue;
        const holder = heldBy(ref);
        if (holder != null) {
          skip(ref, "held-by-assignment", {
            holderNode: holder.holderNode ?? holder.targetNodeId ?? null,
            assignmentId: holder.assignmentId ?? null,
            state: holder.state ?? null,
          });
          continue;
        }
        // Bound by the row's OWN recorded author, so the statement stays authorship-
        // scoped (`IS`, not `=`, so a pre-v8 NULL-authored row is reachable too); the
        // DECISION of whose rows may be reached is made above, in the open.
        retracted += retract.run(workspaceId, ref, author).changes ?? 0;
      }
    }

    if (observe?.fingerprints instanceof Map) {
      const record = db.prepare(`
        INSERT INTO work_item_observations (workspace_id, ref, node_id, fingerprint, observed_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, ref, node_id) DO UPDATE SET fingerprint = excluded.fingerprint, observed_at = excluded.observed_at
      `);
      for (const ref of observed) if (observe.fingerprints.has(ref)) record.run(workspaceId, ref, reporter, observe.fingerprints.get(ref), at);
      // A ref this complete claim no longer carries is no longer observed: its deletion was the change.
      const forget = db.prepare("DELETE FROM work_item_observations WHERE workspace_id = ? AND node_id = ? AND ref = ?");
      const known = db.prepare("SELECT ref FROM work_item_observations WHERE workspace_id = ? AND node_id = ?").all(workspaceId, reporter);
      if (claimed != null) for (const { ref } of known) if (ref !== WORKSPACE_DIGEST_REF && !claimed.has(ref)) forget.run(workspaceId, reporter, ref);
      const owed = [...localChange].some((ref) => !observed.has(ref));
      if (typeof observe.digest === "string" && !owed) record.run(workspaceId, WORKSPACE_DIGEST_REF, reporter, observe.digest, at);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { workspaceId, upserted, retracted, syncedAt: at, skipped: [...skipped.values()] };
}

// removeWorkspaceFromCache(store, workspaceId) — THE NAMED, OPERATOR-INITIATED removal
// path (ADR-004's consequence, this story's to name). It is the ONLY door that can forget
// a workspace: author retraction deliberately cannot reach rows another node authored, so
// nothing else clears a worker-authored row for a workspace being unregistered. A distinct
// call rather than a flag on the publish, so no periodic tick can ever reach it.
//
// It clears the whole CACHE footprint — rows, streamed bodies and run records (orphans
// otherwise), the two projections the publish maintains (through the class guard, the one
// spelling for a projection sweep) and its metadata. It deliberately does NOT touch the
// DISPATCH facts (assignments, branches, descriptors): forgetting a workspace's cache is
// not the same decision as erasing its dispatch history, and this door does not get to
// make that one silently.
function removeWorkspaceFromCache(store, workspaceId) {
  const db = store.db;
  const removed = { items: 0, docs: 0, runs: 0 };
  db.exec("BEGIN IMMEDIATE");
  try {
    removed.items = db.prepare("DELETE FROM work_items WHERE workspace_id = ?").run(workspaceId).changes ?? 0;
    removed.docs = db.prepare("DELETE FROM work_item_docs WHERE workspace_id = ?").run(workspaceId).changes ?? 0;
    removed.runs = db.prepare("DELETE FROM work_item_runs WHERE workspace_id = ?").run(workspaceId).changes ?? 0;
    wholesaleDelete(db, "projection_errors", workspaceId);
    wholesaleDelete(db, "workspaces", workspaceId);
    // …and its own bookkeeping (class `meta`, so the projection guard refuses it): a
    // forgotten workspace's `lastPublishedAt` and reindex watermarks would otherwise
    // outlive it under an id nothing will ever publish again.
    db.prepare("DELETE FROM projection_metadata WHERE workspace_id = ?").run(workspaceId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { workspaceId, ...removed, removed: removed.items + removed.docs + removed.runs };
}

// publishWorkspaceSnapshot(store, workspace, options) — a node publishing ITS OWN DISK
// SLICE into the cache: it reads this node's checkout, upserts the rows it is entitled to
// write through the seam above, retracts the rows it authored and no longer carries, and
// rebuilds the projection-error list (a projection of this read — the one thing here
// still swept and rebuilt).
//
// What it no longer does — the authority cut — is DELETE the workspace's work_items rows
// and re-INSERT its own disk slice over them. That sweep is why a worker's row reverted to
// the control's pre-run scaffold on a timer; it is now refused at the store gate
// (`work_items` is classified `fact`), so it cannot come back by accident.
//
//   nodeId       — this node's id; resolved from the workspace when absent.
//   heldScopes   — the ADR-003 lock's answer, supplied by the disk-derived caller that read
//                  it (`global-work-publisher.mjs`). Absent ⇒ nothing is held.
//   operatorRefs — the refs an operator verb just mutated (publish-on-mutate).
async function publishWorkspaceSnapshot(store, workspace, options = {}) {
  const db = store.db;
  const now = options.now ?? new Date().toISOString();
  const projectRoot = path.resolve(workspace.projectRoot);
  const workDir = path.resolve(workspace.workDir);
  const workspaceId = resolveWorkspaceId(workspace, { override: options.workspaceId });
  const nodeId = options.nodeId ?? await resolvePublishingNodeId(workspace);
  // review fix P2.10: readWorkspaceProjectionItems(workspace) takes ONE argument
  // (its own doc-comment: "signature UNCHANGED").
  const items = await readWorkspaceProjectionItems(workspace);

  // THE AUTHORITATIVE REF SET — what this node claims to carry, and the input to
  // retraction. The refs it READ plus the refs whose record doc it could NOT read: an
  // unparseable frontmatter is a read fault, never a statement that the item is gone, and
  // dropping it from the claim would delete the item from the mesh's only readable copy.
  // When the work stream itself could not be read (`authoritative: false`) the node claims
  // NOTHING — the whole difference between "I have no items" and "I could not look".
  const claimedRefs = items.rows.map((row) => row.ref)
    .concat(items.errors.map((error) => error.ref).filter((ref) => typeof ref === "string" && ref.length > 0));

  // 164/ADR-001 — every disk-derived publish (a verb's event, a sync mark, a daemon tick) asks
  // the one predicate which of its rows changed since this node observed them, so all of them
  // land a local change identically. `digest` is the stat digest the caller gated on, if any.
  const baseline = readObservations(store, workspaceId, nodeId);
  const fingerprints = new Map(items.rows.map((row) => [row.ref, rowFingerprint(row)]));
  const localChangeRefs = [...fingerprints].filter(([ref, fp]) => locallyChanged(fp, baseline.get(ref))).map(([ref]) => ref);
  const upsert = upsertWorkItems(store, workspaceId, items.rows, {
    nodeId,
    authority: "disk-derived",
    syncedAt: now,
    heldScopes: options.heldScopes,
    authoritativeRefs: items.authoritative ? claimedRefs : undefined,
    operatorRefs: options.operatorRefs,
    localChangeRefs,
    observe: { fingerprints, digest: items.authoritative ? options.digest : undefined },
  });

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO workspaces (workspace_id, project_root, work_dir, name, last_published_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET
        project_root = excluded.project_root,
        work_dir = excluded.work_dir,
        name = excluded.name,
        last_published_at = excluded.last_published_at
    `).run(workspaceId, projectRoot, workDir, workspace.config?.name ?? null, now);

    // projection_errors stays a REBUILT PROJECTION and keeps its sweep: it is derived
    // wholly from this one read, so a repaired record doc has to stop being reported —
    // a fact-shaped error list would linger forever after the fix.
    wholesaleDelete(db, "projection_errors", workspaceId);
    const insertError = db.prepare(`
      INSERT INTO projection_errors (workspace_id, source_path, message, code, occurred_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const error of items.errors) {
      insertError.run(workspaceId, error.sourcePath, error.message, error.code ?? null, now);
    }

    db.prepare(`
      INSERT OR REPLACE INTO projection_metadata (workspace_id, key, value, updated_at)
      VALUES (?, 'lastPublishedAt', ?, ?)
    `).run(workspaceId, now, now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  // The skips this tick made, at BOTH grains — one derivation, two renderings:
  //   skippedRefs — every ROW it did not write, each naming why and who (the holder, or
  //                 the node that authored the row it stepped over);
  //   heldRefs / heldSkipped — the EXECUTION SCOPES an active assignment held it out of.
  // `skipped` is untouched and still counts PROJECTION ERRORS: two different facts must
  // not share a counter (ADR-010/D1a).
  const heldRefs = [...new Set(
    upsert.skipped.filter((entry) => entry.reason === "held-by-assignment").map((entry) => entry.scopeRef),
  )].sort();

  return {
    workspaceId,
    nodeId,
    itemCount: items.rows.length,
    skipped: items.errors.length,
    heldSkipped: heldRefs.length,
    heldRefs,
    skippedRefs: upsert.skipped,
    upserted: upsert.upserted,
    retracted: upsert.retracted,
    localChangeRefs,
    // Whether this publish was a COMPLETE claim over the node's own slice. False means
    // the work stream could not be read at all, so nothing was retracted and the read
    // failure is reported rather than mistaken for an empty stream.
    authoritative: items.authoritative,
    publishedAt: now,
  };
}

// readObservations(store, workspaceId, nodeId) → Map<ref, fingerprint> — what `nodeId` last
// observed of the workspace (164/ADR-002); the stat digest sits under WORKSPACE_DIGEST_REF.
function readObservations(store, workspaceId, nodeId) {
  const rows = store.db.prepare("SELECT ref, fingerprint FROM work_item_observations WHERE workspace_id = ? AND node_id = ?").all(workspaceId, nodeId);
  return new Map(rows.map((row) => [row.ref, row.fingerprint]));
}

// readWorkspaceObservations(store, workspace) → { nodeId, observations } — the reader's half
// (164/ADR-005): WHO this node is, resolved exactly as its publishes stamp rows, and what it last
// observed, so "reported elsewhere" and "changed since observed" are asked of the same identity.
async function readWorkspaceObservations(store, workspace) {
  const nodeId = await resolvePublishingNodeId(workspace);
  return { nodeId, observations: readObservations(store, resolveWorkspaceId(workspace), nodeId) };
}

// readSyncState(store, nodeId) — each workspace's last successful sync on this node (164/03): the
// newest observation a successful write recorded, with the registered name and root when known.
function readSyncState(store, nodeId) {
  return store.db.prepare(`SELECT o.workspace_id AS workspaceId, MAX(o.observed_at) AS lastSyncedAt, d.name AS name, d.project_root AS projectRoot
    FROM work_item_observations o LEFT JOIN global_workspace_descriptors d ON d.workspace_id = o.workspace_id
    WHERE o.node_id = ? AND o.ref != ? GROUP BY o.workspace_id ORDER BY o.workspace_id`).all(nodeId, WORKSPACE_DIGEST_REF).map((row) => ({ ...row }));
}

// detectWorkspaceChanges(store, workspace, { digest }) — the sync pass's detect step (164/ADR-004).
// An equal stat digest answers "nothing moved" without reading a row. Otherwise the refs owed a
// publish are those changed since observed, never observed, or observed and now gone. A moved
// digest with nothing owed is recorded here, so the next pass is one stat walk again.
async function detectWorkspaceChanges(store, workspace, { digest = null, now } = {}) {
  const workspaceId = resolveWorkspaceId(workspace);
  const nodeId = await resolvePublishingNodeId(workspace);
  const baseline = readObservations(store, workspaceId, nodeId);
  if (digest != null && baseline.get(WORKSPACE_DIGEST_REF) === digest) return { workspaceId, nodeId, moved: false, owed: [] };
  const items = await readWorkspaceProjectionItems(workspace);
  const seen = new Set(items.rows.map((row) => row.ref));
  const owed = items.rows.filter((row) => !baseline.has(row.ref) || locallyChanged(rowFingerprint(row), baseline.get(row.ref))).map((row) => row.ref)
    .concat(items.authoritative ? [...baseline.keys()].filter((ref) => ref !== WORKSPACE_DIGEST_REF && !seen.has(ref)) : []);
  if (owed.length === 0 && items.authoritative && digest != null) {
    store.db.prepare(`
      INSERT INTO work_item_observations (workspace_id, ref, node_id, fingerprint, observed_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, ref, node_id) DO UPDATE SET fingerprint = excluded.fingerprint, observed_at = excluded.observed_at
    `).run(workspaceId, WORKSPACE_DIGEST_REF, nodeId, digest, now ?? new Date().toISOString());
  }
  return { workspaceId, nodeId, moved: true, owed };
}

// resolvePublishingNodeId(workspace) — WHO this node is when it publishes its own slice.
// The ONE derivation (node-identity.mjs) in its in-memory mode — a pinned
// `config.mesh.nodeId` wins verbatim, else the opaque node-<hash> (132) — never persisted from
// here, exactly as mesh-launcher's own resolveNodeIdentity reads it. It is stable across
// publishes, which is what author retraction depends on.
async function resolvePublishingNodeId(workspace) {
  return deriveNodeId({
    config: workspace?.config ?? {},
    hostname: os.hostname(),
    salt: workspace?.config?.mesh?.salt,
  });
}

function recordWorkspaceProjectionError(store, workspace, error, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const projectRoot = path.resolve(workspace.projectRoot);
  const workDir = path.resolve(workspace.workDir);
  const workspaceId = resolveWorkspaceId(workspace, { override: options.workspaceId });
  const sourcePath = normalizeSourcePath(options.sourcePath ?? workDir);

  store.db.prepare(`
    INSERT INTO workspaces (workspace_id, project_root, work_dir, name, last_published_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id) DO UPDATE SET
      project_root = excluded.project_root,
      work_dir = excluded.work_dir,
      name = excluded.name
  `).run(workspaceId, projectRoot, workDir, workspace.config?.name ?? null, now);

  store.db.prepare(`
    INSERT INTO projection_errors (workspace_id, source_path, message, code, occurred_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id, source_path) DO UPDATE SET
      message = excluded.message,
      code = excluded.code,
      occurred_at = excluded.occurred_at
  `).run(workspaceId, sourcePath, error?.message ?? "Projection write failed.", error?.code ?? "projection-write-failed", now);
}

// readWorkspaceProjectionItems(workspace) — THE OWN-DISK READ: one argument, the item-row shape
// a snapshot frame carries, sourced from the CALLER's disk (34/04; untouched by m43/ADR-004).
// Two keys tell "there is nothing" from "I could not look", which decides whether rows are
// DELETED: `authoritative` is false when the work stream itself could not be read (listItems
// answers a missing dir with an empty list, which would retract the whole slice), and
// `errors[].ref` names an item whose record doc failed, so a publish keeps claiming it.
async function readWorkspaceProjectionItems(workspace) {
  const rows = [];
  const errors = [];
  let authoritative = true;
  let items = [];
  let snapshot;
  try {
    // The stream-level probe listItems cannot make (the snapshot makes it): the enumerator swallows
    // every fault into an empty list, so the read asks the directory itself whether it is there.
    // 167/ADR-003 — through the remembered stream snapshot, so the tick's read of an unchanged tree
    // costs one stat walk and parses no record doc; the snapshot counts its parse or its memo answer.
    const workspaceId = resolveWorkspaceId(workspace) ?? null;
    snapshot = await readStreamSnapshot(workspace.workDir, { meter: processCostMeter, labels: workspaceId ? { workspaceId } : {}, reportDegrade });
    items = snapshot.items;
  } catch (error) {
    authoritative = false;
    errors.push({
      ref: null,
      sourcePath: normalizeSourcePath(workspace.workDir),
      message: `The work stream could not be read: ${error.message}`,
      code: error.code ?? "work-stream-unreadable",
    });
    return { rows, errors, authoritative };
  }
  for (const item of items) {
    const doc = recordDoc(item);
    if (!doc) continue;
    const sourcePath = normalizeSourcePath(path.join(item.dir, doc));
    const { meta, fault } = await snapshot.record(item);
    if (fault?.kind === "unparseable") {
      const error = globalStoreError(`Record doc has no parseable frontmatter: ${sourcePath}`, "frontmatter-unparseable", 422);
      errors.push({ ref: item.ref, sourcePath, message: error.message, code: error.code });
    } else if (fault != null) {
      errors.push({ ref: item.ref, sourcePath, message: fault.message, code: fault.code ?? "projection-read-failed" });
    } else {
      rows.push(projectedRow(item, meta, doc));
    }
  }
  return { rows, errors, authoritative };
}

// readWorkspaceItems(store, workspaceId) — a thin accessor over the work_items
// table for exactly ONE workspace, in the { ref, type, slug, status, title,
// parent, sourcePath } row shape (review fix Craft: control-stream-server.mjs's
// applyDeltaFrame used to prepare its OWN raw SELECT against store.db directly;
// this accessor is the ONE read seam instead — still a READ, so it does not
// weaken acd-global-publisher-single-seam, which is scoped to the WRITE path
// (publishWorkspaceSnapshot/openGlobalWorkProjectionStore)).
function readWorkspaceItems(store, workspaceId) {
  return store.db.prepare("SELECT * FROM work_items WHERE workspace_id = ? ORDER BY ref").all(workspaceId).map((row) => ({
    ref: row.ref,
    type: row.type,
    slug: row.slug,
    status: row.status,
    title: row.title,
    parent: row.parent,
    sourcePath: row.source_path,
    ...rowLocationKeys(row),
  }));
}

// readWorkspaceItemProvenance(store, workspaceId) — the PROVENANCE half of the row read
// (m43 / story 04, ADR-006): a SEPARATE accessor from readWorkspaceItems above, not two
// more fields on it. (a) SUBJECT — that one answers "what does the cache say this item IS",
// this answers "who said so, and when", and the read surface applies the second to every
// row it serves, including local-disk rows. (b) IDENTITY — the row shape is compared for
// EQUALITY by callers and tests, and `updated_at` moves on every re-report, so folding it in
// would turn "the row did not change" into "the row was not re-reported".
//
// STORAGE names out; the wire names are the mapper's alone (cache-provenance.mjs). A Map, so
// stamping a whole list is one read rather than one query per row.
function readWorkspaceItemProvenance(store, workspaceId) {
  return new Map(store.db
    .prepare("SELECT ref, node_id, updated_at FROM work_items WHERE workspace_id = ? ORDER BY ref")
    .all(workspaceId)
    .map((row) => [row.ref, { nodeId: row.node_id ?? null, updatedAt: row.updated_at ?? null }]));
}

// The ONE spelling of the run-row upsert, shared by the worker-frame writer below and the
// ledger's own run publish (167/ADR-008): a re-published record refreshes its row in place.
const UPSERT_WORK_ITEM_RUN_SQL = `
      INSERT INTO work_item_runs (workspace_id, ref, run_id, record_json, node_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, ref, run_id) DO UPDATE SET
        record_json = excluded.record_json,
        node_id = excluded.node_id,
        updated_at = excluded.updated_at
    `;

// publishWorkItemRun(store, workspace, { ref, runId, record }, { now, nodeId }) — the NARROW
// writer beside upsertWorkItemContent (167/ADR-008): ONE run record, as it stands now, into
// work_item_runs with this node as its reporter. The `publish-run` reactor of `run.started` and
// `run.completed` (packages/mesh/src/effects.mjs) calls it, so a workspace puts its own runs in
// the store through the ledger it already writes, and the presence tick reads them back instead
// of walking every item's runs/ folder. State-based and idempotent: the row is whatever the
// record reads when the step runs, so a retried step writes the latest state, never a stale one.
// It is not a second opener — it takes the handle the caller opened. `nodeId` absent resolves to
// this node exactly as the row publisher does (resolvePublishingNodeId), so the two writers of
// this table attribute a row the same way. Malformed input is refused by return, never thrown: a
// reactor that threw on it would retry until done against an input that can never improve.
async function publishWorkItemRun(store, workspace, { ref, runId, record } = {}, { now, nodeId } = {}) {
  if (typeof ref !== "string" || ref.length === 0 || typeof runId !== "string" || runId.length === 0 || record == null || typeof record !== "object") {
    return { published: false, reason: "malformed-run" };
  }
  const workspaceId = resolveWorkspaceId(workspace);
  if (typeof workspaceId !== "string" || workspaceId.length === 0) return { published: false, reason: "workspace-unidentified" };
  const reporter = typeof nodeId === "string" && nodeId.length > 0 ? nodeId : await resolvePublishingNodeId(workspace);
  const at = now ?? new Date().toISOString();
  store.db.prepare(UPSERT_WORK_ITEM_RUN_SQL).run(workspaceId, ref, runId, JSON.stringify(record), reporter, at);
  return { published: true, workspaceId, ref, runId, nodeId: reporter, state: record.state ?? null };
}

// The READS over the content tables — the board-face `readWorkItemDoc` / `readWorkItemDocMembers` /
// `readWorkItemRuns` and the presence tick's `readNodeRunningRuns` (167/ADR-008) — live in
// content-reads.mjs and are returned from here, so every importer reaches them as before. Moved
// at 167/06 under this module's 1,280-line ratchet (43/ADR-012 B4): the reads are the block with
// no writer in it. The writers stay here.
const { readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, readNodeRunningRuns } = createContentReads({ reportDegrade });

// upsertWorkItemContent(store, workspaceId, { docs, runs, nodeId }, { now }) — the
// ONE writer for the v5 content tables (the control node's applyWorktreeContentFrame
// call site). Upsert-only, per (ref, doc) / (ref, runId): a re-streamed body simply
// refreshes its row, and rows survive the worktree completing — the last streamed
// view keeps answering the board until the work lands locally. Malformed entries are
// screened here (the same completeness discipline applyDeltaFrame keeps for rows) so
// one bad entry can never abort the frame's other writes.
function upsertWorkItemContent(store, workspaceId, { docs, runs, nodeId } = {}, { now } = {}) {
  const at = now ?? new Date().toISOString();
  const reporter = typeof nodeId === "string" && nodeId.length > 0 ? nodeId : null;
  const docRows = (Array.isArray(docs) ? docs : []).filter((entry) =>
    typeof entry?.ref === "string" && entry.ref.length > 0
    && typeof entry?.doc === "string" && entry.doc.length > 0
    && typeof entry?.body === "string");
  const runRows = (Array.isArray(runs) ? runs : []).filter((entry) =>
    typeof entry?.ref === "string" && entry.ref.length > 0
    && typeof entry?.runId === "string" && entry.runId.length > 0
    && entry?.record != null && typeof entry.record === "object");

  const db = store.db;
  db.exec("BEGIN IMMEDIATE");
  try {
    const upsertDoc = db.prepare(`
      INSERT INTO work_item_docs (workspace_id, ref, doc, body, node_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, ref, doc) DO UPDATE SET
        body = excluded.body,
        node_id = excluded.node_id,
        updated_at = excluded.updated_at
    `);
    for (const entry of docRows) {
      // m43 / ADR-007: ONE spelling of the key, shared with the reader. A dir-kind
      // artifact keeps its MEMBER verbatim (`TASKS/00_a.feature`) — uppercasing it
      // would destroy the filename a face has to render and would fold two files the
      // manifest deliberately treats as different onto one row.
      upsertDoc.run(workspaceId, entry.ref, canonicalArtifactDocKey(entry.doc), entry.body, reporter, at);
    }
    const upsertRun = db.prepare(UPSERT_WORK_ITEM_RUN_SQL);
    for (const entry of runRows) {
      upsertRun.run(workspaceId, entry.ref, entry.runId, JSON.stringify(entry.record), reporter, at);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { published: true, workspaceId, docCount: docRows.length, runCount: runRows.length, skippedEntries: (Array.isArray(docs) ? docs.length : 0) - docRows.length + (Array.isArray(runs) ? runs.length : 0) - runRows.length };
}

// The node_logs ring bound — newest rows kept per node (m42 / item 2 remote read).

// appendNodeLogEntries(store, nodeId, entries, { keep }) — the ONE writer for the
// v6 node_logs table (the control's applyLogEntriesFrame call site). Appends, then
// ring-prunes to the newest `keep` rows for that node — bounded store, no reclaim
// job. Malformed entries are screened (the applyDeltaFrame completeness discipline).
function appendNodeLogEntries(store, nodeId, entries, { keep = NODE_LOG_KEEP } = {}) {
  const rows = (Array.isArray(entries) ? entries : []).filter((entry) => entry != null && typeof entry === "object");
  const db = store.db;
  db.exec("BEGIN IMMEDIATE");
  try {
    const insert = db.prepare("INSERT INTO node_logs (node_id, at, level, code, message, path) VALUES (?, ?, ?, ?, ?, ?)");
    for (const entry of rows) {
      insert.run(
        nodeId,
        typeof entry.at === "string" ? entry.at : null,
        typeof entry.level === "string" ? entry.level : null,
        typeof entry.code === "string" ? entry.code : null,
        typeof entry.message === "string" ? entry.message : null,
        typeof entry.path === "string" ? entry.path : null,
      );
    }
    db.prepare(`
      DELETE FROM node_logs WHERE node_id = ? AND seq NOT IN (
        SELECT seq FROM node_logs WHERE node_id = ? ORDER BY seq DESC LIMIT ?
      )
    `).run(nodeId, nodeId, keep);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { appended: rows.length };
}

// readNodeLogEntries(store, nodeId, { tail }) — the reader half for
// `aof mesh logs --node <id>`: the newest `tail` entries, oldest-first.
function readNodeLogEntries(store, nodeId, { tail = 200 } = {}) {
  return store.db.prepare(
    "SELECT at, level, code, message, path FROM node_logs WHERE node_id = ? ORDER BY seq DESC LIMIT ?"
  ).all(nodeId, tail).reverse();
}

function queryGlobalWorkProjection(store, options = {}) {
  const db = store.db;
  const workspaceId = options.workspaceId ?? options.workspace ?? null;
  const workspaces = workspaceId
    ? db.prepare("SELECT * FROM workspaces WHERE workspace_id = ? ORDER BY workspace_id").all(workspaceId)
    : db.prepare("SELECT * FROM workspaces ORDER BY workspace_id").all();
  const items = workspaceId
    ? db.prepare("SELECT * FROM work_items WHERE workspace_id = ? ORDER BY workspace_id, ref").all(workspaceId)
    : db.prepare("SELECT * FROM work_items ORDER BY workspace_id, ref").all();
  const metadata = workspaceId
    ? db.prepare("SELECT * FROM projection_metadata WHERE workspace_id = ? ORDER BY workspace_id, key").all(workspaceId)
    : db.prepare("SELECT * FROM projection_metadata ORDER BY workspace_id, key").all();
  const errors = workspaceId
    ? db.prepare("SELECT * FROM projection_errors WHERE workspace_id = ? ORDER BY workspace_id, source_path").all(workspaceId)
    : db.prepare("SELECT * FROM projection_errors ORDER BY workspace_id, source_path").all();

  return {
    scope: workspaceId == null ? "global" : "workspace",
    workspaceId,
    workspaces: workspaces.map(mapWorkspaceRow),
    items: items.map(mapItemRow),
    metadata: metadata.map(mapMetadataRow),
    errors: errors.map(mapErrorRow),
  };
}

function mapWorkspaceRow(row) {
  return {
    workspaceId: row.workspace_id,
    projectRoot: row.project_root,
    workDir: row.work_dir,
    name: row.name,
    lastPublishedAt: row.last_published_at,
  };
}

// mapItemRow(row) — the FLEET's row projection (what `/api/mesh/status` serves through
// global-mesh-query.mjs). m43 / story 04: provenance rides the SAME one mapper the board's
// rows use (`toWireProvenance`), never a second translation site — ADR-006's "one home …
// applied identically". Without it the fleet card could not be fed a stale row at all.
function mapItemRow(row) {
  return {
    workspaceId: row.workspace_id,
    ref: row.ref,
    type: row.type,
    slug: row.slug,
    status: row.status,
    title: row.title,
    parent: row.parent,
    sourcePath: row.source_path,
    // 127/04 — the fleet's row carries the two shapes exactly as `listItems` emits them (ADR-006
    // §1): `number: null` + `backlog` on a backlog row, `archived: true` on an archived one.
    ...wireLocationKeys(row),
    ...toWireProvenance(row),
  };
}

function mapMetadataRow(row) {
  return {
    workspaceId: row.workspace_id,
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

function mapErrorRow(row) {
  return {
    workspaceId: row.workspace_id,
    sourcePath: row.source_path,
    message: row.message,
    code: row.code,
    occurredAt: row.occurred_at,
  };
}


return { GLOBAL_WORK_SCHEMA_VERSION, WORKSPACE_DIGEST_REF, globalStoreError, workspaceIdFor, wholesaleDelete, openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs, remapWorkspaceFactRefs, UPSERT_AUTHORITIES, upsertWorkItems, removeWorkspaceFromCache, publishWorkspaceSnapshot, readObservations, readWorkspaceObservations, readSyncState, detectWorkspaceChanges, recordWorkspaceProjectionError, readWorkspaceProjectionItems, readWorkspaceItems, readWorkspaceItemProvenance, upsertWorkItemContent, readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, publishWorkItemRun, readNodeRunningRuns, NODE_LOG_KEEP, appendNodeLogEntries, readNodeLogEntries, queryGlobalWorkProjection };
}
