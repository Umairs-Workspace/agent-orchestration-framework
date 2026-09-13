// Behavioural evidence for milestone 72 / story 00 — the declared toolchain.
//
//   tasks/00_the-runner-is-declared-or-there-is-no-run.feature
//   tasks/01_one-bounded-launch-and-a-deadline-is-never-green.feature
//
// The census rows of both features (a planted program name, the shapes that stay admitted, the
// one-reader claim, and the second-way-to-start-a-process detector) are the CONTROL's, and live in
// `test/arch/command/acd-declared-program-single-speller.test.mjs`. What is here is everything that is a
// property of the module's behaviour rather than of the tree.
//
// EVERY ROW DRIVES THE REAL RESOLVER. The filesystem is injected (`isFile`) and the platform is
// injected (`platform`) — not to simulate the module, but so the win32 rows and the POSIX rows
// both run wherever CI happens to be sitting. The one seam that is stubbed is `runBounded`, and it
// is stubbed as a SPY: half of these scenarios assert that nothing was launched at all, which is a
// claim no real child could make.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_REPORT_FORMAT,
  FILE_TOKEN,
  TEST_RUNNER_DECLARATION_INVALID,
  TEST_RUNNER_UNDECLARED,
  TEST_RUNNER_UNRESOLVABLE,
  TOOLCHAIN_CONFIG_KEYS,
  WORKTREE_PREPARE_DECLARATION_INVALID,
  WORKTREE_PREPARE_UNRESOLVABLE,
  argumentVector,
  launchRunner,
  resolveProgram,
  resolveTestToolchain,
  resolveWorktreePrepare,
  selectionArgs,
  toolchainReport,
} from "../../src/work/toolchain.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

// A launch spy standing in for `runBounded`. It records what it was handed and answers with the
// seam's own frozen envelope shape, so a mapping row reads exactly what a real child would produce.
function launchSpy(answer = {}) {
  const calls = [];
  const launch = async (call) => {
    calls.push(call);
    return Object.freeze({
      outcome: "exited",
      command: call.command,
      args: call.args,
      attempted: [call.command, ...call.args].join(" "),
      deadlineMs: call.deadlineMs,
      exitCode: 0,
      signal: null,
      stdout: "",
      stderr: "",
      error: null,
      ...answer,
    });
  };
  return { calls, launch };
}

// A filesystem of exactly the paths named, so "resolves nowhere" is a fact about the declaration
// rather than about the machine the suite is running on.
const filesystem = (...present) => {
  const set = new Set(present);
  return (candidate) => set.has(candidate);
};

const declaration = (overrides = {}) => ({
  command: "runner",
  args: [],
  selectArgs: [],
  roots: ["test"],
  deadlineMs: 1000,
  ...overrides,
});

const prepareDeclaration = (overrides = {}) => ({
  command: "runner",
  args: [],
  deadlineMs: 1000,
  ...overrides,
});

// `runner` on a single POSIX PATH entry, which is the shape most refusal rows want in the
// background: present, resolvable, and beside the point.
const resolvable = {
  env: { PATH: "/usr/bin" },
  platform: "linux",
  projectRoot: "/project",
  isFile: filesystem(path.posix.join("/usr/bin", "runner")),
};

export const workToolchainDeclarationTests = [
  // ── tasks/00 · a declared runner resolves to a program that exists, before anything is launched
  {
    name: "72/00 task00: a declared runner resolves to a program that EXISTS, in every form a command may take, and nothing is launched to find out",
    run: async () => {
      const bare = path.posix.join("/usr/bin", "runner");
      const extended = path.win32.join("C:\\tools", "runner.EXE");
      const absolute = path.posix.join("/", "opt", "runner");
      const relative = path.posix.resolve("/project", "tools/runner");

      const rows = [
        {
          declared: "a bare name found on a PATH entry",
          command: "runner",
          options: { env: { PATH: "/usr/bin:/bin" }, platform: "linux", projectRoot: "/project", isFile: filesystem(bare) },
          resolved: bare,
        },
        {
          declared: "a bare name whose executable carries a platform extension",
          command: "runner",
          // The bare candidate is ALSO present on disk here, and must not win: on win32 an
          // extensionless file is a POSIX shell script the operating system cannot execute, which
          // is why the lookup never offers it.
          options: {
            env: { PATH: "C:\\tools", PATHEXT: ".COM;.EXE;.BAT;.CMD" },
            platform: "win32",
            projectRoot: "C:\\project",
            isFile: filesystem(extended, path.win32.join("C:\\tools", "runner")),
          },
          resolved: extended,
        },
        {
          declared: "an absolute path to an existing program",
          command: absolute,
          options: { env: { PATH: "" }, platform: "linux", projectRoot: "/project", isFile: filesystem(absolute) },
          resolved: absolute,
        },
        {
          declared: "a path relative to the project root",
          command: "tools/runner",
          options: { env: { PATH: "" }, platform: "linux", projectRoot: "/project", isFile: filesystem(relative) },
          resolved: relative,
        },
      ];

      for (const row of rows) {
        const { calls } = launchSpy();
        const result = resolveTestToolchain(
          { work: { test: declaration({ command: row.command, args: ["--reporter", "tap"], selectArgs: ["{file}"] }) } },
          row.options,
        );
        assert.equal(result.ok, true, `${row.declared}: the declaration compiles — ${result.message ?? ""}`);
        assert.equal(result.toolchain.program, row.resolved, `${row.declared}: the resolved program is the file that exists`);
        assert.notEqual(result.toolchain.program, "runner", `${row.declared}: and it is a path, never the bare name`);
        assert.equal(row.options.isFile(result.toolchain.program), true, `${row.declared}: the resolved program is a path that exists`);
        // …and the toolchain carries all four things the runner will be launched with.
        assert.deepEqual([...result.toolchain.args], ["--reporter", "tap"], `${row.declared}: the invariant argument prefix`);
        assert.deepEqual([...result.toolchain.selectArgs], [FILE_TOKEN], `${row.declared}: the selection template`);
        assert.equal(result.toolchain.deadlineMs, 1000, `${row.declared}: the deadline`);
        assert.equal(result.toolchain.command, row.command, `${row.declared}: the command as declared is kept, because a refusal has to name it`);
        assert.equal(calls.length, 0, `${row.declared}: the bounded spawn seam was not called — resolution happens in FRONT of the door`);
      }
    },
  },

  {
    name: "72/00 task00: the shapes a declaration fails in — absence names the KEY, a bad field names the FIELD, and an unresolvable command names the COMMAND; none of them launches anything and none substitutes a program",
    run: async () => {
      const rows = [
        // Absence — the code is test-runner-undeclared and the answer names the key.
        { shape: "is empty", config: {}, code: TEST_RUNNER_UNDECLARED, names: "work.test" },
        { shape: "holds a work section with no test declaration", config: { work: {} }, code: TEST_RUNNER_UNDECLARED, names: "work.test" },
        { shape: "declares work.test as null", config: { work: { test: null } }, code: TEST_RUNNER_UNDECLARED, names: "work.test" },
        { shape: "declares work.test as a string rather than an object", config: { work: { test: "runner" } }, code: TEST_RUNNER_UNDECLARED, names: "work.test" },

        // Declared but not usable — ONE code of its own, and the message names the field.
        { shape: "declares work.test with no command", config: { work: { test: declaration({ command: undefined }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.command" },
        { shape: "declares a command that is not a string", config: { work: { test: declaration({ command: 5 }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.command" },
        { shape: "declares a command that is the empty string", config: { work: { test: declaration({ command: "" }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.command" },
        { shape: "declares args that are not an array", config: { work: { test: declaration({ args: "--reporter tap" }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.args" },
        { shape: "declares args holding an element that is not a string", config: { work: { test: declaration({ args: ["--reporter", 7] }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.args" },
        { shape: "declares selectArgs that are not an array", config: { work: { test: declaration({ selectArgs: "{file}" }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.selectArgs" },
        { shape: "declares no deadlineMs", config: { work: { test: declaration({ deadlineMs: undefined }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.deadlineMs" },
        { shape: "declares deadlineMs as 0", config: { work: { test: declaration({ deadlineMs: 0 }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.deadlineMs" },
        { shape: "declares deadlineMs as -1", config: { work: { test: declaration({ deadlineMs: -1 }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.deadlineMs" },
        { shape: 'declares deadlineMs as the string "900000"', config: { work: { test: declaration({ deadlineMs: "900000" }) } }, code: TEST_RUNNER_DECLARATION_INVALID, names: "work.test.deadlineMs" },

        // The OTHER declaration this module compiles — absence is silent (below), faults are not.
        { shape: "declares work.worktree.prepare with no command", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ command: undefined }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.command" },
        { shape: "declares a prepare command that is not a string", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ command: 5 }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.command" },
        { shape: "declares prepare args that are not an array", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ args: "ci" }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.args" },
        { shape: "declares no deadlineMs on the prepare step", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ deadlineMs: undefined }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.deadlineMs" },
        { shape: "declares the prepare deadlineMs as 0", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ deadlineMs: 0 }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.deadlineMs" },
        { shape: "declares the prepare deadlineMs as -1", prepare: true, config: { work: { worktree: { prepare: prepareDeclaration({ deadlineMs: -1 }) } } }, code: WORKTREE_PREPARE_DECLARATION_INVALID, names: "work.worktree.prepare.deadlineMs" },

        // Well-formed and resolving to nothing — a THIRD code, for the case the seam's door would
        // have met as a missing file, far from its cause. Each row names the command as declared.
        {
          shape: "declares a command that is on no PATH entry and at no path",
          config: { work: { test: declaration({ command: "a-program-on-no-path-entry" }) } },
          options: { env: { PATH: "/usr/bin" }, platform: "linux", projectRoot: repoRoot, isFile: filesystem() },
          code: TEST_RUNNER_UNRESOLVABLE,
          names: "a-program-on-no-path-entry",
        },
        {
          // A REAL directory, read with the REAL stat: a directory exists, and an `exists` check
          // would have admitted it. `isFile` is the reason this row is a refusal.
          shape: "declares a command naming a directory rather than a file",
          config: { work: { test: declaration({ command: "./src" }) } },
          options: { projectRoot: repoRoot },
          code: TEST_RUNNER_UNRESOLVABLE,
          names: "./src",
        },
        {
          shape: "declares a relative command that does not exist under the project root",
          config: { work: { test: declaration({ command: "./tools/no-such-runner" }) } },
          options: { projectRoot: repoRoot },
          code: TEST_RUNNER_UNRESOLVABLE,
          names: "./tools/no-such-runner",
        },
      ];

      for (const row of rows) {
        const { calls, launch } = launchSpy();
        const options = { ...(row.options ?? resolvable), launch };
        const result = row.prepare ? resolveWorktreePrepare(row.config, options) : resolveTestToolchain(row.config, options);
        assert.equal(result.ok, false, `a configuration that ${row.shape} is a refusal`);
        assert.equal(result.code, row.code, `a configuration that ${row.shape}: the code`);
        assert.ok(result.message.includes(row.names), `a configuration that ${row.shape}: the refusal names ${row.names} — got ${result.message}`);
        assert.equal(calls.length, 0, `a configuration that ${row.shape}: the bounded spawn seam was not called`);
        assert.equal(result.toolchain, undefined, `a configuration that ${row.shape}: no program is substituted for the one that was not declared`);
        assert.equal(result.program, undefined, `a configuration that ${row.shape}: …and none is carried on the refusal either`);
      }
    },
  },

  {
    name: "72/00 task00: the two declarations this module compiles differ in ABSENCE and agree in FAULT",
    run: async () => {
      const { calls, launch } = launchSpy();
      const options = { ...resolvable, launch };

      const empty = {};
      const runner = resolveTestToolchain(empty, options);
      const prepare = resolveWorktreePrepare(empty, options);
      assert.equal(runner.ok, false, "the absent test runner is a coded refusal…");
      assert.equal(runner.code, TEST_RUNNER_UNDECLARED, "…naming its key");
      assert.ok(runner.message.includes("work.test"), "…and the key is in the message");
      assert.equal(prepare.ok, true, "the absent prepare step is no refusal at all");
      assert.equal(prepare.prepare, null, "…it is simply no step");
      assert.equal(prepare.code, undefined, "…and no warning rides on it either");
      assert.equal(calls.length, 0, "nothing is launched for either");

      const faulty = resolveWorktreePrepare({ work: { worktree: { prepare: prepareDeclaration({ command: undefined }) } } }, options);
      assert.equal(faulty.ok, false, "a prepare step that is present and does not compile is a coded refusal…");
      assert.equal(faulty.code, WORKTREE_PREPARE_DECLARATION_INVALID, "…raised where the declaration is compiled, not at the launch");
      assert.notEqual(faulty.ok, prepare.ok, "and that refusal is told apart from the prepare step being absent");
      assert.equal(calls.length, 0, "and still nothing is launched");

      // The prepare step's own unresolvable answer is a THIRD thing again: it compiled, and the
      // program is not there. ADR-007 §5 puts that refusal here, at compile time, not at the door.
      const unresolvable = resolveWorktreePrepare(
        { work: { worktree: { prepare: prepareDeclaration({ command: "a-program-on-no-path-entry" }) } } },
        { ...options, isFile: filesystem() },
      );
      assert.equal(unresolvable.code, WORKTREE_PREPARE_UNRESOLVABLE, "a prepare command that resolves nowhere has its own code");
      assert.notEqual(unresolvable.code, faulty.code, "…distinct from a field fault in the same declaration");
    },
  },

  {
    name: "72/00 task00: the three refusals are three different answers, and every field fault within one declaration shares the one code",
    run: async () => {
      const nothing = resolveTestToolchain({}, resolvable);
      const noCommand = resolveTestToolchain({ work: { test: declaration({ command: undefined }) } }, resolvable);
      const nowhere = resolveTestToolchain(
        { work: { test: declaration({ command: "a-program-on-no-path-entry" }) } },
        { ...resolvable, isFile: filesystem() },
      );

      const codes = [nothing.code, noCommand.code, nowhere.code];
      for (const code of codes) assert.equal(typeof code, "string", "each carries a code");
      assert.equal(new Set(codes).size, 3, `no two of the three codes are the same: ${codes.join(", ")}`);
      assert.equal(nothing.code, "test-runner-undeclared", "the code for nothing declared is test-runner-undeclared");

      // Every field fault within ONE declaration shares the one code, separated by the field its
      // message names — three repairs need three codes; twelve fields do not need twelve.
      const faults = [
        ["work.test.command", declaration({ command: "" })],
        ["work.test.args", declaration({ args: 7 })],
        ["work.test.selectArgs", declaration({ selectArgs: 7 })],
        ["work.test.roots", declaration({ roots: 7 })],
        ["work.test.report", declaration({ report: { format: "junit" } })],
        ["work.test.deadlineMs", declaration({ deadlineMs: 0 })],
      ];
      const seen = new Set();
      for (const [field, test] of faults) {
        const result = resolveTestToolchain({ work: { test } }, resolvable);
        assert.equal(result.code, TEST_RUNNER_DECLARATION_INVALID, `${field}: one code for the whole declaration`);
        assert.equal(result.key, field, `${field}: separated by the field the refusal names`);
        assert.ok(result.message.includes(field), `${field}: and the message names it too`);
        seen.add(result.key);
      }
      assert.equal(seen.size, faults.length, "each field fault is reported against its own field");
    },
  },

  {
    name: "72/00 task00: an unknown report format is a refusal rather than a silent fall-through, and an absent one defaults to tap",
    run: async () => {
      const absent = resolveTestToolchain({ work: { test: declaration() } }, resolvable);
      assert.equal(absent.ok, true, "no report block is legal");
      assert.equal(absent.toolchain.report.format, DEFAULT_REPORT_FORMAT, "…and defaults to tap");

      const declared = resolveTestToolchain({ work: { test: declaration({ report: { format: "tap" } }) } }, resolvable);
      assert.equal(declared.toolchain.report.format, "tap", "a declared known format is carried");

      const unknown = resolveTestToolchain({ work: { test: declaration({ report: { format: "junit" } }) } }, resolvable);
      assert.equal(unknown.ok, false, "an unknown format is a refusal — a failures-only report has to know which lines are failures");
      assert.equal(unknown.code, TEST_RUNNER_DECLARATION_INVALID, "…and it is a declaration fault");
    },
  },

  {
    name: "72/00 task00: this repository's own declaration compiles against its own config file, and the keys it owns are declared as data",
    run: async () => {
      // aof is just another installed project, and the dogfooding is the point: if this repo's own
      // `work.test` did not compile, the boundary would be one nobody had ever crossed.
      const { readFile } = await import("node:fs/promises");
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      const result = resolveTestToolchain(config, { projectRoot: repoRoot });
      assert.equal(result.ok, true, `this repo's own work.test compiles — ${result.message ?? ""}`);
      assert.equal(result.toolchain.args.includes("scripts/test.mjs"), true, "…and it names this repo's runner script as an argument, never as the program");
      assert.equal(result.toolchain.selectArgs.some((entry) => entry.includes(FILE_TOKEN)), true, "…with a selection template carrying the file token");
      assert.equal(result.toolchain.deadlineMs > 0, true, "…and a deadline it chose for itself");

      // The keys are spelled once, as data. FF-7201 censuses `src/` against this list.
      for (const key of ["work.test.command", "work.test.args", "work.test.selectArgs", "work.test.roots", "work.test.deadlineMs", "work.worktree.prepare"]) {
        assert.ok(TOOLCHAIN_CONFIG_KEYS.includes(key), `${key} is one of the keys this module declares it owns`);
      }
    },
  },

  // ── tasks/01 · one bounded launch, one expansion rule, and a run that produced no verdict
  {
    name: "72/00 task01: the launch goes through the one bounded seam, with an argument vector, no shell, and the DECLARATION's deadline",
    run: async () => {
      const { calls, launch } = launchSpy();
      const compiled = resolveTestToolchain(
        { work: { test: declaration({ args: ["--reporter", "a reporter with spaces"], selectArgs: ["{file}"], deadlineMs: 900000 }) } },
        resolvable,
      );
      assert.equal(compiled.ok, true, "the toolchain compiles");

      await launchRunner(compiled.toolchain, ["a suite.test.mjs"], { launch, cwd: "/project" });

      assert.equal(calls.length, 1, "the launch went through the shared bounded spawn seam, exactly once");
      const call = calls[0];
      assert.equal(call.command, compiled.toolchain.program, "the program reached the seam as the command");
      assert.deepEqual(call.args, ["--reporter", "a reporter with spaces", "a suite.test.mjs"], "each argument reached the seam as a separate element of one vector");
      assert.equal(call.args[1], "a reporter with spaces", "the argument containing a space arrived as a single element, unsplit and unquoted");
      assert.equal(Object.prototype.hasOwnProperty.call(call, "shell"), false, "no shell option was passed to the seam");
      assert.equal(call.deadlineMs, 900000, "the deadline handed to the seam is the one the declaration states, not the seam's own default");
      assert.notEqual(call.deadlineMs, 60_000, "…and 60_000 is the seam's default, which is what a silent fallback would have handed it");
    },
  },

  {
    name: "72/00 task01: the selection template expands once per selected file, in place, and nothing else expands",
    run: async () => {
      const rows = [
        // A positional runner — the template is the token alone.
        { template: ["{file}"], files: [], vector: [] },
        { template: ["{file}"], files: ["a.test.mjs"], vector: ["a.test.mjs"] },
        { template: ["{file}"], files: ["a", "b", "c"], vector: ["a", "b", "c"] },
        { template: ["{file}"], files: ["a suite.test.mjs"], vector: ["a suite.test.mjs"] },
        // A flag runner — the flag is stated once and the token expands beside it. Zero files is
        // the row that catches a dangling flag.
        { template: ["--only", "{file}"], files: [], vector: [] },
        { template: ["--only", "{file}"], files: ["a.test.mjs"], vector: ["--only", "a.test.mjs"] },
        { template: ["--only", "{file}"], files: ["a", "b", "c"], vector: ["--only", "a", "b", "c"] },
        // A token that is not the file token is not a placeholder: neither expanded nor dropped.
        { template: ["{root}"], files: ["a.test.mjs"], vector: ["{root}"] },
        { template: ["--only", "{file}", "{suite}"], files: ["a.test.mjs"], vector: ["--only", "a.test.mjs", "{suite}"] },
        { template: ["{files}"], files: ["a", "b", "c"], vector: ["{files}"] },
        { template: ["{root}"], files: [], vector: [] },
      ];

      for (const row of rows) {
        const label = `${JSON.stringify(row.template)} over ${row.files.length} file(s)`;
        const vector = [...selectionArgs(row.template, row.files)];
        assert.deepEqual(vector, row.vector, label);
        assert.equal(vector.some((element) => element === ""), false, `${label}: no element of the vector is an empty string`);
        // No flag is left standing without the operand it introduces: a template whose only
        // operand is the file token contributes nothing at all when nothing was selected.
        if (row.files.length === 0) assert.deepEqual(vector, [], `${label}: the whole template collapses, so no flag dangles`);
      }

      // …and the template is NOT repeated per file, which is the reading that would make the
      // invariant prefix and the selection indistinguishable in the assembled argv.
      assert.deepEqual(
        [...selectionArgs(["--only", "{file}"], ["a", "b", "c"])],
        ["--only", "a", "b", "c"],
        "three files compose one flag and three operands, never three flag/operand pairs",
      );
    },
  },

  {
    name: "72/00 task01: what the seam OBSERVED decides what is reported and what the status is — a run that finished no suite is never a passing one",
    run: async () => {
      const rows = [
        { outcome: "exited", exitCode: 0, verdict: "passed", status: 0, reported: "the run's own verdict, a pass" },
        { outcome: "exited", exitCode: 1, verdict: "failed", status: 1, reported: "the run's own verdict, a failure carrying the code observed" },
        { outcome: "deadline-expired", exitCode: null, verdict: null, status: 1, reported: "the deadline expiry named as itself, with the bound applied" },
        { outcome: "not-started", exitCode: null, verdict: null, status: 1, reported: "the failure to start named as itself, with what was attempted" },
      ];

      const compiled = resolveTestToolchain({ work: { test: declaration({ selectArgs: ["{file}"], deadlineMs: 900000 }) } }, resolvable);

      for (const row of rows) {
        const { launch } = launchSpy({
          outcome: row.outcome,
          exitCode: row.exitCode,
          error: row.outcome === "exited" ? null : "the reason the seam gave",
        });
        const report = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch });

        assert.equal(report.outcome, row.outcome, `${row.reported}: the outcome is the seam's own`);
        assert.equal(report.verdict, row.verdict, `${row.reported}: the verdict`);
        assert.equal(report.status, row.status, `${row.reported}: the exit status`);
        // A run that finished no suite is never reported as a passing one: the only row that may
        // carry the pass is the one whose child actually exited 0.
        if (row.verdict !== "passed") assert.notEqual(report.verdict, "passed", `${row.reported}: no verdict is not a green one`);
        if (row.outcome === "exited" && row.exitCode === 0) assert.equal(report.verdict, "passed", "a clean exit IS the pass");
        if (row.outcome === "exited" && row.exitCode !== 0) assert.equal(report.exitCode, row.exitCode, "a failure carries the code observed");
        if (row.outcome === "deadline-expired") assert.ok(report.message.includes("900000"), "the deadline expiry names the bound applied");
        if (row.outcome === "not-started") assert.ok(report.message.includes(report.attempted), "the failure to start names what was attempted");
      }
    },
  },

  {
    name: "72/00 task01: an expiry and a failure to start are not test failures wearing another name",
    run: async () => {
      const compiled = resolveTestToolchain({ work: { test: declaration({ deadlineMs: 900000 }) } }, resolvable);
      const of = async (outcome) => {
        const { launch } = launchSpy({ outcome, exitCode: null, error: "the reason the seam gave" });
        return await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch });
      };
      const { launch: failedLaunch } = launchSpy({ outcome: "exited", exitCode: 1 });
      const failed = await launchRunner(compiled.toolchain, ["a.test.mjs"], { launch: failedLaunch });

      const expired = await of("deadline-expired");
      const unstarted = await of("not-started");

      for (const [label, report] of [["the expiry", expired], ["the failure to start", unstarted]]) {
        assert.equal(report.verdict, null, `${label} is not reported as a test failure`);
        assert.notEqual(report.verdict, "passed", `${label} is not reported as a pass`);
        assert.equal(report.status, 1, `${label} exits non-zero`);
      }
      assert.notEqual(expired.outcome, unstarted.outcome, "each is distinguishable from the other");
      assert.notEqual(expired.outcome, failed.outcome, "…and from a run that exited non-zero");
      assert.notEqual(unstarted.outcome, failed.outcome, "…both ways");
      assert.equal(failed.verdict, "failed", "the run that exited non-zero is the only one of the three carrying a verdict");
    },
  },

  {
    name: "72/00 task01: the argument vector is the invariant prefix then the selection, and the mapping is pure over the seam's envelope",
    run: async () => {
      const compiled = resolveTestToolchain(
        { work: { test: declaration({ args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"] }) } },
        resolvable,
      );
      assert.deepEqual([...argumentVector(compiled.toolchain, ["a", "b"])], ["scripts/test.mjs", "--only", "a", "b"], "prefix, then selection");
      assert.deepEqual([...argumentVector(compiled.toolchain, [])], ["scripts/test.mjs"], "…and with nothing selected, the prefix alone");

      // PURE: the mapping is a function of what the seam handed back and of nothing else, so two
      // calls over the same envelope in one process answer identically.
      const envelope = Object.freeze({ outcome: "exited", command: "r", args: [], attempted: "r", deadlineMs: 5, exitCode: 3, stdout: "", stderr: "", error: null });
      assert.deepEqual(toolchainReport(envelope), toolchainReport(envelope), "the same envelope maps to the same report");
    },
  },

  {
    name: "72/00 task01: a shim is undeclarable, and the refusal says so rather than leaving the seam to report a failure to start",
    run: async () => {
      // Measured, and the reason four of the five program names FF-7201 freezes cannot be declared
      // on Windows as bare names: Node throws EINVAL on a batch file spawned without a shell, the
      // seam catches it and reports `not-started` — an answer that blames the seam for a
      // declaration nobody could have written. Refusing at compile time names the remedy instead.
      const shim = path.win32.join("C:\\tools", "runner.CMD");
      const { calls, launch } = launchSpy();
      const result = resolveTestToolchain(
        { work: { test: declaration() } },
        {
          env: { PATH: "C:\\tools", PATHEXT: ".COM;.EXE;.BAT;.CMD" },
          platform: "win32",
          projectRoot: "C:\\project",
          isFile: filesystem(shim),
          launch,
        },
      );
      assert.equal(result.ok, false, "a command that resolves only to a shim is a refusal");
      assert.equal(result.code, TEST_RUNNER_UNRESOLVABLE, "…carrying the unresolvable code");
      assert.ok(result.message.includes("runner"), "…naming the command as declared");
      assert.ok(result.message.includes("script"), "…and naming the remedy: an executable plus the script it runs");
      assert.equal(calls.length, 0, "and nothing was launched to discover it");

      // The resolver itself still FINDS the shim — the refusal is a judgement about what was
      // found, not a hole in the lookup, which is what makes the diagnosis accurate.
      assert.equal(
        resolveProgram("runner", { env: { PATH: "C:\\tools", PATHEXT: ".CMD" }, platform: "win32", projectRoot: "C:\\project", isFile: filesystem(shim) }),
        shim,
        "PATHEXT is honoured, so the message can say what it found",
      );
    },
  },
];
