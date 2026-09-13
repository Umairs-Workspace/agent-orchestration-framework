// EVIDENCE RE-RUN — milestone 59 / story 02. The behavioural suite for all four task features:
//
//   00_the-register-is-re-executed.feature
//   01_the-oracle-is-the-message.feature
//   02_evidence-that-cannot-run-says-so.feature
//   03_the-count-recorded-is-the-count-observed.feature
//
// EVERY LANE HERE DRIVES A REAL CHILD PROCESS unless the scenario is about a result being
// WITHHELD. That is not thoroughness for its own sake: the whole claim of this story is that the
// verdict comes from an execution rather than from the prose beside it, and a suite that stubbed
// the child would be asserting the prose again one layer up. The deadline lane really does start a
// control that outlives its bound and really is killed; the not-started lane really does ask for
// an executable that is not there.
//
// THE FIXTURE REPOSITORY IS A REAL DIRECTORY AND CONTAINS NO DRIVER AT ALL (77/04, ADR-002 §2a).
// It used to hold a planted copy of the shipped driver, because the lane resolved its own program
// against the audited root; that is the defect 77/04 fixes, and a fixture repository with no driver
// in it is now the honest test. The shipped default `DRIVE_PROGRAM` is still what runs — resolved
// from the TOOLKIT root, a real driver rather than a stand-in.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DRIVE_PROGRAM,
  EVIDENCE_FINDING_CODES,
  EVIDENCE_VERDICTS,
  MESSAGE_NORMALISATIONS,
  dispositionOf,
  messagesAgree,
  normalizeMessage,
  observedMessage,
  recordedCasesIn,
  recordedResultIn,
  recordedRowsFor,
  runEvidence,
  SIZE_KINDS,
  sizeFor,
  verdictFor,
} from "../../src/work-audit/evidence.mjs";
// THE ONE HOME for the control corpus and the throwaway repository that holds it. Two copies of
// this fixture had already diverged (green was 2 cases here and 3 there) before it was lifted.
import { EXECUTED_CASES, withControlFixtureRepo as withFixtureRepo } from "../support/evidence-control-fixture.mjs";

// ── REGISTER FIXTURES ────────────────────────────────────────────────────────────────────────

const ITEM_DIR = path.join(path.sep === "\\" ? "C:\\evidence-fixture" : "/evidence-fixture", "wiki", "work", "99_milestone_fixture");

function architectureRegister(rows) {
  return [
    "# 99 · fixture",
    "",
    "## Fitness functions",
    "",
    "| id | invariant | enforced by (arch-test) | from |",
    "|---|---|---|---|",
    ...rows.map((row) => `| **${row.id}** | ${row.invariant ?? "an invariant"} | ${row.enforcedBy} | ADR-001 |`),
    "",
  ].join("\n");
}

function verificationRegister(rows) {
  return [
    "# 99 · fixture — verification",
    "",
    "## Fitness functions",
    "",
    "| id | enforced by | result | red probe |",
    "|---|---|---|---|",
    ...rows.map((row) => `| **${row.id}** | ${row.enforcedBy} | ${row.result} | ${row.probe ?? "-"} |`),
    "",
  ].join("\n");
}

function fixtureItem({ ref = "99", architecture = null, verification = null, dir = ITEM_DIR, status = "in-progress" } = {}) {
  const docTexts = {};
  if (architecture != null) docTexts["ARCHITECTURE.md"] = architecture;
  if (verification != null) docTexts["VERIFICATION.md"] = verification;
  return { number: ref, type: "milestone", slug: "fixture", name: `${ref}_milestone_fixture`, ref, parent: null, dir, meta: { status }, docTexts };
}

const register = path.join(ITEM_DIR, "ARCHITECTURE.md");
const rowFor = (report, id, control = null) => report.rows.find((row) => row.id === id && (control == null || row.control === control));
const findingFor = (report, code) => report.findings.filter((finding) => finding.code === code);

// A one-row register whose control is `control`, recording `result` and (optionally) a message
// and a size. The shape 66's shipped `VERIFICATION.md` writes.
function oneRow({ id = "FF-9901", control, result = "**GREEN** — it holds", probe = "-", size = null }) {
  const cell = `\`${control}\`${size == null ? "" : ` (${size} lanes)`}`;
  return {
    architecture: architectureRegister([{ id, enforcedBy: `\`${control}\`` }]),
    verification: verificationRegister([{ id, enforcedBy: cell, result, probe }]),
  };
}

export const evidenceReRunTests = [
  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 00_the-register-is-re-executed.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/02 00.1: a row whose control passes is CONFIRMED, and the report says the control was EXECUTED, not read",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs" });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.verdict, "confirmed");
        assert.equal(row.basis, "executed");
        assert.match(row.evidence, /was EXECUTED, not read/u);
        assert.match(row.evidence, /bounded child process/u);
        // A confirmed row emits no verdict finding of its own. The one finding present is the
        // DECLARED limit — this sweep was handed no registration answer, so it says so rather than
        // reporting clean over a question it never asked.
        assert.deepEqual(report.findings.map((finding) => finding.code), ["evidence-registration-unchecked"]);
        assert.equal(report.registrationChecked, false);
        assert.deepEqual(report.limits.map((limit) => limit.question), ["does any runner assemble this control?"]);

        // …and with the answer supplied, the confirmed row really is clean.
        const answered = await runEvidence({
          repoRoot: root,
          items: [fixtureItem({ architecture, verification })],
          registration: { runner: "scripts/test.mjs", assembles: () => true },
        });
        assert.equal(rowFor(answered, "FF-9901").verdict, "confirmed");
        assert.equal(rowFor(answered, "FF-9901").registrationChecked, true);
        assert.deepEqual(answered.findings.map((finding) => finding.code), []);
        assert.deepEqual([...answered.limits], []);
      });
    },
  },
  {
    name: "59/02 00.2: a row claiming green over a control that FAILS is contradicted, anchored on the item whose register makes the claim, carrying the message the control actually produced",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/red-a.test.mjs" });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "contradicted");
        const [finding] = findingFor(report, "evidence-contradicted");
        assert.ok(finding != null, "the contradiction is a finding");
        assert.equal(finding.path, register, "the finding is anchored on the register that makes the claim");
        assert.match(finding.message, /the gate is red for reason A/u, "…and carries the message the control actually produced");
        assert.match(finding.message, /EXECUTED, not read/u);
        assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"]);
      });
    },
  },
  {
    name: "59/02 00.2b: a GREEN row whose result prose names the word \"red\" is contradicted, not merely changed — the register-corpus blocker, in the dangerous direction",
    run: async () => {
      await withFixtureRepo(async (root) => {
        // 57/FF-5703's shape, measured on the shipped register: a row recording a green result
        // whose own prose says "…which is exactly why the RED probe is the only evidence the
        // EXTENSION is armed." Read as a token scan over the row, that row records RED — and a
        // control that now fails is then reported `changed` at WARN instead of `contradicted` at
        // ERROR, softening the two verdicts 00_the-register-is-re-executed.feature locks.
        const { architecture, verification } = oneRow({
          control: "test/arch/red-a.test.mjs",
          result: "**GREEN** — it holds, and it never carried a `pending` marker, which is exactly why the red probe is the only evidence the EXTENSION is armed",
          probe: "Planted a violation and it screamed",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.recorded.result, "green", "the row records GREEN; the word `red` in its prose is prose");
        assert.equal(row.verdict, "contradicted");
        assert.notEqual(row.verdict, "changed", "the softer verdict is the dangerous direction");
        const [finding] = findingFor(report, "evidence-contradicted");
        assert.ok(finding != null);
        assert.equal(finding.severity, "error", "…and it is an ERROR, not the warn `evidence-changed` carries");
        assert.deepEqual(findingFor(report, "evidence-changed"), []);
      });
    },
  },
  {
    name: "59/02 00.2c: a probe cell carrying an unescaped pipe leaves the result cell intact — a subtraction cannot stand in for a column cut",
    run: async () => {
      await withFixtureRepo(async (root) => {
        // 54/FF-5408's shape. `redProbeRows` splits on an unescaped `|`, so it returns only the
        // FRAGMENT before the pipe; subtracting that fragment leaves the tail — `**1 red:**` on
        // the real register — inside whatever the reader scans next.
        const { architecture, verification } = oneRow({
          control: "test/arch/green.test.mjs",
          result: "**GREEN** — it holds",
          probe: "Planted `a|b` in the matcher → **1 red:** the set may shrink, never grow",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.recorded.result, "green", "the split probe cell's tail never reaches the result cell");
        assert.equal(row.verdict, "confirmed");
        assert.deepEqual(findingFor(report, "evidence-repaired"), [], "…so a passing control is not reported as repairing a red the register never recorded");
      });
    },
  },
  {
    name: "59/02 00.2d: a register with NO result column records no result — the shape 57 and 54 ship, and it is not read as a claim of red",
    run: () => {
      // Measured over all 112 register rows in wiki/work: 66's register is
      // `id | enforced by | result | red probe`; 57's is `id | control | landed | red probe` and
      // 54's is `id | invariant | story | red probe`. Neither of the latter has a result column,
      // and both carry the word `red` in prose cells.
      const architecture = architectureRegister([{ id: "FF-5703", enforcedBy: "`test/arch/loop/acd-loop-finding-envelope.test.mjs`" }]);
      const noResultColumn = [
        "# 57 — verification",
        "",
        "## Fitness functions",
        "",
        "| id | control | landed | red probe (what was broken, and the message observed) |",
        "|---|---|---|---|",
        "| FF-5703 | Severity is a property of the code | `test/arch/loop/acd-loop-finding-envelope.test.mjs` *(extended)* — 1 new test green, which is exactly why the red probe is the only evidence the EXTENSION is armed | **Four probes**, each restored byte-exactly |",
        "",
      ].join(String.fromCharCode(10));
      const [row] = recordedRowsFor(fixtureItem({ architecture, verification: noResultColumn }));
      assert.equal(row.result, null, "a register that never adopted the result convention records no result — null, not red");
      assert.notEqual(row.result, "red");
      // …and an absent recorded result is read as the row CLAIMING its invariant holds, which is
      // the loud direction: a failing control contradicts it.
      assert.equal(verdictFor(row, { status: "ran", message: "b: it broke", cases: 2 }), "contradicted");
    },
  },
  {
    name: "59/02 00.3: with NO result from running the control, the row is not confirmed — it is reported as unrunnable (FF-5906's sharpest leg)",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs" });
        // The child's answer is WITHHELD. Everything the register claims is still present.
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })], observe: async () => null });
        const row = rowFor(report, "FF-9901");
        assert.notEqual(row.verdict, "confirmed");
        assert.equal(row.verdict, "unrunnable");
        assert.equal(row.basis, "not-executed");
        assert.equal(findingFor(report, "evidence-unrunnable").length, 1);
        // …and the pure verdict function says the same thing on its own, for every recorded shape.
        for (const result of ["green", "red", null]) {
          assert.equal(verdictFor({ controls: ["x.test.mjs"], result, message: "anything" }, null), "unrunnable");
        }
      });
    },
  },
  {
    name: "59/02 00.4: every row in the register is reported with a verdict of its own — none is silently skipped",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const rows = [
          { id: "FF-9901", enforcedBy: "`test/arch/green.test.mjs`" },
          { id: "FF-9902", enforcedBy: "`test/arch/red-a.test.mjs`" },
          { id: "FF-9903", enforcedBy: "`test/arch/absent.test.mjs`" },
          { id: "FF-9904", enforcedBy: "review only" },
        ];
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture: architectureRegister(rows) })] });
        assert.deepEqual(report.rows.map((row) => row.id), ["FF-9901", "FF-9902", "FF-9903", "FF-9904"]);
        for (const row of report.rows) {
          assert.ok(EVIDENCE_VERDICTS.includes(row.verdict), `${row.id} has a verdict of its own: ${row.verdict}`);
        }
        assert.deepEqual(report.rows.map((row) => row.verdict), ["confirmed", "contradicted", "unrunnable", "no-control"]);
        // The read count is what makes "nothing was skipped" checkable rather than asserted.
        assert.equal(report.reads[0].count, 4);
      });
    },
  },
  {
    name: "59/02 00.5: a control cited by two rows is RUN for each row it is cited by, and neither verdict is inferred from the other's",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const rows = [
          { id: "FF-9901", enforcedBy: "`test/arch/red-a.test.mjs`" },
          { id: "FF-9902", enforcedBy: "`test/arch/red-a.test.mjs`" },
        ];
        // The SEAM is counted, not stubbed: the children are real, and the count is what proves
        // no memoisation by control path crept in.
        const { runBounded } = await import("../../src/work-audit/spawn.mjs");
        const started = [];
        const spawn = async (options) => {
          started.push(options.args[options.args.length - 1]);
          return await runBounded(options);
        };
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture: architectureRegister(rows) })], spawn });
        assert.equal(started.length, 2, "the control was executed once per citing row");
        assert.equal(new Set(started).size, 1, "…and it is the same control both times");
        assert.equal(rowFor(report, "FF-9901").verdict, "contradicted");
        assert.equal(rowFor(report, "FF-9902").verdict, "contradicted");
        // Each row carries its OWN observation object — not one shared by reference.
        assert.notEqual(rowFor(report, "FF-9901").observed, rowFor(report, "FF-9902").observed);
      });
    },
  },
  {
    name: "59/02 00.6: a scoped run re-runs only that item's rows, and the report says which item it read",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const mine = fixtureItem({ ref: "99", architecture: architectureRegister([{ id: "FF-9901", enforcedBy: "`test/arch/green.test.mjs`" }]) });
        const theirs = fixtureItem({
          ref: "98",
          dir: path.join(path.dirname(ITEM_DIR), "98_milestone_other"),
          architecture: architectureRegister([{ id: "FF-9801", enforcedBy: "`test/arch/red-a.test.mjs`" }]),
        });
        const report = await runEvidence({ repoRoot: root, items: [mine, theirs], scope: "99" });
        assert.deepEqual(report.rows.map((row) => row.id), ["FF-9901"], "only the scoped item's rows were re-run");
        assert.equal(report.scope.requested, "99");
        assert.deepEqual([...report.scope.items], ["99"], "the report says which item it read");
        assert.deepEqual([...report.scope.registers], [register]);
      });
    },
  },
  {
    name: "59/02 00.7: an item that declares no fitness register is reported as declaring NO CONTROLS, and is not reported as clean",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture: "# 99 · fixture\n\nNo register here.\n" })] });
        assert.deepEqual(report.rows, [], "there was nothing to re-run");
        const [finding] = findingFor(report, "evidence-no-register");
        assert.ok(finding != null, "…and that is REPORTED rather than left as an empty finding list");
        assert.match(finding.message, /declares no fitness register/u);
        assert.match(finding.message, /not the same as clean/u);
        assert.notEqual(report.findings.length, 0, "a silent clean result is exactly what this refuses");
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 01_the-oracle-is-the-message.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/02 01.1: a standing-red control whose failure message CHANGES is reported as changed, quoting both the recorded message and the observed one",
    run: async () => {
      await withFixtureRepo(async (root) => {
        // Recorded when it was failing for reason A; it now fails for reason B.
        const { architecture, verification } = oneRow({
          control: "test/arch/red-b.test.mjs",
          result: "**RED** — standing red at the time of writing",
          probe: "Observed `the gate is red for reason A`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "changed");
        const [finding] = findingFor(report, "evidence-changed");
        assert.match(finding.message, /the gate is red for reason A/u, "the RECORDED message is quoted");
        assert.match(finding.message, /the gate is red for reason B/u, "…and the OBSERVED one");
      });
    },
  },
  {
    name: "59/02 01.2: a standing-red control failing the SAME way is reported as unchanged — and it is still reported as failing",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({
          control: "test/arch/red-a.test.mjs",
          result: "**RED** — standing red",
          probe: "Observed `red a breaks: the gate is red for reason A`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "unchanged");
        const [finding] = findingFor(report, "evidence-still-failing");
        assert.ok(finding != null, "unchanged is still REPORTED — it is not a pass");
        assert.match(finding.message, /STILL FAILING/u);
        assert.match(finding.message, /Unchanged is not fixed/u);
      });
    },
  },
  {
    name: "59/02 01.3: identical pass-and-fail counts either side of a real break — the break is still reported, and the report is derived from the message rather than the counts",
    run: async () => {
      await withFixtureRepo(async (root) => {
        // red-a and red-b are byte-for-byte the same SHAPE: two cases, one passing, one failing.
        // A count oracle sees (1, 1) before and (1, 1) after and reports that nothing happened.
        const { architecture, verification } = oneRow({
          control: "test/arch/red-b.test.mjs",
          result: "**RED** — standing red",
          probe: "Observed `red a breaks: the gate is red for reason A`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.observed.caseReports.length, 2, "two cases, as before the break");
        assert.equal(row.observed.caseReports.filter((entry) => entry.ok).length, 1, "one passing, as before the break");
        assert.equal(row.verdict, "changed", "the break is REPORTED, on tallies a counter cannot tell apart");
        // …and the derivation is the message: the same observation with the recorded message
        // matching would be `unchanged`, and nothing about the counts moved between the two.
        assert.equal(verdictFor({ controls: ["c"], result: "red", message: row.observed.message }, row.observed), "unchanged");
        assert.equal(verdictFor({ controls: ["c"], result: "red", message: "something else entirely" }, row.observed), "changed");
      });
    },
  },
  {
    name: "59/02 01.4: a control that turns from failing to PASSING is reported as repaired, and the report says the recorded result is out of date",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({
          control: "test/arch/green.test.mjs",
          result: "**RED** — standing red",
          probe: "Observed `the gate is red for reason A`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "repaired");
        const [finding] = findingFor(report, "evidence-repaired");
        assert.match(finding.message, /recorded result is out of date/u);
      });
    },
  },
  {
    name: "59/02 01.5: a control that turns from passing to FAILING is contradicted, and the observed failure message is carried on the finding",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({
          control: "test/arch/red-b.test.mjs",
          result: "**GREEN** — it held when this was written",
          probe: "Planted a violation → `it screamed`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "contradicted");
        const [finding] = findingFor(report, "evidence-contradicted");
        assert.match(finding.message, /the gate is red for reason B/u, "the OBSERVED failure message rides on the finding");
      });
    },
  },
  {
    name: "59/02 01.6: a failure message that MOVES — a line number and a path separator — is not reported as changed on that difference alone, and the report says which parts it compared",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({
          control: "test/arch/red-moved.test.mjs",
          result: "**RED** — standing red",
          probe: "Observed `red a breaks: expected src/work.mjs:118 to hold`",
        });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.verdict, "unchanged", "a moved line number and a flipped separator are not a change");
        assert.notEqual(row.verdict, "changed");
        // The report says WHICH PARTS it compared, in two ways: the declared normalisations, and
        // the compared forms themselves.
        assert.deepEqual(report.comparison.map((rule) => rule.id).sort(), ["absolute-prefix", "line-locator", "path-separator", "transient-digits", "whitespace"]);
        assert.equal(row.comparedRecordedForm, row.comparedObservedForm);
        assert.match(row.comparedObservedForm, /expected src\/work\.mjs to hold/u);
        for (const rule of MESSAGE_NORMALISATIONS) assert.ok(rule.what.length > 10 && rule.why.length > 10, `${rule.id} says what it does and why`);
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 02_evidence-that-cannot-run-says-so.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/02 02.1: a citation that resolves to nothing on disk is unrunnable, and the finding names the path it tried to resolve",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/nowhere.test.mjs" });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").verdict, "unrunnable");
        const [finding] = findingFor(report, "evidence-unrunnable");
        assert.match(finding.message, /What was tried/u);
        assert.ok(finding.message.includes(path.resolve(root, "test/arch/nowhere.test.mjs")), `the finding names the path it tried: ${finding.message}`);
      });
    },
  },
  {
    name: "59/02 02.2: a control on disk that no runner assembles is UNREGISTERED, and the finding is distinguished from a control that does not exist",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const rows = [
          { id: "FF-9901", enforcedBy: "`test/arch/unassembled.test.mjs`" },
          { id: "FF-9902", enforcedBy: "`test/arch/nowhere.test.mjs`" },
        ];
        const registration = { runner: "scripts/test.mjs", assembles: (control) => control === "test/arch/green.test.mjs" };
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture: architectureRegister(rows) })], registration });
        assert.equal(rowFor(report, "FF-9901").verdict, "unregistered");
        assert.equal(rowFor(report, "FF-9902").verdict, "unrunnable", "…and the one that is not on disk is a DIFFERENT verdict");
        const [unregistered] = findingFor(report, "evidence-unregistered");
        assert.match(unregistered.message, /IS on disk and which no runner assembles/u);
        assert.match(unregistered.message, /scripts\/test\.mjs/u, "the finding names the runner it looked in");
        assert.notEqual(unregistered.code, findingFor(report, "evidence-unrunnable")[0].code);
      });
    },
  },
  {
    name: "59/02 02.3: a control that exceeds its deadline is TIMED OUT — the finding names the deadline applied, and the row is not reported as a failing control",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/slow.test.mjs" });
        // A real child, a real bound, a real kill.
        const report = await runEvidence({
          repoRoot: root,
          items: [fixtureItem({ architecture, verification })],
          deadlines: { "test/arch/slow.test.mjs": 750 },
        });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.verdict, "timed-out");
        assert.equal(row.deadlineMs, 750);
        const [finding] = findingFor(report, "evidence-timed-out");
        assert.match(finding.message, /750ms deadline/u, "the finding names the deadline that was applied");
        assert.match(finding.message, /NOT reported as a failing control/u);
        assert.deepEqual(findingFor(report, "evidence-contradicted"), [], "a slow control is not a failing one");
        assert.deepEqual(findingFor(report, "evidence-still-failing"), []);
      });
    },
  },
  {
    name: "59/02 02.4: a control that cannot be STARTED at all is unrunnable, and the finding names what was attempted",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs" });
        const missing = path.join(root, "no-such-node-binary");
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })], execPath: missing });
        assert.equal(rowFor(report, "FF-9901").verdict, "unrunnable");
        const [finding] = findingFor(report, "evidence-unrunnable");
        assert.match(finding.message, /What was tried/u);
        assert.ok(finding.message.includes("no-such-node-binary"), `the finding names the invocation attempted: ${finding.message}`);
        assert.ok(finding.message.includes(DRIVE_PROGRAM.split("/").pop()), "…including the program it tried to start");
      });
    },
  },
  {
    name: "59/02 02.5 (Scenario Outline, all four rows): absent from disk → unrunnable; present but assembled by nobody → unregistered; slower than its deadline → timed out; failing on its own assertions → contradicted",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const cases = [
          { situation: "absent from disk", control: "test/arch/nowhere.test.mjs", verdict: "unrunnable", registration: null, deadlineMs: 20_000 },
          { situation: "present but assembled by nobody", control: "test/arch/unassembled.test.mjs", verdict: "unregistered", registration: { runner: "scripts/test.mjs", assembles: () => false }, deadlineMs: 20_000 },
          { situation: "slower than its deadline", control: "test/arch/slow.test.mjs", verdict: "timed-out", registration: null, deadlineMs: 750 },
          { situation: "failing on its own assertions", control: "test/arch/red-a.test.mjs", verdict: "contradicted", registration: null, deadlineMs: 20_000 },
        ];
        const observedVerdicts = [];
        for (const example of cases) {
          const { architecture, verification } = oneRow({ control: example.control });
          const report = await runEvidence({
            repoRoot: root,
            items: [fixtureItem({ architecture, verification })],
            registration: example.registration,
            deadlineMs: example.deadlineMs,
          });
          const row = rowFor(report, "FF-9901");
          assert.equal(row.verdict, example.verdict, `${example.situation} → ${example.verdict} (observed ${row.verdict})`);
          observedVerdicts.push(row.verdict);
        }
        // EACH REASON IS ITS OWN VERDICT: four situations, four distinct answers.
        assert.equal(new Set(observedVerdicts).size, 4, `the four reasons are four verdicts: ${observedVerdicts.join(", ")}`);
      });
    },
  },
  {
    name: "59/02 02.6: a row that carries no control at all is reported as declaring no control, and the finding names the row",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const report = await runEvidence({
          repoRoot: root,
          items: [fixtureItem({ architecture: architectureRegister([{ id: "FF-9907", enforcedBy: "enforced by review" }]) })],
        });
        assert.equal(rowFor(report, "FF-9907").verdict, "no-control");
        const [finding] = findingFor(report, "evidence-declares-no-control");
        assert.match(finding.message, /FF-9907/u, "the finding names the row");
        assert.match(finding.message, /line \d+/u, "…and where it is");
        assert.equal(finding.path, register);
      });
    },
  },
  {
    name: "59/02 02.7: in a register where every row is unrunnable, no row is confirmed and the report says that no evidence was reproduced",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const rows = [
          { id: "FF-9901", enforcedBy: "`test/arch/nowhere.test.mjs`" },
          { id: "FF-9902", enforcedBy: "`test/arch/also-nowhere.test.mjs`" },
        ];
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture: architectureRegister(rows) })] });
        assert.deepEqual(report.rows.filter((row) => row.verdict === "confirmed"), []);
        assert.deepEqual([...report.reproduced], [], "nothing that could not be run is counted as evidence");
        const [finding] = findingFor(report, "evidence-none-reproduced");
        assert.ok(finding != null);
        assert.match(finding.message, /no evidence was reproduced/u);
        assert.match(finding.message, /2 register row\(s\) were read/u, "…and it says how much it read (ADR-004 §1)");
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 03_the-count-recorded-is-the-count-observed.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/02 03.1: a recorded case count that matches the observed one is reported as confirmed",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs", size: 3 });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.recorded.cases, 3, "the register's recorded size was read");
        assert.equal(row.observed.cases, 3, "…and the run produced three");
        assert.equal(row.size.kind, "confirmed");
        assert.deepEqual(findingFor(report, "evidence-size-drift"), []);
      });
    },
  },
  {
    name: "59/02 03.2: a recorded count LARGER than the observed one is size drift — quoting both numbers, anchored on the item whose register records it",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs", size: 9 });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.size.kind, "drift");
        assert.equal(row.size.direction, "smaller");
        const [finding] = findingFor(report, "evidence-size-drift");
        assert.match(finding.message, /records 9 case\(s\)/u, "the RECORDED number is quoted");
        assert.match(finding.message, /the run produced 3/u, "…and the OBSERVED one");
        assert.equal(finding.path, register, "anchored on the item whose register records it");
      });
    },
  },
  {
    name: "59/02 03.3: a recorded count SMALLER than the observed one is also drift, and the finding says which direction it drifted",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs", size: 1 });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        assert.equal(rowFor(report, "FF-9901").size.direction, "larger");
        const [finding] = findingFor(report, "evidence-size-drift");
        assert.match(finding.message, /drifted larger/u);
      });
    },
  },
  {
    name: "59/02 03.4: a row that records no case count is not invented one — no size drift is reported and the row is reported as recording no size",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs" });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.recorded.cases, null);
        assert.equal(row.size.kind, "no-size");
        assert.deepEqual(findingFor(report, "evidence-size-drift"), []);
        assert.equal(row.size.observed, 3, "the observed size is still reported — it is the RECORDED one that is absent");
      });
    },
  },
  {
    name: "59/02 03.5: size drift does not change the pass-or-fail verdict — the row is confirmed on its result AND separately reported as size drift",
    run: async () => {
      await withFixtureRepo(async (root) => {
        const { architecture, verification } = oneRow({ control: "test/arch/green.test.mjs", size: 9 });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.verdict, "confirmed", "the RESULT verdict is untouched by the size claim");
        assert.equal(row.size.kind, "drift");
        assert.equal(findingFor(report, "evidence-size-drift").length, 1, "…and the drift is its own, separate finding");
        assert.match(findingFor(report, "evidence-size-drift")[0].message, /changes no pass-or-fail verdict/u);
        // The structural half: the verdict function cannot see a size at all.
        const observed = row.observed;
        assert.equal(verdictFor({ controls: ["c"], result: "green", cases: 9 }, observed), "confirmed");
        assert.equal(verdictFor({ controls: ["c"], result: "green", cases: 1 }, observed), "confirmed");
      });
    },
  },
  {
    name: "59/02 03.6: the observed size comes from the RUN, not from the file's text",
    run: async () => {
      await withFixtureRepo(async (root) => {
        // `sized.test.mjs` names four cases in its text and exports two.
        const source = await readFile(path.join(root, "test/arch/sized.test.mjs"), "utf8");
        const declaredInText = [...source.matchAll(/name:\s*"/gu)].length;
        assert.equal(declaredInText, 4, "the fixture's TEXT declares four cases");

        const { architecture, verification } = oneRow({ control: "test/arch/sized.test.mjs", size: 4 });
        const report = await runEvidence({ repoRoot: root, items: [fixtureItem({ architecture, verification })] });
        const row = rowFor(report, "FF-9901");
        assert.equal(row.observed.cases, 2, "the observed size is the number the RUN produced");
        assert.notEqual(row.observed.cases, declaredInText);
        assert.equal(row.observed.caseReports.length, 2, "…and it is the executed cases, named");
        assert.equal(row.size.kind, "drift");
        assert.equal(row.size.direction, "smaller");
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // The pure readers, driven directly. Each is the one home for a fact the register carries and
  // `src/work/doctor-controls.mjs` does not offer, so each is asserted rather than inferred from
  // a lane result.
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/02: the recorded-row readers take the register's own vocabulary, subtract the red-probe cell before reading the rest, and answer null rather than guessing",
    run: () => {
      // THE READER TAKES A RESULT CELL AND READS ITS LEADING TOKEN — 66/ADR-005 §1's template
      // shape. Everything after the token is prose about the result.
      assert.equal(recordedResultIn(" **GREEN** — it holds "), "green");
      assert.equal(recordedResultIn(" **RED** — standing red "), "red");
      assert.equal(recordedResultIn(" landed "), "green");
      assert.equal(recordedResultIn(""), null);
      assert.equal(recordedResultIn(null), null);
      assert.equal(recordedResultIn("no verdict here"), null);
      // THE BLOCKER, AT THE READER. A green cell whose prose names the word is green.
      assert.equal(recordedResultIn(" **GREEN** — it holds, which is exactly why the red probe is the only evidence the EXTENSION is armed "), "green");
      assert.equal(recordedResultIn(" **GREEN** — 3 of 7 lanes red after the probe "), "green");
      // …and a whole ROW is not a cell: the leading-token rule refuses it rather than scanning it,
      // which is what makes "cut the column" and "read the token" two rules that both have to hold.
      assert.equal(recordedResultIn("| **FF-01** | x | **GREEN** — it holds | probe |"), null);

      assert.equal(recordedCasesIn("`x.test.mjs` (9 lanes)"), 9);
      assert.equal(recordedCasesIn("22 cases"), 22);
      assert.equal(recordedCasesIn("no size at all"), null);
      // The shape that made a first draft wrong: prose counting something else.
      assert.equal(recordedCasesIn("117 test entries had not run"), null);

      // THE MEASURED TRAP, driven end to end: 66's FF-6603 row is GREEN and its red-probe cell
      // records "3 of 7 lanes red". Read whole-line it is a red row of size 7; read with the
      // probe subtracted it is a green row of size 9.
      const architecture = architectureRegister([{ id: "FF-6603", enforcedBy: "`test/arch/grade/acd-register-declaration-form.test.mjs`" }]);
      const verification = verificationRegister([{
        id: "FF-6603",
        enforcedBy: "`test/arch/grade/acd-register-declaration-form.test.mjs` (9 lanes)",
        result: "**GREEN** — id-first inside a frozen block",
        probe: "Flipped `ADR`/`R` to register scope → **3 of 7 lanes red**",
      }]);
      const [row] = recordedRowsFor(fixtureItem({ architecture, verification }));
      assert.equal(row.result, "green", "the probe cell's prose about redness is prose, not a recorded result");
      assert.equal(row.cases, 9, "…and the size comes from the enforced-by cell, not from the probe's arithmetic");
      assert.match(row.message, /3 of 7 lanes red|ADR/u, "the recorded observation still comes from the probe cell");

      // THE SECOND MEASURED TRAP, from the same register. All eight of 66's declarations still
      // carry `**(pending — 66/00)**` in ARCHITECTURE while VERIFICATION records `**GREEN**`.
      // 66/ADR-009/J calls a stale `pending` on a landed control a declared no-op, so the recorded
      // result the verification register carries must survive it — letting the marker win erased
      // every recorded result on a `done` milestone.
      const stale = architectureRegister([{ id: "FF-6601", enforcedBy: "`test/arch/work/acd-feature-parser-single-home.test.mjs` **(pending — 66/00)** — a source scan" }]);
      const recorded = verificationRegister([{ id: "FF-6601", enforcedBy: "`test/arch/work/acd-feature-parser-single-home.test.mjs` (7 cases)", result: "**GREEN** — one recogniser under src/", probe: "Planted `SCENARIO_RE` in src/work.mjs" }]);
      const [landed] = recordedRowsFor(fixtureItem({ architecture: stale, verification: recorded }));
      assert.equal(landed.pending, true, "the register really does carry the stale marker");
      assert.equal(landed.result, "green", "…and the result the VERIFICATION register records survives it");
      assert.equal(landed.cases, 7);

      // …while a genuinely pending declaration — no verification row at all — still records nothing.
      const [absent] = recordedRowsFor(fixtureItem({ architecture: architectureRegister([{ id: "FF-9909", enforcedBy: "`test/arch/not-yet.test.mjs` — `pending`" }]) }));
      assert.equal(absent.pending, true);
      assert.equal(absent.result, null, "a pending declaration with nothing recorded beside it claims nothing");
    },
  },
  {
    name: "59/02: the oracle's own parts — the observed message is built from what failed, the disposition is read off that message, and neither consults a tally",
    run: () => {
      assert.equal(observedMessage([{ name: "a", ok: true, message: null }, { name: "b", ok: true, message: null }]), null);
      assert.equal(dispositionOf(null), "passing");
      const message = observedMessage([{ name: "a", ok: true, message: null }, { name: "b", ok: false, message: "boom" }]);
      assert.equal(message, "b: boom");
      assert.equal(dispositionOf(message), "failing");
      // One failing case and fifty failing cases are the SAME disposition — the difference lives
      // in the message, which is exactly ADR-004 §3's point.
      assert.equal(dispositionOf(observedMessage(Array.from({ length: 50 }, (_, index) => ({ name: `c${index}`, ok: false, message: "boom" })))), "failing");

      assert.equal(messagesAgree("expected src/a.mjs:12 to hold", "expected src\\a.mjs:990 to hold"), true);
      assert.equal(messagesAgree("expected src/a.mjs to hold", "expected src/b.mjs to hold"), false);
      // ABSENCE IS NOT AGREEMENT: a register with no recorded message cannot confirm itself.
      assert.equal(messagesAgree(null, "anything"), false);
      assert.equal(messagesAgree("anything", null), false);
      assert.equal(normalizeMessage(null), null);
      assert.match(normalizeMessage("C:/repo/src/work.mjs:41:9 exploded"), /^src\/work\.mjs exploded$/u);
    },
  },
  {
    name: "59/02: the size claim is computed on its own axis — no size, unobserved, confirmed and drift are four answers and none of them is a verdict",
    run: () => {
      assert.equal(sizeFor({ cases: null }, { cases: 3 }).kind, "no-size");
      assert.equal(sizeFor({ cases: 3 }, null).kind, "unobserved");
      assert.equal(sizeFor({ cases: 3 }, { cases: 3 }).kind, "confirmed");
      assert.equal(sizeFor({ cases: 3 }, { cases: 1 }).direction, "smaller");
      assert.equal(sizeFor({ cases: 1 }, { cases: 3 }).direction, "larger");
      // Every answer is one of the declared kinds — a fifth would be an unreported state.
      for (const pair of [[{ cases: null }, { cases: 3 }], [{ cases: 3 }, null], [{ cases: 3 }, { cases: 3 }], [{ cases: 3 }, { cases: 1 }]]) {
        assert.ok(SIZE_KINDS.includes(sizeFor(pair[0], pair[1]).kind));
      }
      // `no-size`, `unobserved` and `drift` are size answers and none of them is a verdict.
      // `confirmed` is deliberately excluded: the register confirms a size the same way it
      // confirms a result, and the separation that matters is structural (03.5), not lexical.
      for (const kind of ["no-size", "unobserved", "drift"]) {
        assert.equal(EVIDENCE_VERDICTS.includes(kind), false, `"${kind}" is a size answer and must never be a verdict`);
      }
      // A size answer never carries a verdict, in either direction.
      for (const answer of [sizeFor({ cases: 3 }, { cases: 1 }), sizeFor({ cases: null }, null)]) {
        assert.deepEqual(Object.keys(answer).sort(), ["direction", "kind", "observed", "recorded"]);
      }
      assert.equal(EVIDENCE_FINDING_CODES.includes("evidence-size-drift"), true);
    },
  },
];
