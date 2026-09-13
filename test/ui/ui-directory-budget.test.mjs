// milestone 49 / story 02 / task 03 — THE DIRECTORY RATCHET (@executable).
//
// Every scenario and every Examples ROW of
// `.../02_story_home-core/tasks/03_the-directory-budget-ratchet.feature`, driven against the
// SHIPPED `acd-ui-directory-budget` violations function, imported directly from its own suite.
//
// NO PLANT TOUCHES THE REAL TREE. No lane may `mkdir ui/src/<plant>` or write a file into
// `ui/src`: it races every other suite reading the same tree, and a crashed run leaves the plant
// behind so every subsequent run is red for the wrong reason. Every plant here is a SYNTHESIZED
// LISTING handed to the detector, and every one asserts it LANDED before the detector is asked.
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  UI_DIRECTORY_BUDGETS,
  UI_ROOT_BUDGET,
  readUiTreeListing,
  uiDirectoryBudget,
  uiDirectoryBudgetViolations,
} from "../arch/testing/acd-ui-directory-budget.test.mjs";
import { isUiSourceFile } from "../support/ui-source-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A synthesized listing: one directory holding `count` synthetic modules. */
const directoryOf = (name, count, extension = "mjs") => [
  { path: name, kind: "dir" },
  ...Array.from({ length: count }, (_unused, index) => ({ path: `${name}/module-${index}.${extension}`, kind: "file" })),
];
const entry = (directory, ceiling) => ({ directory, ceiling, allowance: 0, why: `synthesized table entry for ${directory}` });

// ── Scenario Outline: the per-directory ceiling fires on a count, and stays quiet under it ─
const CEILING_ROWS = [
  ["comfortably under", "terminal", 25, 32, 0],
  ["one under the ceiling", "terminal", 31, 32, 0],
  ["exactly at the ceiling", "terminal", 32, 32, 0],
  ["one over the ceiling", "terminal", 33, 32, 1],
  ["far over the ceiling", "terminal", 60, 32, 1],
  ["the new directory, at its own", "home", 8, 8, 0],
  ["the new directory, one over", "home", 9, 8, 1],
  ["an empty new directory", "panels", 0, null, 1],
  ["a directory that has emptied out", "lib", 0, 2, 1],
];

// ── Scenario Outline: a sweep that cannot see the tree FAILS ──────────────────────────────
const BLIND_SWEEPS = [
  ["the root was renamed", async () => readUiTreeListing("ui/srcX"), /could not read/],
  ["the root is empty", async () => uiDirectoryBudgetViolations([]), /EMPTY listing/],
  ["the listing is not an array", async () => uiDirectoryBudgetViolations(null), /not an array/],
  ["every directory vanished", async () => uiDirectoryBudgetViolations([{ path: "main.tsx", kind: "file" }]), /NO top-level directories/],
];

// ── Scenario Outline: what counts as a file is DECLARED ───────────────────────────────────
const PREDICATE_ROWS = [
  ["a logic module", "axis.mjs", 1],
  ["its type sibling", "axis.d.mts", 1],
  ["a component", "Grid.tsx", 1],
  ["a plain TypeScript module", "api.ts", 1],
  ["a stylesheet", "grid.css", 0],
  ["a fixture payload", "fixture.json", 0],
  ["a note", "README.md", 0],
  ["a mock", "s1-home.png", 0],
  ["a snapshot directory", "__snapshots__/", 0],
];

// ── Scenario Outline: a directory close to its ceiling is REPORTED without failing ────────
const HEADROOM_ROWS = [
  ["plenty of room", 15, 22, 0, false],
  ["just outside the warning band", 20, 22, 0, false],
  ["inside the warning band", 21, 22, 0, true],
  ["exactly at the ceiling", 22, 22, 0, true],
  ["over the ceiling", 23, 22, 1, null],
];

export const uiDirectoryBudgetTests = [
  // ══ Scenario: a ninth top-level directory FIRES the shipped detector
  {
    name: "49/02 task03 — a synthesized 9th top-level directory FIRES the shipped detector, and the clean listing in the same test returns none",
    run: async () => {
      const clean = await readUiTreeListing();
      const planted = [...clean, ...directoryOf("panels", 2, "tsx")];
      assert.notEqual(planted.length, clean.length, "the plant LANDED — the synthesized listing differs from the clean one");

      const violations = uiDirectoryBudgetViolations(planted);
      assert.ok(violations.length >= 1, "it returns at least one violation");
      const refusal = violations.find((violation) => violation.directory === "ui/src/panels/");
      assert.ok(refusal != null, `the violation names ui/src/panels/: ${JSON.stringify(violations)}`);
      assert.match(refusal.message, /is a DECISION and needs a table entry/, "its message says a new top-level directory is a DECISION and needs a table entry");
      assert.match(refusal.message, /not a diff/, "…not a diff");
      assert.deepEqual(uiDirectoryBudgetViolations(clean), [], "running the same detector over the CLEAN listing in the same test returns no violations");
    },
  },

  // ══ Scenario Outline: the per-directory ceiling fires on a count, and stays quiet under it
  ...CEILING_ROWS.map(([label, directory, files, ceiling, expected]) => ({
    name: `49/02 task03 — the per-directory ceiling: ${label} — ui/src/${directory}/ holds ${files} against a ceiling of ${ceiling ?? "(none)"} -> ${expected} violation(s)`,
    run: async () => {
      const table = ceiling == null ? [] : [entry(directory, ceiling)];
      const violations = uiDirectoryBudgetViolations(directoryOf(directory, files), table, null);
      assert.equal(violations.length, expected, `it returns ${expected} violation(s): ${JSON.stringify(violations)}`);
      if (expected > 0) {
        const [refusal] = violations;
        assert.equal(refusal.directory, `ui/src/${directory}/`, "the message names the directory");
        assert.match(refusal.message, new RegExp(`\\b${files}\\b`), "…the measured count");
        if (ceiling != null) assert.match(refusal.message, new RegExp(`\\b${ceiling}\\b`), "…and the ceiling");
      }
    },
  })),

  // ══ Scenario: the table and the tree must agree in both directions
  {
    name: "49/02 task03 — the table and the tree agree in BOTH directions, and the two plants (a REMOVED named directory, an ADDED unnamed one) are distinct and both fire",
    run: async () => {
      const clean = await readUiTreeListing();
      const { report } = uiDirectoryBudget(clean);
      const inTree = new Set(report.directories.map((row) => row.directory));

      for (const budget of UI_DIRECTORY_BUDGETS) {
        assert.ok(inTree.has(`ui/src/${budget.directory}/`), `every directory named in the table exists in the tree: ${budget.directory}`);
        assert.ok(Number.isInteger(budget.ceiling) && budget.ceiling > 0, "every entry's ceiling is a positive integer");
      }
      assert.ok(UI_DIRECTORY_BUDGETS.length > 0, "the table is non-empty");
      const named = new Set(UI_DIRECTORY_BUDGETS.map((budget) => `ui/src/${budget.directory}/`));
      for (const row of report.directories) {
        assert.ok(named.has(row.directory), `every top-level directory in the tree is named in the table: ${row.directory}`);
      }

      // PLANT 1 — a named directory REMOVED from the tree.
      const withoutLib = clean.filter((item) => item.path !== "lib" && !item.path.startsWith("lib/"));
      assert.notEqual(withoutLib.length, clean.length, "plant 1 LANDED");
      const removal = uiDirectoryBudgetViolations(withoutLib);
      assert.ok(removal.some((violation) => violation.directory === "ui/src/lib/" && /NOT in the tree/.test(violation.message)), `a listing that REMOVES a named directory fires: ${JSON.stringify(removal)}`);

      // PLANT 2 — an unnamed directory ADDED. A DISTINCT plant with a DISTINCT refusal.
      const withPanels = [...clean, ...directoryOf("panels", 1)];
      assert.notEqual(withPanels.length, clean.length, "plant 2 LANDED");
      const addition = uiDirectoryBudgetViolations(withPanels);
      assert.ok(addition.some((violation) => violation.directory === "ui/src/panels/" && /needs a table entry/.test(violation.message)), `a listing that ADDS an unnamed directory fires: ${JSON.stringify(addition)}`);
      assert.notDeepEqual(removal, addition, "the two plants are distinct");
      assert.deepEqual(uiDirectoryBudgetViolations(clean), [], "…and the clean listing is quiet");
    },
  },

  // ══ Scenario Outline: a sweep that cannot see the tree FAILS, and never passes quietly
  ...BLIND_SWEEPS.map(([label, invoke, expected]) => ({
    name: `49/02 task03 — a sweep that cannot see the tree FAILS, naming what it could not read: ${label}`,
    run: async () => {
      let returned = "the call did not throw";
      let thrown = null;
      try {
        returned = await invoke();
      } catch (error) {
        thrown = error;
      }
      assert.ok(thrown != null, `it fails rather than returning: ${JSON.stringify(returned)}`);
      assert.match(String(thrown.message), expected, "…naming what it could not read");
      assert.notDeepEqual(returned, [], "it does NOT return an empty violations array");
    },
  })),

  // ══ Scenario: the detector reports what it measured
  {
    name: "49/02 task03 — the detector REPORTS what it measured, so a green run is evidence rather than silence, and its own arithmetic closes",
    run: async () => {
      const { report } = uiDirectoryBudget(await readUiTreeListing());
      for (const row of report.directories) {
        assert.ok(typeof row.directory === "string", "the report names every top-level directory");
        assert.ok(Number.isInteger(row.measured), `…with its measured file count (${row.directory})`);
        assert.ok(Number.isInteger(row.ceiling), "…and its ceiling");
      }
      assert.ok(Number.isInteger(report.totalFiles), "the report carries a total file count for ui/src");
      assert.equal(report.totalFiles, report.directoryFiles + report.rootFiles, "that total equals the sum of the per-directory counts plus the root file count");

      // …and the counts it reports are the counts a PLAIN LISTING of those directories gives,
      // computed here independently of the detector's own walk.
      for (const name of ["app", "board", "components", "config", "fleet", "lib", "terminal"]) {
        let plain = 0;
        const walk = async (relative) => {
          for (const item of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
            if (item.isDirectory()) await walk(`${relative}/${item.name}`);
            else if (isUiSourceFile(item.name)) plain += 1;
          }
        };
        await walk(`ui/src/${name}`);
        const row = report.directories.find((candidate) => candidate.directory === `ui/src/${name}/`);
        assert.equal(row.measured, plain, `the count for ${name} is the count a plain listing gives`);
      }
    },
  },

  // ══ Scenario Outline: what counts as a file is DECLARED, and it is the shared predicate
  ...PREDICATE_ROWS.map(([label, file, counted]) => ({
    name: `49/02 task03 — what counts as a file is DECLARED: ${label} (${file}) -> ${counted}`,
    run: async () => {
      const listing = file.endsWith("/")
        ? [{ path: "probe", kind: "dir" }, { path: `probe/${file.slice(0, -1)}`, kind: "dir" }]
        : [{ path: "probe", kind: "dir" }, { path: `probe/${file}`, kind: "file" }];
      const { report } = uiDirectoryBudget(listing, [], null);
      const row = report.directories.find((candidate) => candidate.directory === "ui/src/probe/");
      assert.equal(row.measured, counted, "the count the detector reports for that directory");
    },
  })),

  {
    name: "49/02 task03 — the predicate is the SAME one acd-ui-surface-file-budget sweeps with: one declaration, imported by both, so the two gates can never disagree about what a file is",
    run: async () => {
      const { readFile } = await import("node:fs/promises");
      const perFile = await readFile(path.join(repoRoot, "test/arch/testing/acd-ui-surface-file-budget.test.mjs"), "utf8");
      assert.match(perFile, /from "(?:\.\.\/)+support\/ui-source-files\.mjs"/, "the per-FILE ratchet imports the shared predicate");
      assert.ok(!/\/\\\.\(tsx\?\|mts\|mjs\)\$\//.test(perFile), "…and no longer re-types it");
      const perDirectory = await readFile(path.join(repoRoot, "test/arch/testing/acd-ui-directory-budget.test.mjs"), "utf8");
      assert.match(perDirectory, /from "(?:\.\.\/)+support\/ui-source-files\.mjs"/, "the per-DIRECTORY ratchet imports the same one");

      // …and the reconciliation this predicate makes reproducible: 96 in directories + 2 root
      // modules = 98, where ARCHITECTURE §Codebase health quotes 99 by counting `index.css`.
      const { report } = uiDirectoryBudget(await readUiTreeListing());
      assert.equal(report.rootFiles, 2, "the two root modules — main.tsx and vite-env.d.ts");
      assert.equal(report.totalFiles, report.directoryFiles + report.rootFiles, "and the declared total is theirs");
    },
  },

  // ══ Scenario: the root of ui/src is budgeted too
  {
    name: "49/02 task03 — the ROOT of ui/src is budgeted too, so 'put it in the root' is not the way past the gate",
    run: async () => {
      const clean = await readUiTreeListing();
      const planted = [...clean, { path: "bootstrap.mjs", kind: "file" }];
      assert.notEqual(planted.length, clean.length, "the plant LANDED");

      const violations = uiDirectoryBudgetViolations(planted);
      assert.ok(violations.some((violation) => violation.directory === "ui/src" && /ROOT/.test(violation.message)), `it returns at least one violation naming the root: ${JSON.stringify(violations)}`);
      assert.deepEqual(uiDirectoryBudgetViolations(clean), [], "the clean listing — main.tsx and vite-env.d.ts — returns none");
      assert.equal(UI_ROOT_BUDGET.ceiling, 2, "…and the root's own ceiling is the delivered two");
    },
  },

  // ══ Scenario Outline: a directory close to its ceiling is REPORTED without failing
  ...HEADROOM_ROWS.map(([label, files, ceiling, expected, reported]) => ({
    name: `49/02 task03 — headroom is REPORTED without failing: ${label} — ${files} of ${ceiling}`,
    run: async () => {
      const { violations, report } = uiDirectoryBudget(directoryOf("fleet", files), [entry("fleet", ceiling)], null);
      assert.equal(violations.length, expected, expected === 0 ? "the violations array is empty" : "the violations array is non-empty");
      if (reported == null) return;
      const row = report.directories.find((candidate) => candidate.directory === "ui/src/fleet/");
      assert.equal(row.nearBudget, reported, `the report ${reported ? "reports" : "does not report"} it as being within 5% of its budget`);
      assert.ok(report.nearBudget.includes("ui/src/fleet/") === reported, "…and the summary lists it accordingly");
    },
  })),
];
