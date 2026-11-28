import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 72 / story 02 — THE TEST COMMAND'S FACE — and for milestone 210 /
// story 04, which replaced its three scope forms with four (named, --suggest, --failed, --all).
//
// One test object per @executable scenario (Scenario-Outline rows folded into one entry), each
// name tracing to its feature and scenario:
//
//   72/02 00 and 01 — what a run prints and exits with; verbose restoring and removing nothing; the
//        two faces rendering from one result; only a whole-tree run standing as a verdict. Their
//        scope-form rows went with the forms (210/ADR-008).
//   72/02 02 — the runner's selection argv, unchanged.
//   210/04 00_named-runs, 01_whole-tree-outside-story-work, 02_old-selection-removed.
//
// FEATURE 01's REMAINING SCENARIOS LIVE IN FF-7204 (`test/arch/acd-test-command-reports-not-
// decides.test.mjs`), and deliberately so rather than by omission: the door census, the planted
// invocation, the per-module FRESH-PROCESS probe, the in-suite-cannot-see-this pair and the
// session-launch-read-from-the-registry rows ARE that control's clauses, stated in its row
// verbatim. Driving them twice would spawn ten child processes twice over to prove one thing.
//
// ── THE COST OF THIS FILE IS REAL AND IT IS PRICED (72/ADR-004 §6) ───────────────────────────
//
// Five rows below drive a CHILD `node scripts/test.mjs …`, and each pays this repository's runner
// boot — ~3.4 s warm, because §1 forbids restructuring the 948 static suite imports. That is the
// cost ADR-004 §6 ruled on and routed to TECH_DEBT item 86; it is paid here rather than avoided,
// because the rows it buys are the ones a pure test cannot reach: an exit STATUS, a per-test
// global home OBSERVED from inside a running test, and an importer whose argv holds a selection.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runBounded } from "@aof/execution/bounded-process";
import { createTestRecord } from "@aof/work/testing/record";
import { testLayoutChecks } from "@aof/work/testing/layout";
import { isSuiteFile } from "@aof/work/testing/suites";

// A value embedded as a string literal in generated JavaScript: JSON.stringify, plus the characters JSON
// leaves raw that still mean something in a script context (`<`, `>`, `/`, U+2028, U+2029) as \uXXXX.
function jsLiteral(value) {
  return JSON.stringify(value).replace(/[<>/\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

// The story's own subject, and its two faces — taken from the REGISTERED command object rather
// than from a private helper, so what these rows measure is what the runtime runs.
const { ALL_IN_STORY_WORK, FORM_CONFLICT, FORM_MISSING, NOT_A_SUITE, REASON_MISSING, runTest, storyWorkOf } = _aofApplication.work.commandTools.test;
const { resolveTestGate, resolveTestToolchain } = _aofApplication.work.toolchain;
const parseSpecArgv = _aofApplication.cli.parseSpecArgv;
const testCommand = _aofApplication.getCommand("test");
const records = createTestRecord({ runBounded });
// The runner's own selection half, exported so its shape rows drive in-process. Importing the
// runner from inside the suite is FREE in both paths that matter: under the full run and under
// `--only`, this module is the entry point and is already evaluated, so the import resolves from
// the module cache rather than re-assembling anything.
// NOTE THE CYCLE, AND WHY IT IS SAFE. `scripts/test.mjs` imports THIS file (its registration
// block) and this file imports it back. Under ESM the runner's `export function` declarations are
// initialised at INSTANTIATION, so they are live bindings here; its `export const ONLY_FLAG` is in
// its temporal dead zone while this module's own top level runs. So the sentinel is spelled
// literally at module scope below and the imported one is asserted equal to it INSIDE a test body,
// where the dead zone is long over — which keeps the binding checked without a load-order trap.
import { ONLY_FLAG as RUNNER_ONLY_FLAG, loadSelected, runnerShapedExports, selectionArgv } from "../../scripts/test.mjs";
// The control this story RE-DERIVES a pin in (72/ADR-004 §5). The scenario "the control that
// freezes the runner outside its registration blocks is green" is that control run against the
// runner as this story leaves it — so it is run, not restated.
import { archTests as loopSuiteRegistrationTests } from "../arch/loop/acd-loop-suite-registration.test.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const runnerPath = path.join(repoRoot, "scripts", "test.mjs");

// The selection sentinel, spelled here for the load-order reason above and pinned to the runner's
// own export in the first row that runs.
const ONLY_FLAG = "--only";

// ── THE SEAMS, STUBBED ───────────────────────────────────────────────────────────────────────
//
// Every impure edge of `runTest` is injected, so the whole of feature 00 and the gate rows drive
// with no repository, no graph and no child process — against the SAME code path production runs.

const WHOLE = Object.freeze(["test/a.test.mjs", "test/b.test.mjs", "test/c.test.mjs"]);

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze([ONLY_FLAG, "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});

// The seam's own envelope as `launchRunner` hands it back: the three outcomes, the two streams,
// and the verdict/status mapping a run that produced NO verdict already carries.
function observed({ stdout = "", stderr = "", exitCode = 0, outcome = "exited" } = {}) {
  const status = outcome === "exited" && exitCode === 0 ? 0 : 1;
  return {
    outcome,
    command: "/usr/bin/node",
    args: ["scripts/test.mjs"],
    attempted: "/usr/bin/node scripts/test.mjs",
    deadlineMs: 900_000,
    exitCode: outcome === "exited" ? exitCode : null,
    stdout,
    stderr,
    verdict: outcome === "exited" ? (exitCode === 0 ? "passed" : "failed") : null,
    status,
    message: outcome === "exited" ? "the run's own verdict" : `${outcome} — a run that produced no verdict is a failure`,
  };
}

// This repository's runner writes `ok - <name>` to STDOUT and `not ok - <name>` plus the stack to
// STDERR, which is why the filter reads both. The fixtures below are built with that split so a
// stdout-only reader would measure "no failures" over every red row.
function streams(passing, failing) {
  const stdout = ["# unit", ...passing.map((name) => `ok - ${name}`)].join("\n");
  const stderr = failing.flatMap((name) => [`not ok - ${name}`, `AssertionError: ${name} blew up`, `    at ${name} (test/x.test.mjs:1:1)`]).join("\n");
  return { stdout, stderr, exitCode: failing.length > 0 ? 1 : 0 };
}

// A stub that RECORDS what the runner was asked to run — the row's own subject, since "what is
// selected" and "what the runner is handed" are two different claims and the widened case is
// exactly where they part company.
function launcher(output = observed()) {
  const handed = [];
  const run = async (toolchain, files) => {
    handed.push([...files]);
    return output;
  };
  return { run, handed };
}

const walk = async (_root, root) => (root === "test" ? [...WHOLE] : []);
const resolveToolchain = () => TOOLCHAIN;
const neverRead = async () => { throw new Error("the changed set must not be read for this form"); };

// A story run in this checkout, as the story-work check answers it.
const storyRunning = (ref) => async () => Object.freeze({ ref });

// ── A TEMPORARY REPOSITORY, FOR THE ROWS ABOUT RECORDS AND THE WORKING TREE ─────────────────────

async function git(cwd, args) {
  const out = await runBounded({ command: "git", args, cwd, deadlineMs: 60_000 });
  assert.equal(out.exitCode, 0, `git ${args.join(" ")} failed: ${out.stderr}`);
  return String(out.stdout).trim();
}

// test/a imports src/record.mjs and test/b names its path: the two ways a suite is reached.
const SUGGEST_FILES = Object.freeze({
  "src/record.mjs": "export const record = 1;\n",
  "test/a.test.mjs": 'import { record } from "../src/record.mjs";\nexport const tests = [record];\n',
  "test/b.test.mjs": 'export const tests = [];\n// reads "src/record.mjs" as text\n',
});

async function withRepo(body, files = {}) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-210-04-"));
  try {
    await git(root, ["init", "-q"]);
    const seeded = { "src/a.mjs": "export const a = 1;\n", "test/a.test.mjs": "export const tests = [];\n", "test/b.test.mjs": "export const tests = [];\n", ...files };
    for (const [rel, text] of Object.entries(seeded)) {
      await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await writeFile(path.join(root, rel), text, "utf8");
    }
    await git(root, ["add", "-A"]);
    await git(root, ["-c", "user.email=aof@example.invalid", "-c", "user.name=aof", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed"]);
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function storedRecords(root) {
  const store = path.join(await git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), "aof", "test-records");
  if (!existsSync(store)) return [];
  const names = (await readdir(store)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => JSON.parse(await readFile(path.join(store, name), "utf8"))));
}

// Every AOF_* variable named anywhere in this codebase's sources: the override row sets them all.
async function aofEnvironmentNames() {
  const out = await runBounded({ command: "git", args: ["grep", "-ohE", "AOF_[A-Z0-9_]+", "--", ":(glob)packages/*/src/**", ":(glob)apps/*/src/**", "scripts"], cwd: repoRoot, deadlineMs: 60_000 });
  return [...new Set(String(out.stdout).split(/\r?\n/u).filter(Boolean))].sort();
}

// ── THE CHILD-DRIVEN HALF ────────────────────────────────────────────────────────────────────

// A fixture suite that RECORDS the global home each of its tests ran under, from inside the test.
// The `exit` row is registered at module scope, so it fires after the runner has restored the
// ambient value — which is the only vantage point from which "the ambient global home is what it
// was before the run" is observable at all.
function probeSuiteSource(id) {
  return `import { appendFileSync, existsSync, readdirSync } from "node:fs";
const sink = process.env.SELECTION_PROBE_SINK ?? null;
// GUARDED, because the shape rows import this fixture IN-PROCESS with no sink set — and an exit
// handler that threw there would take the whole suite down after every row had already passed.
const record = (row) => { if (sink != null) appendFileSync(sink, \`\${JSON.stringify(row)}\\n\`); };
const observe = (name) => {
  const home = process.env.AOF_GLOBAL_HOME ?? null;
  const there = home != null && existsSync(home);
  record({ phase: "test", suite: ${jsLiteral(id)}, name, home, entries: there ? readdirSync(home).length : 0 });
};
process.on("exit", () => record({ phase: "exit", suite: ${jsLiteral(id)}, home: process.env.AOF_GLOBAL_HOME ?? null }));
export const probeTests = [
  { name: ${jsLiteral(`${id} one`)}, run: () => observe(${jsLiteral(`${id} one`)}) },
  { name: ${jsLiteral(`${id} two`)}, run: () => observe(${jsLiteral(`${id} two`)}) },
];
`;
}

const FAILING_SUITE = `export const probeTests = [
  { name: "selection-probe failing one", run: () => { throw new Error("deliberate failure"); } },
];
`;

// Runner-shaped is an ARRAY OF { name, run }, and neither of these is one: a bare object is not an
// array, and an empty array registers nothing. A file exporting only these contributes zero tests,
// which must be reported as unusable rather than passing silently.
const UNRUNNABLE_SUITE = `export const notATest = { name: "looks like a test", run: () => {} };
export const empty = [];
`;

async function scratch() {
  return await mkdtemp(path.join(os.tmpdir(), "aof-72-02-"));
}

// One bounded child, through the ONE seam, with an isolated global home of its own. The deadline
// is generous because the child pays this repository's own 3.4–6.5 s runner boot before it reaches
// the first assertion (72/ADR-004 §6).
async function runner(args, { sink = null, home } = {}) {
  return await runBounded({
    command: process.execPath,
    args: [runnerPath, ...args],
    cwd: repoRoot,
    deadlineMs: 240_000,
    env: { ...process.env, AOF_GLOBAL_HOME: home, ...(sink == null ? {} : { SELECTION_PROBE_SINK: sink }) },
  });
}

const okRows = (text) => String(text).split(/\r?\n/).filter((line) => line.startsWith("ok - ")).map((line) => line.slice(5));

// ── THE PURE HALVES OF FEATURE 02 ────────────────────────────────────────────────────────────

// A runner FIXTURE, deliberately not this repository's runner: the live array is appended to by
// four sibling stories and none of the five is its sole writer, so a pin against it reds on work
// this scenario is not about. Everything the comparison needs is here, in forty lines.
const RUNNER_FIXTURE = `import path from "node:path";
import { pathToFileURL } from "node:url";
import { alphaTests } from "../test/alpha.test.mjs";
import { betaTests } from "../test/beta.test.mjs";

export const tests = [
  ...alphaTests,
  ...betaTests
];

async function runSuite() {
  let failures = 0;
  console.log("# unit");
  for (const { name, run } of tests) {
    try {
      await run();
      console.log(\`ok - \${name}\`);
    } catch (error) {
      failures += 1;
      console.error(\`not ok - \${name}\`);
    }
  }
  console.log("# integration");
  if (failures > 0) process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  runSuite();
}
`;

// PURE — the ordered rows between the exported array's brackets, as TEXT. Text rather than parsed
// identifiers because a trailing comma added to the terminal row is one of the mutations that must
// be caught, and a parse would erase it.
function registrationRows(source) {
  const lines = String(source).replace(/\r\n/gu, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === "export const tests = [");
  const end = lines.findIndex((line, index) => index > start && line.trim() === "];");
  if (start < 0 || end < 0) return null;
  return lines.slice(start + 1, end);
}

// This story's own transform, applied to the fixture: an argv reader appended, and ONE execution
// loop parameterised in place. Neither touches a row between the brackets — which is the claim.
function applyStoryTransform(source) {
  return source
    .replace("async function runSuite() {", "async function runSuite(tests, { lanes = true } = {}) {")
    .replace('  console.log("# integration");', "  if (!lanes) return failures;\n\n  console.log(\"# integration\");")
    .replace("  runSuite();", "  const only = selectionArgv(process.argv.slice(2));\n  if (only == null) runSuite(tests);\n  else runSelection(only);")
    + "\nexport function selectionArgv(argv) {\n  const at = argv.indexOf(\"--only\");\n  return at < 0 ? null : argv.slice(at + 1);\n}\n";
}

export const testCommandContractTests = [
  // ── 72/02 task 00, as 210/04 leaves it: what a run prints, and its two faces ─────────────────
  {
    name: "72/02 task 00 (aof test): what a run prints, and what it exits with — failures only, one summary line, both faces",
    async run() {
      const mixes = {
        "every test passes": streams(["alpha", "beta"], []),
        "some tests fail": streams(["alpha"], ["beta"]),
        "every test fails": streams([], ["alpha", "beta"]),
      };
      const expectations = [
        { mix: "every test passes", verbose: false, passing: 0, failing: 0, status: 0 },
        { mix: "every test passes", verbose: true, passing: 2, failing: 0, status: 0 },
        { mix: "some tests fail", verbose: false, passing: 0, failing: 1, status: 1 },
        { mix: "some tests fail", verbose: true, passing: 1, failing: 1, status: 1 },
        { mix: "every test fails", verbose: false, passing: 0, failing: 2, status: 1 },
        { mix: "every test fails", verbose: true, passing: 0, failing: 2, status: 1 },
      ];
      for (const row of expectations) {
        const stub = launcher(observed(mixes[row.mix]));
        const result = await runTest({ files: ["test/b.test.mjs", "test/c.test.mjs"], reason: "the mix", verbose: row.verbose }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run });
        const text = testCommand.cli.render(result);
        const lines = text.split("\n");
        const label = `${row.mix} ${row.verbose ? "with --verbose" : "with no option"}`;
        assert.equal(lines.filter((line) => line.startsWith("ok - ")).length, row.passing, `${label}: passing rows`);
        assert.equal(lines.filter((line) => line.startsWith("not ok - ")).length, row.failing, `${label}: failing rows`);
        for (const failure of result.report.failures) assert.ok(text.includes(failure.message), `${label}: each failure carries its assertion output`);
        assert.equal(result.exit, row.status, `${label}: the exit status`);
        const summary = lines.filter((line) => line.startsWith("named · "));
        assert.equal(summary.length, 1, `${label}: exactly one summary line`);
      }
    },
  },
  {
    name: "72/02 task 00 (aof test): verbose restores the passing rows and removes nothing — a containment, never a count",
    async run() {
      const rows = [
        { mix: "every test passes", output: streams(["alpha", "beta"], []), restored: 2 },
        { mix: "some tests fail", output: streams(["alpha"], ["beta"]), restored: 1 },
        { mix: "every test fails", output: streams([], ["alpha", "beta"]), restored: 0 },
      ];
      for (const row of rows) {
        const ask = async (verbose) => testCommand.cli.render(await runTest({ files: ["test/b.test.mjs"], reason: "containment", verbose }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher(observed(row.output)).run }));
        const quiet = await ask(false);
        const loudLines = (await ask(true)).split("\n");
        assert.equal(loudLines.filter((line) => line.startsWith("ok - ")).length, row.restored, `${row.mix}: the passing rows restored`);
        for (const line of quiet.split("\n")) assert.ok(loudLines.includes(line), `${row.mix}: verbose removes nothing — "${line}" is missing from the verbose output`);
      }
    },
  },
  {
    name: "72/02 task 00 (aof test): the human face and the machine face render from ONE result",
    async run() {
      const result = await runTest({ files: ["test/a.test.mjs", "test/b.test.mjs"], reason: "both faces" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher(observed(streams(["alpha"], ["beta"]))).run });
      const text = testCommand.cli.render(result);
      const machine = testCommand.cli.json(result);
      assert.ok(text.includes(machine.form), "the form");
      assert.ok(text.includes(`${machine.selected.length} suites`), "how many suites ran");
      assert.ok(text.includes(machine.reason), "the reason it ran for");
      assert.ok(text.includes(machine.gate ? "may stand as a verdict" : "may not stand as a verdict"), "whether the result may stand as a verdict");
      assert.ok(machine.report.failures.length > 0, "…and the fixture actually failed, so the last field is not vacuous");
      for (const failure of machine.report.failures) assert.ok(text.includes(failure.message), "a failing test's assertion text");
      assert.equal(machine, result, "the machine face IS the result object, not a second assembly of it");
    },
  },
  {
    name: "72/02 task 01 (aof test): only a whole-tree run may stand as a verdict",
    async run() {
      const named = await runTest({ files: ["test/c.test.mjs"], reason: "a subset" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher().run });
      assert.equal(named.gate, false, "a named run is a subset, and may not stand");
      const all = launcher();
      const whole = await runTest({ all: true }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: all.run });
      assert.equal(whole.gate, true, "the whole tree may stand");
      assert.deepEqual([...whole.selected], [...WHOLE], "…over every registered suite");
      assert.deepEqual(all.handed, [[]], "…handed to the runner as no selection at all");
    },
  },

  // ── 210/04 task 00 · a named run runs exactly what it names, and records why ─────────────────
  {
    name: "210/04 E1 · one named suite runs through the light entry, and its reason is recorded",
    run: async () => withRepo(async (root) => {
      const stub = launcher();
      const out = await runTest({ files: ["test/a.test.mjs"], reason: "record.mjs changed" }, { projectRoot: root, config: {}, resolveToolchain, walk, run: stub.run, record: records });
      assert.deepEqual(stub.handed, [["test/a.test.mjs"]], "launched once, with that suite only");
      const [stored] = await storedRecords(root);
      assert.equal(stored.id, out.recorded.id);
      assert.deepEqual({ mode: stored.mode, reason: stored.reason, selected: stored.selected }, { mode: "named", reason: "record.mjs changed", selected: ["test/a.test.mjs"] });
    }),
  },
  {
    name: "210/04 [outline] a named run that cannot be honoured is refused, and runs nothing (7 rows)",
    async run() {
      const rows = [
        { argv: ["test/a.test.mjs"], code: REASON_MISSING, named: ["--reason"] },
        { argv: ["test/a.test.mjs", "--reason", "  "], code: REASON_MISSING, named: ["--reason"] },
        { argv: ["src/record.mjs", "--reason", "probe"], code: NOT_A_SUITE, named: ["src/record.mjs"] },
        { argv: ["test/missing.test.mjs", "--reason", "probe"], code: NOT_A_SUITE, named: ["test/missing.test.mjs"] },
        { argv: ["test/a.test.mjs", "--all", "--reason", "probe"], code: FORM_CONFLICT, named: ["--all"] },
        { argv: ["--suggest", "--failed"], code: FORM_CONFLICT, named: ["--suggest", "--failed"] },
        { argv: [], code: FORM_MISSING, named: ["<suite>… --reason", "--suggest", "--failed", "--all"] },
      ];
      for (const row of rows) {
        const options = parseSpecArgv(row.argv, testCommand.cli.spec, testCommand.id);
        const stub = launcher();
        const out = await runTest(testCommand.cli.argv(options._, options), { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run, readChanged: neverRead, inStoryWork: async () => null });
        assert.equal(out.refusal?.code, row.code, `aof test ${row.argv.join(" ")}`);
        for (const words of row.named) assert.ok(out.refusal.message.includes(words), `…naming ${words}: ${out.refusal.message}`);
        assert.deepEqual(stub.handed, [], "…and no runner is launched");
        assert.equal(out.exit, 1);
      }
    },
  },
  {
    name: "210/04 E4 · three lanes asking the same named run on unchanged content share one launch",
    run: async () => withRepo(async (root) => {
      const handed = [];
      const releases = [];
      const run = (_toolchain, files) => new Promise((resolve) => { handed.push([...files]); releases.push(resolve); });
      const fast = { ...records, acquire: (ledger, selection, options) => records.acquire(ledger, selection, { ...options, pollMs: 10 }) };
      const lanes = ["architect", "qa", "craft"].map((lane) => runTest({ files: ["test/a.test.mjs", "test/b.test.mjs"], reason: `${lane} lane` }, { projectRoot: root, config: {}, resolveToolchain, walk, run, record: fast }));
      for (let tries = 0; handed.length === 0 && tries < 500; tries += 1) await new Promise((resolve) => setTimeout(resolve, 10));
      await new Promise((resolve) => setTimeout(resolve, 150));
      for (const release of releases.splice(0)) release(observed());
      const results = await Promise.all(lanes);
      assert.equal(handed.length, 1, "the runner is launched once");
      const ran = results.find((out) => out.launched);
      const answered = results.filter((out) => out.reused != null);
      assert.equal(answered.length, 2);
      for (const out of answered) {
        assert.ok(testCommand.cli.render(out).includes(`answered from the run of ${ran.recorded.instant}`), "the answer names that run's instant");
        assert.equal(out.exit, ran.exit, "…with its result");
      }
    }),
  },
  {
    name: "210/04 a lane asking about part of a green run is answered from it",
    run: async () => withRepo(async (root) => {
      await runTest({ files: ["test/a.test.mjs", "test/b.test.mjs"], reason: "the build" }, { projectRoot: root, config: {}, resolveToolchain, walk, run: launcher(observed(streams(["a", "b"], []))).run, record: records });
      const stub = launcher();
      const out = await runTest({ files: ["test/b.test.mjs"], reason: "review lane" }, { projectRoot: root, config: {}, resolveToolchain, walk, run: stub.run, record: records });
      assert.deepEqual(stub.handed, [], "no runner is launched");
      assert.equal(out.reused?.result, "green", "the answer is green from that run");
      assert.equal(out.exit, 0);
    }),
  },
  {
    name: "210/04 the summary line states the form, the suites and the reason it ran for",
    async run() {
      const out = await runTest({ files: ["test/a.test.mjs", "test/b.test.mjs"], reason: "record.mjs changed" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher().run });
      const summary = testCommand.cli.render(out).split("\n").find((line) => line.startsWith("named · "));
      for (const words of ["named", "2 suites", "record.mjs changed"]) assert.ok(summary.includes(words), `${words}: ${summary}`);
    },
  },
  {
    name: "210/04 E5 · --suggest lists the suites a working-tree change reaches, and launches nothing",
    run: async () => withRepo(async (root) => {
      await writeFile(path.join(root, "src/record.mjs"), "export const record = 2;\n");
      const stub = launcher();
      const out = await runTest({ suggest: true }, { projectRoot: root, config: {}, resolveToolchain, walk, run: stub.run, record: records });
      const by = Object.fromEntries(out.suggestion.suites.map((entry) => [entry.suite, entry.reachedBy.map((reach) => `${reach.how} ${reach.file}`)]));
      assert.deepEqual(by["test/a.test.mjs"], ["imports src/record.mjs"]);
      assert.deepEqual(by["test/b.test.mjs"], ["names src/record.mjs"]);
      assert.deepEqual(stub.handed, [], "no runner is launched");
      assert.deepEqual(await storedRecords(root), [], "…and no record is written");
      assert.equal(out.exit, 0);
    }, SUGGEST_FILES),
  },
  {
    name: "210/04 --suggest with nothing changed says so",
    run: async () => withRepo(async (root) => {
      const out = await runTest({ suggest: true }, { projectRoot: root, config: {}, resolveToolchain, walk, run: launcher().run });
      assert.deepEqual(out.suggestion.suites, [], "no suite is listed");
      assert.match(testCommand.cli.render(out), /nothing has changed/u);
    }, SUGGEST_FILES),
  },

  // ── 210/04 task 01 · the whole tree is refused inside story work, with no override ───────────
  {
    name: "210/04 E6 · a running story run refuses --all and names the ways on",
    async run() {
      const stub = launcher();
      const out = await runTest({ all: true }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run, inStoryWork: storyRunning("17/02") });
      assert.equal(out.refusal?.code, ALL_IN_STORY_WORK);
      for (const words of ["17/02", "aof test --failed", "aof test <suite>… --reason"]) assert.ok(out.refusal.message.includes(words), `${words}: ${out.refusal.message}`);
      assert.deepEqual(stub.handed, [], "no runner is launched");
    },
  },
  {
    name: "210/04 [outline] what counts as story work (6 rows)",
    async run() {
      const items = [
        { ref: "17", type: "milestone", dir: "/w/17" },
        { ref: "17/02", type: "story", dir: "/w/17/02" },
        { ref: "17/02/00", type: "task", dir: "/w/17/02/00" },
        { ref: "32", type: "uat", dir: "/w/32" },
      ];
      const runs = (states) => async (item) => (states[item.dir] ?? []).map(([runId, state]) => ({ runId, state, itemRef: items.find((entry) => entry.dir === item.dir)?.ref }));
      const rows = [
        { state: "AOF_RUN_ID names a running run on story 17/02", env: { AOF_RUN_ID: "r1", AOF_RUN_ITEM_DIR: "/w/17/02" }, runs: { "/w/17/02": [["r1", "running"]] }, refused: true },
        { state: "AOF_RUN_ID names a running run on a task 17/02/00", env: { AOF_RUN_ID: "r2", AOF_RUN_ITEM_DIR: "/w/17/02/00" }, runs: { "/w/17/02/00": [["r2", "running"]] }, refused: true },
        { state: "AOF_RUN_ID names a run on milestone 17 and no story run is running", env: { AOF_RUN_ID: "r3", AOF_RUN_ITEM_DIR: "/w/17" }, runs: { "/w/17": [["r3", "running"]] }, refused: false },
        { state: "no AOF_RUN_ID, and a run on story 17/02 has settled as done", env: {}, runs: { "/w/17/02": [["r4", "done"]] }, refused: false },
        { state: "no AOF_RUN_ID, and a run on UAT session 32 is running", env: {}, runs: { "/w/32": [["r5", "running"]] }, refused: false },
        { state: "no AOF_RUN_ID, and no run is running", env: {}, runs: {}, refused: false },
      ];
      for (const row of rows) {
        const stub = launcher();
        const inStoryWork = () => storyWorkOf({ env: row.env, items, read: runs(row.runs), running: (run) => run.state === "running" });
        const out = await runTest({ all: true }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run, inStoryWork });
        if (row.refused) {
          assert.equal(out.refusal?.code, ALL_IN_STORY_WORK, row.state);
          assert.deepEqual(stub.handed, [], `${row.state}: nothing launched`);
        } else {
          assert.equal(out.refusal, null, row.state);
          assert.deepEqual(stub.handed, [[]], `${row.state}: the runner is launched with an empty selection`);
        }
      }
    },
  },
  {
    name: "210/04 E11 · a reason does not override the refusal",
    async run() {
      const stub = launcher();
      const out = await runTest({ all: true, reason: "operator asked" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run, inStoryWork: storyRunning("17/02") });
      assert.equal(out.refusal?.code, ALL_IN_STORY_WORK);
      assert.deepEqual(stub.handed, []);
    },
  },
  {
    name: "210/04 the refusal has no override of any kind",
    async run() {
      // Every flag the command accepts beside --all, alone and together, and every AOF_* variable
      // this codebase reads, set at once: the refusal reads none of them.
      const extras = Object.keys(testCommand.cli.spec.flags).filter((flag) => !["all", "suggest", "failed"].includes(flag));
      const variables = await aofEnvironmentNames();
      assert.ok(variables.includes("AOF_RUN_ID") && variables.length > 5, `the AOF_* names were found: ${variables.length}`);
      const env = Object.fromEntries(variables.map((name) => [name, "1"]));
      for (const flags of [[], ...extras.map((flag) => [flag]), extras]) {
        const argv = ["--all", ...flags.flatMap((flag) => (testCommand.cli.spec.flags[flag].type === "string" ? [`--${flag}`, "override"] : [`--${flag}`]))];
        const options = parseSpecArgv(argv, testCommand.cli.spec, testCommand.id);
        const stub = launcher();
        const inStoryWork = () => storyWorkOf({ env, items: [{ ref: "17/02", type: "story", dir: "/w/17/02" }], read: async () => [{ runId: "r", state: "running", itemRef: "17/02" }], running: (run) => run.state === "running" });
        const out = await runTest(testCommand.cli.argv(options._, options), { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run, inStoryWork });
        assert.equal(out.refusal?.code, ALL_IN_STORY_WORK, `aof test ${argv.join(" ")}`);
        assert.deepEqual(stub.handed, []);
      }
    },
  },
  {
    name: "210/04 E8 · a whole-tree run outside story work is recorded as all",
    run: async () => withRepo(async (root) => {
      const out = await runTest({ all: true }, { projectRoot: root, config: {}, resolveToolchain, walk, run: launcher().run, record: records, inStoryWork: async () => null });
      const [stored] = await storedRecords(root);
      assert.equal(stored.id, out.recorded.id);
      assert.deepEqual({ mode: stored.mode, reason: stored.reason, selected: stored.selected }, { mode: "all", reason: null, selected: "all" });
    }),
  },

  // ── 210/04 task 02 · the old selection is gone, with no compatibility layer ──────────────────
  {
    name: "210/04 [outline] E9 · each removed flag is unknown (6 rows)",
    async run() {
      const rows = [
        ["--scope", "impacted"],
        ["--scope", "all"],
        ["test/a.test.mjs", "--scope", "file", "--reason", "probe"],
        ["--story", "17/02"],
        ["--since", "HEAD~1"],
        ["--commit", "HEAD", "--plan"],
      ];
      for (const argv of rows) {
        const flag = argv.find((arg) => arg.startsWith("--") && !["--reason"].includes(arg));
        assert.throws(() => parseSpecArgv(argv, testCommand.cli.spec, testCommand.id), (error) => error.code === "unknown-flag" && error.message.includes(`"${flag}"`), `aof test ${argv.join(" ")}`);
      }
    },
  },
  {
    name: "210/04 E10 · a config that still declares couplings is refused by name, and the doctor reports it",
    run: async () => withRepo(async (root) => {
      const config = { work: { test: { command: "node", args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"], roots: ["test"], couplings: [] } } };
      const stub = launcher();
      const out = await runTest({ files: ["test/a.test.mjs"], reason: "probe" }, { projectRoot: root, config, walk, run: stub.run });
      assert.equal(out.refusal?.code, "test-config-key-removed");
      assert.ok(out.refusal.message.includes("work.test.couplings") && out.refusal.message.includes("delete it"), out.refusal.message);
      assert.deepEqual(stub.handed, []);
      const checks = testLayoutChecks({ compiled: resolveTestToolchain(config, { projectRoot: root }), compiledGate: resolveTestGate(config) });
      const removed = checks.find((check) => check.id === "test-config-key-removed");
      assert.equal(removed?.severity, "error");
      assert.ok(removed.message.includes("work.test.couplings"), removed.message);
    }),
  },
  {
    name: "210/04 this repository's config carries no removed key",
    async run() {
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      assert.equal(Object.hasOwn(config.work.test, "couplings"), false);
    },
  },
  {
    name: "210/04 the test command's help names only the four forms",
    async run() {
      const { usage } = testCommand.cli.spec;
      for (const words of ["<suite>… --reason", "--suggest", "--failed", "--all"]) assert.ok(usage.includes(words), `${words}: ${usage}`);
      for (const words of ["--scope", "impacted", "--story", "--since", "--commit", "--plan"]) assert.equal(usage.includes(words), false, `${words}: ${usage}`);
      for (const flag of ["scope", "story", "since", "commit", "plan"]) assert.equal(Object.hasOwn(testCommand.cli.spec.flags, flag), false, flag);
    },
  },
  {
    name: "210/04 tests run with no code graph present",
    run: async () => withRepo(async (root) => {
      // A FILE where the graph's directory would be: any read of `graphify-out/…` fails loudly.
      await writeFile(path.join(root, "graphify-out"), "not a directory\n");
      await writeFile(path.join(root, "src/record.mjs"), "export const record = 3;\n");
      const named = await runTest({ files: ["test/a.test.mjs"], reason: "probe" }, { projectRoot: root, config: {}, resolveToolchain, walk, run: launcher(observed(streams(["a"], []))).run });
      assert.equal(named.exit, 0, "the named run answers");
      const suggested = await runTest({ suggest: true }, { projectRoot: root, config: {}, resolveToolchain, walk, run: launcher().run });
      assert.equal(suggested.refusal, null, "the suggestion answers");
      assert.ok(suggested.suggestion.suites.length > 0);
    }, SUGGEST_FILES),
  },
  {
    name: "210/04 the suite predicate still decides what --all and a named run count as a suite",
    async run() {
      const roots = ["test"];
      const suffixes = [".test.mjs"];
      const exclude = [{ paths: ["test/native/**"], why: "native" }];
      assert.equal(isSuiteFile("test/a.test.mjs", roots, suffixes, exclude), true);
      assert.equal(isSuiteFile("test/native/b.test.mjs", roots, suffixes, exclude), false);
      assert.equal(isSuiteFile("test/support/h.mjs", roots, suffixes, exclude), false);
      const declared = () => ({ ok: true, toolchain: { ...TOOLCHAIN.toolchain, exclude } });
      const listed = async () => ["test/a.test.mjs", "test/native/b.test.mjs"];
      const stub = launcher();
      const all = await runTest({ all: true }, { projectRoot: repoRoot, config: {}, resolveToolchain: declared, walk: listed, run: stub.run });
      assert.deepEqual([...all.selected], ["test/a.test.mjs"], "--all counts only suites");
      const native = await runTest({ files: ["test/native/b.test.mjs"], reason: "probe" }, { projectRoot: repoRoot, config: {}, resolveToolchain: declared, walk: listed, run: stub.run });
      assert.equal(native.refusal?.code, NOT_A_SUITE, "a named run refuses an excluded file");
    },
  },

  // ── 02_the-runner-learns-a-selection-argv-additively.feature ───────────────────────────────
  {
    name: "72/02 task 02 (scripts/test.mjs): what the runner does with the files a selection names",
    async run() {
      const dir = await scratch();
      try {
        const alpha = path.join(dir, "alpha.probe.mjs");
        const beta = path.join(dir, "beta.probe.mjs");
        const gamma = path.join(dir, "gamma.probe.mjs");
        const barren = path.join(dir, "barren.probe.mjs");
        const absent = path.join(dir, "not-on-disk.probe.mjs");
        await writeFile(alpha, probeSuiteSource("alpha"), "utf8");
        await writeFile(beta, probeSuiteSource("beta"), "utf8");
        await writeFile(gamma, probeSuiteSource("gamma"), "utf8");
        await writeFile(barren, UNRUNNABLE_SUITE, "utf8");

        // ONE suite file → only the tests that file exports.
        const one = await loadSelected([alpha]);
        assert.deepEqual(one.selected.map((entry) => entry.name), ["alpha one", "alpha two"], "one named file contributes only its own tests");
        assert.deepEqual(one.unusable, [], "…and nothing is unusable");

        // THREE suite files → only the tests those three export, in the order they were named.
        const three = await loadSelected([alpha, beta, gamma]);
        assert.deepEqual(three.selected.map((entry) => entry.name), ["alpha one", "alpha two", "beta one", "beta two", "gamma one", "gamma two"], "three named files contribute exactly their own tests");

        // NO FILE AT ALL → the sentinel is present and names nothing.
        assert.equal(RUNNER_ONLY_FLAG, ONLY_FLAG, "the sentinel this file spells is the runner's own");
        assert.deepEqual(selectionArgv([ONLY_FLAG]), [], "the sentinel with no path names no file");
        assert.equal(selectionArgv([]), null, "…and an argv without the sentinel is not a selection at all");
        assert.equal(selectionArgv(["scripts/test.mjs"]), null, "…nor is a bare positional, which is what the census's own probe child is handed");

        // A FILE THAT EXPORTS NO RUNNABLE TESTS → unusable, and nothing from it runs.
        const noTests = await loadSelected([barren]);
        assert.deepEqual(noTests.selected, [], "a file exporting nothing runner-shaped contributes no tests");
        assert.equal(noTests.unusable.length, 1, "…and is reported unusable");
        assert.equal(noTests.unusable[0].file, barren, "…by path");

        // A FILE THAT IS NOT ON DISK → unusable, naming the path.
        const missing = await loadSelected([absent]);
        assert.deepEqual(missing.selected, [], "a file that is not on disk contributes no tests");
        assert.equal(missing.unusable.length, 1, "…and is reported unusable");
        assert.equal(missing.unusable[0].file, absent, "…naming the path");

        // TWO FILES, ONE USABLE AND ONE NOT → the usable one runs, and the other is still reported.
        const mixed = await loadSelected([alpha, absent]);
        assert.deepEqual(mixed.selected.map((entry) => entry.name), ["alpha one", "alpha two"], "the usable file's tests are still taken");
        assert.equal(mixed.unusable.length, 1, "…and the unusable one is still reported");

        // A SUITE FILE ON DISK THAT THE ASSEMBLED ARRAY DOES NOT REGISTER → its tests run. An
        // unregistered suite is the command's report to make, not the runner's: the runner runs
        // what it is handed.
        assert.equal(three.unusable.length, 0, "an unregistered suite on disk is not unusable — it is simply unregistered");

        // The tightened shape: `name` alone is not enough, because this path RUNS what it takes.
        assert.deepEqual(runnerShapedExports({ a: [{ name: "x" }] }), [], "an entry with no callable `run` is not runner-shaped here");
        assert.deepEqual(runnerShapedExports({ a: [] }), [], "…and an empty array registers nothing");
        const shaped = [{ name: "x", run: () => {} }];
        assert.deepEqual(runnerShapedExports({ tests: shaped, default: shaped }), [shaped], "…and one array exported twice is taken once");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/02 task 02 (scripts/test.mjs): named suite files run, isolated, without reading the assembled array",
    async run() {
      const dir = await scratch();
      const home = path.join(dir, "ambient-home");
      await mkdir(home, { recursive: true });
      try {
        const sink = path.join(dir, "observations.ndjson");
        const alpha = path.join(dir, "alpha.probe.mjs");
        const beta = path.join(dir, "beta.probe.mjs");
        await writeFile(alpha, probeSuiteSource("alpha"), "utf8");
        await writeFile(beta, probeSuiteSource("beta"), "utf8");
        await writeFile(sink, "", "utf8");

        const observedRun = await runner([ONLY_FLAG, alpha, beta], { sink, home });
        assert.equal(observedRun.outcome, "exited", `the selected run finished: ${observedRun.error ?? ""}`);
        assert.equal(observedRun.exitCode, 0, `a selection of passing suites exits on the run's own verdict\n${observedRun.stderr}`);

        // ONLY the named files' tests ran. The assembled array registers thousands of names and
        // none of them appears, which is the claim: selection is a separate path, not a filter.
        assert.deepEqual(okRows(observedRun.stdout), ["alpha one", "alpha two", "beta one", "beta two"], "only the tests those two files export were run");

        const rows = (await readFile(sink, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
        const ran = rows.filter((row) => row.phase === "test");
        assert.equal(ran.length, 4, "every named test recorded the home it ran under");

        const realGlobalHome = path.join(os.homedir(), ".aof");
        for (const row of ran) {
          assert.ok(row.home != null && row.home.length > 0, `${row.name} ran under a global home`);
          assert.notEqual(path.resolve(row.home), path.resolve(realGlobalHome), `${row.name} did not run under the machine's real global home`);
          assert.notEqual(path.resolve(row.home), path.resolve(home), `${row.name} did not run under the ambient one either`);
          assert.equal(row.entries, 0, `${row.name}'s global home was empty when its test began`);
        }
        assert.equal(new Set(ran.map((row) => row.home)).size, 4, "each test ran under its own global home");

        // The ambient value is what it was before the run — observed at process exit, which is the
        // only vantage point from which the restore is visible at all.
        const exits = rows.filter((row) => row.phase === "exit");
        assert.ok(exits.length > 0, "the exit observation was recorded");
        for (const row of exits) {
          assert.equal(path.resolve(row.home), path.resolve(home), "the ambient global home is what it was before the run");
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/02 task 02 (scripts/test.mjs): a selection naming no file refuses, and an unusable file is reported beside a usable one",
    async run() {
      const dir = await scratch();
      const home = path.join(dir, "ambient-home");
      await mkdir(home, { recursive: true });
      try {
        // NO FILE AT ALL — nothing runs and the refusal names the option.
        const bare = await runner([ONLY_FLAG], { home });
        assert.equal(bare.outcome, "exited", `the refusal path finished: ${bare.error ?? ""}`);
        assert.notEqual(bare.exitCode, 0, "a selection naming no file exits non-zero");
        assert.ok(bare.stderr.includes(ONLY_FLAG), `…and the refusal names the option: ${bare.stderr.slice(0, 400)}`);
        assert.deepEqual(okRows(bare.stdout), [], "…and nothing ran");

        // TWO FILES, ONE USABLE AND ONE NOT — the usable one's tests run, the other is reported,
        // and the run is non-zero because a file that contributed nothing is not a green result.
        const failing = path.join(dir, "failing.probe.mjs");
        const absent = path.join(dir, "not-on-disk.probe.mjs");
        const barren = path.join(dir, "barren.probe.mjs");
        await writeFile(failing, FAILING_SUITE, "utf8");
        await writeFile(barren, UNRUNNABLE_SUITE, "utf8");
        const mixed = await runner([ONLY_FLAG, absent, barren, failing], { home });
        assert.equal(mixed.outcome, "exited", `the mixed selection finished: ${mixed.error ?? ""}`);
        assert.notEqual(mixed.exitCode, 0, "a selection carrying an unusable file exits non-zero");
        assert.ok(mixed.stderr.includes(absent), `…a file that is not on disk is reported by path: ${mixed.stderr.slice(0, 600)}`);
        assert.ok(mixed.stderr.includes(barren), `…and so is one that exports no runnable tests: ${mixed.stderr.slice(0, 600)}`);
        assert.ok(mixed.stderr.includes("not ok - selection-probe failing one"), "…and the usable file's tests still ran");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/02 task 02 (scripts/test.mjs): a change to the assembled array is detected, over a FIXTURE and never over this repository's runner",
    async run() {
      const rows = registrationRows(RUNNER_FIXTURE);
      assert.deepEqual(rows, ["  ...alphaTests,", "  ...betaTests"], "the fixture's rows are read between the brackets");

      const mutations = [
        { label: "a row appended after the terminal row, which commas the row before it", rows: ["  ...alphaTests,", "  ...betaTests,", "  ...gammaTests"] },
        { label: "a row appended above the terminal row", rows: ["  ...alphaTests,", "  ...gammaTests,", "  ...betaTests"] },
        { label: "two rows swapped", rows: ["  ...betaTests,", "  ...alphaTests"] },
        { label: "a row removed", rows: ["  ...alphaTests"] },
        { label: "a trailing comma added to the terminal row", rows: ["  ...alphaTests,", "  ...betaTests,"] },
      ];
      for (const mutation of mutations) {
        assert.notDeepEqual(mutation.rows, rows, `${mutation.label} reports a change`);
      }

      // THE ONE DIFF THAT MUST BE ADMITTED: this story's own transform. It adds an argv reader and
      // parameterises one execution loop, and it leaves every row between the brackets alone.
      const transformed = applyStoryTransform(RUNNER_FIXTURE);
      assert.notEqual(transformed, RUNNER_FIXTURE, "the transform actually changed the fixture");
      assert.deepEqual(registrationRows(transformed), rows, "…and reports NO change to the assembled array");

      // …and nothing here read this repository's own runner, whose array four sibling stories also
      // append to — a live pin would red on every one of them.
      assert.ok(!RUNNER_FIXTURE.includes("acdVerificationTemplateShapeTests"), "the fixture is not this repository's runner");
      assert.ok(RUNNER_FIXTURE.split("\n").length < 60, "…it is forty lines of synthetic text, self-contained");
    },
  },

  {
    name: "72/02 task 02 (scripts/test.mjs): the control that freezes the runner outside its registration blocks is green, and both paths call ONE execution loop",
    async run() {
      // THE CONTROL, RUN — not restated. 72/ADR-004 §5 makes this story re-derive REG-MUT-11's
      // residue pin, and a re-derived pin over a mis-cut region is indistinguishable from a
      // correct one in a diff. Running the control against the runner as this story leaves it is
      // what makes the re-derivation checkable at all.
      const control = loopSuiteRegistrationTests.find((entry) => entry.name.includes("REG-MUT-11"));
      assert.ok(control != null, "REG-MUT-11 is a registered member of the control's own suite");
      await control.run();

      const source = (await readFile(runnerPath, "utf8")).replace(/\r\n/gu, "\n");
      const harness = await readFile(new URL("../../scripts/test-harness.mjs", import.meta.url), "utf8");
      const loops = (source + harness).split("for (const { name, run } of tests)").length - 1;
      assert.equal(loops, 1, "exactly one loop prints results and counts failures");
      // 142 Plan 09: the same import also names `runnerShapedExports`, whose one home moved to the harness.
      // 160/02: `loadSelected` joined it, shared with the shard entry a focused `aof test` launches.
      assert.match(source, /import \{ (?:loadSelected, )?runCases(?:, runnerShapedExports)? \} from "\.\/test-harness\.mjs"/u, "the root runner uses the shared execution loop");
      assert.ok(source.includes("await runCases(tests)"), "the suite executes through that imported loop");
      assert.ok(source.includes("runSuite(tests)"), "the full path calls it");
      assert.ok(source.includes("runSuite(selected, { lanes: false })"), "…and the selected path calls the SAME one");
      assert.ok(!source.includes("async function runSelection(files) {\n  let failures = 0;"), "…rather than carrying a second copy of it");
    },
  },

  {
    name: "72/02 task 02 (scripts/test.mjs): importing the runner runs nothing, whatever the importing process's argv holds",
    async run() {
      const dir = await scratch();
      const home = path.join(dir, "ambient-home");
      await mkdir(home, { recursive: true });
      try {
        const alpha = path.join(dir, "alpha.probe.mjs");
        await writeFile(alpha, probeSuiteSource("alpha"), "utf8");
        const importer = path.join(dir, "importer.mjs");
        await writeFile(importer, `import { pathToFileURL } from "node:url";
const module = await import(pathToFileURL(${JSON.stringify(runnerPath)}).href);
process.stdout.write(JSON.stringify({ assembled: Array.isArray(module.tests), count: module.tests.length, exitCode: process.exitCode ?? null }));
`, "utf8");

        const argvs = [
          { label: "no argument beyond the module", args: [] },
          { label: "a selection naming a suite file", args: [ONLY_FLAG, alpha] },
        ];
        for (const row of argvs) {
          const child = await runBounded({
            command: process.execPath,
            args: [importer, ...row.args],
            cwd: repoRoot,
            deadlineMs: 240_000,
            env: { ...process.env, AOF_GLOBAL_HOME: home },
          });
          assert.equal(child.outcome, "exited", `${row.label}: the importer finished — ${child.error ?? ""}`);
          const answer = JSON.parse(child.stdout.trim());
          assert.equal(answer.assembled, true, `${row.label}: the assembled array is available to the importer`);
          assert.ok(answer.count > 0, `${row.label}: …and it is not empty, so the row is not vacuous`);
          assert.equal(answer.exitCode, null, `${row.label}: no exit status was set`);
          assert.deepEqual(okRows(child.stdout), [], `${row.label}: no test was run`);
          assert.ok(!child.stdout.includes("# unit"), `${row.label}: …the suite was not even entered`);
          assert.equal(child.exitCode, 0, `${row.label}: and the importer exits clean`);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  // ── 160/02 · 01_the-shard-entry-runs-a-named-selection.feature ─────────────────────────────
  {
    name: "160/02 task01: several files run as one selection, under one executed line",
    async run() {
      const dir = await scratch();
      try {
        const a = path.join(dir, "a.test.mjs");
        const b = path.join(dir, "b.test.mjs");
        await writeFile(a, casesSuiteSource("a", 3), "utf8");
        await writeFile(b, casesSuiteSource("b", 2), "utf8");
        const result = await shard([a, b], { home: path.join(dir, "home") });
        assert.deepEqual(okRows(result.stdout), ["a 0", "a 1", "a 2", "b 0", "b 1"], `5 cases ran, in order — ${result.stderr}`);
        assert.deepEqual(executedLines(result.stdout), ["# executed 5 cases; failures 0"], "…under one executed line");
        assert.equal(result.exitCode, 0, "…and the entry exits 0");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/02 task01: the sharded runner's unit form still works — a trailing positions list selects by position",
    async run() {
      const dir = await scratch();
      try {
        const c = path.join(dir, "c.test.mjs");
        await writeFile(c, casesSuiteSource("c", 4), "utf8");
        const result = await shard([c, "1,3"], { home: path.join(dir, "home") });
        assert.deepEqual(okRows(result.stdout), ["c 1", "c 3"], `exactly the cases at positions 1 and 3 ran — ${result.stderr}`);
        assert.equal(result.exitCode, 0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/02 task01: an unusable file is reported by path and fails the run, and the good suite still runs",
    async run() {
      const dir = await scratch();
      try {
        const good = path.join(dir, "good.test.mjs");
        const missing = path.join(dir, "missing.test.mjs");
        const plain = path.join(dir, "plain.mjs");
        await writeFile(good, casesSuiteSource("good", 2), "utf8");
        await writeFile(plain, "export const value = 1;\n", "utf8");
        for (const [bad, reason] of [[missing, "could not be loaded"], [plain, "exports no array of { name, run } entries"]]) {
          const result = await shard([good, bad], { home: path.join(dir, "home") });
          assert.ok(result.stdout.includes(`not ok - ${bad} ${reason}`), `the ordered TAP names the unusable file and its reason — ${result.stdout}`);
          assert.deepEqual(okRows(result.stdout), ["good 0", "good 1"], "…and the good suite's cases still ran");
          assert.notEqual(result.exitCode, 0, "…and the run fails");
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  // ── 160/09 · the shard entry runs a packed unit (ADR-010 §2-§3) ──────────────────────────────
  {
    name: "160/09 The shard entry runs a packed unit's files with their positions",
    async run() {
      const dir = await scratch();
      try {
        const a = path.join(dir, "a.test.mjs");
        const b = path.join(dir, "b.test.mjs");
        await writeFile(a, casesSuiteSource("a", 3), "utf8");
        await writeFile(b, casesSuiteSource("b", 4), "utf8");
        const result = await shard(["--file", a, "0,2", "--file", b, "0,1,2,3"], { home: path.join(dir, "home") });
        assert.deepEqual(okRows(result.stdout), ["a 0", "a 2", "b 0", "b 1", "b 2", "b 3"], `6 cases ran — ${result.stderr}`);
        assert.deepEqual(executedLines(result.stdout), ["# executed 6 cases; failures 0"], "…under one executed line");
        assert.equal(result.exitCode, 0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/09 The shard entry's existing forms still work",
    async run() {
      const dir = await scratch();
      try {
        const c = path.join(dir, "c.test.mjs");
        const d = path.join(dir, "d.test.mjs");
        await writeFile(c, casesSuiteSource("c", 4), "utf8");
        await writeFile(d, casesSuiteSource("d", 2), "utf8");
        const byPosition = await shard([c, "1,3"], { home: path.join(dir, "home") });
        assert.deepEqual(okRows(byPosition.stdout), ["c 1", "c 3"], `the cases at positions 1 and 3 ran — ${byPosition.stderr}`);
        const selection = await shard([c, d], { home: path.join(dir, "home") });
        assert.deepEqual(okRows(selection.stdout), ["c 0", "c 1", "c 2", "c 3", "d 0", "d 1"], `the selection ran every case of both files — ${selection.stderr}`);
        assert.equal(byPosition.exitCode + selection.exitCode, 0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/09 The shard entry reports each file it ran",
    async run() {
      const dir = await scratch();
      try {
        const a = path.join(dir, "a.test.mjs");
        const b = path.join(dir, "b.test.mjs");
        await writeFile(a, casesSuiteSource("a", 2), "utf8");
        await writeFile(b, casesSuiteSource("b", 3), "utf8");
        for (const args of [["--file", a, "0,1", "--file", b, "0,2"], [a, b]]) {
          const result = await shard(args, { home: path.join(dir, "home") });
          const lines = String(result.stdout).split(/\r?\n/u).filter((line) => line.startsWith("# file "));
          const expected = args[0] === "--file" ? [[a, 2], [b, 2]] : [[a, 2], [b, 3]];
          assert.equal(lines.length, 2, `one # file line for each file — ${result.stdout}`);
          for (const [index, [file, executed]] of expected.entries()) {
            const match = /^# file (.+) (\d+(?:\.\d+)?) (\d+)$/u.exec(lines[index]);
            assert.ok(match, `"${lines[index]}" reads # file <path> <seconds> <executed>`);
            assert.deepEqual([match[1], Number(match[3])], [file, executed], `${path.basename(file)}: its path and the cases it executed`);
          }
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FF-16003 160/02 task01: a declared selection launches selectProgramArgs, and a focused run evaluates nothing it was not named — no test index, no other suite, no registry",
    async run() {
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      const compiled = _aofApplication.work.toolchain.resolveTestToolchain(config, { projectRoot: repoRoot });
      assert.equal(compiled.ok, true, compiled.message);
      assert.deepEqual([..._aofApplication.work.toolchain.argumentVector(compiled.toolchain, ["test/a.test.mjs"])], ["scripts/test-shard.mjs", "test/a.test.mjs"], "this repository's selection launches the shard entry, never the registry runner");
      const dir = await scratch();
      try {
        const small = path.join(dir, "small.test.mjs");
        const hook = path.join(dir, "record-hook.mjs");
        const sink = path.join(dir, "modules.txt");
        await writeFile(small, casesSuiteSource("small", 1), "utf8");
        await writeFile(hook, MODULE_RECORDING_HOOK, "utf8");
        const result = await shard([small], { home: path.join(dir, "home"), importHook: hook, env: { SHARD_MODULE_SINK: sink } });
        assert.equal(result.exitCode, 0, `the run passed — ${result.stderr}`);
        const urls = (await readFile(sink, "utf8")).split(/\r?\n/u).filter(Boolean).map((url) => url.replaceAll("\\", "/"));
        assert.ok(urls.some((url) => url.endsWith("/small.test.mjs")), "the hook saw the named suite, so it was recording");
        assert.deepEqual(urls.filter((url) => /\/test\/(?:.*\/)?index\.mjs$/u.test(url)), [], "no index.mjs under a test/ directory was evaluated");
        assert.deepEqual(urls.filter((url) => /\.(?:test|suite)\.mjs$/u.test(url) && !url.endsWith("/small.test.mjs")), [], "…no other suite file was");
        assert.deepEqual(urls.filter((url) => url.endsWith("/scripts/test.mjs")), [], "…and the runner's registry was not");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/02 task01: a suite on the runner's import ring still enters through the runner",
    async run() {
      // This file imports the runner, so it IS such a suite; the child runs one of its pure cases.
      const name = "72/02 task 02 (scripts/test.mjs): what the runner does with the files a selection names";
      const position = runnerShapedExports(await import(import.meta.url)).flat().findIndex((entry) => entry.name === name);
      assert.ok(position >= 0, "the pure case is one of this file's exported cases");
      const dir = await scratch();
      try {
        const result = await shard([path.join(repoRoot, "test", "testing", "test-command-contract.test.mjs"), String(position)], { home: path.join(dir, "home") });
        assert.doesNotMatch(result.stderr, /before initiali[sz]ation|Cannot access/u, "no case read an uninitialised array");
        assert.deepEqual(okRows(result.stdout), [name], `its case ran — ${result.stderr}`);
        assert.equal(result.exitCode, 0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
];

// ── 160/02 · the shard entry's helpers ───────────────────────────────────────────────────────

const shardPath = path.join(repoRoot, "scripts", "test-shard.mjs");

// A suite of `count` no-op cases named `<id> <position>`, importing nothing.
function casesSuiteSource(id, count) {
  const rows = Array.from({ length: count }, (_, index) => `  { name: ${jsLiteral(`${id} ${index}`)}, run: () => {} },`);
  return `export const ${id}Tests = [\n${rows.join("\n")}\n];\n`;
}

// Records the URL of every module the child loads, in-thread, before it is evaluated.
const MODULE_RECORDING_HOOK = `import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";
const sink = process.env.SHARD_MODULE_SINK;
registerHooks({ load(url, context, next) { appendFileSync(sink, url + "\\n"); return next(url, context); } });
`;

const executedLines = (text) => String(text).split(/\r?\n/u).filter((line) => line.startsWith("# executed "));

async function shard(args, { home, importHook = null, env = {} } = {}) {
  return await runBounded({
    command: process.execPath,
    args: [...(importHook == null ? [] : ["--import", pathToFileURL(importHook).href]), shardPath, ...args],
    cwd: repoRoot,
    deadlineMs: 240_000,
    env: { ...process.env, AOF_GLOBAL_HOME: home, ...env },
  });
}
