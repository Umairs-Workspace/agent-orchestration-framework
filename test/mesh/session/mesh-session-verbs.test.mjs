import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// Traceability wiring for milestone 191 / story 02 — the session verbs (191/ADR-003):
//   tasks/00_one-start-core-for-the-route-and-the-verb.feature       (the plan's own scenarios; the
//     route's are in test/mesh/ui/mesh-ui-session-route.test.mjs and FF-19103's leg is in
//     test/arch/session/acd-launched-session-from-discord.test.mjs)
//   tasks/01_a-start-resolves-the-project-the-node-and-the-item.feature
//   tasks/02_a-start-waits-for-the-link-or-the-refusal.feature
//   tasks/03_the-list-shows-what-is-running.feature
// And milestone 191 / story 03 — `mesh:session-end` (191/ADR-004 §3–§4):
//   tasks/02_the-end-is-confirmed-from-presence.feature   (E5's handler half is in
//     mesh-session-spawn-handler.test.mjs, beside the handler it is about)
//
// TWO HARNESSES, and which one a lane uses is deliberate:
//
//   · THE VERB, CONSTRUCTED OVER FAKES (`createMeshSessionVerbs`). The mesh status, the relay push
//     and the relay subscription are recorded in ONE ordered log, so a lane can say what was pushed,
//     what was subscribed to and in which order — and that nothing was, for a refusal. The frame
//     parser, the frame kind and the session liveness predicate are the SHIPPED ones.
//   · THE CLI, SPAWNED AGAINST A REAL LOOPBACK RELAY (`serveRelay`, in this process) over a real
//     isolated global store. The verb's own push and subscribe transports dial it, and this test
//     plays the far side on its own relay socket: it reads the spawn envelope the verb pushed and
//     answers with the terminal frames or the ack a worker would relay. The waits are scaled down
//     from the scenarios' 45 s — what is under test is the answer at the bound, not the bound's
//     length, and `the scan is bounded` proves the bound itself over fakes.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { createMeshSessionVerbs, SESSION_LINK_SCAN_BYTES, SESSION_END_CONFIRM_MS, SESSION_END_POLL_MS } from "@aof/mesh/commands/session";
import { planSessionStart } from "@aof/mesh/session-start";
import { SESSION_SPAWN_KIND, SESSION_END_KIND, buildSessionSpawnAckEnvelope, buildSessionEndEnvelope } from "@aof/mesh/session-spawn-directive";
import { launchSessionName } from "@aof/mesh/session-spawn-handler";

const TERMINAL_FRAME_KIND = _aofApplication.mesh.terminalRelayBridge.TERMINAL_FRAME_KIND;
const buildTerminalFrameEnvelope = _aofApplication.mesh.terminalRelayBridge.buildTerminalFrameEnvelope;
const parseInboundTerminalFrame = _aofApplication.mesh.terminalMirror.parseInboundTerminalFrame;
const serveRelay = _aofApplication.mesh.relay.serveRelay;
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const publishGlobalRegistryDescriptorsToStore = _aofApplication.mesh.globalNodeRegistry.publishGlobalRegistryDescriptorsToStore;
const publishPresenceRecord = _aofApplication.mesh.presence.publishPresenceRecord;
const publishNodeRecord = _aofHooks.meshStore.publishNodeRecord;
const { isSessionLive, resolveSessionTtlSeconds } = _aofHooks.meshSession;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LINK = "https://claude.ai/code/session_01AbC-x_9";
const OSC8 = (url) => `\u001b]8;;${url}\u001b\\/rc active\u001b]8;;\u001b\\`;

// ═════════════════════════════════ the verb over fakes ═════════════════════════════════

// withProjects(fn, { sameFolder }) — the Background's local workspaces, as REAL directories (the
// verb's locality probe is the real `existsSync`): "aof" (ws-a) and "notes" (ws-n), plus, when
// asked, a third "aof" folder (ws-b) elsewhere.
async function withProjects(fn, { sameFolder = false } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-verbs-"));
  try {
    const roots = { "ws-a": path.join(tmp, "aof"), "ws-n": path.join(tmp, "notes") };
    if (sameFolder) roots["ws-b"] = path.join(tmp, "elsewhere", "aof");
    for (const root of Object.values(roots)) await mkdir(root, { recursive: true });
    return await fn({ tmp, roots });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function statusFor(roots, { nodes = [{ nodeId: "ctl-1", freshness: "live" }, { nodeId: "wsl-2", freshness: "live" }], sessions = [] } = {}) {
  return {
    workspaces: Object.entries(roots).map(([workspaceId, projectRoot]) => ({ workspaceId, projectRoot, name: path.basename(projectRoot) })),
    nodes,
    sessions,
  };
}

// fakeVerbs(status, opts) → { start(input), list(input), log, pushed, subscribed, emit(envelope) }.
// `onPush(envelope, emit)` lets a lane play the worker: it runs after the push lands.
function fakeVerbs(status, { relay = true, pushError = null, onPush = null, findRows = { 191: [{ ref: "191", slug: "discord-remote-control" }] } } = {}) {
  const log = [];
  const pushed = [];
  const finds = [];
  let handler = null;
  let subscriberCreated = 0;
  const emit = (envelope) => handler?.(JSON.stringify(envelope));
  const verbs = createMeshSessionVerbs({
    // A function is asked on every read, so a lane can change what presence says between polls.
    queryGlobalMeshStatus: async () => (typeof status === "function" ? status() : status),
    loadWorkspace: async (projectRoot) => ({ projectRoot }),
    TERMINAL_FRAME_KIND,
    createTerminalRelayPushTransport: (config) => (relay && config?.mesh?.relay?.url
      ? {
        async push(envelope) {
          if (pushError) throw pushError;
          log.push("push");
          pushed.push(envelope);
          if (onPush) setImmediate(() => onPush(envelope, emit));
        },
        close() { log.push("push-closed"); },
      }
      : null),
    createTerminalMirrorSubscriberTransport: (config) => {
      if (!(relay && config?.mesh?.relay?.url)) return null;
      subscriberCreated += 1;
      return {
        onMessage(fn) { handler = fn; },
        async connect() { log.push("subscribe"); },
        close() { log.push("unsubscribe"); handler = null; },
      };
    },
    parseInboundTerminalFrame,
    isSessionLive,
    resolveSessionTtlSeconds,
    invokeRegistered: async (id, input, ctx) => {
      finds.push({ id, input, projectRoot: ctx.workspace.projectRoot });
      return { query: input.query, rows: findRows[input.query] ?? [] };
    },
    reportDegrade: () => {},
  });
  const ctx = { workspace: { config: { mesh: { nodeId: "ctl-1", relay: { url: "ws://127.0.0.1:4180/ws/relay" } } } } };
  return {
    log,
    pushed,
    finds,
    emit,
    get subscriberCreated() { return subscriberCreated; },
    start: (input) => verbs.meshSessionStartCommand.run(input, ctx),
    list: (input = {}) => verbs.meshSessionListCommand.run(input, ctx),
    end: (input, extra = {}) => verbs.meshSessionEndCommand.run(input, { ...ctx, ...extra }),
    endCli: verbs.meshSessionEndCommand.cli,
  };
}

// ── 191/03 task 02 — the end's two fakes: a relay (above) and a mesh status that changes ──────────

const END_ID = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";
const END_NAME = "aof-0b9e6c1e";
const END_NODE = "node-6eb3";

// A clock the test owns: `sleep` moves it and returns at once, so "after 4 s" and "after 15 s" are
// read off the clock the verb itself waited on rather than waited out.
function fakeClock() {
  const start = Date.now();
  let at = start;
  const sleeps = [];
  return {
    now: () => at,
    sleep: async (ms) => { sleeps.push(ms); at += ms; },
    sleeps,
    get elapsed() { return at - start; },
  };
}

// presenceStatus(rows, { freshness, presence }) — the slice of the mesh status payload the end
// reads: each node's OWN presence (`nodes[].presence.sessions[]`) and the index derived from it,
// which — as the real one does — carries only the sessions of a node that is `live`.
function presenceStatus(rows, { freshness = "live", presence = true } = {}) {
  const nodeIds = [...new Set([END_NODE, "wsl-2", ...rows.map((row) => row.nodeId)])];
  return {
    workspaces: [],
    nodes: nodeIds.map((nodeId) => ({
      nodeId,
      freshness,
      ...(presence ? { presence: { sessions: rows.filter((row) => row.nodeId === nodeId).map(({ nodeId: _nodeId, ...session }) => session) } } : {}),
    })),
    sessions: freshness === "live" ? rows : [],
  };
}

const liveRow = (overrides = {}) => ({ nodeId: END_NODE, sessionId: END_ID, workspaceId: "ws-a", repo: "aof", assistant: "claude", lastPingAt: NOW(), ...overrides });

// endFixture({ leavesAfterMs }) — the Background: a fake relay, a fake mesh status, and the live
// session END_ID named END_NAME on END_NODE, whose row leaves presence once the verb's own clock
// has moved `leavesAfterMs` (never, when it is null).
function endFixture({ leavesAfterMs = null, rows = [liveRow()], after = null, ...verbOptions } = {}) {
  const clock = fakeClock();
  const reads = [];
  const verbs = fakeVerbs(() => {
    reads.push(clock.elapsed);
    if (after != null && clock.elapsed > 0) return after(clock.elapsed);
    const gone = leavesAfterMs != null && clock.elapsed >= leavesAfterMs;
    return presenceStatus(gone ? rows.filter((row) => row.sessionId !== END_ID) : rows);
  }, verbOptions);
  return { clock, reads, verbs, end: (input) => verbs.end(input, { sessionEndClock: clock }) };
}

const frameFor = (envelope, bytes) => buildTerminalFrameEnvelope(envelope.nodeId, envelope.signal.sessionId, bytes);

// ═══════════════════════════ the CLI against a real loopback relay ═══════════════════════════

const NOW = () => new Date().toISOString();

async function writeProject(root, { name, workspaceId, nodeId, relayUrl }) {
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const mesh = { workspaceId, nodeId, ...(relayUrl ? { relay: { url: relayUrl } } : {}) };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh }, null, 2)}\n`, "utf8");
}

// withMeshFixture(fn, { sessions }) — the control "node-6eb3" with local workspaces "aof" (ws-a,
// holding item 191) and "notes" (ws-n), node "wsl-2" stale, a REAL relay on an ephemeral loopback
// port named in both projects' config, and every row published through the real publishers into
// an isolated AOF_GLOBAL_HOME. `sessions` are presence sessions published for node-6eb3.
async function withMeshFixture(fn, { sessions = [] } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-cli-"));
  const home = path.join(tmp, "home");
  const env = { AOF_GLOBAL_HOME: home };
  const relay = await serveRelay({ port: 0 });
  try {
    const roots = { "ws-a": path.join(tmp, "aof"), "ws-n": path.join(tmp, "notes") };
    for (const [workspaceId, root] of Object.entries(roots)) {
      await writeProject(root, { name: path.basename(root), workspaceId, nodeId: "node-6eb3", relayUrl: relay.url });
    }
    const milestone = path.join(roots["ws-a"], "wiki", "work", "191_milestone_discord-remote-control");
    await mkdir(milestone, { recursive: true });
    await writeFile(path.join(milestone, "SPEC.md"), "---\ntype: milestone\nnumber: 191\nslug: discord-remote-control\nstatus: in-progress\ntitle: \"Discord\"\ncreated: 2026-11-11\nupdated: 2026-11-11\n---\n# 191\n", "utf8");

    const primary = await loadWorkspace(roots["ws-a"], undefined, { env });
    const now = NOW();
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    for (const [nodeId, heartbeatAt] of [["node-6eb3", now], ["wsl-2", stale]]) {
      await publishNodeRecord(primary, nodeId, { nodeId, host: nodeId, os: "linux", runtimes: [], skills: [], aofVersion: "0.1.0", publishedAt: now });
      await publishPresenceRecord(primary, nodeId, { nodeId, heartbeatAt, activeRuns: [], sessions: nodeId === "node-6eb3" ? sessions : [], aofVersion: "0.1.0" });
    }
    const store = await openGlobalWorkProjectionStore({ env });
    try {
      for (const root of Object.values(roots)) {
        const workspace = await loadWorkspace(root, undefined, { env });
        await store.publishWorkspaceSnapshot(workspace, { now });
        await publishGlobalRegistryDescriptorsToStore(store, workspace, { now });
      }
    } finally {
      store.close();
    }
    return await fn({ tmp, home, roots, relay });
  } finally {
    await relay.stop();
    await rm(tmp, { recursive: true, force: true });
  }
}

// The far side of the relay, played by the test: a plain relay client that records what it hears.
function relayClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const heard = [];
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error("join-ack timeout")); } }, 3000);
    ws.on("message", (data) => {
      let parsed = null;
      try { parsed = JSON.parse(data.toString()); } catch { return; }
      if (parsed?.type === "joined") {
        if (!settled) { settled = true; clearTimeout(timer); resolve({ heard, send: (envelope) => ws.send(JSON.stringify(envelope)), close: () => ws.close() }); }
        return;
      }
      heard.push(parsed);
    });
    ws.on("error", (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } });
  });
}

function runCli(root, home, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd: root, env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => {
      let json = null;
      try { json = JSON.parse(stdout); } catch { /* asserted by the caller */ }
      resolve({ status, stdout, stderr, json });
    });
  });
}

function waitFor(predicate, { timeoutMs = 15_000, label = "condition" } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (predicate()) { resolve(); return; }
      if (Date.now() - startedAt > timeoutMs) { reject(new Error(`timed out waiting for ${label}`)); return; }
      setTimeout(tick, 10);
    };
    tick();
  });
}

const spawnsHeard = (client) => client.heard.filter((envelope) => envelope?.kind === SESSION_SPAWN_KIND);
const endsHeard = (client) => client.heard.filter((envelope) => envelope?.kind === SESSION_END_KIND);

// ═════════════════════════════════════════ the cases ═════════════════════════════════════════

export const meshSessionVerbsTests = [
  // ═══ Task 00 — one start core for the route and the verb ═══════════════════════════════════

  // ══ Scenario Outline: the plan refuses in the route's own order and codes ══
  {
    name: "mesh-session-verbs/00 the plan refuses in the route's own order and codes — every Examples row",
    run() {
      const live = { workspaces: [{ workspaceId: "ws-a", projectRoot: "/p/aof" }], nodes: [{ nodeId: "wsl-2", freshness: "live" }] };
      const ask = (overrides) => planSessionStart({ status: live, workspaceId: "ws-a", nodeId: "wsl-2", issuer: "ctl-1", relayAvailable: true, pathExists: () => true, ...overrides });
      const rows = [
        { state: "no row is ws-a", plan: ask({ status: { ...live, workspaces: [] } }), code: "workspace-not-found", status: 404 },
        { state: "ws-a's projectRoot does not exist here", plan: ask({ pathExists: () => false }), code: "workspace-not-local", status: 409 },
        { state: "the control has no node identity", plan: ask({ issuer: null }), code: "control-identity-unknown", status: 409 },
        { state: "wsl-2's presence is stale", plan: ask({ status: { ...live, nodes: [{ nodeId: "wsl-2", freshness: "stale" }] } }), code: "session-target-not-connected", status: 503 },
        { state: "no relay is configured", plan: ask({ relayAvailable: false }), code: "session-dispatch-unavailable", status: 503 },
      ];
      for (const row of rows) {
        assert.equal(row.plan.ok, false, `${row.state}: refused`);
        assert.equal(row.plan.code, row.code, `${row.state}: code`);
        assert.equal(row.plan.status, row.status, `${row.state}: status`);
        assert.equal(typeof row.plan.message, "string", `${row.state}: a message`);
      }
      // ORDER: with every check failing at once, the first in the route's order answers, and each
      // later one answers only once the earlier ones pass.
      const allFail = { status: { workspaces: [], nodes: [] }, pathExists: () => false, issuer: null, relayAvailable: false };
      assert.equal(ask(allFail).code, "workspace-not-found");
      assert.equal(ask({ ...allFail, status: live }).code, "workspace-not-local");
      assert.equal(ask({ ...allFail, status: { ...live, nodes: [] }, pathExists: () => true }).code, "control-identity-unknown");
      assert.equal(ask({ ...allFail, status: { ...live, nodes: [] }, pathExists: () => true, issuer: "ctl-1" }).code, "session-target-not-connected");
    },
  },

  // ══ Scenario: a plan that passes mints a session id ══
  {
    name: "mesh-session-verbs/00 a plan that passes mints a canonical UUID session id with node wsl-2 and workspace ws-a — and carries the envelope the face pushes",
    run() {
      const plan = planSessionStart({
        status: { workspaces: [{ workspaceId: "ws-a", projectRoot: "/p/aof" }], nodes: [{ nodeId: "wsl-2", freshness: "live" }] },
        workspaceId: "ws-a",
        nodeId: "wsl-2",
        issuer: "ctl-1",
        relayAvailable: true,
        pathExists: () => true,
      });
      assert.equal(plan.ok, true);
      assert.match(plan.sessionId, CANONICAL_UUID);
      assert.equal(plan.nodeId, "wsl-2");
      assert.equal(plan.workspaceId, "ws-a");
      assert.deepEqual(Object.keys(plan.envelope).sort(), ["kind", "nodeId", "signal"]);
      assert.equal(plan.envelope.kind, SESSION_SPAWN_KIND);
      assert.equal(plan.envelope.nodeId, "wsl-2");
      assert.equal(plan.envelope.signal.sessionId, plan.sessionId, "the envelope carries the id the plan minted");
      const second = planSessionStart({ status: { workspaces: [{ workspaceId: "ws-a", projectRoot: "/p/aof" }], nodes: [{ nodeId: "wsl-2", freshness: "live" }] }, workspaceId: "ws-a", nodeId: "wsl-2", issuer: "ctl-1", relayAvailable: true, pathExists: () => true });
      assert.notEqual(second.sessionId, plan.sessionId, "a fresh id per plan");
    },
  },

  // ═══ Task 01 — a start resolves the project, the node and the item ═════════════════════════

  // ══ Scenario Outline: the project is found by id or by folder name ══
  {
    name: "mesh-session-verbs/01 the project is found by id or by folder name — ws-a, aof and notes each push for their own workspace",
    async run() {
      await withProjects(async ({ roots }) => {
        for (const [given, workspace] of [["ws-a", "ws-a"], ["aof", "ws-a"], ["notes", "ws-n"]]) {
          const verbs = fakeVerbs(statusFor(roots));
          const answer = await verbs.start({ project: given });
          assert.equal(verbs.pushed.length, 1, `${given}: one frame pushed`);
          assert.equal(verbs.pushed[0].signal.workspaceId, workspace, `${given}: the frame is for ${workspace}`);
          assert.equal(answer.workspaceId, workspace);
        }
      });
    },
  },

  // ══ Scenario: an unknown project is refused naming the ones there are ══
  {
    name: "mesh-session-verbs/01 an unknown project is refused session-project-unknown naming aof and notes, and nothing is pushed",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots));
        await assert.rejects(verbs.start({ project: "aoff" }), (error) => {
          assert.equal(error.code, "session-project-unknown");
          assert.match(error.message, /\baof\b/);
          assert.match(error.message, /\bnotes\b/);
          return true;
        });
        assert.equal(verbs.pushed.length, 0, "nothing is pushed to the relay");
        assert.equal(verbs.subscriberCreated, 0);
      });
    },
  },

  // ══ Scenario: two projects with the same folder name are refused as ambiguous ══
  {
    name: "mesh-session-verbs/01 two projects with the same folder name are refused session-project-ambiguous naming ws-a and ws-b",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots));
        await assert.rejects(verbs.start({ project: "aof" }), (error) => {
          assert.equal(error.code, "session-project-ambiguous");
          assert.match(error.message, /ws-a/);
          assert.match(error.message, /ws-b/);
          return true;
        });
        assert.equal(verbs.pushed.length, 0);
        const byId = await verbs.start({ project: "ws-b" });
        assert.equal(byId.workspaceId, "ws-b", "…and either is still reachable by its workspace id");
      }, { sameFolder: true });
    },
  },

  // ══ Scenario Outline: the node defaults to the control and can be named ══
  {
    name: "mesh-session-verbs/01 the node defaults to the control (ctl-1) and can be named (wsl-2)",
    async run() {
      await withProjects(async ({ roots }) => {
        for (const [node, target] of [[undefined, "ctl-1"], ["wsl-2", "wsl-2"]]) {
          const verbs = fakeVerbs(statusFor(roots));
          const answer = await verbs.start({ project: "aof", ...(node ? { node } : {}) });
          assert.equal(verbs.pushed[0].nodeId, target, `node ${node ?? "absent"}: the frame is pushed for ${target}`);
          assert.equal(answer.nodeId, target);
        }
      });
    },
  },

  // ══ Scenario: every start asks for Claude with Remote Control ══
  {
    name: "mesh-session-verbs/01 every start asks for Claude with Remote Control — the pushed frame carries launch claude-remote-control",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots));
        await verbs.start({ project: "aof" });
        assert.equal(verbs.pushed[0].signal.launch, "claude-remote-control");
      });
    },
  },

  // ══ Scenario: an item that exists is carried to the node ══
  {
    name: "mesh-session-verbs/01 an item that exists is carried to the node — work:find in that project, then itemRef 191 on the frame",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots));
        const answer = await verbs.start({ project: "aof", item: "191" });
        assert.deepEqual(verbs.finds, [{ id: "work:find", input: { query: "191" }, projectRoot: roots["ws-a"] }], "the item is asked of THAT project");
        assert.equal(verbs.pushed[0].signal.itemRef, "191");
        assert.equal(answer.item, "191");
      });
    },
  },

  // ══ Scenario: the CLI face carries the verb ══
  {
    name: "mesh-session-verbs/01 the CLI face carries the verb — `aof mesh session start aof --item 191 --json` prints project, item, nodeId, sessionId and name, and the relay carries its frame",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const result = await runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--item", "191", "--json"]);
          assert.equal(result.status, 0, `exit 0 — ${result.stdout}${result.stderr}`);
          const answer = result.json;
          assert.ok(answer, `parseable JSON — ${result.stdout}`);
          for (const key of ["project", "item", "nodeId", "sessionId", "name"]) assert.ok(key in answer, `the answer carries ${key}`);
          assert.equal(answer.project, "aof");
          assert.equal(answer.item, "191");
          assert.equal(answer.nodeId, "node-6eb3", "the control is the default node");
          assert.match(answer.sessionId, CANONICAL_UUID);
          assert.equal(answer.name, launchSessionName("aof", answer.sessionId));
          await waitFor(() => spawnsHeard(far).length === 1, { label: "the spawn envelope on the relay" });
          const [spawned] = spawnsHeard(far);
          assert.equal(spawned.nodeId, "node-6eb3");
          assert.equal(spawned.signal.sessionId, answer.sessionId);
          assert.equal(spawned.signal.itemRef, "191");
          assert.equal(spawned.signal.launch, "claude-remote-control");
        } finally {
          far.close();
        }
      });
    },
  },

  // ══ Rule R2 · E4: an offline node is refused with the fleet button's code ══
  {
    name: "mesh-session-verbs/01 E4 · `--node wsl-2` while wsl-2 is stale is refused session-target-not-connected, the fleet route's code, and nothing is pushed",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const result = await runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--node", "wsl-2", "--json"]);
          assert.equal(result.status, 1, result.stdout);
          assert.equal(result.json?.ok, false);
          assert.equal(result.json?.code, "session-target-not-connected");
          await new Promise((resolve) => setTimeout(resolve, 200));
          assert.equal(far.heard.length, 0, "nothing is pushed to the relay");
        } finally {
          far.close();
        }
      });
    },
  },

  // ══ Rule R2 · E6: a mistyped item is refused and makes no worktree ══
  {
    name: "mesh-session-verbs/01 E6 · `--item 19l` is refused session-item-unknown and nothing is pushed, so no node is asked to make a worktree",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const result = await runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--item", "19l", "--json"]);
          assert.equal(result.status, 1, result.stdout);
          assert.equal(result.json?.code, "session-item-unknown");
          await new Promise((resolve) => setTimeout(resolve, 200));
          assert.equal(far.heard.length, 0, "nothing is pushed to the relay");
        } finally {
          far.close();
        }
      });
    },
  },

  // ═══ Task 02 — a start waits for the link or the refusal, and never lies ══════════════════

  // ══ Scenario: the link inside an OSC-8 sequence is found ══
  {
    name: "mesh-session-verbs/02 the link inside an OSC-8 sequence is found, unstripped",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots), {
          onPush: (envelope, emit) => {
            emit(frameFor(envelope, "\u001b[2J\u001b[Hwelcome\r\n"));
            emit(frameFor(envelope, `footer ${OSC8(LINK)} more`));
          },
        });
        const answer = await verbs.start({ project: "aof", waitMs: 45_000 });
        assert.equal(answer.outcome, "started");
        assert.equal(answer.link, LINK);
      });
    },
  },

  // ══ Scenario: the subscription opens before the push and always closes ══
  {
    name: "mesh-session-verbs/02 the subscription opens before the spawn envelope is pushed, and is closed after every answer — a throw included",
    async run() {
      await withProjects(async ({ roots }) => {
        const answered = fakeVerbs(statusFor(roots), { onPush: (envelope, emit) => emit(frameFor(envelope, `${LINK} `)) });
        await answered.start({ project: "aof", waitMs: 45_000 });
        assert.deepEqual(answered.log, ["subscribe", "push", "unsubscribe", "push-closed"]);

        const refused = fakeVerbs(statusFor(roots), { onPush: (envelope, emit) => emit(buildSessionSpawnAckEnvelope(envelope.nodeId, { sessionId: envelope.signal.sessionId, ok: false, code: "session-repo-unavailable" })) });
        await refused.start({ project: "aof", waitMs: 45_000 });
        assert.deepEqual(refused.log, ["subscribe", "push", "unsubscribe", "push-closed"]);

        const timedOut = fakeVerbs(statusFor(roots));
        const answer = await timedOut.start({ project: "aof", waitMs: 50 });
        assert.equal(answer.outcome, "no-link");
        assert.deepEqual(timedOut.log, ["subscribe", "push", "unsubscribe", "push-closed"]);

        const threw = fakeVerbs(statusFor(roots), { pushError: new Error("relay socket ECONNREFUSED 127.0.0.1:4180") });
        await assert.rejects(threw.start({ project: "aof", waitMs: 45_000 }), (error) => {
          assert.equal(error.code, "session-dispatch-failed");
          assert.doesNotMatch(error.message, /ECONNREFUSED|4180/, "the transport's host and port never reach the answer");
          return true;
        });
        assert.deepEqual(threw.log, ["subscribe", "unsubscribe", "push-closed"], "a push that threw still closes the subscription");
      });
    },
  },

  // ══ Scenario: frames for another session are ignored ══
  {
    name: "mesh-session-verbs/02 frames for another session — another id, or the same id on another node — are ignored",
    async run() {
      await withProjects(async ({ roots }) => {
        const other = "https://claude.ai/code/session_OTHER";
        const verbs = fakeVerbs(statusFor(roots), {
          onPush: (envelope, emit) => {
            emit(buildTerminalFrameEnvelope(envelope.nodeId, "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", `${other} `));
            emit(buildTerminalFrameEnvelope("wsl-2", envelope.signal.sessionId, `${other} `));
            emit(buildSessionSpawnAckEnvelope("wsl-2", { sessionId: envelope.signal.sessionId, ok: false, code: "session-repo-unavailable" }));
            emit(frameFor(envelope, `${LINK} `));
          },
        });
        const answer = await verbs.start({ project: "aof", waitMs: 45_000 });
        assert.equal(answer.outcome, "started", "another node's refusal is not this session's");
        assert.equal(answer.link, LINK, "the verb does not answer with the other session's link");
      });
    },
  },

  // ══ Scenario: the scan is bounded ══
  {
    name: "mesh-session-verbs/02 the scan is bounded — after 64 KiB of output a link is no longer looked for, and the answer is no-link when the wait ends",
    async run() {
      await withProjects(async ({ roots }) => {
        const kib = "x".repeat(1024);
        const verbs = fakeVerbs(statusFor(roots), {
          onPush: (envelope, emit) => {
            for (let i = 0; i < 70; i += 1) emit(frameFor(envelope, kib));
            emit(frameFor(envelope, `${LINK} `));
          },
        });
        assert.equal(SESSION_LINK_SCAN_BYTES, 64 * 1024);
        const answer = await verbs.start({ project: "aof", waitMs: 300 });
        assert.equal(answer.outcome, "no-link", "a link past the 64 KiB bound is not found");
        assert.equal(answer.link, null);

        // …and the bound is not an off-by-a-chunk: a link that ENDS inside the first 64 KiB is found.
        const within = fakeVerbs(statusFor(roots), {
          onPush: (envelope, emit) => {
            for (let i = 0; i < 63; i += 1) emit(frameFor(envelope, kib));
            emit(frameFor(envelope, `${LINK} ${"y".repeat(2048)}`));
          },
        });
        assert.equal((await within.start({ project: "aof", waitMs: 45_000 })).link, LINK);
      });
    },
  },

  // ══ Rule R1 · E1: the link appears within the wait ══
  {
    name: "mesh-session-verbs/02 E1 · `aof mesh session start aof --wait 45000 --json`: the link appears in the session's output and the answer is started, node node-6eb3, project aof and that link",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const running = runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--wait", "45000", "--json"]);
          await waitFor(() => spawnsHeard(far).length === 1, { label: "the spawn envelope" });
          const [spawned] = spawnsHeard(far);
          far.send(frameFor(spawned, "\u001b[?1049h starting claude\r\n"));
          await new Promise((resolve) => setTimeout(resolve, 500));
          far.send(frameFor(spawned, `\u001b[24;1H${OSC8(LINK)}`));
          const result = await running;
          assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
          assert.equal(result.json.outcome, "started");
          assert.equal(result.json.nodeId, "node-6eb3");
          assert.equal(result.json.project, "aof");
          assert.equal(result.json.link, LINK);
          assert.equal(result.json.sessionId, spawned.signal.sessionId);
        } finally {
          far.close();
        }
      });
    },
  },

  // ══ Rule R1 · E2: no link within the wait is not a failure ══
  {
    name: "mesh-session-verbs/02 E2 · no link within the wait answers no-link with the session's name and no link — exit 0, and the session is not ended",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const running = runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--wait", "1500", "--json"]);
          await waitFor(() => spawnsHeard(far).length === 1, { label: "the spawn envelope" });
          const [spawned] = spawnsHeard(far);
          far.send(frameFor(spawned, "output, but no link\r\n"));
          const result = await running;
          assert.equal(result.status, 0, `no link is not a failure — ${result.stdout}${result.stderr}`);
          assert.equal(result.json.outcome, "no-link");
          assert.equal(result.json.link, null);
          assert.equal(result.json.name, `aof-${result.json.sessionId.slice(0, 8)}`, "the name the Claude app lists it under");
          assert.deepEqual(far.heard.map((envelope) => envelope.kind), [SESSION_SPAWN_KIND], "the verb sent nothing after the spawn — no end, no input");
        } finally {
          far.close();
        }
      });
    },
  },

  // ══ Rule R1 · E3: with no wait the verb answers at once ══
  {
    name: "mesh-session-verbs/02 E3 · with no wait the verb answers after the push without subscribing, with the session id and name and no link",
    async run() {
      await withProjects(async ({ roots }) => {
        const verbs = fakeVerbs(statusFor(roots));
        const answer = await verbs.start({ project: "aof" });
        assert.equal(verbs.subscriberCreated, 0, "no subscription is opened");
        assert.deepEqual(verbs.log, ["push", "push-closed"]);
        assert.match(answer.sessionId, CANONICAL_UUID);
        assert.equal(answer.sessionId, verbs.pushed[0].signal.sessionId);
        assert.equal(answer.name, launchSessionName("aof", answer.sessionId));
        assert.equal(answer.link, null);
        assert.equal(answer.outcome, "no-link");

        // With no relay configured, a start with or without a wait is the plan's own refusal —
        // the fleet button's code — and nothing is pushed or subscribed to.
        for (const waitMs of [0, 45_000]) {
          const unrelayed = fakeVerbs(statusFor(roots), { relay: false });
          await assert.rejects(unrelayed.start({ project: "aof", waitMs }), (error) => error.code === "session-dispatch-unavailable");
          assert.deepEqual(unrelayed.log, [], `waitMs ${waitMs}: nothing pushed or subscribed`);
        }
      });
    },
  },

  // ══ Rule R2 · E5: the worker's refusal is answered with its code ══
  {
    name: "mesh-session-verbs/02 E5 · a session-spawn-ack with ok false and code session-repo-unavailable answers outcome refused with that code, and exits 1",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          // wsl-2 is stale in this fixture; the refusal lane is the same for the control, which is live.
          const running = runCli(roots["ws-a"], home, ["mesh", "session", "start", "aof", "--wait", "45000", "--json"]);
          await waitFor(() => spawnsHeard(far).length === 1, { label: "the spawn envelope" });
          const [spawned] = spawnsHeard(far);
          far.send(buildSessionSpawnAckEnvelope(spawned.nodeId, { sessionId: spawned.signal.sessionId, ok: false, code: "session-repo-unavailable" }));
          const result = await running;
          assert.equal(result.status, 1, result.stdout);
          assert.equal(result.json.outcome, "refused");
          assert.equal(result.json.code, "session-repo-unavailable");
          assert.equal(result.json.ok, false);
          assert.equal(result.json.link, null);
        } finally {
          far.close();
        }
      });
    },
  },

  // ═══ Task 03 — the list shows what is running ══════════════════════════════════════════════

  // ══ Scenario: the list for every local project ══
  {
    name: "mesh-session-verbs/03 the list for every local project answers s1, s2 and s3",
    async run() {
      await withProjects(async ({ roots }) => {
        const now = NOW();
        const verbs = fakeVerbs(statusFor(roots, { sessions: [
          { nodeId: "ctl-1", sessionId: "s1", workspaceId: "ws-a", repo: "aof", lastPingAt: now },
          { nodeId: "wsl-2", sessionId: "s2", workspaceId: "ws-a", repo: "aof", lastPingAt: now },
          { nodeId: "ctl-1", sessionId: "s3", workspaceId: "ws-n", repo: "notes", lastPingAt: now },
        ] }));
        const answer = await verbs.list();
        assert.deepEqual(answer.sessions.map((entry) => entry.sessionId), ["s1", "s2", "s3"]);
      });
    },
  },

  // ══ Scenario: the list reads only ══
  {
    name: "mesh-session-verbs/03 the list reads only — nothing is pushed or subscribed to, and no file is written",
    async run() {
      await withProjects(async ({ tmp, roots }) => {
        const before = await readdir(tmp, { recursive: true });
        const verbs = fakeVerbs(statusFor(roots, { sessions: [{ nodeId: "ctl-1", sessionId: "s1", workspaceId: "ws-a", repo: "aof", lastPingAt: NOW() }] }));
        await verbs.list();
        await verbs.list({ project: "aof" });
        assert.deepEqual(verbs.log, [], "no push, no subscription");
        assert.equal(verbs.subscriberCreated, 0);
        assert.deepEqual(await readdir(tmp, { recursive: true }), before, "no file is written");
        const source = await readFile(new URL("../../../packages/mesh/src/commands/session.mjs", import.meta.url), "utf8");
        const listBody = source.slice(source.indexOf('id: "mesh:session-list"'));
        assert.doesNotMatch(listBody.slice(0, listBody.indexOf("cli: {")), /createTerminal|\.push\(|writeFile|writeText/, "the list's run names no transport and no write");
      });
    },
  },

  // ══ Rule R3 · E7: the list for one project shows only its sessions ══
  {
    name: "mesh-session-verbs/03 E7 · `aof mesh session list aof --json` answers s1 and s2, each with its node, its start time and its name — and not s3",
    async run() {
      const now = NOW();
      const session = (sessionId, workspaceId, repo) => ({ sessionId, workspaceId, repo, assistant: "claude", lastPingAt: now, workspaceHasRun: false, relaying: true });
      await withMeshFixture(async ({ home, roots }) => {
        const result = await runCli(roots["ws-n"], home, ["mesh", "session", "list", "aof", "--json"]);
        assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
        const ids = result.json.sessions.map((entry) => entry.sessionId);
        assert.deepEqual(ids, ["s1", "s2"]);
        for (const entry of result.json.sessions) {
          assert.equal(entry.nodeId, "node-6eb3", `${entry.sessionId}: its node`);
          assert.equal(entry.project, "aof");
          assert.equal(entry.name, launchSessionName("aof", entry.sessionId), `${entry.sessionId}: its name`);
          // The presence wire states no start time (191/02 finding): the key is present and never
          // invented, and the last ping is what the wire does state.
          assert.ok("startedAt" in entry, `${entry.sessionId}: a start-time key`);
          assert.equal(entry.lastPingAt, now);
        }
      }, { sessions: [session("s1", "ws-a", "aof"), session("s2", "ws-a", "aof"), session("s3", "ws-n", "notes")] });
    },
  },

  // ══ Scenario: a session whose record has expired is not listed ══
  {
    name: "mesh-session-verbs/03 a session whose record is past its TTL is not listed",
    async run() {
      await withProjects(async ({ roots }) => {
        const ttl = resolveSessionTtlSeconds(undefined);
        const expired = new Date(Date.now() - (ttl + 30) * 1000).toISOString();
        const verbs = fakeVerbs(statusFor(roots, { sessions: [
          { nodeId: "ctl-1", sessionId: "s1", workspaceId: "ws-a", repo: "aof", lastPingAt: NOW() },
          { nodeId: "ctl-1", sessionId: "s2", workspaceId: "ws-a", repo: "aof", lastPingAt: expired },
        ] }));
        const answer = await verbs.list({ project: "aof" });
        assert.deepEqual(answer.sessions.map((entry) => entry.sessionId), ["s1"]);
      });
    },
  },

  // ═══ 191/03 task 02 — the end is confirmed from presence (191/ADR-004 §3–§4) ════════════════

  // ══ Scenario: a session can be named by its name instead of its id ══
  {
    name: "191/03 task02 — a session can be named by its name instead of its id: `end aof-0b9e6c1e` with the row leaving presence after 2 s pushes a session-end envelope for node-6eb3 and that session, and answers ended: true",
    async run() {
      const { end, verbs, clock } = endFixture({ leavesAfterMs: 2000 });
      const answer = await end({ session: END_NAME });
      assert.equal(verbs.pushed.length, 1, "one envelope is pushed");
      assert.deepEqual(verbs.pushed[0], buildSessionEndEnvelope(END_NODE, { sessionId: END_ID, at: verbs.pushed[0].signal.at }));
      assert.equal(verbs.pushed[0].kind, "session-end");
      assert.equal(verbs.pushed[0].nodeId, END_NODE);
      assert.equal(verbs.pushed[0].signal.sessionId, END_ID);
      assert.equal(answer.ended, true);
      assert.equal(clock.elapsed, 2000, "it answers when the row leaves, not at the end of the window");
    },
  },
  {
    name: "191/03 task02 — the CLI face carries the verb: `aof mesh session end aof-0b9e6c1e --json` pushes the session-end envelope onto the real relay, and answers ended: true (exit 0) once node-6eb3's presence no longer carries the session",
    async run() {
      const now = NOW();
      const session = { sessionId: END_ID, workspaceId: "ws-a", repo: "aof", assistant: "claude", lastPingAt: now, workspaceHasRun: false, relaying: true };
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const running = runCli(roots["ws-n"], home, ["mesh", "session", "end", END_NAME, "--json"]);
          await waitFor(() => endsHeard(far).length === 1, { label: "the session-end envelope" });
          assert.deepEqual(endsHeard(far)[0], buildSessionEndEnvelope(END_NODE, { sessionId: END_ID, at: endsHeard(far)[0].signal.at }), "the relay carries the lane's own envelope");
          // The node's half, played here: it ends the session, removes its record and republishes
          // its presence without it — through the real publisher, into the store the CLI reads.
          const primary = await loadWorkspace(roots["ws-a"], undefined, { env: { AOF_GLOBAL_HOME: home } });
          await publishPresenceRecord(primary, END_NODE, { nodeId: END_NODE, heartbeatAt: NOW(), activeRuns: [], sessions: [], aofVersion: "0.1.0" });
          const result = await running;
          assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
          assert.equal(result.json.ended, true);
          assert.equal(result.json.sessionId, END_ID);
          assert.equal(result.json.nodeId, END_NODE);
          assert.equal(result.json.name, END_NAME);
          assert.equal(endsHeard(far).length, 1, "the request is sent once");
        } finally {
          far.close();
        }
      }, { sessions: [session] });
    },
  },

  // ══ Rule R1 · E1: the record leaving presence confirms the end ══
  {
    name: "191/03 task02 — E1 · the record leaving presence confirms the end: `end <id>` with the row leaving after 4 s answers ended: true with that session and node node-6eb3 — read once a second, and not before the row left",
    async run() {
      const { end, verbs, clock, reads } = endFixture({ leavesAfterMs: 4000 });
      const answer = await end({ session: END_ID });
      assert.deepEqual(
        { ended: answer.ended, sessionId: answer.sessionId, nodeId: answer.nodeId },
        { ended: true, sessionId: END_ID, nodeId: END_NODE },
      );
      assert.equal(answer.ok, true);
      assert.equal(answer.name, END_NAME);
      assert.equal(clock.elapsed, 4000);
      assert.deepEqual(reads, [0, 1000, 2000, 3000, 4000], "one read to find the session, then one a second until it is gone");
      assert.deepEqual(verbs.log, ["push", "push-closed"], "the push transport is closed once the request is sent");
      assert.equal(verbs.subscriberCreated, 0, "confirmation reads presence — it subscribes to nothing");
      assert.equal(verbs.endCli.exit(answer), 0);
      assert.match(verbs.endCli.render(answer), /^session ended: aof-0b9e6c1e on node-6eb3/);
    },
  },

  // ══ Rule R1 · E2: an end the node never carries out is reported as unconfirmed ══
  {
    name: "191/03 task02 — E2 · an end the node never carries out is reported as unconfirmed: the row still in presence after 15 s answers ended: false, saying the request was sent and the session is still listed",
    async run() {
      const { end, verbs, clock } = endFixture({ leavesAfterMs: null });
      const answer = await end({ session: END_ID });
      assert.equal(answer.ended, false);
      assert.equal(answer.ok, false, "an unconfirmed end is never answered as a success");
      assert.equal(answer.code, "session-end-unconfirmed");
      assert.equal(answer.listed, true, "the session is still listed");
      assert.equal(verbs.pushed.length, 1, "the request was sent");
      assert.equal(answer.sessionId, END_ID);
      assert.equal(answer.nodeId, END_NODE);
      assert.equal(SESSION_END_CONFIRM_MS, 15_000);
      assert.equal(clock.elapsed, 15_000, "it waits 15 s, and no longer");
      assert.equal(clock.sleeps.length, 15_000 / SESSION_END_POLL_MS, "one read a second for the whole window");
      const said = verbs.endCli.render(answer);
      assert.match(said, /the request was sent to node-6eb3/);
      assert.match(said, /aof-0b9e6c1e is still listed/);
      assert.equal(verbs.endCli.exit(answer), 1, "…and the CLI exits 1 on it");
    },
  },
  {
    name: "191/03 task02 — a node that goes quiet mid-wait is NOT a confirmed end: its sessions drop out of the status index while its own frozen presence still carries the row, and the answer is ended: false; a presence that cannot be read at all answers ended: false, not listed",
    async run() {
      // The node stopped heartbeating: the index (`sessions[]`) no longer lists it, which read
      // naively is "the row is gone". Its own presence record is frozen with the session in it.
      const stale = endFixture({ after: () => presenceStatus([liveRow()], { freshness: "stale" }) });
      const quiet = await stale.end({ session: END_ID });
      assert.equal(quiet.ended, false, "a row that only left the index is not a record the node removed");
      assert.equal(quiet.listed, true);
      assert.equal(stale.clock.elapsed, 15_000);

      const unreadable = endFixture({ after: () => presenceStatus([liveRow()], { presence: false }) });
      const blind = await unreadable.end({ session: END_ID });
      assert.equal(blind.ended, false);
      assert.equal(blind.listed, false, "nothing was read, so nothing is claimed either way");
      assert.match(unreadable.verbs.endCli.render(blind), /its presence could not be read/);

      // A status read that throws mid-wait states nothing: it neither confirms nor stops the wait.
      let failing = true;
      const flaky = endFixture({ after: (elapsed) => {
        if (failing && elapsed <= 2000) throw new Error("store busy");
        failing = false;
        return presenceStatus([]);
      } });
      const recovered = await flaky.end({ session: END_ID });
      assert.equal(recovered.ended, true);
      assert.equal(flaky.clock.elapsed, 3000, "the read that worked is the one that confirmed it");
    },
  },

  // ══ Rule R1 · E3: an id no live session carries is refused and nothing is sent ══
  {
    name: "191/03 task02 — E3 · an id no live session carries is refused session-not-found and nothing is pushed to the relay — and so is a session whose record is past its TTL, or one on another node than the one named",
    async run() {
      const unknown = endFixture();
      await assert.rejects(
        () => unknown.end({ session: "11111111-2222-4333-8444-555555555555" }),
        (error) => error.code === "session-not-found" && error.status === 404,
      );
      assert.deepEqual(unknown.verbs.pushed, [], "nothing is pushed to the relay");
      assert.deepEqual(unknown.verbs.log, [], "no transport is even opened");
      assert.equal(unknown.clock.elapsed, 0, "…and nothing is waited for");

      const ttl = resolveSessionTtlSeconds(undefined);
      const expired = endFixture({ rows: [liveRow({ lastPingAt: new Date(Date.now() - (ttl + 30) * 1000).toISOString() })] });
      await assert.rejects(() => expired.end({ session: END_ID }), (error) => error.code === "session-not-found");
      assert.deepEqual(expired.verbs.pushed, []);

      const elsewhere = endFixture();
      await assert.rejects(() => elsewhere.end({ session: END_ID, node: "wsl-2" }), (error) => error.code === "session-not-found");
      assert.deepEqual(elsewhere.verbs.pushed, [], "an end is never sent to a node whose presence does not carry the session");

      await assert.rejects(() => endFixture().end({ session: "   " }), (error) => error.code === "invalid-input");
    },
  },
  {
    name: "191/03 task02 — E3 · `aof mesh session end 11111111-2222-4333-8444-555555555555 --json` refuses session-not-found with exit 1, and the real relay carries nothing",
    async run() {
      await withMeshFixture(async ({ home, roots, relay }) => {
        const far = await relayClient(relay.url);
        try {
          const result = await runCli(roots["ws-a"], home, ["mesh", "session", "end", "11111111-2222-4333-8444-555555555555", "--json"]);
          assert.equal(result.status, 1, result.stdout);
          assert.equal(result.json.ok, false);
          assert.equal(result.json.code, "session-not-found");
          assert.deepEqual(endsHeard(far), [], "nothing is pushed to the relay");
        } finally {
          far.close();
        }
      }, { sessions: [{ sessionId: END_ID, workspaceId: "ws-a", repo: "aof", assistant: "claude", lastPingAt: NOW(), workspaceHasRun: false, relaying: true }] });
    },
  },
  {
    name: "191/03 task02 — the node defaults to the one the session's presence row names and `--node` narrows to it; a name two live sessions share is refused session-ambiguous; an exact id wins over a name",
    async run() {
      const onWorker = endFixture({ rows: [liveRow({ nodeId: "wsl-2" })], after: () => presenceStatus([]) });
      const answer = await onWorker.end({ session: END_ID });
      assert.equal(onWorker.verbs.pushed[0].nodeId, "wsl-2", "the envelope goes to the node that holds the session, not to the control");
      assert.equal(answer.nodeId, "wsl-2");

      // The same id on two nodes: `--node` says which, and without it nothing is sent.
      const twoNodes = () => endFixture({ rows: [liveRow(), liveRow({ nodeId: "wsl-2" })], after: () => presenceStatus([liveRow()]) });
      const ambiguous = twoNodes();
      await assert.rejects(() => ambiguous.end({ session: END_NAME }), (error) => error.code === "session-ambiguous" && error.status === 409);
      assert.deepEqual(ambiguous.verbs.pushed, []);
      const narrowed = twoNodes();
      assert.equal((await narrowed.end({ session: END_NAME, node: "wsl-2" })).ended, true);
      assert.equal(narrowed.verbs.pushed[0].nodeId, "wsl-2");

      // A session whose NAME spells another session's id: the id is the address.
      const shadow = endFixture({ rows: [liveRow(), liveRow({ sessionId: "aof-0b9e6c1e", repo: "x" })], after: () => presenceStatus([liveRow()]) });
      await shadow.end({ session: "aof-0b9e6c1e" });
      assert.equal(shadow.verbs.pushed[0].signal.sessionId, "aof-0b9e6c1e", "an exact id wins over a name");
    },
  },
  {
    name: "191/03 task02 — with no relay configured the end refuses session-dispatch-unavailable, and a relay that will not take the envelope refuses session-dispatch-failed with its transport closed — neither waits, and neither is answered as an end",
    async run() {
      const noRelay = endFixture({ relay: false });
      await assert.rejects(() => noRelay.end({ session: END_ID }), (error) => error.code === "session-dispatch-unavailable" && error.status === 503);
      assert.equal(noRelay.clock.elapsed, 0);

      const broken = endFixture({ pushError: new Error("connect ECONNREFUSED 127.0.0.1:4180") });
      await assert.rejects(
        () => broken.end({ session: END_ID }),
        (error) => error.code === "session-dispatch-failed" && error.status === 503 && !/127\.0\.0\.1/.test(error.message),
        "the relay's host and port are logged, never answered",
      );
      assert.deepEqual(broken.verbs.log, ["push-closed"], "the transport is closed on the throw");
      assert.equal(broken.clock.elapsed, 0);
    },
  },
];
