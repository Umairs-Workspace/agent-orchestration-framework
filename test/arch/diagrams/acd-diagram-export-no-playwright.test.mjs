// FF-13303 (milestone 133 / ADR-005 §3, §5) — EXPORT NEEDS NO PLAYWRIGHT AND FORMS ONE ARGV.
//
// "`src/diagrams/**` and `src/commands/diagram/**` import no `playwright` and spawn no `npx` or
//  `python`. `src/diagrams/rasterize.mjs` has exactly ONE function that returns a browser argv, and
//  every spawn in the file uses it. No rung of the ladder downloads anything."
//
// Why it matters: the plugin's own PNG path needs Python Playwright, which is policy-blocked on this
// machine and absent on the worker nodes; `npx playwright` would fetch a browser on first use. The
// export must work with a browser the node already has, or say plainly that it has none.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILIES = ["src/diagrams", "src/commands/diagram"];
const RASTERIZE = "src/diagrams/rasterize.mjs";
const PACKAGE_RUNNERS = ["npx", "python", "python3", "py", "pip", "npm"];

async function familyFiles() {
  const out = [];
  for (const family of FAMILIES) {
    const dir = path.join(repoRoot, family);
    if (!existsSync(dir)) continue;
    for (const name of await readdir(dir)) if (name.endsWith(".mjs")) out.push(`${family}/${name}`);
  }
  return out;
}

// What, in one module's code, reaches for Playwright or a package runner.
function packageReaches(code) {
  const hits = [];
  if (/\bfrom\s*["'][^"']*playwright[^"']*["']|\bimport\s*\(\s*["'][^"']*playwright/.test(code)) hits.push("imports playwright");
  for (const runner of PACKAGE_RUNNERS) {
    if (new RegExp(`["'\`]${runner}(?:\\.exe|\\.cmd)?["'\`]`).test(code)) hits.push(`names the ${runner} runner`);
  }
  if (/\bhttps?:\/\/[^"'`\s]*(?:download|storage\.googleapis|cdn\.playwright)/i.test(code)) hits.push("names a download host");
  return hits;
}

// The argv builders and the spawn sites in the rasterizer. Each spawn is cut to its own argument
// list by matching parens (the one home's slicer); a call that never closes is reported as null.
function argvShape(code) {
  const builders = [...code.matchAll(/export\s+function\s+(\w+)\s*\([^)]*\)\s*\{\s*return\s*\[/g)].map((match) => match[1]);
  const spawns = [...code.matchAll(/\bspawn\s*\(/g)].map((match) => matchedParenSpan(code, match.index)?.body ?? null);
  return { builders, spawns };
}

const USES_THE_BUILDER = /^\s*[\w.]+\s*,\s*browserArgv\(/;

export const archTests = [
  {
    name: "arch/133 FF-13303: the diagram families import no playwright and name no npx, python or download host",
    run: async () => {
      const files = await familyFiles();
      assert.ok(files.includes(RASTERIZE), "the rasterizer exists and is swept");
      const offenders = [];
      for (const file of files) {
        for (const hit of packageReaches(stripComments(await readFile(path.join(repoRoot, file), "utf8")))) offenders.push(`${file}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/133 FF-13303: the rasterizer forms its argv in ONE function, and every spawn uses it",
    run: async () => {
      const { builders, spawns } = argvShape(stripComments(await readFile(path.join(repoRoot, RASTERIZE), "utf8")));
      assert.ok(builders.includes("browserArgv"), "browserArgv returns the argv");
      for (const name of builders) assert.equal(name, "browserArgv", `${name} is a second function returning an argv array`);
      assert.ok(spawns.length >= 1, "the rasterizer spawns the browser");
      for (const site of spawns) {
        assert.notEqual(site, null, "every spawn call closes");
        assert.match(site, USES_THE_BUILDER, "the spawn's argv is browserArgv(...)");
      }
    },
  },
  {
    name: "arch/133 FF-13303 red probe: the detectors fire on a playwright import, an npx spawn, a second argv builder and a hand-formed spawn",
    run: () => {
      assert.deepEqual(packageReaches('import { chromium } from "playwright";'), ["imports playwright"]);
      assert.deepEqual(packageReaches('spawn("npx", ["playwright", "install"]);'), ["names the npx runner"]);
      assert.deepEqual(packageReaches('spawn("python", ["-m", "playwright"]);'), ["names the python runner"]);
      const two = argvShape("export function browserArgv(a) { return [a]; }\nexport function otherArgv(b) { return [b]; }\n");
      assert.deepEqual(two.builders, ["browserArgv", "otherArgv"]);
      const hand = argvShape('const child = spawn(file, ["--screenshot=x"]);');
      assert.doesNotMatch(hand.spawns[0], USES_THE_BUILDER);
      assert.match(argvShape("spawn(browser.path, browserArgv({ kind }), {});").spawns[0], USES_THE_BUILDER);
    },
  },
];
