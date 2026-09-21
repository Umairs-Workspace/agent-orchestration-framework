// Traceability wiring for milestone 48 / story 03 / task 01 —
// `tasks/01_attribution-and-the-free-session.feature`: a session says what it is
// working on, or says plainly that it is working on nothing — and the payload carries
// the index to the browser.
//
// THE AUTHORITY SPLIT (ADR-003) is what these scenarios pin: PRESENCE is the sole
// authority on a session's EXISTENCE and LIVENESS; the ASSIGNMENT is the sole
// authority on its WORK ATTRIBUTION; the join runs ONE WAY only — `workItem` derives
// ONTO the session at the index, and the session RECORD stores no ref, ever.
//
// FED BY THE REAL PRODUCERS (m38/ADR-008). The sessions come from the REAL
// `startSession` → REAL `readLiveSessions` over real records on disk; the assignment
// rows are written by the REAL `insertAssignment`/`updateAssignmentState` into a real
// `global_assignments` table; the payload is shaped by the REAL `queryGlobalMeshStatus`
// and served by the REAL fleet route. The one lane that cannot go through the store is
// the two-column join matrix: `mapAssignmentRow` maps a missing `session_id` column to
// `null`, so the "no `sessionId` key at all" row can only be expressed at the REAL
// `shapeGlobalStatus` — which is still the real producer of the index, called exactly
// as the query surface calls it.
//
// ISOLATION IS MANDATORY: a fresh `AOF_GLOBAL_HOME` temp dir per lane. THE PORT TRAP:
// every server below binds `port: 0` and reads its own address — never `:4181`/`:4182`,
// which the live daemons hold on this machine.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryGlobalMeshStatus, shapeGlobalStatus, buildSessionIndex, workspaceIdForProjectRoot } from "../../../src/global-mesh-query.mjs";
import { publishPresenceRecord, readLiveSessions } from "../../../src/mesh/presence.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { meshDir } from "../../../src/mesh/store.mjs";
import { publishNodeRecord } from "../../../src/mesh/store.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../../src/global-node-registry.mjs";
import { assembleAssignmentRecord, insertAssignment, updateAssignmentState } from "../../../src/assignment-record.mjs";
import { serveMeshUi, meshUiDist } from "../../../src/mesh/ui-serve.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// m50/ADR-008 decision 8 APPENDED a ninth key, `relaying`, AFTER `workItem` — the two
// inputs of the browser's feed-axis disjunction sitting together. Unconditional and
// read with a strict `=== true`, exactly as `workspaceHasRun` is; every key above it
// keeps its position, so this list still asserts an exact ordered entry.
const ENTRY_KEYS = ["nodeId", "sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "workItem", "relaying"];

// THE PAYLOAD'S TOP-LEVEL KEYS, asserted EXACTLY — and this list carries a deliberate
// departure from the task feature's own enumeration, recorded here rather than papered
// over. The feature names `scope`, `workspaceId`, `workspaces`, `items`, `nodes`,
// `diagnostics` as "the same set … that the same fixture produces without this
// feature". The real `shapeGlobalStatus` has also carried `stalenessSeconds` since
// milestone 43 / story 04 (the cache-freshness window, stated once per response) — it
// predates this story, which neither adds it, moves it, nor reads it. The feature's
// six match `ui/src/fleet/api.ts`'s `GlobalMeshStatus` declaration, which deliberately
// does not spell that key (its ONE ui-side reader is `../board/freshness.mjs`). The
// binding clause — "the same set, with the same values, that the same fixture produces
// without this feature" — is asserted here against what the shaper really produces, so
// a seventh pre-existing key cannot be silently dropped to make a list match.
// 130/03 (ADR-005 §3) appends `localNodeId` — the ROUTE's stamp of which machine is serving the
// read (the board's own `nodeId` precedent), beside `scope`, after the projection's keys. It is
// a fact about the server, never the store: `shapeGlobalStatus` still carries no such key.
const PRE_EXISTING_TOP_LEVEL_KEYS = ["scope", "workspaceId", "stalenessSeconds", "workspaces", "items", "nodes", "diagnostics", "localNodeId"];
const FEATURE_NAMED_TOP_LEVEL_KEYS = ["scope", "workspaceId", "workspaces", "items", "nodes", "diagnostics"];

async function withTemp(prefix, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A real repo whose work stream holds milestone 48 / story 03 (so `items[]` carries the
// ref `48/03` an assignment can name), plus an isolated global mesh home.
async function makeRepo(tmp, { nodeId = "node-a", name = "fixture" } = {}) {
  const root = path.join(tmp, name);
  const home = path.join(tmp, "home");
  const milestoneDir = path.join(root, "wiki", "work", "48_milestone_fleet-session-identity");
  await mkdir(path.join(milestoneDir, "stories", "03_story_fleet-session-index"), { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 48\nslug: fleet-session-identity\nstatus: in-progress\ntitle: Fleet session identity\n---\n",
    "utf8",
  );
  await writeFile(
    path.join(milestoneDir, "stories", "03_story_fleet-session-index", "STORY.md"),
    "---\ntype: story\nnumber: 03\nslug: fleet-session-index\nparent: 48\nstatus: in-progress\ntitle: The fleet-side session index\n---\n",
    "utf8",
  );
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId } }, null, 2)}\n`,
    "utf8",
  );
  // `loadWorkspace`'s third argument is an OPTIONS bag — `{ env }`, never the env
  // itself. Handing it the bare env silently falls back to `process.env`, which is how
  // a fixture ends up writing into whatever `AOF_GLOBAL_HOME` the shell happens to
  // carry (and, with no guard, into the operator's real `~/.aof`).
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  return { workspace, root, home, env, workspaceId: workspaceIdForProjectRoot(root) };
}

// Seed ONE node into the registry, live at the wall clock the route will read, with the
// sessions the REAL producer projects for it. Returns the entries as published.
async function seedLiveNode(workspace, nodeId, sessionSeeds, { now = new Date().toISOString() } = {}) {
  for (const seed of sessionSeeds) {
    await startSession(workspace, {
      nodeId,
      workspaceId: seed.workspaceId ?? "ws-1",
      repo: seed.repo ?? "demo",
      assistant: seed.assistant ?? "claude-code",
      sessionId: seed.sessionId ?? null,
      now,
    });
  }
  const sessions = await readLiveSessions(workspace, nodeId, { now, config: {} });
  await publishNodeRecord(workspace, nodeId, {
    nodeId,
    host: nodeId,
    os: "win32",
    runtimes: ["claude"],
    skills: [],
    aofVersion: "0.1.0",
    publishedAt: now,
  });
  await publishPresenceRecord(workspace, nodeId, { nodeId, heartbeatAt: now, activeRuns: [], sessions, aofVersion: "0.1.0" });
  return sessions;
}

// Publish the workspace + registry snapshot so the node reads `freshness: "live"` and
// `items[]` carries the work stream.
async function publishAll(workspace, env, { now = new Date().toISOString() } = {}) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    await store.publishWorkspaceSnapshot(workspace, { now });
    await publishGlobalRegistryDescriptorsToStore(store, workspace, { now });
  } finally {
    store.close();
  }
}

// Write an assignment row through the REAL writers. `sessionId` lands via the REAL
// `updateAssignmentState` — the one writer of `global_assignments.session_id`, the same
// seam the worker's captured id travels through.
async function seedAssignment(env, { itemRef, workspaceId, targetNodeId, sessionId, state = "running", now = new Date().toISOString() }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    const record = assembleAssignmentRecord({ itemRef, workspaceId, targetNodeId, issuer: "control-a", state: "assigned", now });
    insertAssignment(store, record);
    updateAssignmentState(store, record.assignmentId, state, { now, ...(sessionId === undefined ? {} : { sessionId }) });
    return record.assignmentId;
  } finally {
    store.close();
  }
}

// A ui/dist stand-in so the fleet server starts (the route under test is the API, but
// serveMeshUi refuses to start without a built bundle).
async function makeRepoRootWithDist(tmp) {
  const root = path.join(tmp, "ui-root");
  const dist = meshUiDist(root);
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await writeFile(path.join(dist, "index.html"), "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc.js\"></script></head><body><div id=\"root\"></div></body></html>\n", "utf8");
  await writeFile(path.join(dist, "assets", "index-abc.js"), "export const x = 1;\n", "utf8");
  return root;
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function snapshotTree(root) {
  const rows = [];
  async function walk(dir, rel) {
    for (const name of (await readdir(dir)).sort()) {
      const full = path.join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full, relPath);
        continue;
      }
      const bytes = await readFile(full);
      rows.push([relPath, bytes.length, createHash("sha256").update(bytes).digest("hex")]);
    }
  }
  await walk(root, "");
  return rows;
}

// Every table name plus its row count — the state proof for "no row was written".
async function tableRowCounts(env) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    return store.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()
      .map((row) => [row.name, store.db.prepare(`SELECT COUNT(*) AS n FROM "${row.name}"`).get().n]);
  } finally {
    store.close();
  }
}

// A registry node row exactly as `shapeGlobalStatus` receives it (the join-matrix lane).
function liveNode(nodeId, sessions) {
  return {
    nodeId,
    role: "worker",
    freshness: "live",
    presence: { nodeId, heartbeatAt: "2026-08-10T12:00:00.000Z", activeRuns: [], sessions, aofVersion: "0.1.0" },
  };
}

function wireSession(sessionId, fields = {}) {
  return {
    sessionId,
    workspaceId: fields.workspaceId ?? "ws-1",
    repo: fields.repo ?? "demo",
    assistant: fields.assistant ?? "claude-code",
    lastPingAt: fields.lastPingAt ?? "2026-08-10T12:00:00.000Z",
    workspaceHasRun: fields.workspaceHasRun ?? false,
  };
}

// The REAL shaper, over literal inputs shaped exactly as the query surface hands them.
function shapeWith({ nodes, assignments }) {
  return shapeGlobalStatus({
    paths: { databasePath: "/tmp/does-not-exist/global.db" },
    workProjection: { workspaces: [], items: [], errors: [], workspaceId: null },
    registry: { nodes, workspaces: [], errors: [] },
    assignments,
    now: "2026-08-10T12:00:00.000Z",
    cacheStalenessSeconds: 900,
  });
}

export const meshSessionIndexAttributionTests = [
  // ═══ Scenario: a free session is present, complete, and says so with an explicit
  //     null ═══════════════════════════════════════════════════════════════════════
  {
    name: "session-index/01 a FREE session (no assignment anywhere names it) is present and complete, with the key `workItem` present and the value JSON null — never omitted, never {}, never a fabricated ref",
    run: async () => withTemp("aof-session-index-free-", async (tmp) => {
      const { workspace, env } = await makeRepo(tmp);
      const published = await seedLiveNode(workspace, "node-a", [{ sessionId: "sess-A", repo: "demo" }]);
      await publishAll(workspace, env);

      const status = await queryGlobalMeshStatus({ env });
      const entry = status.sessions.find((row) => row.sessionId === "sess-A");

      assert.ok(entry, "the entry for `sess-A` is present — not dropped, not demoted");
      assert.equal(status.sessions.length, 1, "…and it is the only one (non-vacuous)");
      assert.deepEqual(Object.keys(entry), ENTRY_KEYS, "…carrying the ordered eight, so nothing about it is annotated as incomplete");

      assert.equal(Object.hasOwn(entry, "workItem"), true, "the key `workItem` is PRESENT");
      assert.strictEqual(entry.workItem, null, "…with the value JSON null");
      assert.equal(entry.workItem === undefined, false, "…not `undefined`");
      assert.notDeepEqual(entry.workItem, {}, "…not an empty object");
      // Survives the wire as an explicit null (an `undefined` would have vanished).
      const overTheWire = JSON.parse(JSON.stringify(entry));
      assert.equal("workItem" in overTheWire, true, "…and the key is still there after JSON serialisation");
      assert.strictEqual(overTheWire.workItem, null, "…still explicitly null");
      // Not a fabricated ref of any kind: nothing ref-shaped appears anywhere on it.
      assert.equal(/\d+\/\d+/.test(JSON.stringify(entry.workItem)), false, "…and no fabricated ref of any kind");

      // Every OTHER value on the entry is exactly what the session published.
      const source = published[0];
      for (const key of ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun"]) {
        assert.strictEqual(entry[key], source[key], `${key} is exactly what the session published`);
      }
      assert.equal(entry.nodeId, "node-a", "…and nodeId is the node that published it");
    }),
  },

  // ═══ Scenario: a session doing assignment work carries exactly the ref and the
  //     assignment id ══════════════════════════════════════════════════════════════
  {
    name: "session-index/01 a session doing assignment work carries EXACTLY { ref, assignmentId } — no title, status, workspace, state or timestamp — while the item's own title/status stay reachable from items[] on the ref",
    run: async () => withTemp("aof-session-index-join-", async (tmp) => {
      const { workspace, env, workspaceId } = await makeRepo(tmp);
      await seedLiveNode(workspace, "node-a", [{ sessionId: "sess-A" }]);
      await publishAll(workspace, env);
      const assignmentId = await seedAssignment(env, { itemRef: "48/03", workspaceId, targetNodeId: "node-a", sessionId: "sess-A" });

      const status = await queryGlobalMeshStatus({ env });
      const entry = status.sessions.find((row) => row.sessionId === "sess-A");
      assert.ok(entry, "the session is in the index");

      assert.deepEqual(entry.workItem, { ref: "48/03", assignmentId }, "the entry's workItem is { ref: \"48/03\", assignmentId: <that assignment's id> }");
      assert.deepEqual(Object.keys(entry.workItem), ["ref", "assignmentId"], "…carrying exactly those two keys and no more — no title, no status, no workspace id, no state, no timestamps");

      // The item's own facts are still reachable from the payload, joined on the ref —
      // the entry is self-sufficient for ROUTING; items[] remains the authority on the
      // item.
      const item = status.items.find((row) => row.ref === entry.workItem.ref);
      assert.ok(item, "the item is reachable from the payload's items[], joined on the ref");
      assert.equal(item.title, "The fleet-side session index", "…with its own title");
      assert.equal(item.status, "in-progress", "…and its own status");
      assert.equal(item.assignment.assignmentId, assignmentId, "…and its own assignment attachment, unchanged");
    }),
  },

  // ═══ Scenario Outline: an assignment joins only when BOTH the node and the session
  //     match ══════════════════════════════════════════════════════════════════════
  //  Driven through the REAL `shapeGlobalStatus`. Rows 4 and 5 are the reason this lane
  //  is not store-backed: `mapAssignmentRow` maps a missing `session_id` column to
  //  `null`, so a row with NO `sessionId` key at all can only be expressed here.
  ...[
    { case: "the genuine match", row: { targetNodeId: "node-1", sessionId: "sess-A" }, joins: true },
    { case: "same session id, different machine", row: { targetNodeId: "node-2", sessionId: "sess-A" }, joins: false },
    { case: "same machine, different session", row: { targetNodeId: "node-1", sessionId: "sess-B" }, joins: false },
    { case: "same machine, no session captured yet", row: { targetNodeId: "node-1" }, joins: false },
    { case: "same machine, null session id", row: { targetNodeId: "node-1", sessionId: null }, joins: false },
    { case: "no assignments at all", row: null, joins: false },
  ].map((example) => ({
    name: `session-index/01 the two-column join — ${example.case}: node-1/sess-A gets ${example.joins ? "the join" : "workItem null"}`,
    run: async () => {
      const assignments = example.row == null
        ? []
        : [{ assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", issuer: "control-a", state: "running", ...example.row }];
      const status = shapeWith({ nodes: [liveNode("node-1", [wireSession("sess-A")])], assignments });
      const entry = status.sessions.find((row) => row.nodeId === "node-1" && row.sessionId === "sess-A");
      assert.ok(entry, "the entry for node-1/sess-A exists either way — attribution never decides membership");

      if (example.joins) {
        assert.deepEqual(entry.workItem, { ref: "48/03", assignmentId: "asg-1" }, "the assignment joins");
      } else {
        assert.strictEqual(entry.workItem, null, "the assignment does NOT join — an absent or mismatched half is never a wildcard");
        assert.equal(Object.hasOwn(entry, "workItem"), true, "…and the key is still present, explicitly null");
      }
    },
  })),

  // An assignment naming a session on a node the index never saw adds NOTHING: an
  // assignment row is not a liveness fact (ADR-003 — membership is decided by presence
  // ALONE).
  {
    name: "session-index/01 an assignment that names a session nobody published adds no entry — the assignment decorates membership, it never creates it",
    run: async () => {
      const status = shapeWith({
        nodes: [liveNode("node-1", [wireSession("sess-A")])],
        assignments: [
          { assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", targetNodeId: "node-1", state: "running", sessionId: "sess-A" },
          { assignmentId: "asg-2", itemRef: "48/00", workspaceId: "ws-1", targetNodeId: "node-9", state: "running", sessionId: "sess-ghost" },
        ],
      });
      assert.equal(status.sessions.length, 1, "only the session PRESENCE put there is in the index");
      assert.equal(status.sessions[0].sessionId, "sess-A", "…the published one");
      assert.deepEqual(status.sessions[0].workItem, { ref: "48/03", assignmentId: "asg-1" }, "…decorated by its own assignment");
    },
  },

  // ═══ Scenario: the id on the session and the id on the assignment are ONE value ══
  {
    name: "session-index/01 the published session id and global_assignments.session_id are ONE byte-identical value — the join is an equality, and the session RECORD on disk carries no ref/itemRef/workItem/assignmentId",
    run: async () => withTemp("aof-session-index-authority-", async (tmp) => {
      const { workspace, env, home, workspaceId } = await makeRepo(tmp);
      // A real Claude Code session UUID shape — the value RESEARCH §2 measured as ONE
      // id with two producers.
      const uuid = "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9";
      await seedLiveNode(workspace, "node-a", [{ sessionId: uuid }]);
      await publishAll(workspace, env);
      const assignmentId = await seedAssignment(env, { itemRef: "48/03", workspaceId, targetNodeId: "node-a", sessionId: uuid });

      // The two ids, read from their two AUTHORITATIVE homes.
      const sessionDir = path.join(meshDir(workspace), "sessions");
      const leaves = (await readdir(sessionDir)).filter((entry) => entry.endsWith(".json"));
      assert.equal(leaves.length, 1, "exactly one session record on disk (non-vacuous)");
      const record = JSON.parse(await readFile(path.join(sessionDir, leaves[0]), "utf8"));

      const store = await openGlobalWorkProjectionStore({ env });
      let column;
      try {
        column = store.db.prepare("SELECT session_id FROM global_assignments WHERE assignment_id = ?").get(assignmentId).session_id;
      } finally {
        store.close();
      }

      assert.strictEqual(record.sessionId, uuid, "the session record carries the id the assistant issued, byte-for-byte");
      assert.strictEqual(column, uuid, "global_assignments.session_id carries the SAME bytes");
      assert.strictEqual(record.sessionId, column, "the two ids are byte-identical — one value, never two that need agreeing");

      const status = await queryGlobalMeshStatus({ env });
      const entry = status.sessions.find((row) => row.sessionId === uuid);
      assert.ok(entry, "the join succeeds on that equality alone");
      assert.deepEqual(entry.workItem, { ref: "48/03", assignmentId }, "…and yields the attribution");

      // ATTRIBUTION DERIVES ONTO THE SESSION AND IS STORED NOWHERE.
      for (const forbidden of ["ref", "itemRef", "workItem", "assignmentId"]) {
        assert.equal(Object.hasOwn(record, forbidden), false, `the session record on disk carries no \`${forbidden}\``);
      }
      assert.equal(/48\/03/.test(JSON.stringify(record)), false, "…and no item ref appears anywhere in it");

      // Divergence degrades to "unknown", never a guess: change the assignment's id and
      // the same session reads workItem: null rather than falling back to anything.
      const second = await openGlobalWorkProjectionStore({ env });
      try {
        updateAssignmentState(second, assignmentId, "running", { now: new Date().toISOString(), sessionId: `${uuid}-DIFFERENT` });
      } finally {
        second.close();
      }
      const afterDivergence = await queryGlobalMeshStatus({ env });
      const diverged = afterDivergence.sessions.find((row) => row.sessionId === uuid);
      assert.ok(diverged, "the session is STILL in the index — presence decides membership");
      assert.strictEqual(diverged.workItem, null, "…and an unmatched join degrades to null, never to a preferred/fallback id");

      // Nothing was written into the store by the read itself.
      assert.ok((await snapshotTree(home)).length > 0, "the isolated store genuinely holds files");
    }),
  },

  // ═══ Scenario: the global status payload gains `sessions` and nothing else moves ══
  {
    name: "session-index/01 GET /api/mesh/status (ephemeral port) gains a top-level `sessions` holding the index — every other top-level key is the pre-existing set, nodes[].presence.sessions[] is unchanged, and each item's assignment attachment is unchanged",
    run: async () => withTemp("aof-session-index-additive-", async (tmp) => {
      const { workspace, env, root, workspaceId } = await makeRepo(tmp);
      const publishedA = await seedLiveNode(workspace, "node-a", [
        { sessionId: "sess-A", repo: "demo", workspaceId: "ws-1" },
        { sessionId: "sess-B", repo: "demo", workspaceId: "ws-2", assistant: "codex" },
      ]);
      const publishedB = await seedLiveNode(workspace, "node-b", [{ sessionId: "sess-C", repo: "beta" }]);
      await publishAll(workspace, env);
      const assignmentId = await seedAssignment(env, { itemRef: "48/03", workspaceId, targetNodeId: "node-a", sessionId: "sess-A" });

      const uiRoot = await makeRepoRootWithDist(tmp);
      let server;
      try {
        let url;
        ({ server, url } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: uiRoot, scope: "global", globalStoreOptions: { env } }));
        assert.equal(server.address().address, "127.0.0.1", "the server bound loopback…");
        assert.notEqual(server.address().port, 4181, "…on an EPHEMERAL port, never the fleet's 4181");
        assert.notEqual(server.address().port, 4182, "…and never the control stream's 4182");

        const response = await fetch(new URL("/api/mesh/status", url));
        assert.equal(response.status, 200, "the read answers 200");
        const body = await response.json();

        // (a) the new key, holding the index array
        assert.ok(Array.isArray(body.sessions), "the response body has a top-level key `sessions` holding the index array");
        assert.equal(body.sessions.length, 3, "…with all three live sessions in it (non-vacuous)");

        // (b) its other top-level keys are exactly the set the shaper produced before
        //     this feature (see PRE_EXISTING_TOP_LEVEL_KEYS for the one departure from
        //     the feature's own enumeration, and why it is not papered over).
        const others = Object.keys(body).filter((key) => key !== "sessions");
        assert.deepEqual(others, PRE_EXISTING_TOP_LEVEL_KEYS, "the other top-level keys are exactly the pre-existing set, in their pre-existing order");
        for (const key of FEATURE_NAMED_TOP_LEVEL_KEYS) {
          assert.equal(Object.hasOwn(body, key), true, `…including every key the feature names (${key})`);
        }

        // (c) nodes[].presence.sessions[] is unchanged — the index does not replace or
        //     edit the per-node liveness it derives from. Compared against what the
        //     PRODUCER published, not against the payload itself.
        const nodeA = body.nodes.find((node) => node.nodeId === "node-a");
        const nodeB = body.nodes.find((node) => node.nodeId === "node-b");
        assert.deepEqual(nodeA.presence.sessions, publishedA, "node-a's presence.sessions[] is byte-unchanged from what it published");
        assert.deepEqual(nodeB.presence.sessions, publishedB, "node-b's presence.sessions[] is byte-unchanged from what it published");
        assert.equal(nodeA.freshness, "live", "…and the node rows keep their own derived facts");

        // (d) each item's own assignment attachment is unchanged — the index READS
        //     assignments, it never rewrites them.
        const item = body.items.find((row) => row.ref === "48/03");
        assert.equal(item.assignment.assignmentId, assignmentId, "the item's assignment attachment still names the row");
        assert.equal(item.assignment.state, "running", "…with its own state");
        assert.equal(item.assignment.sessionId, "sess-A", "…and its own captured session id, untouched");
        assert.equal(Object.hasOwn(item.assignment, "workItem"), false, "…and the assignment gained nothing from the index");
      } finally {
        if (server) await closeServer(server);
      }
    }),
  },

  // The shaper is PURE over its inputs: building the index mutates neither the node
  // rows it reads nor the assignment rows it joins.
  {
    name: "session-index/01 shaping the payload mutates neither the registry nodes nor the assignment rows it was handed",
    run: async () => {
      const nodes = [liveNode("node-1", [wireSession("sess-A"), wireSession(null, { repo: "beta" })])];
      const assignments = [{ assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", targetNodeId: "node-1", state: "running", sessionId: "sess-A" }];
      const nodesBefore = JSON.parse(JSON.stringify(nodes));
      const assignmentsBefore = JSON.parse(JSON.stringify(assignments));

      const status = shapeWith({ nodes, assignments });
      assert.equal(status.sessions.length, 1, "the index was genuinely built (non-vacuous)");

      assert.deepEqual(JSON.parse(JSON.stringify(nodes)), nodesBefore, "the registry node rows are byte-unchanged, sessions[] included");
      assert.deepEqual(JSON.parse(JSON.stringify(assignments)), assignmentsBefore, "the assignment rows are byte-unchanged");
    },
  },

  // ═══ Scenario: what the browser receives matches, at runtime, exactly what the wire
  //     type claims ═══════════════════════════════════════════════════════════════
  {
    name: "session-index/01 the SERVED sessions array matches the wire type at runtime — the ordered eight per element, a non-empty string id, a boolean run fact, workItem null-or-{ref,assignmentId} — and ten identical GETs change not one file",
    run: async () => withTemp("aof-session-index-served-", async (tmp) => {
      const { workspace, env, root, home, workspaceId } = await makeRepo(tmp);
      await seedLiveNode(workspace, "node-a", [
        { sessionId: "sess-A" },                                   // has an assignment
        { sessionId: "sess-free", repo: "beta", workspaceId: "ws-2" }, // free
        { sessionId: null, repo: "gamma", assistant: "codex" },    // anonymous — never reaches the array
      ]);
      await publishAll(workspace, env);
      const assignmentId = await seedAssignment(env, { itemRef: "48/03", workspaceId, targetNodeId: "node-a", sessionId: "sess-A" });

      const uiRoot = await makeRepoRootWithDist(tmp);
      let server;
      try {
        let url;
        ({ server, url } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: uiRoot, scope: "global", globalStoreOptions: { env } }));

        const body = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.equal(body.sessions.length, 2, "the two ADDRESSABLE sessions reach the array (the anonymous one does not)");

        for (const entry of body.sessions) {
          assert.deepEqual(Object.keys(entry), ENTRY_KEYS, "every element carries exactly the ordered eight");
          assert.equal(typeof entry.sessionId, "string", "every sessionId is a string");
          assert.ok(entry.sessionId.length > 0, "…and non-empty — an anonymous session never reaches this array");
          assert.equal(typeof entry.workspaceHasRun, "boolean", "every workspaceHasRun is a boolean");
          if (entry.workItem === null) continue;
          assert.deepEqual(Object.keys(entry.workItem), ["ref", "assignmentId"], "every non-null workItem is an object with exactly ref and assignmentId");
          assert.equal(typeof entry.workItem.ref, "string", "…a string ref");
          assert.equal(typeof entry.workItem.assignmentId, "string", "…and a string assignmentId");
        }
        assert.deepEqual(body.sessions.find((row) => row.sessionId === "sess-A").workItem, { ref: "48/03", assignmentId }, "the assigned session carries its join…");
        assert.strictEqual(body.sessions.find((row) => row.sessionId === "sess-free").workItem, null, "…and the free one an explicit null (both shapes really occur)");

        // The anonymous session is still COMPLETE on the node's own record.
        const node = body.nodes.find((row) => row.nodeId === "node-a");
        assert.equal(node.presence.sessions.length, 3, "all three sessions are still on the node's presence record");
        assert.equal(node.presence.sessions.filter((row) => row.sessionId === null).length, 1, "…the anonymous one included");

        // THE ROUTE IS A READ. "Changed not one file in the store" is asserted over the
        // STATE-BEARING files (every record the mesh keeps on disk) plus every table's
        // row count — deliberately NOT over the raw bytes of `projection.sqlite`, which
        // SQLite rewrites its own header bookkeeping in on any OPEN, read or not. A
        // byte compare there would fail on the engine's page metadata while proving
        // nothing about whether a row was written, which is the fact the scenario is
        // about.
        const treeBefore = await snapshotTree(home);
        const countsBefore = await tableRowCounts(env);
        const first = JSON.stringify(body.sessions);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const again = await (await fetch(new URL("/api/mesh/status", url))).json();
          assert.equal(JSON.stringify(again.sessions), first, `request ${attempt + 1} returns a byte-identical sessions array`);
        }
        const treeAfter = await snapshotTree(home);
        assert.deepEqual(
          treeAfter.filter((row) => !/\.sqlite(-wal|-shm|-journal)?$/.test(row[0])),
          treeBefore.filter((row) => !/\.sqlite(-wal|-shm|-journal)?$/.test(row[0])),
          "…and ten identical requests created, rewrote and removed not one record in the store",
        );
        assert.deepEqual(treeAfter.map((row) => row[0]), treeBefore.map((row) => row[0]), "…no file appeared or vanished either");
        assert.deepEqual(await tableRowCounts(env), countsBefore, "…and no row was written to any table");
      } finally {
        if (server) await closeServer(server);
      }
    }),
  },

  // …and the empty answer is PRESENT and empty, never omitted.
  {
    name: "session-index/01 a store holding no live sessions serves `sessions: []` — present and empty, so a consumer can tell \"nobody is working\" from \"this build does not report sessions\"",
    run: async () => withTemp("aof-session-index-empty-", async (tmp) => {
      const { workspace, env, root } = await makeRepo(tmp);
      const now = new Date().toISOString();
      await publishNodeRecord(workspace, "node-a", { nodeId: "node-a", host: "node-a", os: "win32", runtimes: ["claude"], skills: [], aofVersion: "0.1.0", publishedAt: now });
      await publishPresenceRecord(workspace, "node-a", { nodeId: "node-a", heartbeatAt: now, activeRuns: [], sessions: [], aofVersion: "0.1.0" });
      await publishAll(workspace, env, { now });

      const uiRoot = await makeRepoRootWithDist(tmp);
      let server;
      try {
        let url;
        ({ server, url } = await serveMeshUi({ projectDir: root, port: 0, repoRoot: uiRoot, scope: "global", globalStoreOptions: { env } }));
        const body = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.equal(Object.hasOwn(body, "sessions"), true, "`sessions` is PRESENT");
        assert.deepEqual(body.sessions, [], "…and empty — never omitted");
        assert.ok(body.nodes.some((node) => node.nodeId === "node-a" && node.freshness === "live"), "…on a payload that really did carry a live node (non-vacuous)");
      } finally {
        if (server) await closeServer(server);
      }
    }),
  },

  // The in-process half of the same contract: `buildSessionIndex` is directly callable
  // and its array form IS the key the payload carries — one spelling, not two.
  {
    name: "session-index/01 the payload's `sessions` array IS buildSessionIndex's own array form for the same inputs — one spelling of the index, and the lookup answers the same entries",
    run: async () => {
      const nodes = [liveNode("node-1", [wireSession("sess-A")]), liveNode("node-2", [wireSession("sess-B", { repo: "beta" })])];
      const assignments = [{ assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", targetNodeId: "node-2", state: "running", sessionId: "sess-B" }];

      const status = shapeWith({ nodes, assignments });
      const index = buildSessionIndex({ nodes: status.nodes, assignments, now: "2026-08-10T12:00:00.000Z" });

      assert.deepEqual(status.sessions, index.sessions, "the payload's array is exactly the index's array form");
      assert.deepEqual(index.lookup("node-2", "sess-B"), status.sessions.find((row) => row.sessionId === "sess-B"), "…and the lookup answers the very entry the wire carries");
      assert.deepEqual(index.lookup("node-2", "sess-B").workItem, { ref: "48/03", assignmentId: "asg-1" }, "…attribution included");
      assert.strictEqual(index.lookup("node-1", "sess-B"), null, "…while the same session id on the other machine is still a miss");
    },
  },
];
