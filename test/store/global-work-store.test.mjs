import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  openGlobalWorkProjectionStore,
  queryGlobalWorkProjection,
  recordWorkspaceProjectionError,
  workspaceIdFor,
  upsertWorkItemContent,
  readWorkItemDoc,
  readWorkItemRuns,
  // 127/04 task 00 — the hops the two shapes ride: the disk projection, the publish, the
  // read-back and the schema constant the v9 migration moves.
  readWorkspaceProjectionItems,
  publishWorkspaceSnapshot,
  readWorkspaceItems,
  GLOBAL_WORK_SCHEMA_VERSION,
} from "../../src/global-work-store.mjs";
// …the frame doors a worker's rows arrive through, the fleet payload, the raw runtime (to
// write a v8 file by hand), and 127/01's three-root fixture — the ONE stream every hop is
// measured over, imported from where its owning story left it (the 127/02 and 127/03 idiom).
import { applySnapshotFrame, applyDeltaFrame } from "../../src/control-stream-server.mjs";
import { queryGlobalMeshStatus } from "../../src/global-mesh-query.mjs";
import { importSqliteRuntime } from "../../src/sqlite-runtime.mjs";
import { withThreeRoots } from "../work/stream/work-backlog-archive-enumerate.test.mjs";
// m43 / ADR-012/B4 — the WORKER-side content read moved into its own module when 43/03
// widened it to the artifact manifest (the store module's line ceiling's own escape
// hatch). Same function, same shapes; imported from where it now lives.
import { readWorkspaceContentRecords } from "../../src/work/content-read.mjs";
import { globalMeshPaths } from "../../src/workspace.mjs";

function frontmatter(fields) {
  return [
    "---",
    ...Object.entries(fields).map(([key, value]) => `${key}: ${typeof value === "string" && value.includes(" ") ? JSON.stringify(value) : value}`),
    "---",
    "",
  ].join("\n");
}

async function makeWorkspace(root, { stories = ["00", "01"], malformed = false } = {}) {
  const workDir = path.join(root, "wiki", "work");
  const milestoneDir = path.join(workDir, "34_milestone_global-mesh");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "34", slug: "global-mesh", status: "in-progress", title: "Global Mesh" }),
    "utf8",
  );
  for (const story of stories) {
    const storyDir = path.join(milestoneDir, "stories", `${story}_story_story-${story}`);
    await mkdir(storyDir, { recursive: true });
    await writeFile(
      path.join(storyDir, "STORY.md"),
      frontmatter({ type: "story", number: story, slug: `story-${story}`, parent: "34", status: "not-started", title: `Story ${story}` }),
      "utf8",
    );
  }
  if (malformed) {
    const storyDir = path.join(milestoneDir, "stories", "99_story_broken");
    await mkdir(storyDir, { recursive: true });
    await writeFile(path.join(storyDir, "STORY.md"), "# Broken\n\nNo frontmatter.\n", "utf8");
  }
  return {
    config: { name: path.basename(root), work: { dir: "./wiki/work" } },
    projectRoot: root,
    workDir,
  };
}

async function withTemp(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-global-work-store-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// ── 127/04 task 00 helpers ─────────────────────────────────────────────────────
// The frozen store-row shape a LIVE row keeps byte-for-byte across every hop.
const SEVEN_KEYS = ["ref", "type", "slug", "status", "title", "parent", "sourcePath"];
const forward = (value) => value.replaceAll("\\", "/");
// The three-root fixture as a workspace the publish path can read: the fixture's own
// `.aof/aof.config.json` points at `wiki/work`, exactly as `loadWorkspace` would resolve it.
const threeRootWorkspace = (root, work) => ({ config: { name: "fixture", work: { dir: "./wiki/work" } }, projectRoot: root, workDir: work });
const FRAME_WS = "ws-frame-doors";
const V8_WS = "ws-v8-file";
// The ADR-010 registration gate a row frame is checked against (`resolveKnownWorkspaceRoot`):
// the descriptor a real `mesh:join` has already written by the time a worker can report.
function registerFrameWorkspace(store, workspaceId) {
  store.db.prepare(`
    INSERT OR REPLACE INTO global_workspace_descriptors
      (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
    VALUES (?, ?, ?, ?, 1, ?, '[]', '2026-09-15T08:00:00.000Z', ?)
  `).run(workspaceId, "/remote", "/remote/wiki/work", workspaceId, "aof-control", "/remote/descriptor.json");
}
// The fleet's row projection over a workspace, through the store's own query.
async function withStoreItems(env, workspaceId) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    return queryGlobalWorkProjection(store, { workspaceId }).items;
  } finally {
    store.close();
  }
}

export const globalWorkStoreTests = [
  {
    name: "global-work-store/00 global mesh paths derive from AOF_GLOBAL_HOME",
    run: async () => withTemp(async (home) => {
      const paths = globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } });
      assert.equal(paths.meshRoot, path.join(home, "mesh"));
      assert.equal(paths.workRoot, path.join(home, "mesh", "work"));
      assert.equal(paths.nodesRoot, path.join(home, "mesh", "nodes"));
      assert.equal(paths.workspacesRoot, path.join(home, "mesh", "workspaces"));
      assert.equal(paths.databasePath, path.join(home, "mesh", "work", "projection.sqlite"));
    }),
  },
  {
    name: "global-work-store/01 opening the store creates schema and is idempotent",
    run: async () => withTemp(async (home) => {
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        assert.ok(existsSync(store.paths.databasePath), "projection database exists");
        // milestone 35 / story 00 (ADR-001) — schema v2 -> v3: the additive
        // global_assignments table (assignment-record.mjs owns its own dedicated
        // fixture suite; this is just the pinned-version/table-presence re-arm).
        // v3 -> v4 (ADR-010 Gap A extended, review fix live soak 2026-07-17):
        // global_workspace_descriptors.clone_url — mesh-assignment-record.test.mjs
        // owns the dedicated ALTER TABLE migration fixture; this is the SAME
        // pinned-version re-arm.
        // v4 -> v5 (TECH_DEBT item 6 — finish the board bridge): the additive
        // work_item_docs + work_item_runs content tables (their own fixtures live
        // in the /05 tests below); again the pinned-version/table-presence re-arm.
        // v5 -> v6 (m42 wave (a), TECH_DEBT item 2 remote read): node_logs; v6 -> v7
        // (m42 interactive worker terminals): global_assignments.code — the same
        // pinned-version re-arm as every bump above. (This pin had been left at 6
        // after the v7 bump — pre-existing red, fixed en route in m42 wave (d) d5,
        // verified by stash at HEAD.)
        // v7 -> v8 (m43 / ADR-004 + ADR-006, owned by 43/02 per ADR-010/D2): the
        // work_items PROVENANCE columns node_id + updated_at — the same in-place,
        // PRAGMA-checked ALTER, and the same pinned-version re-arm. The columns
        // themselves are asserted below, because this bump is the one that decides
        // whether a row can be attributed and retracted at all.
        // v8 -> v9 (m127 / ADR-006 §1, owned by 127/04): the work_items LOCATION columns
        // backlog + archived — the same in-place, PRAGMA-checked ALTER, and the same
        // pinned-version re-arm. The migration has its own fixture in the 127-04-00 cases.
        assert.equal(store.schemaVersion, 9);
        const tables = store.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
        assert.ok(tables.includes("aof_schema"));
        assert.ok(tables.includes("workspaces"));
        assert.ok(tables.includes("work_items"));
        assert.ok(tables.includes("projection_metadata"));
        assert.ok(tables.includes("projection_errors"));
        assert.ok(tables.includes("global_nodes"));
        assert.ok(tables.includes("global_workspace_descriptors"));
        assert.ok(tables.includes("global_node_workspaces"));
        assert.ok(tables.includes("global_assignments"));
        assert.ok(tables.includes("work_item_docs"));
        assert.ok(tables.includes("work_item_runs"));
        assert.ok(tables.includes("node_logs"));
        const workItemColumns = store.db.prepare("PRAGMA table_info(work_items)").all().map((column) => column.name);
        assert.ok(workItemColumns.includes("node_id"), "v8: work_items carries the reporting node");
        assert.ok(workItemColumns.includes("updated_at"), "v8: work_items carries the instant that node reported it");
      } finally {
        store.close();
      }

      const reopened = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const versions = reopened.db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").all();
        assert.equal(versions.length, 1);
        assert.equal(versions[0].value, 9);
      } finally {
        reopened.close();
      }
    }),
  },
  {
    name: "global-work-store/01 SQLite unavailable refuses without creating a partial database",
    run: async () => withTemp(async (home) => {
      const paths = globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } });
      await assert.rejects(
        openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home }, sqlite: false }),
        (error) => error.code === "sqlite-unavailable",
      );
      assert.equal(existsSync(paths.databasePath), false);
    }),
  },
  {
    name: "global-work-store/01 future schema refuses without changing the version",
    run: async () => withTemp(async (home) => {
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      store.db.prepare("UPDATE aof_schema SET value = 99 WHERE key = 'version'").run();
      store.close();
      await assert.rejects(
        openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } }),
        (error) => error.code === "global-store-schema-unsupported" && error.schemaVersion === 99,
      );
      const bytes = await readFile(globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } }).databasePath);
      assert.ok(bytes.length > 0, "future database remains present");
    }),
  },
  {
    name: "global-work-store/02 publishing a workspace snapshot replaces stale rows and preserves other workspaces",
    run: async () => withTemp(async (tmp) => {
      const home = path.join(tmp, "home");
      const alphaRoot = path.join(tmp, "alpha");
      const betaRoot = path.join(tmp, "beta");
      const alpha = await makeWorkspace(alphaRoot, { stories: ["00", "01"] });
      const beta = await makeWorkspace(betaRoot, { stories: ["00"] });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        await store.publishWorkspaceSnapshot(alpha, { now: "2026-07-04T10:00:00.000Z" });
        await store.publishWorkspaceSnapshot(beta, { now: "2026-07-04T10:01:00.000Z" });
        assert.equal(queryGlobalWorkProjection(store).items.length, 5);

        await rm(path.join(alphaRoot, "wiki", "work", "34_milestone_global-mesh", "stories", "01_story_story-01"), { recursive: true, force: true });
        const changedAlpha = await makeWorkspace(alphaRoot, { stories: ["00"] });
        await store.publishWorkspaceSnapshot(changedAlpha, { now: "2026-07-04T10:02:00.000Z" });
        const global = queryGlobalWorkProjection(store);
        const alphaId = workspaceIdFor(alphaRoot);
        const betaId = workspaceIdFor(betaRoot);
        assert.deepEqual(global.items.filter((i) => i.workspaceId === alphaId).map((i) => i.ref), ["34", "34/00"]);
        assert.deepEqual(global.items.filter((i) => i.workspaceId === betaId).map((i) => i.ref), ["34", "34/00"]);
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "global-work-store/02 malformed work records become projection errors beside healthy rows",
    run: async () => withTemp(async (tmp) => {
      const home = path.join(tmp, "home");
      const workspace = await makeWorkspace(path.join(tmp, "alpha"), { stories: [], malformed: true });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const result = await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-04T10:00:00.000Z" });
        assert.equal(result.itemCount, 1);
        assert.equal(result.skipped, 1);
        const query = queryGlobalWorkProjection(store);
        assert.equal(query.items.length, 1);
        assert.equal(query.errors.length, 1);
        assert.match(query.errors[0].sourcePath, /broken\/STORY\.md$/);
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "global-work-store/02 projection write failures can be recorded beside the workspace row",
    run: async () => withTemp(async (tmp) => {
      const home = path.join(tmp, "home");
      const workspace = await makeWorkspace(path.join(tmp, "alpha"), { stories: ["00"] });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const error = new Error("write failed");
        error.code = "projection-write-failed";
        recordWorkspaceProjectionError(store, workspace, error, { now: "2026-07-04T10:03:00.000Z" });
        const query = queryGlobalWorkProjection(store, { workspaceId: workspaceIdFor(workspace.projectRoot) });
        assert.equal(query.workspaces.length, 1);
        assert.equal(query.errors.length, 1);
        assert.equal(query.errors[0].code, "projection-write-failed");
        assert.equal(query.errors[0].message, "write failed");
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "global-work-store/03 query can filter by workspace and returns fresh copies",
    run: async () => withTemp(async (tmp) => {
      const home = path.join(tmp, "home");
      const alpha = await makeWorkspace(path.join(tmp, "alpha"), { stories: ["00"] });
      const beta = await makeWorkspace(path.join(tmp, "beta"), { stories: ["00"] });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        await store.publishWorkspaceSnapshot(alpha, { now: "2026-07-04T10:00:00.000Z" });
        await store.publishWorkspaceSnapshot(beta, { now: "2026-07-04T10:01:00.000Z" });
        const alphaId = workspaceIdFor(alpha.projectRoot);
        const scoped = queryGlobalWorkProjection(store, { workspaceId: alphaId });
        assert.equal(scoped.workspaces.length, 1);
        assert.equal(scoped.items.length, 2);
        scoped.items[0].ref = "mutated";
        const scopedAgain = queryGlobalWorkProjection(store, { workspaceId: alphaId });
        assert.deepEqual(scopedAgain.items.map((item) => item.ref), ["34", "34/00"]);
      } finally {
        store.close();
      }
    }),
  },
  // ---- schema v5 (TECH_DEBT item 6 — finish the board bridge): worker-streamed
  // doc bodies + run records ride the projection beside the item rows. ----
  {
    name: "global-work-store/05 v5 content tables round-trip through upsert + read and survive a row re-publish",
    run: async () => withTemp(async (tmp) => {
      const home = path.join(tmp, "home");
      const workspace = await makeWorkspace(path.join(tmp, "alpha"), { stories: ["00"] });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const workspaceId = workspaceIdFor(workspace.projectRoot);
        const record = { runId: "run-1", itemRef: "34/00", state: "running", attempt: 1, createdAt: "2026-07-26T09:00:00.000Z", updatedAt: "2026-07-26T09:05:00.000Z" };
        const result = upsertWorkItemContent(store, workspaceId, {
          docs: [
            { ref: "34/00", doc: "STORY", body: "# streamed story body\n" },
            { ref: "bad-entry-no-doc", body: "screened out" },
          ],
          runs: [
            { ref: "34/00", runId: "run-1", record },
            { ref: "bad-entry-no-record", runId: "run-2" },
          ],
          nodeId: "worker-a",
        }, { now: "2026-07-26T09:05:00.000Z" });
        assert.equal(result.docCount, 1, "the malformed doc entry is screened, the good one lands");
        assert.equal(result.runCount, 1, "the malformed run entry is screened, the good one lands");

        const doc = readWorkItemDoc(store, workspaceId, "34/00", "story");
        assert.equal(doc.body, "# streamed story body\n", "the body round-trips (doc name case-insensitive)");
        assert.equal(doc.nodeId, "worker-a", "the reporting node is recorded");
        const runs = readWorkItemRuns(store, workspaceId, "34/00");
        assert.equal(runs.length, 1);
        assert.deepEqual(runs[0].record, record, "the run record round-trips verbatim");

        // A re-streamed body refreshes its row in place (upsert, never a dup).
        upsertWorkItemContent(store, workspaceId, { docs: [{ ref: "34/00", doc: "STORY", body: "# v2\n" }], nodeId: "worker-a" }, { now: "2026-07-26T09:06:00.000Z" });
        assert.equal(readWorkItemDoc(store, workspaceId, "34/00", "STORY").body, "# v2\n");

        // The row publisher's DELETE-then-reinsert cycle must never touch streamed
        // content (the global_assignments discipline, extended).
        await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-26T09:07:00.000Z" });
        assert.ok(readWorkItemDoc(store, workspaceId, "34/00", "STORY") != null, "content survives a workspace row re-publish");
        assert.equal(readWorkItemRuns(store, workspaceId, "34/00").length, 1, "run records survive a workspace row re-publish");

        assert.equal(readWorkItemDoc(store, workspaceId, "34/00", "VERIFICATION"), null, "a never-streamed doc reads null");
        assert.deepEqual(readWorkItemRuns(store, workspaceId, "34/01"), [], "a never-streamed ref reads an empty run history");
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "global-work-store/05 readWorkspaceContentRecords collects the subtree's doc bodies and run records",
    run: async () => withTemp(async (tmp) => {
      const workspace = await makeWorkspace(path.join(tmp, "alpha"), { stories: ["00", "01"] });
      const storyDir = path.join(workspace.workDir, "34_milestone_global-mesh", "stories", "00_story_story-00");
      await writeFile(path.join(storyDir, "VERIFICATION.md"), "# verification body\n", "utf8");
      const runsDir = path.join(storyDir, "runs");
      await mkdir(runsDir, { recursive: true });
      const record = { runId: "run-9", itemRef: "34/00", state: "running", attempt: 1, createdAt: "2026-07-26T09:00:00.000Z", updatedAt: "2026-07-26T09:00:00.000Z" };
      await writeFile(path.join(runsDir, "run-9.json"), JSON.stringify(record), "utf8");

      const content = await readWorkspaceContentRecords(workspace, { itemRef: "34/00" });
      const docKeys = content.docs.map((doc) => `${doc.ref}:${doc.doc}`).sort();
      // The subtree: the item, its milestone, and the milestone's children — docs
      // that exist are carried, absent files are skipped without an error entry.
      assert.deepEqual(docKeys, ["34/00:STORY", "34/00:VERIFICATION", "34/01:STORY", "34:SPEC"]);
      assert.equal(content.docs.find((doc) => doc.ref === "34/00" && doc.doc === "VERIFICATION").body, "# verification body\n");
      assert.equal(content.runs.length, 1);
      assert.equal(content.runs[0].runId, "run-9");
      assert.equal(content.runs[0].ref, "34/00");
      assert.deepEqual(content.errors, [], "absent doc files are absent-not-error");
    }),
  },
  // ============================================================================
  // milestone 127 / story 04 / task 00 —
  //   tasks/00_the-cache-row-carries-the-two-shapes.feature (@executable)
  //
  // The cache row carries `number: null` + `backlog` and `archived: true` EXACTLY as
  // `listItems` emits them — from the disk projection through the store (schema v9's two
  // columns) and the frame doors to the fleet payload — widened ONLY on a backlog or archived
  // row, so every frozen-shape pin over a live row holds. Driven over 127/01's three-root
  // fixture and this build's real store; nothing about the row shapes is stood in for.
  // ============================================================================
  {
    name: "global-work-store/127-04-00 the disk projection widens exactly the backlog and archived rows — a live row keeps its seven keys, a backlog row gains `backlog`, an archived row gains `archived: true`, and nothing gains `number`",
    run: async () => withThreeRoots({}, async ({ root, work }) => {
      const projected = await readWorkspaceProjectionItems(threeRootWorkspace(root, work));
      assert.equal(projected.authoritative, true, "the stream was readable");
      assert.deepEqual(projected.errors, [], "…and every record doc parsed");
      const byRef = new Map(projected.rows.map((row) => [row.ref, row]));

      for (const ref of ["10", "10/00", "11"]) {
        assert.deepEqual(Object.keys(byRef.get(ref)), SEVEN_KEYS, `live row ${ref} carries exactly the seven keys — no backlog, no archived, no number`);
      }
      // The fixture writes every record doc `status: not-started` (its `writeItem` default, 127/01),
      // which is the value the projection reads; the feature spelled `status: null` for the same row.
      assert.deepEqual(byRef.get("gamma"), {
        ref: "gamma", type: "chore", slug: "gamma", status: "not-started", title: "Gamma", parent: null,
        sourcePath: `${forward(work)}/backlog/chore_gamma/CHORE.md`,
        backlog: "",
      }, "the top-of-backlog row carries `backlog: \"\"` — the empty group is a VALUE, never dropped");
      assert.equal(byRef.get("delta").backlog, "ideas", "a grouped row carries its group path");
      assert.equal(byRef.get("epsilon").backlog, "ideas/later", "…forward-slashed, no leading or trailing slash");
      for (const ref of ["gamma", "delta", "epsilon"]) {
        assert.ok(!("number" in byRef.get(ref)), `${ref}: no \`number\` key rides the store row — \`backlog\`'s presence is the one fact number-null derives from`);
        assert.ok(!("archived" in byRef.get(ref)), `${ref}: a backlog row is not archived`);
      }
      for (const ref of ["05", "05/00", "06"]) {
        assert.equal(byRef.get(ref).archived, true, `archived row ${ref} carries \`archived: true\``);
        assert.ok(!("backlog" in byRef.get(ref)), `${ref}: an archived row carries no \`backlog\``);
      }
      assert.equal(byRef.get("05/00").parent, "05", "an archived story keeps its parent");
    }),
  },
  {
    name: "global-work-store/127-04-00 the store round-trips both shapes through publish and read — a live row is byte-identical, the two columns hold (\"\", NULL) / (NULL, 1) / (NULL, NULL), and a folder moved back out of the archive reads live again",
    run: async () => withThreeRoots({}, async ({ root, work }) => withTemp(async (home) => {
      const workspace = threeRootWorkspace(root, work);
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const projected = await readWorkspaceProjectionItems(workspace);
        const published = await publishWorkspaceSnapshot(store, workspace, { nodeId: "aof-control", now: "2026-09-15T09:00:00.000Z" });
        assert.equal(published.upserted, projected.rows.length, "every projected row landed");

        const read = new Map(readWorkspaceItems(store, published.workspaceId).map((row) => [row.ref, row]));
        for (const row of projected.rows) {
          assert.deepEqual(read.get(row.ref), row, `${row.ref} reads back deep-equal to the row the projection emitted`);
        }
        assert.deepEqual(Object.keys(read.get("10")), SEVEN_KEYS, "a live row reads back with the seven keys and nothing else");
        assert.equal(read.get("gamma").backlog, "");
        assert.equal(read.get("epsilon").backlog, "ideas/later");
        assert.equal(read.get("05").archived, true);

        const columns = (ref) => {
          const row = store.db.prepare("SELECT backlog, archived FROM work_items WHERE workspace_id = ? AND ref = ?").get(published.workspaceId, ref);
          return [row.backlog, row.archived];
        };
        assert.deepEqual(columns("gamma"), ["", null], "the top of the backlog is stored as \"\", never coerced to NULL");
        assert.deepEqual(columns("epsilon"), ["ideas/later", null]);
        assert.deepEqual(columns("05"), [null, 1], "archived is stored as 1");
        assert.deepEqual(columns("10"), [null, null], "a live row stores NULL in both — never 0, absent is absent");

        // The folder moves back to the stream root and the node republishes: the DO UPDATE
        // SET clears the flag, so the row reads live again with NO `archived` key.
        await rename(path.join(work, "archive", "06_chore_eta"), path.join(work, "06_chore_eta"));
        await publishWorkspaceSnapshot(store, workspace, { nodeId: "aof-control", now: "2026-09-15T09:01:00.000Z" });
        const eta = readWorkspaceItems(store, published.workspaceId).find((row) => row.ref === "06");
        assert.ok(!("archived" in eta), "06 reads back with NO archived key — the re-report cleared the column");
        assert.deepEqual(columns("06"), [null, null], "…to NULL, not 0");
        assert.deepEqual(Object.keys(eta), SEVEN_KEYS);
      } finally {
        store.close();
      }
    })),
  },
  ...[
    {
      door: "applySnapshotFrame",
      row: { ref: "gamma", type: "chore", slug: "gamma", sourcePath: "/remote/wiki/work/backlog/chore_gamma/CHORE.md", backlog: "" },
      upserted: 1,
      skipped: [],
      holds: (rows) => {
        assert.equal(rows.get("gamma")?.backlog, "", "holds gamma with backlog \"\"");
        assert.ok(!("archived" in rows.get("gamma")), "…and no archived key");
      },
    },
    {
      door: "applyDeltaFrame",
      row: { ref: "05", type: "milestone", slug: "zeta", status: "done", sourcePath: "/remote/wiki/work/archive/05_milestone_zeta/SPEC.md", archived: true },
      upserted: 1,
      skipped: [],
      holds: (rows) => {
        assert.equal(rows.get("05")?.archived, true, "holds 05 with archived: true");
        assert.equal(rows.get("05")?.status, "done", "…and status done");
      },
    },
    {
      door: "applyDeltaFrame",
      row: { ref: "05", type: "milestone", slug: "zeta", sourcePath: "/remote/wiki/work/archive/05_milestone_zeta/SPEC.md", archived: "yes" },
      upserted: 0,
      skipped: [{ ref: "05", reason: "unstorable-value", column: "archived" }],
      holds: (rows) => assert.equal(rows.has("05"), false, "holds no row for 05 — a wrong-typed flag is skipped, naming its column"),
    },
    {
      door: "applyDeltaFrame",
      row: { ref: "gamma", type: "chore", slug: "gamma", sourcePath: "/remote/wiki/work/backlog/chore_gamma/CHORE.md", backlog: ["ideas"] },
      upserted: 0,
      skipped: [{ ref: "gamma", reason: "unstorable-value", column: "backlog" }],
      holds: (rows) => assert.equal(rows.has("gamma"), false, "holds no row for gamma — an array group is skipped, naming its column"),
    },
  ].map(({ door, row, upserted, skipped, holds }) => ({
    name: `global-work-store/127-04-00 a worker's frame through ${door} — ${JSON.stringify(row).slice(0, 60)}… → upserted ${upserted}, skipped ${skipped.length === 0 ? "none" : `${skipped[0].reason} on ${skipped[0].column}`}`,
    run: async () => withTemp(async (home) => {
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        registerFrameWorkspace(store, FRAME_WS);
        const apply = door === "applySnapshotFrame" ? applySnapshotFrame : applyDeltaFrame;
        const result = await apply(store, { kind: door === "applySnapshotFrame" ? "snapshot" : "delta", nodeId: "aof-wsl", workspaceId: FRAME_WS, items: [row], at: "2026-09-15T09:00:00.000Z" }, { nodeId: "aof-wsl" });
        assert.equal(result.published, true, "the door accepted the frame");
        assert.equal(result.upserted, upserted, "upserted count");
        assert.deepEqual(
          result.skippedRows.map(({ ref, reason, column }) => ({ ref, reason, column })),
          skipped.map(({ ref, reason, column }) => ({ ref, reason, column })),
          "the skip names the ref, the reason and the column",
        );
        holds(new Map(readWorkspaceItems(store, FRAME_WS).map((stored) => [stored.ref, stored])));
      } finally {
        store.close();
      }
    }),
  })),
  {
    name: "global-work-store/127-04-00 a v8 store migrates in place to v9 — backlog (TEXT) and archived (INTEGER) are added by ALTER, its rows survive as live rows with the seven keys, the marker is recorded once, and a v10 store is still refused",
    run: async () => withTemp(async (home) => {
      const paths = globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } });
      const { DatabaseSync } = await importSqliteRuntime();
      await mkdir(paths.workRoot, { recursive: true });
      // v8's work_items DDL by hand — ten columns, no backlog, no archived — stamped version 8.
      const v8 = new DatabaseSync(paths.databasePath);
      v8.exec(`
        CREATE TABLE aof_schema (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
        INSERT INTO aof_schema (key, value) VALUES ('version', 8);
        CREATE TABLE work_items (
          workspace_id TEXT NOT NULL, ref TEXT NOT NULL, type TEXT NOT NULL, slug TEXT NOT NULL,
          status TEXT, title TEXT, parent TEXT, source_path TEXT NOT NULL, node_id TEXT, updated_at TEXT,
          PRIMARY KEY (workspace_id, ref)
        );
      `);
      const insert = v8.prepare("INSERT INTO work_items (workspace_id, ref, type, slug, status, title, parent, source_path, node_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insert.run(V8_WS, "43", "milestone", "alpha", "in-progress", "Alpha", null, "/repo/wiki/work/43/SPEC.md", "aof-control", "2026-08-01T09:00:00.000Z");
      insert.run(V8_WS, "43/00", "story", "alpha-one", "done", "Alpha one", "43", "/repo/wiki/work/43/stories/00/STORY.md", "aof-control", "2026-08-01T09:00:00.000Z");
      insert.run(V8_WS, "44", "uat", "accept", "blocked", "Accept", null, "/repo/wiki/work/44/SESSION.md", null, null);
      v8.close();

      const columnsOf = (store) => store.db.prepare("PRAGMA table_info(work_items)").all().map((column) => [column.name, column.type]);
      const markers = (store) => store.db.prepare("SELECT key, value FROM projection_metadata WHERE workspace_id = '_global' AND key LIKE 'migration:%' ORDER BY key").all().map((row) => [row.key, String(row.value)]);
      const version = (store) => Number(store.db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get().value);

      const first = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      let afterFirst;
      try {
        const columns = columnsOf(first);
        assert.deepEqual(columns.find(([name]) => name === "backlog"), ["backlog", "TEXT"], "backlog TEXT was added");
        assert.deepEqual(columns.find(([name]) => name === "archived"), ["archived", "INTEGER"], "archived INTEGER was added");
        assert.equal(version(first), 9, "the version moved to 9");
        assert.deepEqual(markers(first), [["migration:9", "8"]], "projection_metadata holds ('_global', 'migration:9', '8')");
        const rows = readWorkspaceItems(first, V8_WS);
        assert.equal(rows.length, 3, "the three rows survived — an ALTER in place, never a rebuild");
        for (const row of rows) assert.deepEqual(Object.keys(row), SEVEN_KEYS, `${row.ref}: exactly the seven keys — neither new key appears on a row the migration touched`);
        afterFirst = { columns, markers: markers(first), rows };
      } finally {
        first.close();
      }
      assert.equal(GLOBAL_WORK_SCHEMA_VERSION, 9, "GLOBAL_WORK_SCHEMA_VERSION is 9");

      const second = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        assert.deepEqual(columnsOf(second), afterFirst.columns, "a second open adds no column");
        assert.deepEqual(markers(second), afterFirst.markers, "…and no second marker (idempotent)");
        assert.deepEqual(readWorkspaceItems(second, V8_WS), afterFirst.rows, "…and changes no row");
        second.db.prepare("UPDATE aof_schema SET value = 10 WHERE key = 'version'").run();
      } finally {
        second.close();
      }
      await assert.rejects(
        openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } }),
        (error) => error.code === "global-store-schema-unsupported" && error.schemaVersion === 10,
        "a database stamped version = 10 is refused with the existing newer-schema error",
      );
      const stamped = new DatabaseSync(paths.databasePath);
      try {
        assert.equal(Number(stamped.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get().value), 10, "…and its version row is untouched: never silently downgraded or re-migrated");
        assert.deepEqual(stamped.prepare("PRAGMA table_info(work_items)").all().map((column) => [column.name, column.type]), afterFirst.columns, "…nor its columns");
      } finally {
        stamped.close();
      }
    }),
  },
  {
    name: "global-work-store/127-04-00 the fleet payload carries the shapes on exactly the rows that have them — gamma says `backlog: \"\"`, 05 says `archived: true`, and a live row carries exactly its pre-existing keys",
    run: async () => withThreeRoots({}, async ({ root, work }) => withTemp(async (home) => {
      const workspace = threeRootWorkspace(root, work);
      const env = { AOF_GLOBAL_HOME: home };
      const store = await openGlobalWorkProjectionStore({ env });
      let workspaceId;
      try {
        ({ workspaceId } = await publishWorkspaceSnapshot(store, workspace, { nodeId: "aof-control", now: "2026-09-15T09:00:00.000Z" }));
      } finally {
        store.close();
      }
      const LIVE_KEYS = ["workspaceId", "ref", "type", "slug", "status", "title", "parent", "sourcePath", "reportedBy", "syncedAt"];
      for (const [label, items] of [
        ["queryGlobalWorkProjection", await withStoreItems(env, workspaceId)],
        ["queryGlobalMeshStatus", (await queryGlobalMeshStatus({ env, scope: "global" })).items],
      ]) {
        const byRef = new Map(items.filter((item) => item.workspaceId === workspaceId).map((item) => [item.ref, item]));
        assert.equal(byRef.get("gamma")?.backlog, "", `${label}: gamma carries backlog ""`);
        assert.equal(byRef.get("gamma")?.number, null, `${label}: …and number: null — the fleet row carries the shapes exactly as listItems emits them (ADR-006 §1)`);
        assert.deepEqual(Object.keys(byRef.get("gamma")).sort(), [...LIVE_KEYS, "number", "backlog"].sort(), `${label}: …beside the existing keys and nothing else`);
        assert.equal(byRef.get("05")?.archived, true, `${label}: 05 carries archived: true`);
        assert.deepEqual(Object.keys(byRef.get("05")).sort(), [...LIVE_KEYS, "archived"].sort(), `${label}: …beside the existing keys and nothing else`);
        for (const ref of ["10", "10/00", "11"]) {
          assert.deepEqual(Object.keys(byRef.get(ref)).sort(), [...LIVE_KEYS].sort(), `${label}: live row ${ref} carries exactly the pre-existing keys — no backlog, archived or number`);
        }
      }
    })),
  },
];
