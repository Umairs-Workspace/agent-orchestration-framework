// Traceability wiring for milestone 54 / story 00, task `02_the-report-normalisers`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/00_story_the-grade-record/tasks/02_the-report-normalisers.feature
// against the LOCKED surface: `normaliseReport`, `normaliseTap` and `REPORT_FORMATS` in
// ../src/work/grade.mjs.
//
// `m38/ADR-008` IS THE WHOLE POINT OF THIS FILE: *wherever we do not own the PRODUCER, the
// contract test MUST be fed a REAL CAPTURED payload from that producer.* Not one assertion
// below is made against a hand-written specimen of what TAP "looks like" — every payload is
// the byte-exact stdout of a real run, taken by test/fixtures/rubric-reports/capture.mjs,
// each carrying a leading `#` provenance line naming the exact command that produced it.
//
// THE TWO PRODUCERS DISAGREE ABOUT TAP, which is why one capture would not do. node's test
// runner emits ordinals, a plan line, YAML diagnostics and a `# tests` summary; this repo's
// own runner emits bare `ok - <name>` with none of those, and writes its reds to STDERR
// (scripts/test.mjs:3821,3824). A normaliser written against one and asserted against a
// hand-made specimen of the other would ship broken and read as correct.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normaliseReport, normaliseTap, REPORT_FORMATS } from "../../src/work/grade.mjs";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "rubric-reports");
const capture = (name) => readFileSync(path.join(fixturesDir, name), "utf8");
const tap = (name) => normaliseTap(capture(name));

// A line lifted VERBATIM from a named real capture. The assertion is what keeps the
// Examples rows below honest: an element is only driven once it has been proven to be
// something a real producer really emitted, so nobody can quietly substitute a belief about
// the format for the format.
function elementFrom(fixture, match) {
  const line = capture(fixture).split(/\r?\n/).find((candidate) => match.test(candidate));
  assert.ok(line !== undefined, `no line matching ${match} in ${fixture} — the element is not one this producer emits`);
  return line;
}

// The arch-tests the subject file of `node-vacuous.tap` declares. NONE of them ran; the
// runner reported the FILE as one case.
//
// THE COUNT IS READ FROM THE FILE, NEVER ASSERTED AT A NUMBER. The feature's prose says
// "four"; measured at build the file declares NINE (F-54-00-BUILD-1 in STATE — the prose is
// stale, and a delivered contract is not edited to match). The scenario's assertion is
// unaffected either way: one case was reported for a file declaring many, and 1 is neither
// 4 nor 9. Pinning the literal would also break 54/04, which EXTENDS this very file under
// FF-5407 — so the floor is asserted and the observed number is reported.
const DECLARED_FLOOR = 4;

async function declaredArchTestNames() {
  const { archTests } = await import("../arch/audit/acd-controls-never-execute.test.mjs");
  return archTests.map((entry) => entry.name);
}

export const gradeReportNormalisersTests = [
  // Scenario: a captured payload from the node test runner normalises to what it actually
  // reported.
  {
    name: "54/00 normalisers: the node-runner capture normalises to the one case it actually reported, under the name it emitted",
    run: () => {
      const report = tap("node-vacuous.tap");
      assert.equal(report.ok, true);
      assert.equal(report.cases.length, 1, "exactly one case is enumerated");
      // Character for character — including the doubled backslashes node's TAP writer emits
      // for a Windows path. Nothing is unescaped, trimmed of its shape, or prettified.
      assert.equal(report.cases[0].name, "test\\\\arch\\\\acd-controls-never-execute.test.mjs");
      assert.equal(report.cases[0].status, "passed");
      assert.ok(capture("node-vacuous.tap").includes(report.cases[0].name), "the identity appears verbatim in the captured text");
    },
  },

  // Scenario: the runner reported one case for a file declaring four, and the normaliser
  // says one.
  {
    name: "54/00 normalisers: the subject file declares many arch-tests and the normaliser reports ONE case — none synthesised from the file",
    run: async () => {
      const declared = await declaredArchTestNames();
      assert.ok(
        declared.length >= DECLARED_FLOOR,
        `non-vacuity: the subject file really declares at least ${DECLARED_FLOOR} arch-tests (found ${declared.length})`,
      );
      const report = tap("node-vacuous.tap");
      assert.equal(report.cases.length, 1, `the enumerated case count is one, and not the ${declared.length} the file declares`);
      assert.notEqual(report.cases.length, DECLARED_FLOOR, "…and in particular it is not four");
      for (const name of declared) {
        assert.equal(
          report.cases.some((item) => item.name.includes(name)),
          false,
          `no case is synthesised from the subject file's contents (\`${name}\` must not appear)`,
        );
      }
      // The summary line reporting zero suites is not read as a case.
      assert.ok(capture("node-vacuous.tap").includes("# suites 0"), "non-vacuity: the capture really carries that summary line");
      assert.equal(report.cases.some((item) => /suites/.test(item.name)), false);
    },
  },

  // Scenario: a captured payload from this repo's own runner normalises without ordinals or
  // a plan line.
  {
    name: "54/00 normalisers: this repo's own runner — every `ok - <name>` enumerated, with no plan line and no ordinals to lean on",
    run: () => {
      const text = capture("repo-passing.out");
      const okLines = text.split(/\r?\n/).filter((line) => /^ok - /.test(line));
      assert.ok(okLines.length >= 8, `non-vacuity: the capture carries ${okLines.length} \`ok - \` lines`);
      assert.equal(/^\d+\.\.\d+$/m.test(text), false, "the capture really has NO plan line");
      assert.equal(/^ok \d+ - /m.test(text), false, "…and really has NO ordinals");

      const report = tap("repo-passing.out");
      assert.equal(report.ok, true, "the absence of a plan line does not prevent enumeration");
      assert.deepEqual(
        report.cases.map((item) => item.name),
        okLines.map((line) => line.slice("ok - ".length)),
        "every line is enumerated as a passing case under the name it emitted, in order",
      );
      assert.ok(report.cases.every((item) => item.status === "passed"));

      // The `#`-prefixed lines are not enumerated as cases. This capture carries its
      // provenance line; `scripts/test.mjs`'s own section headers (`# unit` :3815,
      // `# integration` :3833, `# cargo (app/desktop)` :3848) are the same shape, and are
      // driven directly below beside the real `# tests`/`# suites` summary lines of the
      // node-runner capture. The rule is one rule: a `#` line is never a case.
      assert.ok(text.startsWith("# captured from:"), "non-vacuity: there IS a `#` line in this capture");
      assert.equal(report.cases.some((item) => item.name.startsWith("#")), false);
      for (const header of ["# unit", "# integration", "# cargo (app/desktop)"]) {
        const withHeader = normaliseTap(`${header}\n${text}`);
        assert.equal(withHeader.cases.length, report.cases.length, `\`${header}\` is not enumerated as a case`);
      }
    },
  },

  // Scenario: reds written to a different stream are absent from the report, not invented
  // into it.
  {
    name: "54/00 normalisers: a stdout-only capture of a FAILING run enumerates only the passes it carried — no red is invented for the exit",
    run: () => {
      const text = capture("repo-failing-stdout.out");
      assert.equal(/^not ok/m.test(text), false, "non-vacuity: the reds really went to the other stream");
      const report = tap("repo-failing-stdout.out");
      assert.deepEqual(
        report.cases.map((item) => [item.name, item.status]),
        [
          ["A rubric run: a case the runner could satisfy", "passed"],
          ["A rubric run: a second case the runner could satisfy", "passed"],
        ],
        "only the passing cases the text carried are enumerated",
      );
      assert.deepEqual(report.failures, [], "no failing case is invented for the run's non-zero exit");
      // Refusing that green is the VERDICT rules' job, not the parser's — proven in
      // test/grade/grade-green-is-evidence.test.mjs against this same capture.
    },
  },

  // Scenario: a case with no status is enumerated, and it is not a passing case.
  {
    name: "54/00 normalisers: a case the deadline cut off is enumerated under its emitted name, carrying NO status",
    run: () => {
      const report = tap("node-truncated.tap");
      assert.equal(report.ok, true);
      const statusless = report.cases.filter((item) => item.status == null);
      assert.equal(statusless.length, 1);
      assert.equal(statusless[0].name, "this one is ok to the eye and red to the runner", "under its emitted name");
      assert.equal(
        report.cases.filter((item) => item.status === "passed").length,
        1,
        "it is not counted toward the passing cases — only the one case that really resolved is",
      );
      // And on a COMPLETE capture the same announcement resolves, so it is counted once and
      // never as a statusless twin.
      const complete = tap("node-mixed.tap");
      assert.equal(complete.cases.filter((item) => item.status == null).length, 0);
      assert.equal(complete.cases.length, 3);
    },
  },

  // Scenario: identity and status come from the format's own fields, never from the words in
  // the name.
  {
    name: "54/00 normalisers: a PASSING case named \"…fail…\" and a FAILING one named \"…ok…\" are read from the markers, never from the words",
    run: () => {
      const report = tap("node-mixed.tap");
      const passing = report.cases.find((item) => item.name.includes("fail"));
      const failing = report.cases.find((item) => item.name.startsWith("this one is ok"));
      assert.ok(passing != null && failing != null, "non-vacuity: the adversarial names are really in the capture");
      assert.equal(passing.status, "passed", "the first case's status is a passing one, though its name says `fail`");
      assert.equal(failing.status, "failed", "the second case's status is a failing one, though its name says `ok`");
      // Neither status was derived from the words in either name: swap the NAMES between the
      // two markers in the real text and the statuses follow the markers, not the names.
      const swapped = normaliseTap(
        capture("node-mixed.tap")
          .replace("ok 1 - the grader must not read this name as a failure", "ok 1 - this one is ok to the eye and red to the runner")
          .replace("not ok 2 - this one is ok to the eye and red to the runner", "not ok 2 - the grader must not read this name as a failure"),
      );
      assert.equal(swapped.cases.find((item) => item.name === "this one is ok to the eye and red to the runner").status, "passed");
      assert.equal(swapped.cases.find((item) => item.name === "the grader must not read this name as a failure").status, "failed");
    },
  },

  // Scenario: a failure message is carried as the runner emitted it.
  {
    name: "54/00 normalisers: a multi-line diagnostic is carried verbatim — neither re-worded nor summarised nor truncated, and `scenario` is null",
    run: () => {
      const report = tap("node-mixed.tap");
      assert.equal(report.failures.length, 1);
      const failure = report.failures[0];
      assert.equal(failure.case, "this one is ok to the eye and red to the runner", "the case identity the runner emitted");
      assert.equal(failure.scenario, null, "no join is performed at this layer");
      assert.ok(failure.message.split("\n").length > 5, `the diagnostic is multi-line (${failure.message.split("\n").length} lines)`);
      // Verbatim: every line of the recorded message appears in the captured text, in order,
      // as one contiguous run of the producer's own bytes.
      assert.ok(capture("node-mixed.tap").includes(failure.message), "the message is a contiguous slice of the runner's own text");
      // …and it really is the whole diagnostic, not its first line.
      for (const fragment of ["Expected values to be strictly deep-equal", "code: 'ERR_ASSERTION'", "operator: 'deepStrictEqual'"]) {
        assert.ok(failure.message.includes(fragment), `the message was not truncated before \`${fragment}\``);
      }
    },
  },

  // Scenario Outline: what each element of a captured payload normalises to. Every element
  // is lifted VERBATIM from a named real capture (elementFrom asserts it is really there),
  // then measured as a DELTA against a baseline document — so "contributes nothing" is a
  // measurement rather than an absence of one.
  ...[
    { element: "a passing case marker with a name", fixture: "repo-passing.out", match: /^ok - AOF DSL/, cases: 1, status: "passed" },
    { element: "a failing case marker with a name", fixture: "node-mixed.tap", match: /^not ok 2 - /, cases: 1, status: "failed" },
    { element: "a case marker carrying a skip directive", fixture: "node-skipped.tap", match: /# SKIP /, cases: 1, status: "skipped" },
    { element: "a named case with no marker at all", fixture: "node-truncated.tap", match: /^# Subtest: this one is ok/, cases: 1, status: null },
    { element: "a diagnostic comment line", fixture: "node-vacuous.tap", match: /^# duration_ms /, cases: 0 },
    { element: "a plan line", fixture: "node-vacuous.tap", match: /^1\.\.1$/, cases: 0 },
    { element: "a summary count line", fixture: "node-vacuous.tap", match: /^# tests 1$/, cases: 0 },
    { element: "a blank line", fixture: "node-mixed.tap", match: /^$/, cases: 0 },
  ].map((row) => ({
    name: `54/00 normalisers: ${row.element} contributes ${row.cases === 0 ? "nothing" : `one case ${row.status == null ? "carrying no status" : `counted as ${row.status}`}`}`,
    run: () => {
      const line = elementFrom(row.fixture, row.match);
      const baseline = "TAP version 13\nok - the baseline case\n";
      const before = normaliseTap(baseline);
      const after = normaliseTap(`${baseline}${line}\n`);
      assert.equal(before.cases.length, 1, "non-vacuity: the baseline itself enumerates exactly one case");
      assert.equal(after.cases.length - before.cases.length, row.cases, `\`${line}\` contributes ${row.cases} case(s)`);
      if (row.cases === 1) {
        const added = after.cases[after.cases.length - 1];
        assert.equal(added.status, row.status);
      }
    },
  })),

  // Scenario: a skipped case is neither a pass nor a fail.
  {
    name: "54/00 normalisers: one passing and one skipped case → total two, one skipped, none failed — and the skip is not a pass",
    run: () => {
      const report = tap("node-skipped.tap");
      assert.equal(report.cases.length, 2, "`cases` reports a total of two");
      assert.equal(report.cases.filter((item) => item.status === "skipped").length, 1, "one skipped");
      assert.equal(report.cases.filter((item) => item.status === "failed").length, 0, "none failed");
      assert.equal(
        report.cases.filter((item) => item.status === "passed").length,
        1,
        "the skipped case is not counted toward the passing cases",
      );
      // The producer agrees: its own summary says one pass and one skip.
      assert.ok(capture("node-skipped.tap").includes("# pass 1"), "non-vacuity: the runner's own summary reports one pass");
      assert.ok(capture("node-skipped.tap").includes("# skipped 1"), "…and one skip");
    },
  },

  // FOUND AT REVIEW, not in the contract — and kept, because it is this milestone's own
  // defect shape pointed at this milestone. A `describe` resolves as its OWN result line
  // alongside its children, so counting result lines reports FOUR cases for a suite of
  // three. A rubric declaring `floor: 4` would then be cleared by three tests: an inflated
  // green, produced by the module that exists to refuse inflated greens.
  //
  // The producer is the authority on which is which (`type: 'suite'` vs `type: 'test'`), so
  // the fix reads the format's own field rather than inferring a container from indentation
  // — ADR-006 §1. The runner's own summary is the independent witness.
  {
    name: "54/00 normalisers: a SUITE is not a case — a describe of three enumerates three, and the runner's own summary agrees",
    run: () => {
      const text = capture("node-nested.tap");
      // What the producer itself says it ran — the number the normaliser has to match.
      assert.ok(text.includes("# tests 3"), "non-vacuity: the runner's own summary reports three tests");
      assert.ok(text.includes("# suites 1"), "…and one suite");
      assert.equal(text.split(/\r?\n/).filter((line) => /^\s*(not )?ok \d+ - /.test(line)).length, 4, "…while the text carries FOUR result lines");

      const report = tap("node-nested.tap");
      assert.equal(report.cases.length, 3, "the suite line is not counted as a fourth case");
      assert.deepEqual(
        report.cases.map((item) => item.name),
        ["the first child", "the second child, which is red", "the third child"],
        "the children are the cases, under the names the runner emitted",
      );
      assert.equal(report.cases.filter((item) => item.status === "failed").length, 1, "one red — matching the runner's own `# fail 1`");
      assert.ok(text.includes("# fail 1"), "non-vacuity: the runner really reported one failure");

      // The failing SUITE does not become a second failure either: its `error: '1 subtest
      // failed'` is a restatement of the child's, and reporting both would double-count.
      assert.equal(report.failures.length, 1);
      assert.equal(report.failures[0].case, "the second child, which is red");
      assert.ok(report.failures[0].message.includes("1 !== 4"), "the child's own diagnostic is the one carried");
      assert.equal(
        report.failures[0].message.includes("1 subtest failed"),
        false,
        "…and the suite's summary of it is not",
      );

      // The withdrawal leaves no phantom behind: the suite's `# Subtest:` announcement was
      // retired by its result line, so it must not reappear as a statusless case.
      assert.equal(report.cases.some((item) => item.status == null), false);
      assert.equal(report.cases.some((item) => item.name.startsWith("a suite whose children")), false);
    },
  },

  {
    name: "54/00 normalisers: the suite/case distinction is read from the producer's own field, and a runner that emits no diagnostics is unaffected",
    run: () => {
      // This repo's own runner emits no YAML at all, so it has no containers to exclude —
      // the fix must not cost it a case.
      assert.equal(tap("repo-passing.out").cases.length, 8);
      // And the discriminator really is the field: the SAME capture with `type: 'suite'`
      // rewritten to `type: 'test'` enumerates the suite line too, which is what makes the
      // field (and not indentation, or the word "suite" in the name) the cause.
      const asTests = normaliseTap(capture("node-nested.tap").split("type: 'suite'").join("type: 'test'"));
      assert.equal(asTests.cases.length, 4);
      assert.ok(
        asTests.cases.some((item) => item.name === "a suite whose children are the real cases"),
        "with the field changed, the same line IS enumerated — so the field is what excluded it",
      );
    },
  },

  // Scenario: a declared format with no normaliser is named, never guessed.
  {
    name: "54/00 normalisers: a declared format no normaliser handles is refused — no other format's normaliser is tried against the text",
    run: () => {
      // The text is real, well-formed TAP; only the DECLARED format is one nothing handles.
      const text = capture("repo-passing.out");
      const refused = normaliseReport(text, "junit");
      assert.equal(refused.ok, false, "the declared format could not be read");
      assert.deepEqual(refused.cases, [], "and no other format's normaliser was tried against the text");
      // …which is what makes the refusal a fact about the DECLARATION: the same bytes under
      // the declared format `tap` enumerate eight cases.
      assert.equal(normaliseReport(text, "tap").cases.length, 8);
      // The record names the declared format that could not be read — proven at the compile
      // layer, where `report.format` carries the declared value verbatim.
    },
  },

  // Scenario: a format is only supported when a real capture backs it.
  {
    name: "54/00 normalisers: every supported format is backed by committed captures, each carrying a provenance line — none by a hand-written specimen",
    run: () => {
      const formats = Object.keys(REPORT_FORMATS);
      assert.ok(formats.length > 0, "non-vacuity: there is at least one supported format");
      const onDisk = new Set(readdirSync(fixturesDir).filter((name) => name !== "capture.mjs"));
      for (const format of formats) {
        const entry = REPORT_FORMATS[format];
        assert.equal(typeof entry.normalise, "function", `\`${format}\` names a normaliser`);
        assert.ok(entry.fixtures.length > 0, `\`${format}\` names at least one committed capture`);
        for (const name of entry.fixtures) {
          assert.ok(onDisk.has(name), `${name} is committed under test/fixtures/rubric-reports/`);
          const text = capture(name);
          const provenance = text.split(/\r?\n/)[0];
          assert.match(
            provenance,
            /^# captured from: \S+/,
            `${name} carries a provenance line naming the exact command that produced it (found: ${JSON.stringify(provenance)})`,
          );
          // A capture is not a specimen: it must carry payload beyond its provenance line,
          // and that payload must be something the normaliser can actually read.
          assert.ok(text.split(/\r?\n/).length > 2, `${name} carries a real payload, not just a provenance line`);
          assert.equal(entry.normalise(text).ok, true, `${name} parses in the format it backs`);
        }
      }
      // No committed capture is orphaned either — a fixture nothing claims is a fixture
      // nobody re-runs.
      const claimed = new Set(formats.flatMap((format) => REPORT_FORMATS[format].fixtures));
      assert.deepEqual([...onDisk].filter((name) => !claimed.has(name)).sort(), [], "every committed capture is claimed by a supported format");
    },
  },
];
