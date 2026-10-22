import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
// Traceability wiring for milestone 164 / story 01 (the desktop app syncs every workspace):
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/00_every-tick-syncs-every-registered-workspace.feature (@executable)
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/01_the-daemon-catches-up-when-it-starts.feature (@executable)
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/03_a-torn-node-record-never-empties-membership.feature (@executable @bug)
// and for milestone 167 / story 03 (a permanent fault is said once and backed off) and story 07 (an idle tick walks nothing):
//   .../03_story_a-permanent-fault-is-said-once-and-backed-off/tasks/00_a-permanent-failure-is-said-once.feature (@executable)
//   .../03_story_a-permanent-fault-is-said-once-and-backed-off/tasks/01_a-gone-registration-stops-costing.feature (@executable)
//
// The launcher is started with an INJECTED fabric exec, an injected propagation ticker and a stub
// control-stream server (the real one binds the fleet port this machine's daemon holds), from a
// folder with no aof config — the desktop app's launch — over an isolated global home in which two
// mesh-propagating workspaces are registered on this node. Every assertion reads the projection
// store or the effects journal at the source. A fired tick is awaited by polling its observable
// outcome, never by sleeping.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createCostMeter } from "@aof/foundation/cost-meter";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const startLauncher = _aofApplication.mesh.launcher.startLauncher;
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const syncWorkspace = _aofApplication.mesh.globalWorkPublisher.syncWorkspace;
const publishNodeRecord = _aofHooks.meshStore.publishNodeRecord;

const NODE = "node-7297";
const AOF = { id: "ws-aof", dir: "aof", milestone: "164", story: "00" };
const TEST_REPO = { id: "ws-aof-test-repo", dir: "aof-test-repo", milestone: "01", story: "00" };
const STATUS_FIXTURE = {
  BackendState: "Running",
  Self: { HostName: NODE, DNSName: `${NODE}.tail.ts.net.`, TailscaleIPs: ["100.64.0.1"], Online: true },
  Peer: {},
};

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

function storyPath(fx, workspace) {
  return path.join(fx.tmp, workspace.dir, "wiki", "work", `${workspace.milestone}_milestone_m${workspace.milestone}`, "stories", `${workspace.story}_story_s${workspace.story}`, "STORY.md");
}

async function setStory(fx, workspace, status) {
  await writeFile(storyPath(fx, workspace), frontmatter({ type: "story", number: workspace.story, slug: `s${workspace.story}`, parent: workspace.milestone, status, title: `Story ${workspace.milestone}/${workspace.story}`, schema: 1 }), "utf8");
}

async function writeWorkspace(fx, workspace, { propagates = true } = {}) {
  const root = path.join(fx.tmp, workspace.dir);
  const milestone = path.join(root, "wiki", "work", `${workspace.milestone}_milestone_m${workspace.milestone}`);
  await mkdir(path.dirname(storyPath(fx, workspace)), { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), frontmatter({ type: "milestone", number: workspace.milestone, slug: `m${workspace.milestone}`, status: "in-progress", title: `Milestone ${workspace.milestone}`, schema: 1 }), "utf8");
  await setStory(fx, workspace, "not-started");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const mesh = { ...(propagates ? { enabled: true } : {}), nodeId: NODE, workspaceId: workspace.id };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: workspace.dir, work: { dir: "./wiki/work" }, mesh }, null, 2)}\n`, "utf8");
  return root;
}

// Registration: the descriptor and this node's membership, exactly the two rows the presence
// tick's `resolveNodeWorkspaces` reads.
async function register(fx, workspace) {
  const store = await openGlobalWorkProjectionStore({ env: fx.env });
  try {
    const root = path.join(fx.tmp, workspace.dir);
    store.db.prepare(`INSERT OR REPLACE INTO global_workspace_descriptors (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, ?, '[]', '2026-10-19T09:00:00.000Z', ?)`).run(workspace.id, root, path.join(root, "wiki", "work"), workspace.dir, NODE, path.join(root, "descriptor.json"));
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(NODE, workspace.id);
  } finally {
    store.close();
  }
}

function manualTicker() {
  const handles = [];
  return {
    start(intervalSeconds, onTick) { const handle = { intervalSeconds, onTick, stopped: false }; handles.push(handle); return handle; },
    stop(handle) { handle.stopped = true; },
    fire() { return handles[0].onTick(); }, // the tick's own promise, so a caller can await it
    handles,
  };
}

async function until(predicate, what, { timeoutMs = 15000, everyMs = 10 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  for (;;) {
    try { last = await predicate(); if (last) return last; } catch (error) { last = error; }
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${what}${last instanceof Error ? ` — ${last.message}` : ""}`);
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
}

function read(fx, file, sql, ...params) {
  const databasePath = path.join(fx.home, "mesh", "work", file);
  if (!existsSync(databasePath)) return [];
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try { return db.prepare(sql).all(...params).map((row) => ({ ...row })); } finally { db.close(); }
}
const row = (fx, workspace, ref) => read(fx, "projection.sqlite", "SELECT status, node_id AS nodeId FROM work_items WHERE workspace_id = ? AND ref = ?", workspace.id, ref)[0] ?? null;
const rowsOf = (fx, workspace) => read(fx, "projection.sqlite", "SELECT ref, status, node_id AS nodeId, updated_at AS at FROM work_items WHERE workspace_id = ? ORDER BY ref", workspace.id);
const marks = (fx) => read(fx, "journal.sqlite", "SELECT event_id AS eventId, payload FROM events WHERE name = 'workspace.changed' ORDER BY rowid").map((event) => ({ ...event, workspaceId: JSON.parse(event.payload).workspaceId }));

// The fixture: an isolated home that is THE global home for the body, the two workspaces written
// and registered, and a launch folder with no aof config of its own.
async function withMesh(body, { testRepoPropagates = true } = {}) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-sync-launcher-")));
  const home = path.join(tmp, "home");
  const env = { AOF_GLOBAL_HOME: home };
  const prior = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  const handles = [];
  try {
    const fx = { tmp, home, env };
    await writeWorkspace(fx, AOF);
    await writeWorkspace(fx, TEST_REPO, { propagates: testRepoPropagates });
    await register(fx, AOF);
    await register(fx, TEST_REPO);
    // This node's own record, which every registry publish rebuilds a workspace's membership from:
    // without it the first publish of a workspace would unlink this node from it.
    await publishNodeRecord(await loadWorkspace(path.join(tmp, AOF.dir), undefined, { env }), NODE, { nodeId: NODE, host: NODE, os: "linux", runtimes: ["claude"], publishedAt: "2026-10-19T09:00:00.000Z" });
    const launch = path.join(tmp, "launch");
    await mkdir(launch, { recursive: true });
    fx.launchDir = launch;
    fx.start = async ({ from = launch, ...extra } = {}) => {
      const ws = await loadWorkspace(from, undefined, { env });
      // The desktop's launch: the machine-wide mesh enable (what `aof mesh join` writes into the
      // global config) reaches a folder that has no aof config of its own.
      ws.config = { ...ws.config, mesh: { ...(ws.config?.mesh ?? {}), enabled: true, nodeId: NODE, fabric: "tailscale", relay: { controlNode: NODE } } };
      const ticker = manualTicker();
      const handle = await startLauncher(ws, {
        exec: async () => ({ stdout: JSON.stringify(STATUS_FIXTURE), status: 0 }),
        platform: "linux",
        peerPollTicker: manualTicker(),
        propagationTicker: ticker,
        startControlStreamServer: async () => ({ stop() {}, updatePeers() {} }),
        globalWorkStoreOptions: { env },
        ...extra,
      });
      assert.equal(handle.refused, undefined, "the launcher started");
      handles.push(handle);
      return { handle, tick: () => ticker.fire(), warnings: () => handle.warnings.filter((warning) => warning.code !== "discord-bot-off"), stop: () => handle.stop() };
    };
    return await body(fx);
  } finally {
    for (const handle of handles) { try { handle.stop(); } catch { /* already stopped */ } }
    if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

// ================================ 167/00 — the serve daemon counts its ticks and writes its cost
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/
//   tasks/00_each-daemon-counts-its-work.feature — the tick driver's `sync-pass` count per workspace
//   and the `serve` snapshot written by the launcher over its injected ticker and at a clean stop.
// The meter is the launcher's own (injected), so the counts are this daemon's and nobody else's.
const costFile = (fx) => path.join(fx.home, "mesh", "cost", `${NODE}.serve.json`);
const launcherCostTests = [
  {
    name: "167/00 the serve daemon counts each sync pass for its workspace and writes its snapshot every 15 seconds and at a clean stop",
    run: () => withMesh(async (fx) => {
      const meter = createCostMeter();
      const costTicker = manualTicker();
      const { handle, tick } = await fx.start({ costMeter: meter, costTicker });
      assert.equal(meter.total("sync-pass", { workspaceId: AOF.id }), 1, "the start pass is counted for aof");
      assert.equal(meter.total("sync-pass", { workspaceId: TEST_REPO.id }), 1, "…and for aof-test-repo");
      tick();
      await until(() => meter.total("sync-pass", { workspaceId: TEST_REPO.id }) === 2, "the tick's pass to be counted");
      assert.equal(costTicker.handles[0].intervalSeconds, 15, "the writer ticks every 15 seconds");
      assert.equal(existsSync(costFile(fx)), false, "no snapshot before the first 15 s tick");
      costTicker.fire();
      const first = await until(() => existsSync(costFile(fx)) && JSON.parse(readFileSync(costFile(fx), "utf8")), "the 15 s snapshot");
      assert.equal(first.daemon, "serve");
      assert.equal(first.pid, process.pid);
      assert.ok(first.topCauses.some((entry) => entry.cause === "sync-pass" && entry.labels.workspaceId === AOF.id), JSON.stringify(first.topCauses));
      await handle.stop();
      assert.equal(costTicker.handles[0].stopped, true, "a clean stop stops the writer");
      const last = JSON.parse(readFileSync(costFile(fx), "utf8"));
      assert.ok(Date.parse(last.at) >= Date.parse(first.at), "and writes once more");
    }),
  },
];

// ================================ 167/03 — a permanent fault is said once and backed off
// The launcher runs over an injected 15-second ticker AND an injected clock, so a backoff is crossed
// by moving the clock, never by waiting. aof's pass is made to fail through the `syncWorkspace` seam
// (aof-test-repo's runs for real); the start-up call is the first tick. Every count is the
// launcher's own injected meter, every line its own warnings.
const T0 = Date.parse("2026-10-20T09:00:00.000Z");
function testClock() {
  let ms = T0;
  return { now: () => new Date(ms).toISOString(), at: (next) => { ms = next; }, get ms() { return ms; } };
}
const conflict = () => Object.assign(new Error("Event id evt-167 already names a different fact."), { code: "event-id-conflict", status: 409 });
const dbLocked = () => Object.assign(new Error("database is locked"), { code: "ERR_SQLITE_ERROR" });

// aof's passes, each with the clock it ran at; `fault` (a thunk, or null) is what aof's pass throws.
function aofFaults(clock, fault) {
  const state = { fault, passes: [] };
  state.syncWorkspace = async (workspace, ctx) => {
    if (path.basename(workspace.projectRoot) === AOF.dir) {
      state.passes.push(clock.ms);
      if (state.fault) throw state.fault();
    }
    return await syncWorkspace(workspace, ctx);
  };
  return state;
}
const aofLines = (warnings) => warnings.filter((warning) => warning.workspaceId === AOF.id);

async function startFaulted(fx, fault, extra = {}) {
  const clock = testClock();
  const meter = createCostMeter();
  const faults = aofFaults(clock, fault);
  const launcher = await fx.start({ now: clock.now, costMeter: meter, syncWorkspace: faults.syncWorkspace, propagationSeconds: 15, ...extra });
  return { ...launcher, clock, meter, faults };
}

// E3 — drive aof's pass to `failures` failures (each later tick two hours on, past any backoff), then
// pin the gap after the last: no attempt one second before it, an attempt at it.
async function assertGapAfter(fx, failures, gapMs) {
  const { tick, clock, faults } = await startFaulted(fx, conflict);
  while (faults.passes.length < failures) {
    clock.at(clock.ms + 2 * 3_600_000);
    await tick();
  }
  const last = faults.passes.at(-1);
  clock.at(last + gapMs - 1000);
  await tick();
  assert.equal(faults.passes.length, failures, `no attempt ${gapMs / 1000 - 1} s after failure ${failures}`);
  clock.at(last + gapMs);
  await tick();
  assert.equal(faults.passes.length, failures + 1, `an attempt ${gapMs / 1000} s after failure ${failures}`);
}

const permanentFaultTests = [
  {
    name: "167/03 E1 · ten failing ticks give one warning and nine counted skips",
    run: () => withMesh(async (fx) => {
      const { tick, warnings, meter, faults } = await startFaulted(fx, conflict);
      for (let index = 0; index < 9; index += 1) await tick();
      const lines = aofLines(warnings());
      assert.equal(lines.length, 1, JSON.stringify(lines));
      assert.ok(lines[0].message.includes(AOF.id) && lines[0].message.includes("event-id-conflict"), lines[0].message);
      assert.equal(meter.total("sync-failure", { workspaceId: AOF.id, code: "event-id-conflict" }), 1);
      assert.equal(faults.passes.length, 1, "the pass ran on the first tick only");
      assert.equal(meter.total("sync-pass", { workspaceId: AOF.id, code: "backoff" }), 9, "each of the nine ticks that did not run it is counted as a backoff skip");
      assert.equal(meter.total("sync-pass", { workspaceId: TEST_REPO.id }), 10, "aof-test-repo is synced on every tick regardless");
    }),
  },
  {
    name: "167/03 E2 · an edit in a backed-off workspace ends its backoff",
    run: () => withMesh(async (fx) => {
      const { tick, faults } = await startFaulted(fx, conflict);
      await tick();
      assert.equal(faults.passes.length, 1, "backed off (non-vacuous)");
      await setStory(fx, AOF, "in-progress");
      await tick();
      assert.equal(faults.passes.length, 2, "the edit ran aof's pass on that tick");
    }),
  },
  ...[[1, 15], [2, 30], [3, 60], [9, 3600], [12, 3600]].map(([failures, seconds]) => ({
    name: `167/03 E3 · after ${failures} failure(s) the next attempt is ${seconds >= 3600 ? "60 minutes" : `${seconds} seconds`} after the last`,
    run: () => withMesh(async (fx) => {
      await assertGapAfter(fx, failures, seconds * 1000);
    }),
  })),
  {
    name: "167/03 E4 · a failure outside the permanent set is retried on the next tick and warned about as today",
    run: () => withMesh(async (fx) => {
      const { tick, warnings, faults } = await startFaulted(fx, dbLocked);
      await tick();
      assert.equal(faults.passes.length, 2, "the pass ran again on the next tick");
      const lines = aofLines(warnings());
      assert.equal(lines.length, 2, "each failure is warned about");
      assert.ok(lines.every((line) => line.code === "global-work-propagation-failed" && line.message.includes("database is locked")), JSON.stringify(lines));
    }),
  },
  {
    name: "167/03 E5 · a restart says a backed-off failure once more",
    run: () => withMesh(async (fx) => {
      const first = await startFaulted(fx, conflict);
      await first.tick();
      assert.equal(aofLines(first.warnings()).length, 1, "said once and backed off (non-vacuous)");
      await first.stop();
      const second = await startFaulted(fx, conflict); // its start-up call is its first tick
      const lines = aofLines(second.warnings());
      assert.equal(lines.length, 1);
      assert.ok(lines[0].message.includes(AOF.id) && lines[0].message.includes("event-id-conflict"), lines[0].message);
    }),
  },
  {
    name: "167/03 a pass that succeeds clears its backoff",
    run: () => withMesh(async (fx) => {
      const { tick, warnings, clock, faults } = await startFaulted(fx, conflict);
      clock.at(T0 + 15_000);
      await tick();
      assert.equal(faults.passes.length, 2, "failed twice (non-vacuous)");
      faults.fault = null; // the conflict is resolved
      await setStory(fx, AOF, "in-progress");
      await tick();
      await tick();
      assert.equal(faults.passes.length, 4, "the pass ran on both ticks");
      assert.equal(aofLines(warnings()).length, 1, `no further warning for aof: ${JSON.stringify(aofLines(warnings()))}`);
      assert.equal(row(fx, AOF, "164/00")?.status, "in-progress", "and the edit landed");
    }),
  },
];

// ---------------------------------------------- task 01 · R2 — a gone registration stops costing
const REGISTRY_READ = "SELECT workspace_id FROM global_node_workspaces WHERE node_id = ?";
// An opener that counts the registry resolve's one read of this node's links.
function countingOpener(counter) {
  return async (options) => {
    const store = await openGlobalWorkProjectionStore(options);
    const db = new Proxy(store.db, {
      get(target, key) {
        if (key === "prepare") return (sql) => { if (String(sql).startsWith(REGISTRY_READ)) counter.reads += 1; return target.prepare(sql); };
        const value = target[key];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return { ...store, db, close: () => store.close() };
  };
}
const goneWorkspace = (id) => ({ id, dir: `gone-${id}`, milestone: "01", story: "00" });
const linkedNodes = (fx, workspaceId) => read(fx, "projection.sqlite", "SELECT node_id AS id FROM global_node_workspaces WHERE workspace_id = ? ORDER BY node_id", workspaceId).map(({ id }) => id);
const linesNaming = (warnings, workspaceId) => warnings.filter((warning) => warning.workspaceId === workspaceId);
async function linkNode(fx, nodeId, workspaceId) {
  const store = await openGlobalWorkProjectionStore({ env: fx.env });
  try { store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(nodeId, workspaceId); } finally { store.close(); }
}
const LANE = { id: "lane-3", dir: "lane-3", milestone: "01", story: "00" };
const laneWorkDir = (fx) => path.join(fx.tmp, LANE.dir, "wiki", "work");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const goneRegistrationTests = [
  {
    name: "167/03 E6 · 58 gone folders are reported once a tick, not twice, over one registry resolve",
    run: () => withMesh(async (fx) => {
      const gone = Array.from({ length: 58 }, (_, index) => goneWorkspace(`ws-gone-${String(index).padStart(2, "0")}`));
      for (const workspace of gone) await register(fx, workspace);
      const counter = { reads: 0 };
      const { tick, warnings } = await fx.start({ openStore: countingOpener(counter) }); // the start-up call is the tick
      assert.equal(counter.reads, 1, "the registry is resolved once for that tick");
      for (const workspace of gone) assert.equal(linesNaming(warnings(), workspace.id).length, 1, `exactly 1 line for ${workspace.id}`);
      await tick();
      assert.equal(counter.reads, 2, "and once for the next");
      assert.equal(gone.reduce((sum, workspace) => sum + linesNaming(warnings(), workspace.id).length, 0), 58, "which says nothing more about them");
    }),
  },
  {
    name: "167/03 E7 · a gone folder's registration is removed at once, with one line naming it and its path",
    run: () => withMesh(async (fx) => {
      await register(fx, LANE); // its folder was never written
      const { tick, warnings } = await fx.start();
      await tick();
      await tick();
      assert.deepEqual(linkedNodes(fx, LANE.id), [], `${NODE} no longer has lane-3 registered`);
      const lines = linesNaming(warnings(), LANE.id);
      assert.equal(lines.length, 1, JSON.stringify(lines));
      assert.ok(lines[0].message.includes(LANE.id) && lines[0].message.includes(laneWorkDir(fx)), lines[0].message);
    }),
  },
  {
    name: "167/03 a removed registration comes back when its folder is used",
    run: () => withMesh(async (fx) => {
      await register(fx, LANE);
      await fx.start();
      assert.deepEqual(linkedNodes(fx, LANE.id), [], "removed because its folder was gone (non-vacuous)");
      const root = await writeWorkspace(fx, LANE);
      const result = spawnCliSync(process.execPath, [path.join(REPO_ROOT, "packages", "core", "bin", "aof.mjs"), "work", "list", "--json"], { cwd: root, env: { ...process.env, AOF_GLOBAL_HOME: fx.home }, encoding: "utf8" });
      assert.equal(result.status, 0, `${result.stderr}`);
      assert.deepEqual(linkedNodes(fx, LANE.id), [NODE], `${NODE} has lane-3 registered again`);
    }),
  },
  {
    name: "167/03 E8 · another node's rows are never removed",
    run: () => withMesh(async (fx) => {
      await register(fx, LANE);
      await linkNode(fx, WORKER, LANE.id);
      await fx.start();
      assert.deepEqual(linkedNodes(fx, LANE.id), [WORKER], `${WORKER} still has lane-3 registered, and only ${NODE}'s row went`);
    }),
  },
  ...[
    { reason: "workdir-missing", plant: async () => {} },
    { reason: "not-a-directory", plant: async (fx) => { await mkdir(path.dirname(laneWorkDir(fx)), { recursive: true }); await writeFile(laneWorkDir(fx), "not a folder", "utf8"); } },
  ].map(({ reason, plant }) => ({
    name: `167/03 only a gone folder is removed — ${reason}: removed on the first tick, with 1 line`,
    run: () => withMesh(async (fx) => {
      await register(fx, LANE);
      await plant(fx);
      const { tick, warnings } = await fx.start();
      assert.deepEqual(linkedNodes(fx, LANE.id), [], "removed on the first tick");
      await tick();
      await tick();
      const lines = linesNaming(warnings(), LANE.id);
      assert.equal(lines.length, 1, JSON.stringify(lines));
      assert.equal(lines[0].code, reason);
    }),
  })),
  {
    name: "167/03 only a gone folder is removed — no-descriptor: still registered, warned once, and its pass is backed off",
    run: () => withMesh(async (fx) => {
      await linkNode(fx, NODE, LANE.id); // a link with no descriptor behind it
      const clock = testClock();
      const meter = createCostMeter();
      const { tick, warnings } = await fx.start({ now: clock.now, costMeter: meter, propagationSeconds: 15 });
      await tick();
      await tick();
      assert.deepEqual(linkedNodes(fx, LANE.id), [NODE], "still registered");
      const lines = linesNaming(warnings(), LANE.id);
      assert.equal(lines.length, 1, JSON.stringify(lines));
      assert.equal(lines[0].code, "no-descriptor");
      assert.equal(meter.total("sync-pass", { workspaceId: LANE.id, code: "backoff" }), 2, "the two ticks after the first are backoff skips");
    }),
  },
  {
    name: "167/03 a registry that cannot be read removes nothing",
    run: () => withMesh(async (fx) => {
      await register(fx, LANE);
      const failing = async () => { throw Object.assign(new Error("unable to open database file"), { code: "ERR_SQLITE_ERROR" }); };
      const { warnings } = await fx.start({ openStore: failing });
      assert.deepEqual(linkedNodes(fx, LANE.id), [NODE], "no registration is removed");
      assert.ok(warnings().some((warning) => warning.code === "global-work-propagation-failed" && /registered workspaces could not be read/.test(warning.message)), JSON.stringify(warnings()));
    }),
  },
];

// ================================ 167/07 — an idle tick walks nothing
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/07_story_an-idle-tick-walks-nothing/
//   tasks/00_an-unchanged-watched-tree-is-not-walked.feature and tasks/01_the-daemon-holds-a-watch-per-synced-tree.feature
//   (@executable). The launcher is started with `workTreeWatch` carrying an INJECTED watch, so an edit
//   is announced by firing its listener rather than by waiting on the OS, and the degrade reporter is
//   a spy. Every walk is read off the launcher's own meter as `stat-walk`.
const workDirOf = (fx, workspace) => path.join(fx.tmp, workspace.dir, "wiki", "work");
function fakeWatch({ failFor = null } = {}) {
  const armed = new Map();
  const watch = (dir, options, listener) => {
    if (failFor != null && dir === failFor) throw Object.assign(new Error("EMFILE: too many open files, watch"), { code: "EMFILE" });
    const emitter = new EventEmitter();
    const entry = { options, listener, emitter, closed: false };
    emitter.close = () => { entry.closed = true; };
    armed.set(dir, entry);
    return emitter;
  };
  return {
    watch,
    held: () => [...armed].filter(([, entry]) => !entry.closed).map(([dir]) => dir).sort(),
    fire: (dir, name) => armed.get(dir).listener("change", name),
    fail: (dir) => armed.get(dir).emitter.emit("error", Object.assign(new Error("EPERM: operation not permitted, watch"), { code: "EPERM" })),
    options: (dir) => armed.get(dir)?.options,
  };
}
function degradeSpy() {
  const lines = [];
  return { lines, reportDegrade: (code, error, extra = {}) => lines.push({ code, message: error?.message ?? String(error), ...extra }) };
}
async function startWatched(fx, { fake = fakeWatch(), spy = degradeSpy(), ...extra } = {}) {
  const meter = createCostMeter();
  const launcher = await fx.start({ costMeter: meter, workTreeWatch: { watch: fake.watch, reportDegrade: spy.reportDegrade }, ...extra });
  // The start-up call armed the watches; the first tick takes each tree's first walk.
  await launcher.tick();
  return { ...launcher, meter, fake, spy, walks: (labels) => meter.total("stat-walk", labels) };
}
const unavailableNaming = (spy, dir) => spy.lines.filter((line) => line.code === "work-tree-watch-unavailable" && line.path === dir);

const watchedTreeTests = [
  {
    name: "167/07 E1 · ten idle ticks walk nothing, and every tick still syncs",
    run: () => withMesh(async (fx) => {
      const { tick, walks, meter, fake } = await startWatched(fx);
      assert.deepEqual(fake.held(), [workDirOf(fx, AOF), workDirOf(fx, TEST_REPO)].sort(), "both synced trees are watched");
      assert.equal(fake.options(workDirOf(fx, AOF)).recursive, true, "each watch is recursive");
      assert.ok(walks({ code: "first" }) >= 2, "each watched tree took its first walk (non-vacuous)");
      const before = walks();
      const passes = meter.total("sync-pass", { workspaceId: AOF.id });
      for (let index = 0; index < 10; index += 1) await tick();
      assert.equal(walks(), before, "no stat-walk over ten idle ticks");
      assert.equal(meter.total("sync-pass", { workspaceId: AOF.id }), passes + 10, "every tick still ran aof's pass");
      assert.equal(row(fx, AOF, `${AOF.milestone}/${AOF.story}`)?.status, "not-started", "and the store still answers aof's items");
    }),
  },
  {
    name: "167/07 E2 · a backed-off workspace that moved and fails again walks once on that tick",
    run: () => withMesh(async (fx) => {
      const clock = testClock();
      const faults = aofFaults(clock, conflict);
      const { tick, walks, fake } = await startWatched(fx, { now: clock.now, syncWorkspace: faults.syncWorkspace, propagationSeconds: 15 });
      assert.equal(faults.passes.length, 1, "backed off after the start-up failure (non-vacuous)");
      await setStory(fx, AOF, "in-progress");
      fake.fire(workDirOf(fx, AOF), path.join(`${AOF.milestone}_milestone_m${AOF.milestone}`, "stories", `${AOF.story}_story_s${AOF.story}`, "STORY.md"));
      const before = walks();
      await tick();
      assert.equal(faults.passes.length, 2, "the edit ran aof's pass, which failed again");
      assert.equal(walks() - before, 1, "one walk on that tick: the backoff check's; the failure's digest is answered from it");
    }),
  },
  {
    name: "167/07 E3 · an edited status is walked once and synced, and the tick after walks nothing",
    run: () => withMesh(async (fx) => {
      const { tick, walks, fake } = await startWatched(fx);
      await setStory(fx, AOF, "in-progress");
      fake.fire(workDirOf(fx, AOF), path.join(`${AOF.milestone}_milestone_m${AOF.milestone}`, "stories", `${AOF.story}_story_s${AOF.story}`, "STORY.md"));
      const before = walks({ code: "changed" });
      await tick();
      assert.equal(walks({ code: "changed" }) - before, 1, "one walk labelled changed");
      await until(() => row(fx, AOF, `${AOF.milestone}/${AOF.story}`)?.status === "in-progress", "the change in the store");
      const after = walks();
      await tick();
      assert.equal(walks(), after, "the tick after walks nothing");
    }),
  },
  {
    name: "167/07 E8 · a watch that cannot start falls back to the walk, said once",
    run: () => withMesh(async (fx) => {
      const fake = fakeWatch({ failFor: workDirOf(fx, AOF) });
      const { tick, walks, spy } = await startWatched(fx, { fake });
      for (let index = 0; index < 3; index += 1) {
        const before = walks({ code: "unwatched" });
        await tick();
        assert.ok(walks({ code: "unwatched" }) > before, `tick ${index + 1} walks aof's tree, counted unwatched`);
      }
      assert.equal(unavailableNaming(spy, workDirOf(fx, AOF)).length, 1, JSON.stringify(spy.lines));
      assert.deepEqual(fake.held(), [workDirOf(fx, TEST_REPO)], "the other tree is still watched");
    }),
  },
  {
    name: "167/07 E9 · a watch that errors later is closed and falls back, said once",
    run: () => withMesh(async (fx) => {
      const { tick, walks, spy, fake } = await startWatched(fx);
      fake.fail(workDirOf(fx, AOF));
      assert.deepEqual(fake.held(), [workDirOf(fx, TEST_REPO)], "the failed watch is closed");
      const before = walks({ code: "unwatched" });
      await tick();
      assert.ok(walks({ code: "unwatched" }) > before, "the next tick walks aof's tree");
      await tick();
      assert.equal(unavailableNaming(spy, workDirOf(fx, AOF)).length, 1, JSON.stringify(spy.lines));
      assert.deepEqual(fake.held(), [workDirOf(fx, TEST_REPO)], "and is not armed again");
    }),
  },
  {
    name: "167/07 E11 · a workspace that does not propagate is not watched",
    run: () => withMesh(async (fx) => {
      const { fake } = await startWatched(fx);
      assert.deepEqual(fake.held(), [workDirOf(fx, AOF)], "only the propagating tree is watched");
    }, { testRepoPropagates: false }),
  },
  {
    name: "167/07 E12 · a registration that leaves the tick set loses its watch",
    run: () => withMesh(async (fx) => {
      const { tick, fake } = await startWatched(fx);
      assert.ok(fake.held().includes(workDirOf(fx, AOF)), "aof is watched (non-vacuous)");
      await rename(path.join(fx.tmp, AOF.dir), path.join(fx.tmp, `${AOF.dir}-moved`));
      await tick();
      assert.deepEqual(fake.held(), [workDirOf(fx, TEST_REPO)], "its watch is closed on that tick");
    }),
  },
  {
    name: "167/07 the daemon's stop closes every watch",
    run: () => withMesh(async (fx) => {
      const { stop, fake } = await startWatched(fx);
      assert.equal(fake.held().length, 2, "two watches held (non-vacuous)");
      await stop();
      assert.deepEqual(fake.held(), []);
    }),
  },
  {
    name: "167/07 E13 · a tick that cannot read the registry changes no watch",
    run: () => withMesh(async (fx) => {
      let failing = false;
      const openStore = async (options) => {
        if (failing) throw Object.assign(new Error("unable to open database file"), { code: "ERR_SQLITE_ERROR" });
        return await openGlobalWorkProjectionStore(options);
      };
      const { tick, fake, warnings } = await startWatched(fx, { openStore });
      const held = fake.held();
      assert.equal(held.length, 2, "two watches held (non-vacuous)");
      failing = true;
      await tick();
      assert.ok(warnings().some((warning) => /registered workspaces could not be read/.test(warning.message)), "the registry read failed (non-vacuous)");
      assert.deepEqual(fake.held(), held);
    }),
  },
];

export const meshLauncherSyncsEveryWorkspaceTests = [
  ...launcherCostTests,
  ...permanentFaultTests,
  ...goneRegistrationTests,
  ...watchedTreeTests,
  // ================================ task 00 · R1 — every registered workspace, every tick
  {
    name: "164/01 E1 · a hand edit in a workspace the daemon was not launched from lands within one tick",
    run: () => withMesh(async (fx) => {
      const { tick } = await fx.start();
      assert.equal(row(fx, TEST_REPO, "01/00")?.status, "not-started", "the start pass synced aof-test-repo");
      await setStory(fx, TEST_REPO, "in-progress");
      tick();
      await until(() => row(fx, TEST_REPO, "01/00")?.status === "in-progress", "the edit to land");
      assert.deepEqual(row(fx, TEST_REPO, "01/00"), { status: "in-progress", nodeId: NODE });
      const ids = read(fx, "projection.sqlite", "SELECT DISTINCT workspace_id AS id FROM work_items").map(({ id }) => id).sort();
      assert.deepEqual(ids, [AOF.id, TEST_REPO.id], "the launch folder was not published");
    }),
  },
  {
    name: "164/01 E2 · only a workspace that changed is marked",
    run: () => withMesh(async (fx) => {
      const { tick } = await fx.start();
      const before = marks(fx).length;
      await setStory(fx, TEST_REPO, "in-review");
      tick();
      await until(() => row(fx, TEST_REPO, "01/00")?.status === "in-review", "the changed workspace to sync");
      const appended = marks(fx).slice(before);
      assert.deepEqual(appended.map((event) => event.workspaceId), [TEST_REPO.id], "one workspace.changed event, for aof-test-repo, and none for aof");
    }),
  },
  {
    name: "164/01 E3 · a launch folder that is also registered is synced once",
    run: () => withMesh(async (fx) => {
      const calls = [];
      const spy = async (workspace, ctx) => { calls.push(workspace.projectRoot); return await syncWorkspace(workspace, ctx); };
      const { tick } = await fx.start({ from: path.join(fx.tmp, AOF.dir), syncWorkspace: spy });
      const counts = () => Object.fromEntries([...new Set(calls)].map((root) => [path.basename(root), calls.filter((entry) => entry === root).length]));
      assert.deepEqual(counts(), { aof: 1, "aof-test-repo": 1 }, "the start pass ran once per workspace");
      tick();
      await until(() => calls.length >= 4, "the tick's pass over both workspaces");
      assert.deepEqual(counts(), { aof: 2, "aof-test-repo": 2 }, "…and the tick once more for each, never twice for aof");
    }),
  },

  // ================================ task 00 · R2 — a workspace that cannot be synced is skipped
  {
    name: "164/01 E4 · a registered workspace whose folder was deleted is skipped with workdir-missing, and aof is still synced on the same tick",
    run: () => withMesh(async (fx) => {
      const { tick, warnings } = await fx.start();
      const testRepoRows = rowsOf(fx, TEST_REPO);
      await rm(path.join(fx.tmp, TEST_REPO.dir), { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
      const seen = warnings().length;
      await setStory(fx, AOF, "in-progress");
      tick();
      await until(() => row(fx, AOF, "164/00")?.status === "in-progress", "aof to sync on the same tick");
      await until(() => warnings().slice(seen).some((warning) => warning.code === "workdir-missing" && warning.workspaceId === TEST_REPO.id), "a workdir-missing warning naming aof-test-repo");
      assert.deepEqual(rowsOf(fx, TEST_REPO), testRepoRows, "nothing is written to the store for aof-test-repo");
    }),
  },
  {
    name: "164/01 E5 · a registered workspace that does not propagate is skipped with mesh-global-disabled, and aof is still synced on the same tick",
    run: () => withMesh(async (fx) => {
      const { tick, warnings } = await fx.start();
      const seen = warnings().length;
      await setStory(fx, TEST_REPO, "in-progress");
      await setStory(fx, AOF, "in-progress");
      tick();
      await until(() => row(fx, AOF, "164/00")?.status === "in-progress", "aof to sync on the same tick");
      await until(() => warnings().slice(seen).some((warning) => warning.code === "mesh-global-disabled" && warning.workspaceId === TEST_REPO.id), "a mesh-global-disabled warning naming aof-test-repo");
      assert.deepEqual(rowsOf(fx, TEST_REPO), [], "nothing is written to the store for aof-test-repo");
    }, { testRepoPropagates: false }),
  },
  {
    name: "164/01 E6 · a store that cannot be opened on one tick does not stop the daemon, and the next tick syncs both workspaces",
    run: () => withMesh(async (fx) => {
      const { tick, warnings, handle } = await fx.start();
      const database = path.join(fx.home, "mesh", "work", "projection.sqlite");
      const parked = `${database}.parked`;
      await rename(database, parked);
      await mkdir(database); // a directory where the store's file should be: it cannot be opened
      const seen = warnings().length;
      tick();
      await until(() => warnings().slice(seen).some((warning) => warning.code === "global-work-propagation-failed"), "a global-work-propagation-failed warning");
      assert.equal(handle.refused, undefined, "the launcher is still running");
      await rm(database, { recursive: true, force: true });
      await rename(parked, database);
      await setStory(fx, AOF, "in-review");
      await setStory(fx, TEST_REPO, "in-review");
      tick();
      await until(() => row(fx, AOF, "164/00")?.status === "in-review" && row(fx, TEST_REPO, "01/00")?.status === "in-review", "both workspaces to sync on the next tick");
    }),
  },

  // ================================ task 01 · R3 — a change made while stopped lands at start
  {
    name: "164/01 E7 · changes made while stopped are in the store before the first tick",
    run: () => withMesh(async (fx) => {
      const first = await fx.start();
      first.handle.stop();
      await setStory(fx, TEST_REPO, "in-review"); // a pulled commit
      await setStory(fx, AOF, "in-progress"); // a hand edit
      await fx.start(); // its ticker has not fired
      assert.equal(row(fx, TEST_REPO, "01/00")?.status, "in-review");
      assert.equal(row(fx, AOF, "164/00")?.status, "in-progress");
    }),
  },
  {
    name: "164/01 E8 · a start with nothing changed marks nothing",
    run: () => withMesh(async (fx) => {
      const first = await fx.start();
      first.handle.stop();
      const before = marks(fx).length;
      await fx.start();
      assert.equal(marks(fx).length, before, "no workspace.changed event is appended");
    }),
  },

  // ================================ task 03 · R4 — a torn node record never empties membership (F-02)
  {
    name: "164/01 E9 · a torn node record leaves the workspace's links and descriptor as they were, and the change stays owed",
    run: () => withTornRoster(async (fx) => {
      await setStory(fx, TEST_REPO, "in-progress");
      const refused = await fx.sync();
      assert.equal(refused.effects?.[0]?.status, "failed", "the publish step failed and stays owed");
      const step = stepOf(fx, refused.eventId);
      assert.equal(step.status, "failed");
      assert.match(step.lastError, /node record\(s\) could not be read .*node-2976\.json/, "the step names the unreadable record");
      assert.equal(refused.effects[0].detail?.warning?.code, "node-record-unreadable", "the refusal is coded");
      assert.deepEqual(linksOf(fx, TEST_REPO), [WORKER, NODE], "the links are as they were");
      assert.deepEqual(membersOf(fx, TEST_REPO), { row: [WORKER, NODE], file: [WORKER, NODE] }, "the descriptor still lists both members");
      assert.equal(row(fx, TEST_REPO, "01/00")?.status, "not-started", "the changed row is not written");
    }),
  },
  {
    name: "164/01 E10 · once the record is readable again, the next pass lands the owed change",
    run: () => withTornRoster(async (fx) => {
      await setStory(fx, TEST_REPO, "in-progress");
      const refused = await fx.sync();
      assert.equal(stepOf(fx, refused.eventId).status, "failed");
      await fx.restoreWorker();
      ageFailedSteps(fx); // the failed step's backoff elapses (164/ADR-006)
      const landed = await fx.sync();
      assert.equal(landed.eventId, refused.eventId, "the same owed mark is drained again");
      assert.equal(stepOf(fx, refused.eventId).status, "done");
      assert.equal(row(fx, TEST_REPO, "01/00")?.status, "in-progress", "the changed row is written");
      assert.deepEqual(linksOf(fx, TEST_REPO), [WORKER, NODE]);
    }),
  },
];

// task 03's fixture: aof-test-repo synced once with a two-node roster (this node and a worker), then
// the worker's node record torn the way a crash mid-write leaves it — the right size, all NULs.
const WORKER = "node-2976";
const WORKER_RECORD = { nodeId: WORKER, host: "172.27.155.33", os: "linux", runtimes: ["claude"], publishedAt: "2026-10-19T09:00:00.000Z" };
const workerRecordPath = (fx) => path.join(fx.home, "mesh", "nodes", `${WORKER}.json`);
const linksOf = (fx, workspace) => read(fx, "projection.sqlite", "SELECT node_id AS id FROM global_node_workspaces WHERE workspace_id = ? ORDER BY node_id", workspace.id).map(({ id }) => id);
const stepOf = (fx, eventId) => {
  const [step] = read(fx, "journal.sqlite", "SELECT status, last_error AS lastError FROM effect_steps WHERE event_id = ? AND reactor_key = 'publish-projection'", eventId);
  return step ?? null;
};
function membersOf(fx, workspace) {
  const [descriptor] = read(fx, "projection.sqlite", "SELECT member_node_ids_json AS members FROM global_workspace_descriptors WHERE workspace_id = ?", workspace.id);
  const file = JSON.parse(readFileSync(path.join(fx.home, "mesh", "workspaces", `${workspace.id}.json`), "utf8"));
  return { row: JSON.parse(descriptor.members).sort(), file: [...file.memberNodeIds].sort() };
}
function ageFailedSteps(fx) {
  const db = new DatabaseSync(path.join(fx.home, "mesh", "work", "journal.sqlite"));
  try { db.prepare("UPDATE effect_steps SET updated_at = '2000-01-01T00:00:00.000Z' WHERE status = 'failed'").run(); } finally { db.close(); }
}

function withTornRoster(body) {
  return withMesh(async (fx) => {
    const ws = await loadWorkspace(path.join(fx.tmp, TEST_REPO.dir), undefined, { env: fx.env });
    fx.sync = async () => await syncWorkspace(await loadWorkspace(path.join(fx.tmp, TEST_REPO.dir), undefined, { env: fx.env }), { globalWorkStoreOptions: { env: fx.env }, journalOptions: { env: fx.env } });
    fx.restoreWorker = async () => await publishNodeRecord(ws, WORKER, WORKER_RECORD);
    await fx.restoreWorker();
    await fx.sync();
    assert.deepEqual(linksOf(fx, TEST_REPO), [WORKER, NODE], "the first sync linked both nodes (non-vacuous)");
    assert.deepEqual(membersOf(fx, TEST_REPO), { row: [WORKER, NODE], file: [WORKER, NODE] });
    const size = (await readFile(workerRecordPath(fx))).length;
    await writeFile(workerRecordPath(fx), Buffer.alloc(size));
    return await body(fx);
  });
}
