// FF-9603 (96/ADR-005, ADR-006) — THE PLAN RESTATES NO DECLARED PATH, AND ITS LENGTH IS GOVERNED
// BY THE ONE BUDGET FAMILY.
//
// Two decisions meet in this document and both are structural, which is why they are asserted over
// the tree rather than reviewed. ADR-005: the file table has ONE home, the story record's
// frontmatter, and the plan restates none of it — 15/R1's measured species is that a sanctioned
// list generalised in two places ends up living in a third, and the third here would be whichever
// agent transcribed the plan's copy. ADR-006: length is the existing doc-budget lane's business —
// one row, one key, one resolver entry — because a second length rule is a second authority over
// one question, and the first thing that happens to two authorities is that one of them is updated.
//
// FIVE CLAIMS, each failing for its own reason:
//
//   1. THE SHIPPED TEMPLATE RESTATES NOTHING. No declared-set key, no file-column table, no path
//      list, no enumeration wearing prose — asserted through the same detector the behavioural
//      suite drives its Examples table with, so the template and the contract cannot disagree.
//   2. THE BAN IS A PROPERTY OF THE STREAM. Every `PLAN.md` under `wiki/work` is admitted, not just
//      the template. A rule that held for one file and not for the tree would be a style note.
//   3. THE BUDGET RESOLVES THROUGH THE FAMILY'S OWN SEAM. `budgetKeyFor` maps the plan to a kind
//      and `budgetsFromConfig` resolves it, with the NUMBER living only among the documented
//      defaults — no literal at a comparison site, which is the shape that lets two authorities
//      drift apart while both look right.
//   4. NO NEW CODE AND NO NEW SEVERITY ARRIVE WITH THE PLAN KIND. The doc-budget vocabulary is
//      exactly what it was: one code, and the warn/error pair the accepting-item ladder already
//      shipped. The plan fires the EXISTING code.
//   5. THE GATE HAS ONE READER. `work.plan.enabled` defaults false and is named by no module in
//      `src/` outside its own validator — ADR-006 §4's claim that nothing needs to read it, stated
//      as a census rather than trusted to stay true.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { restatementViolations } from "../../support/plan-restatement-ban.mjs";
import { budgetKeyFor, budgetGroup } from "../../../src/work/doctor-budget.mjs";
import { budgetsFromConfig } from "../../../src/work/doctor.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const TEMPLATE = "src/bundle/templates/story/PLAN.md";
const BUDGET_GROUP = "src/work/doctor-budget.mjs";
const BUDGET_DEFAULTS = "src/work/doctor.mjs";
const GATE_VALIDATOR = "src/config-inspect.mjs";
const WORK_DIR = path.join(repoRoot, "wiki", "work");

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
const raw = (rel) => readFile(path.join(repoRoot, rel), "utf8");

// Every `.mjs` under `src/`, so the gate census is over the module set rather than over a list
// someone remembered to extend.
async function srcModules(dir = path.join(repoRoot, "src"), found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await srcModules(full, found);
    else if (entry.name.endsWith(".mjs")) found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
  }
  return found;
}

async function streamPlans(dir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await streamPlans(full, found);
    else if (entry.name === "PLAN.md") found.push(full);
  }
  return found;
}

export const archTests = [
  {
    name: "arch/96/02 FF-9603 (1) THE SHIPPED TEMPLATE RESTATES NOTHING — no declared-set key, no file-column table, no path list, no enumeration in prose",
    async run() {
      const violations = restatementViolations(await raw(TEMPLATE));
      assert.deepEqual(
        violations,
        [],
        `${TEMPLATE} restates a declared path: ${violations.map((v) => `${v.rule} @${v.line} (${v.evidence})`).join("; ")}`
      );
    },
  },
  {
    name: "arch/96/02 FF-9603 (2) THE BAN IS A PROPERTY OF THE STREAM — every PLAN.md under wiki/work is admitted, not only the template",
    async run() {
      for (const plan of await streamPlans(WORK_DIR)) {
        const rel = path.relative(repoRoot, plan).split(path.sep).join("/");
        const violations = restatementViolations(await readFile(plan, "utf8"));
        assert.deepEqual(
          violations,
          [],
          `${rel} restates a declared path: ${violations.map((v) => `${v.rule} @${v.line} (${v.evidence})`).join("; ")}`
        );
      }
    },
  },
  {
    name: "arch/96/02 FF-9603 (3) THE BUDGET RESOLVES THROUGH THE FAMILY'S OWN SEAM — budgetKeyFor maps the plan, budgetsFromConfig resolves it, and the number lives ONLY among the documented defaults",
    async run() {
      // One row in the map, and it is the same kind the resolver answers for.
      assert.equal(budgetKeyFor("PLAN.md"), "plan", "PLAN.md must map to the plan kind through budgetKeyFor");
      const budget = budgetsFromConfig({}).plan;
      assert.equal(typeof budget, "number");
      assert.ok(budget > 0);

      // The number is in the defaults…
      const defaults = await source(BUDGET_DEFAULTS);
      const line = defaults.match(/const DEFAULT_BUDGETS = \{[^}]*\}/);
      assert.ok(line, "DEFAULT_BUDGETS must remain a single literal");
      assert.match(line[0], new RegExp(String.raw`plan:\s*${budget}\b`), "the plan budget must live among the documented defaults");

      // …and nowhere else. The GROUP — the comparison site — holds no budget literal at all, which
      // is what stops the map and the check drifting apart while both look right.
      const group = await source(BUDGET_GROUP);
      assert.doesNotMatch(group, new RegExp(String.raw`\b${budget}\b`), "the budget group must hold no budget literal");

      // And the resolver reads the plan key from config rather than re-deriving it.
      assert.equal(budgetsFromConfig({ work: { doctor: { budgets: { plan: budget + 40 } } } }).plan, budget + 40);
    },
  },
  {
    name: "arch/96/02 FF-9603 (4) NO NEW FINDING CODE AND NO NEW SEVERITY ARRIVE WITH THE PLAN KIND — the plan fires the existing doc-over-budget at the existing severities",
    async run() {
      const group = await source(BUDGET_GROUP);

      // The whole vocabulary this group can emit, read out of the group itself.
      const codes = new Set([...group.matchAll(/code:\s*"([^"]+)"/g)].map((m) => m[1]));
      assert.deepEqual([...codes], ["doc-over-budget"], "the doc-budget group emits exactly one code");

      const severities = new Set([...group.matchAll(/"(warn|error|info)"/g)].map((m) => m[1]));
      assert.deepEqual([...severities].sort(), ["error", "warn"], "the doc-budget severities are the pair m16/ADR-007 shipped");

      // …and the plan kind travels that vocabulary rather than one of its own: an over-budget plan
      // measured through the group yields the existing code, at warn on a sweep.
      const snapshot = {
        items: [{ ref: "96/02", type: "story", dir: path.join("wiki", "work", "s"), docSizes: { "PLAN.md": { lines: 999 } } }],
      };
      const findings = budgetGroup(snapshot, { budgets: budgetsFromConfig({}) });
      assert.equal(findings.length, 1);
      assert.equal(findings[0].code, "doc-over-budget");
      assert.equal(findings[0].severity, "warn");
    },
  },
  {
    name: "arch/96/02 FF-9603 (5) THE GATE HAS ONE READER — work.plan.enabled defaults false and is named by no module in src/ outside its own validator",
    async run() {
      const readers = [];
      for (const module of await srcModules()) {
        const text = await source(module);
        if (/work\?\.\s*plan|work\.plan|plan\?\.\s*enabled|plan\.enabled|"plan"\s*\]\s*\?\.\s*enabled/.test(text)) readers.push(module);
      }
      assert.deepEqual(
        readers,
        [GATE_VALIDATOR],
        `work.plan.enabled must be read only by its validator — found ${readers.join(", ") || "no reader at all"}`
      );

      // …and its documented default is OFF, asserted at the resolver rather than in a comment.
      const validator = await source(GATE_VALIDATOR);
      assert.match(validator, /export function planEnabledFromConfig/, "the gate's one resolver lives with its validator");
      assert.match(
        validator,
        /config\?\.work\?\.plan\?\.enabled === true/,
        "the gate resolves ON only for a literal true, so a mistyped gate can never read as on"
      );
    },
  },
];
