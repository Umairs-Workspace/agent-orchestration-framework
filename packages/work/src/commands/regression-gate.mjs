import { readFile } from "node:fs/promises";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { writeText } from "@aof/foundation/fs";
import {
  COMMIT_UNKNOWN,
  GATE_SCOPE,
  appendRegressionRow,
  detailCell,
  gateInstant,
  regressionRecordPath,
  satisfiesDoor,
  scopeCell,
} from "../regression-record.mjs";

// Core supplies configured resolution, execution, notification and transition services.
export function createRegressionGateCommand({ execFile, gateToolchain, headCommit, launchRunner, requireLocalCheckout, resolveItemExact, resolveTestGate, resolveTestToolchain, runTest }) {
// `aof work regression-gate <ref>` — THE GATE RUN (milestone 96 / story 04, ADR-008 §1, §2).
// FF-9606 is its control.
//
// THIS IS NOT A NEW TEST RUN. `aof test --scope all` already computes the gate boolean
// (`scope === "all" && widened.length === 0`, `src/commands/test.mjs`) and then discards it. This
// verb composes that same command body, records what it proved, and hands the door in
// `src/commands/item-status.mjs` something durable to read. Two seams already existed and this
// story rebuilds neither: the run is `runTest`'s, and the document's shape is
// `src/regression-record.mjs`'s.
//
// IT REFUSES A TREE IT CANNOT TRUST, AND THAT IS THE POINT OF THE VERB (ADR-008 §2). A downstream
// retrospective records two agents red-probing on one checkout and getting silently unreliable
// results; another records worktrees isolating source but not derived artefacts, the database or the
// git index. A gate that runs inside whichever lane happens to hold the tree measures that lane, not
// the milestone — so a dirty checkout is a coded refusal naming what is dirty, and the row names the
// commit the run actually ran against.
//
// THE GIT READS ARE THIS MODULE'S OWN, AND `laneChanges` IS DELIBERATELY NOT REUSED. That helper
// exists for the sweep, where a git fault must not delete a lane, so it swallows a non-zero status
// and answers `[]` — which HERE would render a broken git as a clean tree and let the gate run
// against a checkout nobody measured. Same command, opposite failure direction: this one fails
// CLOSED. The seam is injected all the same, so every row of the contract drives without a
// repository.
//
// THE RECORD'S OWN FILE IS EXCLUDED FROM THE DIRTINESS READ, and it has to be: the gate WRITES
// `REGRESSION.md` as its last act, so a second run would find the tree dirty because of the first
// run's evidence and refuse forever. A gate blocked by its own output is a gate that gets deleted.
// Nothing else is excluded — an untracked file under a source root can change what the suite
// contains, which is exactly the tree state this verb exists to refuse.
//
// PURE OVER ITS SEAMS, in `runTest`'s own idiom: every impure edge is injected and defaults to the
// shipped one, so each row of the contract drives without a repository or a child process and the
// SAME code path runs in production. `deps` is deliberately not part of the input schema — a seam is
// not something a caller of the CLI gets to choose.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 96 / story 04 (ADR-008 §1, §2) — THE REGRESSION GATE'S RUN, the other half of the
//   door `work:status` above now holds. It composes the existing `aof test --scope all` body, refuses a
//   dirty checkout, and appends the run to the milestone's own `REGRESSION.md` — durability over a
//   boolean the test command already computed and discarded.


// THE VERB'S OWN REFUSAL, and the only one it adds: commit your work, or run the gate somewhere
// clean. It is not a test result, so nothing is recorded — a row is written only for a run that
// actually happened. The second refusal it can raise, `COMMIT_UNKNOWN`, belongs to the RECORD (both
// writers meet the same fact), so it is imported from there rather than spelled — or re-exported —
// a second time here.
const DIRTY_TREE = "regression-gate-dirty-tree";

// THE OPERATOR'S SETTINGS (144). The gate runs the project's declared whole-tree program, and the
// operator chooses HOW it runs — `--serial` for the plain test runner, `--jobs N` for the worker
// count — never WHAT it runs: the scope stays `all`, and no setting narrows anything. A setting the
// gate cannot honour is refused before the commit is resolved, so it costs nothing and writes no
// row: it is not a test result. Three codes, three repairs — drop one of two contradictory flags,
// pass a whole number, or declare where the worker count goes.
const SETTINGS_CONFLICT = "regression-gate-settings-conflict";
const JOBS_INVALID = "regression-gate-jobs-invalid";
const JOBS_UNDECLARED = "regression-gate-jobs-undeclared";

// The two ways the gate's program runs, named on every row so a reader of the record can tell a
// sharded sign-off from a serial one without the run's logs.
const SERIAL = "serial";
const SHARDED = "sharded";

// ── THE GIT SEAM ─────────────────────────────────────────────────────────────────────────────

function defaultGit(args, { cwd, timeoutMs = 30000 } = {}) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) =>
      resolve({
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? ""),
        status: error ? (typeof error.code === "number" ? error.code : 1) : 0,
      }));
  });
}

const posix = (value) => String(value).split(path.sep).join("/");

// Every path `git status --porcelain` reports, forward-slashed on every platform. A non-zero status
// — or a throw — is NOT an empty list here: it is `null`, and the caller refuses on it.
async function dirtyPaths(git, cwd) {
  let result;
  try {
    result = await git(["status", "--porcelain"], { cwd });
  } catch {
    return null;
  }
  if (result?.status !== 0) return null;
  return String(result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    // porcelain v1: `XY <path>`, and a rename is `XY <old> -> <new>` — the NEW path is the one the
    // tree now holds. `??` marks an untracked file, which counts: a new suite file changes what the
    // run contains, and a gate that ignored it would be measuring a tree it did not have.
    .map((line) => line.slice(2).trim().split(" -> ").pop().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

// ── THE SETTINGS ─────────────────────────────────────────────────────────────────────────────

function settingsRefusal(message, code, detail) {
  const error = commandError(message, code, 400);
  error.detail = detail;
  return error;
}

// `{ serial, jobs }` from the input, or a coded refusal. `jobs` arrives as the CLI's string or as a
// number from a programmatic caller, and only a whole number of at least one is a worker count.
function readSettings(input) {
  const serial = input?.serial === true;
  const raw = input?.jobs;
  if (raw == null) return Object.freeze({ serial, jobs: null });
  if (serial) {
    throw settingsRefusal(
      `--serial and --jobs ${raw} contradict each other: --serial runs the plain test runner, which takes no worker count. Pass one of them.`,
      SETTINGS_CONFLICT,
      { serial, jobs: raw },
    );
  }
  const jobs = typeof raw === "number" ? raw : /^\s*\d+\s*$/.test(String(raw)) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(jobs) || jobs < 1) {
    throw settingsRefusal(
      `--jobs ${JSON.stringify(String(raw))} is not a worker count — pass a whole number of at least 1.`,
      JOBS_INVALID,
      { jobs: raw },
    );
  }
  return Object.freeze({ serial, jobs });
}

// ── THE ROW'S DETAIL ─────────────────────────────────────────────────────────────────────────

// The program's own report lines the gate reads. The runner prints them; the gate parses nothing
// it would have to infer. Both streams, in the order `aof test` reads them.
const NOT_ISOLATED_LINE = /^# not isolated - (.+?)\s*$/gm;
const SLOWEST_HEADING = /^# slowest files/;
const LOGS_LINE = /^# logs: (.+?)\s*$/m;

function programReport(observed) {
  const text = `${observed?.stdout ?? ""}\n${observed?.stderr ?? ""}`;
  const notIsolated = [...text.matchAll(NOT_ISOLATED_LINE)].map((match) => match[1]);
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((line) => SLOWEST_HEADING.test(line));
  const slowest = [];
  if (at >= 0) {
    slowest.push(lines[at]);
    for (const line of lines.slice(at + 1)) {
      if (!/^\s+\S/.test(line)) break;
      slowest.push(line);
    }
  }
  return Object.freeze({
    notIsolated: Object.freeze(notIsolated),
    slowest: Object.freeze(slowest),
    logs: LOGS_LINE.exec(text)?.[1] ?? null,
  });
}

// `<mode>[ --jobs N] · <min> min[ · over budget (<B> min)]` — how the run ran and how long it took.
// An overrun is LOGGED on the row and never turns it red: the budget is a measurement the next item
// works against, not a verdict on the code.
function runLine({ mode, jobs, minutes, budgetMinutes, overBudget }) {
  return `${mode}${jobs == null ? "" : ` --jobs ${jobs}`} · ${minutes.toFixed(1)} min`
    + `${overBudget ? ` · over budget (${budgetMinutes} min)` : ""}`;
}

// The detail cell, composed in ONE place and in ONE order: what failed, then what is not isolated,
// then the run line — so a red row still leads with its failures and a green row is never empty.
function rowDetail({ green, outcome, failures, notIsolated, run }) {
  const parts = [];
  if (!green) parts.push(failureDetail(outcome, failures));
  if (notIsolated.length > 0) parts.push(`not isolated: ${notIsolated.join(", ")}`);
  if (run != null) parts.push(runLine(run));
  return parts.length === 0 ? null : detailCell(parts.join(" · "));
}

// ── THE BODY ─────────────────────────────────────────────────────────────────────────────────

/**
 * Run the gate for one item and append its row.
 *
 *   input — `{ ref, now, serial, jobs }`; `now` (ISO-8601 UTC-Z) is the established injected clock,
 *           never a flag; `serial` and `jobs` are the operator's settings for the run
 *   deps  — `{ projectRoot, config, resolve, git, runSuite, launch, clock, read, write }`, every one
 *           defaulted to the shipped seam by the command below; `clock` times the run in ms
 *
 * The order is load-bearing: the tree is checked BEFORE the settings, the settings BEFORE the commit
 * is resolved and the commit BEFORE the suite runs, so the hash the row names and the state the
 * suite saw are one fact, and a refusal costs nothing rather than a whole suite.
 */
async function runRegressionGate(input, deps = {}) {
  const {
    projectRoot,
    config,
    resolve,
    git = defaultGit,
    runSuite = runTest,
    launch = launchRunner,
    clock = Date.now,
    read = readFile,
    write = writeText,
  } = deps;

  const ref = typeof input?.ref === "string" ? input.ref.trim() : "";
  if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);

  // THE EXACT RESOLVER, and the local-checkout refusal behind it. A gate is evidence about a tree
  // this node holds; a ref answered from the mesh cache names a folder that is not here, and there
  // is no honest way to record a run against a checkout you do not have.
  const item = await resolve(ref);
  if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
  requireLocalCheckout(item, ref);

  const target = regressionRecordPath(item.dir);
  const ownPath = posix(path.relative(projectRoot, target));

  // (1) THE TREE, BEFORE ANYTHING ELSE.
  const dirty = await dirtyPaths(git, projectRoot);
  if (dirty == null) {
    throw commandError(
      `The regression gate could not read the state of ${projectRoot} — \`git status\` did not answer, so this checkout cannot be shown to be clean. A gate that ran here would be measuring a tree nobody measured.`,
      DIRTY_TREE,
      409,
    );
  }
  const offending = dirty.filter((file) => file !== ownPath);
  if (offending.length > 0) {
    const error = commandError(
      `The regression gate refuses a dirty checkout: ${offending.join(", ")}. `
        + "The gate runs where nothing else is writing (ADR-008 §2) — a run inside whichever lane "
        + "happens to hold the tree measures that lane, not the milestone. Commit or stash the "
        + "above, or run the gate in a clean checkout.",
      DIRTY_TREE,
      409,
    );
    error.detail = { ref: item.ref, dirty: offending };
    throw error;
  }

  // (2) THE SETTINGS, against the project's gate declaration. A malformed declaration is NOT
  // refused here: it is the toolchain's own refusal, and the run below records it as a red row —
  // the milestone's history should carry "the gate program does not compile". Only a worker count
  // with nowhere to go is refused, because that is the operator's setting, not the declaration.
  const settings = readSettings(input);
  const gateDeclared = resolveTestGate(config);
  if (settings.jobs != null && gateDeclared.ok === true && gateDeclared.gate?.jobsArgs == null) {
    throw settingsRefusal(
      `--jobs ${settings.jobs} has nowhere to go: the project declares no worker-count template for the gate (\`jobsArgs\` in its gate declaration), so the run cannot be told how many workers to use. Declare one, or drop --jobs.`,
      JOBS_UNDECLARED,
      { jobs: settings.jobs, gateDeclared: gateDeclared.gate != null },
    );
  }
  const gate = gateDeclared.ok === true ? gateDeclared.gate : null;
  const mode = settings.serial || gate == null ? SERIAL : SHARDED;

  // (3) THE COMMIT THE ROW WILL NAME, from the tree just shown to be clean.
  // `headCommit` is the SHIPPED read (`src/mesh/worktree.mjs`) — the same one the control side
  // stamps onto every dispatched directive, over the same injected exec seam. Its `null` on a fault
  // is exactly the answer this door wants: a checkout that cannot name its HEAD cannot produce a
  // readable row, so there is nothing here to soften.
  const commit = await headCommit(projectRoot, { exec: git });
  if (commit == null) {
    throw commandError(
      `The regression gate could not resolve HEAD in ${projectRoot}, so a run here could not name the commit it ran against — and a row without a commit is a row the record refuses to read back.`,
      COMMIT_UNKNOWN,
      409,
    );
  }

  // (4) THE RUN — the shipped command body, asked for the whole tree. Nothing about the selection is
  // re-decided here; `scope` and `widened` come back as `aof test` computed them. What the gate
  // injects is WHICH PROGRAM that body launches — the toolchain module composes the gate's program
  // from the declaration and the settings — and a tap on the launch, so the program's own report
  // lines (not isolated, slowest files, logs) reach the row. The clock brackets the call.
  let observed = null;
  const started = clock();
  const outcome = await runSuite({ scope: GATE_SCOPE }, {
    projectRoot,
    config,
    resolveStory: resolve,
    resolveToolchain: (declared, options) => {
      if (gateDeclared.ok !== true) return gateDeclared;
      const compiled = resolveTestToolchain(declared, options);
      return compiled.ok === true
        ? Object.freeze({ ok: true, toolchain: gateToolchain(compiled.toolchain, gate, settings) })
        : compiled;
    },
    run: async (toolchain, files, options) => (observed = await launch(toolchain, files, options)),
  });
  const minutes = Number(((clock() - started) / 60000).toFixed(1));

  // (5) THE ROW. A refusal from the run is recorded as RED rather than swallowed: the suite did not
  // answer, and "the toolchain is undeclared" is a thing the milestone's history should carry.
  const failures = outcome.report?.failures ?? [];
  const green = outcome.refusal == null && outcome.exit === 0 && failures.length === 0;
  const report = programReport(observed);
  const budgetMinutes = gate?.budgetMinutes ?? null;
  // A run that never launched has no wall time to report, so it carries no run line.
  const run = outcome.launched === true
    ? Object.freeze({
      mode,
      jobs: mode === SHARDED ? settings.jobs : null,
      minutes,
      budgetMinutes,
      overBudget: budgetMinutes != null && minutes > budgetMinutes,
    })
    : null;
  const row = {
    commit,
    instant: gateInstant(input?.now),
    scope: scopeCell({ scope: outcome.scope, widened: outcome.widened ?? [] }),
    result: green ? "green" : "red",
    detail: rowDetail({ green, outcome, failures, notIsolated: report.notIsolated, run }),
  };

  // (6) THE APPEND — read-modify-write through the atomic seam. A malformed existing document stops
  // the write with its own coded refusal rather than being overwritten: the repair is by hand, and a
  // writer that truncated past it would destroy the history it exists to keep.
  let existing = null;
  try {
    existing = await read(target, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await write(target, appendRegressionRow(existing, row, displayPath(target)));

  return Object.freeze({
    ref: item.ref,
    path: target,
    commit: row.commit,
    instant: row.instant,
    scope: row.scope,
    result: row.result,
    detail: row.detail,
    // The DOOR's own predicate, reported rather than re-derived by the caller — so an operator can
    // see, in this run's own output, whether the row it just wrote will satisfy the accept door.
    satisfiesDoor: satisfiesDoor(row),
    appended: true,
    run,
    notIsolated: report.notIsolated,
    slowest: report.slowest,
    logs: report.logs,
    exit: green ? 0 : 1,
  });
}

function failureDetail(outcome, failures) {
  if (outcome.refusal != null) return `${outcome.refusal.code}: ${outcome.refusal.message}`;
  if (failures.length > 0) return failures.map((failure) => failure.case).join(", ");
  return `the runner exited ${outcome.runner?.exitCode ?? "with no verdict"} and enumerated no failure`;
}

// ── THE COMMAND ──────────────────────────────────────────────────────────────────────────────

const regressionGateCommand = {
  id: "work:regression-gate",

  // NO CALLER-SUPPLIED OUTPUT PATH and no scope flag, and `additionalProperties: false` makes both
  // refusals rather than conventions. The record's home is the item's own folder (ADR-008 §1), and
  // the run's scope is `all` by definition — a gate that could be asked to run a subset would be a
  // partial run wearing a gate's name, which is the shape §1 exists to keep out of the document.
  // `serial` and `jobs` (144) choose how the whole tree runs, never how much of it: `jobs` is a
  // string or a number so the body, not the schema, answers a non-number with the gate's own code.
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      now: { type: "string" },
      serial: { type: "boolean" },
      jobs: { type: ["string", "number"] },
    },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    return await runRegressionGate(input, {
      projectRoot: ctx.workspace.projectRoot,
      config: ctx.workspace.config,
      // THE EXACT RESOLVER, bound here — the command layer's job, and the one `runTest` is handed
      // for `--story` for the same reason: a slug fallback would record a near-miss story's run
      // under this item's name.
      resolve: (ref) => resolveItemExact(ctx, ref),
    });
  },

  cli: {
    route: ["work", "regression-gate"],
    spec: {
      usage: "aof work regression-gate <ref> [--serial] [--jobs N] [--json]",
      flags: {
        serial: { type: "boolean", description: "run the project's plain test program instead of its declared gate program" },
        jobs: { type: "string", description: "the gate program's worker count, through its declared jobsArgs template" },
      },
    },

    argv: (positionals, options = {}) => ({
      ref: positionals[0],
      ...(options.serial === true ? { serial: true } : {}),
      ...(options.jobs != null ? { jobs: options.jobs } : {}),
    }),

    // The verdict, the row's detail, then where the time went — the program's own slowest-files
    // block, unchanged, and its log directory — so the operator reads the run without opening it.
    render: (result) =>
      `${result.result === "green" ? "ok" : "not ok"} - regression gate ${result.ref} @ ${result.commit} `
        + `(scope ${result.scope}) — ${result.satisfiesDoor ? "may stand as the accept gate" : "does NOT satisfy the accept door"}`
        + `${result.detail == null ? "" : `\n${result.detail}`}`
        + `${result.slowest.length === 0 ? "" : `\n${result.slowest.join("\n")}`}`
        + `${result.logs == null ? "" : `\nLogs: ${result.logs}`}`
        + `\nAppended to ${displayPath(result.path)}.`,

    json: (result) => ({ ...result, path: displayPath(result.path) }),
    exit: (result) => result.exit,
  },
};

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

return { DIRTY_TREE, JOBS_INVALID, JOBS_UNDECLARED, SETTINGS_CONFLICT, regressionGateCommand, runRegressionGate };
}
