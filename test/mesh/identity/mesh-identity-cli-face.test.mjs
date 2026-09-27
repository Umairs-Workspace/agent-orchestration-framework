// Traceability wiring for milestone 22 / story 01 — the CLI face over mesh:identity /
// mesh:status.
//
// Covers EVERY @executable scenario in tasks/02_mesh-identity-cli-face.feature, driving
// the REAL CLI through child processes: spawnSync(node, [cli.mjs, …], { cwd }) against a
// temp fixture repo. One test object per @executable scenario (Scenario-Outline rows
// folded into one entry iterating the rows), each name tracing to feature + scenario.
//
//   02_mesh-identity-cli-face.feature — argv → invoke → render/--json over the
//     registered commands; the publish confirmation names the node id; --json emits the
//     node record / the stable { nodes:[...] } shape; the error-code matrix (each code
//     emits ONE { ok:false, error, code } envelope on stdout + non-zero exit); the
//     single-parseable-JSON-document discipline.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { meshDir } from "../../../src/mesh/store.mjs";
import { installHash, sanitizeHostname } from "../../../src/node-identity.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { keyedByOldId } from "../../../src/commands/mesh/identity.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

async function buildFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-meshcli-"));
  const aofDir = path.join(root, ".aof");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(aofDir, { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
    `${JSON.stringify({ name: "fixture", runtimes: ["claude", "codex"], work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8"
  );
  return { root, workDir };
}

// Seed a peer node record directly under the partition root (.mesh/nodes/<id>.json).
async function seedPeer(workDir, id) {
  const nodesDir = path.join(meshDir({ workDir }), "nodes");
  await mkdir(nodesDir, { recursive: true });
  const record = {
    nodeId: id, host: id, os: "linux", runtimes: ["claude"], skills: ["aof-developer"],
    aofVersion: "0.1.0", publishedAt: "2026-06-29T00:00:00.000Z",
  };
  await writeFile(path.join(nodesDir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
  return record;
}

function runCli(root, args, env = {}) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...env },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const meshIdentityCliFaceTests = [
  // ══ Scenario: aof mesh identity publishes this node and renders a confirmation ═
  {
    name: "mesh-identity-cli-face/02 aof mesh identity publishes this node and renders a confirmation",
    async run() {
      const { root } = await buildFixture();
      try {
        const human = runCli(root, ["mesh", "identity"]);
        assert.equal(human.status, 0, `identity exits 0 (stderr: ${human.stderr})`);
        assert.ok(/Node\s+\S+/.test(human.stdout), "the confirmation names this node's id");
        const json = runCli(root, ["mesh", "identity", "--json"]);
        assert.equal(json.status, 0, `identity --json exits 0 (stderr: ${json.stderr})`);
        const record = JSON.parse(json.stdout);
        // 34/story 02 (operator directive): `skills` is REMOVED from the
        // descriptor (see assembleDescriptor); 132/02 added `hostname`, the fabric join key.
        assert.deepEqual(
          Object.keys(record),
          ["nodeId", "host", "hostname", "os", "runtimes", "aofVersion", "publishedAt"],
          "the JSON is a node record carrying the complete frozen schema"
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: aof mesh identity <id> reads that node's record ════════════════
  {
    name: "mesh-identity-cli-face/02 aof mesh identity with an id reads that node's record",
    async run() {
      const { root, workDir } = await buildFixture();
      try {
        await seedPeer(workDir, "umami-mbp");
        const result = runCli(root, ["mesh", "identity", "umami-mbp", "--json"]);
        assert.equal(result.status, 0, `identity <id> --json exits 0 (stderr: ${result.stderr})`);
        const record = JSON.parse(result.stdout);
        assert.equal(record.nodeId, "umami-mbp", "the JSON node record nodeId is umami-mbp");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: aof mesh status renders the node roster ════════════════════════
  {
    name: "mesh-identity-cli-face/02 aof mesh status renders the node roster",
    async run() {
      const { root, workDir } = await buildFixture();
      try {
        await seedPeer(workDir, "umami-desktop");
        await seedPeer(workDir, "umami-mbp");
        const json = runCli(root, ["mesh", "status", "--json"]);
        assert.equal(json.status, 0, `status --json exits 0 (stderr: ${json.stderr})`);
        const parsed = JSON.parse(json.stdout);
        assert.ok(Array.isArray(parsed.nodes), "the JSON has a 'nodes' array");
        const ids = parsed.nodes.map((n) => n.nodeId);
        // Subset, not deepEqual: the roster ALSO carries THIS machine's own
        // hostname-derived identity record (the load-time self-heal), which on
        // the fixture's author machine happened to collide with the seeded
        // "umami-desktop" and hid — a hostname-dependent pin that could never
        // pass elsewhere (pre-existing at HEAD, verified by stash 2026-07-30;
        // the wave-3 stale-pin class).
        for (const id of ["umami-desktop", "umami-mbp"]) {
          assert.ok(ids.includes(id), `the roster carries seeded node ${id} (got: ${ids.join(", ")})`);
        }
        for (const node of parsed.nodes) {
          // `skills` only for the SEEDED peers: the machine's own self-healed
          // record follows the m34 frozen six-key descriptor, which removed
          // skills (operator directive) — pinning skills on every node was the
          // same stale-pin class.
          assert.ok(Array.isArray(node.runtimes), "each node carries runtimes");
          if (["umami-desktop", "umami-mbp"].includes(node.nodeId)) {
            assert.ok(Array.isArray(node.skills), "a seeded peer record carries its skills as persisted");
          }
        }
        const human = runCli(root, ["mesh", "status"]);
        assert.equal(human.status, 0, `status exits 0 (stderr: ${human.stderr})`);
        assert.ok(/umami-desktop/.test(human.stdout) && /umami-mbp/.test(human.stdout), "the output lists each node with its id");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: a bad invocation emits one structured error envelope ════
  {
    name: "mesh-identity-cli-face/02 a bad invocation emits one structured error envelope and exits non-zero",
    async run() {
      const { root, workDir } = await buildFixture();
      try {
        await seedPeer(workDir, "umami-mbp");
        const rows = [
          { invocation: ["identity", "never-synced"], code: "node-not-found" },
          { invocation: ["identity", ""], code: "invalid-input" },
          // m42 wave (d) leg d1 (wave 3) — the mesh verbs ride the ONE generic
          // face, whose spec-parse refusal is the MORE SPECIFIC "unknown-flag"
          // code (previously the mesh face folded it into "invalid-input").
          { invocation: ["identity", "--bogus-flag"], code: "unknown-flag" },
          { invocation: ["status", "--bogus-flag"], code: "unknown-flag" },
          { invocation: ["status", "umami-mbp"], code: "invalid-input" },
        ];
        for (const { invocation, code } of rows) {
          const result = runCli(root, ["mesh", ...invocation, "--json"]);
          assert.notEqual(result.status, 0, `aof mesh ${invocation.join(" ")} --json exits non-zero (got ${result.status})`);
          let parsed;
          assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `aof mesh ${invocation.join(" ")} --json is a single parseable JSON envelope (stdout: ${result.stdout.slice(0, 200)})`);
          assert.equal(parsed.ok, false, `${invocation.join(" ")} → ok:false`);
          assert.equal(parsed.code, code, `${invocation.join(" ")} → code:${code}`);
          assert.equal(typeof parsed.error, "string", `${invocation.join(" ")} → error message present`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: every --json invocation prints exactly one parseable JSON document ═
  {
    name: "mesh-identity-cli-face/02 every --json invocation prints exactly one parseable JSON document",
    async run() {
      const { root, workDir } = await buildFixture();
      try {
        await seedPeer(workDir, "umami-mbp");
        const invocations = [
          ["mesh", "identity", "--json"],
          ["mesh", "identity", "umami-mbp", "--json"],
          ["mesh", "status", "--json"],
          ["mesh", "identity", "never-synced", "--json"],
          ["mesh", "status", "--bogus-flag", "--json"],
        ];
        for (const args of invocations) {
          const result = runCli(root, args);
          // stdout parses as exactly ONE JSON document — JSON.parse over the whole
          // stdout succeeds (a human line before/after would break it).
          let parsed;
          assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `${args.join(" ")} stdout parses as exactly one JSON document (stdout: ${result.stdout.slice(0, 200)})`);
          assert.ok(parsed !== undefined, `${args.join(" ")} produced a JSON value`);
          // No human-rendered line precedes or follows: stdout, trimmed, equals the
          // re-serialised parse (whitespace-only diff aside).
          assert.equal(result.stdout.trim(), JSON.stringify(parsed, null, 2), `${args.join(" ")} prints no human line around the JSON`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// 132 · run-records-carry-the-node-id — the CLI-face scenarios: task 01's `--reidentify`
// edge and task 02's publish into the aof home. Each drives the real CLI against its OWN
// isolated aof home `H`, so the identity it reads and rewrites is the fixture's.
// ════════════════════════════════════════════════════════════════════════════════════════
const SALT_132 = "2d4c74e4-66e3-4c7a-bd88-b199d8f81b7f";

async function isolatedHome(identity, globalConfig) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-132-home-"));
  await mkdir(path.join(home, "mesh", "nodes"), { recursive: true });
  if (identity) await writeFile(path.join(home, "mesh", "identity.json"), `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  if (globalConfig) await writeFile(path.join(home, "aof.config.json"), `${JSON.stringify(globalConfig, null, 2)}\n`, "utf8");
  return home;
}

async function listTree(dir) {
  const out = [];
  async function walk(d, rel) {
    for (const entry of (await readdir(d, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      out.push(r);
      if (entry.isDirectory()) await walk(path.join(d, entry.name), r);
    }
  }
  await walk(dir, "");
  return out;
}

export const runRecordsNodeIdCliTests = [
  {
    name: "132/01 --reidentify is the one deliberate edge, and it reports what it invalidates",
    async run() {
      const { root } = await buildFixture();
      // A LEGACY id for THIS machine — its sanitized hostname stem, recorded as derived from
      // THIS machine's hostname — so the load-time heal has neither trigger and the move is
      // made by the verb alone. Computed, never spelled, so no machine name enters the repo.
      const legacy = sanitizeHostname(os.hostname());
      const home = await isolatedHome(
        { salt: SALT_132, nodeId: legacy, derivedFrom: os.hostname() },
        { mesh: { credential: { relayAuth: "fixture", nodeId: legacy, controlNode: "ctl" } } },
      );
      try {
        const stale = { nodeId: legacy, host: "192.168.1.102", os: "win32", runtimes: [], aofVersion: "0.1.0", publishedAt: "2026-09-17T00:00:00.000Z" };
        await writeFile(path.join(home, "mesh", "nodes", `${legacy}.json`), JSON.stringify(stale, null, 2), "utf8");
        const to = `node-${installHash(SALT_132)}`;

        const first = runCli(root, ["mesh", "identity", "--reidentify", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(first.status, 0, `--reidentify exits 0 (stdout: ${first.stdout} stderr: ${first.stderr})`);
        const envelope = JSON.parse(first.stdout);
        assert.equal(envelope.from, legacy);
        assert.equal(envelope.to, to);
        const sidecar = JSON.parse(await readFile(path.join(home, "mesh", "identity.json"), "utf8"));
        assert.equal(sidecar.nodeId, to);
        assert.equal(sidecar.derivedFrom, os.hostname(), "derivedFrom is the current hostname");
        const kinds = envelope.invalidated.filter((entry) => entry.nodeId === legacy).map((entry) => entry.kind);
        assert.ok(kinds.includes("enrollment-credential"), `the enrollment credential is named (got ${JSON.stringify(envelope.invalidated)})`);
        assert.ok(kinds.includes("node-record"), "the stale node record is named");

        const identityBytes = await readFile(path.join(home, "mesh", "identity.json"), "utf8");
        const recordBytes = await readFile(path.join(home, "mesh", "nodes", `${to}.json`), "utf8");
        const second = runCli(root, ["mesh", "identity", "--reidentify", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(second.status, 0, `second --reidentify exits 0 (stderr: ${second.stderr})`);
        const again = JSON.parse(second.stdout);
        assert.equal(again.from, to);
        assert.equal(again.to, to);
        assert.equal(await readFile(path.join(home, "mesh", "identity.json"), "utf8"), identityBytes, "the sidecar's bytes are unchanged");
        assert.equal(await readFile(path.join(home, "mesh", "nodes", `${to}.json`), "utf8"), recordBytes, "the node record's bytes are unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/01 --reidentify refuses a pinned id",
    async run() {
      const { root } = await buildFixture();
      const home = await isolatedHome({ salt: SALT_132, nodeId: "aof-wsl", pinned: true });
      try {
        const before = await readFile(path.join(home, "mesh", "identity.json"), "utf8");
        const result = runCli(root, ["mesh", "identity", "--reidentify", "--json"], { AOF_GLOBAL_HOME: home });
        assert.notEqual(result.status, 0, "it fails");
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.ok, false);
        assert.equal(parsed.code, "identity-pinned");
        assert.match(parsed.error, /--name/, "names --name as the way to change a pinned id");
        assert.equal(await readFile(path.join(home, "mesh", "identity.json"), "utf8"), before, "the sidecar's bytes are unchanged");
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/02 the machine name is published to the aof home and reaches no checkout",
    async run() {
      const { root } = await buildFixture();
      const home = await isolatedHome();
      try {
        const before = await listTree(root);
        const result = runCli(root, ["mesh", "identity", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(result.status, 0, `identity exits 0 (stderr: ${result.stderr})`);
        const published = JSON.parse(result.stdout);
        const recordPath = path.join(home, "mesh", "nodes", `${published.nodeId}.json`);
        const record = JSON.parse(await readFile(recordPath, "utf8"));
        assert.equal(record.hostname, os.hostname(), "the record under <H>/mesh carries this machine's real name");
        assert.deepEqual(await listTree(root), before, "the checkout's listing is unchanged by the publish");
        const tracked = spawnSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" }).stdout.split(/\r?\n/);
        assert.ok(!tracked.some((file) => /(^|\/)mesh\/nodes\//.test(file)), "git ls-files names no node record");
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // ══ 132/05 (F-2) — a rename with --name reports what the old id keyed ══════════════════
  {
    name: "132/05 renaming a control node names every setting keyed by the old id",
    async run() {
      const { root, home } = await renameFixture();
      try {
        const result = runCli(root, ["mesh", "identity", "--name", "new-node", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(result.status, 0, `--name exits 0 (stderr: ${result.stderr})`);
        const envelope = JSON.parse(result.stdout);
        assert.equal(envelope.from, "old-node");
        assert.equal(envelope.to, "new-node");
        assert.equal(envelope.changed, true);
        assert.deepEqual(
          envelope.invalidated.map((entry) => [entry.kind, entry.nodeId, entry.where ?? "record"]),
          [
            ["node-record", "old-node", "record"],
            ["enrollment-credential", "old-node", "mesh.credential"],
            ["control-node-nomination", "old-node", "mesh.relay.controlNode"],
          ],
        );
        assert.equal(envelope.record.nodeId, "new-node", "the record is this node's descriptor under the new id");
        const published = JSON.parse(await readFile(path.join(home, "mesh", "nodes", "new-node.json"), "utf8"));
        assert.equal(published.nodeId, "new-node", "published under the new id");
        const sidecar = JSON.parse(await readFile(path.join(home, "mesh", "identity.json"), "utf8"));
        assert.equal(sidecar.nodeId, "new-node");
        assert.equal(sidecar.pinned, true);
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/05 the rename reports and repairs nothing",
    async run() {
      const { root, home } = await renameFixture();
      try {
        const configBefore = await readFile(path.join(home, "aof.config.json"), "utf8");
        const result = runCli(root, ["mesh", "identity", "--name", "new-node", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(result.status, 0, `--name exits 0 (stderr: ${result.stderr})`);
        assert.equal(await readFile(path.join(home, "aof.config.json"), "utf8"), configBefore, "no config key is re-pointed");
        await readFile(path.join(home, "mesh", "nodes", "old-node.json"), "utf8"); // throws if it was deleted
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/05 both verbs compute the same report from the same scan",
    async run() {
      const { root, home } = await renameFixture();
      try {
        const ws = await loadWorkspace(root, undefined, { env: { ...process.env, AOF_GLOBAL_HOME: home } });
        const scanned = await keyedByOldId(ws, ws.config, "old-node");
        const result = runCli(root, ["mesh", "identity", "--name", "new-node", "--json"], { AOF_GLOBAL_HOME: home });
        assert.equal(result.status, 0, `--name exits 0 (stderr: ${result.stderr})`);
        assert.deepEqual(JSON.parse(result.stdout).invalidated, scanned, "the rename reports exactly what the shared scan finds");
        // …and --reidentify reports through that same scan, not a copy of it.
        const source = await readFile(path.join(repoRoot, "src", "commands", "mesh", "identity.mjs"), "utf8");
        const reidentifyBody = source.slice(source.indexOf("async function reidentify("), source.indexOf("export async function keyedByOldId("));
        assert.match(reidentifyBody, /await keyedByOldId\(ws, config, from\)/, "--reidentify calls the shared scan");
        assert.equal((source.match(/invalidated\.push\(/g) ?? []).length, 4, "the four report entries are pushed in ONE place");
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/05 a publish that moves no id keeps the bare node record (Scenario Outline)",
    async run() {
      for (const prior of [null, { salt: SALT_132, nodeId: "aof-wsl", pinned: true }]) {
        const { root } = await buildFixture();
        const home = await isolatedHome(prior);
        try {
          const result = runCli(root, ["mesh", "identity", "--name", "aof-wsl", "--json"], { AOF_GLOBAL_HOME: home });
          assert.equal(result.status, 0, `--name exits 0 (stderr: ${result.stderr})`);
          const published = JSON.parse(result.stdout);
          assert.equal(published.nodeId, "aof-wsl", `prior ${JSON.stringify(prior)}: the bare record`);
          for (const key of ["from", "to", "invalidated"]) assert.ok(!(key in published), `prior ${JSON.stringify(prior)}: no ${key}`);
        } finally {
          await rm(root, { recursive: true, force: true });
          await rm(home, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "132/05 the text face says what the rename stranded",
    async run() {
      const { root, home } = await renameFixture();
      try {
        const result = runCli(root, ["mesh", "identity", "--name", "new-node"], { AOF_GLOBAL_HOME: home });
        assert.equal(result.status, 0, `--name exits 0 (stderr: ${result.stderr})`);
        assert.match(result.stdout, /Re-identified old-node → new-node\./);
        assert.match(result.stdout, /Keyed by the old id, now stale:\n {2}node-record old-node .*\n {2}enrollment-credential old-node \(mesh\.credential\)\n {2}control-node-nomination old-node \(mesh\.relay\.controlNode\)/);
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
];

// 132/05 — a control node about to be renamed: its sidecar holds `old-node`, its config keys the
// enrollment credential and the control-node nomination by it, and a record for it exists.
async function renameFixture() {
  const { root } = await buildFixture();
  const home = await isolatedHome(
    { salt: SALT_132, nodeId: "old-node", pinned: true },
    { mesh: { relay: { controlNode: "old-node" }, credential: { relayAuth: "fixture", nodeId: "old-node", controlNode: "old-node" } } },
  );
  const record = { nodeId: "old-node", host: "192.0.2.10", os: "linux", runtimes: [], aofVersion: "0.1.0", publishedAt: "2026-09-22T00:00:00.000Z" };
  await writeFile(path.join(home, "mesh", "nodes", "old-node.json"), JSON.stringify(record, null, 2), "utf8");
  return { root, home };
}
