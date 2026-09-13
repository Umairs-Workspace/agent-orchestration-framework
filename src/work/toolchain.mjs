// THE ONE HOME FOR A PROJECT-DECLARED TOOLCHAIN — milestone 72 / story 00, ADR-001 §1, §2, §2a,
// §2b, §3, §5, §5a, §5b, §6 and ADR-007 §5. FF-7201 is the control.
//
// aof is INSTALLED into repositories that are not this one. `scripts/test.mjs` is this repo's
// script and exists in none of them, so a command that hard-codes it works here and lies
// everywhere else — story 87 is what that failure looks like when it ships. And the aof process
// must not import project test code, because importing executes it (66/ADR-004 §2, 59/FF-5904;
// 880 modules in this repo, measured). A runner that can be neither imported nor hard-coded
// leaves exactly one shape: a DECLARATION, and a BOUNDED SPAWN of what it names.
//
// FOUR RULES, and every one of them is a refusal to guess:
//
//   1. THE DECLARATION IS THE ONLY SPELLER OF THE PROGRAM. `work.test` is read here and nowhere
//      else, the way `src/loop-bounds.mjs` is the one home for `work.loop.*`. No program name is
//      spelled in this file in an executable position, so a guessed default cannot exist as text.
//      An absent declaration is an ANSWER — a coded refusal naming the key — never a fallback to
//      some package manager's `test` script: a guessed program is a program nobody declared, and
//      the operator would learn what aof assumed only from the failure.
//
//   2. `deadlineMs` IS REQUIRED (ADR-001 §2a), and this is a conscious DEPARTURE from
//      `src/loop-bounds.mjs`'s `positiveInteger(value, fallback)` idiom. The gap is measured, not
//      theoretical: `runBounded`'s own `DEFAULT_DEADLINE_MS` is 60_000 and this repo's suite needs
//      900_000, so a silent fallback would kill aof's own run at 60s and report `deadline-expired`
//      — a bound nobody chose, failing a run nobody could see the cause of. A fallback is right
//      where the default is a POLICY; it is wrong where the correct value is a property of the
//      project's toolchain and only the project knows it.
//
//   3. PATH RESOLUTION HAPPENS IN FRONT OF THE SEAM'S DOOR, NEVER BY RELAXING IT (ADR-001 §5).
//      `argumentVectorProblem` (`src/work-audit/spawn.mjs:98-113`) CONJOINS its two conditions at
//      `:102` — `SHELL_SHAPED.test(command) && !exists(command)` — and the seam documents the
//      intent at `:79-81`. Driven: bare `node` → `exited`/0; a bare package-manager name →
//      `not-started`, `spawn … ENOENT`. So the door refuses a shell STRING and lets a bare NAME
//      through to the operating system, where a missing program surfaces far from its cause and
//      blames the seam. Resolving here turns that into a coded refusal naming the declaration, and
//      leaves the door exactly as strict as it was.
//
//   4. ONE BOUNDED SEAM, REUSED (ADR-001 §5). Every child process this milestone starts comes from
//      `runBounded` — argument vector, no shell, deadline armed, kill on expiry. This module
//      authors no second bounded spawn and imports the process module nowhere.
//
// TWO DECLARATIONS ARE COMPILED HERE, AND THEY DIFFER IN ABSENCE (ADR-007 §5, ADR-008 §2).
// `work.test` absent is a refusal; `work.worktree.prepare` absent is a silent no-op — an optional
// step nobody declared is not an error. A declaration that is PRESENT and does not compile is a
// refusal for both, raised at COMPILE time rather than at the door, because *present and naming no
// command* was neither absent nor failed, and that is the gap where a typo becomes an invisible
// non-install. The two are deliberately NOT unified behind one resolver that carries the test
// runner's absence refusal into the prepare key: the field faults are shared, the absence answer
// is not.
//
// THE PATH RESOLVER IS A FOURTH DERIVATION, KNOWINGLY (ADR-001 §5b). Three exist and all three are
// module-private — `src/terminal-providers.mjs:33` (the only one that handles `PATHEXT`
// correctly, and the shape copied here), `src/tool-store.mjs:143`, `src/config-inspect.mjs:567`.
// Reuse is impossible without writing outside this story's set and extraction would touch three
// modules this milestone does not own, so ~18 lines are re-derived and the one-home debt is
// ledgered rather than paid by an unscoped refactor.
import path from "node:path";
import { statSync } from "node:fs";

import { runBounded } from "../work-audit/spawn.mjs";

// ── THE KEYS THIS MODULE OWNS ────────────────────────────────────────────────────────────────
//
// Spelled once, as data, for the same reason `LOOP_BOUND_CONFIG_KEYS` is: a census that asks
// "which module reads this key" needs the key to exist as text somewhere, and the honest place for
// it is the module that owns it. FF-7201 asserts this list has exactly one reader in `src/`.
export const TOOLCHAIN_CONFIG_KEYS = Object.freeze([
  "work.test.command",
  "work.test.args",
  "work.test.selectArgs",
  "work.test.roots",
  "work.test.deadlineMs",
  "work.test.report",
  "work.worktree.prepare",
]);

// ── THE REFUSAL CODES (ADR-001 §5a) ──────────────────────────────────────────────────────────
//
// Three answers for the test runner because there are three different REPAIRS: declare something,
// fix the field the message names, install (or re-declare) the program. Rendering them identically
// is 63/ADR-010 §7's defect. The prepare step carries its own two for the same reason — a refusal
// that said `test-runner-…` about a worktree step would send the reader to the wrong key.
export const TEST_RUNNER_UNDECLARED = "test-runner-undeclared";
export const TEST_RUNNER_DECLARATION_INVALID = "test-runner-declaration-invalid";
export const TEST_RUNNER_UNRESOLVABLE = "test-runner-unresolvable";
export const WORKTREE_PREPARE_DECLARATION_INVALID = "worktree-prepare-declaration-invalid";
export const WORKTREE_PREPARE_UNRESOLVABLE = "worktree-prepare-unresolvable";

export const TOOLCHAIN_REFUSAL_CODES = Object.freeze([
  TEST_RUNNER_UNDECLARED,
  TEST_RUNNER_DECLARATION_INVALID,
  TEST_RUNNER_UNRESOLVABLE,
  WORKTREE_PREPARE_DECLARATION_INVALID,
  WORKTREE_PREPARE_UNRESOLVABLE,
]);

// How the runner's output is READ (ADR-001 §2b). Hard-coding a format would be the
// "works in one repo and lies in every other" shape this module opens by refusing, and the tree
// already settles the question: `work.rubric` declares `report.format` beside its command. An
// unknown format is a refusal, never a silent fall-through to raw text.
export const REPORT_FORMATS = Object.freeze(["tap"]);
export const DEFAULT_REPORT_FORMAT = "tap";

// The two verdicts a run that FINISHED can carry. An outcome that produced no verdict carries
// neither — see `toolchainReport`.
export const TOOLCHAIN_VERDICTS = Object.freeze(["passed", "failed"]);

// SHIMS ARE NOT PROGRAMS, and this is measured rather than fastidious: Node 22 throws `EINVAL` on
// a batch file spawned without a shell, `runBounded` catches it and reports `not-started`. Since
// the no-shell rule forbids handing the argv to an interpreter, a `.cmd`/`.bat`/`.ps1` shim is
// undeclarable — which is the correct outcome (a shim IS a shell script) and must be SAYABLE, so
// it is a coded refusal naming the remedy rather than a bare ENOENT three layers away.
export const SHIM_EXTENSIONS = Object.freeze([".cmd", ".bat", ".ps1"]);

const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";

const SHIM_REMEDY = "declare an executable and the script it runs (an interpreter plus a path to its runner script), never a shim — this seam hands the operating system an argument vector and no shell reads it";

// ── THE PATH RESOLVER (ADR-001 §5b) ──────────────────────────────────────────────────────────

// A stat that answers the only question asked of it. A path that is not there throws, and that is
// the ORDINARY answer here rather than a degrade worth reporting: "is this a file" is exactly what
// the caller wants to know, and it is the caller that turns a `false` into a coded refusal naming
// the declaration.
function defaultIsFile(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

// THE PATH FLAVOUR FOLLOWS THE PLATFORM BEING RESOLVED FOR, never the host's. In production the
// two are the same value, so this changes nothing there; what it buys is that the win32 rows and
// the POSIX rows both mean what they say wherever they are driven, and a rule only half of CI can
// check is a rule half of CI never checks.
const flavour = (platform) => (platform === "win32" ? path.win32 : path.posix);

// The extensions an executable may carry on this platform. On win32 `PATHEXT` is honoured so a
// resolution matches what the shell itself would find — and so the diagnosis of an undeclarable
// shim is accurate rather than a bare "not found". `PATHEXT` is returned upper-cased by Windows
// (`node.EXE`), so every comparison against it is case-insensitive.
function executableExtensions(env, platform) {
  if (platform !== "win32") return [""];
  return String(env.PATHEXT ?? DEFAULT_PATHEXT)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Every place a bare name could be, in the order the shell would look. A name that ALREADY carries
// a known extension is tried as itself rather than as `node.exe.EXE`.
function pathCandidates(name, env, platform) {
  const listed = env.PATH ?? env.Path ?? "";
  if (!listed) return [];
  const here = flavour(platform);
  const extensions = executableExtensions(env, platform);
  const lowered = name.toLowerCase();
  const alreadyExtended = extensions.some((extension) => extension !== "" && lowered.endsWith(extension.toLowerCase()));
  const suffixes = alreadyExtended ? [""] : extensions;
  const candidates = [];
  for (const directory of listed.split(here.delimiter).filter(Boolean)) {
    for (const suffix of suffixes) candidates.push(here.join(directory, `${name}${suffix}`));
  }
  return candidates;
}

// A declared command resolved to a program on disk, or null when it resolves nowhere.
//
// Three forms, one rule each, and the rule is the shell's own: a command carrying a path separator
// is a PATH (absolute, or relative to the project root); anything else is a bare NAME looked up on
// `PATH`. `isFile` is injected — and it is `isFile` rather than `exists` because a directory
// exists and cannot be run, and on Windows a bare package-manager name resolves to an
// extensionless POSIX shell script that is a perfectly good file and is not a program either
// (which is why the win32 lookup never tries the bare candidate).
//
// `platform` is injected for the same reason `runBounded`'s door injects `exists`: the win32 rows
// are the ones this repo's control node runs and the POSIX rows are the ones its workers run, and
// a rule that can only be driven on the machine you happen to be sitting at is a rule half of CI
// never checks.
export function resolveProgram(command, options = {}) {
  const {
    env = process.env,
    projectRoot = process.cwd(),
    platform = process.platform,
    isFile = defaultIsFile,
  } = options;
  if (typeof command !== "string" || command.length === 0) return null;
  const here = flavour(platform);
  // A separator makes it a PATH rather than a name — and `\` is one only where the platform says
  // so, because a backslash is a legal character in a POSIX filename.
  const separated = command.includes("/") || (platform === "win32" && command.includes("\\"));
  if (separated || here.isAbsolute(command)) {
    // An absolute path is returned UNALTERED: normalising it would hand the caller a string the
    // declaration never said, and the declaration is the thing a refusal has to name.
    const candidate = here.isAbsolute(command) ? command : here.resolve(projectRoot, command);
    return isFile(candidate) ? candidate : null;
  }
  for (const candidate of pathCandidates(command, env, platform)) {
    if (isFile(candidate)) return candidate;
  }
  return null;
}

// Why a resolved program cannot be launched, or null when it can. Separate from `resolveProgram`
// because "nothing is there" and "the thing there is a shim" are two different repairs, and the
// second one needs the remedy spelled out.
export function shimProblem(resolved, platform = process.platform) {
  if (typeof resolved !== "string") return null;
  const extension = flavour(platform).extname(resolved).toLowerCase();
  return SHIM_EXTENSIONS.includes(extension) ? extension : null;
}

// ── THE COMPILERS ────────────────────────────────────────────────────────────────────────────

function refusal(code, key, message, command = null) {
  return Object.freeze({ ok: false, code, key, command, message });
}

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

// A string array, or the index of the element that is not a string. Returns null when the value is
// absent (the caller decides whether absence is legal), `-1` when the value is present and is not
// an array at all.
function stringArrayProblem(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return -1;
  const bad = value.findIndex((entry) => typeof entry !== "string");
  return bad >= 0 ? bad : null;
}

// THE FIELD FAULTS, SHARED BY BOTH DECLARATIONS (ADR-007 §5). What is deliberately NOT shared is
// the absence answer: this function is only ever reached with a declaration that is PRESENT.
// `fields` says which optional fields this declaration may carry, so the prepare step is not
// silently granted a `selectArgs` nobody expands.
function compileStep(declared, prefix, invalidCode, fields) {
  const fault = (field, message) => refusal(invalidCode, `${prefix}.${field}`, `${prefix}.${field} ${message}`);

  if (typeof declared.command !== "string" || declared.command.length === 0) {
    return fault("command", "must name one executable as a non-empty string — the declaration is the only speller of the program, and there is no default to fall back to");
  }

  const argsProblem = stringArrayProblem(declared.args);
  if (argsProblem === -1) return fault("args", "must be an array — one element per argument, never one string a shell would re-split");
  if (argsProblem != null) return fault("args", `holds a non-string at index ${argsProblem} — every element reaches the child verbatim, so it must already be a string`);

  if (fields.selectArgs) {
    const selectProblem = stringArrayProblem(declared.selectArgs);
    if (selectProblem === -1) return fault("selectArgs", "must be an array — it is an argv TEMPLATE in which `{file}` expands once per selected file, not a string");
    if (selectProblem != null) return fault("selectArgs", `holds a non-string at index ${selectProblem} — an argv template is a vector of strings`);
  }

  if (fields.roots) {
    const rootsProblem = stringArrayProblem(declared.roots);
    if (rootsProblem === -1) return fault("roots", "must be an array of paths naming where suite files live");
    if (rootsProblem != null) return fault("roots", `holds a non-string at index ${rootsProblem} — each root is a path`);
  }

  if (fields.report && declared.report !== undefined) {
    if (!isPlainObject(declared.report)) return fault("report", "must be an object saying how to READ the runner's output");
    const format = declared.report.format ?? DEFAULT_REPORT_FORMAT;
    if (!REPORT_FORMATS.includes(format)) {
      return fault("report", `names the unknown format ${JSON.stringify(format)} — a failures-only report has to know which lines are failures, and guessing is the shape this declaration exists to refuse (known: ${REPORT_FORMATS.join(", ")})`);
    }
  }

  if (!Number.isSafeInteger(declared.deadlineMs) || declared.deadlineMs <= 0) {
    return fault("deadlineMs", "must be a positive whole number of milliseconds, and it is REQUIRED — a guessed bound is the same species as a guessed program, and the seam's own default would kill a long suite at a duration nobody chose");
  }

  return null;
}

// The program half, run only once the fields compile: resolve in FRONT of the seam's door, and
// turn "resolves nowhere" and "resolves to a shim" into two coded refusals that each name the
// command AS DECLARED — the string the operator would have to edit.
function compileProgram(command, unresolvableCode, key, options) {
  const resolved = resolveProgram(command, options);
  if (resolved == null) {
    return {
      problem: refusal(
        unresolvableCode,
        key,
        `the declared command ${JSON.stringify(command)} resolves to no executable file — it is on no PATH entry, and it is at no path under the project root. ${SHIM_REMEDY}.`,
        command,
      ),
    };
  }
  const shim = shimProblem(resolved, options.platform ?? process.platform);
  if (shim != null) {
    return {
      problem: refusal(
        unresolvableCode,
        key,
        `the declared command ${JSON.stringify(command)} resolves to ${JSON.stringify(resolved)}, a ${shim} shim, and a shim is a shell script: ${SHIM_REMEDY}.`,
        command,
      ),
    };
  }
  return { resolved };
}

// THE TEST RUNNER (ADR-001 §2). Absent is a refusal naming the key; present-and-faulty is a
// refusal naming the field; well-formed-and-unresolvable is a refusal naming the command. Three
// codes, three repairs. No program is ever substituted for the one that was not declared.
export function resolveTestToolchain(config, options = {}) {
  const declared = config?.work?.test;
  if (!isPlainObject(declared)) {
    return refusal(
      TEST_RUNNER_UNDECLARED,
      "work.test",
      "no test runner is declared: set `work.test` in the project's aof config to an object naming the program to run, its invariant arguments, its selection template and its deadline. aof runs what the project declares and guesses nothing — a guessed program is a program nobody declared.",
    );
  }

  const fault = compileStep(declared, "work.test", TEST_RUNNER_DECLARATION_INVALID, {
    selectArgs: true,
    roots: true,
    report: true,
  });
  if (fault != null) return fault;

  const { problem, resolved } = compileProgram(declared.command, TEST_RUNNER_UNRESOLVABLE, "work.test.command", options);
  if (problem != null) return problem;

  return Object.freeze({
    ok: true,
    toolchain: Object.freeze({
      command: declared.command,
      program: resolved,
      args: Object.freeze([...(declared.args ?? [])]),
      selectArgs: Object.freeze([...(declared.selectArgs ?? [])]),
      roots: Object.freeze([...(declared.roots ?? [])]),
      deadlineMs: declared.deadlineMs,
      // The WHOLE report block is carried, with only `format` defaulted: `work.rubric.report`
      // ships a `floor` beside its format, and a compiler that kept one key would silently drop
      // whatever the reader downstream of it was declared to need.
      report: Object.freeze({ ...(declared.report ?? {}), format: declared.report?.format ?? DEFAULT_REPORT_FORMAT }),
    }),
  });
}

// THE WORKTREE PREPARE STEP (ADR-007 §1, §5). ABSENT IS A SILENT NO-OP — no refusal, no warning,
// no step — because an optional declaration nobody made is not a fault. PRESENT AND FAULTY IS A
// REFUSAL, raised here at compile time and not at the door, because a typo that produced a silent
// non-install is the failure this clause exists to prevent, and it must be told apart from the
// step simply being absent.
export function resolveWorktreePrepare(config, options = {}) {
  const declared = config?.work?.worktree?.prepare;
  if (declared == null) return Object.freeze({ ok: true, prepare: null });

  if (!isPlainObject(declared)) {
    return refusal(
      WORKTREE_PREPARE_DECLARATION_INVALID,
      "work.worktree.prepare",
      "work.worktree.prepare is present and is not an object — a declared step must name a command, its arguments and its deadline. Absent means no step at all; present means it has to compile.",
    );
  }

  const fault = compileStep(declared, "work.worktree.prepare", WORKTREE_PREPARE_DECLARATION_INVALID, {
    selectArgs: false,
    roots: false,
    report: false,
  });
  if (fault != null) return fault;

  const { problem, resolved } = compileProgram(
    declared.command,
    WORKTREE_PREPARE_UNRESOLVABLE,
    "work.worktree.prepare.command",
    options,
  );
  if (problem != null) return problem;

  return Object.freeze({
    ok: true,
    prepare: Object.freeze({
      command: declared.command,
      program: resolved,
      args: Object.freeze([...(declared.args ?? [])]),
      deadlineMs: declared.deadlineMs,
    }),
  });
}

// ── THE ONE EXPANSION RULE (ADR-001 §3) ──────────────────────────────────────────────────────

export const FILE_TOKEN = "{file}";

// `selectArgs` is an argv TEMPLATE, and `{file}` expands ONCE PER SELECTED FILE, IN PLACE. A
// positional runner falls out as `["{file}"]` and a flag runner as `["--only", "{file}"]`, from
// the same rule — there is no `style` enum, because a two-member enum invites a third and the
// third is always the one that does not fit.
//
// TWO PROPERTIES THE ROWS PIN, and both are the rule rather than special cases:
//
//   · THE TEMPLATE IS NOT REPEATED. Three files against `["--only", "{file}"]` compose
//     `["--only", "a", "b", "c"]` and never `["--only","a","--only","b","--only","c"]`. Only the
//     in-place reading composes with a single declaration: a repeated template would make the
//     invariant prefix and the selection indistinguishable in the assembled argv.
//   · ZERO FILES SELECTS NOTHING, so the whole template collapses. That is what stops a flag being
//     left standing without the operand it introduces — `["--only"]` alone is a runner reading the
//     next thing on the line as its operand, which is the invariant prefix.
//
// A token that is not `{file}` is not a placeholder: it is neither expanded nor dropped, because
// honouring a second one would be a second rule, and silently dropping it would lose an argument
// the project declared.
export function selectionArgs(selectArgs, files) {
  const template = Array.isArray(selectArgs) ? selectArgs : [];
  const selected = Array.isArray(files) ? files.filter((file) => typeof file === "string" && file.length > 0) : [];
  if (selected.length === 0) return Object.freeze([]);
  const vector = [];
  for (const element of template) {
    if (!element.includes(FILE_TOKEN)) {
      vector.push(element);
      continue;
    }
    for (const file of selected) vector.push(element.split(FILE_TOKEN).join(file));
  }
  return Object.freeze(vector);
}

// The full vector handed to the seam: the invariant prefix the project declared, then the
// selection. Two halves, in that order, and nothing between them.
export function argumentVector(toolchain, files) {
  return Object.freeze([...toolchain.args, ...selectionArgs(toolchain.selectArgs, files)]);
}

// ── THE LAUNCH, AND WHAT AN OUTCOME MEANS (ADR-001 §6) ───────────────────────────────────────

// A DEADLINE EXPIRY IS NEVER GREEN, and neither is a failure to start. A run killed at its
// deadline produced NO verdict, and no verdict is not a green one — a suite that never finished
// tells you nothing about the code, and an agent that reads it as success ships on it. So the
// three seam outcomes map to three reported answers and two of them carry no verdict at all.
//
// PURE over the seam's own frozen envelope, so every row drives against a stub and the mapping is
// testable without starting anything.
export function toolchainReport(observed) {
  const base = {
    outcome: observed.outcome,
    command: observed.command,
    args: observed.args,
    attempted: observed.attempted,
    deadlineMs: observed.deadlineMs,
    exitCode: observed.exitCode ?? null,
    stdout: observed.stdout ?? "",
    stderr: observed.stderr ?? "",
  };
  if (observed.outcome === "exited") {
    const passed = observed.exitCode === 0;
    return Object.freeze({
      ...base,
      verdict: passed ? "passed" : "failed",
      status: passed ? 0 : 1,
      message: passed
        ? `${observed.attempted} exited 0`
        : `${observed.attempted} exited ${observed.exitCode ?? "on a signal"} — the run's own verdict is a failure`,
    });
  }
  if (observed.outcome === "deadline-expired") {
    return Object.freeze({
      ...base,
      verdict: null,
      status: 1,
      message: `${observed.attempted} did not finish within its ${observed.deadlineMs}ms deadline and was killed — a run that produced no verdict is a failure, never a pass`,
    });
  }
  return Object.freeze({
    ...base,
    verdict: null,
    status: 1,
    message: `${observed.attempted} could not be started: ${observed.error ?? "the child never ran"} — a run that never began is a failure, never a pass`,
  });
}

// One bounded launch, through the seam that already exists. `launch` is injected — named `launch`
// rather than after any process API on purpose, so the census that refuses a second way to start a
// child has nothing here to catch — and it defaults to `runBounded`. Note what is NOT in the call:
// no shell option, ever, and the deadline is the one the DECLARATION states rather than the seam's
// own default.
export async function launchStep(step, options = {}) {
  const { cwd, env, launch = runBounded } = options;
  const observed = await launch({
    command: step.program,
    args: [...step.args],
    cwd,
    env,
    deadlineMs: step.deadlineMs,
  });
  return toolchainReport(observed);
}

// The test runner, launched over a selection.
export async function launchRunner(toolchain, files, options = {}) {
  return await launchStep(
    {
      program: toolchain.program,
      args: argumentVector(toolchain, files),
      deadlineMs: toolchain.deadlineMs,
    },
    options,
  );
}
