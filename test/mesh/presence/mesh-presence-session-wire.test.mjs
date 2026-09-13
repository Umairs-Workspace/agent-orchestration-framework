// Traceability wiring for milestone 48 / story 01 — task 01
// (tasks/01_the-wire-stays-a-passthrough.feature): "a session entry crosses the fabric
// whole — the control node relays it, it does not re-specify it".
//
// THE JOURNEY IS THE GUARANTEE, so no scenario here inspects a single hop in
// isolation: an entry produced by the REAL `readLiveSessions` is assembled by the REAL
// `assemblePresenceRecord`, applied by the REAL control-side path
// (`applyStreamFrame` → `applyPresenceFrame`, src/control-stream-server.mjs — a file
// this milestone does not edit), published by the REAL `publishPresenceRecord`, merged
// by the REAL `queryGlobalRegistry` and served by the REAL `/api/mesh/status` route.
//
// The TypeScript DECLARATION check (that `PresenceSession` names exactly six keys with
// `sessionId: string | null`) is deliberately NOT here — this repo has no TypeScript
// compile gate a Gherkin scenario could stand on, so the scenario below asserts the
// RUNTIME shape of the SERVED payload and the declaration is pinned structurally by
// the fitness function `acd-session-entry-frozen-wire`.
//
// ISOLATION: a fresh `AOF_GLOBAL_HOME` temp dir per scenario. THE PORT TRAP: every
// server binds `port: 0` and reads `address().port` — never `:4181`/`:4182`, which the
// operator's live daemons hold.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyStreamFrame } from "../../../src/control-stream-server.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore, queryGlobalRegistry } from "../../../src/global-node-registry.mjs";
import { meshDir, publishNodeRecord } from "../../../src/mesh/store.mjs";
import { assemblePresenceRecord, readLiveSessions, readPresenceRecord } from "../../../src/mesh/presence.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { serveMeshUi, meshUiDist } from "../../../src/mesh/ui-serve.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const WORKER_NODE_ID = "worker-a";
const NOW = "2026-08-10T12:00:00.000Z";
// m48/ADR-005's frozen ordered six, plus m50/ADR-008 decision 8's APPENDED seventh
// (`relaying`, the worker's stated producer fact). A tail append is the growth that ADR
// permits; every key above it keeps its position, so this list still asserts the exact
// ordered entry the wire carries.
const FROZEN_SIX = ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "relaying"];

// ── fixtures ────────────────────────────────────────────────────────────────────

async function makeWorkspace(root, { name, nodeId, env }) {
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId } }, null, 2)}\n`,
    "utf8",
  );
  return loadWorkspace(root, undefined, { env });
}

// A REAL worker-side `sessions[]`: real session records on the WORKER's own isolated
// global home, projected by the REAL `readLiveSessions`. Never a hand-built entry —
// the whole point of the crossing is that the PRODUCER's entry survives it.
async function workerSessions(tmp, seeds, { workspacesWithRuns } = {}) {
  const home = path.join(tmp, "worker-home");
  const env = { AOF_GLOBAL_HOME: home };
  const ws = await makeWorkspace(path.join(tmp, "worker-repo"), { name: "worker", nodeId: WORKER_NODE_ID, env });
  for (const seed of seeds) {
    await startSession(ws, { nodeId: WORKER_NODE_ID, workspaceId: seed.workspaceId, repo: seed.repo, assistant: seed.assistant ?? "claude-code", sessionId: seed.sessionId ?? null, now: NOW });
    if (seed.sessionId !== undefined) await stampSessionId(ws, seed);
  }
  return readLiveSessions(ws, WORKER_NODE_ID, {
    now: NOW,
    ttlSeconds: 120,
    ...(workspacesWithRuns ? { workspacesWithRuns } : {}),
  });
}

// Story 48/00 owns the session record's `sessionId` producer and is being built in
// parallel; this story's projection is absence-tolerant by contract, so the fixture
// writes the record STATE the scenario names. Idempotent once the producer records it.
async function stampSessionId(ws, { workspaceId, assistant = "claude-code", sessionId }) {
  const dir = path.join(meshDir(ws), "sessions");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  for (const name of names) {
    const file = path.join(dir, name);
    const record = JSON.parse(await readFile(file, "utf8"));
    if (record.workspaceId !== workspaceId || record.assistant !== assistant) continue;
    if (record.sessionId === sessionId) return;
    await writeFile(
      file,
      JSON.stringify(
        {
          nodeId: record.nodeId,
          workspaceId: record.workspaceId,
          repo: record.repo,
          assistant: record.assistant,
          sessionId,
          startedAt: record.startedAt,
          lastPingAt: record.lastPingAt,
        },
        null,
        2,
      ),
      "utf8",
    );
    return;
  }
  assert.fail(`no session record on disk for ${workspaceId}/${assistant} to stamp`);
}

// The CONTROL node: an isolated global store, plus the workspace-shaped anchor the
// presence seam reads (exactly what applyPresenceFrame resolves internally).
async function withControl(fn) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-m48-session-wire-"));
  const home = path.join(tmp, "control-home");
  await mkdir(home, { recursive: true });
  const env = { AOF_GLOBAL_HOME: home };
  const store = await openGlobalWorkProjectionStore({ env });
  const presenceWorkspace = { globalMeshRoot: store.paths.meshRoot };
  try {
    return await fn({ tmp, home, env, store, presenceWorkspace });
  } finally {
    store.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

// Apply a presence frame through the REAL control-side path — the same entry point a
// worker's frame arrives on (`applyStreamFrame` dispatches `kind: "presence"` to
// `applyPresenceFrame`), with the connection-bound nodeId the server supplies.
async function applyPresence(store, presence, { nodeId = WORKER_NODE_ID } = {}) {
  return applyStreamFrame(store, { kind: "presence", nodeId, presence, at: NOW }, { now: NOW, nodeId });
}

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(path.join(dir, "index.html"), "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n", "utf8");
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

// Every DURABLE file under a directory, by CONTENT — the "changes not one file in the
// store" probe (content, not mtime: mtime is a filesystem fact, content is the store's).
//
// SQLite's `-shm`/`-wal` sidecars are EXCLUDED, and that exclusion is measured rather
// than assumed: opening a connection rewrites the shared-memory index header even for a
// pure read, so including them would assert something about SQLite's runtime rather than
// about this route. The durable `projection.sqlite` itself and every mesh RECORD file
// (presence/, nodes/, sessions/ — the JSON this milestone actually writes) are in scope,
// which is what the scenario's claim is about.
async function snapshotTree(dir) {
  const out = new Map();
  const isRuntimeSidecar = (name) => name.endsWith("-shm") || name.endsWith("-wal");
  async function walk(current, prefix) {
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(full, rel);
      else if (!isRuntimeSidecar(entry.name)) out.set(rel, (await readFile(full)).toString("base64"));
    }
  }
  await walk(dir, "");
  return out;
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

export const meshPresenceSessionWireTests = [
  // ══ Scenario: a six-key session entry goes in at the worker and comes out the other
  //    side intact ══
  {
    name: "mesh-presence-session-wire/01 a six-key session entry goes in at the worker and comes out the other side intact",
    async run() {
      await withControl(async ({ tmp, home, env, store, presenceWorkspace }) => {
        // The worker's OWN producer output — a genuine six-key entry with a run in its
        // workspace, so `workspaceHasRun: true` is a producer fact, not a literal.
        const sessions = await workerSessions(
          tmp,
          [{ workspaceId: "ws-A", repo: "alpha", sessionId: "sess-A" }],
          { workspacesWithRuns: new Set(["ws-A"]) },
        );
        assert.deepEqual(Object.keys(sessions[0]), FROZEN_SIX, "the worker's producer emitted the ordered six (the premise of the crossing)");
        assert.equal(sessions[0].workspaceHasRun, true, "…with workspaceHasRun true");

        const presence = assemblePresenceRecord({ nodeId: WORKER_NODE_ID, heartbeatAt: NOW, activeRuns: ["run-1"], sessions, aofVersion: "1.2.3", buildId: "payload abc1234" });
        const applied = await applyPresence(store, presence);
        assert.equal(applied.published, true, "the control published the frame");

        // HOP 1 — the record the control wrote.
        const saved = await readPresenceRecord(presenceWorkspace, WORKER_NODE_ID);
        assert.ok(saved, "the worker's presence crossed and was persisted");
        assert.equal(saved.sessions.length, 1, "the entry survived");
        assert.deepEqual(Object.keys(saved.sessions[0]), FROZEN_SIX, "the received entry's keys are exactly the ordered six");
        assert.equal(saved.sessions[0].sessionId, "sess-A", "sessionId is exactly `sess-A` — the value the worker published, byte-identical");
        assert.equal(saved.sessions[0].workspaceHasRun, true, "workspaceHasRun is still true");
        assert.equal(typeof saved.sessions[0].workspaceHasRun, "boolean", "…a boolean survived as a BOOLEAN, not as a string or a dropped key");
        assert.deepEqual(saved.sessions[0], sessions[0], "the whole entry is byte-equivalent to the one the worker published");

        // HOP 2 — the node's registry row.
        await publishNodeRecord(presenceWorkspace, WORKER_NODE_ID, { nodeId: WORKER_NODE_ID, host: WORKER_NODE_ID, os: "linux", runtimes: ["claude-code"], skills: [], aofVersion: "1.2.3", publishedAt: NOW });
        const registryWorkspace = await makeWorkspace(path.join(tmp, "control-repo"), { name: "control", nodeId: "control-a", env });
        await publishGlobalRegistryDescriptorsToStore(store, registryWorkspace, { now: NOW });
        const registry = await queryGlobalRegistry(store, { now: NOW });
        const row = registry.nodes.find((node) => node.nodeId === WORKER_NODE_ID);
        assert.ok(row, "the worker has a registry row");
        assert.deepEqual(row.presence.sessions[0], sessions[0], "the node's registry row carries the entry unchanged");

        // HOP 3 — the served payload.
        const repoRoot = path.join(tmp, "ui-root");
        await writeDist(meshUiDist(repoRoot));
        const { server } = await serveMeshUi({ projectDir: registryWorkspace.root ?? path.join(tmp, "control-repo"), port: 0, repoRoot, scope: "global", globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } } });
        try {
          const body = await (await fetch(`http://127.0.0.1:${server.address().port}/api/mesh/status`)).json();
          const served = body.nodes.find((node) => node.nodeId === WORKER_NODE_ID);
          assert.ok(served, "the worker surfaces on the served roster");
          assert.deepEqual(served.presence.sessions[0], sessions[0], "the served payload delivers the entry unchanged");
        } finally {
          await closeServer(server);
        }
      });
    },
  },

  // ══ Scenario: an entry carrying a key this milestone never heard of also survives ══
  {
    name: "mesh-presence-session-wire/01 an entry carrying a key this milestone never heard of also survives",
    async run() {
      await withControl(async ({ tmp, store, presenceWorkspace }) => {
        const [produced] = await workerSessions(tmp, [{ workspaceId: "ws-A", repo: "alpha", sessionId: "sess-A" }]);
        // The six the producer emits PLUS a key no code on this path knows.
        const entry = { ...produced, somethingLater: { shape: "unknown", n: 42 } };
        const presence = assemblePresenceRecord({ nodeId: WORKER_NODE_ID, heartbeatAt: NOW, activeRuns: [], sessions: [entry], aofVersion: "1.2.3" });

        await applyPresence(store, presence);
        const saved = await readPresenceRecord(presenceWorkspace, WORKER_NODE_ID);
        const received = saved.sessions[0];

        for (const key of FROZEN_SIX) {
          assert.deepEqual(received[key], produced[key], `the known key \`${key}\` survives with its value`);
        }
        assert.deepEqual(
          received.somethingLater,
          { shape: "unknown", n: 42 },
          "`somethingLater` survives with its value — the control RELAYS the entry, it does not re-specify it",
        );
        assert.deepEqual(Object.keys(received), [...FROZEN_SIX, "somethingLater"], "the entry crossed whole, in its own key order");
      });
    },
  },

  // ══ Scenario Outline: the entry-level guard still rejects what it rejects today
  //    (7 rows) ══
  {
    name: "mesh-presence-session-wire/01 the entry-level guard still rejects what it rejects today (Examples: 7 rows)",
    async run() {
      await withControl(async ({ tmp, store, presenceWorkspace }) => {
        const [good] = await workerSessions(tmp, [{ workspaceId: "ws-A", repo: "alpha", sessionId: "sess-A" }]);
        const rows = [
          { case: "the ordinary case", sessions: [good], expected: [good] },
          { case: "a null element", sessions: [null], expected: [] },
          { case: "a primitive element", sessions: ["not-an-object"], expected: [] },
          { case: "a nested array element", sessions: [[]], expected: [] },
          { case: "mixed good and bad", sessions: [good, null], expected: [good] },
          { case: "not an array at all", sessions: "sessions", expected: [] },
          { case: "absent entirely", sessions: undefined, expected: [] },
        ];
        for (const row of rows) {
          const nodeId = `worker-${rows.indexOf(row)}`;
          const presence = { nodeId, heartbeatAt: NOW, activeRuns: [], aofVersion: "1.2.3" };
          if (row.sessions !== undefined) presence.sessions = row.sessions;

          const applied = await applyPresence(store, presence, { nodeId });
          assert.equal(applied.published, true, `${row.case}: the record is still WRITTEN — a malformed sessions payload degrades the sessions list, it never fails the whole presence write`);

          const saved = await readPresenceRecord(presenceWorkspace, nodeId);
          assert.ok(saved, `${row.case}: the presence record exists on disk`);
          assert.deepEqual(saved.sessions, row.expected, `${row.case}: the published record's sessions is the expected result`);
          assert.deepEqual(Object.keys(saved), ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion"], `${row.case}: and the record's own frozen shape is unchanged`);
        }
      });
    },
  },

  // ══ Scenario: the presence record's own shape is untouched ══
  {
    name: "mesh-presence-session-wire/01 the presence record's own shape is untouched",
    async run() {
      await withControl(async ({ tmp, store, presenceWorkspace }) => {
        const sessions = await workerSessions(tmp, [{ workspaceId: "ws-A", repo: "alpha", sessionId: "sess-A" }]);
        const withBuild = assemblePresenceRecord({ nodeId: WORKER_NODE_ID, heartbeatAt: NOW, activeRuns: ["run-1"], sessions, aofVersion: "1.2.3", buildId: "payload abc1234" });
        await applyPresence(store, withBuild);
        const saved = await readPresenceRecord(presenceWorkspace, WORKER_NODE_ID);

        assert.deepEqual(
          Object.keys(saved),
          ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"],
          "the record's keys are nodeId, heartbeatAt, activeRuns, sessions, aofVersion in that order, with buildId present because the worker published one",
        );
        const keys = Object.keys(saved);
        assert.ok(keys.indexOf("sessions") < keys.indexOf("aofVersion"), "`sessions` still sits BEFORE `aofVersion` — the m38 position, unmoved");

        assert.ok(Array.isArray(saved.activeRuns), "activeRuns is still an array");
        for (const run of saved.activeRuns) assert.equal(typeof run, "string", "activeRuns is still a bare array of run-id STRINGS — no element became an object");

        // buildId is present ONLY when the worker published one.
        const noBuild = assemblePresenceRecord({ nodeId: "worker-b", heartbeatAt: NOW, activeRuns: [], sessions: [], aofVersion: "1.2.3" });
        await applyPresence(store, noBuild, { nodeId: "worker-b" });
        const savedNoBuild = await readPresenceRecord(presenceWorkspace, "worker-b");
        assert.deepEqual(Object.keys(savedNoBuild), ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion"], "a worker that published no buildId yields the five-key record");
        assert.deepEqual(savedNoBuild.sessions, [], "a node with no sessions still publishes `sessions: []` — present, never omitted");
        assert.ok(Object.hasOwn(savedNoBuild, "sessions"), "…the key is genuinely present");

        // A node that has NEVER beaten has no presence record at all.
        assert.equal(await readPresenceRecord(presenceWorkspace, "worker-never-beat"), null, "a node that has never beaten still has no presence record at all — this milestone does not fabricate one");
      });
    },
  },

  // ══ Scenario: the served payload's session entries match, at runtime, exactly what
  //    the wire type claims ══
  {
    name: "mesh-presence-session-wire/01 the served payload's session entries match, at runtime, exactly what the wire type claims",
    async run() {
      await withControl(async ({ tmp, home, env, store, presenceWorkspace }) => {
        // One node with one ADDRESSABLE session and one ANONYMOUS session, both from
        // the real producer (the anonymous one is a record with no id at all).
        const sessions = await workerSessions(tmp, [
          { workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", sessionId: "sess-A" },
          { workspaceId: "ws-B", repo: "beta", assistant: "codex" },
        ]);
        assert.equal(sessions.length, 2, "the producer emitted both sessions");

        const presence = assemblePresenceRecord({ nodeId: WORKER_NODE_ID, heartbeatAt: new Date().toISOString(), activeRuns: [], sessions, aofVersion: "1.2.3" });
        await applyPresence(store, presence);
        await publishNodeRecord(presenceWorkspace, WORKER_NODE_ID, { nodeId: WORKER_NODE_ID, host: WORKER_NODE_ID, os: "linux", runtimes: ["claude-code"], skills: [], aofVersion: "1.2.3", publishedAt: NOW });
        const controlWorkspace = await makeWorkspace(path.join(tmp, "control-repo"), { name: "control", nodeId: "control-a", env });
        await publishGlobalRegistryDescriptorsToStore(store, controlWorkspace, { now: NOW });

        const repoRoot = path.join(tmp, "ui-root");
        await writeDist(meshUiDist(repoRoot));
        const { server } = await serveMeshUi({ projectDir: path.join(tmp, "control-repo"), port: 0, repoRoot, scope: "global", globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } } });
        try {
          const port = server.address().port;
          assert.notEqual(port, 4181, "the fixture server binds an EPHEMERAL port, never the fleet's");
          assert.notEqual(port, 4182, "…nor the control stream's");

          const response = await fetch(`http://127.0.0.1:${port}/api/mesh/status`);
          assert.equal(response.status, 200);
          assert.match(response.headers.get("content-type") ?? "", /application\/json/, "the response is JSON");
          const text = await response.text();
          const body = JSON.parse(text);

          const node = body.nodes.find((entry) => entry.nodeId === WORKER_NODE_ID);
          assert.ok(node?.presence, "the served node carries its presence record");
          assert.equal(node.presence.sessions.length, 2, "both session entries reached the browser");
          for (const entry of node.presence.sessions) {
            assert.deepEqual(Object.keys(entry), FROZEN_SIX, "each session entry in the response carries exactly the six keys, in order");
            assert.equal(typeof entry.workspaceHasRun, "boolean", "every entry's workspaceHasRun is a boolean");
          }
          const addressable = node.presence.sessions.find((entry) => entry.workspaceId === "ws-A");
          const anonymous = node.presence.sessions.find((entry) => entry.workspaceId === "ws-B");
          assert.equal(typeof addressable.sessionId, "string", "the addressable session's sessionId is a string");
          assert.equal(anonymous.sessionId, null, "the anonymous session's sessionId is JSON null");
          assert.equal(Object.hasOwn(anonymous, "sessionId"), true, "…never absent");
          assert.notEqual(anonymous.sessionId, "null", "…and never the STRING \"null\"");
          assert.match(text, /"sessionId":\s*null/, "the JSON on the wire genuinely carries `sessionId: null` (not an omitted key)");

          // The route is a READ: ten calls, byte-identical session entries, and not one
          // file in the store changed.
          const before = await snapshotTree(home);
          const renderings = new Set();
          for (let i = 0; i < 10; i += 1) {
            const again = await (await fetch(`http://127.0.0.1:${port}/api/mesh/status`)).json();
            renderings.add(JSON.stringify(again.nodes.find((entry) => entry.nodeId === WORKER_NODE_ID).presence.sessions));
          }
          assert.equal(renderings.size, 1, "issuing the route ten times returns BYTE-IDENTICAL session entries");
          assert.equal([...renderings][0], JSON.stringify(node.presence.sessions), "…identical to the first response's");
          const after = await snapshotTree(home);
          // Non-vacuity: the probe genuinely reaches the store's durable files.
          assert.ok([...before.keys()].some((file) => file.endsWith(".sqlite")), "the probe covers the durable projection database");
          assert.ok([...before.keys()].some((file) => file.includes("presence/")), "the probe covers the presence record this route serves");
          assert.deepEqual([...after.keys()], [...before.keys()], "no file in the store appeared or disappeared");
          for (const [file, bytes] of before) {
            assert.equal(after.get(file), bytes, `the store file ${file} is byte-unchanged — the route is a read`);
          }
        } finally {
          await closeServer(server);
        }
      });
    },
  },
];
