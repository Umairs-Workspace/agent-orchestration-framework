// Traceability wiring for milestone 48 / story 02 — task 00
// (tasks/00_the-wire-carries-every-live-session.feature): "every live session reaches
// the wire, including the one whose workspace has a run in flight".
//
// FED BY THE REAL PRODUCER (m38/ADR-008). Every scenario drives the REAL presence
// assembler — `startLauncher`'s first publish, the ONE production caller of
// `assembleCurrentPresenceRecord` (src/mesh/launcher.mjs) — over a hermetic fixture
// repo holding REAL run records and REAL session records (written by the real
// `startSession`). No scenario hands the assembler a pre-built sessions array; the
// only literal in the fixture is the situation itself.
//
// WHAT THIS TASK CHANGED, at source: `src/mesh/launcher.mjs` used to publish
// `(await readLiveSessions(...)).filter((session) => !workspacesWithRuns.has(session.workspaceId))`
// — m38/ADR-004's DISPLAY rule implemented on the WIRE, which dropped a session at
// exactly the moment its node picked up work. m48/ADR-004 deletes that filter and
// hands the run set DOWN to `readLiveSessions` (ADR-009: the stamp lands in the
// projection's ONE home), so the wire carries the FACT and the formatter applies the
// rule. What the fleet RENDERS is task 01's suite
// (test/mesh/fleet/mesh-fleet-session-subsumption-render.test.mjs); the structural halves are the
// amended fitness function test/arch/session/acd-session-run-reconciliation.test.mjs.
//
// ISOLATION IS MANDATORY: every scenario builds its own `AOF_GLOBAL_HOME` temp dir
// (the fixture writes real session and run records) and removes it afterwards. The
// clock is INJECTED (`now: () => NOW`), so run state and session liveness are facts of
// the fixture, never of wall time. Nothing here binds a port — the launcher is started
// with `streamServer: false` / `streamClient: false`.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadWorkspace } from "../../../src/work.mjs";
import { startLauncher } from "../../../src/mesh/launcher.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { setDegradeSinkForTest } from "../../../src/degrade.mjs";

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";
const WS_A = "ws-A";
const WS_B = "ws-B";

function manualTicker() {
  return {
    start(intervalSeconds, onTick) {
      return { intervalSeconds, onTick, stopped: false };
    },
    stop(handle) { handle.stopped = true; },
  };
}

// A hermetic repo whose launch-cwd workspaceId is PINNED to `ws-A`, so a seeded run
// and a seeded session can be attributed to the same known literal.
async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-m48-wire-complete-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, fabric: "tailscale", workspaceId: WS_A } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { tmp, root, home, workDir, env: { AOF_GLOBAL_HOME: home } };
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
}

// A SECOND registered workspace for this node (its own project root / work dir), so
// "a run in one repo, a session in another" is two genuinely distinct workspaces.
async function registerSecondWorkspace(fixture, workspaceId = WS_B) {
  const root = path.join(fixture.tmp, `repo-${workspaceId}`);
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  const store = await openGlobalWorkProjectionStore({ env: fixture.env });
  try {
    store.db.prepare(`
      INSERT OR REPLACE INTO global_workspace_descriptors
        (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, NULL, '[]', ?, ?)
    `).run(workspaceId, root, workDir, workspaceId, NOW, `descriptor-${workspaceId}.json`);
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(NODE_ID, workspaceId);
  } finally {
    store.close();
  }
  return { root, workDir };
}

// A REAL run record on disk, in whatever state the row names. `running` is the sole
// in-flight state the assembler counts (queued is pre-running; done/failed/cancelled
// are terminal) — this helper never encodes that rule, it just writes the record.
async function seedRun(workDirRoot, { itemDir = "48_milestone_demo", runId, state = "running" }) {
  const milestoneDir = path.join(workDirRoot, itemDir);
  await mkdir(path.join(milestoneDir, "runs"), { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 48\nslug: demo\nstatus: in-progress\ntitle: Demo\n---\n", "utf8");
  const record = {
    runId, itemRef: "48", state, attempt: 1, outcome: null,
    sessionId: null, brief: {}, createdAt: NOW, updatedAt: NOW,
    failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null,
  };
  await writeFile(path.join(milestoneDir, "runs", `${runId}.json`), JSON.stringify(record, null, 2), "utf8");
}

// A REAL session record, written by the REAL producer.
async function seedSession(ws, { workspaceId, repo, assistant = "claude-code", sessionId }) {
  await startSession(ws, { nodeId: NODE_ID, workspaceId, repo, assistant, sessionId, now: NOW });
}

// ONE publish through the REAL launcher — its first tick's assembled presence record.
async function assembleOnce(fixture, options = {}) {
  const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
  const handle = await startLauncher(ws, {
    exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
    platform: "linux",
    peerPollTicker: manualTicker(),
    propagationTicker: manualTicker(),
    streamServer: false,
    streamClient: false,
    now: () => NOW,
    globalWorkStoreOptions: { env: fixture.env },
    ...options,
  });
  handle.stop?.();
  return handle.record;
}

function sessionsIn(record, workspaceId) {
  return record.sessions.filter((session) => session.workspaceId === workspaceId);
}

export const meshLauncherSessionWireCompleteTests = [
  // ══ Scenario: a live session in a workspace that also has a running run is PRESENT
  //    on the wire, and says so ══
  {
    name: "mesh-launcher-session-wire-complete/00 a live session in a workspace that also has a running run is PRESENT on the wire, and says so",
    async run() {
      await withFixture(async (fixture) => {
        await seedRun(fixture.workDir, { runId: "run-a1" });
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await seedSession(ws, { workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" });

        const record = await assembleOnce(fixture);

        const [session] = sessionsIn(record, WS_A);
        assert.ok(session, "sessions[] CONTAINS that session — it is not dropped");
        assert.equal(session.sessionId, "sess-A", "its sessionId is exactly `sess-A`, so the session is addressable as (nodeId, sessionId)");
        assert.equal(session.workspaceHasRun, true, "its workspaceHasRun is true — the wire carries the FACT, and leaves the rule to whoever renders");
        assert.equal(typeof session.workspaceHasRun, "boolean", "…as a BOOLEAN, never a truthy stand-in");
        assert.ok(record.activeRuns.includes("run-a1"), "activeRuns still carries that run's id, unchanged — an addition to the wire, never a substitution");
        assert.deepEqual(record.activeRuns, ["run-a1"], "…and nothing else moved on activeRuns");
      });
    },
  },

  // ══ Scenario Outline: the cases that already worked keep working, unchanged ══
  //    Rows 1 and 2 are m38/ADR-004's own producer-fed cases and their assertions are
  //    unchanged by this milestone — which is what makes "the rendered behaviour is
  //    preserved" a measurement rather than a claim.
  {
    name: "mesh-launcher-session-wire-complete/00 the cases that already worked keep working, unchanged (Examples: session-only / different repos / same repo / both across two workspaces)",
    async run() {
      const rows = [
        {
          case: "a session with no run at all",
          runs: [],
          sessions: [{ workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" }],
          expectSessions: [{ workspaceId: WS_A, workspaceHasRun: false }],
          expectRuns: [],
        },
        {
          case: "a run and a session in DIFFERENT repos",
          runs: [{ workspaceId: WS_A, runId: "run-a1" }],
          sessions: [{ workspaceId: WS_B, repo: "beta", sessionId: "sess-B" }],
          expectSessions: [{ workspaceId: WS_B, workspaceHasRun: false }],
          expectRuns: ["run-a1"],
        },
        {
          case: "run and session in the same repo",
          runs: [{ workspaceId: WS_A, runId: "run-a1" }],
          sessions: [{ workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" }],
          expectSessions: [{ workspaceId: WS_A, workspaceHasRun: true }],
          expectRuns: ["run-a1"],
        },
        {
          case: "both, across two workspaces",
          runs: [{ workspaceId: WS_A, runId: "run-a1" }],
          sessions: [
            { workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" },
            { workspaceId: WS_B, repo: "beta", sessionId: "sess-B" },
          ],
          expectSessions: [{ workspaceId: WS_A, workspaceHasRun: true }, { workspaceId: WS_B, workspaceHasRun: false }],
          expectRuns: ["run-a1"],
        },
      ];
      for (const row of rows) {
        await withFixture(async (fixture) => {
          const second = await registerSecondWorkspace(fixture);
          const workDirFor = (workspaceId) => (workspaceId === WS_A ? fixture.workDir : second.workDir);
          for (const run of row.runs) await seedRun(workDirFor(run.workspaceId), { runId: run.runId });
          const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
          for (const session of row.sessions) await seedSession(ws, session);

          const record = await assembleOnce(fixture);

          assert.deepEqual(
            record.sessions.map((session) => ({ workspaceId: session.workspaceId, workspaceHasRun: session.workspaceHasRun }))
              .sort((a, b) => (a.workspaceId < b.workspaceId ? -1 : 1)),
            row.expectSessions,
            `${row.case}: sessions[] contains exactly the expected entries, each carrying the expected stamp`,
          );
          assert.deepEqual([...record.activeRuns].sort(), [...row.expectRuns].sort(), `${row.case}: activeRuns is unchanged by this milestone`);
        });
      }
    },
  },

  // ══ Scenario: two live sessions in one run-bearing workspace both survive, both
  //    stamped ══
  {
    name: "mesh-launcher-session-wire-complete/00 two live sessions in one run-bearing workspace both survive, both stamped",
    async run() {
      await withFixture(async (fixture) => {
        await seedRun(fixture.workDir, { runId: "run-a1" });
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        // Two sessions in ONE workspace — the shape story 48/00's per-session record
        // key made possible (same node, same workspace, same assistant, two ids).
        await seedSession(ws, { workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" });
        await seedSession(ws, { workspaceId: WS_A, repo: "alpha", sessionId: "sess-B" });

        const record = await assembleOnce(fixture);

        const inA = sessionsIn(record, WS_A);
        assert.deepEqual(inA.map((session) => session.sessionId).sort(), ["sess-A", "sess-B"], "sessions[] contains both, with their own ids");
        for (const session of inA) {
          assert.equal(session.workspaceHasRun, true, `both carry workspaceHasRun true (${session.sessionId}) — the fact describes the workspace, not the session that got there first`);
        }
        assert.deepEqual(record.activeRuns, ["run-a1"], "activeRuns still carries exactly the one run");
      });
    },
  },

  // ══ Scenario Outline: the run fact follows the same run-state rule `activeRuns`
  //    follows ══ — one rule, two outputs: whatever counts as an active run for
  //    activeRuns counts for the stamp. A second definition here is how the two would
  //    drift apart, so every row asserts BOTH outputs off the same record.
  {
    name: "mesh-launcher-session-wire-complete/00 the run fact follows the same run-state rule activeRuns follows (Examples: running / queued / done / failed / cancelled)",
    async run() {
      const rows = [
        { case: "in flight", state: "running", stamp: true, inActiveRuns: true },
        { case: "not started yet", state: "queued", stamp: false, inActiveRuns: false },
        { case: "finished", state: "done", stamp: false, inActiveRuns: false },
        { case: "failed", state: "failed", stamp: false, inActiveRuns: false },
        { case: "cancelled", state: "cancelled", stamp: false, inActiveRuns: false },
      ];
      for (const row of rows) {
        await withFixture(async (fixture) => {
          await seedRun(fixture.workDir, { runId: "run-a1", state: row.state });
          const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
          await seedSession(ws, { workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" });

          const record = await assembleOnce(fixture);

          const [session] = sessionsIn(record, WS_A);
          assert.ok(session, `${row.case}: the session is on the wire whatever the run state — subsumption is never a removal`);
          assert.equal(session.workspaceHasRun, row.stamp, `${row.case} (${row.state}): the session's workspaceHasRun is ${row.stamp}`);
          assert.equal(record.activeRuns.includes("run-a1"), row.inActiveRuns, `${row.case} (${row.state}): activeRuns ${row.inActiveRuns ? "contains that run" : "does not contain it"}`);
        });
      }
    },
  },

  // ══ Scenario: a session read fault still degrades to an empty list, never a crashed
  //    tick ══
  //
  // HOW THE FAULT IS DRIVEN, and why it has to be injected. Every real read under
  // `readLiveSessions` is absence-tolerant BY CONTRACT — `readSessionRecordsForNode`
  // swallows a readdir fault (→ []) and skips a torn file — so no filesystem state can
  // make the session read throw, and the launcher's catch would be untestable. The
  // fault therefore rides the one option the launcher passes STRAIGHT THROUGH and
  // ONLY `readLiveSessions` consumes: `options.config`, read exactly once at
  // `resolveSessionTtlSeconds(options.config)` (src/mesh/presence.mjs). Nothing else in
  // the launcher reads it, so the blast radius of the injected fault is exactly the
  // session read — the same "drive the fault through an existing options seam" shape
  // test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs uses for `options.listItems`.
  {
    name: "mesh-launcher-session-wire-complete/00 a session read fault still degrades to an empty list, never a crashed tick",
    async run() {
      await withFixture(async (fixture) => {
        await seedRun(fixture.workDir, { runId: "run-a1" });
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await seedSession(ws, { workspaceId: WS_A, repo: "alpha", sessionId: "sess-A" });

        // NON-VACUITY FIRST: without the fault this fixture genuinely publishes a
        // session, so the empty list below is a DEGRADE and not an empty fixture.
        const healthy = await assembleOnce(fixture);
        assert.equal(healthy.sessions.length, 1, "the same fixture publishes one session when the read succeeds");

        const events = [];
        setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
        let record;
        try {
          record = await assembleOnce(fixture, {
            config: new Proxy({}, { get() { throw Object.assign(new Error("session read fault"), { code: "EIO" }); } }),
          });
        } finally {
          setDegradeSinkForTest(undefined);
        }

        assert.ok(record, "the record is still produced");
        assert.deepEqual(record.sessions, [], "…with `sessions: []`");
        assert.deepEqual(record.activeRuns, ["run-a1"], "activeRuns is unaffected");
        assert.equal(record.heartbeatAt, healthy.heartbeatAt, "…and so is the heartbeat");
        assert.deepEqual(
          { nodeId: record.nodeId, activeRuns: record.activeRuns, heartbeatAt: record.heartbeatAt },
          { nodeId: healthy.nodeId, activeRuns: healthy.activeRuns, heartbeatAt: healthy.heartbeatAt },
          "the rest of the record is byte-identical to the healthy tick's — only the sessions were skipped",
        );

        const degrade = events.find((event) => event.code === "mesh-launcher");
        assert.ok(degrade, "the fault was reported through the coded-degrade channel rather than swallowed");
        assert.equal(degrade.level, "degrade", "…as a degrade event");
        assert.match(degrade.message, /session read fault/, "…carrying the fault's own message");
      });
    },
  },
];
