import { defaultApplication as _aofApplication } from "aof/default-application";
// test/mesh/budget/soak-harness.mjs — THE DAEMON BUDGET SOAK (milestone 167 / story 04, ADR-007).
//
// The 17-hour burn came from cadence × tree size × three silent faults, and no unit test could see
// it: the injected tickers every launcher suite runs on are exactly the part that hides the cost.
// So this harness runs the REAL CLI's `mesh serve --serve` and `mesh ui` as child processes over a
// project as large as aof's own, generated here and never committed, with the motivating faults
// planted, and measures each daemon by its own cost snapshot (ADR-001):
//   · an EMPTY CACHE — the project's descriptor is registered and it has no item rows;
//   · a sync that fails with `event-id-conflict` — the journal already holds the id the first pass
//     will mint, naming a different fact (so the cache stays empty too);
//   · dead registrations — workspaces registered on this node whose work dirs do not exist.
// Everything lives under one temp directory: its own `AOF_GLOBAL_HOME`, free ports for the UI and
// the control stream (never :4181 or :4182), a loopback address, a clean child environment. The
// daemons are tree-killed in a `finally`, pass or fail, and the directory is removed.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { workTreeStatDigest } from "@aof/work/discovery";
import { POLL_MS } from "../../../apps/ui/src/fleet/assign-affordance.mjs";
import { createPoll } from "../../../apps/ui/src/lib/poll-cadence.mjs";

const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const openEffectsJournal = _aofApplication.effects.journal.openEffectsJournal;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI = path.join(REPO_ROOT, "packages", "core", "bin", "aof.mjs");

export const SOAK_NODE = "soak-node";
export const SOAK_WORKSPACE = "ws-soak-167";
export const LIVE_PORTS = Object.freeze([4181, 4182]);

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;

// generateTree(workDir, docs) — about `docs` record docs in aof's own shape: 32 live at the root
// (8 milestones of a SPEC and 3 stories), the rest archived (milestones of a SPEC and 7 stories).
async function generateTree(workDir, docs) {
  const write = async (dir, file, fields, body) => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, file), `${frontmatter(fields)}# ${fields.title}\n\n${body}\n`, "utf8");
  };
  const milestone = async (root, number, stories, status) => {
    const slug = `m${number}`;
    const dir = path.join(root, `${number}_milestone_${slug}`);
    await write(dir, "SPEC.md", { type: "milestone", number, slug, status, title: `"Milestone ${number}"`, schema: 1 }, "Generated for the daemon budget soak.");
    for (let story = 0; story < stories; story += 1) {
      const id = String(story).padStart(2, "0");
      await write(path.join(dir, "stories", `${id}_story_s${id}`), "STORY.md", { type: "story", number: id, slug: `s${id}`, parent: number, status, title: `"Story ${number}/${id}"`, schema: 1 }, "As the soak, I want a record doc, so that the tree is as large as aof's.");
    }
    return 1 + stories;
  };
  let written = 0;
  let number = 1;
  const archive = path.join(workDir, "archive");
  while (written < docs - 32) written += await milestone(archive, String(number++).padStart(3, "0"), Math.min(7, docs - 32 - written - 1), "done");
  for (let live = 0; live < 8; live += 1) written += await milestone(workDir, String(number++).padStart(3, "0"), 3, live === 0 ? "in-progress" : "not-started");
  return written;
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// The children's environment: this process's, minus anything that would steer them at the
// operator's session, credentials or global home.
function childEnv(home) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(CLAUDE|AOF_)/i.test(key) || key === "GIT_ASKPASS") continue;
    env[key] = value;
  }
  return { ...env, AOF_GLOBAL_HOME: home };
}

async function register(home, { workspaceId, projectRoot }) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    store.db.prepare(`INSERT OR REPLACE INTO global_workspace_descriptors (workspace_id, project_root, work_dir, name, mesh_enabled, control_node, member_node_ids_json, published_at, descriptor_path)
      VALUES (?, ?, ?, ?, 1, ?, '[]', '2026-10-21T09:00:00.000Z', ?)`).run(workspaceId, projectRoot, path.join(projectRoot, "wiki", "work"), path.basename(projectRoot), SOAK_NODE, path.join(projectRoot, "descriptor.json"));
    store.db.prepare("INSERT OR REPLACE INTO global_node_workspaces (node_id, workspace_id) VALUES (?, ?)").run(SOAK_NODE, workspaceId);
  } finally {
    store.close();
  }
}

// The conflict: the id the first sync pass will mint for this tree (`workspace-changed:<id>:<digest>`,
// 164/ADR-003) already names a different fact in the journal.
async function plantConflict(home, workDir) {
  const digest = await workTreeStatDigest(workDir);
  const journal = await openEffectsJournal({ env: { AOF_GLOBAL_HOME: home } });
  try {
    journal.db.prepare("INSERT INTO events (event_id, name, payload, source, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(`workspace-changed:${SOAK_WORKSPACE}:${digest}`, "workspace.changed", JSON.stringify({ planted: "167/04" }), "soak", "2026-10-21T09:00:00.000Z");
  } finally {
    journal.close?.();
  }
}

function startDaemon(name, args, { cwd, env, nodeArgs = [] }) {
  const child = spawn(process.execPath, [...nodeArgs, CLI, ...args], { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const output = [];
  const keep = (chunk) => { output.push(String(chunk)); if (output.length > 400) output.shift(); };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  return { name, child, pid: child.pid, output, exited };
}

async function stopDaemon(daemon) {
  if (daemon.child.exitCode != null || daemon.child.signalCode != null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(daemon.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else daemon.child.kill("SIGTERM");
  const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 5000));
  if ((await Promise.race([daemon.exited, timeout])) === "timeout") daemon.child.kill("SIGKILL");
  await Promise.race([daemon.exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The newest cost snapshot a daemon wrote (`<home>/mesh/cost/<node>.<daemon>.json`), or null.
function readSnapshot(home, daemon) {
  const dir = path.join(home, "mesh", "cost");
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((name) => name.endsWith(`.${daemon}.json`));
  if (!file) return null;
  try { return JSON.parse(readFileSync(path.join(dir, file), "utf8")); } catch { return null; }
}

async function waitFor(predicate, what, timeoutMs, daemons) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = predicate();
    if (value) return value;
    const dead = daemons.find((daemon) => daemon.child.exitCode != null);
    if (dead) throw new Error(`${dead.name} exited (${dead.child.exitCode}) while waiting for ${what}:\n${dead.output.join("").slice(-2000)}`);
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${what}:\n${daemons.map((daemon) => `--- ${daemon.name}\n${daemon.output.join("").slice(-1500)}`).join("\n")}`);
    await sleep(250);
  }
}

// CPU-seconds since the daemon started, off one snapshot: its since-start share of one core over
// its own age. Differences of these are a phase's CPU, whatever the machine's load stretched.
const cpuSecondsOf = (snapshot) => (snapshot.cpuPercentSinceStart / 100) * ((Date.parse(snapshot.at) - Date.parse(snapshot.startedAt)) / 1000);

// One phase: from each daemon's snapshot at its start to the first one at least `phaseMs` later.
async function measurePhase(home, daemons, phaseMs, { timeoutMs }) {
  const start = { serve: readSnapshot(home, "serve"), ui: readSnapshot(home, "ui") };
  const end = {};
  for (const daemon of ["serve", "ui"]) {
    end[daemon] = await waitFor(() => {
      const snapshot = readSnapshot(home, daemon);
      return snapshot && Date.parse(snapshot.at) >= Date.parse(start[daemon].at) + phaseMs ? snapshot : null;
    }, `${daemon}'s snapshot ${phaseMs / 1000}s into the phase`, timeoutMs, daemons);
  }
  const phase = {};
  for (const daemon of ["serve", "ui"]) {
    const wallSeconds = (Date.parse(end[daemon].at) - Date.parse(start[daemon].at)) / 1000;
    const cpuSeconds = Math.max(0, cpuSecondsOf(end[daemon]) - cpuSecondsOf(start[daemon]));
    phase[daemon] = { cpuSeconds, wallSeconds, state: end[daemon].state, topCauses: end[daemon].topCauses ?? [] };
  }
  return phase;
}

// The viewer: the fleet's status poll and the board's list poll, at the UI's own base cadence and
// through the UI's own cadence helper, sending `X-AOF-Client` and honouring `ETag` as `api.ts` does.
// The board is the per-workspace server the fleet's drill-in launches (`/api/mesh/board-url`).
// (Board.tsx's base, RUNNING_PROBE_MS, is the same 5 s as the fleet's POLL_MS; TSX is not importable here.)
async function startViewer(uiPort) {
  const requests = { fleet: 0, board: 0, notModified: 0, failed: 0 };
  const tags = new Map();
  const get = async (url, client) => {
    const last = tags.get(url);
    const headers = { "X-AOF-Client": client, ...(last ? { "If-None-Match": last } : {}) };
    try {
      const response = await fetch(url, { headers });
      requests[client] += 1;
      if (response.status === 304) { requests.notModified += 1; return false; }
      if (!response.ok) { requests.failed += 1; return true; }
      const etag = response.headers.get("etag");
      if (etag) tags.set(url, etag);
      await response.arrayBuffer();
      return true;
    } catch {
      requests.failed += 1;
      return true;
    }
  };
  const fleetOrigin = `http://127.0.0.1:${uiPort}`;
  const boardAnswer = await fetch(`${fleetOrigin}/api/mesh/board-url?workspaceId=${SOAK_WORKSPACE}`, { headers: { "X-AOF-Client": "fleet" } });
  const boardBody = await boardAnswer.json().catch(() => null);
  const board = boardAnswer.ok ? boardBody?.url ?? null : null;
  const boardError = boardAnswer.ok ? null : { status: boardAnswer.status, ...(boardBody ?? {}) };
  const boardOrigin = board ? new URL(board).origin : null;
  const always = { hidden: () => false, subscribe: () => () => {} };
  const polls = [createPoll({ baseMs: POLL_MS, run: () => get(`${fleetOrigin}/api/mesh/status`, "fleet"), visibility: always })];
  if (boardOrigin) polls.push(createPoll({ baseMs: POLL_MS, run: () => get(`${boardOrigin}/api/work/list`, "board"), visibility: always }));
  await get(`${fleetOrigin}/api/mesh/status`, "fleet");
  if (boardOrigin) await get(`${boardOrigin}/api/work/list`, "board");
  for (const poll of polls) poll.start();
  return { requests, boardOrigin, boardError, stop: () => { for (const poll of polls) poll.stop(); } };
}

// runSoak(options) → what the suite asserts on. Every daemon it starts is stopped before it returns
// or throws, and its directory is removed.
// `serveNodeArgs` is a diagnosis door (a profiler's flags for `mesh serve`); the suite passes none.
export async function runSoak({ docs = 1800, gone = 5, warmupMs = 15_000, phaseMs = 30_000, serveNodeArgs = [], viewerPhase: withViewer = true } = {}) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-soak-")));
  const home = path.join(tmp, "home");
  const projectRoot = path.join(tmp, "soak");
  const workDir = path.join(projectRoot, "wiki", "work");
  const daemons = [];
  try {
    const written = await generateTree(workDir, docs);
    const [uiPort, controlPort] = [await freePort(), await freePort()];
    await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
    const mesh = { enabled: true, nodeId: SOAK_NODE, workspaceId: SOAK_WORKSPACE, fabric: "direct", address: "127.0.0.1", relay: { url: `ws://127.0.0.1:${controlPort}/ws/relay`, controlNode: SOAK_NODE } };
    await writeFile(path.join(projectRoot, ".aof", "aof.config.json"), `${JSON.stringify({ name: "soak", work: { dir: "./wiki/work" }, mesh }, null, 2)}\n`, "utf8");
    await register(home, { workspaceId: SOAK_WORKSPACE, projectRoot });
    const goneIds = [];
    for (let index = 0; index < gone; index += 1) {
      const workspaceId = `ws-soak-gone-${index}`;
      goneIds.push(workspaceId);
      await register(home, { workspaceId, projectRoot: path.join(tmp, `gone-${index}`) }); // never written
    }
    await plantConflict(home, workDir);

    const env = childEnv(home);
    daemons.push(startDaemon("mesh serve", ["mesh", "serve", "--serve"], { cwd: projectRoot, env, nodeArgs: serveNodeArgs }));
    daemons.push(startDaemon("mesh ui", ["mesh", "ui", "--port", String(uiPort)], { cwd: projectRoot, env }));

    // Warm-up: both daemons up, and each has written its first snapshot (every 15 s).
    await waitFor(() => readSnapshot(home, "serve") && readSnapshot(home, "ui"), "both daemons' first cost snapshots", warmupMs + 45_000, daemons);
    const listening = { control: await canConnect(controlPort), ui: await canConnect(uiPort) };

    const timeoutMs = phaseMs + 45_000;
    const idle = await measurePhase(home, daemons, phaseMs, { timeoutMs });
    const viewer = withViewer ? await startViewer(uiPort) : { requests: {}, boardOrigin: null, stop() {} };
    let viewerPhase = null;
    try {
      if (withViewer) viewerPhase = await measurePhase(home, daemons, phaseMs, { timeoutMs });
    } finally {
      viewer.stop();
    }

    const status = spawnSync(process.execPath, [CLI, "mesh", "status", "--json"], { cwd: projectRoot, env, encoding: "utf8", windowsHide: true, timeout: 60_000 });
    const serveLog = path.join(home, "mesh", "logs", "mesh-serve.log");
    const logLines = existsSync(serveLog)
      ? readFileSync(serveLog, "utf8").split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean)
      : [];
    return {
      home,
      docs: written,
      workspaceId: SOAK_WORKSPACE,
      goneIds,
      ports: { ui: uiPort, control: controlPort },
      listening,
      pids: Object.fromEntries(daemons.map((daemon) => [daemon.name, daemon.pid])),
      phases: { idle, viewer: viewerPhase },
      viewer: { requests: viewer.requests, board: viewer.boardOrigin, boardError: viewer.boardError ?? null },
      status: status.status === 0 ? JSON.parse(status.stdout) : { error: status.stderr || status.stdout, exit: status.status },
      logLines,
    };
  } finally {
    for (const daemon of daemons) await stopDaemon(daemon);
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
  }
}

async function canConnect(port) {
  return await new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

// processAlive(pid) — whether a process the soak started is still in the process table.
export function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}
