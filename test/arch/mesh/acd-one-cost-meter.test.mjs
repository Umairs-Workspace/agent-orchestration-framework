// Fitness function FF-16701 · acd-one-cost-meter (milestone 167 / ADR-001).
//
//   Only `packages/foundation/src/cost-meter.mjs` reads `process.cpuUsage` or
//   `eventLoopUtilization` in `packages/` sources.
//
// Each daemon process has ONE cost meter. A second module reading the process's CPU would be a
// second answer to "what does this daemon cost" — one the snapshot, `aof mesh status` and the doctor
// lane never see — and the first time the two disagreed nobody could say which was right. The
// meter is also the one place a counted cause is checked against the closed set, so every count
// site must reach it rather than keep a tally of its own.
//
// Three claims over the sources:
//   1. The meter itself reads both clocks (non-vacuous: the sweep below has something to protect).
//   2. No other `.mjs` under `packages/*/src` names either reader.
//   3. Every daemon count site the ADR names imports the meter (the sites count through it).
// Self-check: the detector trips on planted sources, and stays quiet on a comment.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const METER = "packages/foundation/src/cost-meter.mjs";
const COUNT_SITES = [
  "packages/foundation/src/degrade.mjs",
  "packages/work/src/read.mjs",
  "packages/mesh/src/launcher.mjs",
  "packages/mesh/src/ui-serve.mjs",
  "packages/core/src/application/bindings/board-ui.mjs",
];

function stripComments(source) {
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

const readsProcessCost = (code) => /\bcpuUsage\s*\(|\beventLoopUtilization\b/.test(stripComments(code));
const importsMeter = (code) => /from\s+["'](?:@aof\/foundation\/cost-meter|\.\/cost-meter\.mjs)["']/.test(code);

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

async function packageSources() {
  const files = [];
  for (const pkg of await readdir(path.join(repoRoot, "packages"), { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const src = path.join(repoRoot, "packages", pkg.name, "src");
    try {
      files.push(...await sourcesUnder(src));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return files;
}

const rel = (file) => path.relative(repoRoot, file).split(path.sep).join("/");

export const archTests = [
  {
    name: "arch/167 FF-16701 (acd-one-cost-meter): only the cost meter reads the process's CPU and event-loop clocks",
    async run() {
      const files = await packageSources();
      assert.ok(files.length > 100, `the package sources were read (${files.length})`);
      assert.ok(readsProcessCost(await readFile(path.join(repoRoot, METER), "utf8")), "the meter reads both clocks itself");
      const offenders = [];
      for (const file of files) {
        if (rel(file) === METER) continue;
        if (readsProcessCost(await readFile(file, "utf8"))) offenders.push(rel(file));
      }
      assert.deepEqual(offenders, [], "no other package source reads process.cpuUsage or eventLoopUtilization — count through the meter");
    },
  },
  {
    name: "arch/167 FF-16701 (acd-one-cost-meter): every daemon count site counts through the one meter",
    async run() {
      for (const site of COUNT_SITES) {
        assert.ok(importsMeter(await readFile(path.join(repoRoot, site), "utf8")), `${site} imports the cost meter`);
      }
    },
  },
  {
    name: "arch/167 FF-16701 (acd-one-cost-meter): the detector trips on planted sources (non-vacuous)",
    run() {
      assert.equal(readsProcessCost("const used = process.cpuUsage();"), true);
      assert.equal(readsProcessCost("const elu = performance.eventLoopUtilization(prior);"), true);
      assert.equal(readsProcessCost("// process.cpuUsage() is the meter's\nconst x = 1;"), false, "a comment is not a read");
      assert.equal(importsMeter('import { processCostMeter } from "@aof/foundation/cost-meter";'), true);
      assert.equal(importsMeter('import { x } from "@aof/foundation/degrade";'), false);
    },
  },
];
