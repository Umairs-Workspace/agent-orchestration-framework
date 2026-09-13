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
import { walkSuiteFiles } from "../work-audit/census.mjs";
// The ONE TAP reader (ADR-003 §2). `normaliseReport` already parses `ok - name` / `not ok - name`
// and attaches a failure's diagnostic text VERBATIM — which is this command's output contract,
// already written. A second parser one file over is the duplication species FF-7203 indicts.
import { normaliseReport } from "../work/grade.mjs";
import { changedFiles } from "../work/test-changed.mjs";
// milestone 96 / story 03 (ADR-007 §1) — the SECOND changed-set producer, beside the git one. It
// is an INPUT to the selector below, never a second selector; `selectSuites` is called unchanged.
import { declaredChangedFiles } from "../work/test-declared.mjs";
// The EXACT resolver, and it must be the exact one: a slug fallback would run a near-miss story's
// suites, which is the confidently-wrong-once failure the whole selection family refuses.
import { resolveItemExact } from "./resolve.mjs";
import { selectSuites } from "../work/test-select.mjs";
import { launchRunner, resolveTestToolchain } from "../work/toolchain.mjs";

// THE THREE CLOSED FORMS. Frozen, so a fourth is an edit with an ADR behind it.
export const TEST_SCOPES = Object.freeze(["impacted", "file", "all"]);

// The scope a run that never started ran as. Named rather than left null so the two faces render
// the same word for it and a reader is not asked to interpret an absence.
export const NO_SCOPE = "none";

// THE COMMAND'S OWN REFUSALS. Two, because they are two different repairs: name one of the three
// forms, or name the files. The selection's own refusals (`since-rev-unresolvable`,
// `changed-set-empty`, `changed-set-unreadable`) and the toolchain's three are carried through
// VERBATIM — a re-phrasing here would be a second vocabulary for one situation.
export const SCOPE_UNRECOGNISED = "test-scope-unrecognised";
export const NO_FILES_NAMED = "test-file-scope-names-no-file";
// milestone 96 / story 03 (ADR-007 §2, §4) — TWO MORE, and they are two more repairs rather than
// two more forms. `--story` adds no scope: it SWAPS which producer supplies `changed` inside the
// `impacted` form that already exists.
//
// Two changed-set sources in one run is two answers, and picking one silently is the narrowing
// this family forbids — so naming both is a refusal that names both.
export const STORY_AND_SINCE = "test-story-and-since";
// And `--story` outside `impacted` narrows nothing: `file` runs what the caller named and `all`
// asks nothing, so a story ref there is an instruction with no effect, which is worse than an
// error because it looks like it worked.
export const STORY_OUTSIDE_IMPACTED = "test-story-outside-impacted";

const refusal = (code, message) => Object.freeze({ code, message });

const posix = (file) => String(file).replaceAll("\\", "/");

// Every suite file the declared roots hold, deduped and ordered — the thing a widening widens TO,
// and the denominator of the summary line's `selected/total`. The roots come from the DECLARATION
// (the project's own answer), never from a literal here.
async function wholeSuite(projectRoot, roots, walk) {
  const out = new Set();
  for (const root of roots) {
    for (const file of await walk(projectRoot, posix(root))) out.add(posix(file));
  }
  return [...out].sort();
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
    runner: fields.runner ?? null,
    report: fields.report ?? null,
    refusal: fields.refusal ?? null,
    exit: fields.exit ?? 0,
  });
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
export async function runTest(input, deps = {}) {
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
  } = deps;

  const askedScope = typeof input?.scope === "string" ? input.scope : null;
  const verbose = input?.verbose === true;
  const story = typeof input?.story === "string" && input.story.trim() !== "" ? input.story.trim() : null;
  const since = input?.since ?? null;

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

  // TWO SOURCES IS TWO ANSWERS (ADR-007 §4). Checked before anything is resolved or read, so the
  // refusal costs nothing and names BOTH rather than picking one — a silently chosen source is the
  // narrowing this family forbids, and it would be invisible in the result.
  if (story != null && since != null) {
    return refused(
      askedScope,
      STORY_AND_SINCE,
      `--story ${JSON.stringify(story)} and --since ${JSON.stringify(since)} are two changed-set sources, and a run has one. Choose the story's declared write set or git's changes since a revision; naming both would make aof pick one for you, and a narrowing nobody asked for is the failure this command exists to refuse.`,
      { verbose, story },
    );
  }

  // `--story` NARROWS THE IMPACTED SCOPE AND NOTHING ELSE (ADR-007 §2). It adds no fourth form: it
  // swaps which producer supplies `changed` inside `impacted`. Under `file` the caller already
  // named the suites and under `all` nothing is selected, so a story ref there would be an
  // instruction with no effect — which reads as though it worked.
  if (story != null && askedScope !== "impacted") {
    return refused(
      askedScope,
      STORY_OUTSIDE_IMPACTED,
      `--story narrows the \`impacted\` scope only, and this run asked for ${JSON.stringify(askedScope)}. \`file\` runs the suite files you name and \`all\` runs everything, so a story ref changes neither — ask for \`--scope impacted --story ${story}\`, or drop the story ref.`,
      { verbose, story },
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
  const whole = await wholeSuite(projectRoot, toolchain.roots, walk);

  let scope = askedScope;
  let selected = [];
  let widened = [];
  let changed = [];
  let builtAt = null;
  let graphPath = null;

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
      : await readChanged({ projectRoot, since });
    if (set.ok !== true) {
      // The selection's own refusals, verbatim. An unresolvable base and an empty changed set are
      // NOT widenings (ADR-002 §5): they differ in kind from the four, and rendering them as one
      // would make "nothing has changed" indistinguishable from "everything is affected".
      return refused(askedScope, set.code, set.message, { verbose, story });
    }
    changed = [...set.changed];
    const selection = select({ projectRoot, changed, allSuites: whole, roots: toolchain.roots });
    if (selection.refusal != null) {
      return refused(askedScope, selection.refusal.code, selection.refusal.message, { verbose, changed, story });
    }
    scope = selection.scope;
    selected = [...selection.selected];
    widened = [...selection.widened];
    builtAt = selection.builtAt;
    graphPath = selection.graphPath;
  }

  // A WIDENED RUN IS A WHOLE RUN, AND IT IS LAUNCHED AS ONE. The selection argv is left empty when
  // the scope is `all`, so the runner runs everything by its own declared arguments: handing it
  // nine hundred paths would be the same run at the cost of a command line no operating system
  // will accept.
  const selectionFiles = scope === "all" ? [] : selected;
  const observed = await run(toolchain, selectionFiles, { cwd: projectRoot });
  const report = readReport(observed, toolchain.report.format);

  const failed = report.failures.length > 0 || report.contradiction || !report.ok;
  return result({
    askedScope,
    scope,
    story,
    // The ONE gate rule, and it is the selection's own: `all`, and nothing widened.
    gate: scope === "all" && widened.length === 0,
    verbose,
    launched: true,
    selected,
    total: whole.length,
    widened,
    changed,
    builtAt,
    graphPath,
    runner: Object.freeze({
      outcome: observed.outcome,
      attempted: observed.attempted,
      exitCode: observed.exitCode ?? null,
      deadlineMs: observed.deadlineMs,
      verdict: observed.verdict,
      message: observed.message,
    }),
    report,
    // A run that produced NO verdict is a failure, never a pass (ADR-001 §6) — the toolchain's own
    // `status` already says so, and it is not second-guessed here.
    exit: observed.status !== 0 || failed ? 1 : 0,
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
    out.story == null ? `scope ${out.scope}` : `scope ${out.scope} (story ${out.story})`,
    `graph built ${out.builtAt ?? "unknown"}`,
    widenings,
    out.gate ? "may stand as a verdict" : "may not stand as a verdict",
  ].join(" · ");
}

function renderResult(out) {
  const lines = [];
  if (out.refusal != null) {
    lines.push(`not ok - aof test refused: ${out.refusal.code}`);
    lines.push(out.refusal.message);
    lines.push(summaryLine(out));
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
  if (out.runner.outcome !== "exited") lines.push(`not ok - ${out.runner.message}`);
  else if (!out.report.ok) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its output could not be read as ${out.report.format} — no case was enumerated, so this run produced no verdict. Re-run with --verbose to see the whole stream, or check that the declared report format matches what the runner emits.`);
  } else if (out.report.contradiction) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its report enumerated no failure — a green-reading report beside a non-zero exit is a contradiction, not a pass. Re-run with --verbose to see the whole stream.`);
  }

  lines.push(summaryLine(out));
  return lines.join("\n");
}

export const testCommand = {
  id: "test",
  input: {
    type: "object",
    properties: {
      scope: { type: "string" },
      files: { type: "array", items: { type: "string" } },
      since: { type: ["string", "null"] },
      story: { type: ["string", "null"] },
      verbose: { type: "boolean" },
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
    });
  },

  cli: {
    route: ["test"],
    spec: {
      usage: "aof test --scope impacted|file|all [<suite-file> ...] [--story <ref>] [--since <rev>] [--verbose] [--json]",
      flags: {
        scope: { type: "string", description: "impacted | file | all — required, and never defaulted" },
        story: { type: "string", description: "take the changed set from this story's declared files: (scope impacted; not with --since)" },
        since: { type: "string", description: "widen the changed set's base to this revision (scope impacted)" },
        verbose: { type: "boolean", description: "restore the full stream — adds the passing rows, removes nothing" },
      },
    },

    argv: (positionals, options) => ({
      scope: options.scope,
      files: positionals,
      story: options.story ?? null,
      since: options.since ?? null,
      verbose: options.verbose === true,
    }),

    render: renderResult,
    json: (out) => out,
    // NO `cli.launch`. This command runs a bounded child and returns; it does not hand a terminal
    // to a long-lived process, and FF-7204 reads that from the registered command object rather
    // than from source text — because what the registry says is what the runtime does.
    exit: (out) => out.exit,
  },
};
