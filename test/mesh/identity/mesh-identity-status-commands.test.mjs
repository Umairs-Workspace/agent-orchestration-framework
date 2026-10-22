import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
// Traceability wiring for milestone 22 / story 01 — the mesh:identity / mesh:status
// commands.
//
// Covers EVERY @executable scenario in tasks/01_mesh-identity-status-commands.feature,
// exercising the REAL in-process registry (packages/core/src/command-core.mjs +
// packages/core/src/commands/mesh-identity.mjs over story 00's packages/core/src/mesh/store.mjs + story 01's
// packages/core/src/node-identity.mjs) against a temp fixture repo — loadWorkspace + invoke, real fs,
// in-process. One test object per @executable scenario, each name tracing to feature +
// scenario. node:assert/strict.
//
//   01_mesh-identity-status-commands.feature — the two commands carry the frozen
//     {id,input,run,cli} shape; mesh:identity publishes this node's record (via the
//     store) and reads it back (republish bumps publishedAt, the id is stable, a peer's
//     record is untouched); mesh:status lists the synced roster ({ nodes:[...] }, an
//     empty roster reads as { nodes: [] }, not an error); reads mutate nothing.
//
// Traceability wiring for milestone 167 / story 00 (the daemon says what it costs):
//   .../167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/
//     tasks/01_status-and-doctor-say-what-it-costs.feature (@executable) — R2's `aof mesh status`
//     cost block and its text line, and R3 through the real `work:doctor` edge and `aof work validate`.
//     The snapshots are written where production writes them, through the presence module's writer.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAEMON_BUDGET } from "@aof/foundation/cost-meter";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const getCommand = _aofApplication.getCommand;
const invoke = _aofApplication.invoke;
const meshDir = _aofHooks.meshStore.meshDir;
const nodeRecordPath = _aofHooks.meshStore.nodeRecordPath;
const publishNodeRecord = _aofHooks.meshStore.publishNodeRecord;
const publishCostSnapshot = _aofApplication.mesh.presence.publishCostSnapshot;
const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "core", "bin", "aof.mjs");

// 34/story 02 (operator directive): `skills` is REMOVED from the descriptor
// (see assembleDescriptor) — six keys, until 132/02 added a seventh:
// `hostname` (the machine name, the fabric join key) beside `host` (the dial address).
const FROZEN_KEYS = ["nodeId", "host", "hostname", "os", "runtimes", "aofVersion", "publishedAt"];

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-meshcmd-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", runtimes: ["claude", "codex"], work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8"
  );
  // A PER-FIXTURE global home: node records live in the MACHINE-global mesh root
  // (AOF_GLOBAL_HOME), so every test sharing one process-level home leaks its
  // seeds/publishes into the next test's roster (pre-existing at HEAD, verified
  // by stash 2026-07-30 — the file predates the m34 workspace-local → global
  // store move). Each fixture repo now carries its own isolated home, the
  // mesh-ui-global-scope idiom.
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-meshcmd-home-"));
  const env = { ...process.env, AOF_GLOBAL_HOME: home };
  return { repo, workDir, env };
}

const ctxFor = async (repo, env) => ({ workspace: await loadWorkspace(repo, undefined, { env }) });

// Seed a peer node record directly through the store seam (a peer that synced into the
// tree). The record is opaque/as-is, exactly as the store persists.
async function seedPeer(workspace, id, extra = {}) {
  const record = {
    nodeId: id, host: id, os: "linux", runtimes: ["claude"], skills: [],
    aofVersion: "0.1.0", publishedAt: "2026-06-29T00:00:00.000Z", ...extra,
  };
  await publishNodeRecord(workspace, id, record);
  return record;
}

// Snapshot the on-disk bytes of every file under the partition root (for the
// byte-unchanged R4 assertions). Returns a map of relative path → bytes.
async function snapshotTree(workspace) {
  const root = meshDir(workspace);
  const snap = {};
  async function walk(dir, rel) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const r = path.join(rel, entry.name);
      if (entry.isDirectory()) await walk(abs, r);
      else snap[r] = await readFile(abs, "utf8");
    }
  }
  await walk(root, "");
  return snap;
}

// ── 167/00 — the daemon cost fixtures ──────────────────────────────────────────────────
const COST_NODE = "node-7297";
const COST_NOW = "2026-10-20T18:30:00.000Z";

// A repo whose config pins this node's id, under its own isolated home.
async function makeCostRepo() {
  const fx = await makeRepo();
  await writeFile(
    path.join(fx.repo, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", runtimes: ["claude"], work: { dir: "./wiki/work" }, mesh: { nodeId: COST_NODE } }, null, 2)}\n`,
    "utf8",
  );
  const ctx = await ctxFor(fx.repo, fx.env);
  await mkdir(meshDir(ctx.workspace), { recursive: true }); // the serve daemon's presence publish creates it
  return { ...fx, ctx, home: fx.env.AOF_GLOBAL_HOME };
}

// A daemon snapshot as the meter writes it, at `at` with `cpuPercent` in `state`.
function costSnapshot(daemon, at, { cpuPercent = 1, state = "idle", topCauses = [] } = {}) {
  return {
    schema: 1, daemon, pid: 4242, at, startedAt: "2026-10-20T17:00:00.000Z", windowSeconds: 60,
    cpuPercent, cpuPercentSinceStart: cpuPercent, eventLoopUtilization: 0.02, eventLoopUtilizationSinceStart: 0.02,
    state, topCauses,
  };
}
const at = (clock) => `2026-10-20T${clock}.000Z`;
const cause = (name, labels, count = 7) => ({ cause: name, labels, count });

async function cleanupCost(fx) {
  await rm(fx.repo, { recursive: true, force: true });
  await rm(fx.home, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}

const meshStatusCostTests = [
  {
    name: "167/00 E4 · both daemons reporting are shown with their share, state, budget and causes",
    async run() {
      const fx = await makeCostRepo();
      try {
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "serve", costSnapshot("serve", at("18:29:50"), { cpuPercent: 1.5, state: "idle", topCauses: [cause("sync-pass", { workspaceId: "aof" }), cause("cache-hit", { workspaceId: "aof" }, 4), cause("degrade", { code: "mesh-launcher" }, 2), cause("request", { route: "/x" }, 1)] }));
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "ui", costSnapshot("ui", at("18:29:52"), { cpuPercent: 6, state: "viewer-open", topCauses: [cause("request", { route: "/api/work/list", client: "board" })] }));
        const { cost } = await invoke("mesh:status", { now: COST_NOW }, fx.ctx);
        const [serve, ui] = cost.daemons;
        assert.deepEqual([serve.daemon, serve.cpuPercent, serve.status, serve.state, serve.budgetPercent], ["serve", 1.5, "idle", "idle", 2]);
        assert.deepEqual([ui.daemon, ui.cpuPercent, ui.status, ui.state, ui.budgetPercent], ["ui", 6, "viewer-open", "viewer-open", 10]);
        assert.deepEqual(serve.topCauses.map((entry) => [entry.cause, entry.labels]), [["sync-pass", { workspaceId: "aof" }], ["cache-hit", { workspaceId: "aof" }], ["degrade", { code: "mesh-launcher" }]], "its top three causes, with their labels");
        assert.deepEqual(ui.topCauses[0].labels, { route: "/api/work/list", client: "board" });
        assert.deepEqual([cost.budget.idlePercent, cost.budget.viewerOpenPercent], [2, 10], "the cost block states the budget as 2% idle and 10% viewer-open");
        assert.deepEqual(cost.budget, { ...DAEMON_BUDGET, windowSeconds: 60 }, "…the meter's own numbers, not re-declared");
      } finally {
        await cleanupCost(fx);
      }
    },
  },
  {
    name: "167/00 E5 · a snapshot three writes late reads as not reporting",
    async run() {
      const fx = await makeCostRepo();
      try {
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "serve", costSnapshot("serve", at("18:29:10")));
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "ui", costSnapshot("ui", at("18:29:55")));
        const { cost } = await invoke("mesh:status", { now: COST_NOW }, fx.ctx);
        const [serve, ui] = cost.daemons;
        assert.deepEqual([serve.status, serve.ageSeconds], ["not-reporting", 50], "serve reads not-reporting, last reported 50 seconds ago");
        assert.deepEqual([ui.status, ui.ageSeconds], ["idle", 5], "ui reads normally");
      } finally {
        await cleanupCost(fx);
      }
    },
  },
  {
    name: "167/00 E6 · a node where no daemon has run shows an empty cost block",
    async run() {
      const fx = await makeCostRepo();
      try {
        const result = await invoke("mesh:status", { now: COST_NOW }, fx.ctx);
        assert.ok(result.cost != null, "the cost block is present, never absent");
        assert.deepEqual(result.cost.daemons, [], "with no daemons");
        assert.deepEqual([result.cost.budget.idlePercent, result.cost.budget.viewerOpenPercent], [DAEMON_BUDGET.idlePercent, DAEMON_BUDGET.viewerOpenPercent], "and the budget stated");
        assert.equal(getCommand("mesh:status").cli.render(result).includes("cost:"), false, "no cost line for a daemon that never ran");
      } finally {
        await cleanupCost(fx);
      }
    },
  },
  {
    name: "167/00 the text report prints one cost line per daemon",
    async run() {
      const fx = await makeCostRepo();
      try {
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "serve", costSnapshot("serve", at("18:29:50"), { cpuPercent: 1.5, state: "idle", topCauses: [cause("sync-pass", { workspaceId: "aof" })] }));
        const text = getCommand("mesh:status").cli.render(await invoke("mesh:status", { now: COST_NOW }, fx.ctx));
        const lines = text.split("\n").filter((line) => line.startsWith("cost: "));
        assert.equal(lines.length, 1, text);
        for (const part of ["serve", "1.5%", "idle", "2%", "sync-pass"]) assert.ok(lines[0].includes(part), `the serve line names "${part}": ${lines[0]}`);
      } finally {
        await cleanupCost(fx);
      }
    },
  },
  {
    name: "167/00 E7 · an idle daemon over budget is named with its top cause",
    async run() {
      const fx = await makeCostRepo();
      try {
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "serve", costSnapshot("serve", at("18:29:50"), { cpuPercent: 38, state: "idle", topCauses: [cause("full-disk-read", { workspaceId: "52294b307214c27d" }, 40)] }));
        const result = await invoke("work:doctor", { now: COST_NOW }, { ...fx.ctx, globalWorkStoreOptions: { env: fx.env } });
        const over = result.findings.filter((finding) => finding.code === "daemon-over-budget");
        assert.equal(over.length, 1, JSON.stringify(result.findings));
        assert.equal(over[0].severity, "warn");
        for (const part of ["serve", "38%", "2%", "full-disk-read", "52294b307214c27d"]) assert.ok(over[0].message.includes(part), `the warn names "${part}": ${over[0].message}`);
      } finally {
        await cleanupCost(fx);
      }
    },
  },
  {
    name: "167/00 a daemon warn never fails validate",
    async run() {
      const fx = await makeCostRepo();
      try {
        // The CLI reads the wall clock, so the snapshot is fresh rather than at the fixture's 18:29:50.
        await publishCostSnapshot(fx.ctx.workspace, COST_NODE, "serve", costSnapshot("serve", new Date().toISOString(), { cpuPercent: 38, state: "idle" }));
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(AOF_|CLAUDE)/.test(key)));
        const doctor = spawnCliSync(process.execPath, [CLI, "work", "doctor", "--json"], { cwd: fx.repo, encoding: "utf8", env: { ...env, AOF_GLOBAL_HOME: fx.home, NODE_NO_WARNINGS: "1" } });
        assert.ok((doctor.stdout ?? "").includes("daemon-over-budget"), `the warn is raised: ${doctor.stdout}${doctor.stderr}`);
        const validate = spawnCliSync(process.execPath, [CLI, "work", "validate"], { cwd: fx.repo, encoding: "utf8", env: { ...env, AOF_GLOBAL_HOME: fx.home, NODE_NO_WARNINGS: "1" } });
        assert.equal(validate.status, 0, `${validate.stdout}${validate.stderr}`);
      } finally {
        await cleanupCost(fx);
      }
    },
  },
];

export const meshIdentityStatusCommandsTests = [
  ...meshStatusCostTests,
  // ══ Scenario: mesh:identity publishes this node's record and returns it ══════
  {
    name: "mesh-identity-status-commands/01 mesh:identity publishes this node's record and returns it",
    async run() {
      const { repo, workDir, env } = await makeRepo();
      try {
        const ctx = await ctxFor(repo, env);
        const record = await invoke("mesh:identity", {}, ctx);
        // The returned record carries the complete frozen schema.
        assert.deepEqual(Object.keys(record), FROZEN_KEYS, "complete frozen schema, in order");
        // A node record for this node's id is persisted under the partition root.
        const onDisk = await readFile(nodeRecordPath(ctx.workspace, record.nodeId), "utf8");
        // The persisted record is byte-equivalent to the returned record.
        assert.equal(onDisk, JSON.stringify(record, null, 2), "persisted record byte-equivalent to returned");
        // The file is under meshDir/nodes/.
        assert.ok(nodeRecordPath(ctx.workspace, record.nodeId).startsWith(meshDir(ctx.workspace)), "under the partition root");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: republishing bumps publishedAt, keeps the id stable, leaves peers untouched ═
  {
    name: "mesh-identity-status-commands/01 republishing through mesh:identity bumps publishedAt, keeps the id stable, and leaves peers untouched",
    async run() {
      const { repo, env } = await makeRepo();
      try {
        const ctx = await ctxFor(repo, env);
        const first = await invoke("mesh:identity", {}, ctx);
        // A peer record exists in the tree; record its on-disk bytes.
        await seedPeer(ctx.workspace, "umami-mbp");
        const peerPath = nodeRecordPath(ctx.workspace, "umami-mbp");
        const peerBefore = await readFile(peerPath, "utf8");
        await new Promise((resolve) => setTimeout(resolve, 2));
        // Republish this node (config now carries the persisted id → stable).
        const ctx2 = await ctxFor(repo, env);
        const second = await invoke("mesh:identity", {}, ctx2);
        assert.equal(second.nodeId, first.nodeId, "the node id is unchanged");
        assert.ok(Date.parse(second.publishedAt) >= Date.parse(first.publishedAt), "publishedAt at or after the previous publish");
        // Still exactly one record file for this node's id.
        const files = await readdir(path.join(meshDir(ctx2.workspace), "nodes"));
        const own = files.filter((f) => f === `${first.nodeId}.json`);
        assert.equal(own.length, 1, "exactly one record file for this node's id");
        // The peer record on disk is byte-identical to before the republish.
        assert.equal(await readFile(peerPath, "utf8"), peerBefore, "peer record byte-identical after republish");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: mesh:identity reads a node's record back by id ═════════════════
  {
    name: "mesh-identity-status-commands/01 mesh:identity reads a node's record back by id",
    async run() {
      const { repo, env } = await makeRepo();
      try {
        const ctx = await ctxFor(repo, env);
        const peer = await seedPeer(ctx.workspace, "umami-mbp");
        const before = await snapshotTree(ctx.workspace);
        // Read the peer back.
        const read = await invoke("mesh:identity", { ref: "umami-mbp" }, ctx);
        assert.deepEqual(read, peer, "the result is the peer's node record");
        // An absent id reads as absent (null), not an error — invoke raises nothing.
        let absent, threw = false;
        try {
          absent = await invoke("mesh:identity", { ref: "never-synced" }, ctx);
        } catch {
          threw = true;
        }
        assert.equal(threw, false, "invoke raises no error for an absent read");
        assert.equal(absent, null, "the result is absent (not an error)");
        // A read never writes — the partition root is byte-unchanged.
        assert.deepEqual(await snapshotTree(ctx.workspace), before, "partition root byte-unchanged (read never writes)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: mesh:status lists every node record in the synced tree ═════════
  {
    name: "mesh-identity-status-commands/01 mesh:status lists every node record in the synced tree",
    async run() {
      const { repo, env } = await makeRepo();
      try {
        const ctx = await ctxFor(repo, env);
        await seedPeer(ctx.workspace, "umami-desktop");
        await seedPeer(ctx.workspace, "umami-mbp");
        await seedPeer(ctx.workspace, "build-server");
        const before = await snapshotTree(ctx.workspace);
        const result = await invoke("mesh:status", {}, ctx);
        // The stable { nodes:[...] } shape.
        assert.ok(Array.isArray(result.nodes), "the --json result is a stable { nodes:[...] } shape");
        const ids = result.nodes.map((n) => n.nodeId).sort();
        assert.deepEqual(ids, ["build-server", "umami-desktop", "umami-mbp"], "exactly those three node ids (no extras, none dropped)");
        // Each node carries its id + capabilities.
        for (const node of result.nodes) {
          assert.equal(typeof node.nodeId, "string");
          assert.ok(Array.isArray(node.runtimes) && Array.isArray(node.skills), "node carries capabilities");
        }
        // status is a pure read — the partition root is byte-unchanged.
        assert.deepEqual(await snapshotTree(ctx.workspace), before, "partition root byte-unchanged (status is a pure read)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: mesh:status on an empty roster returns an empty list, not an error ═
  {
    name: "mesh-identity-status-commands/01 mesh:status on an empty roster returns an empty list, not an error",
    async run() {
      const { repo, env } = await makeRepo();
      try {
        const ctx = await ctxFor(repo, env);
        let result, threw = false;
        try {
          result = await invoke("mesh:status", {}, ctx);
        } catch {
          threw = true;
        }
        assert.equal(threw, false, "no error is raised on an empty roster");
        // The feature asserts "an empty node list" + "the stable { nodes: [] } shape".
        // milestone 25 / story 01 (ADR-002) EXTENDS mesh:status additively with a top-
        // level `boards` projection (the boards half sits ALONGSIDE the nodes half, never
        // reshaping it), so the empty-fleet aggregate is { nodes: [], boards: [] }. The
        // nodes half stays the stable empty node list this scenario pins — asserted
        // directly (nodes === []) so the additive boards key is compatible, not a
        // whole-object equality that the sanctioned extension would break.
        assert.deepEqual(result.nodes, [], "the stable empty node list (the { nodes: [] } half)");
        assert.deepEqual(result.boards, [], "the additive boards projection is the empty list on an empty fleet");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Frozen { id, input, run, cli } shape — the two registered commands ═══════
  {
    name: "mesh-identity-status-commands/01 the two commands carry the frozen { id, input, run, cli } shape",
    async run() {
      for (const id of ["mesh:identity", "mesh:status"]) {
        const command = getCommand(id);
        assert.ok(command, `${id} is registered`);
        assert.equal(command.id, id, `${id} carries its id`);
        assert.equal(typeof command.run, "function", `${id} has a run function`);
        assert.ok(command.input && typeof command.input === "object", `${id} has an input schema`);
        assert.ok(command.cli && typeof command.cli.argv === "function" && typeof command.cli.render === "function" && typeof command.cli.json === "function", `${id} has a cli adapter`);
      }
    },
  },
];
