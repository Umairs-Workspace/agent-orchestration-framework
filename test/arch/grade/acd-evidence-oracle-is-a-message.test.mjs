// FF-5906 (milestone 59 / ADR-002 §3, ADR-004 §3) — EVIDENCE IS RE-RUN, NEVER RE-READ,
// AND THE ORACLE IS THE MESSAGE.
//
// "Every verdict the evidence lane emits is derived from a spawn result — an observed exit code
//  and captured output — and NO VERDICT IS REACHABLE FROM THE RECORDED PROSE ALONE: with the
//  child result withheld, every row reports `evidence-unrunnable` rather than confirming what the
//  register claims; the comparison performed on a failing control is over the FAILURE MESSAGE,
//  and no code path compares a pass/fail count to reach a verdict; and a citation that does not
//  resolve, is not registered, or exceeds its deadline reports WHAT WAS TRIED, naming the path
//  and the deadline."
//
// ── WHY THE COUNT ORACLE IS BANNED STRUCTURALLY RATHER THAN BY INTENTION ─────────────────────
//
// Spike 56 measured two things that together make a counter useless here. First, NINE of this
// repository's 341 arch gates are STANDING RED — so on the gate that matters, breaking the thing
// it protects moves no tally: one failure before, one failure after, and the instrument reports
// that nothing happened. Second, and worse: banking five REAL violations into a shrink-only
// ratchet's baseline made the arch set report one FEWER failure, 9 → 8. The gaming move does not
// evade a count oracle. It IMPROVES it.
//
// 66 already ships `acd-oracle-is-a-message-not-a-count` for milestone 57's four added modules.
// This is the same rule, held over the module 59/02 adds, and it is asserted THREE WAYS rather
// than one, because each way is blind where the others see:
//
//   (A) SOURCE-LEVEL — no tally identifier and no tally comparison in the shipped module. Catches
//       the shape before it has a caller.
//   (B) DIFFERENTIAL — hold one observation fixed and vary ONLY the message: the verdict moves.
//       Hold the message fixed and vary ONLY the number of cases: the verdict does not. This is
//       the lane a rename cannot satisfy, and it is where a count oracle would actually show.
//   (C) WITHHOLDING — with the child's result taken away, no row may confirm what the register
//       claims. A lane that can agree with its input without running anything has not re-run
//       anything, and there is no source pattern for that; only removing the evidence shows it.
//
// EVERY LANE ASSERTS ITS FLOOR BEFORE ITS CLAIM. A sweep that read nothing makes every
// "no offender found" below it vacuously true, which is ADR-004 §1's whole subject.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
import {
  DRIVE_PROGRAM,
  DRIVE_RESULT_SENTINEL,
  EVIDENCE_FINDING_CODES,
  EVIDENCE_VERDICTS,
  MESSAGE_NORMALISATIONS,
  REPRODUCED_VERDICTS,
  SIZE_KINDS,
  dispositionOf,
  messagesAgree,
  findingsForRow,
  runEvidence,
  sizeFor,
  verdictFor,
} from "../../../src/work-audit/evidence.mjs";
// THE ONE HOME for the control corpus (see that module's header for why it is not written twice).
import { EXECUTED_CASES, withControlFixtureRepo as withFixtureRepo } from "../../support/evidence-control-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THE_LANE = "src/work-audit/evidence.mjs";
const THE_DRIVER = DRIVE_PROGRAM;

// ── THE COUNT-ORACLE DETECTORS ───────────────────────────────────────────────────────────────
//
// Held in the same VOCABULARY as `acd-oracle-is-a-message-not-a-count` (57/FF-5706), deliberately:
// two controls enforcing one ADR clause must not drift into two rules. `failureReason`,
// `terminalFailure` and `state === "failed"` are NOT tallies — the vocabulary requires an explicit
// count noun welded to the pass/fail word, which is what makes this a count rather than a state.
const TALLY_IDENTIFIER = /\b(?:pass(?:ed|ing|es)?|fail(?:ed|ing|ures?|s)?|green|red|arch)(?:Count|Total|Tally|Num|Number)\b|\b(?:count|total|tally|num|number)Of(?:Pass|Fail|Green|Red|Arch)/iu;
const TALLY_LENGTH = String.raw`(?:pass(?:es|ed|ing)?|fail(?:ed|ing|ures?|s)?|greens?|reds?)\s*(?:\?\.|\.)\s*(?:length|size)`;
const COMPARISON = String.raw`(?:[<>]=?|[!=]==?)`;
const TALLY_COMPARISON_LEFT = new RegExp(String.raw`\b${TALLY_LENGTH}\s*${COMPARISON}`, "iu");
const TALLY_COMPARISON_RIGHT = new RegExp(String.raw`${COMPARISON}\s*\b${TALLY_LENGTH}`, "iu");
// The runner surface 57 also refuses: a module that parses a runner's report is one step from an
// oracle over its tallies. `--test` is the sharpest member here — 56 measured `node --test`
// reporting "pass 883, fail 0" while 862 of 864 files executed none of their entries, so a lane
// reaching for it would confirm every row it was asked about.
const RUNNER_SURFACE = /node:test\b|--test\b|test-rubric|\btap\b|\bTAP\b/u;

const read = async (relative) => await readFile(path.join(repoRoot, relative), "utf8");

// The stripper's own non-vacuity witness, in the one home's shape (66/00 F-01/F-06): a
// comment-stripping order that hides code would make every scan below blind to that region.
function strippedBody(file, text) {
  const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  const body = stripComments(text);
  assert.ok(codeLines(body) > 50, `${file}: ${codeLines(body)} code lines were actually read`);
  return body;
}

const ITEM_DIR = path.join(path.sep === "\\" ? "C:\\ff5906" : "/ff5906", "wiki", "work", "99_milestone_fixture");

// A register carrying EVERY row shape the lane can meet: a green claim, a standing-red claim, a
// row citing two controls, a row citing nothing, a row citing a file that is not there, and a row
// recording a size. Six rows, so the withholding lane below is a claim about a population.
const ARCHITECTURE = [
  "# 99",
  "",
  "## Fitness functions",
  "",
  "| id | invariant | enforced by (arch-test) | from |",
  "|---|---|---|---|",
  "| **FF-01** | a green claim | `test/arch/green.test.mjs` | ADR-001 |",
  "| **FF-02** | a standing-red claim | `test/arch/red.test.mjs` | ADR-001 |",
  "| **FF-03** | two controls at once | `test/arch/green.test.mjs` and `test/arch/red.test.mjs` | ADR-001 |",
  "| **FF-04** | no control at all | enforced by review | ADR-001 |",
  "| **FF-05** | a citation that resolves to nothing | `test/arch/gone.test.mjs` | ADR-001 |",
  "| **FF-06** | a recorded size | `test/arch/green.test.mjs` | ADR-001 |",
  "",
].join("\n");

const VERIFICATION = [
  "# 99 — verification",
  "",
  "## Fitness functions",
  "",
  "| id | enforced by | result | red probe |",
  "|---|---|---|---|",
  "| **FF-01** | `test/arch/green.test.mjs` | **GREEN** — it holds | Planted a violation and it screamed |",
  "| **FF-02** | `test/arch/red.test.mjs` | **RED** — standing red | Observed `b: the invariant no longer holds` |",
  "| **FF-03** | two controls | **GREEN** — both hold | Planted a violation in each |",
  "| **FF-05** | `test/arch/gone.test.mjs` | **GREEN** — it holds | Planted a violation |",
  "| **FF-06** | `test/arch/green.test.mjs` (9 lanes) | **GREEN** — it holds | Planted a violation |",
  "",
].join("\n");

const ITEM = {
  number: "99", type: "milestone", slug: "fixture", name: "99_milestone_fixture", ref: "99", parent: null,
  dir: ITEM_DIR, meta: { status: "in-progress" },
  docTexts: { "ARCHITECTURE.md": ARCHITECTURE, "VERIFICATION.md": VERIFICATION },
};

// One observation, complete, so a differential can vary exactly one field of it.
const observationWith = (fields) => ({
  control: "test/arch/red.test.mjs",
  status: "ran",
  attempted: "node src/work/audit-drive.mjs test/arch/red.test.mjs",
  deadlineMs: 60_000,
  message: null,
  cases: 2,
  caseReports: [],
  detail: "ran",
  ...fields,
});

export const archTests = [
  {
    name: "arch/59 FF-5906: (A) the lane carries no pass/fail tally identifier, no tally comparison and no test-runner surface — the count oracle 56 measured as IMPROVED by the gaming move",
    run: async () => {
      const raw = await read(THE_LANE);
      const body = strippedBody(THE_LANE, raw);
      assert.doesNotMatch(body, TALLY_IDENTIFIER, `${THE_LANE}: carries a pass/fail tally identifier — this lane's verdicts compare dispositions and messages, never counts (ADR-004 §3)`);
      assert.doesNotMatch(body, TALLY_COMPARISON_LEFT, `${THE_LANE}: compares the length of a pass/fail collection — the oracle 56 measured as improved by banking real violations`);
      assert.doesNotMatch(body, TALLY_COMPARISON_RIGHT, `${THE_LANE}: compares against the length of a pass/fail collection — same shape, other side`);
      assert.doesNotMatch(body, RUNNER_SURFACE, `${THE_LANE}: names a test-runner surface — \`node --test\` reports "pass 883, fail 0" on a tree where 862 of 864 files execute nothing (spike 56), so a lane reaching for it confirms every row it is asked about`);

      // NON-VACUITY: the detectors fire on planted shapes, and stay silent on this lane's real
      // idioms — otherwise the four assertions above are statements about nothing.
      assert.match("const failCount = broken.length;", TALLY_IDENTIFIER);
      assert.match("if (after.failures.length < before.failures.length) return 'better';", TALLY_COMPARISON_LEFT);
      assert.match("if (recordedFailures !== failures.length) return 'changed';", TALLY_COMPARISON_RIGHT);
      assert.match('import test from "node:test";', RUNNER_SURFACE);
      for (const shipped of [
        "const broken = caseReports.filter((report) => report?.ok !== true);",
        "return message == null ? 'passing' : 'failing';",
        "if (recorded.cases === observation.cases) return 'confirmed';",
      ]) {
        assert.doesNotMatch(shipped, TALLY_IDENTIFIER, shipped);
        assert.doesNotMatch(shipped, TALLY_COMPARISON_LEFT, shipped);
        assert.doesNotMatch(shipped, TALLY_COMPARISON_RIGHT, shipped);
      }
    },
  },

  {
    name: "arch/59 FF-5906: (B) THE DIFFERENTIAL — one observation, varied only in its MESSAGE, moves the verdict; varied only in its CASE COUNT, it does not",
    run: () => {
      const recorded = { controls: ["test/arch/red.test.mjs"], result: "red", message: "b: the invariant no longer holds", cases: 2 };

      // Vary ONLY the message. Same status, same case count, same everything else.
      const same = observationWith({ message: "b: the invariant no longer holds" });
      const different = observationWith({ message: "b: something else entirely broke" });
      const none = observationWith({ message: null });
      assert.equal(verdictFor(recorded, same), "unchanged");
      assert.equal(verdictFor(recorded, different), "changed", "the message moved and the verdict moved with it");
      assert.equal(verdictFor(recorded, none), "repaired");
      assert.equal(new Set([verdictFor(recorded, same), verdictFor(recorded, different), verdictFor(recorded, none)]).size, 3, "three messages, three verdicts");

      // Vary ONLY the case count, across two orders of magnitude, in both directions. THE VERDICT
      // DOES NOT MOVE — which is the property a count oracle cannot have.
      for (const cases of [0, 1, 2, 3, 9, 117, 1252]) {
        assert.equal(verdictFor(recorded, observationWith({ message: same.message, cases })), "unchanged", `cases=${cases} must not change the verdict`);
        assert.equal(verdictFor(recorded, observationWith({ message: different.message, cases })), "changed", `cases=${cases} must not change the verdict`);
      }
      // …and varying the RECORDED count does not move it either, in either direction.
      for (const cases of [null, 0, 1, 2, 9, 1252]) {
        assert.equal(verdictFor({ ...recorded, cases }, different), "changed", `recorded cases=${cases} must not change the verdict`);
      }

      // THE STANDING-RED CASE, STATED AS 56 MEASURED IT: identical tallies on both sides, and the
      // instrument still sees the break.
      const before = observationWith({ message: "b: reason A", cases: 2, caseReports: [{ name: "a", ok: true }, { name: "b", ok: false }] });
      const after = observationWith({ message: "b: reason B", cases: 2, caseReports: [{ name: "a", ok: true }, { name: "b", ok: false }] });
      assert.equal(before.cases, after.cases);
      assert.equal(before.caseReports.filter((entry) => entry.ok).length, after.caseReports.filter((entry) => entry.ok).length);
      assert.notEqual(verdictFor({ ...recorded, message: "b: reason A" }, before), verdictFor({ ...recorded, message: "b: reason A" }, after));

      // The disposition itself is read off the message, so one failing case and fifty are the
      // same disposition and a different message.
      assert.equal(dispositionOf("one thing broke"), "failing");
      assert.equal(dispositionOf(null), "passing");
      assert.equal(verdictFor.length, 2, "the verdict is a function of (what was recorded, what one child observed) and nothing else");
    },
  },

  {
    name: "arch/59 FF-5906: (B2) a verdict that CONTRADICTS is unreachable without an observed failure message — the property behind the review's unreproduced cold-sweep report",
    run: () => {
      // WHY THIS LANE EXISTS. At review the architect saw `evidence-contradicted` findings whose
      // text ended "…and it produced: <no message>", twice, both on the first (cold) sweep of a
      // session, and could not reproduce them in ~30 later sweeps. That pairing should not be
      // constructible: `contradicted` requires a FAILING disposition, a failing disposition
      // requires a non-empty message, and the verdict and the finding read the same frozen
      // observation. Reproduction was attempted and failed (see STATE.md); what is landed instead
      // is the property itself, asserted exhaustively, so that if the pairing ever does become
      // reachable it is a red gate rather than an anecdote.
      const empties = [null, undefined, "", "   ", String.fromCharCode(10), String.fromCharCode(9) + " "];
      const recordedShapes = [
        { controls: ["c"], result: "green", message: null, cases: null },
        { controls: ["c"], result: "green", message: "a recorded failure", cases: 3 },
        { controls: ["c"], result: "red", message: "a recorded failure", cases: 3 },
        { controls: ["c"], result: null, message: null, cases: null },
        { controls: ["c"], result: null, message: "a recorded failure", cases: 9 },
      ];
      let checked = 0;
      for (const recorded of recordedShapes) {
        for (const message of empties) {
          for (const cases of [null, 0, 1, 2, 1252]) {
            const verdict = verdictFor(recorded, observationWith({ message, cases }));
            checked += 1;
            assert.notEqual(verdict, "contradicted", `a control that produced no message cannot contradict a register (recorded=${JSON.stringify(recorded.result)}, message=${JSON.stringify(message)})`);
            assert.notEqual(verdict, "changed", "…nor can it be a CHANGED failure message");
            assert.ok(["confirmed", "repaired"].includes(verdict), `${verdict} for a passing observation`);
          }
        }
      }
      assert.equal(checked, recordedShapes.length * empties.length * 5, `the matrix was actually walked: ${checked} combinations`);
      // …and the converse, so the lane is not passing because nothing ever contradicts: the same
      // recorded rows WITH a message do contradict, and the message is what the finding carries.
      const observed = observationWith({ message: "b: the invariant no longer holds" });
      assert.equal(verdictFor(recordedShapes[0], observed), "contradicted");
      const [finding] = findingsForRow({ recorded: { ...recordedShapes[0], id: "FF-01" }, control: "c", register: "R", verdict: "contradicted", observation: observed, size: sizeFor(recordedShapes[0], observed) });
      assert.match(finding.message, /the invariant no longer holds/u, "the finding quotes the message the verdict was reached from — one observation, read once");
      assert.doesNotMatch(finding.message, /<no message>/u);
    },
  },

  {
    name: "arch/59 FF-5906: (C) WITHHELD — with the child's result taken away, every row reports evidence-unrunnable and not one confirms what the register claims",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const report = await runEvidence({ repoRoot: root, items: [ITEM], observe: async () => null });
        assert.ok(report.rows.length >= 6, `the register really was read: ${report.rows.length} rows`);
        for (const row of report.rows) {
          assert.notEqual(row.verdict, "confirmed", `${row.id} confirmed a claim with no evidence behind it`);
          assert.equal(row.basis, "not-executed", `${row.id}`);
          assert.ok(["unrunnable", "no-control"].includes(row.verdict), `${row.id}: ${row.verdict}`);
        }
        const codes = new Set(report.findings.map((finding) => finding.code));
        assert.ok(codes.has("evidence-unrunnable"), "the withheld rows report that they could not be run");
        assert.ok(codes.has("evidence-none-reproduced"), "…and the report says no evidence was reproduced");
        assert.deepEqual([...report.reproduced], [], "nothing that could not be run is counted as evidence");

        // …and it is not that the lane simply never confirms: the SAME register, with the child
        // restored, confirms. Without this the lane above passes on a broken lane.
        const live = await runEvidence({ repoRoot: root, items: [ITEM] });
        assert.ok(live.rows.some((row) => row.verdict === "confirmed"), "the same register DOES confirm when the control is actually run");
        assert.ok(live.rows.every((row) => EVIDENCE_VERDICTS.includes(row.verdict)));
      });
    },
  },

  {
    name: "arch/59 FF-5906: every verdict is derived from a SPAWN RESULT — the lane's only route to a child is the one seam, and the observed exit code answers runnability while the message answers pass or fail",
    run: async () => {
      const raw = await read(THE_LANE);
      const body = strippedBody(THE_LANE, raw);

      // The single route: the seam, imported by name, and no second door.
      assert.match(body, /import\s*\{[^}]*\brunBounded\b[^}]*\}\s*from\s*"\.\/spawn\.mjs"/u, "execution comes from 59/01's bounded seam");
      assert.doesNotMatch(body, /node:child_process/u, "…and not from a second import of the spawn door");
      assert.doesNotMatch(body, /\bimport\s*\(/u, "…nor from a dynamic import(), which would execute a cited module's scope inside this process (66/ADR-004 §2)");
      for (const door of ["execSync", "execFileSync", "spawnSync", "fork("]) {
        assert.equal(body.includes(door), false, `the lane must not name ${door}`);
      }

      // The exit code is consulted, and it is consulted for RUNNABILITY. Both halves are asserted:
      // that it is read at all (FF-5906 says the verdict is derived from an observed exit code and
      // captured output), and that the PURE verdict function never sees one.
      assert.match(body, /result\.exitCode/u, "the observed exit code is read");
      assert.match(body, /result\.stdout/u, "…and the captured output");
      assert.match(body, /result\.stderr/u, "…including stderr, which is where a control's failure text arrives");
      // THE CUT IS THE LANGUAGE'S OWN, from the one home (`test/support/source-slice.mjs`). An
      // `indexOf` sentinel end would assume a declaration order nothing pins, and F-47-04-ARCH-2
      // records six instruments in this repo made confidently wrong about the tree that way.
      const verdictSource = functionBody(body, "export function verdictFor");
      assert.ok(verdictSource != null && verdictSource.length > 200, "the verdict function's body was cut and read");
      assert.doesNotMatch(verdictSource, /exitCode/u, "the VERDICT never reads an exit code — 'it ran' and 'it passed' are two questions");
      assert.doesNotMatch(verdictSource, /\.cases\b/u, "…and never a case count");
      assert.match(verdictSource, /dispositionOf\(observation\.message\)/u, "the verdict is derived from the observed MESSAGE");
      assert.match(verdictSource, /messagesAgree\(/u, "…and a failing control is compared on that message");
    },
  },

  {
    name: "arch/59 FF-5906: a citation that does not resolve, is not registered, or exceeds its deadline reports WHAT WAS TRIED — naming the path, the runner and the deadline",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const registerPath = path.join(ITEM_DIR, "ARCHITECTURE.md");
        const oneRow = (control) => ({
          ...ITEM,
          docTexts: {
            "ARCHITECTURE.md": ["# 99", "", "## Fitness functions", "", "| id | invariant | enforced by | from |", "|---|---|---|---|", `| **FF-01** | x | \`${control}\` | ADR-001 |`, ""].join("\n"),
          },
        });

        // (i) DOES NOT RESOLVE — the path it tried.
        const unresolved = await runEvidence({ repoRoot: root, items: [oneRow("test/arch/gone.test.mjs")] });
        const [missing] = unresolved.findings.filter((finding) => finding.code === "evidence-unrunnable");
        assert.equal(unresolved.rows[0].verdict, "unrunnable");
        assert.ok(missing.message.includes(path.resolve(root, "test/arch/gone.test.mjs")), `names the path it tried: ${missing.message}`);
        assert.equal(missing.path, registerPath, "anchored on the register that makes the claim");

        // (ii) NOT REGISTERED — the runner it looked in, and a DIFFERENT code from (i).
        const unregistered = await runEvidence({
          repoRoot: root,
          items: [oneRow("test/arch/green.test.mjs")],
          registration: { runner: "scripts/test.mjs", assembles: () => false },
        });
        const [notAssembled] = unregistered.findings.filter((finding) => finding.code === "evidence-unregistered");
        assert.equal(unregistered.rows[0].verdict, "unregistered");
        assert.match(notAssembled.message, /scripts\/test\.mjs/u, "names the runner it looked in");
        assert.notEqual(notAssembled.code, missing.code, "'not there' and 'nothing assembles it' are two findings");

        // (iii) EXCEEDS ITS DEADLINE — the deadline applied, and NOT a failing control. A real
        // child, a real bound, a real kill.
        const expired = await runEvidence({ repoRoot: root, items: [oneRow("test/arch/slow.test.mjs")], deadlineMs: 750 });
        const [timedOut] = expired.findings.filter((finding) => finding.code === "evidence-timed-out");
        assert.equal(expired.rows[0].verdict, "timed-out");
        assert.match(timedOut.message, /750ms deadline/u, "names the deadline that was applied");
        assert.equal(expired.findings.some((finding) => finding.code === "evidence-contradicted"), false, "slow is not broken");
        assert.equal(expired.rows[0].deadlineMs, 750, "…and the deadline is reported PER CONTROL, on the row");

        // THE THREE ARE THREE, and none of them is silence.
        assert.equal(new Set([unresolved.rows[0].verdict, unregistered.rows[0].verdict, expired.rows[0].verdict]).size, 3);
        for (const report of [unresolved, unregistered, expired]) {
          assert.ok(report.findings.length > 0, "…and each says so rather than reporting clean");
          assert.equal(report.rows[0].basis, "not-executed");
        }
      });
    },
  },

  {
    name: "arch/59 FF-5906: the finding envelope and the verdict set are FROZEN, and every code is reachable by a fixture — an unreachable code is as much a defect as an unfrozen one",
    run: async () => {
      assert.deepEqual([...EVIDENCE_FINDING_CODES].sort(), [
        "evidence-changed",
        "evidence-contradicted",
        "evidence-declares-no-control",
        "evidence-no-register",
        "evidence-none-reproduced",
        "evidence-registration-unchecked",
        "evidence-repaired",
        "evidence-size-drift",
        "evidence-still-failing",
        "evidence-timed-out",
        "evidence-unregistered",
        "evidence-unrunnable",
      ], "adding a code is an ADR-level act, not an edit to a call site");
      assert.deepEqual([...EVIDENCE_VERDICTS].sort(), ["changed", "confirmed", "contradicted", "no-control", "repaired", "timed-out", "unchanged", "unregistered", "unrunnable"]);
      assert.deepEqual([...REPRODUCED_VERDICTS].sort(), ["changed", "confirmed", "contradicted", "repaired", "unchanged"], "nothing that could not be run is reproduced evidence");
      assert.deepEqual([...SIZE_KINDS].sort(), ["confirmed", "drift", "no-size", "unobserved"]);

      // REACHABILITY, over real runs. 66/FF-6606 is the reason this lane exists separately: its
      // frozen-set lane stayed GREEN and blind while an emission loop was emptied, and only the
      // reachability lane went red.
      const reached = new Set();
      await withFixtureRepo(async (root) => {
        const register = (rows, verification = null) => ({
          ...ITEM,
          docTexts: {
            "ARCHITECTURE.md": ["# 99", "", "## Fitness functions", "", "| id | invariant | enforced by | from |", "|---|---|---|---|", ...rows, ""].join("\n"),
            ...(verification == null ? {} : { "VERIFICATION.md": verification }),
          },
        });
        const redRecorded = ["# 99", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", "| **FF-01** | `test/arch/red.test.mjs` | **RED** — standing red | Observed `b: a completely different reason` |", ""].join("\n");
        const redSame = ["# 99", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", "| **FF-01** | `test/arch/red.test.mjs` | **RED** — standing red | Observed `b: the invariant no longer holds` |", ""].join("\n");
        const redButGreen = ["# 99", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", "| **FF-01** | `test/arch/green.test.mjs` | **RED** — standing red | Observed `it broke` |", ""].join("\n");
        const sized = ["# 99", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", "| **FF-01** | `test/arch/green.test.mjs` (9 lanes) | **GREEN** — it holds | Planted a violation |", ""].join("\n");

        const runs = [
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/red.test.mjs` | ADR-001 |"])] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/red.test.mjs` | ADR-001 |"], redRecorded)] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/red.test.mjs` | ADR-001 |"], redSame)] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/green.test.mjs` | ADR-001 |"], redButGreen)] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/gone.test.mjs` | ADR-001 |"])] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | enforced by review | ADR-001 |"])] }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/slow.test.mjs` | ADR-001 |"])], deadlineMs: 750 }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/green.test.mjs` | ADR-001 |"])], registration: { runner: "scripts/test.mjs", assembles: () => false } }),
          runEvidence({ repoRoot: root, items: [register(["| **FF-01** | x | `test/arch/green.test.mjs` | ADR-001 |"], sized)] }),
          runEvidence({ repoRoot: root, items: [{ ...ITEM, docTexts: { "ARCHITECTURE.md": "# 99\n\nno register at all\n" } }] }),
        ];
        for (const report of await Promise.all(runs)) {
          for (const finding of report.findings) reached.add(finding.code);
        }
      });
      assert.deepEqual([...EVIDENCE_FINDING_CODES].filter((code) => !reached.has(code)), [], `every frozen code is reachable by a fixture; missing: ${[...EVIDENCE_FINDING_CODES].filter((code) => !reached.has(code)).join(", ")}`);
    },
  },

  {
    name: "arch/59 FF-5906: the finding is the doctor envelope, anchored on the item whose register makes the claim, and the sweep says what it read",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const report = await runEvidence({ repoRoot: root, items: [ITEM] });
        assert.ok(report.findings.length > 0, "the fixture register really does produce findings");
        for (const finding of report.findings) {
          assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], JSON.stringify(finding));
          assert.ok(EVIDENCE_FINDING_CODES.includes(finding.code), finding.code);
          assert.ok(["error", "warn"].includes(finding.severity), finding.severity);
          // The anchor is the item's own register — a RAW ABSOLUTE, basis-neutral, the 08/ADR-002
          // keystone doctor's contract already holds.
          assert.ok(finding.path.startsWith(ITEM_DIR) || finding.path === "99", `${finding.code}: ${finding.path}`);
          assert.ok(finding.message.length > 40, `${finding.code} says something an operator can act on`);
        }
        // ADR-004 §1 — a clean result is not representable without a read count, and this one is
        // present whether or not there were findings.
        assert.equal(report.reads.length, 1);
        const [sweep] = report.reads;
        // KEYED `sweep`, NOT `id` (59/ADR-004 §1a, closed by 59/04). This lane used to build its read
        // record inline and key it `id`, so the census's own emitter — handed this record — rendered
        // `the "undefined" sweep read 0 of a required 1`. One shape across all three lanes now; the
        // bind that holds them together is FF-5908.
        assert.deepEqual(Object.keys(sweep).sort(), ["basis", "count", "floor", "root", "sweep", "what"]);
        assert.ok(sweep.floor > 0, "the sweep declares a floor rather than defaulting one");
        assert.equal(sweep.count, report.rows.length);
        assert.equal(sweep.basis, "runtime", "the population is re-derived from runs, not from text");
        // …and the report says WHICH ITEM it read.
        assert.deepEqual([...report.scope.items], ["99"]);
      });
    },
  },

  {
    name: "arch/59 FF-5906: the driver is a PROGRAM this family spawns, its stdout sentinel is byte-identical on both sides of the seam, and it never reaches for `node --test`",
    run: async () => {
      // The two literals are physically separate BY THE RULE that keeps them apart: FF-5904
      // refuses a static import of a path outside `src/`, so `src/work-audit/evidence.mjs` cannot
      // import the driver's constant. 66/F-42 recorded exactly this shape for the red-probe
      // placeholder across the JS/markdown seam, and its answer was an assertion that reads both.
      const driverSource = await read(THE_DRIVER);
      const laneSource = await read(THE_LANE);
      // The DRIVER's copy need not be exported and, since 77/04 moved the program under `src/`,
      // must not be: nothing can import it (the family may not, and a test that did would execute
      // the program), and an unimportable export is the one shape 77/02's seam rule would report as
      // a stranded seam. The claim here is the BYTES, not the syntax, and it is unweakened.
      const driverLiteral = /(?:export )?const DRIVE_RESULT_SENTINEL = "([^"]*)";/u.exec(driverSource);
      const laneLiteral = /export const DRIVE_RESULT_SENTINEL = "([^"]*)";/u.exec(laneSource);
      assert.ok(driverLiteral != null && laneLiteral != null, "both sides declare the sentinel");
      assert.equal(driverLiteral[1], laneLiteral[1], "the two copies are byte-identical — nothing else can hold them equal across a boundary neither may import");
      assert.equal(DRIVE_RESULT_SENTINEL, driverLiteral[1].replaceAll("\\\\", "\\"));

      // The driver DRIVES: it imports the control and calls every case. A driver that only listed
      // them would make every verdict a claim about a module's exports rather than about a run.
      const driverBody = strippedBody(THE_DRIVER, driverSource);
      assert.match(driverBody, /await import\(/u, "the driver dynamically imports the control — that is why it lives outside the frozen family");
      assert.match(driverBody, /await entry\.run\(\)/u, "…and CALLS each case");
      assert.doesNotMatch(driverBody, RUNNER_SURFACE, "…without reaching for node --test, which reports pass on a tree that executes nothing");
      assert.doesNotMatch(driverBody, /node:child_process/u, "the driver is a leaf of the process tree, not a second seam");
      assert.match(driverBody, /AOF_GLOBAL_HOME/u, "it isolates PER CASE — spike 56 measured per-FILE isolation producing 13 false REDs, and a lane whose oracle is the message cannot read thirteen invented ones");
      assert.match(driverBody, /cases\.push\(/u, "the observed size is appended as each case EXECUTES, never read off the file's text");

      // …and the lane names the driver as a PATH it hands to a child, never as a module specifier.
      assert.match(strippedBody(THE_LANE, laneSource), /"src\/work\/audit-drive\.mjs"/u);
      assert.doesNotMatch(strippedBody(THE_LANE, laneSource), /from\s+"[^"]*work-audit-drive\.mjs"/u, "…and never imports it");
    },
  },

  {
    name: "arch/59 FF-5906: the message comparison DECLARES what it compares, and each declared normalisation is one the comparison actually performs",
    run: () => {
      assert.ok(MESSAGE_NORMALISATIONS.length >= 4, `the comparison declares ${MESSAGE_NORMALISATIONS.length} normalisations`);
      for (const rule of MESSAGE_NORMALISATIONS) {
        assert.deepEqual(Object.keys(rule).sort(), ["id", "what", "why"], JSON.stringify(rule));
        assert.ok(rule.what.length > 20 && rule.why.length > 20, `${rule.id} says what it does and why it is safe`);
      }
      // EACH DECLARATION HAS TEETH — a declared normalisation that the comparison does not perform
      // would make the report's account of itself false, which is the softest possible lie.
      const drives = {
        "path-separator": ["a src/x.mjs b", "a src\\x.mjs b"],
        "line-locator": ["a src/x.mjs:12 b", "a src/x.mjs:9910 b"],
        "absolute-prefix": ["a src/x.mjs b", "a /home/runner/repo/src/x.mjs b"],
        "transient-digits": ["a tmp/aof-12345 b", "a tmp/aof-98765 b"],
        "whitespace": ["a  b", "a\n b "],
      };
      for (const rule of MESSAGE_NORMALISATIONS) {
        const pair = drives[rule.id];
        assert.ok(pair != null, `${rule.id} is driven by this lane`);
        assert.equal(messagesAgree(pair[0], pair[1]), true, `${rule.id}: "${pair[0]}" and "${pair[1]}" are the same message moved`);
      }
      // …AND THE COMPARISON IS NOT SIMPLY TRUE. A genuinely different message still differs.
      assert.equal(messagesAgree("the set may shrink, never grow", "the set may grow, never shrink"), false);
      assert.equal(messagesAgree("src/a.mjs is not registered", "src/b.mjs is not registered"), false);
      // THE NUMERIC CONVERSE, WHICH LOCKS `transient-digits` TO ITS NARROW FORM. The normalisation
      // is only allowed to blur a RUN-SCOPED digit run — a pid, a port, a temp-dir suffix, all of
      // which follow a `-` or `_` or `/`. Widened to every number it would still leave every other
      // case green while making a standing-red gate whose message changed ONLY in its numbers read
      // `unchanged`, which is the count oracle re-entering through the message.
      assert.equal(messagesAgree("expected 3 lanes, got 2", "expected 3 lanes, got 0"), false, "a message that differs only in its numbers is a DIFFERENT message");
      assert.equal(messagesAgree("the ledger allows 0 of these", "the ledger allows 5 of these"), false);
      assert.equal(messagesAgree("9 of 341 gates are standing red", "8 of 341 gates are standing red"), false);
      assert.equal(messagesAgree("expected 1252 entries", "expected 1253 entries"), false, "…even where both numbers are long enough to look transient");
      // …while the run-scoped shape it IS for still agrees.
      assert.equal(messagesAgree("wrote /tmp/aof-evidence-104857/x", "wrote /tmp/aof-evidence-998877/x"), true);
      assert.equal(messagesAgree(null, "anything"), false, "absence is not agreement");
      assert.equal(messagesAgree("", ""), false);
    },
  },

  {
    name: "arch/59 FF-5906: the SIZE claim is on its own axis — it never reaches the verdict, and a drifted size leaves a confirmed row confirmed",
    run: async () => {
      // Structural: `sizeFor` and `verdictFor` are two functions and neither calls the other.
      const body = strippedBody(THE_LANE, await read(THE_LANE));
      const sizeSource = functionBody(body, "export function sizeFor");
      assert.ok(sizeSource != null && sizeSource.length > 200, "the size function's body was cut and read");
      assert.doesNotMatch(sizeSource, /verdictFor|dispositionOf|messagesAgree/u, "the size claim does not reach the verdict");
      const verdictSource = functionBody(body, "export function verdictFor");
      assert.ok(verdictSource != null, "the verdict function's body was cut and read");
      assert.doesNotMatch(verdictSource, /sizeFor|\.cases\b/u, "…and the verdict does not reach the size");

      // Behavioural: the same passing control, with a wildly wrong recorded size, is still
      // confirmed — and the drift is reported separately.
      await withFixtureRepo(async (root) => {
        const sized = (size) => ({
          ...ITEM,
          docTexts: {
            "ARCHITECTURE.md": ["# 99", "", "## Fitness functions", "", "| id | invariant | enforced by | from |", "|---|---|---|---|", "| **FF-01** | x | `test/arch/green.test.mjs` | ADR-001 |", ""].join("\n"),
            "VERIFICATION.md": ["# 99", "", "## Fitness functions", "", "| id | enforced by | result | red probe |", "|---|---|---|---|", `| **FF-01** | \`test/arch/green.test.mjs\` (${size} lanes) | **GREEN** — it holds | Planted a violation |`, ""].join("\n"),
          },
        });
        // The observed size comes from the corpus, never restated here — restating it is exactly
        // how the two copies of this fixture diverged before it was lifted to test/support/.
        const observed = EXECUTED_CASES["test/arch/green.test.mjs"];
        for (const size of [1, observed, 9, 400]) {
          const report = await runEvidence({ repoRoot: root, items: [sized(size)] });
          assert.equal(report.rows[0].verdict, "confirmed", `recorded size ${size} must not change the pass-or-fail verdict`);
          assert.equal(report.findings.some((finding) => finding.code === "evidence-size-drift"), size !== observed, `recorded size ${size} vs the observed ${observed}`);
        }
      });
      assert.equal(sizeFor.length, 2);
    },
  },
];
