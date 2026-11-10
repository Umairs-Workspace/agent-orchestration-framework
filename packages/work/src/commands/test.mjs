import { normaliseReport } from "../grade.mjs";
import { declaredChangedFiles } from "../testing/declared.mjs";
import { isExcludedTest } from "../testing/select.mjs";

// Application composition supplies execution, graph and shared work services.
export function createTestCommand({ walkSuiteFiles, changedFiles, resolveItemExact, selectSuites, launchRunner, resolveTestToolchain, testRecord = null, selectionSources = null }) {
// `aof test` — THE TEST COMMAND'S FACE (milestone 72 / story 02; ADR-001 §1, §4, ADR-002 §4,
// ADR-003, ADR-008 §5). FF-7204 is its control.
//
// THE CHORE THIS REPLACES IS MEASURED. There is a rule in this repo saying *never run the full
// suite here — run focused suites instead* and, until now, no command that does it. So every agent
// wrote the same throwaway script again: 805 of 4,950 write events in the corpus are scratchpad
// files, and one throwaway command was re-run 33×, 31×, 30×, 26×, 26×, 23×.
//
// ── THIS FILE IS THE 95th SIBLING, AND IT IS THE ONLY ONE 72 ADDS (ADR-008 §5) ────────────────
//
// `src/commands/` is at 94 and TECH_DEBT item 78 already indicts it, so the milestone adds exactly
// one face and every leaf it composes was built elsewhere: the DECLARATION and the BOUNDED LAUNCH
// in `src/work/toolchain.mjs` (72/00), the SELECTION in `src/work/test-select.mjs` and the CHANGED
// SET in `src/work/test-changed.mjs` (72/01), the TAP READER in `src/work/grade.mjs` (54/00), the
// SUITE WALK in `src/work-audit/census.mjs` (59/01). What lives here is composition, one result
// object, and two faces over it — the shape `src/commands/trigger.mjs` already uses over
// `src/work-trigger/**`.
//
// ── FOUR PROPERTIES, AND EACH ONE IS A FAILURE THIS COMMAND WOULD OTHERWISE HAVE ──────────────
//
// 1. FAILURES ONLY, BY DEFAULT — AND THE FILTER READS BOTH STREAMS (ADR-003 §1). The job is
//    answering one question: did my change break anything. Everything a passing test prints is
//    noise against it, and there are thousands of them. But this repo's runner writes `ok - <name>`
//    to STDOUT and `not ok - <name>` plus the stack to STDERR, so a filter reading stdout
//    confidently prints "no failures" over a red run — `src/work/grade.mjs` already carries that
//    finding and a captured fixture of exactly that shape. Both streams and the exit code, and a
//    green-reading report beside a non-zero exit is a CONTRADICTION reported as one.
//
// 2. ONE RESULT, TWO FACES (ADR-003). The way a two-faced command rots is that the human output and
//    the machine output drift, because each is assembled where it is printed — and then a claim
//    verified through `--json` is not the claim an operator reads. `render` and `json` here are
//    both projections of the SAME frozen object, so a field that exists for one exists for the
//    other. `--verbose` ADDS the passing rows and removes nothing: the comparison the contract
//    makes is a containment, never a count of lines.
//
// 3. THE SCOPE FORMS ARE THREE AND THEY ARE CLOSED. `impacted` asks the selector, `file` takes what
//    the caller named, `all` asks nothing and runs everything. There is no fourth, and an
//    unrecognised scope — including an ABSENT one — is a coded refusal rather than a quiet fallback
//    to one of the three. A fallback here is a narrowing nobody asked for, which is the one thing
//    story 01's invariant exists to forbid, and "guess nothing" is the same rule ADR-001 §2 applies
//    to the program itself.
//
// 4. IT REPORTS AND NEVER DECIDES (ADR-002 §4). `09/ADR-004` holds that no graph output feeds a
//    gate, a merge, a status write or a work mutation. A command that selects tests from the graph
//    is the first thing that looks like a breach, so the distinction is exact rather than
//    reassuring: a gate DECIDES A TRANSITION; this decides nothing — it runs a subset and says
//    which subset it ran. Every result carries `gate: false` unless the whole suite ran AND nothing
//    widened, and FF-7204 censuses the doors so a future author who wants to consume it has to add
//    the edge in a file the control watches.
//
// AND NO TEST MODULE ENTERS THIS PROCESS. aof must not import project test code because importing
// it EXECUTES it — 880 modules in this repo. A command whose whole subject is test files is one
// convenience import away from doing exactly that, so there is no dynamic `import()` here on any
// path: the runner is the project's own program, started once through the bounded seam.
//
// ── WHAT THIS STORY DELIBERATELY DOES NOT CARRY: THE REGISTRATION REPORT ──────────────────────
//
// ADR-004 §4 assigns "a selected file that is NOT REGISTERED is reported" to this command, and
// ADR-002 §1c says provenance is 72/02's "where a spawn is available". Neither is buildable from
// this story's declared set. `registrationDecision` needs a `Map<file, exported names>`, and the
// only shipped producer of assembled names is `src/work/audit-probe.mjs`, which returns names with
// NO file of origin (its own contract says so) and belongs to 59 — outside this story's `files:`.
// Reporting every selected file as `audit-runtime-membership-unavailable` would satisfy nothing
// and cost a ~3.5 s child on the inner loop, which ADR-004 §6 rules out in the same breath. So the
// clause is left undischarged and NAMED here rather than half-built: it needs the probe to report
// per-file provenance, which is a story of its own.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment above this module's registry import:
//   milestone 72 / story 02 — `test`, THE TEST COMMAND'S FACE and the ONE command this milestone
//   adds (72/ADR-008 §5; `src/commands/` is at 94 siblings and TECH_DEBT item 78 already indicts
//   it). It composes what 72/00 and 72/01 built — the project-DECLARED runner and its bounded
//   launch, the graph-read selection whose unknowns widen and never narrow — and adds only the
//   face: three closed scope forms, a failures-only report derived from BOTH streams and the exit
//   code, and one result object both `render` and `--json` project. It REPORTS and never decides
//   (72/ADR-002 §4): every result carries `gate: false` unless the whole suite ran and nothing
//   widened, and FF-7204 censuses the status, doctor, loop, audit and bundle doors so no transition
//   can come to read a selection as a verdict. A TOP-LEVEL id, deliberately not `work:test`: both
//   work-command controls filter on `id.startsWith("work:")` and a `work:` id would demand a served
//   `/api/work/test` route. BOARD-DEFERRED for the reason `grade` and `audit` are — a served route
//   would let a page load spawn a test run.
//
// From the comment on `testCommand`'s COMMANDS entry:
//   milestone 72 / story 02 — the test command's face (see the import note).
// The ONE TAP reader (ADR-003 §2). `normaliseReport` already parses `ok - name` / `not ok - name`
// and attaches a failure's diagnostic text VERBATIM — which is this command's output contract,
// already written. A second parser one file over is the duplication species FF-7203 indicts.
// milestone 96 / story 03 (ADR-007 §1) — the SECOND changed-set producer, beside the git one. It
// is an INPUT to the selector below, never a second selector; `selectSuites` is called unchanged.
// The EXACT resolver, and it must be the exact one: a slug fallback would run a near-miss story's
// suites, which is the confidently-wrong-once failure the whole selection family refuses.

// THE THREE CLOSED FORMS. Frozen, so a fourth is an edit with an ADR behind it.
const TEST_SCOPES = Object.freeze(["impacted", "file", "all"]);

// The scope a run that never started ran as. Named rather than left null so the two faces render
// the same word for it and a reader is not asked to interpret an absence.
const NO_SCOPE = "none";

// THE COMMAND'S OWN REFUSALS. Two, because they are two different repairs: name one of the three
// forms, or name the files. The selection's own refusals (`since-rev-unresolvable`,
// `changed-set-empty`, `changed-set-unreadable`) and the toolchain's three are carried through
// VERBATIM — a re-phrasing here would be a second vocabulary for one situation.
const SCOPE_UNRECOGNISED = "test-scope-unrecognised";
const NO_FILES_NAMED = "test-file-scope-names-no-file";
// milestone 96 / story 03 (ADR-007 §2, §4) — TWO MORE, and they are two more repairs rather than
// two more forms. `--story` adds no scope: it SWAPS which producer supplies `changed` inside the
// `impacted` form that already exists.
//
// Two changed-set sources in one run is two answers, and picking one silently is the narrowing
// this family forbids — so naming both is a refusal that names both.
const STORY_AND_SINCE = "test-story-and-since";
// And `--story` outside `impacted` narrows nothing: `file` runs what the caller named and `all`
// asks nothing, so a story ref there is an instruction with no effect, which is worse than an
// error because it looks like it worked.
const STORY_OUTSIDE_IMPACTED = "test-story-outside-impacted";
// 190/ADR-008 §2 — `--commit` replays a past commit's selection, and a run is always of the working
// tree: running that selection on today's tree would name a run that never happened. So `--commit`
// is a `--plan` source only.
const COMMIT_NEEDS_PLAN = "test-commit-needs-plan";

const refusal = (code, message) => Object.freeze({ code, message });

const posix = (file) => String(file).replaceAll("\\", "/");

// Every suite file the declared roots hold, deduped and ordered — the thing a widening widens TO,
// and the denominator of the summary line's `selected/total`. The roots come from the DECLARATION
// (the project's own answer), never from a literal here. So do the suffixes, when declared, and
// the exclusions: a file the declaration says the runner does not run is not a suite
// (190/ADR-008 §6, §7).
async function wholeSuite(projectRoot, toolchain, walk) {
  const suffixes = toolchain.suiteSuffixesDeclared === true ? toolchain.suiteSuffixes : null;
  const out = new Set();
  for (const root of toolchain.roots) {
    for (const file of await walk(projectRoot, posix(root), suffixes)) out.add(posix(file));
  }
  return [...out].filter((file) => !isExcludedTest(file, toolchain.exclude)).sort();
}

// ── THE RESULT (ADR-003) ─────────────────────────────────────────────────────────────────────
//
// ONE object. Both faces are projections of it, so the human face cannot carry a claim `--json`
// does not, and vice versa. Every key is present on every outcome — a consumer that destructures a
// refusal gets the same shape as one that destructures a run, so "absent" never has to be read as
// "fine".
function result(fields) {
  return Object.freeze({
    askedScope: fields.askedScope ?? null,
    scope: fields.scope ?? NO_SCOPE,
    // The story whose declaration supplied the changed set, or null when git did (96/03). It is on
    // the RESULT rather than only in the render, so `--json` carries the same claim the operator
    // reads: a narrowed run has to be able to say what narrowed it.
    story: fields.story ?? null,
    // 190/ADR-008 §2 — the commit whose change supplied the changed set, and whether this was a
    // plan: a selection computed and reported with nothing launched, recorded or answered.
    commit: fields.commit ?? null,
    plan: fields.plan === true,
    // FALSE unless the whole suite ran AND nothing widened — the one case where the subset is not
    // a subset. A widened `all` is still a run over everything, but it got there because something
    // was UNKNOWN, and a verdict resting on an unknown is the confident-wrong-answer species.
    gate: fields.gate === true,
    verbose: fields.verbose === true,
    launched: fields.launched === true,
    selected: Object.freeze([...(fields.selected ?? [])]),
    total: fields.total ?? 0,
    widened: Object.freeze([...(fields.widened ?? [])]),
    changed: Object.freeze([...(fields.changed ?? [])]),
    builtAt: fields.builtAt ?? null,
    graphPath: fields.graphPath ?? null,
    // 190/ADR-003 §5 — how each changed file was placed on a narrowed run, and, per selected suite,
    // which changed files chose it and why. Both empty when nothing narrowed.
    resolutions: Object.freeze([...(fields.resolutions ?? [])]),
    selectedBy: Object.freeze(selectedBy(fields.resolutions ?? [])),
    runner: fields.runner ?? null,
    report: fields.report ?? null,
    refusal: fields.refusal ?? null,
    exit: fields.exit ?? 0,
    // milestone 190 / story 00 (ADR-002 §2) — the record. `reused` names the run an answer came
    // from, and an answered result says `launched: false`; `recorded` names the record a launched
    // run left. `notRecorded` says why a run left none, and `reclaimed` that a stale lock was
    // taken over on the way. Present on every outcome, null or false when they did not happen.
    reused: fields.reused ?? null,
    recorded: fields.recorded ?? null,
    notRecorded: fields.notRecorded ?? null,
    fresh: fields.fresh === true,
    reclaimed: fields.reclaimed === true,
  });
}

// Each selected suite, with every changed file that chose it and the reason that did.
function selectedBy(resolutions) {
  const bySuite = new Map();
  for (const entry of resolutions) {
    for (const suite of entry.suites ?? []) {
      if (!bySuite.has(suite)) bySuite.set(suite, []);
      bySuite.get(suite).push(Object.freeze({ file: entry.file, reason: entry.reason }));
    }
  }
  return [...bySuite.keys()].sort().map((suite) => Object.freeze({ suite, because: Object.freeze(bySuite.get(suite)) }));
}

// A refusal is a RESULT, not a throw: it has to render on both faces, and an operator who asked
// for `--json` is owed the code in the envelope rather than on stderr. Nothing was selected and
// nothing was launched, and the shape says so.
const refused = (askedScope, code, message, extra = {}) =>
  result({ askedScope, scope: NO_SCOPE, launched: false, refusal: refusal(code, message), exit: 1, ...extra });

// ── THE REPORT (ADR-003 §1, §2) ──────────────────────────────────────────────────────────────

// BOTH STREAMS, AND THE EXIT CODE. Concatenated in stream order, which preserves each stream's own
// internal order: the `not ok - <name>` line and the stack that belongs to it are both on stderr
// and stay adjacent, which is what lets the shipped reader attach the diagnostic text verbatim.
function readReport(observed, format) {
  const text = `${observed.stdout ?? ""}\n${observed.stderr ?? ""}`;
  const normalised = normaliseReport(text, format);
  const failures = normalised.ok ? normalised.failures : [];
  const cases = normalised.ok ? normalised.cases : [];
  // A GREEN-READING REPORT BESIDE A NON-ZERO EXIT IS A CONTRADICTION, never a pass. It is the
  // exact shape a stdout-only capture of this repo's own runner produces, and reporting it as
  // "no failures" is the failure this whole clause exists to prevent.
  const contradiction = observed.outcome === "exited"
    && observed.exitCode !== 0
    && failures.length === 0;
  return Object.freeze({
    ok: normalised.ok,
    format,
    cases: Object.freeze(cases.map((entry) => Object.freeze({ ...entry }))),
    failures: Object.freeze(failures.map((entry) => Object.freeze({ ...entry }))),
    contradiction,
  });
}

// ── THE COMMAND'S BODY, PURE OVER ITS SEAMS ──────────────────────────────────────────────────
//
// Every impure edge is injected and defaults to the shipped one, so every row of the contract
// drives without a repository, a graph or a child process — and the SAME code path runs in
// production. `deps` is deliberately not part of the input schema: a seam is not something a
// caller of the CLI gets to choose.
async function runTest(input, deps = {}) {
  const {
    projectRoot,
    config,
    resolveToolchain = resolveTestToolchain,
    readChanged = changedFiles,
    readDeclared = declaredChangedFiles,
    resolveStory = null,
    select = selectSuites,
    walk = walkSuiteFiles,
    run = launchRunner,
    // milestone 190 / story 00 — the record store, and the clock its runs are timed by. NULL BY
    // DEFAULT, and only the CLI face below hands the composed store in: an in-process caller that
    // stubs the runner must never file its stub's verdict as the record of a real tree, which a
    // later real `aof test` on that content would then trust.
    record = null,
    clock = Date.now,
    // 190/01 — what the selector may know about the project's files. Null knows nothing, and then
    // every file the graph does not hold widens, exactly as before.
    sources = selectionSources == null ? null : selectionSources(projectRoot),
  } = deps;

  const askedScope = typeof input?.scope === "string" ? input.scope : null;
  const verbose = input?.verbose === true;
  const story = typeof input?.story === "string" && input.story.trim() !== "" ? input.story.trim() : null;
  const since = input?.since ?? null;
  const commit = typeof input?.commit === "string" && input.commit.trim() !== "" ? input.commit.trim() : null;
  const plan = input?.plan === true;
  const fresh = input?.fresh === true;

  // THE SCOPE IS CHECKED FIRST, AND AN ABSENT ONE IS AS UNRECOGNISED AS A WRONG ONE. Defaulting it
  // would be a narrowing nobody asked for, and the comparison is case-SENSITIVE on purpose: `ALL`
  // is not one of the three, and quietly accepting it is the same guess in a smaller coat.
  if (askedScope == null || !TEST_SCOPES.includes(askedScope)) {
    return refused(
      askedScope,
      SCOPE_UNRECOGNISED,
      `${askedScope == null || askedScope.length === 0 ? "no scope was given" : `the scope ${JSON.stringify(askedScope)} is not one of the three forms`} — name one of ${TEST_SCOPES.join(", ")}. There is no fourth form and no default: a scope aof picked for you is a selection nobody asked for, and a narrowed run reported as a whole one is the failure this command exists to refuse.`,
      { verbose },
    );
  }

  // TWO SOURCES IS TWO ANSWERS (ADR-007 §4, 190/ADR-008 §2). Checked before anything is resolved
  // or read, so the refusal costs nothing and names BOTH rather than picking one — a silently
  // chosen source is the narrowing this family forbids, and it would be invisible in the result.
  const changedSources = [
    story == null ? null : `--story ${JSON.stringify(story)}`,
    since == null ? null : `--since ${JSON.stringify(since)}`,
    commit == null ? null : `--commit ${JSON.stringify(commit)}`,
  ].filter(Boolean);
  if (changedSources.length > 1) {
    return refused(
      askedScope,
      STORY_AND_SINCE,
      `${changedSources.slice(0, -1).join(", ")} and ${changedSources.at(-1)} are ${changedSources.length === 2 ? "two" : "three"} changed-set sources, and a run has one. Choose one; naming more would make aof pick for you, and a narrowing nobody asked for is the failure this command exists to refuse.`,
      { verbose, story, commit },
    );
  }

  // A PAST COMMIT'S SELECTION IS NEVER RUN (190/ADR-008 §2): a run is of the working tree.
  if (commit != null && !plan) {
    return refused(
      askedScope,
      COMMIT_NEEDS_PLAN,
      `--commit ${JSON.stringify(commit)} replays what that commit would have selected, and a run is always of the working tree — running a past commit's selection on today's tree would name a run that never happened. Add --plan to see the selection without running it.`,
      { verbose, commit },
    );
  }

  // `--story` NARROWS THE IMPACTED SCOPE AND NOTHING ELSE (ADR-007 §2), and so does `--commit`. It
  // adds no fourth form: it swaps which producer supplies `changed` inside `impacted`. Under `file`
  // the caller already named the suites and under `all` nothing is selected, so a source there
  // would be an instruction with no effect — which reads as though it worked.
  if ((story != null || commit != null) && askedScope !== "impacted") {
    const flag = story != null ? `--story ${story}` : `--commit ${commit}`;
    return refused(
      askedScope,
      STORY_OUTSIDE_IMPACTED,
      `${flag.split(" ")[0]} narrows the \`impacted\` scope only, and this run asked for ${JSON.stringify(askedScope)}. \`file\` runs the suite files you name and \`all\` runs everything, so it changes neither — ask for \`--scope impacted ${flag}\`, or drop it.`,
      { verbose, story, commit },
    );
  }

  const named = (Array.isArray(input?.files) ? input.files : []).map(posix).filter((file) => file.length > 0);
  if (askedScope === "file" && named.length === 0) {
    return refused(
      askedScope,
      NO_FILES_NAMED,
      "the scope `file` runs the suite files the caller names, and none were named — nothing was selected and no runner was launched. Name at least one suite file, or ask for `impacted` or `all`.",
      { verbose },
    );
  }

  // THE DECLARATION IS THE ONLY SPELLER OF THE PROGRAM (ADR-001 §2). Its three refusals are three
  // different repairs and they are carried through with their own codes and messages.
  const compiled = resolveToolchain(config, { projectRoot });
  if (compiled.ok !== true) {
    return refused(askedScope, compiled.code, compiled.message, { verbose });
  }
  const toolchain = compiled.toolchain;
  const whole = await wholeSuite(projectRoot, toolchain, walk);

  let scope = askedScope;
  let selected = [];
  let widened = [];
  let changed = [];
  let builtAt = null;
  let graphPath = null;
  let resolutions = [];

  if (askedScope === "all") {
    // `all` ASKS NOTHING. No changed set, no graph read, no selection — and therefore no build
    // time to report either, because nothing read an artifact.
    selected = whole;
  } else if (askedScope === "file") {
    selected = named;
  } else {
    // ONE SELECTOR, TWO PRODUCERS (ADR-007 §1). The only thing `--story` changes is which of them
    // supplies `changed`; `select` below is called with the same arguments either way.
    const set = story != null
      ? await readDeclared({ projectRoot, ref: story, resolve: resolveStory })
      : await readChanged({ projectRoot, since, ...(commit == null ? {} : { commit }) });
    if (set.ok !== true) {
      // The selection's own refusals, verbatim. An unresolvable base and an empty changed set are
      // NOT widenings (ADR-002 §5): they differ in kind from the four, and rendering them as one
      // would make "nothing has changed" indistinguishable from "everything is affected".
      return refused(askedScope, set.code, set.message, { verbose, story, commit });
    }
    changed = [...set.changed];
    // 190/ADR-003: the declared suite predicate and couplings, and whether the changed set is a
    // story's declaration — where a path that exists nowhere is not yet written rather than deleted.
    const selection = await select({
      projectRoot,
      changed,
      allSuites: whole,
      roots: toolchain.roots,
      suffixes: toolchain.suiteSuffixes,
      exclude: toolchain.exclude,
      couplings: toolchain.couplings,
      declared: story != null,
      ...(sources == null ? {} : { sources }),
    });
    if (selection.refusal != null) {
      return refused(askedScope, selection.refusal.code, selection.refusal.message, { verbose, changed, story, commit });
    }
    scope = selection.scope;
    selected = [...selection.selected];
    widened = [...selection.widened];
    builtAt = selection.builtAt;
    graphPath = selection.graphPath;
    resolutions = [...(selection.resolutions ?? [])];
  }

  // What every outcome below shares: the selection, computed and reported whether or not the
  // suite runs. Its `gate` is the selection's own (190/ADR-002 §5) — an answer from a record is
  // never more of a verdict than the question it answers.
  const selection = {
    askedScope,
    scope,
    story,
    commit,
    // The ONE gate rule, and it is the selection's own: `all`, and nothing widened. A plan ran
    // nothing, so it is never a verdict.
    gate: !plan && scope === "all" && widened.length === 0,
    verbose,
    selected,
    total: whole.length,
    widened,
    changed,
    builtAt,
    graphPath,
    resolutions,
    fresh,
  };
  const asked = scope === "all" ? "all" : selected;

  // A PLAN STOPS HERE (190/ADR-008 §2): before the record lookup and before the launch, so it
  // launches nothing, writes no record and is answered from none (FF-19001 unchanged).
  if (plan) return result({ ...selection, plan: true, launched: false, exit: 0 });

  // A NARROWED SELECTION OF NOTHING (190/ADR-003 §3, §4): every changed file was placed on positive
  // knowledge and none reaches a suite — a path not yet written, a document no suite reads. There
  // is nothing to run, and launching the runner with no selection would run EVERYTHING under the
  // label `impacted`. So nothing is launched, nothing is recorded, and the line says so.
  if (scope !== "all" && selected.length === 0) {
    return result({ ...selection, launched: false, report: Object.freeze({ ok: true, format: toolchain.report.format, cases: Object.freeze([]), failures: Object.freeze([]), contradiction: false }), exit: 0 });
  }

  // THE RECORD (190/ADR-002). Keyed to the content BEFORE the run, which is the content the run
  // was asked about. An answering record ends the call here; otherwise the lock for this question
  // is held across the launch, so a caller asking the same thing waits for this run's record
  // instead of starting a second runner. `--fresh` looks nothing up and waits for nobody.
  //
  // A STORE THAT FAILS NEVER COSTS THE RUN. It is reported as `not recorded: …`, and the suite
  // runs exactly as it did before records existed — never answered, never skipped.
  let ledger = null;
  let flight = null;
  if (record != null) {
    try {
      ledger = await record.openLedger({ projectRoot });
      if (ledger.ok === true) {
        flight = fresh
          ? { lock: await record.tryLock(ledger, asked), reclaimed: false }
          : await record.acquire(ledger, asked, { deadlineMs: toolchain.deadlineMs });
        if (flight.answer != null) return answeredFrom(flight.answer, selection, flight.reclaimed);
      }
    } catch (error) {
      ledger = { ok: false, reason: `the record store could not be read (${error?.code ?? error?.message ?? error})` };
    }
  }

  try {
    // A WIDENED RUN IS A WHOLE RUN, AND IT IS LAUNCHED AS ONE. The selection argv is left empty
    // when the scope is `all`, so the runner runs everything by its own declared arguments:
    // handing it nine hundred paths would be the same run at the cost of a command line no
    // operating system will accept.
    const selectionFiles = scope === "all" ? [] : selected;
    const started = clock();
    const observed = await run(toolchain, selectionFiles, { cwd: projectRoot });
    const wallMs = clock() - started;
    const report = readReport(observed, toolchain.report.format);

    const failed = report.failures.length > 0 || report.contradiction || !report.ok;
    const runner = Object.freeze({
      outcome: observed.outcome,
      attempted: observed.attempted,
      exitCode: observed.exitCode ?? null,
      deadlineMs: observed.deadlineMs,
      verdict: observed.verdict,
      message: observed.message,
    });
    // A run that produced NO verdict is a failure, never a pass (ADR-001 §6) — the toolchain's
    // own `status` already says so, and it is not second-guessed here.
    const exit = observed.status !== 0 || failed ? 1 : 0;

    let recorded = null;
    let notRecorded = ledger == null || ledger.ok === true ? null : ledger.reason;
    if (ledger?.ok === true) {
      try {
        const written = await record.writeRecord(ledger, {
          ...selection,
          outcome: observed.outcome,
          failures: report.failures,
          runner,
          report: { ok: report.ok, format: report.format, contradiction: report.contradiction },
          exit,
          wallMs,
        });
        recorded = Object.freeze({ id: written.id, instant: written.instant, key: written.key, result: written.result });
      } catch (error) {
        notRecorded = `the record could not be written (${error?.code ?? error?.message ?? error})`;
      }
    }

    return result({
      ...selection,
      launched: true,
      runner,
      report,
      exit,
      recorded,
      notRecorded,
      reclaimed: flight?.reclaimed === true,
    });
  } finally {
    if (flight?.lock != null) await record.releaseLock(flight.lock);
  }
}

// AN ANSWER FROM A RECORD (190/ADR-002 §2). The failures, the runner's own account and the exit
// code are the record's; the selection is this call's. The passing rows are not kept in a record,
// so `--verbose` over an answer restores nothing it could not have.
function answeredFrom(record, selection, reclaimed) {
  const failures = record.failures ?? [];
  return result({
    ...selection,
    launched: false,
    runner: record.runner,
    report: Object.freeze({
      ok: record.report?.ok !== false,
      format: record.report?.format ?? null,
      cases: Object.freeze(failures.map((entry) => Object.freeze({ name: entry.case, status: "failed" }))),
      failures: Object.freeze(failures.map((entry) => Object.freeze({ ...entry }))),
      contradiction: record.report?.contradiction === true,
    }),
    exit: record.exit,
    reused: Object.freeze({ id: record.id, instant: record.instant, key: record.key, result: record.result }),
    reclaimed,
  });
}

// ── THE HUMAN FACE ───────────────────────────────────────────────────────────────────────────

// ONE SUMMARY LINE, and it carries every claim the machine face carries: what was selected out of
// what, the scope the run ran as, the graph's build time, whether the result may stand as a
// verdict, and EVERY widening with the file that caused it. There is no flag that suppresses a
// widening, so there is no truncation here either — a widening an operator did not see is a
// narrowing they were not told about.
function summaryLine(out) {
  const widenings = out.widened.length === 0
    ? "no widening"
    : `${out.widened.length} widening${out.widened.length === 1 ? "" : "s"}: ${out.widened.map((entry) => `${entry.file} (${entry.reason})`).join(", ")}`;
  return [
    `${out.selected.length}/${out.total} suites`,
    out.story != null ? `scope ${out.scope} (story ${out.story})` : out.commit != null ? `scope ${out.scope} (commit ${out.commit.slice(0, 12)})` : `scope ${out.scope}`,
    `graph built ${out.builtAt ?? "unknown"}`,
    widenings,
    ...resolutionClause(out),
    out.gate ? "may stand as a verdict" : "may not stand as a verdict",
    ...recordClauses(out),
  ].join(" · ");
}

// HOW A NARROWED RUN WAS PLACED (190/ADR-003 §4, §5): the resolutions counted by reason, and every
// coupling applied named by its reason, so a document that narrowed the run says why it could.
function resolutionClause(out) {
  if (out.resolutions.length === 0) return [];
  const counts = new Map();
  for (const entry of out.resolutions) counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + 1);
  const couplings = [...new Set(out.resolutions.filter((entry) => entry.why != null).map((entry) => entry.why))];
  const counted = [...counts].map(([reason, count]) => `${count} ${reason}`).join(", ");
  return [`resolved ${counted}${couplings.length === 0 ? "" : ` (couplings: ${couplings.join("; ")})`}`];
}

// WHAT THE RECORD DID, in the same line (190/ADR-002 §2, §3). An answer says which run it came
// from and on what content; a launched run says it left a record, or why it did not.
function recordClauses(out) {
  const clauses = [];
  if (out.reused != null) clauses.push(`answered from the run of ${out.reused.instant} (tree ${out.reused.key.slice(0, 7)})`);
  else if (out.recorded != null) clauses.push(`recorded (tree ${out.recorded.key.slice(0, 7)})`);
  else if (out.notRecorded != null) clauses.push(`not recorded: ${out.notRecorded}`);
  if (out.fresh && out.launched) clauses.push("fresh run");
  if (out.reclaimed) clauses.push("reclaimed a stale lock");
  return clauses;
}

function renderResult(out) {
  const lines = [];
  if (out.refusal != null) {
    lines.push(`not ok - aof test refused: ${out.refusal.code}`);
    lines.push(out.refusal.message);
    lines.push(summaryLine(out));
    return lines.join("\n");
  }

  // A PLAN SAYS WHAT IT WOULD RUN, and that nothing ran. `--verbose` adds the selected suites.
  if (out.plan) {
    if (out.verbose) for (const suite of out.selected) lines.push(`# would run ${suite}`);
    lines.push(`plan: ${summaryLine(out)} · nothing ran`);
    return lines.join("\n");
  }

  // THE CASES IN EMITTED ORDER. Failures-only prints the failing rows; `--verbose` prints a row for
  // every case as well. Rendering ONE list under two filters is what makes the contract's
  // containment true by construction rather than by care: the verbose output is the same lines
  // plus more, and no line the quiet run printed can go missing from it.
  for (const entry of out.report.cases) {
    if (entry.status === "failed") {
      lines.push(`not ok - ${entry.name}`);
      const failure = out.report.failures.find((item) => item.case === entry.name);
      if (failure?.message) lines.push(failure.message);
      continue;
    }
    if (!out.verbose) continue;
    if (entry.status === "skipped") lines.push(`ok - ${entry.name} # skip`);
    else if (entry.status == null) lines.push(`ok - ${entry.name} # no status reported`);
    else lines.push(`ok - ${entry.name}`);
  }

  // THE THREE WAYS A RUN FAILS WITHOUT A FAILING CASE, each stated rather than left to the exit
  // code. A non-zero exit under a silent face is the failure species this milestone indicts, so
  // none of these may be reachable without a line saying which one happened.
  if (!out.launched && out.reused == null) lines.push("# nothing to run: every changed file was placed, and none reaches a suite");
  else if (out.runner == null) { /* an answer whose record kept no runner account: nothing to add */ }
  else if (out.runner.outcome !== "exited") lines.push(`not ok - ${out.runner.message}`);
  else if (!out.report.ok) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its output could not be read as ${out.report.format} — no case was enumerated, so this run produced no verdict. Re-run with --verbose to see the whole stream, or check that the declared report format matches what the runner emits.`);
  } else if (out.report.contradiction) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its report enumerated no failure — a green-reading report beside a non-zero exit is a contradiction, not a pass. Re-run with --verbose to see the whole stream.`);
  }

  lines.push(summaryLine(out));
  return lines.join("\n");
}

const testCommand = {
  id: "test",
  input: {
    type: "object",
    properties: {
      scope: { type: "string" },
      files: { type: "array", items: { type: "string" } },
      since: { type: ["string", "null"] },
      story: { type: ["string", "null"] },
      commit: { type: ["string", "null"] },
      plan: { type: "boolean" },
      verbose: { type: "boolean" },
      fresh: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runTest(input, {
      projectRoot: ctx.workspace.projectRoot,
      config: ctx.workspace.config,
      // THE EXACT RESOLVER, BOUND HERE. `resolveItemExact` has no slug fallback, so a `--story`
      // ref that is a near-miss for a real story resolves to nothing and is refused — rather than
      // silently selecting the neighbouring story's suites, which is the exact-vs-slug rule
      // `resolve.mjs` already states for the write doors, applied to a run.
      resolveStory: (ref) => resolveItemExact(ctx, ref),
      // THE RECORD STORE, and only here (190/00): the CLI face is the one caller whose runner is
      // always the project's own, so it is the one whose runs may stand as records.
      record: testRecord,
    });
  },

  cli: {
    route: ["test"],
    spec: {
      usage: "aof test --scope impacted|file|all [<suite-file> ...] [--story <ref>] [--since <rev>] [--commit <rev> --plan] [--plan] [--fresh] [--verbose] [--json]",
      flags: {
        scope: { type: "string", description: "impacted | file | all — required, and never defaulted" },
        story: { type: "string", description: "take the changed set from this story's declared files: (scope impacted; not with --since)" },
        since: { type: "string", description: "widen the changed set's base to this revision (scope impacted)" },
        commit: { type: "string", description: "take the changed set from what this commit changed against its first parent (scope impacted; --plan only; not with --story or --since)" },
        plan: { type: "boolean", description: "select and report without running — launches nothing, writes no record, is answered from none" },
        verbose: { type: "boolean", description: "restore the full stream — adds the passing rows, removes nothing" },
        fresh: { type: "boolean", description: "run even when a record on this content already answers — to chase a suspected flake; the record says it was a deliberate repeat" },
      },
    },

    argv: (positionals, options) => ({
      scope: options.scope,
      files: positionals,
      story: options.story ?? null,
      since: options.since ?? null,
      commit: options.commit ?? null,
      plan: options.plan === true,
      verbose: options.verbose === true,
      fresh: options.fresh === true,
    }),

    render: renderResult,
    json: (out) => out,
    // NO `cli.launch`. This command runs a bounded child and returns; it does not hand a terminal
    // to a long-lived process, and FF-7204 reads that from the registered command object rather
    // than from source text — because what the registry says is what the runtime does.
    exit: (out) => out.exit,
  },
};

return { COMMIT_NEEDS_PLAN, NO_FILES_NAMED, NO_SCOPE, SCOPE_UNRECOGNISED, STORY_AND_SINCE, STORY_OUTSIDE_IMPACTED, TEST_SCOPES, runTest, testCommand };
}
