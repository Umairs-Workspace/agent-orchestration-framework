import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 167 / story 06 (local runs reach the store through the ledger):
//   .../06_story_local-runs-reach-the-store-through-the-ledger/tasks/00_a-run-reaches-the-store-through-the-ledger.feature (@executable)
//   .../06_story_local-runs-reach-the-store-through-the-ledger/tasks/01_presence-reads-runs-from-the-store.feature (@executable)
//
// WHAT CHANGED, at source (167/ADR-008). Every 15 s the daemon read a runs/ folder for each of
// about 1,800 items, twice, to say what was running here, and that alone held `mesh serve` at 12%
// of a core while idle. Now `run.started` and `run.completed` carry a `publish-run` step
// (packages/mesh/src/effects.mjs) that puts the run's record into `work_item_runs` with this node as
// its reporter, and the presence tick reads this node's running rows from the store
// (`readStoreActivity`, packages/mesh/src/presence.mjs) in one query over the tick's shared handle.
//
// HOW IT IS DRIVEN. R1's runs start and end through the REAL CLI (`aof work run-start`,
// `aof work run-complete`, `aof work doctor --converge`) spawned against a hermetic mesh-enabled
// workspace under its own AOF_GLOBAL_HOME, because the subject is the ledger a verb writes; E3 and
// E7 go through the run store's transition seam in-process where the CLI has no verb for the
// precondition (a stale-run reclaim; a loop-driven run whose heartbeat moves). R2's ticks drive
// the REAL launcher (`startLauncher`) over an injected ticker and read back the presence record it
// published. Nothing here binds a port.
//
// E4, A NOTE FOR THE RECORD. The scenario pairs "the store cannot be opened" with the run-start
// VERB. m43/ADR-003 R1.4 makes the item-lock guard FAIL CLOSED when the store cannot be opened in a
// mesh-enabled workspace, so that verb refuses the mint rather than minting past a lock it cannot
// evaluate — a locked contract this story does not reopen. The property the scenario names (the
// run starts, the row is owed, the row lands when the store returns) is therefore proven at the
// transition seam the verb wraps: the fact is written and the event appended, the drain finds the
// store gone, the step stays owed, and `doctor --converge` pays it. Handed back in STATE.md.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const startLauncher = _aofApplication.mesh.launcher.startLauncher;
const readPresenceRecord = _aofApplication.mesh.presence.readPresenceRecord;
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const readWorkItemRuns = _aofApplication.mesh.store.readWorkItemRuns;
const publishWorkItemRun = _aofApplication.mesh.store.publishWorkItemRun;
const transitionRunStart = _aofApplication.execution.transitions.transitionRunStart;
const transitionStaleRunsReclaimed = _aofApplication.execution.transitions.transitionStaleRunsReclaimed;
const heartbeat = _aofApplication.execution.runs.heartbeat;
const openEffectsJournal = _aofApplication.effects.journal.openEffectsJournal;
const readUnsettledSteps = _aofApplication.effects.journal.readUnsettledSteps;
const drainEffects = _aofApplication.effects.dispatcher.drainEffects;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

const NODE_ID = "node-7297";
const OTHER_NODE = "node-2976";
const WS = "ws-aof";
const NOW = "2026-10-21T09:00:00.000Z";
const HEARTBEAT = "2026-10-21T09:00:10.000Z";
const ITEM_REF = "01/00";

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

// The Background: an isolated global home for this node, and a mesh-enabled workspace "aof" with
// item 01/00 (milestone 01, story 00), registered on node-7297. Its config pins the node and the
// workspace id so every row this suite reads is keyed on a known literal.
async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-167-06-"));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "aof");
  const workDir = path.join(root, "wiki", "work");
  const milestoneDir = path.join(workDir, "01_milestone_demo");
  const storyDir = path.join(milestoneDir, "stories", "00_story_demo");
  await mkdir(storyDir, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "aof", work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId: NODE_ID, fabric: "tailscale", workspaceId: WS } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await writeFile(path.join(milestoneDir, "SPEC.md"), `${frontmatter({ type: "milestone", number: '"01"', slug: "demo", status: "in-progress", title: '"Demo"', created: "2026-10-21", updated: "2026-10-21" })}# 01 · Demo\n`, "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), `${frontmatter({ type: "story", number: "00", slug: "demo", parent: "01", status: "not-started", title: '"Demo story"', created: "2026-10-21", updated: "2026-10-21" })}# 00 · Demo story\n`, "utf8");
  const storeEnv = { AOF_GLOBAL_HOME: home };
  // The spawned CLI's environment: the isolated home, and never the run a driving shell may have
  // put in THIS process's environment — under AOF_RUN_ID a verb answers "driven" and writes nothing.
  const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
  delete env.AOF_RUN_ID;
  const fixture = { tmp, home, root, workDir, milestoneDir, storyDir, env, storeEnv, item: { ref: ITEM_REF, dir: storyDir, type: "story" } };
  await registerWorkspace(fixture, { workspaceId: WS, workDir });
  return fixture;
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
}

async function registerWorkspace(fixture, { workspaceId, workDir, nodeId = NODE_ID }) {
  const store = await openGlobalWorkProjectionStore({ env: fixture.storeEnv });
  try {
    store.db.prepare(`
      INSERT OR REPLACE INTO global_workspace_descriptors
        (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, NULL, '[]', ?, ?)
    `).run(workspaceId, path.dirname(path.dirname(workDir)), workDir, workspaceId, NOW, `descriptor-${workspaceId}.json`);
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(nodeId, workspaceId);
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------- the CLI, the real one ----

function runCli(fixture, args, { cwd = fixture.root } = {}) {
  const result = spawnCliSync(process.execPath, ["--no-warnings", cliPath, ...args], { cwd, encoding: "utf8", env: fixture.env });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// `aof work run-start <ref>` in "aof" — the minted record, from the verb's own --json envelope.
function runStartCli(fixture, ref = ITEM_REF) {
  const result = runCli(fixture, ["work", "run-start", ref, "--json"]);
  assert.equal(result.status, 0, `run-start ${ref} exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

function runCompleteCli(fixture, ref = ITEM_REF, outcome = "done") {
  const result = runCli(fixture, ["work", "run-complete", ref, "--outcome", outcome, "--json"]);
  assert.equal(result.status, 0, `run-complete ${ref} exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

// `aof work doctor --converge` in "aof" — reconciles the file stores and drains everything owed.
function convergeCli(fixture) {
  const result = runCli(fixture, ["work", "doctor", "--converge", "--json"]);
  assert.equal(result.status, 0, `doctor --converge exits 0 (stderr: ${result.stderr})`);
  return result;
}

// ---------------------------------------------------------------- the store, read back ----

async function storeRows(fixture, ref = ITEM_REF, workspaceId = WS) {
  const store = await openGlobalWorkProjectionStore({ env: fixture.storeEnv });
  try {
    return readWorkItemRuns(store, workspaceId, ref);
  } finally {
    store.close();
  }
}

// The seam's options for an in-process transition in "aof": the workspace (what makes the publish
// reactors reachable), m43/ADR-003's lock context, and the isolated home on both the journal and
// the store.
function seamOptions(fixture, workspace, extra = {}) {
  return {
    workspace,
    lock: { workspaceId: WS, byAssignment: null, globalWorkStoreOptions: { env: fixture.storeEnv } },
    journalOptions: { env: fixture.storeEnv },
    publisherOptions: { globalWorkStoreOptions: { env: fixture.storeEnv } },
    ...extra,
  };
}

// A hand-written RUNNING record on disk — a run the ledger never saw. The shape is the store's own
// seventeen keys, partitioned under its node as every record has been since 132.
async function writeRunRecord(itemDir, { runId, itemRef, node = NODE_ID, brief = {}, at = new Date().toISOString(), state = "running" }) {
  const dir = path.join(itemDir, "runs", node);
  await mkdir(dir, { recursive: true });
  const record = {
    runId, itemRef, state, attempt: 1, outcome: null, sessionId: null, brief, createdAt: at, updatedAt: at,
    failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null, node, resumeAfter: null, spend: null, asks: [],
  };
  await writeFile(path.join(dir, `${runId}.json`), JSON.stringify(record, null, 2), "utf8");
  return record;
}

function loopBrief(loopRunId, scope) {
  return { loop: { loopRunId, scope, level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: NOW, id: "loop-id", supervised: false } };
}

// ---------------------------------------------------------------- the launcher, the real one ----

// An injected ticker whose ticks the test fires by hand: `tick()` runs every registered callback
// once and awaits it, which for the propagation ticker is one whole presence-and-sync pass.
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
    async tick() {
      for (const handle of handles) await handle.onTick();
    },
  };
}

const tailscaleExec = async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: NODE_ID, DNSName: `${NODE_ID}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 });

// Start the launcher from `root` (default "aof") on node-7297 over injected tickers. Its start is
// the first tick; `tick()` runs one more and answers the presence record it published.
async function startNode(fixture, root = fixture.root, options = {}) {
  const ws = await loadWorkspace(root, undefined, { env: fixture.storeEnv });
  const propagation = manualTicker();
  const handle = await startLauncher(ws, {
    exec: tailscaleExec,
    platform: "linux",
    peerPollTicker: manualTicker(),
    propagationTicker: propagation,
    streamServer: false,
    streamClient: false,
    now: () => NOW,
    globalWorkStoreOptions: { env: fixture.storeEnv },
    ...options,
  });
  assert.equal(handle.record.nodeId, NODE_ID, "the launcher publishes as node-7297");
  return {
    ws,
    record: handle.record,
    async tick() {
      await propagation.tick();
      return await readPresenceRecord(ws, NODE_ID);
    },
    stop: () => handle.stop(),
  };
}

export const meshPresenceReadsRunsFromTheStoreTests = [
  // ════════════════ task 00 · R1 — a run on this node reaches the store when it starts and when it ends
  {
    name: "167/06 E1 · a started run is in the store, running, reported by this node",
    async run() {
      await withFixture(async (fixture) => {
        const started = runStartCli(fixture);
        const rows = await storeRows(fixture);
        assert.equal(rows.length, 1, `one row for ${ITEM_REF} (got ${JSON.stringify(rows)})`);
        assert.equal(rows[0].record.runId, started.runId, "the row is the minted run");
        assert.equal(rows[0].record.state, "running", "…in state running");
        assert.equal(rows[0].nodeId, NODE_ID, "…reported by node-7297");
      });
    },
  },
  {
    name: "167/06 E2 · a completed run's row reads its outcome",
    async run() {
      await withFixture(async (fixture) => {
        const started = runStartCli(fixture);
        runCompleteCli(fixture, ITEM_REF, "done");
        const rows = await storeRows(fixture);
        const row = rows.find((entry) => entry.record.runId === started.runId);
        assert.ok(row, "the started run's row is still there");
        assert.equal(row.record.state, "done", "…and reads state done");
        assert.equal(row.record.outcome, "done", "…with its outcome");
      });
    },
  },
  {
    name: "167/06 E3 · a reclaimed run's row is no longer running",
    async run() {
      await withFixture(async (fixture) => {
        const started = runStartCli(fixture);
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.storeEnv });
        // Silent past the staleness threshold: an hour on, with a one-minute threshold.
        const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const settled = await transitionStaleRunsReclaimed([fixture.item], { now: later, stalenessThreshold: 60_000 }, seamOptions(fixture, ws));
        assert.equal(settled.length, 1, "the stale run is the one reclaimed");
        assert.equal(settled[0].record.runId, started.runId);
        const rows = await storeRows(fixture);
        const row = rows.find((entry) => entry.record.runId === started.runId);
        assert.ok(row, "the run's row is in the store");
        assert.notEqual(row.record.state, "running", `the row no longer reads running (got ${row.record.state})`);
        assert.equal(row.record.state, "failed", "…it reads the reclaimed state");
        assert.equal(row.record.failureReason, "runtime_offline");
      });
    },
  },
  {
    name: "167/06 E4 · a store that cannot be opened delays the row and never refuses the run",
    async run() {
      await withFixture(async (fixture) => {
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.storeEnv });
        // The run starts: the fact is written and its event appended. The drain is withheld —
        // the process "died" before paying — so the step is owed exactly as a crash would leave it.
        const { record, eventId } = await transitionRunStart(fixture.item, { node: NODE_ID }, seamOptions(fixture, ws, { drain: false }));
        assert.equal(record.state, "running", "the run is started");
        assert.ok(eventId, "run.started rode the journal");
        assert.deepEqual(await storeRows(fixture), [], "…and nothing has reached the store yet");

        // The global store cannot be opened: a directory squats on the database path.
        const dbPath = path.join(fixture.home, "mesh", "work", "projection.sqlite");
        for (const suffix of ["", "-wal", "-shm"]) await rm(`${dbPath}${suffix}`, { force: true });
        await mkdir(dbPath, { recursive: true });

        const journal = await openEffectsJournal({ env: fixture.storeEnv });
        try {
          const outcomes = await drainEffects({ journal, eventId, ctx: { publisherOptions: { globalWorkStoreOptions: { env: fixture.storeEnv } } } });
          const publishRun = outcomes.find((outcome) => outcome.key === "publish-run");
          assert.ok(publishRun, "publish-run was attempted");
          assert.equal(publishRun.status, "failed", `publish-run failed against the unopenable store (${publishRun.error ?? ""})`);
          const owed = readUnsettledSteps(journal, { key: "publish-run" });
          assert.ok(owed.some((step) => step.eventId === eventId && step.status === "failed"), `its publish step is owed in the journal (got ${JSON.stringify(owed.map((step) => [step.eventId, step.status]))})`);
        } finally {
          journal.close();
        }

        // The store can be opened again, and the owed steps drain (the operator's explicit retry
        // runs what is owed now, past 164/ADR-006's backoff).
        await rm(dbPath, { recursive: true, force: true });
        convergeCli(fixture);
        const rows = await storeRows(fixture);
        assert.equal(rows.length, 1, `the run's row landed on the drain (got ${JSON.stringify(rows)})`);
        assert.equal(rows[0].record.runId, record.runId);
        assert.equal(rows[0].record.state, "running");
        assert.equal(rows[0].nodeId, NODE_ID);
      });
    },
  },
  {
    name: "167/06 E5 · a run recorded before the ledger carried runs reaches the store by reconciling",
    async run() {
      await withFixture(async (fixture) => {
        // The ledger exists (a run on the milestone gave it its first event), and 01/00 has a
        // running record on disk with no run.started event in the journal.
        runStartCli(fixture, "01");
        const runId = "20261021T100000000Z-0000";
        await writeRunRecord(fixture.storyDir, { runId, itemRef: ITEM_REF });
        assert.deepEqual(await storeRows(fixture), [], "the hand-written run is not in the store");

        convergeCli(fixture);

        const rows = await storeRows(fixture);
        assert.equal(rows.length, 1, `the reconciler's backfill put it in the store (got ${JSON.stringify(rows)})`);
        assert.equal(rows[0].record.runId, runId);
        assert.equal(rows[0].record.state, "running");
        assert.equal(rows[0].nodeId, NODE_ID);
      });
    },
  },

  // ════════════════ task 01 · R2 — the presence tick reads what is running from the store
  {
    name: "167/06 E6 · a large workspace costs no runs-folder read",
    async run() {
      await withFixture(async (fixture) => {
        // 1,800 items: 1,799 bulk milestones, EACH with a hand-written running run on disk that the
        // ledger never saw, beside milestone 01 and its story. If the tick read any item's runs/
        // folder it would find 1,799 running runs; the one it may know is the one that went
        // through `aof work run-start`.
        const bulk = [];
        for (let n = 2; n <= 1800; n += 1) {
          const dir = path.join(fixture.workDir, `${String(n).padStart(4, "0")}_milestone_bulk`);
          bulk.push(dir);
          await mkdir(dir, { recursive: true });
          await writeFile(path.join(dir, "SPEC.md"), `${frontmatter({ type: "milestone", number: `"${String(n).padStart(4, "0")}"`, slug: "bulk", status: "in-progress", title: '"Bulk"', created: "2026-10-21", updated: "2026-10-21" })}# Bulk\n`, "utf8");
          await writeRunRecord(dir, { runId: `run-bulk-${n}`, itemRef: String(n).padStart(4, "0") });
        }
        const items = (await readdir(fixture.workDir)).length;
        assert.ok(items >= 1800, `the workspace holds at least 1,800 items (${items})`);
        const started = runStartCli(fixture);

        const node = await startNode(fixture);
        try {
          assert.deepEqual(node.record.activeRuns, [started.runId], `the presence record's active runs are exactly the ledger-started run — no runs folder was read (got ${node.record.activeRuns.length} runs)`);
          assert.ok(bulk.every((dir) => existsSync(path.join(dir, "runs", NODE_ID))), "…while every bulk item's hand-written running run is still on disk");
        } finally {
          await node.stop();
        }
      });
    },
  },
  {
    name: "167/06 E7 · a running loop's last activity is its latest heartbeat",
    async run() {
      await withFixture(async (fixture) => {
        const ws = await loadWorkspace(fixture.root, undefined, { env: fixture.storeEnv });
        // A loop-driven run, started through the seam (its row lands with heartbeatAt null)…
        const { record } = await transitionRunStart(fixture.item, { node: NODE_ID, brief: loopBrief("L1", "01") }, seamOptions(fixture, ws));
        // …whose record's heartbeat then moves on disk, as the heartbeat writes it: no event.
        await heartbeat(fixture.item, record.runId, { now: HEARTBEAT });
        const [row] = await storeRows(fixture);
        assert.equal(row.record.heartbeatAt, null, "the store's copy carries no heartbeat — the heartbeat raised no event");

        const node = await startNode(fixture);
        try {
          const entry = (node.record.loops ?? []).find((loop) => loop.loopRunId === "L1");
          assert.ok(entry, `the presence record carries the loop entry (got ${JSON.stringify(node.record.loops)})`);
          assert.equal(entry.runId, record.runId);
          assert.equal(entry.workspaceId, WS);
          assert.equal(entry.lastActivityAt, HEARTBEAT, "its last activity is the record's latest heartbeat, read off the run's own record");
          assert.deepEqual(node.record.activeRuns, [record.runId]);
        } finally {
          await node.stop();
        }
      });
    },
  },
  {
    name: "167/06 E8 · another node's running row is not this node's active run",
    async run() {
      await withFixture(async (fixture) => {
        const store = await openGlobalWorkProjectionStore({ env: fixture.storeEnv });
        try {
          const record = { runId: "run-other-node", itemRef: ITEM_REF, state: "running", attempt: 1, outcome: null, sessionId: null, brief: {}, createdAt: NOW, updatedAt: NOW, failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null, node: OTHER_NODE, resumeAfter: null, spend: null, asks: [] };
          const published = await publishWorkItemRun(store, { config: { mesh: { workspaceId: WS } } }, { ref: ITEM_REF, runId: "run-other-node", record }, { now: NOW, nodeId: OTHER_NODE });
          assert.equal(published.published, true);
          assert.equal(published.nodeId, OTHER_NODE, "the row is reported by node-2976");
        } finally {
          store.close();
        }
        const node = await startNode(fixture);
        try {
          assert.ok(!node.record.activeRuns.includes("run-other-node"), "node-2976's running row is not in node-7297's active runs");
          assert.deepEqual(node.record.activeRuns, [], "…and nothing else is running here");
        } finally {
          await node.stop();
        }
      });
    },
  },
  {
    name: "167/06 E9 · a workspace that does not propagate is not in this node's presence",
    async run() {
      await withFixture(async (fixture) => {
        // "scratch": a workspace with no mesh enablement, holding a running run on disk.
        const scratchRoot = path.join(fixture.tmp, "scratch");
        const scratchItem = path.join(scratchRoot, "wiki", "work", "05_milestone_scratch");
        await mkdir(path.join(scratchRoot, ".aof"), { recursive: true });
        await mkdir(scratchItem, { recursive: true });
        await writeFile(path.join(scratchRoot, ".aof", "aof.config.json"), `${JSON.stringify({ name: "scratch", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, fabric: "tailscale" } }, null, 2)}\n`, "utf8");
        await writeFile(path.join(scratchItem, "SPEC.md"), `${frontmatter({ type: "milestone", number: '"05"', slug: "scratch", status: "in-progress", title: '"Scratch"', created: "2026-10-21", updated: "2026-10-21" })}# Scratch\n`, "utf8");
        await writeRunRecord(scratchItem, { runId: "run-scratch", itemRef: "05" });

        const node = await startNode(fixture, scratchRoot);
        try {
          assert.ok(!node.record.activeRuns.includes("run-scratch"), "the non-propagating workspace's run is not in this node's presence");
          assert.deepEqual(node.record.activeRuns, []);
        } finally {
          await node.stop();
        }
      });
    },
  },
  {
    name: "167/06 · a completed run leaves the presence record on the next tick",
    async run() {
      await withFixture(async (fixture) => {
        const started = runStartCli(fixture);
        const node = await startNode(fixture);
        try {
          assert.deepEqual(node.record.activeRuns, [started.runId], "the run is in the presence record's active runs");
          runCompleteCli(fixture, ITEM_REF, "done");
          const next = await node.tick();
          assert.ok(next, "the next tick published a record");
          assert.deepEqual(next.activeRuns, [], "the presence record's active runs are empty");
        } finally {
          await node.stop();
        }
      });
    },
  },
];
