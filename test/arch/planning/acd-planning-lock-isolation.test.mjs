// Fitness function for milestone 02 / ADR-009 (supersedes ADR-003's file-isolation):
// "aof planning init writes ONLY the `planning` section of the unified
//  .aof/aof.lock.json. It never writes a separate aof.planning.lock.json, never
//  clobbers the asset (files/packages/frameworks/frameworkInstallAttempts) or `work`
//  sections, and never writes the runtime's known_marketplaces.json / settings.json."
//
// Reframed 2026-06-19 from FILE-isolation ("touch only aof.planning.lock.json") to
// SECTION-isolation ("write only the `planning` section of aof.lock.json; preserve
// the foreign sections"). RED until the developer migrates `planning init` to
// read-merge-write the unified lock (packages/core/src/planning-init.mjs writeLock target +
// buildManifest → `planning` section). That red is expected and correct.
//
// Proofs:
//  1. Source — grep the planning-init source: it names the unified `aof.lock.json`
//     literal, NEVER a separate `aof.planning.lock.json` or `aof.work.lock.json`,
//     and never `known_marketplaces` / `settings.json`.
//  2. Behavioural — seed `.aof/aof.lock.json` with asset + `work` sections, run a
//     claude init, then assert: only `aof.lock.json` exists under `.aof/`, the
//     `planning` section carries the frozen ADR-009 schema, and the seeded
//     asset/`work` sections survive byte-intact.
//  3. FF-16501 (165/ADR-004) — the section holds one entry per runtime: a planning
//     init for one runtime leaves every other runtime's entry deep-equal and every
//     non-`planning` section intact; a pre-165 flat section reads as its one
//     runtime's entry; and `planningEntries` is the module's one reader of it.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, writeFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initPlanning, planningEntries } from "../../../packages/core/src/planning-init.mjs";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "core", "src");
const planningSourcePath = path.join(srcDir, "planning-init.mjs");
const FIXTURE_SHA = "d384f0c9eb81fe74656a4f6da168587836939edb";

// Reuse the stripComments idiom from acd-install-manifest-contract: drop block and
// line comments so the grep targets real code, not the documenting prose.
function stripComments(source) {
  return source
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

// A representative pre-existing unified lock with the ASSET fields populated and a
// foreign `work` section. The `planning` key is intentionally ABSENT.
function seededUnifiedLock() {
  return {
    version: 2,
    generatedAt: "2026-06-19T00:00:00.000Z",
    runtimes: ["claude"],
    files: [
      {
        path: ".claude/agents/aof-architect.md",
        runtime: "claude",
        resource: { id: "aof-architect", kind: "agent" },
        hash: "sha256:" + "a".repeat(64),
        generatedAt: "2026-06-19T00:00:00.000Z"
      }
    ],
    packages: [],
    frameworks: [],
    frameworkInstallAttempts: [],
    work: {
      generatedAt: "2026-06-19T00:00:00.000Z",
      bundle: { version: "1.0.0" },
      runtimes: ["claude"],
      files: [],
      packages: [],
      frameworks: [],
      frameworkInstallAttempts: []
    }
  };
}

export const archTests = [
  {
    name: "arch/ADR-009: planning-init names the unified aof.lock.json and never a separate per-vertical lock or runtime-state file",
    run: async () => {
      const code = stripComments(await readFile(planningSourcePath, "utf8"));

      // It writes the unified consumer lock — the bare `aof.lock.json` literal.
      assert.ok(/aof\.lock\.json/.test(code), "names the unified aof.lock.json");

      // It must NOT name either eliminated per-vertical lock.
      assert.ok(!/aof\.planning\.lock\.json/.test(code), "never names the eliminated aof.planning.lock.json");
      assert.ok(!/aof\.work\.lock\.json/.test(code), "never names aof.work.lock.json");

      // It never touches the runtime's own plugin state (RESEARCH §2).
      assert.ok(!/known_marketplaces/.test(code), "never touches the runtime's known_marketplaces.json");
      assert.ok(!/settings\.json/.test(code), "never writes the runtime's settings.json");
    }
  },
  {
    name: "arch/ADR-009: after a claude run, only aof.lock.json exists under .aof/, the planning section is written, and the asset/work sections survive intact",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-arch-planning-section-"));
      try {
        // Seed the unified lock with asset + `work` sections (no `planning` yet).
        const aofDir = path.join(repo, ".aof");
        await mkdir(aofDir, { recursive: true });
        const lockPath = path.join(aofDir, "aof.lock.json");
        const seeded = seededUnifiedLock();
        await writeFile(lockPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

        const result = await initPlanning({
          targetDir: repo,
          sha: FIXTURE_SHA,
          simulateInstall: true,
          log: () => {}
        });
        assert.equal(result.manifestWritten, true, "planning provenance was written");

        // Exactly one lock file under .aof/ — the unified lock.
        const entries = (await readdir(aofDir)).filter((name) => name.endsWith(".lock.json"));
        assert.deepEqual(entries, ["aof.lock.json"], "only the unified aof.lock.json under .aof/");

        const lock = JSON.parse(await readFile(lockPath, "utf8"));

        // The claude entry of the `planning` section carries the frozen ADR-009 schema.
        const entry = planningEntries(lock).claude;
        assert.ok(entry && typeof entry === "object", "lock.planning records a claude entry");
        assert.equal(entry.source, "phuryn/pm-skills", "planning.source");
        assert.equal(entry.marketplaceName, "pm-skills", "planning.marketplaceName");
        assert.equal(entry.marketplaceVersion, "2.0.0", "planning.marketplaceVersion");
        assert.match(entry.sha, /^[0-9a-f]{40}$/, "planning.sha is 40-hex (ADR-002)");
        assert.equal(entry.runtime, "claude", "planning.runtime");
        assert.ok(Array.isArray(entry.plugins) && entry.plugins.length > 0, "planning.plugins[]");
        assert.equal(entry.codex, null, "planning.codex null on claude");
        assert.ok(typeof entry.generatedAt === "string", "planning.generatedAt");

        // The seeded foreign sections survive byte-intact (deep-equal the seed).
        assert.deepEqual(lock.files, seeded.files, "asset files[] preserved unchanged");
        assert.deepEqual(lock.packages, seeded.packages, "asset packages preserved");
        assert.deepEqual(lock.frameworks, seeded.frameworks, "asset frameworks preserved");
        assert.deepEqual(lock.frameworkInstallAttempts, seeded.frameworkInstallAttempts, "asset frameworkInstallAttempts preserved");
        assert.deepEqual(lock.work, seeded.work, "the foreign `work` section preserved unchanged");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    }
  },
  {
    name: "arch/FF-16501: a planning init for one runtime leaves every other runtime's entry deep-equal and every non-planning section intact",
    run: async () => {
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-arch-planning-runtimes-"));
      try {
        const aofDir = path.join(repo, ".aof");
        await mkdir(aofDir, { recursive: true });
        const lockPath = path.join(aofDir, "aof.lock.json");
        const seeded = seededUnifiedLock();
        await writeFile(lockPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");
        const run = (runtime, extra = {}) => initPlanning({ targetDir: repo, runtime, sha: FIXTURE_SHA, simulateInstall: true, log: () => {}, ...extra });

        await run("claude");
        const claudeEntry = planningEntries(JSON.parse(await readFile(lockPath, "utf8"))).claude;
        const codex = await run("codex");
        assert.equal(codex.guarded, false, "a second runtime is added without --force");
        let lock = JSON.parse(await readFile(lockPath, "utf8"));
        assert.deepEqual(planningEntries(lock).claude, claudeEntry, "the claude entry is deep-equal after the codex init");
        const codexEntry = planningEntries(lock).codex;

        await run("claude", { force: true, sha: "0".repeat(40) });
        lock = JSON.parse(await readFile(lockPath, "utf8"));
        assert.deepEqual(planningEntries(lock).codex, codexEntry, "--force on claude leaves the codex entry deep-equal");
        assert.equal(planningEntries(lock).claude.sha, "0".repeat(40), "--force re-pinned claude");
        for (const section of Object.keys(seeded)) {
          assert.deepEqual(lock[section], seeded[section], `the non-planning section ${section} is intact`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    }
  },
  {
    name: "arch/FF-16501: a pre-165 flat planning section reads as its runtime's entry, and planningEntries is the module's one reader of the section",
    run: async () => {
      const flat = { generatedAt: "2026-07-01T00:00:00.000Z", source: "phuryn/pm-skills", sha: FIXTURE_SHA, runtime: "claude", plugins: [], codex: null };
      assert.deepEqual(planningEntries({ planning: flat }), { claude: flat }, "a flat section is its runtime's entry, kept as it was");
      assert.equal(planningEntries({ planning: flat }).claude, flat, "the flat section is passed through, not copied");
      assert.deepEqual(planningEntries({}), {}, "no section → no entries");
      const runtimes = { claude: flat, codex: { ...flat, runtime: "codex" } };
      assert.equal(planningEntries({ planning: { runtimes } }), runtimes, "the 165 shape reads as its runtimes map");

      const code = stripComments(await readFile(planningSourcePath, "utf8"));
      const reads = code.match(/\.planning\b/g) ?? [];
      assert.equal(reads.length, 1, "planning-init reads lock.planning in exactly one place — the planningEntries reader");
    }
  }
];
