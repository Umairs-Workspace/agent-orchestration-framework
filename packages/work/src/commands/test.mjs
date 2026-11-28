import { normaliseReport } from "../grade.mjs";
import { isExcludedTest, isSuiteFile } from "../testing/suites.mjs";

// Application composition supplies execution, the importer scan and shared work services.
export function createTestCommand({ walkSuiteFiles, changedFiles, changedBetween = null, scanImporters, workspaceExportMap, launchRunner, resolveTestToolchain, testRecord = null, storyWorkItems = null, readRuns = null, isRunning = null, baselineServices = null, noProgressBound = null }) {
// `aof test` — THE TEST COMMAND'S FACE (milestone 72 / story 02, rewritten by 210/04: ADR-002,
// ADR-003, ADR-007, ADR-008). FF-7204 is its control, with FF-21001 and FF-21003 beside it.
//
// THE CHORE THIS REPLACED IS MEASURED. Before 72 every agent wrote the same throwaway focused-run
// script again: 805 of 4,950 write events in the corpus were scratchpad files. And the selection
// 72 built to answer it widened to the whole tree on every measured commit (210 STATE, the
// measurement), so an agent fixing reds ran the whole tree after every fix.
//
// ── FOUR FORMS, AND EXACTLY ONE PER CALL (210/ADR-002) ───────────────────────────────────────
//
//   aof test <suite>… --reason "<why>"  runs exactly the named suites, and records why;
//   aof test --suggest                  lists the suites a working-tree change reaches, runs nothing;
//   aof test --failed                   a fix round: the newest red's suites plus the fix's reach;
//   aof test --all                      the whole tree, refused inside story work (ADR-007).
//
// The agent chooses the suites from the project's own testing instructions (ADR-001). The tool
// does not choose for it, does not widen and does not narrow: it runs the choice, refuses a choice
// it cannot honour, and keeps the reason beside the result.
//
// ── PROPERTIES KEPT FROM 72, EACH ONE A FAILURE THIS COMMAND WOULD OTHERWISE HAVE ─────────────
//
// 1. FAILURES ONLY, BY DEFAULT — AND THE FILTER READS BOTH STREAMS. A green-reading report beside a
//    non-zero exit is a CONTRADICTION reported as one, never a pass.
// 2. ONE RESULT, TWO FACES. `render` and `json` are projections of the SAME frozen object, and
//    `--verbose` ADDS the passing rows and removes nothing.
// 3. IT REPORTS AND NEVER DECIDES (72/ADR-002 §4). Every result carries `gate: false` unless the
//    whole tree ran, and FF-7204 censuses the doors so nothing comes to read a run as a verdict.
// 4. NO TEST MODULE ENTERS THIS PROCESS. Importing test code executes it, so there is no dynamic
//    `import()` here on any path: the runner is the project's own program, through the bounded seam.
//    The suggestion READS suite text through the importer scan; it never evaluates it.
//
// WHY IT IS REGISTERED — a TOP-LEVEL id, deliberately not `work:test`: both work-command controls
// filter on `id.startsWith("work:")` and a `work:` id would demand a served `/api/work/test` route.
// BOARD-DEFERRED for the reason `grade` and `audit` are — a served route would let a page load
// spawn a test run.

// THE FOUR FORMS, frozen: a fifth is an edit with an ADR behind it.
const TEST_FORMS = Object.freeze(["named", "suggest", "failed", "all"]);

// The form of a call that never chose one. Named rather than left null so the two faces render the
// same word for it.
const NO_FORM = "none";

// THE COMMAND'S OWN REFUSALS. Each is a different repair, so each has its own code. The toolchain's
// refusals are carried through VERBATIM — a re-phrasing here would be a second vocabulary.
const FORM_MISSING = "test-form-missing";
const FORM_CONFLICT = "test-form-conflict";
const REASON_MISSING = "test-reason-missing";
const NOT_A_SUITE = "test-not-a-suite";
const ALL_IN_STORY_WORK = "test-all-in-story-work";
// 210/ADR-004, ADR-005 — a fix round that cannot start, and a chain that stopped converging.
const FAILED_NO_RED = "test-failed-no-red";
const FAILED_UNATTRIBUTED = "test-failed-unattributed";
const FIX_STOPPED = "test-fix-stopped";

// The exact last line of every red summary (210/ADR-004).
const FIX_ROUND_LINE = "aof test --failed";

const refusal = (code, message) => Object.freeze({ code, message });

const posix = (file) => String(file).replaceAll("\\", "/").replace(/^\.\//u, "");

// Every suite file the declared roots hold, deduped and ordered: what `--all` runs, what a named
// suite must be one of, and the denominator of the summary line. The roots, suffixes and
// exclusions come from the DECLARATION, never from a literal here (190/ADR-008 §6, §7).
async function wholeSuite(projectRoot, toolchain, walk) {
  const suffixes = toolchain.suiteSuffixesDeclared === true ? toolchain.suiteSuffixes : null;
  const out = new Set();
  for (const root of toolchain.roots) {
    for (const file of await walk(projectRoot, posix(root), suffixes)) out.add(posix(file));
  }
  return [...out].filter((file) => !isExcludedTest(file, toolchain.exclude)).sort();
}

// ── THE RESULT ───────────────────────────────────────────────────────────────────────────────
//
// ONE object. Both faces are projections of it, so the human face cannot carry a claim `--json`
// does not, and vice versa. Every key is present on every outcome — a consumer that destructures a
// refusal gets the same shape as one that destructures a run.
function result(fields) {
  return Object.freeze({
    form: fields.form ?? NO_FORM,
    // `all` when the whole tree ran: the word the regression gate's row and the record file.
    scope: fields.form === "all" ? "all" : fields.form ?? NO_FORM,
    reason: fields.reason ?? null,
    // FALSE unless the whole tree ran: a named run is a subset, and says so.
    gate: fields.gate === true,
    verbose: fields.verbose === true,
    launched: fields.launched === true,
    selected: Object.freeze([...(fields.selected ?? [])]),
    total: fields.total ?? 0,
    // `--suggest`'s answer (210/ADR-003): the changed set, each suite it reaches and how, the files
    // that reach none, and every specifier the scan could not resolve. Null on every other form.
    suggestion: fields.suggestion ?? null,
    // The story whose running run refused `--all` (210/ADR-007), or null.
    storyWork: fields.storyWork ?? null,
    // 210/ADR-004–006 — this run's place in a fix chain, the base its failures were measured on,
    // and the latch, when a stop rule fired on it.
    round: fields.round ?? null,
    parent: fields.parent ?? null,
    baseline: fields.baseline ?? null,
    stopped: fields.stopped ?? null,
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

// A refusal is a RESULT, not a throw: it has to render on both faces, and an operator who asked
// for `--json` is owed the code in the envelope rather than on stderr. Nothing was launched.
const refused = (form, code, message, extra = {}) =>
  result({ form, launched: false, refusal: refusal(code, message), exit: 1, ...extra });

// ── THE REPORT ───────────────────────────────────────────────────────────────────────────────

// BOTH STREAMS, AND THE EXIT CODE. A GREEN-READING REPORT BESIDE A NON-ZERO EXIT IS A
// CONTRADICTION, never a pass: it is the exact shape a stdout-only capture produces.
function readReport(observed, format) {
  const text = `${observed.stdout ?? ""}\n${observed.stderr ?? ""}`;
  const normalised = normaliseReport(text, format);
  const failures = normalised.ok ? normalised.failures : [];
  const cases = normalised.ok ? normalised.cases : [];
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

// ── STORY WORK (210/ADR-007) ─────────────────────────────────────────────────────────────────
//
// A session whose `AOF_RUN_ID` names a running run on a story or task item; else any running run on
// a story or task item in this checkout's stream. `items` is the stream as `{ ref, type, dir }`, and
// the run store's own `readRuns` and `isRunning` answer the rest, so no run state is spelled here.
// Answers the item `{ ref, type, dir }`, or null outside story work.
const STORY_WORK_TYPES = Object.freeze(["story", "task"]);

async function storyWorkOf({ env = process.env, items = [], read = readRuns, running = isRunning } = {}) {
  const typeOf = new Map(items.map((item) => [item.ref, item.type]));
  const runId = typeof env.AOF_RUN_ID === "string" ? env.AOF_RUN_ID : "";
  const itemDir = typeof env.AOF_RUN_ITEM_DIR === "string" ? env.AOF_RUN_ITEM_DIR : "";
  if (runId !== "" && itemDir !== "") {
    const driven = (await read({ dir: itemDir })).find((entry) => entry.runId === runId);
    const item = items.find((entry) => entry.ref === driven?.itemRef);
    if (driven != null && running(driven) && STORY_WORK_TYPES.includes(typeOf.get(driven.itemRef))) return Object.freeze({ ref: driven.itemRef, type: item?.type ?? null, dir: item?.dir ?? null });
  }
  for (const item of items) {
    if (!STORY_WORK_TYPES.includes(item.type)) continue;
    if ((await read(item)).some((entry) => running(entry))) return Object.freeze({ ref: item.ref, type: item.type, dir: item.dir });
  }
  return null;
}

// ── A FIX CHAIN (210/ADR-005) ────────────────────────────────────────────────────────────────

// A run's failure set: its failing `(suite, case)` pairs, less those measured pre-existing.
const failureSet = (failures) => (failures ?? []).filter((failure) => failure.preExisting !== true).map((failure) => Object.freeze({ file: failure.file, case: failure.case }));

// The chain behind a root, root last: each record's failure set, walking `parent` links back.
async function chainSets(store, ledger, root) {
  const sets = [];
  const seen = new Set();
  for (let at = root; at != null && !seen.has(at.id); at = at.parent == null ? null : await store.readRecordById(ledger, at.parent)) {
    seen.add(at.id);
    sets.unshift(failureSet(at.failures));
  }
  return sets;
}

// THE TWO STOP RULES, over a chain's failure sets in order, root first. A suite failing that failed
// in no earlier run of the chain stops it at once. A run whose set is no smaller than the one
// before is a no-progress run, a smaller one clears the count, and `bound` consecutive no-progress
// runs stop it — the build terminator's own `work.loop.buildNoProgressRounds`, read by the caller
// from its one home. Answers the first rule to fire, with the run it fired at (1-based), or null.
function chainStop(sets, { bound = null } = {}) {
  const counts = sets.map((set) => set.length);
  let noProgress = 0;
  for (let index = 1; index < sets.length; index += 1) {
    const before = new Set(sets.slice(0, index).flat().map((failure) => failure.file));
    const fresh = [...new Set(sets[index].map((failure) => failure.file))].filter((file) => !before.has(file)).sort();
    if (fresh.length > 0) return Object.freeze({ rule: "new suite failing", at: index + 1, counts: Object.freeze(counts.slice(0, index + 1)), suites: Object.freeze(fresh) });
    noProgress = sets[index].length >= sets[index - 1].length ? noProgress + 1 : 0;
    if (bound != null && noProgress >= bound) return Object.freeze({ rule: "no progress", at: index + 1, counts: Object.freeze(counts.slice(0, index + 1)), suites: Object.freeze([]) });
  }
  return null;
}

// THE HAND-OVER: the rule, the failure set run by run, the suites that newly failed, and the two
// ways on the skills take. A stopped chain is never re-opened; a named run starts a new one.
function handOver(stopped) {
  return [
    `the fix chain stopped on "${stopped.rule}" at run ${stopped.at} — failures by run: ${stopped.counts.join(", ")}${stopped.suites?.length ? `; newly failing: ${stopped.suites.join(", ")}` : ""}.`,
    "Hand over: record a blocker in the item's STATE.md, or in a driven session ask the operator through the loop's question.",
    `This chain stays stopped. A named run with a stated reason starts a new one: \`aof test <suite>… --reason "<why>"\`.`,
  ].join(" ");
}

// The forms this call asked for, each with the words that name it. Exactly one is a call.
function formsOf(input, named) {
  return [
    named.length > 0 ? { form: "named", flag: "<suite>…" } : null,
    input?.suggest === true ? { form: "suggest", flag: "--suggest" } : null,
    input?.failed === true ? { form: "failed", flag: "--failed" } : null,
    input?.all === true ? { form: "all", flag: "--all" } : null,
  ].filter(Boolean);
}

const FORMS_NAMED = 'aof test <suite>… --reason "<why>", aof test --suggest, aof test --failed or aof test --all';

// The declaration the base is run with: the working tree's, less its testing instructions. That file
// is the agent's guidance for choosing suites, the base reruns suites already chosen, and the base
// commit may predate the file, which would otherwise refuse the base's run (210/F-11).
function baseDeclaration(config) {
  const declared = config?.work?.test;
  if (declared?.instructions === undefined) return config;
  const { instructions: _instructions, ...test } = declared;
  return { ...config, work: { ...config.work, test } };
}

// ── THE COMMAND'S BODY, PURE OVER ITS SEAMS ──────────────────────────────────────────────────
//
// Every impure edge is injected and defaults to the shipped one, so every row of the contract
// drives without a repository or a child process — and the SAME code path runs in production.
// `deps` is deliberately not part of the input schema: a seam is not something a caller of the CLI
// gets to choose.
async function runTest(input, deps = {}) {
  const {
    projectRoot,
    config,
    resolveToolchain = resolveTestToolchain,
    readChanged = changedFiles,
    scan = scanImporters,
    exportMap = workspaceExportMap,
    // 210/ADR-007 — "is this checkout inside story work?", answered `{ ref }` or null. NULL BY
    // DEFAULT, and only the CLI face hands the composed check in: the regression gate drives this
    // body for the whole tree, and the gate is the whole tree's other door.
    inStoryWork = null,
    // 210/ADR-006 — the stream's items, read once, for the base of a gate red's milestone.
    items = null,
    // 210/ADR-006 — the base a red is measured against. NULL BY DEFAULT, like the record: only the
    // CLI face measures, and the baseline's own run is handed none, so it never measures itself.
    baseline = null,
    readBetween = changedBetween,
    walk = walkSuiteFiles,
    run = launchRunner,
    // milestone 190 / story 00 — the record store, and the clock its runs are timed by. NULL BY
    // DEFAULT, and only the CLI face below hands the composed store in: an in-process caller that
    // stubs the runner must never file its stub's verdict as the record of a real tree.
    record = null,
    clock = Date.now,
  } = deps;

  const verbose = input?.verbose === true;
  const fresh = input?.fresh === true;
  const named = [...new Set((Array.isArray(input?.files) ? input.files : []).map(posix).filter((file) => file.length > 0))];
  const reason = typeof input?.reason === "string" && input.reason.trim() !== "" ? input.reason : null;

  // EXACTLY ONE FORM. None is a refusal naming the four, and two are a refusal naming both: a form
  // aof picked for you is a run nobody asked for.
  const forms = formsOf(input, named);
  if (forms.length === 0) {
    return refused(NO_FORM, FORM_MISSING, `no form was given — name one of ${FORMS_NAMED}. There is no default: a run aof picked for you is a run nobody asked for.`, { verbose });
  }
  if (forms.length > 1) {
    const flags = forms.map((entry) => entry.flag);
    return refused(NO_FORM, FORM_CONFLICT, `${flags.slice(0, -1).join(", ")} and ${flags.at(-1)} are ${forms.length} forms, and a call takes one — ${FORMS_NAMED}.`, { verbose });
  }
  const { form } = forms[0];

  // A NAMED RUN STATES WHY (210/ADR-002), before anything is read: the reason is the evidence a
  // reviewer reads beside the result, and a run without one is a run nobody can judge.
  if (form === "named" && reason == null) {
    return refused(form, REASON_MISSING, `a named run needs --reason "<why these suites>", and none was given — the reason is recorded beside the result so a reviewer can judge the choice. Nothing was launched.`, { verbose });
  }

  // THE WHOLE TREE BELONGS TO THE GATE (210/ADR-007). Inside story work `--all` is refused, before
  // anything is compiled or launched, and NOTHING overrides it: not a reason, not a flag, not an
  // environment variable. The ways on are bounded ones.
  if (form === "all" && inStoryWork != null) {
    const story = await inStoryWork();
    if (story != null) {
      return refused(
        form,
        ALL_IN_STORY_WORK,
        `the whole tree is refused inside story work — story ${story.ref} has a running run in this checkout. The whole tree is the regression gate's. Use \`aof test --failed\` for a fix round, or \`aof test <suite>… --reason "<why>"\` for the suites your change reaches; \`aof test --suggest\` lists them.`,
        { verbose, storyWork: Object.freeze({ ref: story.ref }) },
      );
    }
  }

  // THE DECLARATION IS THE ONLY SPELLER OF THE PROGRAM (72/ADR-001 §2). Its refusals are carried
  // through with their own codes and messages.
  const compiled = resolveToolchain(config, { projectRoot });
  if (compiled.ok !== true) return refused(form, compiled.code, compiled.message, { verbose });
  const toolchain = compiled.toolchain;

  // The suggestion reads suite text through the scan, which walks the roots itself.
  if (form === "suggest") return await suggest({ projectRoot, toolchain, verbose, readChanged, scan, exportMap });
  const whole = await wholeSuite(projectRoot, toolchain, walk);

  // A FIX ROUND (210/ADR-004) follows the newest red of this worktree: its failing suites, plus the
  // suites the scan finds for what changed since its content. Its own refusals come first, and a
  // latched chain is refused as the hand-over (ADR-005).
  let ledger = null;
  let chain = null;
  if (form === "failed") {
    const opened = record == null ? null : await record.openLedger({ projectRoot }).catch(() => null);
    const root = opened?.ok === true ? await record.findNewestRed(opened) : null;
    if (root == null) {
      return refused(form, FAILED_NO_RED, `no red run is on record for this worktree, so there is no fix round to start. Run the suites by name: \`aof test <suite>… --reason "<why>"\`.`, { verbose });
    }
    if (root.stopped != null) return refused(form, FIX_STOPPED, handOver(root.stopped), { verbose, stopped: root.stopped });
    const strays = root.failures.filter((failure) => failure.file == null);
    if (strays.length > 0) {
      return refused(form, FAILED_UNATTRIBUTED, `the newest red holds ${strays.length === 1 ? "a failure" : "failures"} with no suite — ${strays.map((failure) => failure.case).join(", ")} — so a fix round cannot know what to rerun. Run the suites by name: \`aof test <suite>… --reason "<why>"\`.`, { verbose });
    }
    const since = await readBetween({ projectRoot, from: root.key, to: opened.key });
    if (since.ok !== true) return refused(form, since.code, since.message, { verbose });
    const reach = since.changed.length === 0 ? [] : (await scan({ projectRoot, changed: [...since.changed], roots: toolchain.roots, suffixes: toolchain.suiteSuffixes, exclude: toolchain.exclude, exportMap: await exportMap(projectRoot) })).selected;
    const present = new Set(whole);
    const rerun = [...new Set([...root.failures.map((failure) => posix(failure.file)), ...reach])].filter((file) => present.has(file)).sort();
    if (rerun.length === 0) {
      return refused(form, FAILED_NO_RED, `the newest red's suites (${[...new Set(root.failures.map((failure) => failure.file))].join(", ")}) are no longer suites in this tree. Run the suites by name: \`aof test <suite>… --reason "<why>"\`.`, { verbose });
    }
    ledger = opened;
    chain = { root, parent: root.id, round: (root.round ?? 0) + 1, selected: rerun };
  }

  // A NAMED SUITE MUST BE A SUITE: under the declared predicate, and present. Every name that is not
  // is refused together, so one call shows the whole repair.
  if (form === "named") {
    const present = new Set(whole);
    const strays = named.filter((file) => !present.has(file) || !isSuiteFile(file, toolchain.roots, toolchain.suiteSuffixes, toolchain.exclude));
    if (strays.length > 0) {
      return refused(form, NOT_A_SUITE, `${strays.join(", ")} ${strays.length === 1 ? "is not a suite" : "are not suites"} under work.test's roots, suffixes and exclusions — name suite files that exist. Nothing was launched.`, { verbose, reason });
    }
  }

  const selected = form === "all" ? whole : form === "failed" ? chain.selected : [...named].sort();
  const selection = {
    form,
    reason: form === "all" ? null : form === "failed" ? `fix round ${chain.round} after ${chain.parent}` : reason,
    gate: form === "all",
    verbose,
    selected,
    total: whole.length,
    fresh,
  };
  const asked = form === "all" ? "all" : selected;

  // THE RECORD (190/ADR-002). Keyed to the content BEFORE the run. An answering record ends the call
  // here; otherwise the lock for this question is held across the launch, so a caller asking the
  // same thing waits for this run's record instead of starting a second runner. `--fresh` looks
  // nothing up and waits for nobody. A store that fails never costs the run.
  let flight = null;
  if (record != null) {
    try {
      ledger ??= await record.openLedger({ projectRoot });
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
    // THE WHOLE TREE IS LAUNCHED WITH AN EMPTY SELECTION, and only from here (FF-21003): the runner
    // runs everything by its own declared arguments. A named run hands it exactly its names.
    const selectionFiles = form === "all" ? [] : selected;
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
    // A run that produced NO verdict is a failure, never a pass (72/ADR-001 §6).
    const exit = observed.status !== 0 || failed ? 1 : 0;

    // PRE-EXISTING (210/ADR-006): each failure measured on the work's base, in a tree of its own,
    // through this same body with the same seams — and with no baseline, so it never measures
    // itself. A pre-existing failure still makes the run red.
    let failures = report.failures;
    let measured = null;
    if (failures.length > 0 && baseline != null) {
      measured = await baseline.measure({
        projectRoot,
        config,
        failures,
        working: inStoryWork == null ? null : await inStoryWork(),
        root: chain?.root ?? null,
        items: items == null ? [] : await items(),
        rerun: ({ projectRoot: tree, files, reason: why }) => runTest({ files, reason: why }, { ...deps, config: baseDeclaration(config), projectRoot: tree, baseline: null, inStoryWork: null }),
      });
      failures = measured.failures.map((failure) => Object.freeze({ ...failure }));
    }
    const labelled = Object.freeze({ ...report, failures: Object.freeze(failures) });

    // THE STOP RULES (210/ADR-005), on a fix round's red: the chain's failure sets, root first, and
    // this round's. A rule that fires on this round latches it, on this round's own record.
    let stopped = null;
    if (chain != null && failures.length > 0 && ledger?.ok === true) {
      const sets = [...await chainSets(record, ledger, chain.root), failureSet(failures)];
      const fired = chainStop(sets, { bound: noProgressBound == null ? null : noProgressBound(config) });
      if (fired != null && fired.at === sets.length) stopped = Object.freeze({ ...fired, instant: new Date(clock()).toISOString() });
    }

    let recorded = null;
    let notRecorded = ledger == null || ledger.ok === true ? null : ledger.reason;
    if (ledger?.ok === true) {
      try {
        const written = await record.writeRecord(ledger, {
          ...selection,
          scope: form === "all" ? "all" : form,
          askedScope: form,
          mode: form,
          parent: chain?.parent ?? null,
          round: chain?.round ?? 0,
          baseline: measured?.baseline ?? null,
          stopped,
          outcome: observed.outcome,
          failures,
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

    return result({ ...selection, launched: true, runner, report: labelled, exit, recorded, notRecorded, reclaimed: flight?.reclaimed === true, round: chain?.round ?? 0, parent: chain?.parent ?? null, baseline: measured?.baseline ?? null, stopped });
  } finally {
    if (flight?.lock != null) await record.releaseLock(flight.lock);
  }
}

// THE SUGGESTION (210/ADR-003). The working tree against HEAD, handed to the one importer scan. It
// lists and runs nothing, writes no record and is answered from none.
async function suggest({ projectRoot, toolchain, verbose, readChanged, scan, exportMap }) {
  const set = await readChanged({ projectRoot });
  if (set.ok !== true) return refused("suggest", set.code, set.message, { verbose });
  const changed = [...set.changed];
  const scanned = changed.length === 0
    ? { suites: [], unreached: [], unresolved: [] }
    : await scan({ projectRoot, changed, roots: toolchain.roots, suffixes: toolchain.suiteSuffixes, exclude: toolchain.exclude, exportMap: await exportMap(projectRoot) });
  const suggestion = Object.freeze({
    changed: Object.freeze(changed),
    suites: Object.freeze(scanned.suites.map((entry) => Object.freeze({ suite: entry.file, reachedBy: Object.freeze(entry.reachedBy.map((by) => Object.freeze({ ...by }))) }))),
    unreached: Object.freeze([...scanned.unreached]),
    unresolved: Object.freeze(scanned.unresolved.map((entry) => Object.freeze({ ...entry }))),
  });
  return result({ form: "suggest", verbose, launched: false, selected: suggestion.suites.map((entry) => entry.suite), suggestion, exit: 0 });
}

// AN ANSWER FROM A RECORD (190/ADR-002 §2). The failures, the runner's own account and the exit
// code are the record's; the selection and the reason are this call's.
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
    baseline: record.baseline ?? null,
    stopped: record.stopped ?? null,
  });
}

// ── THE HUMAN FACE ───────────────────────────────────────────────────────────────────────────

// ONE SUMMARY LINE, and it carries every claim the machine face carries: the form, the suites, the
// reason it ran for, whether it may stand as a verdict, and what the record did.
function summaryLine(out) {
  const count = out.form === "all" ? `${out.total} suites` : `${out.selected.length} suite${out.selected.length === 1 ? "" : "s"}`;
  return [
    out.form === "failed" && out.round != null ? `failed (round ${out.round})` : out.form,
    count,
    ...(out.reason != null ? [`reason: ${out.reason}`] : []),
    out.gate ? "may stand as a verdict" : "may not stand as a verdict",
    ...recordClauses(out),
  ].join(" · ");
}

// WHAT THE RECORD DID, in the same line (190/ADR-002 §2, §3).
function recordClauses(out) {
  const clauses = [];
  if (out.reused != null) clauses.push(`answered from the run of ${out.reused.instant} (tree ${out.reused.key.slice(0, 7)})`);
  else if (out.recorded != null) clauses.push(`recorded (tree ${out.recorded.key.slice(0, 7)})`);
  else if (out.notRecorded != null) clauses.push(`not recorded: ${out.notRecorded}`);
  if (out.fresh && out.launched) clauses.push("fresh run");
  if (out.reclaimed) clauses.push("reclaimed a stale lock");
  return clauses;
}

// THE SUGGESTION'S FACE: each suite with every changed file that reaches it and how, then the files
// that reach none, then the unresolved specifiers by count — by name too under `--verbose`.
function renderSuggestion(out) {
  const { changed, suites, unreached, unresolved } = out.suggestion;
  if (changed.length === 0) return "suggest · nothing has changed in the working tree, so no suite is listed · nothing ran";
  const lines = suites.map((entry) => `${entry.suite} — ${entry.reachedBy.map((by) => `${by.how} ${by.file}`).join(", ")}`);
  for (const file of unreached) lines.push(`# ${file} reaches no suite`);
  if (unresolved.length > 0) {
    lines.push(`# ${unresolved.length} import specifier${unresolved.length === 1 ? "" : "s"} could not be resolved${out.verbose ? ":" : " (--verbose names them)"}`);
    if (out.verbose) for (const entry of unresolved) lines.push(`#   ${entry.file}: ${entry.specifier}`);
  }
  lines.push(`suggest · ${changed.length} changed file${changed.length === 1 ? "" : "s"} · ${suites.length} suite${suites.length === 1 ? "" : "s"} · nothing ran`);
  return lines.join("\n");
}

function renderResult(out) {
  const lines = [];
  if (out.refusal != null) {
    lines.push(`not ok - aof test refused: ${out.refusal.code}`);
    lines.push(out.refusal.message);
    return lines.join("\n");
  }
  if (out.form === "suggest") return renderSuggestion(out);

  // THE CASES IN EMITTED ORDER. Failures-only prints the failing rows; `--verbose` prints a row for
  // every case as well, so the verbose output is the same lines plus more.
  const preExisting = out.report.failures.filter((failure) => failure.preExisting === true);
  for (const entry of out.report.cases) {
    if (entry.status === "failed") {
      const failure = out.report.failures.find((item) => item.case === entry.name);
      if (failure?.preExisting === true) continue;
      lines.push(`not ok - ${entry.name}`);
      if (failure?.message) lines.push(failure.message);
      continue;
    }
    if (!out.verbose) continue;
    if (entry.status === "skipped") lines.push(`ok - ${entry.name} # skip`);
    else if (entry.status == null) lines.push(`ok - ${entry.name} # no status reported`);
    else lines.push(`ok - ${entry.name}`);
  }

  // THE WAYS A RUN FAILS WITHOUT A FAILING CASE, each stated rather than left to the exit code.
  if (out.runner == null) { /* an answer whose record kept no runner account: nothing to add */ }
  else if (out.runner.outcome !== "exited") lines.push(`not ok - ${out.runner.message}`);
  else if (!out.report.ok) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its output could not be read as ${out.report.format} — no case was enumerated, so this run produced no verdict. Re-run with --verbose to see the whole stream, or check that the declared report format matches what the runner emits.`);
  } else if (out.report.contradiction) {
    lines.push(`not ok - the runner exited ${out.runner.exitCode} and its report enumerated no failure — a green-reading report beside a non-zero exit is a contradiction, not a pass. Re-run with --verbose to see the whole stream.`);
  }

  // PRE-EXISTING FAILURES ARE SHOWN APART (210/ADR-006): they fail on the work's base too, so they are
  // not the story's to fix. They are recorded by case name, and they still make the run red.
  if (preExisting.length > 0) {
    lines.push(`# pre-existing — also failing on the base (${out.baseline?.from ?? "the work's base"}), not this work's to fix:`);
    for (const failure of preExisting) lines.push(`#   ${failure.case} (${failure.file})`);
  }
  if (out.report.failures.some((failure) => failure.preExisting === "unmeasured")) lines.push(`# baseline unmeasured: ${out.baseline?.reason ?? "the work's base could not be run"}`);

  lines.push(summaryLine(out));
  // EVERY RED SUMMARY ENDS WITH THE FIX ROUND (210/ADR-004) — unless a stop rule latched this run, and
  // then it ends with the hand-over instead, because the fix round would be refused.
  if (out.exit !== 0 && out.refusal == null) lines.push(out.stopped != null ? handOver(out.stopped) : FIX_ROUND_LINE);
  return lines.join("\n");
}

const testCommand = {
  id: "test",
  input: {
    type: "object",
    properties: {
      files: { type: "array", items: { type: "string" } },
      reason: { type: ["string", "null"] },
      suggest: { type: "boolean" },
      failed: { type: "boolean" },
      all: { type: "boolean" },
      verbose: { type: "boolean" },
      fresh: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    // The stream is read once per call, however many of the checks below ask for it.
    let listed = null;
    const streamItems = async () => (listed ??= storyWorkItems(ctx));
    return await runTest(input, {
      projectRoot: ctx.workspace.projectRoot,
      config: ctx.workspace.config,
      // THE STORY-WORK CHECK AND THE RECORD STORE, and only here: the CLI face is the one caller an
      // agent types, and the one whose runner is always the project's own.
      inStoryWork: storyWorkItems == null ? null : async () => storyWorkOf({ env: ctx.env ?? process.env, items: await streamItems() }),
      items: storyWorkItems == null ? null : streamItems,
      baseline: baselineServices,
      record: testRecord,
    });
  },

  cli: {
    route: ["test"],
    spec: {
      usage: 'aof test <suite>… --reason "<why>" | --suggest | --failed | --all [--fresh] [--verbose] [--json]',
      flags: {
        reason: { type: "string", description: "why these suites — required by a named run, and recorded beside its result" },
        suggest: { type: "boolean", description: "list the suites a working-tree change reaches (imports, via a helper, or names it) — runs nothing" },
        failed: { type: "boolean", description: "a fix round: the last red's failures plus the suites the fix reaches" },
        all: { type: "boolean", description: "the whole tree — refused inside story work, where the whole tree is the gate's" },
        verbose: { type: "boolean", description: "restore the full stream — adds the passing rows, removes nothing" },
        fresh: { type: "boolean", description: "run even when a record on this content already answers — to chase a suspected flake; the record says it was a deliberate repeat" },
      },
    },

    argv: (positionals, options) => ({
      files: positionals,
      reason: options.reason ?? null,
      suggest: options.suggest === true,
      failed: options.failed === true,
      all: options.all === true,
      verbose: options.verbose === true,
      fresh: options.fresh === true,
    }),

    render: renderResult,
    json: (out) => out,
    // NO `cli.launch`. This command runs a bounded child and returns; FF-7204 reads that from the
    // registered command object rather than from source text.
    exit: (out) => out.exit,
  },
};

return { ALL_IN_STORY_WORK, FAILED_NO_RED, FAILED_UNATTRIBUTED, FIX_ROUND_LINE, FIX_STOPPED, FORM_CONFLICT, FORM_MISSING, NO_FORM, NOT_A_SUITE, REASON_MISSING, TEST_FORMS, chainStop, runTest, storyWorkOf, testCommand };
}
