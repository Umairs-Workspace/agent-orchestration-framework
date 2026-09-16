// test/loop/work-loops-coverage-ledger.test.mjs — milestone 52 / story 05, task 05: THE COVERAGE LEDGER.
//
// The acceptance criterion this file exists for is the story's hardest: *"Coverage is traced
// scenario by scenario, not asserted in aggregate: for each of the 323 scenarios, either a
// deciding assertion, or an explicit, justified exclusion recorded in the story."* A prose table
// asserting that is exactly the species of evidence the whole story was raised against — 52's
// `VERIFICATION.md` claimed fifteen fixtures were green and nothing could re-run the claim. So the
// ledger is CODE: each behavioural suite exports a `coverage` object beside its tests, and this
// checker RE-DERIVES the truth from the `.feature` files on every run. It cannot be true on
// Tuesday and unfalsifiable on Wednesday.
//
// LEG 1 IS THE NON-VACUITY LEG, AND ITS TWO INSTRUMENTS ARE THE LITERAL ORACLES AND THE
// PLANTED-SHAPE PARSER SELF-CHECKS. Both are load-bearing and both stay: if the scenario parser
// stops matching — a renamed keyword, a CRLF change, an `Examples:` line that grows a title — the
// parsed counts collapse, and this leg says so with the parser named and the count that moved.
//
// WHAT THIS FILE USED TO CLAIM, AND WHAT WAS MEASURED AT REVIEW. It said leg 1 was "first by
// construction" because "every set equality below is green over the empty set". Neither half is
// true. The set equalities compare a PARSE against a hardcoded, non-empty ledger, so an empty
// parse is a failure on one side rather than a vacuous pass: a dead scenario parser reds legs 1
// AND 2, and a dead `Examples:` anchor reds legs 1 AND 4. And `scripts/test.mjs` spreads this
// array and runs every entry regardless, so the ORDER of the legs carries no gating force at all —
// moving this one would change which failure is read first, not whether the ledger can report
// total coverage of nothing. TECH_DEBT item 5's species is still the risk this leg exists for; the
// oracles and the self-checks are what close it, and the ordering claim was decoration.
//
// THE TABLE COUNT IS 28, NOT 24 — F-52-05-D, and please do not "fix" it back. The refine-time
// figure of 24 tables (written into `05_coverage-ledger-and-evidence.feature:22,44`) is a
// miscount, corrected in this story's `STORY.md` at build. It is reproducible: a strict
// `/^\s*Examples:\s*$/` parser — the one `test/loop/work-loops-registry-census.test.mjs` uses, correct
// for ITS five features — finds only 21 tables and 415 rows across the fifteen, because 52/02's
// four features title their tables (`Examples: the declared value, and the Field a consumer
// receives`). Measured three ways and agreeing at 28 tables / 461 rows: this parser over the
// features, the sum of the five suites' `coverage.tables`, and the per-feature oracle below. The
// two load-bearing numbers — 323 scenarios and 461 rows — are exact and unchanged.
//
// TWO ACCOUNTINGS, KEPT SEPARATE ON PURPOSE. The 323/461/28 oracle covers the FIFTEEN
// `@executable` features of 52/00, 52/01 and 52/02 — the stories whose evidence F-52-04-H found
// missing. `test/loop/work-loops-registry-census.test.mjs` additionally covers 52/03's five features
// (46 scenarios, of which it traces 3 tables and 28 rows); 52/03 was never part of the 323, its
// features hold tables this milestone deliberately does not trace, and folding the two together
// would make either number unfalsifiable. So they are asserted separately and summed nowhere.
//
// WHY THIS FILE READS `scripts/test.mjs` AS TEXT AND NEVER IMPORTS IT (m04/R3, a recorded
// near-miss): importing the runner from a meta-test creates an import cycle — the runner imports
// this module. The registration legs therefore read the runner's source, which is also the only
// way to see the difference TECH_DEBT item 50 is about (an import with no spread).
//
// THE TWO REGISTRATION TRAPS, both re-derived by leg 8 rather than trusted:
// `test/arch/loop/acd-loop-finding-envelope.test.mjs` deep-equals the on-disk `test/arch/acd-loop-*`
// roster against a literal NINE, and pins the m52/story-04 import block's shape (a blank line
// immediately after its ninth import, no tenth `...acdLoop` spread). This story's six suites
// therefore live in `test/` without that prefix, take their own labelled block, and export
// aliases that do not begin `acdLoop`.
//
// ADR-013/C5 (a baseline is reviewed by re-measuring it), m43 ADR-014/E7 (a suite no runner
// imports is no gate), TECH_DEBT items 5, 48 and 50, F-52-04-H, F-52-05-D.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { coverage as recordCoverage, workLoopsRecordTests } from "./work-loops-record.test.mjs";
import { coverage as valueCoverage, workLoopsValueTests } from "./work-loops-value.test.mjs";
import { coverage as checksCoverage, workLoopsChecksTests } from "./work-loops-checks.test.mjs";
import { coverage as commandsCoverage, workLoopsCommandsTests } from "./work-loops-commands.test.mjs";
import { coverage as censusCoverage, workLoopsRegistryCensusTests } from "./work-loops-registry-census.test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MILESTONE = "wiki/work/archive/52_milestone_loop-registry-and-graph";
const STORY_05 = `${MILESTONE}/stories/05_story_behavioural-suites`;
const S00 = `${MILESTONE}/stories/00_story_loop-model-and-loader/tasks`;
const S01 = `${MILESTONE}/stories/01_story_structural-checks/tasks`;
const S02 = `${MILESTONE}/stories/02_story_work-loops-command-family/tasks`;
const S03 = `${MILESTONE}/stories/03_story_the-day-one-registry/tasks`;

// ————— THE ORACLES ————————————————————————————————————————————————————————————————————
// Measured at build 2026-08-15 by parsing the features, and independently by summing the five
// suites' `coverage.tables`. `rows` is the per-table row count IN FILE ORDER, so a table that is
// added, removed or reordered fails here — at the oracle — rather than downstream in a set
// equality that would still be satisfiable.
const FIFTEEN = [
  { feature: `${S00}/00_frozen-vocabulary.feature`, scenarios: 26, rows: [31] },
  { feature: `${S00}/01_record-loader.feature`, scenarios: 32, rows: [13, 12, 10] },
  { feature: `${S00}/02_field-value-grammar.feature`, scenarios: 25, rows: [76] },
  { feature: `${S00}/03_pointer-endpoint-syntax.feature`, scenarios: 29, rows: [41] },
  { feature: `${S00}/04_schema-and-honesty-findings.feature`, scenarios: 19, rows: [4, 25, 9] },
  { feature: `${S01}/00_scc-decomposition.feature`, scenarios: 17, rows: [12] },
  { feature: `${S01}/01_groundedness-check.feature`, scenarios: 14, rows: [9] },
  { feature: `${S01}/02_unpaired-and-unowned.feature`, scenarios: 22, rows: [23] },
  { feature: `${S01}/03_shared-actuator-arbitration.feature`, scenarios: 19, rows: [16] },
  { feature: `${S01}/04_timescale-comparability.feature`, scenarios: 21, rows: [13, 48] },
  { feature: `${S01}/05_frozen-finding-codes.feature`, scenarios: 22, rows: [8, 3] },
  { feature: `${S02}/00_loops-show.feature`, scenarios: 23, rows: [16, 7] },
  { feature: `${S02}/01_loops-validate.feature`, scenarios: 17, rows: [30, 4, 5] },
  { feature: `${S02}/02_loops-graph-mermaid.feature`, scenarios: 23, rows: [9, 8, 6] },
  { feature: `${S02}/03_registration-and-routing.feature`, scenarios: 14, rows: [17, 3, 3] },
];
const FIFTEEN_TOTALS = { scenarios: 323, rows: 461, tables: 28 };

// 52/03's five, the census suite's own subject. NOT part of the 323 (see the header).
const CENSUS_FIVE = [
  { feature: `${S03}/00_actor-nodes.feature`, scenarios: 7 },
  { feature: `${S03}/01_acd-phase-loops.feature`, scenarios: 10 },
  { feature: `${S03}/02_engineered-controller-loops.feature`, scenarios: 10 },
  { feature: `${S03}/03_declared-edges.feature`, scenarios: 9 },
  { feature: `${S03}/04_registry-loads-clean.feature`, scenarios: 10 },
];
const CENSUS_TOTALS = { scenarios: 46, tracedTables: 3, tracedRows: 28 };

// …and the census's three traced tables row by row, because ONE of them is not traced 1:1 and the
// difference is a fact rather than a slip. `04_registry-loads-clean`'s 20-code table splits: 11 rows
// are the loader's ERROR lane, which FF-5204's own sweep owns and this milestone refuses to re-decide
// (a duplicated invariant is two homes for one rule), and 9 are the warn/check lanes no gate decides.
// The census asserts the UNION of its two named arrays against the table's own 20 codes, so every row
// is still accounted for — but `cases.length` is 9, not 20, and a leg that demanded equality here
// would be demanding the duplication the story forbids. The fifteen features' 28 tables ARE traced
// 1:1, which is what the 461-row claim rests on.
const CENSUS_TRACED = Object.freeze([
  { key: `${S03}/01_acd-phase-loops.feature#0`, rows: 4, cases: 4, deferred: 0 },
  { key: `${S03}/04_registry-loads-clean.feature#0`, rows: 20, cases: 9, deferred: 11 },
  { key: `${S03}/04_registry-loads-clean.feature#1`, rows: 4, cases: 4, deferred: 0 },
]);

// SHRINK-ONLY, and equality rather than a ceiling in both directions: a class holding MORE than
// its literal fails (a new exclusion is a visible edit), and a class holding FEWER also fails, so
// ground gained is kept rather than quietly banked (ADR-013/C5).
//
// `duplicate-claim` moved 6 → 7 at build, deliberately and with the reason recorded: the checks
// suite claimed to decide `04_timescale-comparability`'s *"duration units resolve and compare
// across ms, s, m, h and d"*, but its duration table builds `periodic(900_000, "periodic:15m")`
// LITERALLY and resolves no unit, so it cannot decide resolution. `test/loop/work-loops-value.test.mjs`
// drives the real `periodic:15m` text through the loader and asserts 900000 — it is the home. The
// checks suite keeps its table and its test; only the ledger ENTRY moved.
//
// `structural-duplicate` RATCHETED 65 → 64 at this story's review (F-52-05-E), which is the
// direction this literal is allowed to move without an argument: `05_frozen-finding-codes`'
// *"the combined finding order is frozen"* was excluded to FF-5209, and the gate does decide the
// LANE concatenation — but the scenario's `(path, code, message)` clause was decided by neither
// instrument (both compare an array with itself re-sorted, over fixtures where code order and
// message order never disagree; QA's C11 mutation, dropping the `code` tiebreak, survived all six
// suites and all nine gates). The checks suite now decides it over a fixture where the two orders
// conflict, so the exclusion was PAID DOWN rather than reclassified.
const EXCLUSION_CEILINGS = Object.freeze({ "structural-duplicate": 64, "not-black-box": 3, "duplicate-claim": 7 });
const EXCLUSION_CLASSES = Object.freeze(["structural-duplicate", "not-black-box", "duplicate-claim"]);

// The nine loop-registry fitness functions, by file. Named rather than globbed so that a tenth —
// which would itself red FF-5209's roster leg — is visible from here too.
const NINE_GATES = Object.freeze([
  "acd-loop-registry-not-an-item-type.test.mjs", "acd-loop-module-import-boundary.test.mjs",
  "acd-loop-vocabulary-closed.test.mjs", "acd-loop-records-parse.test.mjs",
  "acd-loop-checks-pure.test.mjs", "acd-loop-timescale-comparability.test.mjs",
  "acd-loop-command-route-only.test.mjs", "acd-loop-render-deterministic.test.mjs",
  "acd-loop-finding-envelope.test.mjs",
]);

// The six suites this story lands, with the aliases `scripts/test.mjs` binds them to. The `task`
// number is the story task that authored each, and is what `STORY.md`'s exclusion table names in
// its own `task` column — leg 7 compares the two.
const SUITES = [
  { key: "record", task: "00", file: "test/loop/work-loops-record.test.mjs", alias: "workLoopsRecordTests", tests: workLoopsRecordTests, coverage: recordCoverage },
  { key: "value", task: "01", file: "test/loop/work-loops-value.test.mjs", alias: "workLoopsValueTests", tests: workLoopsValueTests, coverage: valueCoverage },
  { key: "checks", task: "02", file: "test/loop/work-loops-checks.test.mjs", alias: "workLoopsChecksTests", tests: workLoopsChecksTests, coverage: checksCoverage },
  { key: "commands", task: "03", file: "test/loop/work-loops-commands.test.mjs", alias: "workLoopsCommandsTests", tests: workLoopsCommandsTests, coverage: commandsCoverage },
  { key: "census", task: "04", file: "test/loop/work-loops-registry-census.test.mjs", alias: "workLoopsRegistryCensusTests", tests: workLoopsRegistryCensusTests, coverage: censusCoverage },
];
const LEDGER_FILE = "test/loop/work-loops-coverage-ledger.test.mjs";
const LEDGER_ALIAS = "workLoopsCoverageLedgerTests";
const FIXTURE_HELPER = "test/support/loop-registry-fixture.mjs";
const REGISTERED = [...SUITES.map((suite) => suite.file), LEDGER_FILE];

// ————— the parsers, and why each is shaped as it is ————————————————————————————————————
//
// THESE TWO ARE DELIBERATELY NOT IMPORTED FROM `test/support/feature-parse.mjs`, and please do not
// "helpfully" collapse them into it. The suites this file checks now share that one home; this
// file is the INSTRUMENT that re-derives what those suites claim about themselves, so it parses
// the features a second time, independently. A checker that imported the parser it checks would
// agree with its subjects by construction — the two counts could only ever be equal, and the whole
// leg would become a tautology. The one home closes a real defect (F-52-05-D: two anchors, and an
// `index` that is an ordinal into whichever parse produced it); this copy is the triangulation
// that catches the day the shared parser is itself wrong.
const sorted = (values) => [...values].sort();
const read = (rel) => readFile(path.join(root, rel), "utf8");
const exists = async (rel) => stat(path.join(root, rel)).then(() => true, () => false);

// 119/ADR-004's THIRD READER (119/03). The `.feature` files below are DELIVERED and immutable, and
// they cite their evidence suites by path. 119/03 moved every one of those suites into a subject
// directory, so a bare existence check reports 489 citations across 156 immutable documents as
// stranded — with no legal edit that clears them. A cited path resolves at HEAD or through a rename
// this repository's own history records; the citation is answered, never rewritten.
import { renameMapProblems, resolveCitedSuite } from "../support/registration/cited-suite-path.mjs";
import { registrationSurface, suiteFilesBelow } from "../support/registration/registration-surface.mjs";

/** Every `Scenario:` / `Scenario Outline:` title, in file order. */
function scenarioTitles(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*Scenario(?: Outline:| Outline|):\s*(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => match[1]);
}

/**
 * Every `Examples:` block, in file order, as `{ header, rows }` of trimmed cells.
 *
 * The `Examples:` line is matched WITH an optional title, which is the whole reason the table
 * count is 28 rather than 21: 52/02's four features name their tables. The rows are the
 * contiguous run of `|` lines that follows; a `|---|` separator row is skipped even though this
 * milestone's features carry none, so a later author adding one cannot shift a row count in
 * silence.
 */
function examplesTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    if (!/^\s*Examples:/.test(lines[cursor])) continue;
    const parsed = [];
    for (let row = cursor + 1; row < lines.length && /^\s*\|/.test(lines[row]); row += 1) {
      const cells = lines[row].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^-*$/.test(cell))) continue;
      parsed.push(cells);
    }
    tables.push({ header: parsed[0] ?? [], rows: parsed.slice(1) });
  }
  return tables;
}

/**
 * Every markdown pipe table in `text`, as `{ header, rows }` of trimmed cells — a table being any
 * contiguous run of `|` lines, with its `|---|` separator dropped. Tables are located by their
 * HEADER CELLS rather than by an offset from a heading, so inserting a paragraph into a document
 * cannot silently move which table a leg reads.
 */
function markdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let block = null;
  for (const line of [...lines, ""]) {
    if (/^\s*\|/.test(line)) {
      const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      (block ??= []).push(cells);
      continue;
    }
    if (block) {
      const rows = block.filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell) || cell === ""));
      if (rows.length > 0) tables.push({ header: rows[0], rows: rows.slice(1) });
      block = null;
    }
  }
  return tables;
}

const untick = (cell) => cell.replace(/^`(.*)`$/, "$1").replace(/^\*\*(.*)\*\*$/, "$1").trim();

/**
 * The lines of `## <heading>` in a markdown document, up to the next heading of the same level or
 * shallower. `heading` is a whole-line string, or a RegExp matched against the trimmed line — the
 * RegExp form is for a document whose headings carry a title after a number (`## 48. Milestone
 * 52's behavioural evidence …`), where a whole-line literal would also have to pin the title.
 *
 * Returns null when the heading is absent, so a caller reports NOT FOUND rather than asserting
 * over the wrong region. That is the point: the cut this replaced was
 * `debt.slice(debt.indexOf("\n## 48. "), debt.indexOf("\n## 49. "))` — the banned SENTINEL_END
 * shape (m47/F-47-04-ARCH-2), where renumbering item 49 makes the second `indexOf` return −1, the
 * cut runs to end of file, the non-empty guard still passes, and a `Status: CLOSED` belonging to
 * some OTHER item reads as item 48's.
 */
function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const matches = (line) => (typeof heading === "string" ? line.trim() === heading : heading.test(line.trim()));
  const start = lines.findIndex(matches);
  if (start < 0) return null;
  const opening = lines[start].match(/^\s*(#+)\s/);
  if (!opening) return null;
  const depth = opening[1].length;
  const out = [];
  for (let cursor = start + 1; cursor < lines.length; cursor += 1) {
    const next = lines[cursor].match(/^(#+)\s/);
    if (next && next[1].length <= depth) break;
    out.push(lines[cursor]);
  }
  return out;
}

/**
 * Markdown list items, each as its bullet line plus its indented continuation lines — which is
 * what makes an "evidence line" a unit: `VERIFICATION.md` puts the suite path, the count and the
 * `verifies →` pointer on three lines of one bullet, and a leg that read them line by line would
 * be reading three unrelated facts.
 */
function bullets(lines) {
  const out = [];
  for (const line of lines) {
    if (/^\s*[-*]\s/.test(line)) out.push([line]);
    else if (out.length > 0 && /^\s+\S/.test(line)) out[out.length - 1].push(line);
  }
  return out.map((block) => block.join("\n"));
}

// ————— the ledger, assembled once ——————————————————————————————————————————————————————
const allDecided = SUITES.flatMap((suite) => suite.coverage.decided.map((entry) => ({ ...entry, suite })));
const allExcluded = SUITES.flatMap((suite) => suite.coverage.excluded.map((entry) => ({ ...entry, suite })));
const featuresOf = (list) => list.map((entry) => entry.feature);
const decidedTitles = new Set(allDecided.map((entry) => entry.scenario));

async function archTestNames() {
  const dir = path.join(root, "test", "arch");
  // 119/03 — `test/arch/` has subject directories now, so the `acd-loop-*` gates are no longer
  // direct children of it. The walk is recursive and matches the LEAF; a flat listing returned
  // none of them, and the non-vacuity assertion below is what made that a red rather than a
  // claim asserted over the empty set (119/ADR-003 §4).
  const files = (await suiteFilesBelow(dir)).filter((rel) => rel.split("/").pop().startsWith("acd-loop-"));
  const names = new Set();
  for (const file of files) {
    const module = await import(pathToFileURL(path.join(dir, file)).href);
    for (const entry of module.archTests ?? []) names.add(entry.name);
  }
  return { files: sorted(files), names };
}

export const workLoopsCoverageLedgerTests = [
  {
    // LEG 1 — the literal oracles and the parser self-checks (see the header for what was
    // measured). The legs below compare a parse against a non-empty hardcoded ledger, so a parser
    // that matched nothing reds them too; what this leg adds is that the failure names the PARSER
    // and the count that moved, rather than surfacing downstream as a set difference that reads
    // like missing coverage.
    name: "loops-ledger/05 leg 1 non-vacuity: the fifteen features parse to the literal oracle — 323 scenarios, 461 rows across 28 tables",
    run: async () => {
      // The parsers first, on planted shapes: a parser that matched nothing would satisfy every
      // count below by making every count zero, so the counts are not evidence that it works.
      assert.deepEqual(scenarioTitles("Feature: f\n\n  Scenario: alpha\n    Given x\n  Scenario Outline: beta\n"), ["alpha", "beta"]);
      assert.deepEqual(scenarioTitles("Feature: f\n  Given a line mentioning Scenario: not a heading\n"), []);
      assert.equal(examplesTables("  Examples: a titled table\n    | a | b |\n    | 1 | 2 |\n")[0].rows.length, 1,
        "a TITLED Examples block is a table — the miscount corrected as F-52-05-D was a strict `Examples:$` read");
      assert.deepEqual(examplesTables("  Examples:\n    | a |\n    | --- |\n    | 1 |\n")[0].rows, [["1"]], "a separator row is skipped, never counted");
      assert.deepEqual(examplesTables("Feature: f\n  Scenario: no tables here\n"), []);

      let scenarios = 0;
      let rows = 0;
      let tables = 0;
      for (const oracle of FIFTEEN) {
        const text = await read(oracle.feature);
        const titles = scenarioTitles(text);
        const parsed = examplesTables(text);
        const base = path.basename(oracle.feature);
        assert.ok(titles.length > 0, `${base}: the parser matched at least one scenario`);
        assert.equal(titles.length, oracle.scenarios, `${base}: scenario count`);
        assert.equal(new Set(titles).size, titles.length, `${base}: every scenario title is unique, so a title identifies a scenario`);
        assert.deepEqual(parsed.map((table) => table.rows.length), oracle.rows, `${base}: Examples row counts, table by table in file order`);
        scenarios += titles.length;
        rows += parsed.reduce((total, table) => total + table.rows.length, 0);
        tables += parsed.length;
      }
      assert.deepEqual({ scenarios, rows, tables }, FIFTEEN_TOTALS,
        "the fifteen @executable features of 52/00, 52/01 and 52/02. 323 and 461 are exact; 28 tables is the build-time correction of the refine-time `24` (F-52-05-D), measured by this parser, by summing the five suites' `coverage.tables`, and by the per-feature oracle above");

      // 52/03's five, counted SEPARATELY and never folded in — the census suite's subject, which
      // was no part of the 323 and whose features carry tables this milestone does not trace.
      let censusScenarios = 0;
      for (const oracle of CENSUS_FIVE) {
        const titles = scenarioTitles(await read(oracle.feature));
        assert.equal(titles.length, oracle.scenarios, `${path.basename(oracle.feature)}: scenario count`);
        censusScenarios += titles.length;
      }
      assert.equal(censusScenarios, CENSUS_TOTALS.scenarios, "52/03's five features, accounted separately from the 323");
      assert.equal(censusCoverage.tables.length, CENSUS_TOTALS.tracedTables, "the census traces three of its features' tables");
      assert.equal(censusCoverage.tables.reduce((total, entry) => total + entry.rows, 0), CENSUS_TOTALS.tracedRows, "…closing 28 rows");
    },
  },

  {
    // LEG 2. Both directions fail: a scenario the ledger does not carry, and a ledger entry no
    // feature declares. The union is taken ACROSS the five suites because two features are
    // covered jointly by design — `04_timescale-comparability`'s duration ladder is a LOADER
    // claim decided by the value suite, and `05_frozen-finding-codes`' `ran` cases are a COMMAND
    // claim decided by the command suite — and that shape is itself checked below rather than
    // waved through.
    name: "loops-ledger/05 leg 2 set equality: every scenario of the twenty covered features is decided or excluded, and nothing else is claimed",
    run: async () => {
      const known = new Set([...FIFTEEN.map((entry) => entry.feature), ...CENSUS_FIVE.map((entry) => entry.feature)]);
      for (const entry of [...allDecided, ...allExcluded]) {
        assert.ok(known.has(entry.feature), `${entry.suite.key}: "${entry.scenario}" names a covered feature (${entry.feature})`);
        assert.ok(entry.suite.coverage.features.includes(entry.feature), `${entry.suite.key}: "${entry.scenario}" names a feature the suite declares it covers`);
      }

      // Per suite, a scenario is claimed at most once — the census's own ledger test states this
      // for itself; it holds for all five.
      for (const suite of SUITES) {
        const claimed = [...suite.coverage.decided, ...suite.coverage.excluded].map((entry) => `${entry.feature}::${entry.scenario}`);
        assert.equal(new Set(claimed).size, claimed.length, `${suite.key}: no scenario is claimed twice within one suite`);
      }

      for (const feature of known) {
        const titles = scenarioTitles(await read(feature));
        const claimed = [...allDecided, ...allExcluded].filter((entry) => entry.feature === feature).map((entry) => entry.scenario);
        assert.deepEqual(sorted(new Set(claimed)), sorted(titles),
          `${path.basename(feature)}: decided ∪ excluded is exactly the scenario set — a title with no entry, or an entry naming no scenario, fails here`);
      }

      // A (feature, scenario) carried by TWO suites is admitted in exactly one shape: one suite
      // decides it, and every other entry for it is a `duplicate-claim` exclusion — the migration
      // the story rules on, never two homes for one rule.
      const byScenario = new Map();
      for (const entry of [...allDecided.map((e) => ({ ...e, kind: "decided" })), ...allExcluded.map((e) => ({ ...e, kind: "excluded" }))]) {
        const key = `${entry.feature}::${entry.scenario}`;
        byScenario.set(key, [...(byScenario.get(key) ?? []), entry]);
      }
      for (const [key, entries] of byScenario) {
        if (entries.length === 1) continue;
        const decided = entries.filter((entry) => entry.kind === "decided");
        assert.equal(decided.length, 1, `${key}: carried by ${entries.length} entries, so exactly one must DECIDE it`);
        for (const entry of entries.filter((e) => e.kind === "excluded")) {
          assert.equal(entry.class, "duplicate-claim", `${key}: a second entry for a decided scenario is a duplicate-claim migration or it is two homes for one rule`);
        }
      }

      // …and no title is DECIDED by two suites. This is what §RECONCILE closed: before it, the
      // checks and value suites both claimed to decide the duration-unit ladder.
      const suitesByTitle = new Map();
      for (const entry of allDecided) {
        suitesByTitle.set(entry.scenario, new Set([...(suitesByTitle.get(entry.scenario) ?? []), entry.suite.key]));
      }
      const doubleDecided = [...suitesByTitle].filter(([, suites]) => suites.size > 1).map(([title, suites]) => `"${title}" (${sorted(suites).join(", ")})`);
      assert.deepEqual(doubleDecided, [], "a scenario title decided by two suites is two homes for one rule");
    },
  },

  {
    // LEG 3. The ledger's `test` field is the join between a scenario and an assertion; unresolved,
    // it is a comment. Looked up in the suite's own EXPORTED array — the array the runner spreads —
    // so a test that was renamed or deleted fails here.
    name: "loops-ledger/05 leg 3 decided implies asserted: every decided scenario names a test its own module exports",
    run: async () => {
      for (const suite of SUITES) {
        const names = new Set(suite.tests.map((entry) => entry.name));
        assert.ok(names.size > 0, `${suite.key}: exports tests`);
        for (const entry of suite.tests) {
          assert.equal(typeof entry.name, "string");
          assert.equal(typeof entry.run, "function", `${suite.key}/${entry.name}: runner-shaped \`run\`, never \`fn\``);
          assert.equal(Object.hasOwn(entry, "fn"), false, `${suite.key}/${entry.name}: no \`fn\` key`);
        }
        for (const entry of suite.coverage.decided) {
          assert.ok(names.has(entry.test), `${suite.key}: "${entry.scenario}" is decided by "${entry.test}", which that module does not export`);
        }
      }
    },
  },

  {
    // LEG 4. The 461 rows the acceptance criterion does not reach: the fifteen features contain no
    // `Scenario Outline` at all, so every `Examples:` block is attached to the FEATURE and its rows
    // are not scenarios. They are traced at TABLE granularity — one assertion per table, with the
    // row count parsed from the feature — and the array is proved to be the one a test ITERATES,
    // not an unused literal the ledger merely points at.
    //
    // HOW THE ITERATION IS PROVED, and what the proof rests on: the identifier bound to `cases:` is
    // read out of the module's own source, then required to be declared exactly once, at module
    // scope, with `const`, and to be iterated somewhere in that same module. A module-scope `const`
    // has exactly ONE binding and cannot be reassigned, so `cases: ROWS` in the coverage object and
    // `for (const row of ROWS)` in the test necessarily reference the same array OBJECT. That is why
    // the single-declaration assertion is load-bearing rather than tidiness.
    //
    // THE RESIDUAL LIMIT, NAMED RATHER THAN WIDENED (recorded at review). What this leg traces is
    // COUNT: the row count parsed from the feature, `cases.length` against it, and the array being
    // one a test drives. It does NOT compare a case's expected value with the CELL the feature row
    // states. Only two suites read the feature's cells at all — `test/loop/work-loops-commands.test.mjs`
    // and `test/loop/work-loops-registry-census.test.mjs`, which parse their tables and drive the parsed
    // rows — so for the record, value and checks suites an expected value edited in a `.feature`
    // row and not in the suite would red nothing here. That is inside the story's declared contract
    // for row tracing ("one assertion per table with the row count parsed from the feature"), so it
    // is left as it is; widening it is a scope change and a story of its own, not a fix to this leg.
    name: "loops-ledger/05 leg 4 table granularity: all 28 tables and 461 rows are traced by a case array a test iterates",
    run: async () => {
      const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
      const traced = new Map();
      let tracedRows = 0;

      for (const suite of SUITES) {
        const source = await read(suite.file);
        // THE OBJECT LITERAL IS MATCHED AS A UNIT — its `feature:`, its `index:` and its `cases:`
        // together — and both captures are then required to be the entry's own. Reading them
        // positionally (the Nth `cases:` paired with `coverage.tables[N]`) is aligned today and
        // would stay GREEN through a mispairing, which is the same species as the positional
        // slices this leg's neighbours were fixed for. `[^}]*?` keeps every match inside one
        // literal, so a key order this does not expect fails as a COUNT mismatch — loudly, and
        // before anything is asserted about the wrong table.
        const named = [...source.matchAll(/feature:\s*([A-Za-z_$][\w$]*)[^}]*?index:\s*(\d+)[^}]*?cases:\s*([A-Za-z_$][\w$]*)/g)]
          .map((match) => ({ feature: match[1], index: Number(match[2]), name: match[3] }));
        assert.equal(named.length, suite.coverage.tables.length,
          `${suite.key}: every \`cases:\` in the module belongs to a coverage.tables entry that declares its own \`feature:\` and \`index:\``);
        // …and the feature CONSTANT each literal names resolves 1:1 with the feature path the
        // entry carries, so two entries sharing an index (every suite has several `index: 0`)
        // cannot be swapped for each other without failing here.
        const constantToFeature = new Map();
        const featureToConstant = new Map();

        for (const [position, entry] of suite.coverage.tables.entries()) {
          const { feature: constant, index: declared, name } = named[position];
          assert.equal(declared, entry.index,
            `${suite.key}: the literal naming \`${name}\` declares index ${declared}, but coverage.tables[${position}] is index ${entry.index} — the pairing is by the literal, never by position`);
          assert.equal(constantToFeature.get(constant) ?? entry.feature, entry.feature,
            `${suite.key}: the constant \`${constant}\` names two different features across coverage.tables — a mispaired literal`);
          assert.equal(featureToConstant.get(entry.feature) ?? constant, constant,
            `${suite.key}: ${path.basename(entry.feature)} is named by two different constants across coverage.tables — a mispaired literal`);
          constantToFeature.set(constant, entry.feature);
          featureToConstant.set(entry.feature, constant);
          assert.ok(identifier.test(name), `${suite.key}: \`cases\` is a plain identifier (${name})`);
          const declarations = [...source.matchAll(new RegExp(`\\b(?:const|let|var|function)\\s+${name}\\b`, "g"))];
          assert.equal(declarations.length, 1, `${suite.key}/${name}: declared exactly once — the single binding is what makes the ledger's array and the test's array the same object`);
          assert.ok(new RegExp(`^const ${name} = `, "m").test(source), `${suite.key}/${name}: a module-scope \`const\``);
          assert.ok(
            new RegExp(`(?:\\bof\\s+${name}\\b|\\b${name}\\s*\\.\\s*(?:map|forEach|flatMap|entries)\\s*\\()`).test(source),
            `${suite.key}/${name}: iterated by a test — a table traced by an array nothing drives is traced by nothing`,
          );

          const key = `${entry.feature}#${entry.index}`;
          assert.equal(traced.has(key), false, `${key}: traced by exactly one suite (${traced.get(key)} also claims it)`);
          traced.set(key, suite.key);

          const parsed = examplesTables(await read(entry.feature));
          assert.ok(parsed[entry.index], `${key}: the feature declares that table`);
          assert.equal(parsed[entry.index].rows.length, entry.rows, `${key}: the ledger's row literal equals the row count parsed from the feature`);
          assert.ok(Array.isArray(entry.cases), `${key}: cases is an array`);
          assert.ok(entry.cases.length > 0, `${key}: the case array is not empty`);
          for (const testCase of entry.cases) assert.equal(typeof testCase, "object", `${key}: every case is a row object`);
          if (!entry.feature.startsWith(S03)) {
            assert.equal(entry.cases.length, entry.rows, `${key}: the case array has one case per parsed row`);
          }
          tracedRows += entry.rows;
        }
      }

      // Exhaustive over the fifteen: every table of every covered feature is traced. (The census's
      // five are traced selectively by design, so they are bounded rather than equated.)
      const expected = FIFTEEN.flatMap((oracle) => oracle.rows.map((_, index) => `${oracle.feature}#${index}`));
      assert.deepEqual(sorted([...traced.keys()].filter((key) => !key.startsWith(S03))), sorted(expected),
        "every one of the fifteen features' 28 tables is traced exactly once");
      const fifteenRows = SUITES.flatMap((suite) => suite.coverage.tables).filter((entry) => !entry.feature.startsWith(S03)).reduce((total, entry) => total + entry.rows, 0);
      assert.equal(fifteenRows, FIFTEEN_TOTALS.rows, "the traced rows close all 461");
      assert.equal(tracedRows - fifteenRows, CENSUS_TOTALS.tracedRows, "…and 52/03's 28 traced rows are counted apart from them");

      // The census's three, row by row, with the one deliberate 1:many split pinned as a literal so
      // that deferring a further row is a visible edit rather than a number quietly moving.
      assert.deepEqual(
        sorted(censusCoverage.tables.map((entry) => `${entry.feature}#${entry.index} rows=${entry.rows} cases=${entry.cases.length}`)),
        sorted(CENSUS_TRACED.map((entry) => `${entry.key} rows=${entry.rows} cases=${entry.cases}`)),
        "52/03's traced tables: 28 rows, of which 17 are driven case by case here and 11 are the loader error lane FF-5204 owns — the census asserts the union of its two named arrays against the table's own codes",
      );
    },
  },

  {
    // LEG 5. An exclusion is a CLAIM, not a comment: it says another instrument decides this
    // scenario. So the pointer is resolved — a `structural-duplicate` by importing the nine gates
    // and looking the test name up, never by trusting the string; a `duplicate-claim` against the
    // decided sets; a `not-black-box` against the decidable proxy the excluding suite itself runs.
    name: "loops-ledger/05 leg 5 exclusions resolve: class, reason, and a pointer looked up rather than trusted",
    run: async () => {
      const { files, names: gateNames } = await archTestNames();
      assert.ok(files.length >= NINE_GATES.length, `the acd-loop-* sweep was non-vacuous: ${files.length} files`);
      // 119/03 — the sweep yields subject-relative paths; NINE_GATES names basenames, so the
      // membership check reads the leaf. Re-keying NINE_GATES to paths instead would re-point nine
      // rows for nothing and make the next move re-point them again.
      const gateLeaves = new Set(files.map((rel) => rel.split("/").pop()));
      for (const file of NINE_GATES) assert.ok(gateLeaves.has(file), `${file}: milestone 52's own gate remains present for exclusion-pointer resolution; later milestones may share the namespace (53/ADR-015 §8)`);
      assert.ok(gateNames.size >= 18, `the gates' test names resolved (${gateNames.size})`);

      for (const entry of allExcluded) {
        const where = `${entry.suite.key}: "${entry.scenario}"`;
        assert.ok(EXCLUSION_CLASSES.includes(entry.class), `${where}: class ${entry.class}`);
        assert.equal(typeof entry.reason, "string");
        assert.ok(entry.reason.trim().length > 0, `${where}: states a reason`);
        assert.equal(typeof entry.pointer, "string");
        assert.ok(entry.pointer.trim().length > 0, `${where}: carries a pointer`);

        if (entry.class === "structural-duplicate") {
          assert.ok(gateNames.has(entry.pointer),
            `${where}: "${entry.pointer}" is not a test any of the nine gates EXPORTS — an exclusion by gate NAME rather than by an assertion that exists is how an exclusion table becomes fiction`);
        } else if (entry.class === "not-black-box") {
          const own = new Set(entry.suite.tests.map((test) => test.name));
          assert.ok(own.has(entry.pointer), `${where}: "${entry.pointer}" is the decidable proxy that suite actually drives`);
        } else {
          assert.ok(decidedTitles.has(entry.pointer), `${where}: "${entry.pointer}" is a title in some suite's decided set`);
          const elsewhere = allDecided.some((decided) => decided.scenario === entry.pointer
            && (decided.suite.key !== entry.suite.key || decided.feature !== entry.feature));
          assert.ok(elsewhere, `${where}: a duplicate-claim points at the OTHER home of the claim, never at itself`);
        }
      }
    },
  },

  {
    // LEG 6. Shrink-only, and it fails in both directions: a new exclusion above the ceiling fails
    // (paying one IN is a visible edit), and a ceiling left above the measured count fails, so
    // ground gained is kept rather than banked as future licence. The document's own ceiling table
    // is held to the same literals, because a ratchet with two numbers is no ratchet.
    name: "loops-ledger/05 leg 6 shrink-only: each exclusion class equals its literal ceiling, and STORY.md's ceiling table agrees",
    run: async () => {
      const measured = Object.fromEntries(EXCLUSION_CLASSES.map((klass) => [klass, allExcluded.filter((entry) => entry.class === klass).length]));
      for (const [klass, ceiling] of Object.entries(EXCLUSION_CEILINGS)) {
        assert.equal(measured[klass], ceiling,
          `exclusion class \`${klass}\`: measured ${measured[klass]}, ceiling ${ceiling}. ABOVE the ceiling: a new exclusion needs an explicit, reviewed edit to the literal here. BELOW it: good news — an exclusion was paid down, so LOWER the literal (and STORY.md's ceiling table) to keep the ground.`);
      }
      assert.equal(allExcluded.length, Object.values(EXCLUSION_CEILINGS).reduce((a, b) => a + b, 0), "no exclusion carries a class outside the three");

      const storyLines = section(await read(`${STORY_05}/STORY.md`), "## Exclusions");
      assert.ok(storyLines, "STORY.md carries an `## Exclusions` section");
      const ceilingTable = markdownTables(storyLines.join("\n")).find((table) => table.header[0] === "class" && /ceiling/.test(table.header[1] ?? ""));
      assert.ok(ceilingTable, "…and a ceiling table");
      assert.deepEqual(
        Object.fromEntries(ceilingTable.rows.map((row) => [untick(row[0]), [Number(row[1]), Number(row[2])]])),
        Object.fromEntries(EXCLUSION_CLASSES.map((klass) => [klass, [EXCLUSION_CEILINGS[klass], measured[klass]]])),
        "STORY.md's ceiling table (ceiling, measured-at-build) against this file's literals and the measured ledger",
      );
    },
  },

  {
    // LEG 7. The document cannot drift into decoration while the code moves — so the story's entry
    // table is parsed and compared with the code, entry for entry, on (class, feature, scenario);
    // and each `G<n>` in its pointer legend is resolved against the gates on disk exactly as the
    // code's own pointers are.
    name: "loops-ledger/05 leg 7 the record agrees with the code: STORY.md's exclusion table and legend, entry for entry",
    run: async () => {
      const storyLines = section(await read(`${STORY_05}/STORY.md`), "## Exclusions");
      assert.ok(storyLines, "STORY.md carries an `## Exclusions` section");
      const tables = markdownTables(storyLines.join("\n"));

      const legendTable = tables.find((table) => /fitness-function test/.test(table.header[1] ?? ""));
      assert.ok(legendTable, "the G1…Gn pointer legend is present");
      const { names: gateNames } = await archTestNames();
      const legend = new Map(legendTable.rows.map((row) => [untick(row[0]), untick(row[1])]));
      assert.ok(legend.size > 0, "the legend has entries");
      for (const [key, gate] of legend) {
        assert.match(key, /^G\d+$/, `legend key ${key}`);
        assert.ok(gateNames.has(gate), `legend ${key}: "${gate}" is not a test any of the nine gates exports`);
      }

      const entryTable = tables.find((table) => table.header.join("|") === "class|task|covered feature|scenario|ptr");
      assert.ok(entryTable, "the exclusion entry table is present with its documented columns");
      const documented = entryTable.rows.map((row) => ({
        class: untick(row[0]), task: untick(row[1]), feature: untick(row[2]), scenario: row[3].trim(), pointer: row[4].trim(),
      }));
      const coded = allExcluded.map((entry) => ({
        class: entry.class, task: `${entry.suite.task} ${entry.suite.key}`,
        feature: path.basename(entry.feature, ".feature"), scenario: entry.scenario, pointer: entry.pointer,
      }));

      const identity = (row) => `${row.class} | ${row.feature} | ${row.scenario}`;
      assert.deepEqual(sorted(documented.map(identity)), sorted(coded.map(identity)),
        "STORY.md's exclusion table against the union of the five suites' coverage.excluded, on (class, feature, scenario)");
      assert.equal(documented.length, coded.length, "…and neither carries a duplicate row the set comparison would hide");

      const codedByIdentity = new Map(coded.map((row) => [identity(row), row]));
      for (const row of documented) {
        const entry = codedByIdentity.get(identity(row));
        assert.equal(row.task, entry.task, `${identity(row)}: the table's task column names the suite that carries the entry`);
        if (row.class === "structural-duplicate") {
          assert.ok(legend.has(row.pointer), `${identity(row)}: ptr "${row.pointer}" is a legend key`);
          assert.equal(legend.get(row.pointer), entry.pointer, `${identity(row)}: the legend's gate and the code's pointer are the same test`);
        } else if (row.class === "duplicate-claim") {
          assert.equal(row.pointer, entry.pointer, `${identity(row)}: ptr names the decided scenario the code points at`);
        } else {
          // `not-black-box` documents the decidable PROXY in prose; the code names the test that
          // drives it. Both are required to be non-empty, and the code's half is resolved by leg 5.
          assert.ok(row.pointer.length > 0, `${identity(row)}: names the proxy that IS driven`);
        }
      }
    },
  },

  {
    // LEG 8. m43/ADR-014 E7: a suite no runner imports is no gate. TECH_DEBT item 50 measured the
    // half that gate cannot see — `acd-test-suite-registration` keys on the runner's TEXT, so an
    // imported-but-never-spread suite reads GREEN there while running never (m35/R4, "bindings
    // imported but never spread are silently-dead fitness functions"). So both are asserted here:
    // the import AND the spread, each exactly once, file-wide.
    name: "loops-ledger/05 leg 8 registration: all six suites are imported AND spread, in their own block, with the story-04 block untouched",
    run: async () => {
      const runner = await read("scripts/test.mjs");
      const unitRunner = await read("scripts/test-unit.mjs");
      const surface = await registrationSurface(root);
      const lines = runner.split(/\r?\n/);
      const occurrences = (text, needle) => text.split(needle).length - 1;

      for (const [index, file] of REGISTERED.entries()) {
        const alias = index < SUITES.length ? SUITES[index].alias : LEDGER_ALIAS;
        assert.ok(await exists(file), `${file}: exists on disk`);
        // 119/03 — the suite is imported by its OWN directory's index and the index is spread by
        // the runner, so the "exactly once" claim is over the whole registration surface. `runner`
        // alone names no suite at all now.
        assert.equal(occurrences(surface, `/${file.split("/").pop()}"`), 1, `${file}: imported EXACTLY once across the registration surface`);
        assert.equal(occurrences(surface, `...${alias},`), 1, `${alias}: SPREAD exactly once across the registration surface — an import with no spread is a suite that never runs (TECH_DEBT 50)`);
        assert.equal(unitRunner.includes(path.basename(file)), false, `${file}: registration has one runner home`);
        assert.equal(alias.startsWith("acdLoop"), false, `${alias}: an alias beginning \`acdLoop\` would be swept into FF-5209's story-04 block assertions`);
        assert.equal(file.startsWith("test/arch/"), false, `${file}: lives in test/, never test/arch/`);
        assert.equal(NINE_GATES.includes(path.basename(file)), false, `${file}: must not collide with milestone 52's own frozen nine; ADR-015 §8 permits later gates in the acd-loop-* namespace`);
      }

      // ── 119/03 AMENDMENT: the labelled BLOCK is gone, and the claim it carried is not ────────
      // These lines asserted that this story's six imports and the nine story-04 gates each sat in
      // one labelled, contiguous block in `scripts/test.mjs`, positionally. Since 119/03 the
      // registry names DIRECTORIES: every suite is imported and spread by the index of the
      // directory that owns it, and this story's six span `test/loop/` while the nine gates span
      // `test/arch/loop/`. There is no block to be contiguous in, and nothing adjacent to assert.
      //
      // What the block was FOR survives above and is asserted over the whole registration surface:
      // each of the six imported EXACTLY once and spread EXACTLY once, none of them registered by
      // `scripts/test-unit.mjs`, and none colliding with milestone 52's frozen nine. The nine's own
      // registration is asserted by its owning index below, by ownership rather than by position.
      const loopIndex = await readFile(path.join(root, "test", "arch", "loop", "index.mjs"), "utf8");
      for (const gate of NINE_GATES) {
        assert.equal(
          (loopIndex.split(`./${gate}"`).length - 1),
          1,
          `${gate}: registered exactly once by its OWN directory's index (test/arch/loop/index.mjs)`,
        );
      }

      // The roster the gate deep-equals, and the fixture helper's placement: it is shared support,
      // not a suite, so `*.test.mjs` — the only thing the registration gate sweeps — is the whole
      // reason it is correctly outside that sweep.
      const archFiles = (await suiteFilesBelow(path.join(root, "test", "arch"))).filter((rel) => rel.split("/").pop().startsWith("acd-loop-"));
      assert.ok(archFiles.length >= NINE_GATES.length, `the acd-loop-* sweep was non-vacuous: ${archFiles.length} files`);
      const archLeaves = new Set(archFiles.map((rel) => rel.split("/").pop()));
      for (const file of NINE_GATES) assert.ok(archLeaves.has(file), `${file}: milestone 52's own gate remains present; later milestones may share the namespace (53/ADR-015 §8)`);
      assert.ok(await exists(FIXTURE_HELPER), `${FIXTURE_HELPER}: exists`);
      assert.equal(FIXTURE_HELPER.endsWith(".test.mjs"), false, "the fixture helper is not a suite, so it is correctly outside the gate's sweep");
      assert.equal(runner.includes(path.basename(FIXTURE_HELPER)), false, "…and is reached through the suites that import it, never registered as one");
    },
  },

  {
    // LEG 9. The milestone's records must name instruments, not memories. F-52-04-H was raised
    // because `VERIFICATION.md` recorded "fixture … green" for fifteen features and nothing on
    // disk could re-run it; the correction is only real if every evidence line names a suite PATH
    // that exists AND is registered — and if the counts it quotes are the ledger's own.
    name: "loops-ledger/05 leg 9 the records name suites that exist: VERIFICATION.md and STATE.md",
    run: async () => {
      const runner = await read("scripts/test.mjs");
      const surface = await registrationSurface(root);
      // NON-VACUITY: an empty rename map answers "unresolved" for every moved path, which is
      // indistinguishable from the strand this reader exists to clear.
      assert.deepEqual(await renameMapProblems(root), []);
      const verification = await read(`${MILESTONE}/VERIFICATION.md`);
      const covered = [];

      for (const story of ["00", "01", "02"]) {
        const lines = verification.split(/\r?\n/);
        const start = lines.findIndex((line) => new RegExp(`^### Story ${story} · `).test(line));
        assert.ok(start >= 0, `VERIFICATION.md carries a story ${story} section`);
        const end = lines.findIndex((line, index) => index > start && /^### Story /.test(line));
        const body = lines.slice(start + 1, end < 0 ? lines.length : end);

        for (const bullet of bullets(body).filter((text) => /verifies →/.test(text))) {
          const target = bullet.match(/verifies →\s*([^\s`]+\.feature)/);
          assert.ok(target, `story ${story}: an evidence bullet's \`verifies →\` names a feature`);
          const feature = `${MILESTONE}/${target[1]}`;
          assert.ok(await exists(feature), `${feature}: the verified feature exists on disk`);
          const oracle = FIFTEEN.find((entry) => entry.feature === feature);
          assert.ok(oracle, `${feature}: is one of the fifteen`);
          covered.push(feature);

          const suitePaths = [...new Set([...bullet.matchAll(/test\/work-loops-[a-z-]+\.test\.mjs/g)].map((match) => match[0]))];
          assert.ok(suitePaths.length > 0, `${path.basename(feature)}: its evidence names a suite path, not a claim`);
          for (const suitePath of suitePaths) {
            const cited = await resolveCitedSuite(suitePath, root);
            assert.ok(
              cited.resolved,
              `${path.basename(feature)}: evidence names ${suitePath}, which is neither on disk nor reachable through a rename this repository recorded`,
            );
            // REGISTERED, at whichever path it resolves to — and against the registration SURFACE,
            // because a suite is imported by its own directory's index now and spread from there.
            assert.ok(
              surface.includes(cited.at.split("/").pop()),
              `${path.basename(feature)}: ${suitePath}${cited.throughRename ? ` (now ${cited.at})` : ""} is registered in the suite registry`,
            );
          }
          assert.equal(/fixture[^.\n]{0,90}green/i.test(bullet), false,
            `${path.basename(feature)}: the evidence still rests on a narrative "fixture … green" claim — the species F-52-04-H was raised against`);

          // The split is legible: a feature whose scenarios are partly owned by a fitness function
          // says so, by FF number.
          const structural = allExcluded.filter((entry) => entry.feature === feature && entry.class === "structural-duplicate");
          if (structural.length > 0) {
            assert.match(bullet, /FF-52\d\d/, `${path.basename(feature)}: ${structural.length} scenarios are decided by a gate, and the evidence must say which`);
          }

          // The counts the evidence quotes are re-derived from the ledger rather than read.
          const primaryCited = await resolveCitedSuite(suitePaths[0], root);
          const primary = SUITES.find((suite) => suite.file === primaryCited.at || suite.file === suitePaths[0]);
          assert.ok(primary, `${path.basename(feature)}: the first suite named is one of this story's`);
          const decided = primary.coverage.decided.filter((entry) => entry.feature === feature).length;
          const all = bullet.match(/all (\d+) scenarios/);
          const partial = bullet.match(/(\d+) of (\d+) scenarios/);
          assert.ok(all || partial, `${path.basename(feature)}: the evidence quotes a scenario count`);
          if (all) {
            assert.equal(decided, Number(all[1]), `${path.basename(feature)}: "all ${all[1]} scenarios" against ${primary.file}'s decided count`);
            assert.equal(Number(all[1]), oracle.scenarios, `${path.basename(feature)}: …and against the feature's own scenario count`);
          } else {
            assert.equal(decided, Number(partial[1]), `${path.basename(feature)}: "${partial[1]} of ${partial[2]}" against ${primary.file}'s decided count`);
            assert.equal(Number(partial[2]), oracle.scenarios, `${path.basename(feature)}: …and its total against the feature's own scenario count`);
          }

          const tables = oracle.rows.length;
          const rows = oracle.rows.reduce((a, b) => a + b, 0);
          const claims = [
            [bullet.match(/the (\d+)-row table\b/), (match) => { assert.equal(tables, 1, `${path.basename(feature)}: "the N-row table" but the feature declares ${tables}`); assert.equal(Number(match[1]), rows); }],
            [bullet.match(/all (\d+) tables? \((\d+) rows\)/), (match) => { assert.equal(tables, Number(match[1])); assert.equal(rows, Number(match[2])); }],
            [bullet.match(/both tables \((\d+) rows/), (match) => { assert.equal(tables, 2); assert.equal(rows, Number(match[1])); }],
            [bullet.match(/all (\d+) table rows/), (match) => assert.equal(rows, Number(match[1]))],
          ].filter(([match]) => match);
          assert.ok(claims.length > 0, `${path.basename(feature)}: the evidence accounts for the feature's ${tables} table(s) and ${rows} rows`);
          for (const [match, check] of claims) check(match);
        }
      }
      assert.deepEqual(sorted(covered), sorted(FIFTEEN.map((entry) => entry.feature)),
        "each of the fifteen features has exactly one corrected evidence line across stories 00, 01 and 02");

      // STATE.md's box, ticked and NAMING the suites rather than asserting greenness.
      const stateLines = section(await read(`${MILESTONE}/STATE.md`), "## Verification");
      assert.ok(stateLines, "STATE.md carries a `## Verification` section");
      const box = bullets(stateLines).find((text) => /@executable.*suite/.test(text));
      assert.ok(box, "…with an @executable suite box");
      assert.match(box, /^\s*- \[x\]/, "the @executable suite box is ticked");
      for (const file of REGISTERED) {
        assert.ok(box.includes(path.basename(file, ".test.mjs")), `STATE.md's verification box names ${file}`);
      }

      // THE TECH_DEBT CLAUSE IS GONE (2026-09-06), and its removal is this leg's own lesson.
      //
      // This leg used to read `wiki/work/TECH_DEBT.md`, cut item 48 out of it, and assert that
      // the entry's PROSE still said `**Status:** **CLOSED`, carried a `**Ratchet:**` paragraph
      // and contained the words "ratchet below stays OPEN". That made a mutable backlog into a
      // fixture: the ledger could not record that item 48's milestone-52 half was discharged —
      // which is the ONE thing a debt ledger is for — without reddening an accepted milestone's
      // suite. It duly did, on 2026-09-05, when a pay-debt pass removed the discharged half.
      //
      // TECH_DEBT.md is a BACKLOG TO BE EMPTIED, not a record. A debt entry's permanence is the
      // opposite of what anyone wants from it, and a control that pins one is asserting that the
      // work will never be paid. What 52/05 actually owes evidence for is above this line and is
      // unchanged: every `verifies →` bullet names a feature that exists and a suite path that is
      // registered in the assembled runner, and no bullet rests on a "fixture … green" claim.
      // The milestone's own VERIFICATION.md is the durable record of what it closed; the ledger
      // is where the remaining debt lives, and it must stay free to shrink.
      //
      // TECH_DEBT item 52 named this clause its sharpest instance for a related reason (a
      // positional cut whose sentinel could drift onto a different item). Both faults leave with it.
    },
  },
];
