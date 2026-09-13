// milestone 54 / story 00 — THE GRADE RECORD. Green is positive evidence, and an exit code
// is none of it.
//
// THE PURE LEAF (ADR-003 §1, FF-5406). This module imports only the equally pure
// provenance compiler — never `node:child_process` or `node:fs` — and reads no clock. It COMPILES a record from
// observations that are HANDED to it; the impure edge that gathers them (the spawn, the
// config read, the file read) is 54/01's `src/commands/grade.mjs`, and the code that
// produces the two advisory join observations is 54/04's doctor lane. That shape is
// `70/ADR-002`'s and `graphify.mjs`'s `graphifySpawnOptions`': exported and pure precisely
// so a unit test can assert the guards without a live binary.
//
// WHY IT EXISTS, MEASURED (ADR-005). At HEAD, `node --test
// test/arch/audit/acd-controls-never-execute.test.mjs` reports `ok 1`, `# suites 0`, exit 0 —
// against a file declaring FOUR real arch-tests. NONE OF THEM RAN. A grader reading that as
// green ships a lie into the loop's own termination decision. The capture is committed at
// `test/fixtures/rubric-reports/node-vacuous.tap` and this module is graded against it.
//
// ADR-001's consequence binds every line below: aof never INFERS a result. Every fact in a
// grade is either something QA declared (the rubric) or something the runner EMITTED (the
// report). Nothing here derives an identity, a status or a meaning from free prose —
// `68/03` retired that instrument and the ruling applies here at full force.

import { compileProvenance } from "../claim-provenance.mjs";

// ---------------------------------------------------------------- the vocabularies ----

// A CLOSED TRIPLE (ADR-005 §1). The third member is not invented: `verify.md:104` already
// ships `INCONCLUSIVE` for design conformance — *"name the missing baseline as the gap
// rather than inferring"*. This is that vocabulary one level over.
export const GRADE_VERDICTS = Object.freeze(["pass", "fail", "indeterminate"]);

// FROZEN, AND EVERY MEMBER HAS A NAMED PRODUCER (ADR-005 §3; `m20/R2`: *a frozen and
// classified key with no writer is a contract hole*). The ORDER is the contract too — codes
// are reported in this order however they were observed, so two grades carrying the same
// set report identically.
export const GRADE_CODES = Object.freeze([
  // → INDETERMINATE. `rubric-unconfigured` is the honest no-op; the rest are a runner aof
  //   could not launch, could not outlast, or whose report is absent, unparseable, or below
  //   the evidence floor.
  "rubric-unconfigured",
  "runner-spawn-failed",
  "runner-timeout",
  "report-missing",
  "report-unreadable",
  "report-vacuous",
  // → FAIL. At least one enumerated case reported a failing status.
  "case-failed",
  // → ADVISORY (ADR-006 §4). Recorded, and they NEVER move the verdict — a second question
  //   asked of the same data, stated apart so neither is mistaken for the other.
  "case-unjoined",
  "scenario-unjoined",
]);

// The two that are advisory, named rather than counted — a reviewer reading the verdict
// rules should not have to know that "the last two" means "the advisory ones".
export const ADVISORY_CODES = Object.freeze(["case-unjoined", "scenario-unjoined"]);

// The statuses a normalised case may carry. `null` is the fourth possibility and is
// deliberately NOT a member: a case with no status is not a passing case (ADR-005 §2d), and
// making its absence a value would let it be treated as one.
export const CASE_STATUSES = Object.freeze(["passed", "failed", "skipped"]);

// A FORMAT IS ONLY SUPPORTED WHEN A REAL CAPTURE BACKS IT (`m38/ADR-008`). Each entry names
// its normaliser and the committed captures it was proven against; the arch-test walks this
// registry rather than a list written beside it, so a format cannot be added without its
// evidence. `tap` covers BOTH producers this repo has — node's test runner (ordinals, a
// plan line, YAML diagnostics, a `# tests` summary) and this repo's own runner (bare
// `ok - <name>`, no ordinal, no plan, no summary) — because they are the same format, one a
// subset of the other. A normaliser written against one and asserted against a hand-made
// specimen of the other would ship broken and read as correct.
export const REPORT_FORMATS = Object.freeze({
  tap: Object.freeze({
    normalise: normaliseTap,
    fixtures: Object.freeze([
      "node-vacuous.tap",
      "node-mixed.tap",
      "node-truncated.tap",
      "node-skipped.tap",
      "node-nested.tap",
      "repo-passing.out",
      "repo-failing-stdout.out",
    ]),
  }),
});

// --------------------------------------------------------------- the TAP normaliser ----
//
// ITS JOB IS NARROW AND ABSOLUTE: report what the text carried. It invents no failure it
// did not see, and it swallows no contradiction either — refusing a green that sits beside
// a non-zero exit is the VERDICT rules' job below, never the parser's.
//
// Identity and status come from the format's own marker fields, never from the words in a
// name (ADR-006 §1, FF-5408's behavioural twin): `node-mixed.tap` carries a PASSING case
// whose name contains "fail" and a FAILING one whose name contains "ok", captured from a
// real run precisely so this cannot be got right by accident.

// `ok 1 - name`, `ok - name`, `not ok 2 - name`, `not ok - name`. The ordinal is OPTIONAL
// (this repo's runner emits none) and so is the ` - ` separator's leading number.
const RESULT_LINE = /^(?<indent>\s*)(?<negated>not\s+)?ok\b(?:\s+(?<ordinal>\d+))?\s*(?:-\s*)?(?<rest>.*)$/;
// A TAP directive on a result line: `# SKIP <reason>` / `# TODO <reason>`.
const DIRECTIVE = /\s+#\s*(?<directive>skip|todo)\b(?<reason>.*)$/i;
// node's reporter ANNOUNCES a case before resolving it. On a complete report every
// announcement has a matching result line and this contributes nothing; on a report a
// deadline cut off, the last announcement stands alone — a case the runner really emitted,
// carrying no status.
const SUBTEST_LINE = /^\s*#\s*Subtest:\s*(?<name>.*)$/;
const PLAN_LINE = /^\s*\d+\.\.\d+\s*$/;
const VERSION_LINE = /^\s*TAP\s+version\s+\d+\s*$/i;
const YAML_OPEN = /^\s*---\s*$/;
const YAML_CLOSE = /^\s*\.\.\.\s*$/;
// A CONTAINER IS NOT A CASE, AND THE PRODUCER SAYS WHICH IS WHICH. A `describe` resolves as
// its own `ok N - <name>` line ALONGSIDE its children, so counting result lines reports FOUR
// cases for a suite of three — an inflated total, in the module that exists to refuse
// inflated greens, and enough to clear a declared `floor: 4` with three tests. node marks
// the difference in its own diagnostic field (`type: 'suite'` vs `type: 'test'`), so this is
// read from the format rather than inferred from indentation or from the words in a name
// (ADR-006 §1). A producer that emits no diagnostics — this repo's own runner — has no
// containers to exclude and is unaffected. The runner's own summary is the witness:
// `# tests 3`, `# suites 1`, over `node-nested.tap`.
const SUITE_TYPE = /^\s*type:\s*['"]suite['"]\s*$/m;

// A TAP document is one that carries at least one of the format's own structural elements:
// a version header, a plan line, a result line, or a subtest announcement. Text with NONE
// of them did not parse in the declared format — which is `report-unreadable`, a different
// fact from a document that parsed and enumerated nothing (`report-vacuous`).
function looksLikeTap(lines) {
  return lines.some(
    (line) => VERSION_LINE.test(line) || PLAN_LINE.test(line) || SUBTEST_LINE.test(line) || RESULT_LINE.test(line),
  );
}

// normaliseTap(text) → { ok, cases, failures } | { ok: false }
//
// `cases` is `[{ name, status }]` in EMITTED order, `status` one of CASE_STATUSES or null.
// `failures` is `[{ case, message, scenario }]` — `scenario` ALWAYS null here, because no
// join is performed at this layer and an absent join is not an unjoined one (ADR-006 §4).
export function normaliseTap(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  if (!looksLikeTap(lines)) return { ok: false, cases: [], failures: [] };

  const cases = [];
  const failures = [];
  // Announced-but-not-yet-resolved case names, in announcement order.
  const announced = [];
  // The failure a diagnostic block or trailing prose currently belongs to.
  let openFailure = null;
  // The case the most recent result line produced, and the diagnostic block that follows it
  // — the block is what says whether that line was a case or a CONTAINER of cases.
  let lastCase = null;
  let yamlDepth = 0;
  let yamlLines = null;

  const closeFailure = () => {
    if (openFailure && openFailure.lines.length > 0) {
      openFailure.entry.message = openFailure.lines.join("\n");
    }
    openFailure = null;
  };

  // A result line the producer then declares to be a SUITE is withdrawn: it and its failure
  // entry are removed, because its children are the cases and they are enumerated in their
  // own right. Withdrawing rather than skipping is what keeps the announcement bookkeeping
  // honest — the `# Subtest:` line was already retired by the result line, so a suite leaves
  // behind no phantom statusless twin.
  const withdrawSuite = () => {
    if (lastCase == null) return;
    const at = cases.indexOf(lastCase);
    if (at >= 0) cases.splice(at, 1);
    const failureAt = failures.findIndex((entry) => entry.case === lastCase.name);
    if (lastCase.status === "failed" && failureAt >= 0) failures.splice(failureAt, 1);
    lastCase = null;
  };

  for (const line of lines) {
    // A YAML diagnostic block belongs VERBATIM to the failure it follows — the runner's own
    // text, neither re-worded nor summarised nor truncated. Its lines are never cases.
    if (yamlDepth > 0) {
      if (YAML_CLOSE.test(line)) {
        yamlDepth = 0;
        if (SUITE_TYPE.test(yamlLines.join("\n"))) withdrawSuite();
        yamlLines = null;
        closeFailure();
      } else {
        yamlLines.push(line);
        if (openFailure) openFailure.lines.push(line);
      }
      continue;
    }
    if (YAML_OPEN.test(line)) {
      // A diagnostic block on a PASSING case carries no failure to attach to; it is still
      // never a case — and it may still be the block that declares its subject a suite.
      yamlDepth = 1;
      yamlLines = [];
      continue;
    }

    // A diagnostic block only ever describes the result line IMMEDIATELY before it, so any
    // other structural line ends the last case's claim on one. Without this, a `type:
    // 'suite'` block appearing later in the document could withdraw an unrelated case.
    if (VERSION_LINE.test(line) || PLAN_LINE.test(line)) {
      closeFailure();
      lastCase = null;
      continue;
    }

    const subtest = SUBTEST_LINE.exec(line);
    if (subtest) {
      closeFailure();
      lastCase = null;
      announced.push(subtest.groups.name.trim());
      continue;
    }

    const result = RESULT_LINE.exec(line);
    if (result) {
      closeFailure();
      const { negated, rest } = result.groups;
      const directive = DIRECTIVE.exec(rest);
      const name = (directive ? rest.slice(0, directive.index) : rest).trim();
      // A resolved case retires its announcement, so it is counted exactly once.
      const pending = announced.indexOf(name);
      if (pending >= 0) announced.splice(pending, 1);

      const skipped = directive != null && directive.groups.directive.toLowerCase() === "skip";
      const status = skipped ? "skipped" : negated ? "failed" : "passed";
      lastCase = { name, status };
      cases.push(lastCase);
      if (status === "failed") {
        const entry = { case: name, message: "", scenario: null };
        failures.push(entry);
        openFailure = { entry, lines: [] };
      }
      continue;
    }

    // Everything else: a `#` comment (a section header, a summary count, this fixture's own
    // provenance line), a blank line, or free prose. None of them is a case. Prose following
    // a failing case is that failure's message — which is how this repo's own runner's stack
    // trace reaches the record when stdout and stderr were captured together.
    if (line.trim() === "") {
      continue;
    }
    if (line.trim().startsWith("#")) {
      closeFailure();
      lastCase = null;
      continue;
    }
    if (openFailure) openFailure.lines.push(line);
  }
  closeFailure();

  // Whatever was announced and never resolved is a case the runner emitted and did not
  // settle — enumerated under its emitted name, carrying NO status.
  for (const name of announced) cases.push({ name, status: null });

  return { ok: true, cases, failures };
}

// normaliseReport(text, format) — the ONE door. The normaliser is looked up BY the declared
// format and no other format's normaliser is ever tried against the text: a declared format
// with no normaliser is NAMED, never guessed.
export function normaliseReport(text, format) {
  const entry = Object.prototype.hasOwnProperty.call(REPORT_FORMATS, format) ? REPORT_FORMATS[format] : null;
  if (entry == null) return { ok: false, cases: [], failures: [] };
  return entry.normalise(text);
}

// ------------------------------------------------------------------ the counts ----

function countCases(cases) {
  let failed = 0;
  let skipped = 0;
  for (const item of cases) {
    if (item.status === "failed") failed += 1;
    else if (item.status === "skipped") skipped += 1;
  }
  return { total: cases.length, failed, skipped };
}

// THE ZERO COUNTS ARE REPORTED, NOT OMITTED. `cases` is the evidence, and evidence that
// there was nothing to count is still evidence (ADR-005 §4).
const NO_CASES = () => ({ total: 0, failed: 0, skipped: 0 });

// THE EVIDENCE MEASURE — ONE expression, because the floor and the ratchet's bar must be
// the same measure or they refuse healthy runs (ADR-005 §2(c) as amended, F-54-00-2).
// A SKIPPED CASE IS NOT EVIDENCE: it evidences something about the run, and nothing about
// whether anything was verified. `cases` is still REPORTED as observed (§4) — this measure
// governs what must clear the floor, never what the record says was seen.
function casesThatRan(cases) {
  const total = Number.isFinite(cases?.total) ? cases.total : 0;
  const skipped = Number.isFinite(cases?.skipped) ? cases.skipped : 0;
  return Math.max(0, total - skipped);
}

// ------------------------------------------------------------------ the ratchet ----
//
// The declared floor is the PRIMARY defence and the ratchet is the BACKSTOP (`69/ADR-004`'s
// primary/backstop idiom): a grade observing fewer cases than the last recorded `pass` for
// the SAME ref is vacuous with no configuration at all. Only a recorded `pass` raises the
// bar — a `fail` or an `indeterminate` observing forty cases says nothing about how many
// cases a healthy run of this item enumerates.
//
// SCOPED TO THE ITEM, STRUCTURALLY. The history is filtered by `ref` HERE rather than
// trusted to arrive pre-filtered: another item's history must not be able to raise or lower
// this item's floor, and a property that depends on a caller's good manners is not one.
//
// THE BAR IS DRAWN ON THE SAME MEASURE IT IS COMPARED AGAINST (ADR-005 §2(c) as amended,
// 2026-08-22 / F-54-00-2): `casesThatRan`, not `cases.total`. Drawing the bar from the
// enumerated total while comparing it against what ran is the bug available here — a suite
// legitimately skipping ten of forty would set a bar of forty and then refuse its own
// healthy re-run. A history entry that omits `skipped` reads as none, never as NaN.
function ratchetFloor(history, ref) {
  let highest = 0;
  for (const entry of Array.isArray(history) ? history : []) {
    if (entry?.ref !== ref) continue;
    if (entry?.verdict !== "pass") continue;
    const ran = casesThatRan(entry?.cases);
    if (ran > highest) highest = ran;
  }
  return highest;
}

// The floor a report must clear, measured against `casesThatRan`: a case that ACTUALLY RAN,
// ALWAYS (a report of nothing — or of nothing but skips — is never evidence), raised by
// whatever the rubric declared and by the ratchet.
export function evidenceFloor({ declared = null, history = [], ref = null } = {}) {
  const declaredFloor = Number.isFinite(declared) && declared > 0 ? declared : 0;
  return Math.max(1, declaredFloor, ratchetFloor(history, ref));
}

// ------------------------------------------------------------------ the compiler ----

// Codes are reported in GRADE_CODES' own frozen order, never in the order observed, and
// never twice.
function orderCodes(codes) {
  const seen = new Set(codes);
  return GRADE_CODES.filter((code) => seen.has(code));
}

// The advisory observations 54/04's join lane produces. An ABSENT join is not an unjoined
// one: with no join observation at all, neither advisory code appears.
function advisoryCodes(join) {
  if (join == null) return [];
  const codes = [];
  if (Array.isArray(join.unjoinedCases) && join.unjoinedCases.length > 0) codes.push("case-unjoined");
  if (Array.isArray(join.unjoinedScenarios) && join.unjoinedScenarios.length > 0) codes.push("scenario-unjoined");
  return codes;
}

// The runner leg of the record: what was ACTUALLY run, reported verbatim whatever the
// verdict. These are the OBSERVED values — nothing here is re-derived from the verdict.
function runnerRecord(runner) {
  if (runner == null) return null;
  return {
    command: runner.command ?? null,
    cwd: runner.cwd ?? null,
    exit: runner.exit ?? null,
    durationMs: runner.durationMs ?? null,
  };
}

// The declared report triple. `floor` is the DECLARED value or null — the record says what
// QA declared, and the floor actually applied is `evidenceFloor` above, which a reader can
// recompute from `cases` and the history rather than being told a number nobody declared.
function reportRecord(rubric) {
  const declared = rubric?.report;
  if (declared == null) return null;
  return {
    format: declared.format ?? null,
    path: declared.path ?? null,
    floor: Number.isFinite(declared.floor) ? declared.floor : null,
  };
}

function record({ ref, verdict, codes, runner, report, cases, failures, gradedAt, provenance }) {
  // The record's key set is EXACT and ordered (54/ADR-005 §4, extended by 55/ADR-003).
  return {
    ref: ref ?? null,
    verdict,
    codes: Object.freeze(orderCodes(codes)),
    runner,
    report,
    cases,
    failures,
    gradedAt: gradedAt ?? null,
    provenance: provenance == null ? null : compileProvenance(provenance),
  };
}

// compileGrade(observation) → GradeRecord
//
// The observation is everything the impure edge gathered:
//   ref        the item graded — the ratchet's scope
//   gradedAt   an INJECTED timestamp; this module reads no clock
//   rubric     null when the project declares no `work.rubric`; else { report: {format, path, floor} }
//   runner     null when nothing ran; else { command, cwd, exit, durationMs, outcome }
//              where outcome is "completed" | "spawn-failed" | "timed-out"
//   report     null when nothing was read; else { present: boolean, text: string|null }
//   join       null when no join was performed; else { unjoinedCases: [], unjoinedScenarios: [] }
//   history    prior grade records — filtered to `ref` here, never trusted to arrive scoped
//
// THE VERDICT RULES, IN THE ORDER THEY ARE APPLIED (ADR-005 §2).
export function compileGrade(observation = {}) {
  const { ref = null, gradedAt = null, provenance = null, rubric = null, runner = null, report = null, join = null, history = [] } = observation;
  const advisory = advisoryCodes(join);
  const declaredReport = reportRecord(rubric);
  const observedRunner = runnerRecord(runner);

  // 1 — UNCONFIGURED IS AN HONEST NO-OP (ADR-004 §4). Nothing was run and nothing was read,
  //     so `runner` and `report` read null and the counts read zero rather than being
  //     absent. It is NEVER read as `pass`, and the loop proceeds exactly as it does today.
  if (rubric == null) {
    return record({
      ref,
      verdict: "indeterminate",
      codes: ["rubric-unconfigured", ...advisory],
      runner: null,
      report: null,
      cases: NO_CASES(),
      failures: [],
      gradedAt,
      provenance,
    });
  }

  const indeterminate = (code, cases = NO_CASES(), failures = []) =>
    record({ ref, verdict: "indeterminate", codes: [code, ...advisory], runner: observedRunner, report: declaredReport, cases, failures, gradedAt, provenance });

  // 2 — THE EXIT STATUS IS CHECKED FIRST (`m11/R2`: *a command that wraps a subprocess must
  //     check the subprocess's exit status before reading its expected output*). A runner
  //     that never started or was killed at its deadline has no report worth reading, and
  //     saying which of the two happened is the whole value of these two codes.
  if (runner?.outcome === "spawn-failed") return indeterminate("runner-spawn-failed");
  if (runner?.outcome === "timed-out") return indeterminate("runner-timeout");

  // 3 — (a) THE DECLARED REPORT EXISTS.
  if (report == null || report.present !== true) return indeterminate("report-missing");

  // 4 — (b) IT PARSES IN ITS DECLARED FORMAT. The declared format is named in the record;
  //     no other format's normaliser is tried against the text.
  const normalised = normaliseReport(report.text, declaredReport?.format);
  if (!normalised.ok) return indeterminate("report-unreadable");

  const cases = countCases(normalised.cases);
  const failures = normalised.failures;

  // 5 — A REPORTED RED IS A RED, WHATEVER THE EXIT STATUS SAID. This precedes every
  //     evidence check below: a runner that enumerated a failing case told us what we came
  //     to find out, and no floor, ratchet or exit code changes that answer.
  if (cases.failed > 0) {
    return record({ ref, verdict: "fail", codes: ["case-failed", ...advisory], runner: observedRunner, report: declaredReport, cases, failures, gradedAt, provenance });
  }

  // 6 — (c) IT ENUMERATES NAMED CASES AT OR ABOVE ITS FLOOR, and (d) EVERY CASE CARRIES A
  //     STATUS. Below this line every remaining refusal is `report-vacuous`: the report is
  //     vacuous AS EVIDENCE. No tenth code is invented for these shapes — `GRADE_CODES`
  //     stays set-equal to the nine.
  const floor = evidenceFloor({ declared: declaredReport?.floor, history, ref });
  const statusless = normalised.cases.some((item) => item.status == null);
  //     A non-zero exit VETOES a pass even when the report shows no red. It is not evidence
  //     of a failure — no failing case is invented for it — but a green report beside a
  //     non-zero exit is a CONTRADICTION, and this repo's own runner produces that shape
  //     exactly: it writes `ok - <name>` to stdout and `not ok - <name>` to stderr
  //     (scripts/test.mjs:3821,3824), so a stdout-only capture of a failing run is an
  //     all-green text beside a non-zero exit. `repo-failing-stdout.out` is that capture.
  const exitVeto = runner != null && runner.exit !== 0 && runner.exit != null;

  //     THE FLOOR MEASURES WHAT RAN, NOT WHAT WAS ENUMERATED (ADR-005 §2(c) as amended,
  //     F-54-00-2). Measured before the amendment: four cases each carrying `# SKIP`, exit
  //     0, floor 4 → `pass` with no codes. Nothing executed and the grade said so. The
  //     counts below are still the observed ones; only the comparison changed.
  if (casesThatRan(cases) < floor || statusless || exitVeto) {
    return indeterminate("report-vacuous", cases, failures);
  }

  // 7 — ALL FOUR PIECES PAID FOR. The advisory codes ride along and move nothing.
  return record({ ref, verdict: "pass", codes: [...advisory], runner: observedRunner, report: declaredReport, cases, failures, gradedAt, provenance });
}

// ------------------------------------------------------------- the payload bound ----
//
// 81/01 — THE FAILURES ARE BOUNDED WHERE THEY ARE WRITTEN, NOT ONLY WHERE A HUMAN READS
// THEM. Before this, the operator line sliced to 20 and the run record's `brief.grade`, the
// cap-exhausted report line and the fix transport's `## REVIEW FINDINGS` each carried the
// record WHOLE — the bound in the one place it does not matter, because a human can stop
// reading and a run record, a report line and a maker's prompt cannot.
//
// `70/ADR-003` IS FOLLOWED VERBATIM: the ceiling lives in the WRITE PATH, this function
// REFUSES to return an over-ceiling payload (*"it is not a lint, not a caller's
// responsibility, and not a comment"*), it STATES in the payload itself that it truncated and
// what it dropped, and it NEVER returns an empty payload — *"a phase handed nothing is
// strictly worse than a phase handed a truncated something."* `70/ADR-003`'s own rejected
// alternative, WARN AND SHIP, is rejected again here for the same reason: a budget nothing
// enforces has already been exceeded.
//
// NO NUMBER IS INVENTED. The entry count is the 20 the operator render already declared,
// PROMOTED from a render-local literal into this one home. The character ceiling is HANDED IN
// — this module keeps its FF-5406 property of importing nothing from `src/`, so the budget a
// surface is spent against is reached for by the caller (70's `PHASE_BRIEF_MAX_CHARS` for the
// payload handed to a maker) and never by this leaf.
//
// `GradeRecord` IS UNCHANGED and so is FF-5403: `compileGrade` still returns the runner's
// verbatim failures, whole, and `aof work grade <ref> --run --json` still carries them, which
// is where the complete truth belongs. What is bounded is every payload WRITTEN from it.

// The entry ceiling's ONE HOME. 20 is not chosen here — it is the number this repository's
// operator render already declared, moved to where every surface can read the same one.
export const GRADE_FAILURE_MAX_ENTRIES = 20;

// The key a truncation statement rides. It is a KEY rather than prose so a reader tells the
// statement from a runner-emitted case without parsing either (`68/03`'s retired instrument).
export const GRADE_TRUNCATION_KEY = "truncation";

const CUT_MARKER = " … (cut to fit)";

// The default measure: the payload AS IT IS WRITTEN for a structured surface. A surface that
// renders differently hands in its own — the fix transport measures what `composeFixInput`
// will actually emit, because "within the ceiling" is a claim about the rendered block.
const measureEntry = (entry) => JSON.stringify(entry ?? null).length;

function truncationStatement({ shown, total, dropped, cut }) {
  const parts = [`${shown} of ${total} failing case(s) shown`];
  if (dropped > 0) parts.push(`${dropped} dropped to fit the payload ceiling`);
  if (cut > 0) parts.push(`${cut} message(s) cut to fit`);
  return `${parts.join("; ")}. The whole record is on the graded run and in \`aof work grade <ref> --json\`.`;
}

// The one entry that does not fit is CUT, never dropped whole (70/ADR-003's never-empty
// rule): the payload still NAMES the case, and says the message was cut. Returns null only
// when even the case name cannot be carried, which leaves the statement as the whole payload.
function cutFailure(failure, budget, measure) {
  const message = String(failure?.message ?? "");
  let room = Math.max(0, budget - measure({ ...failure, message: "" }) - CUT_MARKER.length);
  for (;;) {
    const candidate = { ...failure, message: `${message.slice(0, room)}${CUT_MARKER}` };
    if (measure(candidate) <= budget) return candidate;
    if (room <= 0) return null;
    room -= Math.max(1, Math.ceil(room / 8));
  }
}

// Fit `entries` into `budget`, reserving `reserve` characters for a statement that may follow.
function fitEntries(entries, budget, measure, reserve) {
  if (budget == null) return { fitted: [...entries], cut: 0 };
  const room = budget - reserve;
  const fitted = [];
  let cut = 0;
  let spent = 0;
  for (const entry of entries) {
    const cost = measure(entry);
    if (spent + cost <= room) {
      fitted.push(entry);
      spent += cost;
      continue;
    }
    // NEVER EMPTY. The first entry is cut to fit rather than dropped; a later one that does
    // not fit ends the payload, because everything after it does not fit either.
    if (fitted.length === 0) {
      const trimmed = cutFailure(entry, room, measure);
      if (trimmed != null) {
        fitted.push(trimmed);
        cut += 1;
      }
    }
    break;
  }
  return { fitted, cut };
}

/**
 * The bound every surface that WRITES a grade payload goes through.
 *
 * → `{ failures, truncated, dropped, cut, statement }`, where `failures` is the payload as it
 * is to be written: the kept entries, followed by a single `{ truncation }` entry when — and
 * only when — something was dropped or cut. A payload that already fits is passed through
 * unchanged and says nothing.
 */
export function boundGradeFailures(failures, {
  maxEntries = GRADE_FAILURE_MAX_ENTRIES,
  maxChars = null,
  measure = measureEntry,
} = {}) {
  const all = (Array.isArray(failures) ? failures : []).filter((entry) => entry != null);
  const nothing = Object.freeze({ failures: Object.freeze([]), truncated: false, dropped: 0, cut: 0, statement: null });
  if (all.length === 0) return nothing;

  const entryCeiling = Number.isSafeInteger(maxEntries) && maxEntries > 0 ? maxEntries : GRADE_FAILURE_MAX_ENTRIES;
  const charCeiling = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : null;
  const withinEntryCeiling = all.slice(0, entryCeiling);

  // FIRST, WITH NO RESERVE. A payload that fits whole carries no statement, so it owes no
  // room for one — which is what keeps the untruncated case byte-identical to today's.
  const first = fitEntries(withinEntryCeiling, charCeiling, measure, 0);
  if (first.cut === 0 && first.fitted.length === all.length) {
    return Object.freeze({ failures: Object.freeze(first.fitted), truncated: false, dropped: 0, cut: 0, statement: null });
  }

  // TRUNCATION IS CERTAIN, so the statement's own cost is reserved before anything is fitted.
  // The reserve is the WORST CASE of the real statement — the same sentence at this payload's
  // largest counts — never a round number chosen to look safe.
  //
  // IT IS MEASURED WITH THE CALLER'S OWN `measure`, never the default one. A surface that
  // RENDERS more expensively than it stores — the fix transport renders indented JSON — would
  // otherwise reserve less than its own statement costs, and the payload would clear the
  // ceiling only by whatever slack `fitEntries` happened to leave. That is not a refusal, it
  // is luck, and this function's contract is that an over-ceiling payload is REFUSED.
  const reserve = charCeiling == null
    ? 0
    : measure({ [GRADE_TRUNCATION_KEY]: truncationStatement({ shown: all.length, total: all.length, dropped: all.length, cut: 1 }) });
  const { fitted, cut } = fitEntries(withinEntryCeiling, charCeiling, measure, reserve);
  const dropped = all.length - fitted.length;
  const statement = truncationStatement({ shown: fitted.length, total: all.length, dropped, cut });
  return Object.freeze({
    failures: Object.freeze([...fitted, { [GRADE_TRUNCATION_KEY]: statement }]),
    truncated: true,
    dropped,
    cut,
    statement,
  });
}
