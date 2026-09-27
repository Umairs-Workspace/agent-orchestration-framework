@executable @cli @work @work-stream
Feature: the cache row carries number-null + backlog and archived exactly as listItems emits them, from the disk projection through the store and the frame doors to the fleet payload

  127/01 taught the one enumerator three roots, and every DISK reader sees them. The CACHE does
  not: `readWorkspaceProjectionItems` (`src/global-work-store.mjs:977`) enumerates through
  `listItems` and then builds `{ ref, type, slug, status, title, parent, sourcePath }` — the two
  new fields are dropped at the first hop, the `work_items` table has no column to hold them,
  and `readWorkspaceItems` / `mapItemRow` could not emit them if it did. So a backlog row
  reaches the store as `{ ref: "gamma", type: "chore", … }` — indistinguishable from a numbered
  driver whose ref happens to be a word — and an archived `05` reaches it as a live `05`. ADR-006
  §1 rules the row carries both shapes "exactly as `listItems` emits them"; this task is the
  carrier, hop by hop, with the SAME widening rule 127/01 gave the frozen `listStream` row: a
  live numbered row is byte-identical to today (the `ROW_SHAPE` pins in
  `cache-authority-own-disk-read` and `cache-read-boundary-holds` hold unchanged), and ONLY a
  backlog row gains `backlog: "<group>"` and ONLY an archived row gains `archived: true`. No
  `number` key is added to the store row: the store has never carried one, and `backlog`'s
  PRESENCE is the one fact `number: null` derives from (a backlog row is the only row that has
  a group, `""` at the top).

  THE STORAGE — schema v9. `GLOBAL_WORK_SCHEMA_VERSION` 8 → 9; `work_items` gains
  `backlog TEXT` and `archived INTEGER`, added by the SAME in-place, PRAGMA-checked
  `ALTER TABLE` idiom v8 used for `node_id` / `updated_at` (`migrateSchema`, `:397-401`): the
  table is never dropped or wiped, every pre-existing row reads `backlog IS NULL, archived IS
  NULL` — a live row — and the migration marker `migration:9` is recorded in
  `projection_metadata` under `_global`. A v10 store still refuses with the existing
  newer-schema error. `archived` is stored as `1` or `NULL`, never `0` (absent is absent), and
  `backlog` as the group string or `NULL` — `""` IS a value (the top of the backlog) and is
  stored as `""`, never coerced to `NULL`.

  THE BIND. SQLite refuses a boolean at bind time (measured — `isBindableValue` says so), so
  `archived: true` cannot ride `OPTIONAL_ITEM_FIELDS` unmapped. `OPTIONAL_ITEM_FIELDS` gains
  `backlog` (a string or null, screened by the existing `isBindableValue`); `archived` is
  screened by its own predicate in `itemRowFault` — `true`, `undefined` or `null` are storable,
  anything else (`"yes"`, `1`, `false`, an object) is `unstorable-value` naming column
  `archived` — and `upsertWorkItems` maps `true → 1`, else `NULL`, at the one INSERT. Both
  columns are in the `ON CONFLICT … DO UPDATE SET` so a re-report that drops the flag clears it.
  `readWorkspaceItems` maps back: `archived === 1 → { archived: true }` and `backlog != null →
  { backlog }`, each key present only when the fact is; `readWorkspaceItemProvenance` is
  untouched (provenance is a separate accessor by 43/ADR-006 and stays one).

  THE HOPS, each asserted: (1) `readWorkspaceProjectionItems` over the three-root fixture
  emits the widened rows; (2) `publishWorkspaceSnapshot` stores them and `readWorkspaceItems`
  reads them back byte-equal; (3) the frame doors `applySnapshotFrame` / `applyDeltaFrame`
  (`src/control-stream-server.mjs`) pass the two keys through — `redactDescriptor` keeps every
  non-secret key and `upsertWorkItems` is the one writer, so no code change is needed there and
  the scenario is the proof that none is; (4) `queryGlobalWorkProjection`'s `mapItemRow` — the
  FLEET's row (`/api/mesh/status` through `global-mesh-query.mjs`) — carries the same
  conditional widening, so `fleet-scope`'s "no surviving row gained a key" pins hold over live
  rows and a backlog row on the fleet payload says `backlog`. The `readWorkerItems` /
  `mergeWorkerItems` path is NOT widened: it is narrowed to items with an execution record,
  and neither a backlog row (no number to dispatch) nor an archived row can hold one.

  What would quietly undo this: deriving `archived` from `source_path` containing `/archive/`
  (location as a substring, wrong for any work dir under a folder named `archive`); storing
  `archived` as `0` for live rows (a row that says "not archived" is a different row from one
  that never carried the fact, and the frozen shape would gain a key); a `number` column;
  a migration that recreates the table (a live fleet's rows are lost — the v8 rule).

  ADR-006 §1; ADR-001 §2, §4; ADR-002 §1; 43/ADR-004, 43/ADR-006 (the v8 precedent).

  Scenario: the disk projection widens exactly the backlog and archived rows
    Given the three-root fixture (`buildThreeRootFixture`, 127/01) loaded as a workspace
    When `readWorkspaceProjectionItems(workspace)` runs
    Then `rows` for `10`, `10/00` and `11` each have exactly the keys `ref, type, slug, status, title, parent, sourcePath` — no `backlog`, no `archived`, no `number`
    And the row for `gamma` is `{ ref: "gamma", type: "chore", slug: "gamma", status: null, title: "Gamma", parent: null, sourcePath: <…/backlog/chore_gamma/CHORE.md>, backlog: "" }`, `delta` carries `backlog: "ideas"` and `epsilon` carries `backlog: "ideas/later"` — forward-slashed, no leading or trailing slash
    And the rows for `05`, `05/00` and `06` each carry `archived: true` and no `backlog`, with `05/00`'s `parent: "05"`
    And `authoritative` is `true` and `errors` is `[]`

  Scenario: the store round-trips both shapes through publish and read, and a live row is byte-identical
    Given the three-root fixture and a hermetic global store
    When `publishWorkspaceSnapshot(store, workspace)` runs and `readWorkspaceItems(store, workspaceId)` is read
    Then every row read back deep-equals the row `readWorkspaceProjectionItems` emitted for the same ref — `gamma` with `backlog: ""`, `epsilon` with `backlog: "ideas/later"`, `05` with `archived: true`, `10` with the seven keys and nothing else
    And `SELECT backlog, archived FROM work_items` answers `("", NULL)` for `gamma`, `("ideas/later", NULL)` for `epsilon`, `(NULL, 1)` for `05` and `(NULL, NULL)` for `10`
    When `archive/06_chore_eta` is moved back to the stream root as `06_chore_eta` on disk and the snapshot is published again
    Then the row for `06` reads back with NO `archived` key — the `DO UPDATE SET` cleared the column to `NULL`

  Scenario Outline: a worker's frame carries the two shapes through the frame door unchanged, and a malformed flag is skipped naming its column
    Given a hermetic store with the fixture workspace registered and no held scopes
    When `<door>` applies a frame whose `items` are `[<row>]` from node `aof-wsl`
    Then the result is `<result>`
    And `readWorkspaceItems` afterwards <holds>

    Examples: the two shapes ride the frame; a wrong-typed flag does not
      | door               | row                                                                                                          | result                                                    | holds                                                                          |
      | applySnapshotFrame | `{ ref: "gamma", type: "chore", slug: "gamma", sourcePath: "…/backlog/chore_gamma/CHORE.md", backlog: "" }` | `upserted: 1, skippedRows: []`                            | holds `gamma` with `backlog: ""` and no `archived` key                         |
      | applyDeltaFrame    | `{ ref: "05", type: "milestone", slug: "zeta", status: "done", sourcePath: "…/archive/05_milestone_zeta/SPEC.md", archived: true }` | `upserted: 1, skippedRows: []`             | holds `05` with `archived: true` and `status: "done"`                          |
      | applyDeltaFrame    | `{ ref: "05", type: "milestone", slug: "zeta", sourcePath: "…", archived: "yes" }`                            | `upserted: 0`, one skipped `{ ref: "05", reason: "unstorable-value", column: "archived" }` | holds no row for `05`                              |
      | applyDeltaFrame    | `{ ref: "gamma", type: "chore", slug: "gamma", sourcePath: "…", backlog: ["ideas"] }`                          | `upserted: 0`, one skipped `{ ref: "gamma", reason: "unstorable-value", column: "backlog" }` | holds no row for `gamma`                        |

  Scenario: a v8 store migrates in place to v9 — its rows survive as live rows and the marker is recorded
    Given a database created by hand with v8's `work_items` DDL (no `backlog`, no `archived` column), `aof_schema.version = 8`, and three rows for a workspace
    When `openGlobalWorkProjectionStore` opens it
    Then `PRAGMA table_info(work_items)` lists `backlog` (TEXT) and `archived` (INTEGER), `aof_schema.version` is `9`, and `projection_metadata` holds `('_global', 'migration:9', '8')`
    And `readWorkspaceItems` answers the three rows with exactly the seven keys — neither new key appears on a row the migration touched
    And opening it a second time changes nothing (idempotent), and a database stamped `version = 10` is refused with the existing newer-schema error, its bytes unchanged
    And `GLOBAL_WORK_SCHEMA_VERSION` is `9` and `test/store/staleness-schema-v8-provenance.test.mjs`'s cases are green unchanged — v8's columns are still what they were

  Scenario: the fleet payload carries the shapes on exactly the rows that have them
    Given the three-root fixture published into a hermetic store
    When `queryGlobalWorkProjection(store, { workspaceId })` and `queryGlobalMeshStatus` are read
    Then the item for `gamma` carries `backlog: ""` and the item for `05` carries `archived: true`, each beside the existing `workspaceId, ref, type, slug, status, title, parent, sourcePath, reportedBy, syncedAt`
    And the items for `10`, `10/00` and `11` carry exactly the pre-existing keys and no `backlog`, `archived` or `number`
    And `test/ui/fleet-scope.test.mjs` is green unchanged — no surviving live row gained a key
