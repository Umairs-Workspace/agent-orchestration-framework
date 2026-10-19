import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
// Traceability wiring for milestone 164 / story 01 (the desktop app syncs every workspace):
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/00_every-tick-syncs-every-registered-workspace.feature (@executable)
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/01_the-daemon-catches-up-when-it-starts.feature (@executable)
//   .../01_story_the-desktop-app-syncs-every-workspace/tasks/03_a-torn-node-record-never-empties-membership.feature (@executable @bug)
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
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
    fire() { handles[0].onTick(); },
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
      return { handle, tick: () => ticker.fire(), warnings: () => handle.warnings.filter((warning) => warning.code !== "discord-bot-off") };
    };
    return await body(fx);
  } finally {
    for (const handle of handles) { try { handle.stop(); } catch { /* already stopped */ } }
    if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

export const meshLauncherSyncsEveryWorkspaceTests = [
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
