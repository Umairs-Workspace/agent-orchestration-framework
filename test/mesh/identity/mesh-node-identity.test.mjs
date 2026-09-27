// Traceability wiring for milestone 22 / story 01 — the node-identity mechanic.
//
// Covers EVERY @executable scenario in tasks/00_node-identity-descriptor.feature,
// exercising src/node-identity.mjs IN-PROCESS with INJECTED hostname / salt / config
// (the white-box Build-notes requirement — no real-machine coupling), plus a real temp
// sidecar file for the persist+reuse scenarios. One test object per @executable scenario
// (Scenario-Outline rows folded into one entry iterating the rows), each name tracing
// to feature + scenario. node:assert/strict.
//
//   00_node-identity-descriptor.feature — id derivation is deterministic + stable
//     (sanitized hostname, persisted on first derive, reused thereafter; a collision
//     appends a stable per-install hash; an empty stem falls back to node-<install-
//     hash>; an operator-set id wins verbatim); the descriptor carries the complete
//     frozen 7-key schema, correctly typed, rebuildable (reads, never writes); array
//     fields empty to [] at the boundaries.
//
// milestone 33 / story 00 (ADR-004, F-3203) RE-POINTED deriveNodeId's persist target
// from the committed config.mesh.nodeId to the git-ignored PER-INSTALL SIDECAR
// (.aof/mesh/identity.json) — this file's persist+reuse/operator-override scenarios
// are updated to assert against a fixture sidecar (via the injected sidecarPath arg),
// never a committed config file, matching the re-point.
//
// 132 (run-records-carry-the-node-id) RETIRED the hostname-stem rule: a derived id is now
// node-<installHash(salt)> whatever the machine is called, a collision widens that hash,
// and the descriptor grew a seventh key, `hostname`. The m22 lanes below are re-pointed at
// that contract, and 132/tasks/00-02's unit scenarios are wired at the foot of this file.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import {
  deriveNodeId,
  assembleDescriptor,
  sanitizeHostname,
  installHash,
  isDerivationOf,
  isOpaqueNodeId,
} from "../../../src/node-identity.mjs";
import { resolvePeers } from "../../../src/mesh/fabric.mjs";
import { readRuns } from "../../../src/run-store.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const ID_RE = /^[a-z0-9-]+$/;

async function tempConfig(initial = { name: "fixture" }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-nodeid-"));
  const configPath = path.join(dir, "aof.config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
  return { dir, configPath };
}

// A fixture sidecar PATH (not yet created — persistNodeId creates it on first write),
// under a temp dir this test owns. Mirrors tempConfig's shape for the sidecar target.
async function tempSidecarPath() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-nodeid-sidecar-"));
  return { dir, sidecarPath: path.join(dir, "mesh", "identity.json") };
}

export const meshNodeIdentityTests = [
  // ══ Scenario Outline: the node id is the sanitized, lowercased hostname ══════
  {
    name: "mesh-node-identity/00 the node id is node-<installHash(salt)> whatever the hostname (132 retired the stem rule)",
    async run() {
      const rows = [
        ["build-server", "build-server"],
        ["Umami-Desktop", "umami-desktop"],
        ["Umami Desktop", "umami-desktop"],
        ["umami.desktop", "umami-desktop"],
        ["umami_desktop", "umami-desktop"],
        ["umami@desktop!", "umami-desktop"],
        ["umami--__--desktop", "umami-desktop"],
        ["-leading-trailing-", "leading-trailing"],
        ["node01", "node01"],
      ];
      for (const [hostname, stem] of rows) {
        // Derive (no configPath → in-memory, no persist); injected hostname/salt.
        const id = await deriveNodeId({ config: {}, hostname, salt: "salt-x" });
        assert.equal(id, `node-${installHash("salt-x")}`, `"${hostname}" → the opaque id`);
        // The sanitizer still does its job — on an operator-supplied name, never into an id.
        assert.equal(sanitizeHostname(hostname), stem, `"${hostname}" sanitizes to "${stem}"`);
        // Deterministic — deriving again yields the same id.
        const again = await deriveNodeId({ config: {}, hostname, salt: "salt-x" });
        assert.equal(again, id, `"${hostname}" deterministic`);
        // [a-z0-9-]-only, no leading/trailing "-".
        assert.match(id, ID_RE, `"${id}" is [a-z0-9-]-only`);
        assert.ok(!id.startsWith("-") && !id.endsWith("-"), `"${id}" has no edge "-"`);
      }
    },
  },

  // ══ Scenario Outline: a hostname that sanitizes to empty → node-<install-hash> ═
  {
    name: "mesh-node-identity/00 a hostname that sanitizes to empty falls back to a deterministic node-<install-hash> id",
    async run() {
      for (const hostname of ["***", ""]) {
        assert.equal(sanitizeHostname(hostname), "", `"${hostname}" sanitizes to empty`);
        const salt = "install-salt-7";
        const id = await deriveNodeId({ config: {}, hostname, salt });
        // Non-empty, matches node-<install-hash> reusing the SAME per-install hash.
        assert.equal(id, `node-${installHash(salt)}`, `"${hostname}" → node-<install-hash>`);
        assert.ok(id.length > 0, "id is non-empty");
        assert.match(id, ID_RE, `"${id}" is [a-z0-9-]-only`);
        // Deterministic + stable across re-derivation on this install (same salt).
        const again = await deriveNodeId({ config: {}, hostname, salt });
        assert.equal(again, id, "empty-stem fallback is deterministic + stable");
      }
    },
  },

  // ══ Scenario: first derivation persists the id; later derivations reuse it ════
  {
    name: "mesh-node-identity/00 the first derivation persists the id to the sidecar and later derivations reuse it",
    async run() {
      const { dir, sidecarPath } = await tempSidecarPath();
      try {
        // First derive (sidecarPath supplied → persists { nodeId, salt } to the sidecar,
        // NEVER a committed config — milestone 33 / ADR-004's re-point).
        const derived = `node-${installHash("s")}`;
        const id1 = await deriveNodeId({ config: {}, hostname: "Umami-Desktop", salt: "s", sidecarPath });
        assert.equal(id1, derived);
        // The sidecar's nodeId is now pinned.
        const afterFirst = JSON.parse(await readFile(sidecarPath, "utf8"));
        assert.equal(afterFirst.nodeId, derived, "nodeId persisted to the sidecar");
        // The host later changes; deriving again reads the PINNED id (the rename is
        // ignored once an id is pinned) — simulated here by feeding the sidecar's value
        // back in as the (hydrated) config, mirroring loadWorkspace's overlay.
        const id2 = await deriveNodeId({ config: { mesh: afterFirst }, hostname: "Umami-Laptop", salt: "s", sidecarPath });
        assert.equal(id2, derived, "the persisted id, not a re-derivation");
        const afterRename = JSON.parse(await readFile(sidecarPath, "utf8"));
        assert.equal(afterRename.nodeId, derived, "the rename did not rewrite the pinned id");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: an operator-set mesh.nodeId overrides + is never rewritten ══════
  {
    name: "mesh-node-identity/00 an operator-set mesh.nodeId overrides the derived default and is never rewritten",
    async run() {
      const { dir, sidecarPath } = await tempSidecarPath();
      try {
        // The operator-pinned id is simulated as already-hydrated config (a sidecar
        // written directly with pinned:true, never through deriveNodeId's own persist).
        const config = { mesh: { nodeId: "build-server" } };
        const id = await deriveNodeId({ config, hostname: "Umami-Desktop", salt: "s", sidecarPath });
        assert.equal(id, "build-server", "operator-set id wins verbatim");
        // A pinned id short-circuits BEFORE any persist — the sidecar is never created.
        await assert.rejects(readFile(sidecarPath, "utf8"), "the sidecar was never written for a pinned id");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: a hostname collision is disambiguated by a stable per-install hash ═
  {
    name: "mesh-node-identity/00 a collision is disambiguated by widening the stable per-install hash",
    async run() {
      // Two installs, same host "laptop", distinct salts, each finding its opaque id taken.
      // 132: the collision WIDENS the hash; the hostname stem never appears.
      const takenA = [`node-${installHash("salt-A")}`];
      const takenB = [`node-${installHash("salt-B")}`];
      const idA = await deriveNodeId({ config: {}, hostname: "laptop", salt: "salt-A", takenIds: takenA });
      const idB = await deriveNodeId({ config: {}, hostname: "laptop", salt: "salt-B", takenIds: takenB });
      assert.notEqual(idA, idB, "the two ids differ");
      assert.ok(!idA.includes("laptop") && !idB.includes("laptop"), "neither id carries the hostname stem");
      assert.ok(idA.startsWith(`node-${installHash("salt-A")}`), "the widened id extends the per-install hash");
      assert.ok(idB.startsWith(`node-${installHash("salt-B")}`), "the widened id extends the per-install hash");
      // Stable across re-derivation on its own install.
      assert.equal(await deriveNodeId({ config: {}, hostname: "laptop", salt: "salt-A", takenIds: takenA }), idA, "idA stable");
      assert.equal(await deriveNodeId({ config: {}, hostname: "laptop", salt: "salt-B", takenIds: takenB }), idB, "idB stable");
      assert.match(idA, ID_RE, `"${idA}" is [a-z0-9-]-only`);
      assert.match(idB, ID_RE, `"${idB}" is [a-z0-9-]-only`);
    },
  },

  // ══ Scenario: the capability descriptor carries the complete frozen schema ════
  //
  // REPAIRED 2026-08-29 (milestone 59 / story 01, ADR-003 §3 — the re-arming). `skills` left
  // the descriptor by OPERATOR DIRECTIVE in milestone 34 / story 02, and `src/node-identity.mjs`
  // states the reason in terms: the aof bundle's resource ids were being advertised as node
  // "skills", which says nothing about the node because every node ships the same bundle. The
  // frozen schema is SIX keys, not seven.
  //
  // The two lanes below asserted the seventh for a month and nobody heard, because the removal
  // and the de-arming were the SAME COMMIT — `15e0a92` (2026-07-26) dropped `skills` from
  // `assembleDescriptor` and dropped this suite's spread from `scripts/test.mjs` in one change.
  // A suite that goes dark in the commit that breaks it is the exact failure this milestone
  // exists to make impossible, and it is why the repair is here rather than a baseline entry:
  // the scenario is still true, the schema it names simply has one fewer key.
  {
    name: "mesh-node-identity/00 the capability descriptor carries the complete frozen schema",
    async run() {
      const descriptor = assembleDescriptor({
        nodeId: "umami-desktop",
        hostname: "Umami-Desktop",
        platform: "linux",
        runtimes: ["claude", "codex"],
        aofVersion: "0.1.0",
      });
      assert.equal(typeof descriptor.nodeId, "string");
      assert.ok(descriptor.nodeId.length > 0, "nodeId is a non-empty string");
      assert.equal(descriptor.host, "Umami-Desktop", "host is the raw host name");
      assert.ok(["win32", "darwin", "linux"].includes(descriptor.os), "os is the platform");
      assert.deepEqual(descriptor.runtimes, ["claude", "codex"], "runtimes from config");
      assert.ok(!("skills" in descriptor), "no `skills` key — m34/02's operator directive removed it, and a descriptor that grew it back would be advertising the bundle rather than the node");
      assert.equal(descriptor.aofVersion, "0.1.0", "aofVersion is the install's version");
      // publishedAt is an ISO-8601 UTC trailing-Z instant (a toISOString form).
      assert.match(descriptor.publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "publishedAt is trailing-Z ISO");
      assert.equal(new Date(descriptor.publishedAt).toISOString(), descriptor.publishedAt, "publishedAt round-trips toISOString");
      // No field outside the schema's known + additive keys (132/02 added `hostname`).
      assert.deepEqual(
        Object.keys(descriptor),
        ["nodeId", "host", "hostname", "os", "runtimes", "aofVersion", "publishedAt"],
        "exactly the 7 keys, in order (m34/02 removed `skills`; 132/02 added `hostname`)"
      );
    },
  },

  // ══ Scenario Outline: the descriptor's capability arrays at the boundaries ════
  {
    name: "mesh-node-identity/00 the descriptor's capability arrays reflect config faithfully at the boundaries",
    async run() {
      // REPAIRED 2026-08-29 (59/01): the outline's `skills` column went with the key in
      // m34/02. The boundary the scenario is about — an array field echoes config faithfully,
      // and empty/absent assembles as [] rather than absent — is unchanged and still driven
      // over three rows, on the array the descriptor still carries.
      const rows = [
        { runtimes: ["claude", "codex"] },
        { runtimes: ["claude"] },
        { runtimes: [] },
      ];
      for (const { runtimes } of rows) {
        const d = assembleDescriptor({
          nodeId: "n", hostname: "h", platform: "linux", runtimes, aofVersion: "0.1.0",
        });
        assert.deepEqual(d.runtimes, runtimes, `runtimes echo ${JSON.stringify(runtimes)}`);
        assert.ok(Array.isArray(d.runtimes), "the array is present, not absent");
        assert.ok(!("skills" in d), "and no `skills` array came back — m34/02 removed the key, so a row that fed one gets nothing back");
      }
      // Empty/absent arrays assemble as [] (not absent, not crash).
      const minimal = assembleDescriptor({ nodeId: "n", hostname: "h", platform: "linux", aofVersion: "0.1.0" });
      assert.deepEqual(minimal.runtimes, [], "absent runtimes → []");
    },
  },

  // ══ Scenario: the descriptor is a rebuildable projection that reads, never writes ═
  {
    name: "mesh-node-identity/00 the descriptor is a rebuildable projection that reads config without mutating it",
    async run() {
      const { dir, configPath } = await tempConfig({ name: "fixture", mesh: { nodeId: "umami-desktop", salt: "s" } });
      try {
        const before = await readFile(configPath, "utf8");
        const args = { nodeId: "umami-desktop", hostname: "Umami-Desktop", platform: "linux", runtimes: ["claude"], aofVersion: "0.1.0" };
        const d1 = assembleDescriptor(args);
        // A real, monotonic-or-equal publishedAt between the two assemblies.
        await new Promise((resolve) => setTimeout(resolve, 2));
        const d2 = assembleDescriptor(args);
        // Equivalent in every field except publishedAt. REPAIRED 2026-08-29 (59/01): the list
        // named `skills`, a key neither descriptor has carried since m34/02 — so that row
        // compared `undefined` with `undefined` and would have passed over any change to it.
        for (const key of ["nodeId", "host", "os", "runtimes", "aofVersion"]) {
          assert.deepEqual(d1[key], d2[key], `field "${key}" stable across re-assembly`);
        }
        assert.ok(Date.parse(d2.publishedAt) >= Date.parse(d1.publishedAt), "publishedAt at or after the previous assembly");
        // assembly reads config but NEVER writes it — the file is byte-unchanged.
        const after = await readFile(configPath, "utf8");
        assert.equal(after, before, "mesh.* config byte-unchanged across both assemblies");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// 132 · run-records-carry-the-node-id — the unit scenarios of tasks 00, 01 and 02.
// ════════════════════════════════════════════════════════════════════════════════════════
const SALT = "2d4c74e4-66e3-4c7a-bd88-b199d8f81b7f";
const HASH = installHash(SALT);
const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const TAILSCALE = { mesh: { fabric: "tailscale" } };

async function listing(dir) {
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

// A scripted `tailscale status --json` carrying the given Peer entries.
function scriptedPeers(peers) {
  const status = {
    BackendState: "Running",
    Self: { TailscaleIPs: ["100.64.0.1"] },
    Peer: Object.fromEntries(peers.map((peer, index) => [`p${index}`, peer])),
  };
  return async () => ({ stdout: JSON.stringify(status), status: 0 });
}

function bodyText(code, header) {
  const body = functionBody(code, header);
  return typeof body === "string" ? body : body?.body ?? null;
}

export const runRecordsNodeIdUnitTests = [
  // ── task 00 ─────────────────────────────────────────────────────────────────────────
  {
    name: "132/00 a derived id is the opaque form, whatever the machine is called",
    async run() {
      const rows = [
        ["Win-Host-A", "win-host-a"],
        ["umamis-mac-mini", "umamis-mac-mini"],
        ["Umamis-Mac-mini.local", "umamis-mac-mini"],
        ["aof-wsl", "aof-wsl"],
        ["WORKSTATION-01", "workstation-01"],
        ["a", "a"],
      ];
      for (const [hostname, stem] of rows) {
        const { dir, sidecarPath } = await tempSidecarPath();
        try {
          const id = await deriveNodeId({ config: {}, hostname, salt: SALT, sidecarPath });
          assert.equal(id, `node-${HASH}`, `"${hostname}"`);
          assert.match(id, /^node-[0-9a-f]{4}$/);
          // The id's only letters are `node` and hex, so a stem can appear only by
          // coincidence of a one-letter hex stem; the id is the same for every row.
          assert.ok(stem.length === 1 || !id.includes(stem), `"${id}" does not contain "${stem}"`);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "132/00 the hostname changes nothing — one salt, one id",
    async run() {
      for (const [first, second] of [["Win-Host-A", "Win-Host-A"], ["Win-Host-A", "umamis-mac-mini"], ["Win-Host-A", ""]]) {
        const a = await tempSidecarPath();
        const b = await tempSidecarPath();
        try {
          const idA = await deriveNodeId({ config: {}, hostname: first, salt: SALT, sidecarPath: a.sidecarPath });
          const idB = await deriveNodeId({ config: {}, hostname: second, salt: SALT, sidecarPath: b.sidecarPath });
          assert.equal(idA, `node-${HASH}`);
          assert.equal(idB, `node-${HASH}`, `"${first}" then "${second}"`);
        } finally {
          await rm(a.dir, { recursive: true, force: true });
          await rm(b.dir, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "132/00 two installs on one machine differ, so the collision arm has nothing to resolve",
    async run() {
      const saltA = crypto.randomUUID();
      let saltB = crypto.randomUUID();
      while (installHash(saltB) === installHash(saltA)) saltB = crypto.randomUUID();
      const takenIds = [];
      const idA = await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: saltA, takenIds });
      const idB = await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: saltB, takenIds });
      assert.notEqual(idA, idB);
      assert.ok(!idA.includes("win-host-a") && !idB.includes("win-host-a"));
      assert.deepEqual(takenIds, [], "takenIds was empty in both calls");
    },
  },
  {
    name: "132/00 a collision widens the hash, and never reaches for the hostname",
    async run() {
      const takenIds = [`node-${HASH}`];
      const id = await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, takenIds });
      assert.notEqual(id, `node-${HASH}`);
      assert.match(id, /^node-[0-9a-f]{8}$/);
      assert.ok(id.startsWith(`node-${HASH}`), "the SAME hash, widened");
      assert.ok(!id.includes("win-host-a"));
      assert.equal(await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, takenIds }), id, "stable, not random");
    },
  },
  {
    name: "132/00 a pinned id still wins verbatim — the operator's escape hatch is untouched",
    async run() {
      for (const pinned of ["aof-wsl", "node-beef", "win-host-a"]) {
        const { dir, sidecarPath } = await tempSidecarPath();
        try {
          const id = await deriveNodeId({ config: { mesh: { nodeId: pinned } }, hostname: "Win-Host-A", salt: SALT, sidecarPath });
          assert.equal(id, pinned);
          await assert.rejects(readFile(sidecarPath, "utf8"), "nothing was written to sidecarPath");
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "132/00 the derivation persists the opaque id and the host it ran on, to the sidecar only",
    async run() {
      const { dir, sidecarPath } = await tempSidecarPath();
      const checkout = await mkdtemp(path.join(os.tmpdir(), "aof-132-checkout-"));
      const cwd = process.cwd();
      try {
        await mkdir(path.join(checkout, ".aof"), { recursive: true });
        await writeFile(path.join(checkout, ".aof", "aof.config.json"), "{}\n", "utf8");
        await writeFile(path.join(checkout, "README.md"), "fixture\n", "utf8");
        const before = await listing(checkout);
        process.chdir(checkout);
        await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, sidecarPath });
        process.chdir(cwd);
        assert.deepEqual(JSON.parse(await readFile(sidecarPath, "utf8")), { salt: SALT, nodeId: `node-${HASH}`, derivedFrom: "Win-Host-A" });
        assert.deepEqual(await listing(checkout), before, "no committed file was touched");
        const bytes = await readFile(sidecarPath, "utf8");
        await deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, sidecarPath });
        assert.equal(await readFile(sidecarPath, "utf8"), bytes, "a second identical call leaves the sidecar's bytes unchanged");
      } finally {
        process.chdir(cwd);
        await rm(dir, { recursive: true, force: true });
        await rm(checkout, { recursive: true, force: true });
      }
    },
  },
  {
    name: "132/00 no module under src/ turns a machine hostname into a node id",
    async run() {
      const files = await readSrcFiles(REPO_ROOT);
      assert.ok(files.length > 100, "the sweep read the tree");
      const callers = [];
      for (const file of files) {
        const code = stripComments(await readFile(file.path, "utf8"));
        const calls = [...code.matchAll(/\bsanitizeHostname\(([^)]*)\)/g)]
          .filter((match) => !/function\s+$/.test(code.slice(Math.max(0, match.index - 20), match.index)));
        if (calls.length === 0) continue;
        callers.push(file.rel);
        // Every binding assigned from os.hostname() in this module.
        const fromHostname = new Set([...code.matchAll(/\b(\w+)\s*=\s*[^;\n]*\bos\.hostname\(\)/g)].map((match) => match[1]));
        for (const call of calls) {
          const arg = call[1].trim();
          assert.ok(!/os\.hostname\(\)/.test(arg) && !fromHostname.has(arg), `${file.rel}: sanitizeHostname(${arg}) is fed a value derived from os.hostname()`);
        }
      }
      assert.deepEqual(callers.sort(), ["commands/mesh/identity.mjs", "node-identity.mjs"]);
      const source = stripComments(await readFile(path.join(REPO_ROOT, "src", "node-identity.mjs"), "utf8"));
      const body = bodyText(source, "export async function deriveNodeId(");
      assert.ok(body != null, "deriveNodeId found");
      assert.ok(!/sanitizeHostname|\bstem\b/.test(body), "deriveNodeId assigns no sanitized hostname stem to the id");
    },
  },

  // ── task 01 ─────────────────────────────────────────────────────────────────────────
  {
    name: "132/01 isDerivationOf recognises the legacy forms, so the heal has no trigger",
    async run() {
      const rows = [
        ["win-host-a", "Win-Host-A", true],
        [`win-host-a-${HASH}`, "Win-Host-A", true],
        ["umamis-mac-mini", "Umamis-Mac-mini.local", true],
        [`node-${HASH}`, "Win-Host-A", true],
        [`node-${HASH}`, "", true],
        ["win-host-a", "umamis-mac-mini", false],
        ["node-beef", "Win-Host-A", false],
        ["win-host-a-local", "Win-Host-A.local", false],
      ];
      for (const [nodeId, host, answer] of rows) {
        assert.equal(isDerivationOf(nodeId, host, SALT), answer, `isDerivationOf(${nodeId}, ${host})`);
      }
    },
  },
  {
    name: "132/01 isOpaqueNodeId is the narrow question — is this id safe to commit",
    async run() {
      const widened = await deriveNodeId({ config: {}, hostname: "x", salt: SALT, takenIds: [`node-${HASH}`] });
      const ids = [`node-${HASH}`, widened, "win-host-a", `win-host-a-${HASH}`, "aof-wsl", "node-beef"];
      const answers = Object.fromEntries(ids.map((id) => [id, isOpaqueNodeId(id, SALT)]));
      assert.deepEqual(answers, {
        [`node-${HASH}`]: true,
        [widened]: true,
        "win-host-a": false,
        [`win-host-a-${HASH}`]: false,
        "aof-wsl": false,
        "node-beef": false,
      });
      // PURE: its declaration reads no hostname, clock or filesystem.
      const source = stripComments(await readFile(path.join(REPO_ROOT, "src", "node-identity.mjs"), "utf8"));
      const body = bodyText(source, "export function isOpaqueNodeId(");
      assert.ok(typeof body === "string" && body.length > 0, "isOpaqueNodeId found");
      assert.ok(!/hostname|Date|readFile|readJson|readSidecar|process\./.test(body), "no hostname, clock or filesystem read");
    },
  },

  // ── task 02 ─────────────────────────────────────────────────────────────────────────
  {
    name: "132/02 the descriptor carries the machine name beside the dial address",
    async run() {
      const inputs = { nodeId: "node-7f3a", hostname: "192.168.1.102", platform: "win32", runtimes: ["claude"], aofVersion: "0.1.0", now: "2026-09-22T20:57:38.739Z" };
      const d = assembleDescriptor({ ...inputs, machineName: "Win-Host-A" });
      assert.deepEqual(Object.keys(d), ["nodeId", "host", "hostname", "os", "runtimes", "aofVersion", "publishedAt"]);
      assert.equal(d.host, "192.168.1.102");
      assert.equal(d.hostname, "Win-Host-A");
      const pre132 = { nodeId: "node-7f3a", host: "192.168.1.102", os: "win32", runtimes: ["claude"], aofVersion: "0.1.0", publishedAt: "2026-09-22T20:57:38.739Z" };
      for (const key of Object.keys(pre132)) assert.deepEqual(d[key], pre132[key], `${key} byte-identical to a pre-132 assembly`);
    },
  },
  {
    name: "132/02 the key is always present, defaulting to the honest empty string",
    async run() {
      const base = { nodeId: "n", hostname: "h", platform: "linux", aofVersion: "0.1.0" };
      for (const [given, value] of [["aof-wsl", "aof-wsl"], [undefined, ""], [null, ""]]) {
        const d = assembleDescriptor(given === undefined ? base : { ...base, machineName: given });
        assert.ok("hostname" in d, "never omitted");
        assert.equal(d.hostname, value);
      }
    },
  },
  {
    name: "132/02 a peer joins to an opaque id through the declared hostname",
    async run() {
      const rows = [
        ["umamis-mac-mini", "umamis-mac-mini", "umamis-mac-mini.tail1a2b.ts.net.", "node-7f3a"],
        ["Win-Host-A", "win-host-a", "", "node-7f3a"],
        ["umamis-mac-mini", "", "umamis-mac-mini.tail1a2b.ts.net.", "node-7f3a"],
        ["umamis-mac-mini", "some-other-box", "some-other-box.tail1a2b.ts.net.", null],
        ["", "win-host-a", "", null],
        // Beyond the outline: the raw macOS hostname still meets Tailscale's short name.
        ["Umamis-Mac-mini.local", "umamis-mac-mini", "", "node-7f3a"],
      ];
      for (const [declared, hostName, dnsName, answer] of rows) {
        const roster = [{ nodeId: "node-7f3a", host: "192.168.1.102", hostname: declared }];
        const peer = { HostName: hostName, DNSName: dnsName, TailscaleIPs: ["100.64.0.9"], Online: true };
        const peers = await resolvePeers(TAILSCALE, { exec: scriptedPeers([peer]), platform: "linux", roster });
        assert.equal(peers.length, 1);
        assert.equal(peers[0].nodeId, answer, `declared "${declared}", HostName "${hostName}", DNSName "${dnsName}"`);
      }
    },
  },
  {
    name: "132/02 the id is no longer read as if it were a machine name",
    async run() {
      const roster = [{ nodeId: "aof-wsl", host: "172.24.96.1", hostname: "aof-wsl-guest" }];
      const asId = await resolvePeers(TAILSCALE, { exec: scriptedPeers([{ HostName: "aof-wsl", TailscaleIPs: ["100.64.0.2"], Online: true }]), platform: "linux", roster });
      assert.equal(asId[0].nodeId, null, "the id seed is gone");
      const asName = await resolvePeers(TAILSCALE, { exec: scriptedPeers([{ HostName: "aof-wsl-guest", TailscaleIPs: ["100.64.0.2"], Online: true }]), platform: "linux", roster });
      assert.equal(asName[0].nodeId, "aof-wsl");
      const source = stripComments(await readFile(path.join(REPO_ROOT, "src", "mesh", "fabric.mjs"), "utf8"));
      assert.ok(!/byHost\.set\(\s*nodeId\b/.test(source), "no expression seeds the host index from a nodeId");
    },
  },
  {
    name: "132/02 an unjoined peer is still surfaced, never dropped",
    async run() {
      const roster = [{ nodeId: "node-7f3a", host: "192.168.1.102", hostname: "umamis-mac-mini" }];
      const exec = scriptedPeers([
        { HostName: "umamis-mac-mini", TailscaleIPs: ["100.64.0.3"], Online: true },
        { HostName: "stray-box", TailscaleIPs: ["100.64.0.4"], Online: true },
      ]);
      const peers = await resolvePeers(TAILSCALE, { exec, platform: "linux", roster });
      assert.equal(peers.length, 2, "both peers are answered");
      const stray = peers.find((peer) => peer.host === "stray-box");
      assert.equal(stray.nodeId, null);
      assert.equal(stray.dialAddress, "100.64.0.4");
    },
  },
  {
    name: "132/02 a pre-132 record with no hostname key still reads, and joins by nothing rather than by its id",
    async run() {
      const roster = [{ nodeId: "win-host-a", host: "192.168.1.102" }];
      const exec = scriptedPeers([{ HostName: "win-host-a", TailscaleIPs: ["100.64.0.5"], Online: true }]);
      const peers = await resolvePeers(TAILSCALE, { exec, platform: "linux", roster });
      assert.equal(peers[0].nodeId, null);
    },
  },

  // ── task 01, the history union ──────────────────────────────────────────────────────
  {
    name: "132/01 history keeps resolving — an old runs/<hostname>/ folder reads with no migration",
    async run() {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-132-runs-"));
      try {
        const item = { dir: path.join(root, "99_milestone_x") };
        const stamp = (runId, node, at) => ({ runId, itemRef: "99", state: "done", attempt: 1, outcome: "done", node, createdAt: at, updatedAt: at });
        const old = stamp("20260917T101112000Z-0001", "win-host-a", "2026-09-17T10:11:12.000Z");
        const fresh = stamp("20260922T205439255Z-0000", `node-${HASH}`, "2026-09-22T20:54:39.255Z");
        for (const record of [fresh, old]) {
          await mkdir(path.join(item.dir, "runs", record.node), { recursive: true });
          await writeFile(path.join(item.dir, "runs", record.node, `${record.runId}.json`), JSON.stringify(record, null, 2), "utf8");
        }
        const runs = await readRuns(item);
        assert.deepEqual(runs.map((run) => run.runId), [old.runId, fresh.runId], "both records, ascending by runId");
        assert.deepEqual(runs.map((run) => run.node), ["win-host-a", `node-${HASH}`], "each node key as written");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
