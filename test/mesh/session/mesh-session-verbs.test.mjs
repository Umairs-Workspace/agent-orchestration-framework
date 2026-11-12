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
import { createMeshSessionVerbs, SESSION_LINK_SCAN_BYTES } from "@aof/mesh/commands/session";
import { planSessionStart } from "@aof/mesh/session-start";
import { SESSION_SPAWN_KIND, buildSessionSpawnAckEnvelope } from "@aof/mesh/session-spawn-directive";
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
    queryGlobalMeshStatus: async () => status,
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
  };
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
];
