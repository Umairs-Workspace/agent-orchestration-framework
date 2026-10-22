// Fitness function FF-16702 · acd-daemon-budget-one-home (milestone 167 / ADR-002, ADR-006).
//
//   A daemon budget number is declared only in `cost-meter.mjs`; no other `packages/`, `apps/` or
//   `test/` file holds one, and the desktop crates hold no budget literal.
//
// The budget is a product promise with three readers — the doctor lane, the soak test (167/04) and
// the desktop guard (167/05). If any of them declared its own number, the soak test could pass
// against 5% while a user's machine is held to 2%, and nothing would say the two had drifted. So
// the numbers are `DAEMON_BUDGET` and nothing else: readers import the constant, or read it off
// `aof mesh status --json` `cost.budget`.
//
// A "declaration" is a budget key given a numeric literal: `idlePercent: 2`, `viewerOpenPercent =
// 10`, and the Rust spellings `idle_percent` / `viewer_open_percent`. An ASSERTION that compares a
// read value to a number (`assert.equal(budget.idlePercent, 2)`) declares nothing and is not swept.
// Self-check: the detector trips on each planted spelling and stays quiet on a read.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const rel = (file) => path.relative(repoRoot, file).split(path.sep).join("/");
const HOME = "packages/foundation/src/cost-meter.mjs";
const ROOTS = ["packages", "apps", "test"];
const EXTENSIONS = [".mjs", ".js", ".ts", ".tsx", ".rs"];
const SKIP = new Set(["node_modules", "dist", "target", ".git", "fixtures"]);

// The key, then `:` or `=` (or a typed Rust binding, `idle_percent: f64 = 2.0`), then a number.
const DECLARATION = /\b(?:idlePercent|viewerOpenPercent|idle_percent|viewer_open_percent)\b\s*(?::\s*\w+\s*=|[:=])\s*-?\d/;
// This file plants every spelling in its own self-check, so it is the one other file excused.
const SELF = rel(fileURLToPath(import.meta.url));
const declaresBudget = (code) => DECLARATION.test(code);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return out;
    throw error;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (EXTENSIONS.some((extension) => entry.name.endsWith(extension))) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/167 FF-16702 (acd-daemon-budget-one-home): the daemon budget is declared in the cost meter and nowhere else",
    async run() {
      assert.ok(declaresBudget(await readFile(path.join(repoRoot, HOME), "utf8")), "the meter declares DAEMON_BUDGET (non-vacuous)");
      const files = (await Promise.all(ROOTS.map((root) => walk(path.join(repoRoot, root))))).flat();
      assert.ok(files.length > 500, `the tree was read (${files.length})`);
      const offenders = [];
      for (const file of files) {
        if (rel(file) === HOME || rel(file) === SELF) continue;
        if (declaresBudget(await readFile(file, "utf8"))) offenders.push(rel(file));
      }
      assert.deepEqual(offenders, [], "import DAEMON_BUDGET, or read cost.budget off `aof mesh status --json` — never re-declare a budget number");
    },
  },
  {
    name: "arch/167 FF-16702 (acd-daemon-budget-one-home): the detector trips on every spelling and not on a read (non-vacuous)",
    run() {
      for (const planted of ["{ idlePercent: 2 }", "const viewerOpenPercent = 10;", "let idle_percent: f64 = 2.0;", "const VIEWER: Budget = Budget { viewer_open_percent: 10 };"]) {
        assert.equal(declaresBudget(planted), true, planted);
      }
      assert.equal(declaresBudget("assert.equal(cost.budget.idlePercent, 2);"), false, "a read compared to a number declares nothing");
      assert.equal(declaresBudget("{ idlePercent: DAEMON_BUDGET.idlePercent }"), false, "a value taken from the constant declares nothing");
    },
  },
];
