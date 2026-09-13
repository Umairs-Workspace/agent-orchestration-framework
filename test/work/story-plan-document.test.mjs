// Traceability wiring for milestone 96 / story 02 — the plan document.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-plan-carries-the-mechanism-and-the-check-and-no-paths.feature
//   tasks/01_its-length-is-the-existing-budget-familys-business.feature
//   tasks/02_off-by-default-and-the-builders-alone.feature
//
// The budget scenarios drive the REAL engine — `doctorWork`'s snapshot over a temp fixture repo,
// running ONLY `budgetGroup` — so "PLAN.md joins the family" is measured through the shipped
// snapshot→ctx→group path rather than by calling the group with a hand-built map. That path is
// where the wiring can actually be wrong: a budget key with nothing measuring the file is silent
// in exactly the way a healthy document is. 16/00's own fixture idiom, one kind wider.
//
// One test object per @executable scenario, Scenario-Outline rows folded into one entry iterating
// the rows. node:assert/strict, `{ name, run }` shape.
//
// The scenarios this file does not drive are the three that are properties of the TREE rather than
// of a behaviour — the budget number living only in the defaults, the doc-budget vocabulary being
// unchanged by this milestone, and the gate having no reader in `src/` outside its validator.
// Those are FF-9603's, in test/arch/planning/acd-plan-restates-no-declared-path.test.mjs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { restatementViolations } from "../support/plan-restatement-ban.mjs";
import { loadWorkspace, parseFrontmatter } from "../../src/work.mjs";
import { budgetsFromConfig, doctorWork } from "../../src/work/doctor.mjs";
import { budgetGroup, PLAN_BASENAME } from "../../src/work/doctor-budget.mjs";
import { planEnabledFromConfig, validateConfig } from "../../src/config-inspect.mjs";
import { loadBundle, renderBundleOutputs } from "../../src/work/bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const TEMPLATE = path.join(repoRoot, "src", "bundle", "templates", "story", "PLAN.md");
const TEMPLATE_INSTALL_PATH = ".aof/templates/work/story/PLAN.md";
const WORK_DIR = path.join(repoRoot, "wiki", "work");

const read = (rel) => readFile(path.join(repoRoot, rel), "utf8");

// The template AS INSTALLED — the artifact an author copies, which the bundle render produces and
// the manifest catalogues. It is NOT the same bytes as the source: the render prepends its own
// generated marker, and that difference is the whole subject of the marker scenario below.
function renderedTemplate() {
  const outputs = renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex"] });
  const output = outputs.find((entry) => String(entry.path).replaceAll("\\", "/") === TEMPLATE_INSTALL_PATH);
  assert.ok(output, `the bundle renders no template at ${TEMPLATE_INSTALL_PATH}`);
  return output.content;
}

// ── fixtures ─────────────────────────────────────────────────────────────────

// Text whose splitLines count is EXACTLY n — 16/00's convention: n joined lines plus a terminating
// newline, whose trailing empty element the counter drops.
const linesText = (n) => (n <= 0 ? "" : Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n") + "\n");

async function makeRepo(work = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-brief-doc-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work", ...work } }, null, 2),
    "utf8"
  );
  return { repo, workDir };
}

// A milestone with one story under it, the story optionally carrying a PLAN.md of an exact length.
// `planLines: null` means the story carries NO plan document at all, which is a different fixture
// from one carrying an empty file — the "silent, not short" case turns on exactly that difference.
async function storyWithPlan(workDir, { planLines = null, storyLines = 10 } = {}) {
  const milestone = path.join(workDir, "96_milestone_m96");
  await mkdir(milestone, { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), linesText(10), "utf8");
  const story = path.join(milestone, "stories", "02_story_s02");
  await mkdir(story, { recursive: true });
  await writeFile(path.join(story, "STORY.md"), linesText(storyLines), "utf8");
  if (planLines != null) await writeFile(path.join(story, PLAN_BASENAME), linesText(planLines), "utf8");
  return { milestone, story };
}

// Run ONLY the budget group, so each assertion isolates doc-bloat from every other check-group.
async function runBudget(repo, workDir, { scope, acceptingRef } = {}) {
  const { config } = await loadWorkspace(repo);
  return doctorWork(workDir, config, scope, { groups: [budgetGroup], ...(acceptingRef ? { acceptingRef } : {}) });
}

const planFindings = (findings) =>
  findings.filter((f) => f.code === "doc-over-budget" && (f.path.endsWith(path.sep + PLAN_BASENAME) || f.path.endsWith("/" + PLAN_BASENAME)));

const withRepo = (work, body) => async () => {
  const { repo, workDir } = await makeRepo(work);
  try {
    await body({ repo, workDir });
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
};

// A project root carrying only a config — enough for `validateConfig` to resolve and validate it.
const withConfig = (config, body) => async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-brief-gate-"));
  try {
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", ...config }, null, 2), "utf8");
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

// Every PLAN.md in the work stream. The ban is a property of the TREE, so the sweep is a real
// directory walk rather than a fixed list — a plan added tomorrow is covered without an edit here.
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
    else if (entry.name === PLAN_BASENAME) found.push(full);
  }
  return found;
}

// ── the restatement-ban Examples, as documents ───────────────────────────────
// One fixture per row of task 00's outline. Each is the SHAPE the row names and nothing else, so a
// row that flips tells you which shape moved.
const BAN_ROWS = [
  {
    content: "a `files:` key",
    outcome: "refused",
    text: "# 96 · a plan\n\n## Mechanism\n\nfiles:\n  - src/work/doctor.mjs\n",
  },
  {
    content: "a `reads:` key",
    outcome: "refused",
    text: "# 96 · a plan\n\n## Mechanism\n\nreads:\n  - src/work/doctor.mjs\n",
  },
  {
    content: "a markdown table whose header names a file column",
    outcome: "refused",
    text: "# 96 · a plan\n\n## Mechanism\n\n| File | What changes |\n| --- | --- |\n| the budget map | one row |\n",
  },
  {
    content: "a bullet list of paths under a source root",
    outcome: "refused",
    text: "# 96 · a plan\n\n## Mechanism\n\n- src/work/doctor.mjs — the defaults\n- src/config-inspect.mjs — the gate\n",
  },
  {
    content: "a single inline reference to one module inside a sentence about the seam",
    outcome: "admitted",
    text: "# 96 · a plan\n\n## Mechanism\n\nThe change hangs off the budget group in src/work/doctor-budget.mjs, which already\nresolves a filename to a kind; the new kind rides that resolution rather than a check of its own.\n",
  },
  {
    content: "a reference to the story's own frontmatter as the file table",
    outcome: "admitted",
    text: "# 96 · a plan\n\n## Mechanism\n\nThe file table is the story record's own frontmatter and is not restated here; read the\ndeclared write set there before starting.\n",
  },
];

export const storyPlanDocumentTests = [
  // ═════ 00_the-plan-carries-the-mechanism-and-the-check-and-no-paths.feature ═════
  {
    name: "96/02-00 the shipped story plan template carries the mechanism, the verification step and what is out of scope — and no file table",
    async run() {
      const text = await readFile(TEMPLATE, "utf8");

      // The two the frontmatter cannot express, plus the third the vendor guidance names.
      for (const heading of ["## Mechanism", "## Verification step", "## Out of scope"]) {
        assert.ok(text.includes(heading), `the template is missing ${heading}`);
      }

      // …and no fourth carrying the file table, in any of the shapes it wears.
      assert.deepEqual(
        restatementViolations(text),
        [],
        "the shipped template must restate no declared path"
      );
    },
  },
  {
    name: "96/02-00 the restatement ban, driven over the shapes a table wears (Examples: four spellings of one second list, and two that are not one)",
    async run() {
      for (const row of BAN_ROWS) {
        const violations = restatementViolations(row.text);
        const outcome = violations.length > 0 ? "refused" : "admitted";
        assert.equal(
          outcome,
          row.outcome,
          `${row.content} → expected ${row.outcome}, got ${outcome} (${violations.map((v) => v.rule).join(", ") || "no violations"})`
        );
      }
    },
  },
  {
    name: "96/02-00 the ban is a property of the stream, not of one file — every PLAN.md in the work tree is admitted",
    async run() {
      const plans = await streamPlans(WORK_DIR);
      for (const plan of plans) {
        const violations = restatementViolations(await readFile(plan, "utf8"));
        assert.deepEqual(
          violations,
          [],
          `${path.relative(repoRoot, plan)} restates a declared path: ${violations.map((v) => `${v.rule} @${v.line} (${v.evidence})`).join("; ")}`
        );
      }
      // The sweep itself is the assertion; an empty stream passes it vacuously today and stops
      // doing so the moment a project turns the gate on. Recorded rather than asserted-away.
      assert.ok(Array.isArray(plans));
    },
  },
  {
    name: "96/02-00 the template's generated marker does not break frontmatter parsing — the parse succeeds, and no marker precedes a frontmatter block",
    async run() {
      // F-73-G: a leading `<!-- aof-generated -->` comment placed BEFORE a frontmatter block breaks
      // the parse SILENTLY — the reader requires the block at byte zero, so it returns {} and every
      // declared fact vanishes with no error. The bundle render PREPENDS exactly that marker to
      // every member, so the SHIPPED source and the INSTALLED render are two different documents
      // here and BOTH are checked: asserting only the source would pass while the artifact an
      // author actually copies carried the trap.
      const shipped = await readFile(TEMPLATE, "utf8");
      const installed = renderedTemplate();

      for (const [label, text] of [["the shipped template", shipped], ["the installed template", installed]]) {
        assert.doesNotThrow(() => parseFrontmatter(text), `${label} must parse`);

        const block = text.match(/^---\r?\n[\s\S]*?\r?\n---/);
        if (block) {
          const comment = text.indexOf("<!--");
          assert.ok(
            comment === -1 || comment > block[0].length - 1,
            `${label}: a marker comment must appear AFTER the frontmatter block, never before it`
          );
        }
      }

      // …and the trap is closed at the source rather than by placement: the template carries no
      // frontmatter block at all, so there is nothing a prepended marker can silently break.
      assert.equal(shipped.match(/^---\r?\n/), null, "the template deliberately carries no frontmatter");
      assert.deepEqual(parseFrontmatter(installed), {}, "the installed template declares nothing to lose");
    },
  },
  {
    name: "96/02-00 the story plan template is a declared member of the installed bundle, at its declared path and matching the shipped source",
    async run() {
      const manifest = JSON.parse(await read(path.join("src", "bundle", "manifest.json")));
      const entry = manifest.entries.find((row) => row.path === TEMPLATE_INSTALL_PATH);
      assert.ok(entry, `the bundle manifest declares no entry at ${TEMPLATE_INSTALL_PATH}`);
      assert.equal(entry.resource.kind, "template");
      assert.equal(entry.resource.id, "story");

      // The manifest catalogues the RENDER, so the match is asserted against it — and the render is
      // then required to carry the shipped source verbatim, which is the half that would otherwise
      // go unchecked (a manifest agrees with a render that dropped the body just as happily).
      const installed = renderedTemplate();
      const hash = "sha256:" + createHash("sha256").update(installed, "utf8").digest("hex");
      assert.equal(entry.hash, hash, "the manifest entry must hash the rendered template");
      assert.ok(
        installed.endsWith(await readFile(TEMPLATE, "utf8")),
        "the installed template must carry the shipped source template verbatim"
      );
    },
  },

  // ═════ 01_its-length-is-the-existing-budget-familys-business.feature ═════
  {
    name: "96/02-01 an over-long plan fires the existing doc-over-budget finding at warn, naming the measured lines and the budget",
    run: withRepo({}, async ({ repo, workDir }) => {
      await storyWithPlan(workDir, { planLines: 81 });
      const findings = planFindings(await runBudget(repo, workDir));

      assert.equal(findings.length, 1, "exactly one finding for the over-budget plan");
      assert.equal(findings[0].code, "doc-over-budget");
      assert.equal(findings[0].severity, "warn");
      assert.match(findings[0].message, /81/);
      assert.match(findings[0].message, /80/);
    }),
  },
  {
    name: "96/02-01 a plan at its budget is healthy (the family's strictly-greater convention)",
    run: withRepo({}, async ({ repo, workDir }) => {
      await storyWithPlan(workDir, { planLines: 80 });
      assert.deepEqual(planFindings(await runBudget(repo, workDir)), []);
    }),
  },
  {
    name: "96/02-01 an over-long plan refuses acceptance in the accepting item's scoped preflight, and the same finding on a stream sweep does not",
    run: withRepo({}, async ({ repo, workDir }) => {
      await storyWithPlan(workDir, { planLines: 120 });

      // The accepting item's own scoped preflight — the ref injected by the status door.
      const preflight = planFindings(await runBudget(repo, workDir, { scope: "96/02", acceptingRef: "96/02" }));
      assert.equal(preflight.length, 1);
      assert.equal(preflight[0].severity, "error", "the accepting item's preflight refuses");

      // …and the very same document on a stream sweep is a warning, never a refusal.
      const sweep = planFindings(await runBudget(repo, workDir));
      assert.equal(sweep.length, 1);
      assert.equal(sweep[0].severity, "warn");
    }),
  },
  {
    name: "96/02-01 the plan budget resolves from config over the documented default (Examples: the family's own robustness, applied to a new key)",
    async run() {
      const documentedDefault = budgetsFromConfig({}).plan;
      assert.equal(documentedDefault, 80, "the documented default is 80 lines");

      const rows = [
        { configured: "absent", raw: undefined, resolved: documentedDefault },
        { configured: "120", raw: 120, resolved: 120 },
        { configured: "zero", raw: 0, resolved: documentedDefault },
        { configured: "a negative number", raw: -5, resolved: documentedDefault },
        { configured: "a string", raw: "sixty", resolved: documentedDefault },
        { configured: "null", raw: null, resolved: documentedDefault },
      ];

      for (const row of rows) {
        const budgets = row.raw === undefined
          ? budgetsFromConfig({ work: { doctor: { budgets: {} } } })
          : budgetsFromConfig({ work: { doctor: { budgets: { plan: row.raw } } } });
        assert.equal(budgets.plan, row.resolved, `work.doctor.budgets.plan = ${row.configured}`);
      }
    },
  },
  {
    name: "96/02-01 a partially-set budgets object sets only the plan and leaves every other kind on its documented default",
    async run() {
      const defaults = budgetsFromConfig({});
      const resolved = budgetsFromConfig({ work: { doctor: { budgets: { plan: 42 } } } });

      assert.equal(resolved.plan, 42);
      for (const kind of Object.keys(defaults)) {
        if (kind === "plan") continue;
        assert.equal(resolved[kind], defaults[kind], `${kind} must stay on its documented default`);
      }
    },
  },
  {
    name: "96/02-01 a story with no plan document is silent, not short",
    run: withRepo({}, async ({ repo, workDir }) => {
      await storyWithPlan(workDir, { planLines: null });
      assert.deepEqual(
        planFindings(await runBudget(repo, workDir)),
        [],
        "an absent plan must record no size at all, never a zero-length one"
      );
    }),
  },

  // ═════ 02_off-by-default-and-the-builders-alone.feature ═════
  {
    name: "96/02-02 the config gate is off unless a project turns it on, and a non-boolean is both off and diagnosed (Examples: a boolean with a documented default and a validated shape)",
    async run() {
      const rows = [
        { configured: "absent", config: {}, resolved: false, diagnosed: false },
        { configured: "false", config: { work: { plan: { enabled: false } } }, resolved: false, diagnosed: false },
        { configured: "true", config: { work: { plan: { enabled: true } } }, resolved: true, diagnosed: false },
        { configured: "a string", config: { work: { plan: { enabled: "yes" } } }, resolved: false, diagnosed: true },
        { configured: "a number", config: { work: { plan: { enabled: 1 } } }, resolved: false, diagnosed: true },
        { configured: "null", config: { work: { plan: { enabled: null } } }, resolved: false, diagnosed: true },
      ];

      for (const row of rows) {
        assert.equal(planEnabledFromConfig(row.config), row.resolved, `work.plan.enabled = ${row.configured} resolves`);

        await withConfig(row.config, async (root) => {
          const diagnostics = await validateConfig(root);
          const named = diagnostics.filter((d) => d.path === "work.plan.enabled");
          if (row.diagnosed) {
            assert.equal(named.length, 1, `work.plan.enabled = ${row.configured} must raise a diagnostic naming it`);
            assert.equal(named[0].severity, "error");
          } else {
            assert.deepEqual(named, [], `work.plan.enabled = ${row.configured} must raise no diagnostic`);
          }
        })();
      }
    },
  },
  {
    name: "96/02-02 the developer's brief names the plan as an input, states it is advisory, and states that a plan found wrong is reported and the build continues",
    async run() {
      const brief = await read(path.join("src", "bundle", "agents", "aof-developer.md"));

      assert.match(brief, /PLAN\.md/, "the developer's brief must name the plan document");
      assert.match(brief, /advisory/i, "the developer's brief must state that the plan is advisory");
      assert.match(
        brief,
        /A plan you find wrong is reported and the build\s+continues/i,
        "the developer's brief must state that a plan found wrong is reported and the build continues"
      );
      assert.match(brief, /the task `\.feature` scenarios are the contract/i);
    },
  },
  {
    name: "96/02-02 the reviewer briefs do not instruct their role to read a plan document (Examples: the two review lanes the read contract made cheap)",
    async run() {
      for (const role of ["qa", "architect"]) {
        const brief = await read(path.join("src", "bundle", "agents", `aof-${role}.md`));
        assert.doesNotMatch(
          brief,
          /PLAN\.md/,
          `the ${role} brief must not name the plan document — the whole win of the read contract was stopping agents ingesting prose`
        );
      }
    },
  },
  {
    name: "96/02-02 a deviation from the plan is not a finding, and the task feature is the contract",
    async run() {
      for (const role of ["qa", "architect"]) {
        const brief = await read(path.join("src", "bundle", "agents", `aof-${role}.md`));
        assert.match(
          brief,
          /A deviation from the story's build plan is not a finding/,
          `the ${role} findings guidance must state that a deviation from the plan is not a finding`
        );
        assert.match(
          brief,
          /The task `\.feature` scenarios are the\s+contract/,
          `the ${role} findings guidance must state that the task feature is the contract`
        );
      }
    },
  },
  {
    name: "96/02-02 with the gate off, refine authors no plan and no finding reports its absence",
    run: withRepo({}, async ({ repo, workDir }) => {
      // Half one — the authoring instruction is CONDITIONAL on the gate, and the gate is off by
      // default. A refine brief that authored the document unconditionally would spend the budget
      // before story 00's measurement exists to justify it.
      const refine = await read(path.join("src", "bundle", "commands", "refine.md"));
      assert.match(refine, /work\.plan\.enabled/, "the refine brief must read the gate");
      assert.match(
        refine,
        /ONLY when the project has turned it on/i,
        "the refine brief must gate authoring on the flag"
      );
      assert.match(
        refine,
        /when it is absent or false you author \*\*no\s+plan document at all\*\*/i,
        "the refine brief must say that an absent or false gate authors nothing"
      );
      assert.equal(planEnabledFromConfig({}), false, "the gate is off by default");

      // Half two — and the absence is silent everywhere. No lane reports a missing plan.
      await storyWithPlan(workDir, { planLines: null });
      const { config } = await loadWorkspace(repo);
      const findings = await doctorWork(workDir, config, undefined, {});
      assert.deepEqual(
        findings.filter((f) => /plan/i.test(f.path) || /\bplan\b/i.test(f.message)),
        [],
        "no finding may report a plan document's absence"
      );
    }),
  },
];
