// work:doctor — milestone 54 / story 04: THE TRACEABILITY LANE. One pure
// `(snapshot, ctx) => Finding[]` group APPENDED to the engine's `CHECK_GROUPS` registry,
// in `work-doctor-freshness.mjs`'s one-lane shape. It edits no existing group, no spine
// control flow, and `src/work/doctor-controls.mjs` not at all (`66/FF-6605` guards that
// file; this is a SIBLING lane, not an edit to 66's).
//
// WHAT IT FILLS. `src/commands/validate.mjs:57` has shipped this line for six milestones:
// *"Note: test-traceability (@executable → green test; @manual/@uat → VERIFICATION rows) is
// not yet checked here."* This lane fills it, and fills it OUTSIDE `validateWork` — the
// 256-dependent god-node is untouched.
//
// ───────────────────────────────────────────────────────────────────────────────────
// THE JOIN IS DECLARED, NEVER INFERRED, AND THE MEASUREMENT IS THE DECISION.
//
// Across 719 `.feature` files this tree holds 4,744 distinct scenario names; across
// `test/` it declares 5,725 test names. **0** are exactly equal to a scenario name and
// 1,203 contain one. So an exact-name join resolves nothing, and there is no id either —
// `ID_FORMS` in `declared-id.mjs` is five members pinned by set-equality, and
// `validateWork`'s tag check would reject a new scenario tag outright.
//
// That is precisely what `68/ADR-005` legislates for: join on a key both sides hold, and
// report an unattributable result as unattributed. aof asserts ONE thing:
//
//     an emitted case's name CONTAINS an `@executable` scenario name from the item in scope.
//
// QA makes it true by naming the case after the scenario. This is `66/ADR-004`'s leg B one
// level down — *a runner names the cited file's basename* — an instrument already CI-pinned
// in this repository.
//
// IT IS NOT A CLASSIFIER, and the distinction is the milestone's own thesis. `68/03` retired
// exactly that instrument, and `acd-loop-probe-contract` forbids its shape in the loop shell:
// this lane never decides what a result MEANS. The meaning is the status the runner emitted
// (ADR-006 §1); the lane reports only WHETHER a case and a scenario name each other.
//
// A FALLBACK THAT GUESSES IS WORSE THAN A GAP. No fuzzy match, no edit distance, no minimum
// name length (the 25-character figure in the measurement above was a FILTER, not a rule —
// inventing a threshold would make the join's answer depend on a constant nobody declared),
// and no ambiguity code: containment is many-to-many, so a case containing two scenario names
// JOINS BOTH. A scenario name that is a substring of another's is a naming fact about the
// contract, reported by joining both rather than by guessing which was meant.
//
// ACD NEVER EXECUTES ANYTHING (`66/ADR-004` §2), and this lane is held to it at full force:
// no clock, no filesystem, no child process, no dynamic `import()`, no `path.resolve`. The
// report arrives as SNAPSHOT TEXT at the engine's one impure edge, exactly as the controls
// lane's leg B receives its runner texts — which is what makes every answer below
// reproducible from a literal snapshot on any machine, with no filesystem at all.
// TWO PURE LEAVES, AND NO THIRD COPY OF ANYTHING. `feature-parse.mjs` is the repository's
// ONE Gherkin recogniser (`66/ADR-003`) and `work-grade.mjs` is 54/00's ONE report normaliser
// — both are read here and edited not at all. Writing a second normaliser to keep this lane's
// import list shorter would be the exact defect both those rules refuse; the pure leaf
// imports nothing, spawns nothing and reads no clock (FF-5406), so importing it executes
// precisely as much as importing a frozen array does.
// `node:path` for `join` ONLY — never `path.resolve`, which reads `process.cwd()` and would
// be a hidden impurity in a lane whose whole contract is that it is a function of the
// snapshot. This is the controls lane's own admission, for its own reason: a finding's path
// must be OS-NATIVE, because the engine filters findings to scope by path and a
// forward-slash join silently drops every finding it anchors on Windows (measured at this
// story's build — `scenario-unjoined` produced correctly and filtered away unseen).
import path from "node:path";
import { parseFeature } from "../feature-parse.mjs";
import { normaliseReport } from "./grade.mjs";

// THE LANE'S OWN CODES — a DIFFERENT frozen array from `CONTROL_FINDING_CODES`, which is
// what makes these codes structurally incapable of reaching the loop's doctor rung: 54/02's
// admitted set is derived by filter FROM THAT OTHER ARRAY, so no severity change here can
// ever leak into a gate.
export const RUBRIC_FINDING_CODES = Object.freeze([
  // ADVISORY, both of them (ADR-006 §4). They are the same two members `GRADE_CODES` holds
  // apart from its verdict-moving seven — a second question asked of the same data.
  "case-unjoined",
  "scenario-unjoined",
  // The honest NO-OP. `roadmap-folder-mismatch`'s idiom verbatim
  // (`work-doctor-freshness.mjs:9-11`): the leg did not run AND SAYS SO, naming the key that
  // would activate it — never silence, and never an alarm.
  "rubric-join-unchecked",
]);

// The config key an unconfigured project is told to set. Named here rather than spelled into
// a message, so the lane and its finding cannot drift apart.
export const RUBRIC_REPORT_CONFIG_KEY = "work.rubric.report";

// The declared report, resolved from config in ONE place. Two callers build the doctor's
// snapshot — `commands/doctor.mjs` at the impure edge and `doctorWork`'s own default — and a
// key read twice is a key that can be read two ways. `null` is the honest absent: the lane
// then reports that the join was not checked and names this key, rather than passing silently.
export function declaredReportFrom(config) {
  const declared = config?.work?.rubric?.report;
  if (typeof declared?.path !== "string" || declared.path.length === 0) return null;
  return { path: declared.path, format: declared.format ?? null };
}

// BOTH LEGS REPORT AT `warn`, DELIBERATELY, AND THIS DEPARTS FROM THE HORIZON ON PURPOSE.
// `severityFor` would render an open item's finding at `error`, and measured at refine ~75%
// of this tree's 4,290 `@executable` scenarios would report `scenario-unjoined` ON ARRIVAL.
// An `error` would be a wall of inherited red — the pathology chore 64 exists to clean up and
// the one `70/ADR-007` refuses by name. `warn` is the honest reading of an advisory lane: a
// gap being surfaced, not a rule being broken. The departure is stated rather than hidden,
// which is why this module imports `acceptance-horizon.mjs` not at all.
const ADVISORY_SEVERITY = "warn";

// ------------------------------------------------------------------ the scenarios ----

// The `@executable` scenario names an item declares, each with the file that declares it.
//
// READ THROUGH THE REPOSITORY'S SINGLE FEATURE PARSER (`66/ADR-003`), which is why a scenario
// inheriting `@executable` from its FEATURE line counts exactly as one tagged on its own line:
// the lane holds no second copy of the Gherkin grammar and writes no second parser. `lane`
// is the parser's own resolved answer, so `@manual` and `@uat` scenarios are never offered to
// the join — they are a different verification lane's business, and reporting them unjoined
// would be this lane inventing an obligation nobody declared.
export function executableScenariosOf(item) {
  const texts = item?.featureTexts;
  if (texts == null || typeof texts !== "object") return [];
  const out = [];
  for (const file of Object.keys(texts)) {
    const parsed = parseFeature(texts[file]);
    for (const scenario of parsed.scenarios ?? []) {
      if (scenario.lane !== "executable") continue;
      if (typeof scenario.name !== "string" || scenario.name.length === 0) continue;
      out.push({ name: scenario.name, file, line: scenario.line ?? null });
    }
  }
  return out;
}

// ------------------------------------------------------------------ the join ----

// joinCases(scenarios, cases) → { joins, unjoinedCases, unjoinedScenarios }
//
// CONTAINMENT, AND NOTHING WEAKER. `"the ratchet is a backstop"` does not join
// `"the ratchet is the backstop"` — a near-match is a miss, reported as one, because
// inferring from it is the guess this whole lane exists to refuse.
//
// MANY-TO-MANY BY CONSTRUCTION: every scenario a case's name contains is joined, and a
// scenario named by any case is joined. No first-match-wins, no ambiguity code.
export function joinCases(scenarios, cases) {
  const joins = [];
  const namedScenarios = new Set();
  const unjoinedCases = [];
  for (const emitted of cases) {
    const name = typeof emitted?.name === "string" ? emitted.name : "";
    const matched = scenarios.filter((scenario) => name.includes(scenario.name));
    if (matched.length === 0) {
      unjoinedCases.push({ name, status: emitted?.status ?? null });
      continue;
    }
    for (const scenario of matched) {
      namedScenarios.add(scenario.name);
      // The join carries the status THE RUNNER EMITTED, verbatim and un-interpreted. The
      // lane forms no opinion about whether a failure is acceptable — that is the whole of
      // ADR-006 §1, and the reason nothing below reads a case's free text.
      joins.push({ scenario: scenario.name, file: scenario.file, case: name, status: emitted?.status ?? null });
    }
  }
  const unjoinedScenarios = scenarios.filter((scenario) => !namedScenarios.has(scenario.name));
  return { joins, unjoinedCases, unjoinedScenarios };
}

// ------------------------------------------------------------------ the lane ----

const finding = (code, path, message) => ({ code, severity: ADVISORY_SEVERITY, path, message });

// The report the engine read for us, or a reason it could not be read. `null` means the key
// is ABSENT; `{ present: false }` means declared and not on disk; `{ ok: false }` means it
// was there and did not parse. Each is a DIFFERENT sentence, because "we never looked",
// "we looked and it was gone" and "we read it and it said nothing we understand" are three
// different facts about a project, and collapsing them is how a gap becomes a green.
// readReport(snapshot) → { cases } | { reason }
//
// `null` means the key is ABSENT; `present: false` means declared and not on disk; a text
// that does not normalise means it was there and said nothing we understand. Each is a
// DIFFERENT sentence, because "we never looked", "we looked and it was gone" and "we read it
// and could not read it" are three different facts about a project, and collapsing them is
// how a gap becomes a green.
//
// THE UNPARSEABLE TEXT IS NEVER SCANNED FOR SCENARIO NAMES. `normaliseReport` answers
// `{ ok: false }` for a text that carries none of its format's own structural elements, and
// this returns at that point — a substring sweep over arbitrary text would "find" scenarios
// in a stack trace.
export function readReport(snapshot) {
  const report = snapshot?.rubricReport ?? null;
  if (report == null) {
    return { reason: `no "${RUBRIC_REPORT_CONFIG_KEY}" is configured, so there is no runner report to join against — set it to have the @executable scenarios checked against the cases a run actually emitted` };
  }
  if (report.present !== true || typeof report.text !== "string") {
    return { reason: `"${RUBRIC_REPORT_CONFIG_KEY}" declares ${report.path ?? "a report path"} and no file is there, so the join could not be checked — run the rubric (\`aof work grade <ref> --run\`) to produce one` };
  }
  const normalised = normaliseReport(report.text, report.format);
  if (normalised.ok !== true) {
    return { reason: `the report at ${report.path ?? "the declared path"} did not parse as ${report.format ?? "its declared format"}, so the join could not be checked — no scenario is reported unjoined on the strength of a report that was never read` };
  }
  return { cases: normalised.cases };
}

// rubricTraceabilityGroup(snapshot) → Finding[]
//
// PURE over the snapshot it is handed: no clock, no filesystem, no `path.resolve`, no
// process state. The engine filters to scope, so this walks every item and each row's
// findings anchor at that item — horizon-scoping is the spine's, exactly as it is for every
// other lane.
export function rubricTraceabilityGroup(snapshot) {
  const findings = [];
  const items = snapshot?.items ?? [];

  // THE HONEST NO-OP, ONCE PER ITEM THAT HAS SOMETHING TO CHECK — never once per scenario,
  // and never silently. It reports that the join WAS NOT CHECKED, which is a different claim
  // from "the join resolved": reporting every scenario unjoined on the strength of a report
  // nobody read would be "green for the wrong reason" wearing the opposite sign.
  const read = readReport(snapshot);
  const reason = read.reason ?? null;

  for (const item of items) {
    const scenarios = executableScenariosOf(item);
    if (reason != null) {
      // An item declaring no `@executable` scenario has nothing this lane could check, so it
      // gets no no-op notice either — a notice on every item in the stream would be noise
      // about a lane that was never going to say anything for them.
      if (scenarios.length > 0) findings.push(finding("rubric-join-unchecked", item.dir, `${item.ref}: ${reason}`));
      continue;
    }

    const { unjoinedCases, unjoinedScenarios } = joinCases(scenarios, read.cases);

    for (const scenario of unjoinedScenarios) {
      findings.push(finding(
        "scenario-unjoined",
        path.join(item.dir, scenario.file),
        `${item.ref}: the @executable scenario "${scenario.name}" is named by no case the runner emitted — name a case after it, or it is a contract nothing is known to test`,
      ));
    }
    // A case is the RUN's, not an item's, so it is reported once — against the item whose
    // scenarios it failed to name. An item declaring no scenarios at all cannot be the one
    // that should have named it, so the report is anchored on the items that do.
    if (scenarios.length > 0) {
      for (const emitted of unjoinedCases) {
        findings.push(finding(
          "case-unjoined",
          item.dir,
          `${item.ref}: the emitted case "${emitted.name}" names no @executable scenario of this item — nothing was guessed about which one it might have meant`,
        ));
      }
    }
  }

  return findings;
}
