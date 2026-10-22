// Fitness function FF-16706 · acd-one-work-tree-walker (milestone 167 / ADR-009).
//
//   `packages/work/src/discovery.mjs` is the only file in `packages/work/src` or `packages/mesh/src`
//   that walks a tree with a recursive `readdir` or calls `watch` from `node:fs`; `mesh serve` is
//   the only caller that arms work-tree watches.
//
// An idle daemon tick walks nothing because the ONE walk is gated by the ONE watch set. A second
// recursive walk in the daemon's packages would bypass the gate and put the stat-walk cost back on
// every tick, uncounted; a second watch would be a second answer to "has this tree changed". And a
// second caller arming watches would hold handles on trees the serving daemon does not sync.
//
// Three claims over the sources:
//   1. discovery.mjs itself walks recursively and watches (non-vacuous: the sweep has something to protect).
//   2. No other `.mjs` under `packages/work/src` or `packages/mesh/src` does either.
//   3. Of the package sources, only `packages/mesh/src/commands/serve.mjs` passes `workTreeWatch`.
// Self-check: the detectors trip on planted sources, and stay quiet on a comment.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WALKER = "packages/work/src/discovery.mjs";
const SERVE = "packages/mesh/src/commands/serve.mjs";
const LAUNCHER = "packages/mesh/src/launcher.mjs";

function stripComments(source) {
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

const walksRecursively = (code) => /\breaddir(?:Sync)?\s*\([^)]*\brecursive\s*:\s*true/.test(stripComments(code));
const watchesTree = (code) => {
  const source = stripComments(code);
  return /\bimport\s*\{[^}]*\bwatch\b[^}]*\}\s*from\s*["']node:fs(?:\/promises)?["']/.test(source) || /\bfs\.watch\s*\(/.test(source);
};
const armsWatches = (code) => /\bworkTreeWatch\s*:/.test(stripComments(code));

async function sourcesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourcesUnder(full));
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

async function packageSources(names = null) {
  const files = [];
  for (const pkg of await readdir(path.join(repoRoot, "packages"), { withFileTypes: true })) {
    if (!pkg.isDirectory() || (names && !names.includes(pkg.name))) continue;
    try {
      files.push(...await sourcesUnder(path.join(repoRoot, "packages", pkg.name, "src")));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return files;
}

const rel = (file) => path.relative(repoRoot, file).split(path.sep).join("/");

export const archTests = [
  {
    name: "arch/167 FF-16706 (acd-one-work-tree-walker): only discovery.mjs walks a work tree recursively or watches one",
    async run() {
      const walker = await readFile(path.join(repoRoot, WALKER), "utf8");
      assert.ok(walksRecursively(walker), "discovery.mjs walks the tree itself");
      assert.ok(watchesTree(walker), "discovery.mjs holds the watch itself");
      const files = await packageSources(["work", "mesh"]);
      assert.ok(files.length > 50, `the work and mesh sources were read (${files.length})`);
      const offenders = [];
      for (const file of files) {
        if (rel(file) === WALKER) continue;
        const code = await readFile(file, "utf8");
        if (walksRecursively(code)) offenders.push(`${rel(file)} walks recursively`);
        if (watchesTree(code)) offenders.push(`${rel(file)} watches`);
      }
      assert.deepEqual(offenders, [], "walk and watch a work tree only through @aof/work/discovery (167/ADR-009)");
    },
  },
  {
    name: "arch/167 FF-16706 (acd-one-work-tree-walker): mesh serve is the only caller that arms work-tree watches",
    async run() {
      assert.ok(armsWatches(await readFile(path.join(repoRoot, SERVE), "utf8")), "mesh serve arms them");
      const offenders = [];
      for (const file of await packageSources()) {
        if (rel(file) === SERVE || rel(file) === LAUNCHER) continue;
        if (armsWatches(await readFile(file, "utf8"))) offenders.push(rel(file));
      }
      assert.deepEqual(offenders, [], "only `mesh serve` passes workTreeWatch to startLauncher");
    },
  },
  {
    name: "arch/167 FF-16706 (acd-one-work-tree-walker): the detectors trip on planted sources (non-vacuous)",
    run() {
      assert.equal(walksRecursively("const all = await readdir(dir, { recursive: true });"), true);
      assert.equal(walksRecursively("const all = readdirSync(dir, { withFileTypes: true, recursive: true });"), true);
      assert.equal(walksRecursively("const top = await readdir(dir, { withFileTypes: true });"), false);
      assert.equal(walksRecursively("// readdir(dir, { recursive: true }) is discovery's\nconst x = 1;"), false, "a comment is not a walk");
      assert.equal(watchesTree('import { watch } from "node:fs";'), true);
      assert.equal(watchesTree('import { readFile, watch as w } from "node:fs/promises";'), true);
      assert.equal(watchesTree("fs.watch(dir, () => {});"), true);
      assert.equal(watchesTree('import { createWorkTreeWatches } from "@aof/work/discovery";'), false);
      assert.equal(armsWatches("startLauncher(ws, { workTreeWatch: true })"), true);
      assert.equal(armsWatches("const workTreeWatches = null;"), false);
    },
  },
];
