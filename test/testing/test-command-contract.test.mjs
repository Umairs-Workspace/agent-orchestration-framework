// Traceability wiring for milestone 72 / story 02 — THE TEST COMMAND'S FACE.
//
// One test object per @executable scenario (Scenario-Outline rows folded into one entry), each
// name tracing to its feature and scenario:
//
//   00_the-command-selects-launches-and-reports-failures-only.feature
//        — the three closed scope forms and a fourth that is not one; an input that is not one of
//          the three refused rather than defaulted; what a run prints and exits with; verbose
//          restoring and removing nothing; the two faces rendering from one result.
//   01_the-command-reports-and-never-decides.feature
//        — only an unwidened whole-suite run may stand as a verdict.
//   02_the-runner-learns-a-selection-argv-additively.feature
//        — every shape the selection argv can be handed; named files run without reading the
//          assembled array; a change to the assembled array detected over a FIXTURE; the
//          registration control green; one execution loop; a selected test driven isolated; and
//          importing the runner running nothing whatever the importer's argv holds.
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
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBounded } from "../../src/work-audit/spawn.mjs";
// The story's own subject, and its two faces — taken from the REGISTERED command object rather
// than from a private helper, so what these rows measure is what the runtime runs.
import { NO_SCOPE, SCOPE_UNRECOGNISED, NO_FILES_NAMED, TEST_SCOPES, runTest, testCommand } from "../../src/commands/test.mjs";
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
const neverRead = async () => { throw new Error("the changed set must not be read for this scope"); };
const neverSelect = () => { throw new Error("the selector must not be asked for this scope"); };

const changedOk = (changed) => async () => ({ ok: true, changed, base: null });

function selector(fields) {
  return () => Object.freeze({
    scope: fields.scope,
    gate: fields.scope === "all" && (fields.widened ?? []).length === 0,
    selected: Object.freeze([...fields.selected]),
    widened: Object.freeze([...(fields.widened ?? [])]),
    builtAt: fields.builtAt ?? null,
    graphPath: "graphify-out/graph.json",
    changed: Object.freeze([...(fields.changed ?? [])]),
    resolved: Object.freeze([]),
    refusal: fields.refusal ?? null,
  });
}

const BUILT_AT = "2026-09-02T11:22:33.000Z";

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
  record({ phase: "test", suite: ${JSON.stringify(id)}, name, home, entries: there ? readdirSync(home).length : 0 });
};
process.on("exit", () => record({ phase: "exit", suite: ${JSON.stringify(id)}, home: process.env.AOF_GLOBAL_HOME ?? null }));
export const probeTests = [
  { name: ${JSON.stringify(`${id} one`)}, run: () => observe(${JSON.stringify(`${id} one`)}) },
  { name: ${JSON.stringify(`${id} two`)}, run: () => observe(${JSON.stringify(`${id} two`)}) },
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
  // ── 00_the-command-selects-launches-and-reports-failures-only.feature ──────────────────────
  {
    name: "72/02 task 00 (aof test): the scope form decides what is selected and whether the result may stand as a verdict",
    async run() {
      // Row 1 — `all` asks nothing: no changed set is read and no selector is consulted, and the
      // runner is handed NO selection, which for a declared runner is how "run everything" is
      // spelled. Nine hundred paths in an argv would be the same run at a length no operating
      // system accepts.
      const all = launcher();
      const allResult = await runTest({ scope: "all" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, readChanged: neverRead, select: neverSelect, run: all.run });
      assert.equal(allResult.scope, "all", "an `all` run reports the scope it ran as");
      assert.deepEqual([...allResult.selected], [...WHOLE], "…and every registered suite is what it selected");
      assert.deepEqual(all.handed, [[]], "…handed to the runner as no narrowing at all");
      assert.equal(allResult.gate, true, "…and it is the one form that may stand as a verdict");

      // Row 2 — `impacted`, nothing widened: the suites the changed set reaches, and no verdict.
      const narrow = launcher();
      const narrowResult = await runTest({ scope: "impacted" }, {
        projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: narrow.run,
        readChanged: changedOk(["src/thing.mjs"]),
        select: selector({ scope: "impacted", selected: ["test/b.test.mjs"], builtAt: BUILT_AT, changed: ["src/thing.mjs"] }),
      });
      assert.equal(narrowResult.scope, "impacted", "a narrowed run reports `impacted`");
      assert.deepEqual([...narrowResult.selected], ["test/b.test.mjs"], "…selecting the suites the changed set reaches");
      assert.deepEqual(narrow.handed, [["test/b.test.mjs"]], "…and those are the files the runner was asked to run");
      assert.equal(narrowResult.gate, false, "…and a subset may not stand as a verdict");

      // Row 3 — `impacted` that WIDENED: it runs as `all`, and it still may not stand, because it
      // got there from an UNKNOWN. A widened whole run and an asked-for whole run are the same
      // execution and two different claims.
      const widened = launcher();
      const widenedResult = await runTest({ scope: "impacted" }, {
        projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: widened.run,
        readChanged: changedOk(["src/new.mjs"]),
        select: selector({ scope: "all", selected: [...WHOLE], widened: [{ file: "src/new.mjs", reason: "not-in-graph" }], builtAt: BUILT_AT, changed: ["src/new.mjs"] }),
      });
      assert.equal(widenedResult.scope, "all", "a widened run reports that it ran as `all`");
      assert.deepEqual([...widenedResult.selected], [...WHOLE], "…over every registered suite");
      assert.deepEqual(widened.handed, [[]], "…launched as a whole run rather than as nine hundred paths");
      assert.equal(widenedResult.gate, false, "…and it may NOT stand, because a widening is an unknown");

      // Row 4 — `file`: exactly what the caller named, and never a verdict.
      const named = launcher();
      const namedResult = await runTest({ scope: "file", files: ["test/c.test.mjs"] }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, readChanged: neverRead, select: neverSelect, run: named.run });
      assert.equal(namedResult.scope, "file", "a named run reports `file`");
      assert.deepEqual([...namedResult.selected], ["test/c.test.mjs"], "…selecting only what the caller named");
      assert.deepEqual(named.handed, [["test/c.test.mjs"]], "…which is what the runner was asked to run");
      assert.equal(namedResult.gate, false, "…and it may not stand as a verdict");

      // Row 5 — a fourth form: nothing at all is selected and NO runner is launched.
      const fourth = launcher();
      const fourthResult = await runTest({ scope: "sweep" }, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, readChanged: neverRead, select: neverSelect, run: fourth.run });
      assert.equal(fourthResult.scope, NO_SCOPE, "a fourth form ran as no scope at all");
      assert.deepEqual([...fourthResult.selected], [], "…selecting nothing");
      assert.deepEqual(fourth.handed, [], "…and launching no runner");
      assert.equal(fourthResult.launched, false, "…which the result says in as many words");
      assert.equal(fourthResult.gate, false, "…and it may not stand as a verdict");
      assert.deepEqual([...TEST_SCOPES], ["impacted", "file", "all"], "the three forms are closed, and `sweep` is not one of them");
    },
  },

  {
    name: "72/02 task 00 (aof test): an input that is not one of the three forms is refused, never defaulted",
    async run() {
      const rows = [
        { given: "a word that is not one of the three", input: { scope: "sweep" }, code: SCOPE_UNRECOGNISED, names: "sweep" },
        { given: "an empty scope", input: { scope: "" }, code: SCOPE_UNRECOGNISED, names: "no scope was given" },
        { given: "one of the three in a different case", input: { scope: "ALL" }, code: SCOPE_UNRECOGNISED, names: "ALL" },
        { given: "file, with no file named", input: { scope: "file", files: [] }, code: NO_FILES_NAMED, names: "file" },
      ];
      for (const row of rows) {
        const stub = launcher();
        const result = await runTest(row.input, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, readChanged: neverRead, select: neverSelect, run: stub.run });
        assert.equal(result.refusal?.code, row.code, `${row.given} is a CODED refusal`);
        assert.ok(result.refusal.message.includes(row.names), `…naming what was not understood (${row.given}): ${result.refusal.message}`);
        assert.deepEqual([...result.selected], [], `…with nothing selected (${row.given})`);
        assert.deepEqual(stub.handed, [], `…and no runner launched (${row.given})`);
        assert.equal(result.exit, 1, `…and a refusal exits non-zero (${row.given})`);
      }

      // An ABSENT scope takes the same answer as an empty one. A default here would be a narrowing
      // nobody asked for, which is the one thing the selection invariant forbids.
      const absent = await runTest({}, { projectRoot: repoRoot, config: {}, resolveToolchain, walk, readChanged: neverRead, select: neverSelect, run: launcher().run });
      assert.equal(absent.refusal?.code, SCOPE_UNRECOGNISED, "an absent scope is as unrecognised as a wrong one");
    },
  },

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
        const result = await runTest({ scope: "impacted", verbose: row.verbose }, {
          projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run,
          readChanged: changedOk(["src/thing.mjs"]),
          select: selector({ scope: "impacted", selected: ["test/b.test.mjs", "test/c.test.mjs"], builtAt: BUILT_AT, changed: ["src/thing.mjs"] }),
        });
        const text = testCommand.cli.render(result);
        const lines = text.split("\n");
        const label = `${row.mix} ${row.verbose ? "with --verbose" : "with no option"}`;

        assert.equal(lines.filter((line) => line.startsWith("ok - ")).length, row.passing, `${label}: passing rows`);
        assert.equal(lines.filter((line) => line.startsWith("not ok - ")).length, row.failing, `${label}: failing rows`);
        for (const failure of result.report.failures) {
          assert.ok(text.includes(failure.message), `${label}: each failure carries its assertion output`);
        }
        assert.equal(result.exit, row.status, `${label}: the exit status`);

        // ONE summary line, and it carries every claim: what out of what, the scope, the graph's
        // build time, and every widening.
        const summary = lines.filter((line) => line.includes(" suites · scope "));
        assert.equal(summary.length, 1, `${label}: exactly one summary line`);
        assert.ok(summary[0].startsWith("2/3 suites · scope impacted · "), `${label}: what was selected out of what, and the scope — ${summary[0]}`);
        assert.ok(summary[0].includes(BUILT_AT), `${label}: the graph's build time`);
        assert.ok(summary[0].includes("no widening"), `${label}: and every widening`);
      }

      // The widened case names the FILE that caused each widening, on that same one line.
      const widened = await runTest({ scope: "impacted" }, {
        projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher().run,
        readChanged: changedOk(["src/new.mjs"]),
        select: selector({ scope: "all", selected: [...WHOLE], widened: [{ file: "src/new.mjs", reason: "not-in-graph" }], builtAt: BUILT_AT, changed: ["src/new.mjs"] }),
      });
      const summary = testCommand.cli.render(widened).split("\n").filter((line) => line.includes(" suites · scope "));
      assert.equal(summary.length, 1, "a widened run still prints exactly one summary line");
      assert.ok(summary[0].includes("src/new.mjs (not-in-graph)"), `…naming the widening and the file that caused it — ${summary[0]}`);
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
        const deps = (verbose) => ({
          projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher(observed(row.output)).run,
          readChanged: changedOk(["src/thing.mjs"]),
          select: selector({ scope: "impacted", selected: ["test/b.test.mjs", "test/c.test.mjs"], builtAt: BUILT_AT, changed: ["src/thing.mjs"] }),
          verbose,
        });
        const quiet = testCommand.cli.render(await runTest({ scope: "impacted" }, deps(false)));
        const loud = testCommand.cli.render(await runTest({ scope: "impacted", verbose: true }, deps(true)));
        const loudLines = loud.split("\n");

        assert.equal(loudLines.filter((line) => line.startsWith("ok - ")).length, row.restored, `${row.mix}: the passing rows restored`);
        for (const line of quiet.split("\n")) {
          assert.ok(loudLines.includes(line), `${row.mix}: verbose removes nothing — "${line}" is missing from the verbose output`);
        }
      }
    },
  },

  {
    name: "72/02 task 00 (aof test): the human face and the machine face render from ONE result",
    async run() {
      const stub = launcher(observed(streams(["alpha"], ["beta"])));
      const result = await runTest({ scope: "impacted" }, {
        projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: stub.run,
        readChanged: changedOk(["src/new.mjs"]),
        select: selector({ scope: "all", selected: [...WHOLE], widened: [{ file: "src/new.mjs", reason: "not-in-graph" }], builtAt: BUILT_AT, changed: ["src/new.mjs"] }),
      });
      const text = testCommand.cli.render(result);
      const machine = testCommand.cli.json(result);

      // Six fields, each read from BOTH faces. A drift between the two is what makes a claim
      // verified through --json a different claim from the one an operator reads.
      assert.ok(text.includes(`${machine.selected.length}/${machine.total} suites`), "how many suites were selected out of how many");
      assert.ok(text.includes(`scope ${machine.scope}`), "the scope the run ran as");
      assert.ok(text.includes(String(machine.builtAt)), "the graph's build time");
      for (const entry of machine.widened) {
        assert.ok(text.includes(`${entry.file} (${entry.reason})`), "each widening and the file that caused it");
      }
      assert.ok(text.includes(machine.gate ? "may stand as a verdict" : "may not stand as a verdict"), "whether the result may stand as a verdict");
      assert.ok(machine.report.failures.length > 0, "…and the fixture actually failed, so the last field is not vacuous");
      for (const failure of machine.report.failures) {
        assert.ok(text.includes(failure.message), "a failing test's assertion text");
      }
      assert.equal(machine, result, "the machine face IS the result object, not a second assembly of it");
    },
  },

  // ── 01_the-command-reports-and-never-decides.feature ───────────────────────────────────────
  {
    name: "72/02 task 01 (aof test): only an unwidened whole-suite run may stand as a verdict",
    async run() {
      const rows = [
        { asked: "all", ran: "all", widening: "nothing widened", gate: true },
        { asked: "impacted", ran: "impacted", widening: "nothing widened", gate: false },
        { asked: "impacted", ran: "all", widening: "one changed file the graph does not cover", widened: [{ file: "src/new.mjs", reason: "not-in-graph" }], gate: false },
        { asked: "impacted", ran: "all", widening: "there was no graph artifact at all", widened: [{ file: "src/thing.mjs", reason: "no-graph" }], gate: false },
        { asked: "file", ran: "file", widening: "nothing widened", gate: false },
      ];
      for (const row of rows) {
        const deps = { projectRoot: repoRoot, config: {}, resolveToolchain, walk, run: launcher().run };
        const result = row.asked === "impacted"
          ? await runTest({ scope: "impacted" }, {
            ...deps,
            readChanged: changedOk(["src/thing.mjs"]),
            select: selector({ scope: row.ran, selected: row.ran === "all" ? [...WHOLE] : ["test/b.test.mjs"], widened: row.widened ?? [], builtAt: row.widening.includes("no graph") ? null : BUILT_AT, changed: ["src/thing.mjs"] }),
          })
          : await runTest({ scope: row.asked, files: ["test/c.test.mjs"] }, { ...deps, readChanged: neverRead, select: neverSelect });
        assert.equal(result.scope, row.ran, `asked ${row.asked}, ran as ${row.ran}`);
        assert.equal(result.gate, row.gate, `${row.asked} → ${row.ran} (${row.widening}) ${row.gate ? "may" : "may not"} stand as a verdict`);
      }
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
      const loops = source.split("for (const { name, run } of tests)").length - 1;
      assert.equal(loops, 1, "exactly one loop prints results and counts failures");
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
];
