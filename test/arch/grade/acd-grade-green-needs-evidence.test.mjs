// FF-5402 (milestone 54 / ADR-005) — GREEN IS POSITIVE EVIDENCE, NEVER AN EXIT CODE.
//
// "No path in `src/**` yields `verdict: "pass"` without a parsed report, and the evidence
//  measured against the floor is the cases that RAN — `total - skipped > 0` and `>= floor`
//  (ADR-005 §2(c) AS AMENDED 2026-08-22, finding F-54-00-2); the exit status is checked
//  before the report is read; `GRADE_VERDICTS` is a frozen exported triple."
//
// THE AMENDMENT IS PART OF THE CONTROL, not a footnote to it. Before it, four cases each
// carrying `# SKIP` at a declared floor of four graded `pass` with no codes — a green bought
// with cases that never executed, inside the module built to refuse greens bought cheaply.
// Lane (f) below is exhaustive over that shape so it cannot come back by a floor nobody
// re-checked.
//
// WHY THIS RATCHET EXISTS, MEASURED FOUR TIMES ON THIS TREE: 66's audit found 4 of 5 guards
// green for the wrong reason; `m46/ADR-006` records a sweep that would pass VACUOUSLY;
// `node --test test/arch/audit/acd-controls-never-execute.test.mjs` reports one pass and exit 0
// for a file whose arch-tests did not run; and ADR-007 §2d found sixteen unprobed controls
// reading as probed. "Green for the wrong reason" is this codebase's recurring shape, and
// this file is one of the two ratchets on it.
//
// THE STRUCTURAL HALF AND THE EXHAUSTIVE HALF, BOTH. A text sweep alone would say only that
// the literal `"pass"` appears in one module; it cannot say that the module never REACHES
// it without evidence. So lane (d) drives the real compiler over the FULL CROSS PRODUCT of
// the four pieces and asserts that `pass` is unreachable while any one of them is missing —
// `m47/R8`'s rule that a gate's non-vacuity proof must be self-contained and reachable.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileGrade, evidenceFloor, GRADE_VERDICTS } from "../../../src/work/grade.mjs";
// THE ONE HOME for cutting source (TECH_DEBT item 24 — its `stripComments` strips LINE
// comments FIRST, so a `//` comment containing `/*` cannot open a phantom block that blinds
// every sweep below). A second brace balancer written beside it is the species this repo has
// been bitten by repeatedly; this file writes none.
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");

const THE_ONE_HOME = "src/work/grade.mjs";

async function readSources() {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        sources.push({ file: path.relative(repoRoot, full).replaceAll("\\", "/"), text: await readFile(full, "utf8") });
      }
    }
  };
  await walk(srcDir);
  return sources;
}

// Every sweep reads bodies stripped through the ONE HOME, and refuses a body that carries
// less code than it leaves behind — a stripper is a detector's eyesight and its failure mode
// is silent (item 24 fix (b)).
function strippedSources(sources, strip = stripComments) {
  const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  return sources.map((entry) => {
    const body = strip(entry.text);
    const hidden = codeLines(stripComments(entry.text)) - codeLines(body);
    assert.ok(hidden <= 0, `the comment stripper hid ${hidden} line(s) of code in ${entry.file} — TECH_DEBT item 24`);
    return { ...entry, body };
  });
}

// A verdict ASSIGNMENT: `verdict: "pass"` / `verdict = "pass"` / `verdict: 'pass'`. A module
// that merely COMPARES against the word (`verdict === "pass"`, the ratchet's own read) is not
// yielding one, and is not a finding.
const VERDICT_PASS_ASSIGNMENT = /\bverdict\s*[:=](?!=)\s*["'`]pass["'`]/g;

export function passVerdictSites(sources) {
  const sites = [];
  for (const { file, body } of sources) {
    for (const match of body.matchAll(VERDICT_PASS_ASSIGNMENT)) {
      sites.push({ file, at: match[0] });
    }
  }
  return sites;
}

// The four pieces of evidence, as knobs. `null` on any one of them is that piece REMOVED.
const RUNNER = { command: ["node", "scripts/test.mjs"], cwd: "/repo", exit: 0, durationMs: 5, outcome: "completed" };
const RUBRIC = (floor) => ({ report: { format: "tap", path: "report.tap", floor } });
const GREEN_TWO = "ok - the first case\nok - the second case\n";

// (a) exists  (b) parses  (c) at/above floor and non-empty  (d) every case carries a status
const PIECES = {
  exists: [
    { label: "exists", report: (text) => ({ present: true, text }) },
    { label: "absent", report: () => ({ present: false, text: null }) },
  ],
  parses: [
    { label: "parses", text: GREEN_TWO },
    { label: "unparseable", text: "<html><body>everything is fine</body></html>" },
  ],
  floor: [
    { label: "at the floor", floor: 2 },
    { label: "below the floor", floor: 40 },
  ],
  statuses: [
    { label: "every case has a status", suffix: "" },
    // A case ANNOUNCED and never resolved — a killed runner's real leftover.
    { label: "one case has none", suffix: "# Subtest: a case the deadline cut off\n" },
  ],
};

export const archTests = [
  {
    name: "arch/FF-5402: `GRADE_VERDICTS` is a FROZEN, exported triple, and the third member is not invented",
    run: () => {
      assert.ok(Object.isFrozen(GRADE_VERDICTS), "the triple is frozen");
      assert.deepEqual([...GRADE_VERDICTS], ["pass", "fail", "indeterminate"]);
      assert.throws(() => {
        GRADE_VERDICTS.push("probably");
      }, "a frozen array refuses a fourth verdict");
      // Every verdict the compiler can produce is a member — no path invents a fourth.
      assert.ok(GRADE_VERDICTS.includes(compileGrade({ ref: "x", rubric: null }).verdict));
    },
  },

  {
    name: "arch/FF-5402: exactly ONE module under src/ yields `verdict: \"pass\"`, and it is the grade leaf",
    run: async () => {
      const sources = strippedSources(await readSources());
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);
      const sites = passVerdictSites(sources);
      assert.deepEqual(
        [...new Set(sites.map((site) => site.file))],
        [THE_ONE_HOME],
        `a pass verdict has ONE producer, named rather than counted: ${JSON.stringify(sites, null, 1)}`,
      );
    },
  },

  {
    name: "arch/FF-5402: the exit status is checked BEFORE the report is read (`m11/R2`), inside the one compiler",
    run: async () => {
      const text = await readFile(path.join(repoRoot, THE_ONE_HOME), "utf8");
      // Cut on the language's own structure, never a character window.
      const body = functionBody(stripComments(text), "export function compileGrade");
      assert.ok(body != null, "compileGrade's body was found — a null here is a moved declaration, not a green");
      assert.ok(body.length > 400, "non-vacuity: the body was really extracted");

      const exitCheck = body.search(/outcome\s*===\s*["'`](?:spawn-failed|timed-out)["'`]/);
      const reportRead = body.search(/normaliseReport\s*\(/);
      assert.ok(exitCheck >= 0, "the runner outcome is checked");
      assert.ok(reportRead >= 0, "the report is read");
      assert.ok(
        exitCheck < reportRead,
        "`m11/R2`: a command that wraps a subprocess must check the subprocess's exit status BEFORE reading its expected output",
      );
    },
  },

  {
    name: "arch/FF-5402: EXHAUSTIVE — over the full cross product of the four pieces, `pass` is reachable ONLY when all four are present",
    run: () => {
      let complete = 0;
      let incomplete = 0;
      for (const exists of PIECES.exists) {
        for (const parses of PIECES.parses) {
          for (const floor of PIECES.floor) {
            for (const statuses of PIECES.statuses) {
              const allFour = exists.label === "exists" && parses.label === "parses" && floor.label === "at the floor" && statuses.label === "every case has a status";
              const grade = compileGrade({
                ref: "54/00",
                rubric: RUBRIC(floor.floor),
                runner: RUNNER,
                report: exists.report(`${parses.text}${statuses.suffix}`),
              });
              const where = `${exists.label} / ${parses.label} / ${floor.label} / ${statuses.label}`;
              if (allFour) {
                complete += 1;
                assert.equal(grade.verdict, "pass", `all four pieces present → pass (${where})`);
                assert.deepEqual([...grade.codes], [], `…and no code (${where})`);
              } else {
                incomplete += 1;
                assert.notEqual(grade.verdict, "pass", `a missing piece can never buy a pass (${where})`);
              }
            }
          }
        }
      }
      assert.equal(complete, 1, "exactly one cell of the cross product has all four pieces");
      assert.equal(incomplete, 15, "…and the other fifteen are each proven unable to pass");
    },
  },

  {
    name: "arch/FF-5402: an exit status can VETO a pass and can never buy one",
    run: () => {
      const passing = { ref: "54/00", rubric: RUBRIC(1), runner: RUNNER, report: { present: true, text: GREEN_TWO } };
      assert.equal(compileGrade(passing).verdict, "pass");
      // Veto: the SAME evidence with a non-zero exit is refused.
      assert.notEqual(compileGrade({ ...passing, runner: { ...RUNNER, exit: 1 } }).verdict, "pass");
      // Never buys: a zero exit with NO evidence at all is refused too, in every shape.
      for (const report of [null, { present: false, text: null }, { present: true, text: "TAP version 13\n1..0\n" }]) {
        assert.notEqual(compileGrade({ ...passing, report }).verdict, "pass", `exit 0 with ${JSON.stringify(report)} is not a pass`);
      }
    },
  },

  {
    name: "arch/FF-5402: the evidence floor is never below one — an empty report cannot pass, with or without configuration",
    run: () => {
      assert.equal(evidenceFloor({}), 1, "an undeclared floor is still a case that ran");
      assert.equal(evidenceFloor({ declared: 0 }), 1, "a declared zero cannot open the door");
      assert.equal(evidenceFloor({ declared: -5 }), 1, "…nor a negative one");
      assert.equal(evidenceFloor({ declared: 7 }), 7, "a declared floor raises it");
      assert.equal(evidenceFloor({ declared: 2, history: [{ ref: "a", verdict: "pass", cases: { total: 9 } }], ref: "a" }), 9, "…and so does the ratchet");
    },
  },

  {
    name: "arch/FF-5402: the floor measures cases that RAN — a report of nothing but skips cannot pass at ANY floor, and the ratchet's bar is drawn on the same measure",
    run: () => {
      const RUBRIC_AT = (floor) => ({ report: { format: "tap", path: "report.tap", floor } });
      const skips = (n) => Array.from({ length: n }, (_, i) => `ok - case ${i + 1} # SKIP not on this platform`).join("\n") + "\n";
      const runs = (n) => Array.from({ length: n }, (_, i) => `ok - case ${i + 1}`).join("\n") + "\n";

      // EXHAUSTIVE over the knobs that could each independently re-open the door.
      let refused = 0;
      for (const floor of [null, 1, 2, 4, 40]) {
        for (const count of [1, 2, 4]) {
          for (const history of [[], [{ ref: "54/00", verdict: "pass", cases: { total: count, failed: 0, skipped: count } }]]) {
            const grade = compileGrade({ ref: "54/00", rubric: RUBRIC_AT(floor), runner: RUNNER, report: { present: true, text: skips(count) }, history });
            refused += 1;
            assert.notEqual(grade.verdict, "pass", `${count} case(s), all skipped, floor ${floor} — nothing ran, so nothing is proven`);
            assert.ok(grade.codes.includes("report-vacuous"), "…and it is refused as vacuous AS EVIDENCE, coining no tenth code");
            assert.equal(grade.cases.skipped, count, "…while the observed counts are still reported (ADR-005 §4)");
          }
        }
      }
      assert.equal(refused, 30, "every cell of the cross product was driven");

      // NON-VACUITY — the guard refuses skips, not everything: the SAME floors pass the
      // moment the cases actually run. A control that refused both would look identical here.
      for (const floor of [null, 1, 2]) {
        assert.equal(compileGrade({ ref: "54/00", rubric: RUBRIC_AT(floor), runner: RUNNER, report: { present: true, text: runs(2) } }).verdict, "pass", `two cases that RAN clear a floor of ${floor}`);
      }

      // The bar and the comparison are ONE measure. A bar drawn from the enumerated total
      // while the comparison reads what ran would refuse a healthy re-run of a skipping suite.
      assert.equal(evidenceFloor({ history: [{ ref: "a", verdict: "pass", cases: { total: 40, failed: 0, skipped: 10 } }], ref: "a" }), 30, "the ratchet's bar counts what ran, not what was enumerated");
      assert.equal(evidenceFloor({ history: [{ ref: "a", verdict: "pass", cases: { total: 9 } }], ref: "a" }), 9, "a history entry omitting `skipped` reads as none, never as NaN");
    },
  },

  {
    name: "arch/FF-5402: NON-VACUITY — a planted `verdict: \"pass\"` in a second module IS detected, and a comparison is NOT",
    run: () => {
      const planted = passVerdictSites([
        { file: "src/pretend-grader.mjs", body: 'return { ref, verdict: "pass", codes: [] };\n' },
      ]);
      assert.deepEqual(planted.map((site) => site.file), ["src/pretend-grader.mjs"], "a second producer of a pass verdict IS a finding");
      assert.deepEqual(
        passVerdictSites([{ file: "src/pretend-reader.mjs", body: 'if (grade.verdict === "pass") advance();\nconst passed = record.verdict == "pass";\n' }]),
        [],
        "…and READING the verdict is not producing one — 54/02 and 54/03 must be able to branch on it",
      );
      // The assignment form is caught however it is spelled.
      for (const spelling of ['verdict: "pass"', "verdict: 'pass'", 'verdict = "pass"', "verdict:  `pass`"]) {
        assert.equal(passVerdictSites([{ file: "src/x.mjs", body: `${spelling};\n` }]).length, 1, `\`${spelling}\` is detected`);
      }
    },
  },

  {
    name: "arch/FF-5402: NON-VACUITY — the item-24 stripper guard has teeth here too, driven with a TRAP-ORDER stripper",
    run: async () => {
      const trapOrder = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
      const sources = await readSources();
      assert.throws(
        () => strippedSources(sources, trapOrder),
        /TECH_DEBT item 24/,
        "a blinded stripper must be refused at the door — a sweep that cannot see a region reports green over it",
      );
      assert.equal(strippedSources(sources).length, sources.length, "…and the shipped stripper is 0 false positives over the same tree");
    },
  },
];
