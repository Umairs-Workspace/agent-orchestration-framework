// Traceability wiring for milestone 38 / story 00
// tasks/03_presence-aggregate-workspaces.feature — "presence aggregates across ALL
// the node's registered workspaces, not just the daemon's launch cwd".
//
// Every @executable scenario / Scenario Outline row is exercised against the REAL
// mesh-launcher.mjs assembleCurrentPresenceRecord path (via startLauncher's first
// publish — the ONLY production caller) over a hermetic fixture repo + a fixture
// AOF_GLOBAL_HOME (real fs, real SQLite via node:sqlite, no real machine state
// touched), with `global_node_workspaces` / `global_workspace_descriptors` rows
// seeded directly through the store (mirroring
// test/support/mesh-worker-exec-fixture.mjs's seedNodeWorkspaceMembership idiom,
// extended with the descriptor row resolveNodeWorkspaces needs). One test object
// per scenario. node:assert/strict.
//
// milestone 130 / story 03 / task 00 (00_presence-carries-the-loops.feature) — the launcher
// TICK's half of "both producers carry the key": the tick's record is what this machine
// actually publishes, so `loops` is asserted here on the REAL assembleCurrentPresenceRecord
// path — two workspaces' loops in workspace order, no key when none runs, the cached half of
// the union contributing none, and a workspace whose enumeration throws losing its loops
// and nothing else.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadWorkspace } from "../../../src/work.mjs";
import { startLauncher } from "../../../src/mesh/launcher.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { upsertWorkItemContent } from "../../../src/global-work-store.mjs";
import { listItems } from "../../../src/work.mjs";
import { workspaceIdFromPath } from "../../../src/workspace-identity.mjs";

const NODE_ID = "node-a";
const NOW = "2026-07-10T12:00:00.000Z";

function manualTicker() {
  const handles = [];
  return {
    handles,
    start(intervalSeconds, onTick) {
      const handle = { intervalSeconds, onTick, stopped: false };
      handles.push(handle);
      return handle;
    },
    stop(handle) { handle.stopped = true; },
  };
}

async function makeFixtureRepo({ withMilestone = true, workspaceId } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-presence-aggregate-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  if (withMilestone) {
    const milestoneDir = path.join(workDir, "38_milestone_demo");
    await mkdir(milestoneDir, { recursive: true });
    await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 38\nslug: demo\nstatus: in-progress\ntitle: Demo\n---\n", "utf8");
  }
  await mkdir(path.join(root, ".aof"), { recursive: true });
  // `workspaceId` (when supplied) PINS config.mesh.workspaceId so the launch-cwd's
  // derived workspaceId is a KNOWN literal a test can seed a session/run against
  // (else it is workspaceIdFor(projectRoot) — an opaque hash tests don't need for
  // the pre-existing scenarios below, which only assert on a SEPARATE, distinctly
  // resolved workspace's id, never the launch cwd's own).
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, fabric: "tailscale", ...(workspaceId ? { workspaceId } : {}) } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { tmp, root, home, workDir, env: { AOF_GLOBAL_HOME: home } };
}

// A separate, secondary workspace (its own project root/workDir) that gets
// REGISTERED for this node but is NOT the launch cwd — the "tray app launched from
// its install dir" case: a repo the node also works, not the daemon's own cwd.
async function makeSecondaryWorkspace(tmp, { slug = "second" } = {}) {
  const root = path.join(tmp, `repo-${slug}`);
  const workDir = path.join(root, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  return { root, workDir };
}

async function seedWorkspaceRegistration(env, { workspaceId, workDir, nodeId = NODE_ID }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    store.db.prepare(`
      INSERT OR REPLACE INTO global_workspace_descriptors
        (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, NULL, '[]', ?, ?)
    `).run(workspaceId, path.dirname(workDir), workDir, workspaceId, NOW, `descriptor-${workspaceId}.json`);
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(nodeId, workspaceId);
  } finally {
    store.close();
  }
}

// `brief` (130/03) — the record's brief, `{}` as always unless a scenario hands a
// `{ loop }` declaration in; `itemRef` follows the item dir's number so a loop entry's `ref`
// names the item that actually holds the run.
async function seedRunningRun(workDirRoot, itemDirName, runId, brief = {}) {
  const milestoneDir = path.join(workDirRoot, itemDirName);
  await mkdir(milestoneDir, { recursive: true });
  if (!(await pathExists(path.join(milestoneDir, "SPEC.md")))) {
    await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 99\nslug: demo\nstatus: in-progress\ntitle: Demo\n---\n", "utf8");
  }
  const runsDir = path.join(milestoneDir, "runs");
  await mkdir(runsDir, { recursive: true });
  const record = {
    runId, itemRef: itemDirName.split("_")[0], state: "running", attempt: 1, outcome: null,
    sessionId: null, brief, createdAt: NOW, updatedAt: NOW,
    failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null,
  };
  await writeFile(path.join(runsDir, `${runId}.json`), JSON.stringify(record, null, 2), "utf8");
}

// A usable `brief.loop` for `loopRunId` over `scope` — the five keys the declaration read
// requires plus the mint's other four.
function loopBrief(loopRunId, scope) {
  return { loop: { loopRunId, scope, level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: NOW, id: "loop-id", supervised: false } };
}

async function pathExists(p) {
  try {
    await (await import("node:fs/promises")).access(p);
    return true;
  } catch {
    return false;
  }
}

async function publishOnce(root, env, options = {}) {
  const ws = await loadWorkspace(root, undefined, { env });
  const handle = await startLauncher(ws, {
    exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
    platform: "linux",
    peerPollTicker: manualTicker(),
    propagationTicker: manualTicker(),
    streamServer: false,
    streamClient: false,
    now: () => NOW,
    globalWorkStoreOptions: { env },
    ...options,
  });
  handle.stop?.();
  return handle;
}

export const meshPresenceAggregateWorkspacesTests = [
  // ══ Scenario: presence unions active runs and live sessions across every registered workspace ══
  {
    name: "mesh-presence-aggregate-workspaces/03 presence unions active runs and live sessions across every registered workspace",
    async run() {
      const fixture = await makeFixtureRepo();
      try {
        const workspaceId1 = "ws-1";
        const second = await makeSecondaryWorkspace(fixture.tmp);
        const workspaceId2 = "ws-2";
        await seedWorkspaceRegistration(fixture.env, { workspaceId: workspaceId1, workDir: fixture.workDir });
        await seedWorkspaceRegistration(fixture.env, { workspaceId: workspaceId2, workDir: second.workDir });

        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-a1");
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: workspaceId2, repo: "second-repo", assistant: "claude-code", now: NOW });

        const handle = await publishOnce(fixture.root, fixture.env);
        assert.ok(handle.record.activeRuns.includes("run-a1"), "activeRuns includes the ws-1 run");
        assert.ok(handle.record.sessions.some((s) => s.workspaceId === workspaceId2), "sessions includes the ws-2 session");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Review F1 (MAJOR), AMENDED BY MILESTONE 48 / ADR-004 — the rule this test
  //    guards did not go away, it MOVED. m38 applied run-subsumption HERE, in the
  //    assembler, and asserted the session was DROPPED from the wire. m48 keeps the
  //    per-workspace attribution in the assembler (that half is untouched) but makes
  //    it a STAMP rather than a filter: the wire now carries EVERY live session so any
  //    of them is addressable as `(nodeId, sessionId)`, and the display rule is
  //    applied by `fleetCurrentWorkLines` over the `workspaceHasRun` fact. So this
  //    assertion INVERTS — the session is PRESENT and says the run exists — while
  //    activeRuns is byte-unchanged and the RENDERED line set is unchanged (proven at
  //    test/arch/session/acd-session-run-reconciliation.test.mjs, which renders this exact
  //    producer-fed shape). ══
  {
    name: "mesh-presence-aggregate-workspaces/03 REVIEW F1 (m48/ADR-004) — a run AND a live session on the SAME workspace: the assembled sessions[] KEEPS that session, stamped workspaceHasRun true, and activeRuns still carries the run",
    async run() {
      const fixture = await makeFixtureRepo({ workspaceId: "ws-1" }); // pin so the launch-cwd's derived id is the known literal "ws-1"
      try {
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-a1");
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "repo-1", assistant: "claude-code", now: NOW });

        const handle = await publishOnce(fixture.root, fixture.env);
        assert.ok(handle.record.activeRuns.includes("run-a1"), "activeRuns still carries ws-1's run");
        const session = handle.record.sessions.find((s) => s.workspaceId === "ws-1");
        assert.ok(session, "ws-1's session is PRESENT on the assembled sessions[] — the producer drops nothing (m48/ADR-004)");
        assert.equal(session.workspaceHasRun, true, "…and it carries the FACT the formatter needs: workspaceHasRun true");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: an unreachable global store degrades to the launch-cwd workspace, never a crash ══
  {
    name: "mesh-presence-aggregate-workspaces/03 an unreachable global store degrades to the launch-cwd workspace, never a crash",
    async run() {
      const fixture = await makeFixtureRepo();
      try {
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-cwd");
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        const handle = await startLauncher(ws, {
          exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
          platform: "linux",
          peerPollTicker: manualTicker(),
          propagationTicker: manualTicker(),
          streamServer: false,
          streamClient: false,
          now: () => NOW,
          // Deliberately point the store opener at a broken opener that always throws
          // (resolveNodeWorkspaces reads options.openStore top-level, mirroring
          // mesh-worker-execution.mjs's localNodeWorkspaceMembership convention).
          openStore: async () => { throw new Error("store unreachable"); },
        });
        assert.ok(handle.record.activeRuns.includes("run-cwd"), "the assembler falls back to the launch-cwd workspace only, still surfacing its own run");
        handle.stop();
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: the presence record is the UNION over the node's resolved workspaces ══
  {
    name: "mesh-presence-aggregate-workspaces/03 the presence record is the UNION over the node's resolved workspaces (launch-cwd always in) (Examples)",
    async run() {
      const rows = [
        { ws1: "nothing", ws2: "nothing", activeRuns: [], sessions: [], overall: "idle" },
        { ws1: "run", ws2: "nothing", activeRuns: ["run-1"], sessions: [], overall: "working" },
        { ws1: "nothing", ws2: "run", activeRuns: ["run-2"], sessions: [], overall: "working" },
        { ws1: "nothing", ws2: "session", activeRuns: [], sessions: ["ws-2"], overall: "working" },
        { ws1: "run", ws2: "session", activeRuns: ["run-1"], sessions: ["ws-2"], overall: "working" },
        { ws1: "session", ws2: "session", activeRuns: [], sessions: ["ws-1", "ws-2"], overall: "working" },
        { ws1: "run", ws2: "run", activeRuns: ["run-1", "run-2"], sessions: [], overall: "working" },
        // F3 — the dropped "nothing / an EXPIRED sess" row: an old lastPingAt, past
        // the resolved TTL, is TTL-filtered out by readLiveSessions before this
        // record is ever assembled — the workspace contributes nothing, idle.
        { ws1: "nothing", ws2: "expired-session", activeRuns: [], sessions: [], overall: "idle" },
      ];
      for (const row of rows) {
        // Pin the launch-cwd's workspaceId to the literal "ws-1" so a seeded ws-1
        // session/run is attributed to the SAME id this test asserts content
        // against (content-level assertions, F3 — not just the derived overall flag).
        const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
        try {
          const second = await makeSecondaryWorkspace(fixture.tmp);
          const workspaceId2 = "ws-2";
          await seedWorkspaceRegistration(fixture.env, { workspaceId: workspaceId2, workDir: second.workDir });
          const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });

          if (row.ws1 === "run") await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-1");
          if (row.ws1 === "session") await startSession(ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "repo-1", assistant: "claude-code", now: NOW });
          if (row.ws2 === "run") await seedRunningRun(second.workDir, "99_milestone_demo", "run-2");
          if (row.ws2 === "session") await startSession(ws, { nodeId: NODE_ID, workspaceId: workspaceId2, repo: "repo-2", assistant: "claude-code", now: NOW });
          if (row.ws2 === "expired-session") {
            // Started long before "now" — outside the resolved TTL window.
            await startSession(ws, { nodeId: NODE_ID, workspaceId: workspaceId2, repo: "repo-2", assistant: "claude-code", now: "2026-07-10T00:00:00.000Z" });
          }

          const handle = await publishOnce(fixture.root, fixture.env);
          assert.deepEqual([...handle.record.activeRuns].sort(), [...row.activeRuns].sort(), `ws1=${row.ws1} ws2=${row.ws2} → activeRuns ${JSON.stringify(row.activeRuns)}`);
          assert.deepEqual(handle.record.sessions.map((s) => s.workspaceId).sort(), [...row.sessions].sort(), `ws1=${row.ws1} ws2=${row.ws2} → sessions ${JSON.stringify(row.sessions)}`);
          const overall = handle.record.activeRuns.length > 0 || handle.record.sessions.length > 0 ? "working" : "idle";
          assert.equal(overall, row.overall, `ws1=${row.ws1} ws2=${row.ws2} → overall ${row.overall}`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario Outline: the read is failure-isolated — a degraded workspace never crashes the launcher tick ══
  {
    name: "mesh-presence-aggregate-workspaces/03 the read is failure-isolated — a degraded workspace never crashes the launcher tick (Examples)",
    async run() {
      // (a) the global store cannot be opened — reads the launch-cwd workspace only.
      {
        const fixture = await makeFixtureRepo();
        try {
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-cwd-only");
          const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
          const handle = await startLauncher(ws, {
            exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
            platform: "linux", peerPollTicker: manualTicker(), propagationTicker: manualTicker(), streamServer: false, streamClient: false, now: () => NOW,
            openStore: async () => { throw new Error("unreachable"); },
          });
          assert.ok(handle.record.activeRuns.includes("run-cwd-only"));
          handle.stop();
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
      // (b) a registered workspace whose descriptor no longer resolves to a workDir on disk is skipped.
      {
        const fixture = await makeFixtureRepo();
        try {
          const missingWorkDir = path.join(fixture.tmp, "vanished", "wiki", "work");
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-1", workDir: fixture.workDir });
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-vanished", workDir: missingWorkDir });
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-resolvable");
          const handle = await publishOnce(fixture.root, fixture.env);
          assert.ok(handle.record.activeRuns.includes("run-resolvable"), "the resolvable workspace still aggregates");
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
      // (c) a node registered for zero workspaces reads the launch-cwd workspace only.
      {
        const fixture = await makeFixtureRepo();
        try {
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-only-cwd");
          const handle = await publishOnce(fixture.root, fixture.env);
          assert.ok(handle.record.activeRuns.includes("run-only-cwd"));
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
      // (d) F3 — ws-2's workDir exists but its item enumeration THROWS: skips ws-2's
      // items and keeps ws-1 (per-workspace isolation). The real production
      // listItems never throws (work.mjs's own readDirSafe swallows every readdir
      // fault) — this drives the fault via the injected options.listItems seam
      // (mesh-launcher.mjs) so the per-workspace try/catch is genuinely exercised.
      {
        const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
        try {
          const second = await makeSecondaryWorkspace(fixture.tmp, { slug: "throws" });
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-2", workDir: second.workDir });
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-ws1-survives");

          const handle = await publishOnce(fixture.root, fixture.env, {
            listItems: async (workDir) => {
              if (workDir === second.workDir) throw new Error("simulated item-enumeration fault for ws-2");
              const { listItems: realListItems } = await import("../../../src/work.mjs");
              return realListItems(workDir);
            },
          });
          assert.ok(handle.record.activeRuns.includes("run-ws1-survives"), "ws-2's item-enumeration fault is isolated — ws-1's own run still aggregates");
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
      // (e) F3 — global_node_workspaces has ws-1, ws-2, ws-3 (3 rows): aggregates
      // all three resolvable workspaces.
      {
        const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
        try {
          const second = await makeSecondaryWorkspace(fixture.tmp, { slug: "second" });
          const third = await makeSecondaryWorkspace(fixture.tmp, { slug: "third" });
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-2", workDir: second.workDir });
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-3", workDir: third.workDir });
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-ws1");
          await seedRunningRun(second.workDir, "99_milestone_demo", "run-ws2");
          await seedRunningRun(third.workDir, "77_milestone_demo", "run-ws3");

          const handle = await publishOnce(fixture.root, fixture.env);
          assert.deepEqual([...handle.record.activeRuns].sort(), ["run-ws1", "run-ws2", "run-ws3"], "all three resolvable workspaces aggregate");
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario: a workspace whose descriptor no longer resolves is skipped, not crashed, and the rest still aggregate ══
  {
    name: "mesh-presence-aggregate-workspaces/03 a workspace whose descriptor no longer resolves is skipped, not crashed, and the rest still aggregate",
    async run() {
      const fixture = await makeFixtureRepo();
      try {
        const missingWorkDir = path.join(fixture.tmp, "gone-repo", "wiki", "work");
        await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-1", workDir: fixture.workDir });
        await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-2", workDir: missingWorkDir });
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
        await startSession(ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "repo-1", assistant: "claude-code", now: NOW });

        const handle = await publishOnce(fixture.root, fixture.env);
        assert.ok(handle.record.sessions.some((s) => s.workspaceId === "ws-1"), "sessions includes the ws-1 session");
        assert.ok(!handle.record.sessions.some((s) => s.workspaceId === "ws-2"), "ws-2 contributes nothing — it is skipped, not an error");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 00 — the launcher tick's `loops` (130/ADR-005 §2)
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // A usable declaration (the declaration read's five-key rule plus the mint's other four).
  // ══ Scenario Outline: both producers carry the key — the TICK's rows (the verb's are in
  //    mesh-presence-record.test.mjs) ══
  {
    name: "presence-carries-the-loops/00 the launcher tick carries `loops` LAST with one entry per workspace loop, workspace ids in aggregation order, and no key at all when nothing runs (Examples)",
    async run() {
      // (a) ws-1 running under L1 and a second registered workspace ws-2 with its own running L2:
      //     TWO entries from the tick, workspaceId ws-1 then ws-2, `loops` the LAST key.
      {
        const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
        try {
          const second = await makeSecondaryWorkspace(fixture.tmp);
          await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-2", workDir: second.workDir });
          await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-1", loopBrief("L1", "38"));
          await seedRunningRun(second.workDir, "99_milestone_demo", "run-2", loopBrief("L2", "99"));
          const handle = await publishOnce(fixture.root, fixture.env);
          const keys = Object.keys(handle.record);
          assert.equal(keys.at(-1), "loops", `loops is the LAST key — got ${JSON.stringify(keys)}`);
          assert.deepEqual(handle.record.loops.map((entry) => [entry.workspaceId, entry.loopRunId, entry.scope, entry.ref, entry.runId]), [["ws-1", "L1", "38", "38", "run-1"], ["ws-2", "L2", "99", "99", "run-2"]], "two entries, in aggregation order, each stamped with its own workspace");
          assert.deepEqual([...handle.record.activeRuns].sort(), ["run-1", "run-2"], "activeRuns is untouched — the same two runs, bare ids");
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
      // (b) none running: no `loops` key at all — the six keys byte-identical to today.
      {
        const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
        try {
          const handle = await publishOnce(fixture.root, fixture.env);
          assert.ok(!("loops" in handle.record), `no loops key when no loop runs — got ${JSON.stringify(Object.keys(handle.record))}`);
          assert.deepEqual(Object.keys(handle.record), ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"], "the six keys, in order");
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario: the cached half of the union contributes no loop ══
  {
    name: "presence-carries-the-loops/00 the cached half of the union contributes no loop — a cache-known running run on a ref this machine does not hold rides activeRuns and no loop entry names it",
    async run() {
      const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
      try {
        // The cache-first enumeration answers a row with no local `dir` for a ref another node
        // authored; the union then reads the cache's run RECORDS for it. Seeded under the id the
        // cache read resolves for the aggregation row (the launcher's own derivation).
        const cachedId = workspaceIdFromPath(fixture.workDir);
        const store = await openGlobalWorkProjectionStore({ env: fixture.env });
        try {
          upsertWorkItemContent(store, cachedId, {
            runs: [{ ref: "77", runId: "run-cached", record: { runId: "run-cached", itemRef: "77", state: "running", brief: loopBrief("L-remote", "77"), createdAt: NOW, updatedAt: NOW } }],
            nodeId: "aof-wsl",
          }, { now: NOW });
        } finally {
          store.close();
        }
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-local", loopBrief("L1", "38"));
        const handle = await publishOnce(fixture.root, fixture.env, {
          listItems: async (workDir) => [...await listItems(workDir), { ref: "77" }],
        });
        assert.ok(handle.record.activeRuns.includes("run-cached"), `the cached run rides activeRuns — got ${JSON.stringify(handle.record.activeRuns)}`);
        assert.ok(handle.record.activeRuns.includes("run-local"), "…beside the local one");
        assert.deepEqual(handle.record.loops.map((entry) => entry.loopRunId), ["L1"], "the loop entries name the LOCAL loop only — a loop is local by definition");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: a workspace whose items cannot be enumerated loses its loops, not the tick ══
  {
    name: "presence-carries-the-loops/00 a workspace whose items cannot be enumerated loses its loops, not the tick — the first workspace's entry rides, the second's does not, and the record is published",
    async run() {
      const fixture = await makeFixtureRepo({ workspaceId: "ws-1" });
      try {
        const second = await makeSecondaryWorkspace(fixture.tmp, { slug: "throws" });
        await seedWorkspaceRegistration(fixture.env, { workspaceId: "ws-2", workDir: second.workDir });
        await seedRunningRun(fixture.workDir, "38_milestone_demo", "run-1", loopBrief("L1", "38"));
        await seedRunningRun(second.workDir, "99_milestone_demo", "run-2", loopBrief("L2", "99"));
        const handle = await publishOnce(fixture.root, fixture.env, {
          listItems: async (workDir) => {
            if (workDir === second.workDir) throw new Error("simulated item-enumeration fault for ws-2");
            return listItems(workDir);
          },
        });
        assert.deepEqual(handle.record.loops.map((entry) => [entry.workspaceId, entry.loopRunId]), [["ws-1", "L1"]], "ws-2's loop is lost with its runs; ws-1's rides");
        assert.deepEqual(handle.record.activeRuns, ["run-1"], "…and the tick completed with ws-1's run");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
