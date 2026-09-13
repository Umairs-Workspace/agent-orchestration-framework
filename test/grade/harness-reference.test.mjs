// Behavioural evidence for milestone 77 / story 03 — the reference corpus.
//
//   tasks/00_the-reference-corpus-is-sourced-dated-and-travels.feature
//
// The structural rows of that feature — the corpus importing nothing, the second meaning of
// `baseline` planted, and the story's three finding codes — are the control's, and live in
// `test/arch/grade/acd-reference-corpus-offline-and-sourced.test.mjs`.
//
// THE CORPUS IS DRIVEN AS DATA AND AS A MODULE, because those are two different claims. Its ROWS
// are checked here against the same validator every fixture is checked against, so "the shipped
// corpus is admissible" is the same sentence as "this synthetic row is refused" and not a
// hand-written parallel assertion. And its REACHABILITY is driven by actually changing the working
// directory and loading it again: a corpus that needed somebody's root would be the one rule in
// this milestone that could not travel, and no amount of reading the source proves it does.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  VIEW_REL,
  exitCodeFor,
  reachSource,
  refreshRows,
  renderReport,
  renderView,
  spliceCorpusModule,
} from "../../scripts/refresh-harness-reference.mjs";
import {
  HARNESS_REFERENCE_ROWS,
  REFERENCE_ROW_FIELDS,
  REFERENCE_ROW_FLOOR,
  checkReferenceCorpus,
  parseCheckedDate,
  referenceBounds,
  referenceCorpusProblems,
} from "../../src/harness-reference.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS_REL = "src/harness-reference.mjs";
const corpusUrl = pathToFileURL(path.join(repoRoot, CORPUS_REL)).href;

// A row that passes, as the base every refusal is driven from — so each row below differs from an
// admitted one in exactly the one field it is about.
const GOOD = Object.freeze({
  id: "some-system-step-ceiling",
  bound: "agent step ceiling (steps)",
  value: 12,
  system: "Some System",
  source: "https://example.invalid/docs/agents",
  checked: "2026-01-02",
});
const row = (over) => ({ ...GOOD, ...over });
const without = (key) => {
  const copy = { ...GOOD };
  delete copy[key];
  return copy;
};

const problemsFor = (rows) => referenceCorpusProblems(rows).join(" | ");

export const harnessReferenceTests = [
  // ── THE SHIPPED CORPUS ─────────────────────────────────────────────────────────────────────
  {
    name: "harness-reference: every shipped row says what it measures, where it came from and when it was checked",
    run() {
      assert.equal(HARNESS_REFERENCE_ROWS.length >= REFERENCE_ROW_FLOOR, true, "the corpus is non-vacuous");
      for (const shipped of HARNESS_REFERENCE_ROWS) {
        for (const field of REFERENCE_ROW_FIELDS) {
          assert.equal(Object.hasOwn(shipped, field), true, `${shipped.id} carries \`${field}\``);
        }
        assert.deepEqual(Object.keys(shipped).sort(), [...REFERENCE_ROW_FIELDS].sort(), `${shipped.id} carries the six fields and no seventh`);
        assert.match(shipped.source, /^https?:\/\/\S+$/u, `${shipped.id}'s source is a non-empty URL`);
        assert.notEqual(parseCheckedDate(shipped.checked), null, `${shipped.id}'s checked date parses as a date`);
        assert.equal(typeof shipped.value, "number", `${shipped.id} carries a value to compare`);
        assert.equal(shipped.system.length > 0, true, `${shipped.id} names the system that ships it`);
      }
      const check = checkReferenceCorpus();
      assert.deepEqual(check.problems, [], `the shipped corpus is admitted: ${check.problems.join("; ")}`);
      assert.equal(check.admitted, true, "…and says so");
      assert.equal(check.count, HARNESS_REFERENCE_ROWS.length, "…and reports how many rows it read");
    },
  },
  {
    name: "harness-reference: a row that cannot be checked is refused, naming that row and the field, and a row that can is admitted",
    run() {
      const rows = [
        [[row({})], null, "a row carrying all six fields, a URL and a parseable date"],
        [[row({ source: "" })], /some-system-step-ceiling[\s\S]*source/u, "a row whose source is an empty string"],
        [[without("source")], /some-system-step-ceiling[\s\S]*source/u, "a row carrying no source field at all"],
        [[row({ source: "docs" })], /some-system-step-ceiling[\s\S]*source/u, "a row whose source is a bare word and not a URL"],
        [[row({ checked: "" })], /some-system-step-ceiling[\s\S]*checked date/u, "a row whose checked date is an empty string"],
        [[row({ checked: "one tuesday" })], /some-system-step-ceiling[\s\S]*checked date/u, "a row whose checked date does not parse"],
        [[without("checked")], /some-system-step-ceiling[\s\S]*checked date/u, "a row carrying no checked field at all"],
        [[without("system")], /some-system-step-ceiling[\s\S]*system/u, "a row carrying no system"],
        [[without("value")], /some-system-step-ceiling[\s\S]*value/u, "a row carrying no value"],
      ];
      for (const [rows_, expected, what] of rows) {
        const problems = problemsFor(rows_);
        if (expected == null) {
          assert.deepEqual(referenceCorpusProblems(rows_), [], `${what} admits the corpus`);
          continue;
        }
        assert.match(problems, expected, `${what} is refused, naming that row's id and the field`);
      }
    },
  },
  {
    name: "harness-reference: a date that is well-formed but not a real day does not parse",
    run() {
      // `new Date("2026-02-31")` is not an error in JavaScript, so the round-trip is what decides.
      assert.equal(parseCheckedDate("2026-02-31"), null, "the 31st of February is not a date");
      assert.equal(parseCheckedDate("2026-9-3"), null, "an unpadded date is not the admitted form");
      assert.notEqual(parseCheckedDate("2026-09-03"), null, "an ISO calendar date is");
    },
  },
  {
    name: "harness-reference: an id names exactly one row, so a finding that cites one cites one thing",
    run() {
      assert.deepEqual(
        referenceCorpusProblems([row({ id: "a" }), row({ id: "b" })]),
        [],
        "every row carrying a distinct id admits the corpus",
      );
      const problems = problemsFor([row({ id: "same" }), row({ id: "same" })]);
      assert.match(problems, /"same" names two rows/u, "two rows carrying one id is refused, naming the id the two share");
    },
  },
  {
    name: "harness-reference: a caller holding the corpus cannot invent a reference",
    run() {
      const shipped = JSON.stringify(HARNESS_REFERENCE_ROWS);
      const count = HARNESS_REFERENCE_ROWS.length;
      const mutations = [
        ["append a row", () => { HARNESS_REFERENCE_ROWS.push(row({ id: "invented" })); }],
        ["replace a row in place", () => { HARNESS_REFERENCE_ROWS[0] = row({ id: "invented" }); }],
        ["delete a row", () => { HARNESS_REFERENCE_ROWS.length = 0; }],
        ["change one field of one row", () => { HARNESS_REFERENCE_ROWS[0].value = 99999; }],
      ];
      for (const [what, mutate] of mutations) {
        try {
          mutate();
        } catch {
          // A frozen array under module strict mode THROWS rather than failing quietly, which is
          // the louder of the two acceptable answers. Either way the corpus below is unchanged.
        }
        assert.equal(HARNESS_REFERENCE_ROWS.length, count, `after an attempt to ${what}, the row count is unchanged`);
        assert.equal(JSON.stringify(HARNESS_REFERENCE_ROWS), shipped, `…and no row's source, value or checked date differs from the shipped one`);
      }
    },
  },
  {
    name: "harness-reference: the floor is asserted, so an emptied corpus cannot pass while looking clean",
    run() {
      assert.match(problemsFor([]), /read 0 row\(s\) of a required 1/u, "no rows at all is refused, saying the corpus read nothing");
      assert.deepEqual(referenceCorpusProblems([row({})]), [], "one row admits it");
      const shipped = checkReferenceCorpus();
      assert.equal(shipped.admitted, true, "the shipped set admits it");
      assert.equal(shipped.count, HARNESS_REFERENCE_ROWS.length, "…and reports how many rows it read");
      assert.equal(shipped.floor > 0, true, "…against a floor greater than zero");
    },
  },
  {
    name: "harness-reference: the bounds it carries are the rows' own, in the order they are declared",
    run() {
      const bounds = referenceBounds();
      assert.equal(bounds.length > 0, true, "the corpus carries at least one bound");
      for (const bound of bounds) {
        assert.equal(HARNESS_REFERENCE_ROWS.some((shipped) => shipped.bound === bound), true, `${bound} is a bound some row declares`);
      }
      assert.equal(new Set(bounds).size, bounds.length, "and each is listed once");
    },
  },

  // ── IT TRAVELS: MODULE RESOLUTION, NOT SOMEBODY'S ROOT ─────────────────────────────────────
  {
    name: "harness-reference: the corpus is reached from any working directory, and needs neither root",
    async run() {
      const shipped = JSON.stringify(HARNESS_REFERENCE_ROWS);
      const notACheckout = mkdtempSync(path.join(os.tmpdir(), "aof-ref-plain-"));
      const governed = mkdtempSync(path.join(os.tmpdir(), "aof-ref-governed-"));
      mkdirSync(path.join(governed, ".aof"), { recursive: true });
      writeFileSync(path.join(governed, ".aof", "aof.config.json"), JSON.stringify({ name: "governed" }));
      const empty = mkdtempSync(path.join(os.tmpdir(), "aof-ref-empty-"));
      const previous = process.cwd();
      try {
        const directories = [
          [repoRoot, "the repository root of this checkout"],
          [notACheckout, "a directory that is not an aof checkout at all"],
          [governed, "a governed project carrying its own .aof and no aof source tree"],
          [empty, "an empty directory"],
        ];
        for (const [directory, what] of directories) {
          process.chdir(directory);
          // A FRESH instantiation per directory: a cached module could not tell us anything about
          // where it was loaded from.
          const loaded = await import(`${corpusUrl}?from=${encodeURIComponent(what)}`);
          assert.equal(JSON.stringify(loaded.HARNESS_REFERENCE_ROWS), shipped, `from ${what}, the rows are the rows it ships, in the order it ships them`);
        }
      } finally {
        process.chdir(previous);
        for (const directory of [notACheckout, governed, empty]) rmSync(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "harness-reference: two governed projects sharing one payload read one corpus, and neither changed a row",
    async run() {
      const shipped = JSON.stringify(HARNESS_REFERENCE_ROWS);
      const projects = [0, 1].map(() => mkdtempSync(path.join(os.tmpdir(), "aof-ref-project-")));
      const previous = process.cwd();
      try {
        for (const [index, project] of projects.entries()) {
          mkdirSync(path.join(project, "src"), { recursive: true });
          // A DECOY the project owns, named exactly as the payload's corpus is. If the corpus were
          // reached by joining a path onto the audited project's root, this is what would be read.
          writeFileSync(
            path.join(project, "src", "harness-reference.mjs"),
            `export const HARNESS_REFERENCE_ROWS = Object.freeze([{ id: "project-${index}-invented" }]);\n`,
          );
          process.chdir(project);
          const loaded = await import(`${corpusUrl}?project=${index}`);
          assert.equal(JSON.stringify(loaded.HARNESS_REFERENCE_ROWS), shipped, `project ${index} read the payload's rows`);
          assert.equal(
            loaded.HARNESS_REFERENCE_ROWS.some((entry) => String(entry.id).includes("invented")),
            false,
            `project ${index}'s own file changed no row`,
          );
        }
      } finally {
        process.chdir(previous);
        for (const project of projects) rmSync(project, { recursive: true, force: true });
      }
    },
  },

  // ── THE HAND-RUN REFRESH, AND THE GENERATED VIEW (task 02) ─────────────────────────────────
  //
  // The refresh's decision logic is driven over an INJECTED probe, so every row below is a real
  // answer to "what does it do when the source answers / does not / says something else" with no
  // network anywhere near it. The one leg that dereferences an address is driven through
  // `reachSource` with an address that cannot be parsed, which never reaches a fetch.
  {
    name: "harness-reference/refresh: it re-verifies each row against its source and stamps the date it did so",
    async run() {
      const rows = [
        { ...GOOD, id: "first", checked: "2024-01-01" },
        { ...GOOD, id: "second", value: 30, checked: "2024-01-01" },
      ];
      const now = Date.parse("2026-06-01T00:00:00.000Z");
      const { rows: next, report } = await refreshRows({ rows, probe: async () => ({ reachable: true }), now });
      for (const [at, refreshed] of next.entries()) {
        assert.equal(refreshed.checked, "2026-06-01", `${refreshed.id}'s checked date is the date the refresh ran`);
        assert.equal(refreshed.value, rows[at].value, `${refreshed.id}'s value is unchanged, no new one having been supplied`);
        assert.deepEqual(Object.keys(refreshed).sort(), [...REFERENCE_ROW_FIELDS].sort(), `${refreshed.id} still carries all six fields, and no seventh`);
      }
      assert.equal(report.checked, 2, "and it says how many rows it checked");

      // AND THE MODULE ON DISK CARRIES THOSE ROWS — spliced between the markers, re-imported.
      const source = await readFile(path.join(repoRoot, CORPUS_REL), "utf8");
      const home = mkdtempSync(path.join(os.tmpdir(), "aof-ref-splice-"));
      try {
        const target = path.join(home, "harness-reference.mjs");
        writeFileSync(target, spliceCorpusModule(source, next));
        const loaded = await import(pathToFileURL(target).href);
        assert.deepEqual(
          loaded.HARNESS_REFERENCE_ROWS.map((entry) => ({ ...entry })),
          next.map((entry) => ({ ...entry })),
          "the corpus module on disk carries those rows",
        );
        assert.match(spliceCorpusModule(source, next), /WHY THIS IS DATA AND NOT A RESEARCH TASK/u, "and the module's reasoning survived the splice");
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "harness-reference/refresh: what it decides alone, and what it hands back rather than rewriting",
    async run() {
      const now = Date.parse("2026-06-01T00:00:00.000Z");
      const base = { ...GOOD, id: "subject", value: 12, checked: "2024-01-01" };
      const cases = [
        [{ reachable: true }, {}, { drifted: 0, unreachable: 0, checked: "2026-06-01", value: 12 }, "answers, no new value"],
        [{ reachable: true }, { subject: 12 }, { drifted: 0, unreachable: 0, checked: "2026-06-01", value: 12 }, "answers, the value the row already carries"],
        [{ reachable: true }, { subject: 20 }, { drifted: 1, unreachable: 0, checked: "2026-06-01", value: 20 }, "answers, a value differing from the row's"],
        [{ reachable: false }, {}, { drifted: 0, unreachable: 1, checked: "2024-01-01", value: 12 }, "does not answer"],
      ];
      for (const [probe, values, expected, what] of cases) {
        const { rows, report } = await refreshRows({ rows: [base], probe: async () => probe, values, now });
        assert.equal(report.drifted.length, expected.drifted, `${what}: ${expected.drifted} drift(s) reported`);
        assert.equal(report.unreachable.length, expected.unreachable, `${what}: ${expected.unreachable} unreachable`);
        assert.equal(rows[0].checked, expected.checked, `${what}: the checked date is ${expected.checked}`);
        assert.equal(rows[0].value, expected.value, `${what}: the recorded value is ${expected.value}`);
        if (expected.drifted > 0) {
          assert.equal(report.drifted[0].carried, 12, "…and the report carries the value it carried");
          assert.equal(report.drifted[0].recorded, 20, "…and the value now recorded");
        }
      }

      // "names no resolvable address" — decided before anything is dereferenced.
      const unresolvable = await reachSource({ ...base, source: "not-an-address" }, { fetchImpl: () => { throw new Error("the refresh must not reach a fetch for an unparseable address"); } });
      assert.equal(unresolvable.reachable, false, "a source naming no resolvable address is not reached");
      assert.match(unresolvable.why, /no resolvable address/u, "…and says so");
      const { rows: unmoved } = await refreshRows({ rows: [base], probe: async () => unresolvable, now });
      assert.equal(unmoved[0].checked, "2024-01-01", "…and its checked date is unmoved");
    },
  },
  {
    name: "harness-reference/refresh: it names every row it could not confirm, and a reader can tell a drift from an unreachable",
    async run() {
      const now = Date.parse("2026-06-01T00:00:00.000Z");
      const rows = [
        { ...GOOD, id: "steady-one" },
        { ...GOOD, id: "drifted-one", value: 12 },
        { ...GOOD, id: "unreachable-one" },
        { ...GOOD, id: "steady-two" },
      ];
      const { report } = await refreshRows({
        rows,
        probe: async (row) => ({ reachable: row.id !== "unreachable-one" }),
        values: { "drifted-one": 40 },
        now,
      });
      const rendered = renderReport(report);
      assert.match(rendered, /checked 4 row\(s\)/u, "the report says how many rows it checked");
      assert.match(rendered, /DRIFTED\s+drifted-one/u, "it names the drifted row");
      assert.match(rendered, /UNREACHABLE\s+unreachable-one/u, "…and the unreachable one, distinguishably");
      assert.equal(rendered.includes("steady-one"), false, "…and neither of the other two");
      assert.equal(rendered.includes("steady-two"), false, "…neither of them");
      assert.equal(exitCodeFor(report), 1, "and it exits saying so");
      const { report: allConfirmed } = await refreshRows({ rows, probe: async () => ({ reachable: true }), now });
      assert.equal(exitCodeFor(allConfirmed), 0, "…while a run that confirmed every row does not");
    },
  },
  {
    name: "harness-reference/view: the generated view says it was generated, and follows the module",
    async run() {
      const now = Date.parse("2026-06-01T00:00:00.000Z");
      const shipped = readFileSync(path.join(repoRoot, VIEW_REL), "utf8");
      assert.match(shipped, /GENERATED by `scripts\/refresh-harness-reference\.mjs` at \d{4}-\d{2}-\d{2}T/u, "the shipped view names the program that wrote it and when");
      assert.match(shipped, /do not hand-edit/iu, "…and says it is not to be hand-edited");
      for (const row of HARNESS_REFERENCE_ROWS) {
        assert.equal(shipped.includes(row.id), true, `every row of the module appears in the view (${row.id})`);
        assert.equal(shipped.includes(String(row.value)), true, `…with its value (${row.id})`);
      }

      // THE VIEW FOLLOWS THE MODULE, because the module is the only home.
      const moved = HARNESS_REFERENCE_ROWS.map((row, at) => (at === 0 ? { ...row, value: 4242 } : { ...row }));
      const rendered = renderView(moved, { now });
      assert.equal(rendered.includes("4242"), true, "a changed value in the module shows in the next render");
      for (const row of moved) assert.equal(rendered.includes(row.id), true, `every row of the module appears (${row.id})`);
      const cells = rendered.split("\n").filter((line) => line.startsWith("| `"));
      assert.equal(cells.length, moved.length, "and the view shows no row the module does not carry");
      assert.equal(rendered.includes(String(HARNESS_REFERENCE_ROWS[0].value)) && HARNESS_REFERENCE_ROWS[0].value !== 4242, false, "…and no value it does not carry");
    },
  },
  {
    name: "harness-reference/view: a hand edit to the view does not survive the next render",
    run() {
      const now = Date.parse("2026-06-01T00:00:00.000Z");
      const clean = renderView(HARNESS_REFERENCE_ROWS, { now });
      const handEdited = clean.replace(String(HARNESS_REFERENCE_ROWS[0].value), "999999");
      assert.notEqual(handEdited, clean, "the hand edit landed in the view");
      const rerendered = renderView(HARNESS_REFERENCE_ROWS, { now });
      assert.equal(rerendered, clean, "the view is the rendering of the module's rows");
      assert.equal(rerendered.includes("999999"), false, "…and the hand-edited value is gone");
    },
  },
];
