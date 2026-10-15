import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 96 / story 04 — the regression gate is mandatory.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-gate-run-is-recorded-as-evidence.feature
//   tasks/01_the-accept-door-refuses-without-a-green-gate.feature
//   tasks/02_the-override-is-data-and-it-is-recorded.feature
//
// …and 144 (the whole-tree run signs off in minutes): the gate half of every @executable scenario in
//   tasks/00_the-gate-runs-the-declared-whole-tree-program-with-the-operators-settings.feature
//   tasks/01_a-lost-or-failing-case-is-red-and-a-case-that-is-not-isolated-is-logged.feature
//   tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature
// The runner half (the lines it prints, its exit, the slowest-files sums) is
// test/testing/test-sharded-report.test.mjs.
//
// EVERY RECORD HERE IS A REAL `REGRESSION.md` ON DISK, written by the shipped writer and read back
// through the shipped parser. Handing the door a hand-built row object would drive the arithmetic
// and skip the two things most likely to be wrong: that the document ROUND-TRIPS (a writer whose
// own output its parser refuses is the failure 78/02's header names), and that a half-written row
// is UNREADABLE rather than skipped — which is only observable through the bytes.
//
// The gate's impure edges are injected exactly as 72/02's suite injects the test command's, so
// every row drives with no repository and no child process, against the code path production runs.
// `git` is stubbed rather than mocked away, so "a git that cannot answer is not a clean tree" is
// measured rather than asserted about the source.
//
// The accept-door rows drive the REAL `work:status` command over a hermetic fixture with its own
// `AOF_GLOBAL_HOME` (the work-item-status-lifecycle discipline), because the claim is about the
// door an operator actually types — not about a predicate called directly.
//
// One test object per @executable scenario, Scenario-Outline rows folded into one entry iterating
// the rows. node:assert/strict, `{ name, run }` shape.
//
// The scenarios this file does not drive are the four that are properties of the TREE rather than
// of a behaviour — the frozen shape having one home, the refusal living in the command layer, the
// acceptance horizon still importing nothing, the code disjointness, and the absence of any path
// that admits a claim in place of a run. Those are FF-9605's and FF-9606's, in
// test/arch/grade/acd-gate-door-lives-in-the-command-layer.test.mjs and
// test/arch/grade/acd-gate-result-is-evidence.test.mjs.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { normaliseTap } from "@aof/work/grade";
import { generateBundleManifest, manifestPath, serializeBundleManifest } from "aof/bundle-manifest";
import { shardedReport } from "../../scripts/test-sharded-report.mjs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const invoke = _aofApplication.invoke;
import {
  EMPTY_CELL,
  RECORD_MALFORMED,
  REGRESSION_DIVIDER,
  REGRESSION_HEADER,
  REGRESSION_HEADING,
  REGRESSION_RECORD_BASENAME,
  parseRegressionRows,
} from "@aof/work/regression-record";
const DIRTY_TREE = _aofApplication.work.commandTools.regressionGate.DIRTY_TREE;
const runRegressionGate = _aofApplication.work.commandTools.regressionGate.runRegressionGate;
const regressionGateCommand = _aofApplication.work.commandTools.regressionGate.regressionGateCommand;
const SETTINGS_CONFLICT = _aofApplication.work.commandTools.regressionGate.SETTINGS_CONFLICT;
const JOBS_INVALID = _aofApplication.work.commandTools.regressionGate.JOBS_INVALID;
const JOBS_UNDECLARED = _aofApplication.work.commandTools.regressionGate.JOBS_UNDECLARED;
const runTest = _aofApplication.work.commandTools.test.runTest;
const launchRunner = _aofApplication.work.toolchain.launchRunner;
const GATE_MISSING = _aofApplication.work.commandTools.itemStatus.GATE_MISSING;
const GATE_RED = _aofApplication.work.commandTools.itemStatus.GATE_RED;
const OVERRIDE_REASON_REQUIRED = _aofApplication.work.commandTools.itemStatus.OVERRIDE_REASON_REQUIRED;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── the gate's fixture ───────────────────────────────────────────────────────

const COMMIT = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const LATER_COMMIT = "9f8e7d6c5b4a30291827364554637281909a0b1c";
const INSTANT = "2026-09-04T11:22:33Z";
const LATER_INSTANT = "2026-09-05T08:00:00Z";

// A git stub in the shipped seam's own shape (`{ stdout, stderr, status }`), so the module's real
// parsing runs. `dirty` is porcelain TEXT rather than a list, because the porcelain parse — the
// `XY ` prefix, the rename arrow, the quoted path — is part of what is under test.
const gitStub = ({ dirty = "", commit = COMMIT, statusFails = false, headFails = false } = {}) =>
  async (args) => {
    if (args[0] === "status") return { stdout: dirty, stderr: "", status: statusFails ? 128 : 0 };
    if (args[0] === "rev-parse") return { stdout: headFails ? "" : `${commit}\n`, stderr: "", status: headFails ? 128 : 0 };
    return { stdout: "", stderr: "", status: 0 };
  };

// A `runTest` result in the shipped shape. Only the fields the gate reads are varied; the rest are
// present so a destructuring change in the command is caught here rather than at a call site.
const suiteResult = ({ scope = "all", widened = [], failures = [], refusal = null, exit = null } = {}) =>
  Object.freeze({
    askedScope: "all",
    scope,
    story: null,
    gate: scope === "all" && widened.length === 0,
    launched: refusal == null,
    selected: [],
    total: 3,
    widened: Object.freeze(widened),
    changed: Object.freeze([]),
    runner: Object.freeze({ outcome: "exited", exitCode: failures.length > 0 ? 1 : 0, verdict: "ok", message: "" }),
    report: Object.freeze({ ok: true, format: "tap", cases: Object.freeze([]), failures: Object.freeze(failures), contradiction: false }),
    refusal,
    exit: exit ?? (refusal != null || failures.length > 0 ? 1 : 0),
  });

async function withGateFixture(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-regression-gate-")));
  const itemDir = path.join(tmp, "wiki", "work", "70_milestone_gate");
  await mkdir(itemDir, { recursive: true });
  await writeFile(path.join(itemDir, "SPEC.md"), "---\ntype: milestone\n---\n# 70\n", "utf8");
  await writeFile(path.join(itemDir, "VERIFICATION.md"), "# Verification\n\nUNTOUCHED\n", "utf8");
  const item = { ref: "70", dir: itemDir, type: "milestone" };
  const recordPath = path.join(itemDir, REGRESSION_RECORD_BASENAME);
  const run = (overrides = {}) =>
    runRegressionGate({ ref: "70", now: overrides.now ?? INSTANT }, {
      projectRoot: tmp,
      config: {},
      resolve: async (ref) => (ref === "70" ? item : null),
      git: gitStub(overrides.git ?? {}),
      runSuite: overrides.runSuite ?? (async () => (overrides.suite ?? suiteResult())),
      ...(overrides.keepAlive == null ? {} : { keepAlive: overrides.keepAlive }),
      ...(overrides.deps ?? {}),
    });
  try {
    await body({ root: tmp, itemDir, item, recordPath, run });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const readRecord = (recordPath) => readFile(recordPath, "utf8");

// A REAL GIT REPOSITORY, because the override row names the commit it was taken against and
// `headCommit` is the shipped read that answers. ADR-008 is a git-based mechanism end to end — the
// gate refuses a dirty tree and every row names a commit — so a fixture that mocked git away would
// be driving a door that does not exist in production.
const git = promisify(execFile);
async function initRepo(root) {
  await git("git", ["init", "-q", "-b", "main"], { cwd: root });
  await git("git", [
    "-c", "user.email=fixture@aof.local", "-c", "user.name=fixture", "-c", "commit.gpgsign=false",
    "commit", "-q", "--allow-empty", "-m", "fixture",
  ], { cwd: root });
  return (await git("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
}

// ── the accept door's fixture ────────────────────────────────────────────────

const specDoc = (status) => [
  "---", "type: milestone", "number: 70", "slug: gate", 'title: "Gate"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "depends: []", "---",
  "# 70 · Gate", "", "Body line — must stay byte-identical.", "",
].join("\n");

const storyDoc = (status) => [
  "---", "type: story", "number: 00", "slug: lane", "parent: 70", 'title: "Lane"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "---",
  "# 70/00 · Lane", "",
].join("\n");

// A record document assembled from the FROZEN literals — never a hand-typed table — so a change to
// the shape breaks the fixture rather than silently making these rows test a document nobody writes.
function recordWith(rows) {
  return [
    "# Regression gate", "",
    REGRESSION_HEADING, "",
    REGRESSION_HEADER, REGRESSION_DIVIDER,
    ...rows.map((row) => `| ${row.commit} | ${row.instant} | ${row.scope} | ${row.result} | ${row.detail ?? EMPTY_CELL} |`),
    "",
  ].join("\n");
}

const greenRow = (over = {}) => ({ commit: COMMIT, instant: INSTANT, scope: "all", result: "green", detail: null, ...over });
const redRow = (over = {}) => ({ commit: COMMIT, instant: INSTANT, scope: "all", result: "red", detail: "arch/96/04 the door refuses", ...over });

async function withDoorFixture({ status = "in-progress", storyStatus = "in-review", record = null } = {}, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-gate-door-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const aofDir = path.join(root, ".aof");
  const mDir = path.join(root, "wiki", "work", "70_milestone_gate");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(aofDir, { recursive: true });
  await mkdir(sDir, { recursive: true });
  await writeFile(path.join(aofDir, "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await writeFile(path.join(mDir, "SPEC.md"), specDoc(status), "utf8");
  await writeFile(path.join(sDir, "STORY.md"), storyDoc(storyStatus), "utf8");
  const recordPath = path.join(mDir, REGRESSION_RECORD_BASENAME);
  if (record != null) await writeFile(recordPath, record, "utf8");
  const headCommit = await initRepo(root);
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  const ctx = { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } };
  try {
    await body({ root, ctx, mDir, sDir, recordPath, headCommit, specPath: path.join(mDir, "SPEC.md") });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── 160/04's seams: the suite launched through the gate's own `run` callback, and a driven run ──
const STOPPED = _aofApplication.work.commandTools.regressionGate.STOPPED;
const startRun = _aofApplication.execution.runs.startRun;
const completeRun = _aofApplication.execution.runs.completeRun;
const readRuns = _aofApplication.execution.runs.readRuns;
const exitedGreen = () => Object.freeze({ outcome: "exited", exitCode: 0, stdout: "", stderr: "" });

// A `runSuite` that launches through the gate's `run` callback, exactly as `runTest` does, then answers green.
const launchingSuite = (toolchain = { program: "suite", args: [], deadlineMs: 60_000 }) => async (input, options) => {
  await options.run(toolchain, [], { cwd: options.projectRoot });
  return suiteResult();
};

// The environment the gate hands its program, for a gate whose own environment is `env`.
async function launchedEnv(run, env, { during } = {}) {
  let launched = null;
  let seen = null;
  await run({
    deps: { env, launch: async (toolchain, files, options) => { launched = options.env; if (during) seen = await during(); return exitedGreen(); } },
    runSuite: launchingSuite(),
  });
  return { launched, during: seen };
}

// A driven session's run: an item folder with one running record, minted through the run store.
async function drivenRun(root) {
  const dir = path.join(root, "driven-item");
  await mkdir(dir, { recursive: true });
  const item = { ref: "70/00", dir, type: "story" };
  const { runId } = await startRun(item, { brief: {}, now: new Date().toISOString() });
  return { item, runId };
}

async function refusalOf(fn) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected a refusal");
  return caught;
}

export const regressionGateTests = [
  // ═══ 160/04 — the gate launches clean and dies with its session (ADR-005) ══════════════
  // task 00 · R1: the launch environment. The suite is launched through the gate's own `run` callback,
  // so `options.env` is exactly what the program would receive.
  {
    name: "160/04 E1 · an inherited GIT_ASKPASS never reaches the suite",
    run: () => withGateFixture(async ({ run }) => {
      const { launched } = await launchedEnv(run, { GIT_ASKPASS: "C:\\Code\\askpass.sh", PATH: "/bin" });
      assert.equal("GIT_ASKPASS" in launched, false, "the launched environment has no GIT_ASKPASS");
      assert.equal(launched.PATH, "/bin");
    }),
  },
  {
    name: "160/04 E2 · a driven session's variables stay with the gate",
    run: () => withGateFixture(async ({ root, run }) => {
      const drivenItem = path.join(root, "driven-item");
      const { launched, during } = await launchedEnv(run, { AOF_RUN_ID: "20261015T000000000Z-0000", AOF_RUN_ITEM_DIR: drivenItem, CLAUDECODE: "1" }, {
        during: () => readFile(path.join(drivenItem, "runs", ".heartbeats.ndjson"), "utf8"),
      });
      for (const name of ["AOF_RUN_ID", "AOF_RUN_ITEM_DIR", "CLAUDECODE"]) assert.equal(name in launched, false, `${name} is not in the launched environment`);
      const [beat] = during.trim().split("\n").map((text) => JSON.parse(text));
      assert.equal(beat.runId, "20261015T000000000Z-0000", "the gate's keep-alive still appends a beat for that AOF_RUN_ID");
    }),
  },
  {
    name: "160/04 E3 · the isolated global home is kept, and names match in any case",
    run: () => withGateFixture(async ({ run }) => {
      const { launched } = await launchedEnv(run, { AOF_GLOBAL_HOME: "/tmp/gh", git_dir: "/x" });
      assert.equal(launched.AOF_GLOBAL_HOME, "/tmp/gh");
      assert.equal("git_dir" in launched, false, "a lower-case git_dir is a GIT_ variable too");
    }),
  },
  {
    name: "160/04 [outline] What the launch environment keeps and drops (10 rows)",
    run: () => withGateFixture(async ({ run }) => {
      const rows = [
        ["GIT_INDEX_FILE", "absent"], ["GIT_CONFIG_NOSYSTEM", "absent"], ["CLAUDE_CODE_ENTRYPOINT", "absent"],
        ["AOF_RUN_PHASE", "absent"], ["AOF_SEA_EMBEDDED", "absent"], ["AOF_GLOBAL_HOME", "present"],
        ["PATH", "present"], ["SystemRoot", "present"], ["TEMP", "present"], ["VSCODE_PID", "present"],
      ];
      for (const [name, kept] of rows) {
        const { launched } = await launchedEnv(run, { [name]: "v" });
        assert.equal(name in launched, kept === "present", `${name} is ${kept} in the launched environment`);
        if (kept === "present") assert.equal(launched[name], "v");
      }
    }),
  },
  {
    name: "160/04 The gate's own process environment is untouched",
    run: () => withGateFixture(async ({ run }) => {
      const saved = process.env.GIT_ASKPASS;
      process.env.GIT_ASKPASS = "C:\\Code\\askpass.sh";
      try {
        let launched = null;
        await run({ deps: { launch: async (toolchain, files, options) => { launched = options.env; return exitedGreen(); } }, runSuite: launchingSuite() });
        assert.equal("GIT_ASKPASS" in launched, false, "the suite got the clean copy");
        assert.equal(process.env.GIT_ASKPASS, "C:\\Code\\askpass.sh", "the gate's own process.env still carries GIT_ASKPASS");
      } finally {
        if (saved === undefined) delete process.env.GIT_ASKPASS; else process.env.GIT_ASKPASS = saved;
      }
    }),
  },
  // task 01 · R2: the suite dies with its session.
  {
    name: "160/04 E4 · a cancelled session's gate stops its suite and writes no row",
    run: () => withGateFixture(async ({ root, run, recordPath }) => {
      await writeFile(recordPath, recordWith([greenRow()]), "utf8");
      const before = await readFile(recordPath);
      const { item, runId } = await drivenRun(root);
      const marks = path.join(root, "marks");
      await mkdir(marks, { recursive: true });
      // The "suite": announces it started, and records that its stdin ended before it exits.
      const suite = path.join(root, "suite.cjs");
      await writeFile(suite, [
        "const fs = require('fs'), path = require('path');",
        `const marks = ${JSON.stringify(marks)};`,
        "fs.writeFileSync(path.join(marks, 'started'), String(process.pid));",
        "process.stdin.on('end', () => { fs.writeFileSync(path.join(marks, 'stdin-ended'), '1'); process.exit(0); });",
        "process.stdin.resume();",
        "setTimeout(() => process.exit(3), 60000);",
      ].join("\n"), "utf8");
      const settleWhenStarted = (async () => {
        while (!existsSync(path.join(marks, "started"))) await new Promise((resolve) => setTimeout(resolve, 20));
        await completeRun(item, { runId, outcome: "cancelled", now: new Date().toISOString() });
      })();
      const refusal = await refusalOf(() => run({
        deps: { env: { AOF_RUN_ID: runId, AOF_RUN_ITEM_DIR: item.dir, PATH: process.env.PATH ?? "" }, keepAliveMs: 50, launch: launchRunner },
        runSuite: launchingSuite({ program: process.execPath, args: [suite], deadlineMs: 60_000 }),
      }));
      await settleWhenStarted;
      assert.equal(refusal.code, STOPPED, `the gate answers "regression-gate-stopped": ${refusal.message}`);
      assert.ok(existsSync(path.join(marks, "stdin-ended")), "the gate aborted the launch and the runner's stdin ended");
      assert.deepEqual(await readFile(recordPath), before, "REGRESSION.md is byte-identical to before the gate started");
    }),
  },
  {
    name: "160/04 E5 · a drained session's gate finishes and writes its row",
    run: () => withGateFixture(async ({ root, run, recordPath }) => {
      const { item, runId } = await drivenRun(root);
      let beats = 0;
      const result = await run({
        deps: {
          env: { AOF_RUN_ID: runId, AOF_RUN_ITEM_DIR: item.dir },
          keepAliveMs: 10,
          runs: async (target) => { beats += 1; return await readRuns(target); },
          // The suite runs until the keep-alive has watched the running record twice — counted, never timed.
          launch: async () => { while (beats < 2) await new Promise((resolve) => setTimeout(resolve, 10)); return exitedGreen(); },
        },
        runSuite: launchingSuite(),
      });
      assert.ok(beats >= 2, `the run stayed "running" through ${beats} watched beats`);
      assert.equal(result.result, "green", "the gate appends a green row");
      const rows = parseRegressionRows(await readFile(recordPath, "utf8"));
      assert.equal(rows.at(-1).result, "green");
    }),
  },
  {
    name: "160/04 E6 · a gate run by hand watches nothing",
    run: () => withGateFixture(async ({ run, recordPath }) => {
      let reads = 0;
      const result = await run({
        deps: { env: { PATH: "/bin" }, keepAliveMs: 10, runs: async () => { reads += 1; return []; }, launch: async () => exitedGreen() },
        runSuite: launchingSuite(),
      });
      assert.equal(reads, 0, "no run record was read");
      assert.equal(result.appended, true, "the row is appended as before");
      assert.equal(parseRegressionRows(await readFile(recordPath, "utf8")).length, 1);
    }),
  },
  // ═══ 2026-10-13 — a gate inside a driven session keeps that session's run alive ══
  // 159's milestone verify waited ~30 min on this gate with no tool call; the driver read the
  // working session as silent and killed it at heartbeatMs, three attempts running.
  {
    name: "2026-10-13 inside a driven session the gate appends the hook's heartbeat to the run's queue while the suite runs",
    run: () => withGateFixture(async ({ root, run }) => {
      const drivenItem = path.join(root, "driven-item");
      const saved = { dir: process.env.AOF_RUN_ITEM_DIR, id: process.env.AOF_RUN_ID };
      process.env.AOF_RUN_ITEM_DIR = drivenItem;
      process.env.AOF_RUN_ID = "20261013T000000000Z-0000";
      try {
        let during = null;
        await run({
          runSuite: async () => {
            during = await readFile(path.join(drivenItem, "runs", ".heartbeats.ndjson"), "utf8");
            return suiteResult();
          },
        });
        const [line] = during.trim().split("\n").map((text) => JSON.parse(text));
        assert.equal(line.runId, "20261013T000000000Z-0000", "the beat names the driven run");
        assert.ok(Number.isFinite(Date.parse(line.at)), "…with an instant, in the hook's own shape");
      } finally {
        if (saved.dir === undefined) delete process.env.AOF_RUN_ITEM_DIR; else process.env.AOF_RUN_ITEM_DIR = saved.dir;
        if (saved.id === undefined) delete process.env.AOF_RUN_ID; else process.env.AOF_RUN_ID = saved.id;
      }
    }),
  },
  {
    name: "2026-10-13 the gate's keep-alive is stopped when the suite throws",
    run: () => withGateFixture(async ({ run }) => {
      let stopped = 0;
      await assert.rejects(run({
        keepAlive: () => () => { stopped += 1; },
        runSuite: async () => { throw new Error("runner exploded"); },
      }), /runner exploded/u);
      assert.equal(stopped, 1, "the interval never outlives the run");
    }),
  },
  // ══════════════════════════ task 00 — the gate run is recorded as evidence ══
  {
    name: "96/04-00 a green gate run writes a row naming what it proved — the commit, the instant, the scope and the result",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      const out = await run();

      const rows = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(rows.length, 1, "one row per gate run");
      assert.equal(rows[0].commit, COMMIT, "it carries the commit the run ran against");
      assert.equal(rows[0].instant, INSTANT, "…the instant the run finished");
      assert.equal(rows[0].scope, "all", "…the scope the run ran as");
      assert.equal(rows[0].result, "green", "…and the result");
      assert.equal(out.satisfiesDoor, true, "a whole-tree green run may stand as the accept gate");
      assert.equal(out.exit, 0);
    }),
  },
  {
    name: "96/04-00 a red gate run records what failed and the command exits non-zero",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      const out = await run({ suite: suiteResult({ failures: [{ case: "work/gate refuses" }, { case: "work/gate records" }] }) });

      const [row] = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(row.result, "red", "a row is appended recording the result as red");
      assert.match(row.detail, /work\/gate refuses/, "and it names what failed");
      assert.match(row.detail, /work\/gate records/);
      assert.equal(out.exit, 1, "the command exits non-zero");
      assert.equal(out.satisfiesDoor, false);
    }),
  },
  {
    name: "96/04-00 a rerun appends — the earlier row survives byte-for-byte and the newest is the one the door reads",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      await run();
      const first = await readRecord(recordPath);
      const firstRow = parseRegressionRows(first, recordPath)[0].line;

      // The second run finds the FIRST run's evidence in the tree. It is the gate's own output, so
      // it is not a dirty tree — a gate blocked by the row it just wrote is a gate nobody runs twice.
      await run({
        now: LATER_INSTANT,
        git: { dirty: `?? wiki/work/70_milestone_gate/${REGRESSION_RECORD_BASENAME}\n`, commit: LATER_COMMIT },
      });

      const rows = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(rows.length, 2, "the record holds two rows");
      assert.equal(rows[0].line, firstRow, "the earlier row is unchanged");
      assert.equal(rows[0].commit, COMMIT);
      assert.equal(rows[1].commit, LATER_COMMIT, "and the newest row is the one the door reads");
      assert.equal(rows[1].instant, LATER_INSTANT);
    }),
  },
  {
    name: "96/04-00 the run refuses a tree it cannot trust — clean runs, tracked changes and untracked source both refuse",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      for (const [state, dirty, expected] of [
        ["clean", "", "runs"],
        ["carrying uncommitted tracked changes", " M src/regression-record.mjs\n", "src/regression-record.mjs"],
        ["carrying untracked files under a source root", "?? src/smuggled.mjs\n", "src/smuggled.mjs"],
        // A rename reports `XY <old> -> <new>`; the NEW path is the one the tree now holds.
        ["carrying a rename", "R  src/old.mjs -> src/new.mjs\n", "src/new.mjs"],
        // A git that cannot answer is NOT a clean tree — this seam fails CLOSED, which is the one
        // way it differs from `laneChanges`, whose sweep must never delete a lane on a git fault.
        ["unreadable by git", null, "git status"],
      ]) {
        if (expected === "runs") {
          const out = await run({ git: { dirty } });
          assert.equal(out.appended, true, `a ${state} checkout runs the suite and appends a row`);
          continue;
        }
        const error = await refusalOf(() => run(dirty == null ? { git: { statusFails: true } } : { git: { dirty } }));
        assert.equal(error.code, DIRTY_TREE, `a checkout ${state} is refused`);
        assert.match(error.message, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "…naming what is dirty");
      }
      // …and only the first, clean, row ever reached the document.
      assert.equal(parseRegressionRows(await readRecord(recordPath), recordPath).length, 1, "a refused run records nothing");
    }),
  },
  {
    name: "96/04-00 a row missing any of its four facts is unreadable, never skipped",
    run: () => withGateFixture(async ({ recordPath }) => {
      for (const field of ["commit", "instant", "scope", "result"]) {
        // A GOOD row first, so "the read is refused" cannot be satisfied by an empty table: the
        // failure this forbids is a MALFORMED row rendering as though it were not there at all.
        // The computed key is spread LAST so the blanked field wins over the row default it shadows.
        const text = recordWith([greenRow(), greenRow({ instant: LATER_INSTANT, [field]: EMPTY_CELL })]);
        await writeFile(recordPath, text, "utf8");
        const error = await refusalOf(async () => parseRegressionRows(await readRecord(recordPath), recordPath));
        assert.equal(error.code, RECORD_MALFORMED, `a row missing its ${field} makes the record unreadable`);
        assert.match(error.message, new RegExp(`row 2 is missing its ${field}`), "…naming the malformed row");
      }
      // A cell that is PRESENT but not the thing it claims to be is the same answer — a row nobody
      // can read and a gate nobody ran are the same fact.
      for (const [field, value] of [["commit", "not-a-hash"], ["instant", "2026-09-04"], ["result", "probably-fine"]]) {
        await writeFile(recordPath, recordWith([greenRow({ [field]: value })]), "utf8");
        const error = await refusalOf(async () => parseRegressionRows(await readRecord(recordPath), recordPath));
        assert.equal(error.code, RECORD_MALFORMED, `a row whose ${field} is "${value}" is unreadable`);
      }
    }),
  },
  {
    name: "96/04-00 a run that was not a whole-tree run is recorded and does not satisfy the door",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      for (const [property, suite, cell] of [
        ["scope was not `all`", suiteResult({ scope: "impacted" }), "impacted"],
        ["selection widened during the run", suiteResult({ widened: [{ file: "src/x.mjs", reason: "graph-unknown" }] }), "all+widened"],
      ]) {
        await rm(recordPath, { force: true });
        const out = await run({ suite });
        const [row] = parseRegressionRows(await readRecord(recordPath), recordPath);
        assert.equal(row.scope, cell, `a run whose ${property} is recorded`);
        assert.equal(out.satisfiesDoor, false, "…and it is marked as not satisfying the door");
        // It is RECORDED, not refused: the milestone's history has to be able to say a partial run
        // happened, or "no gate ran" and "a gate ran narrowly" become the same absence.
        assert.equal(out.appended, true);
      }
    }),
  },
  {
    name: "96/04-00 the record lives beside the milestone's other records — not under runs/, not under observability/, not in VERIFICATION.md",
    run: () => withGateFixture(async ({ itemDir, recordPath, run }) => {
      const verificationBefore = await readFile(path.join(itemDir, "VERIFICATION.md"), "utf8");
      const out = await run();

      assert.equal(path.dirname(out.path), itemDir, "the written path is inside that milestone's own directory");
      assert.equal(path.basename(out.path), REGRESSION_RECORD_BASENAME);
      assert.doesNotMatch(out.path.split(path.sep).join("/"), /\/runs\//, "it is not under that item's runs directory");
      assert.doesNotMatch(out.path.split(path.sep).join("/"), /\/observability\//, "…nor its observability directory");
      assert.equal(
        await readFile(path.join(itemDir, "VERIFICATION.md"), "utf8"),
        verificationBefore,
        "no section of the milestone's verification document was written",
      );
      assert.equal(recordPath, out.path);
    }),
  },

  // ═══════════════════════ task 01 — the accept door refuses without a green gate ══
  {
    name: "96/04-01 the door reads the newest row and refuses what it must",
    run: async () => {
      for (const [label, record, outcome] of [
        ["absent", null, GATE_MISSING],
        ["present, newest row red", recordWith([redRow()]), GATE_RED],
        ["present, newest row green but the run widened", recordWith([greenRow({ scope: "all+widened" })]), GATE_MISSING],
        ["present, newest row green from a whole-tree run", recordWith([greenRow()]), null],
      ]) {
        await withDoorFixture({ record }, async ({ ctx }) => {
          if (outcome == null) {
            const moved = await invoke("work:status", { ref: "70", status: "done" }, ctx);
            assert.equal(moved.moved, true, `a record ${label} permits the move`);
            assert.equal(moved.status, "done");
            assert.equal(moved.regressionGate?.commit, COMMIT, "…and the result names the row that let it through");
            return;
          }
          const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
          assert.equal(error.code, outcome, `a record ${label} is refused ${outcome}`);
        });
      }
    },
  },
  {
    name: "96/04-01 an older green row does not rescue a newer red one",
    run: () => withDoorFixture({ record: recordWith([greenRow(), redRow({ instant: LATER_INSTANT, commit: LATER_COMMIT })]) }, async ({ ctx, specPath }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(error.code, GATE_RED);
      assert.match(error.message, new RegExp(LATER_COMMIT), "the refusal names the RED row, not the green one behind it");
      assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "and nothing moved");
    }),
  },
  {
    name: "96/04-01 a story's accept door is untouched — no gate refusal is raised anywhere on it",
    run: () => withDoorFixture({ record: null }, async ({ ctx, sDir }) => {
      const moved = await invoke("work:status", { ref: "70/00", status: "done" }, ctx);
      assert.equal(moved.moved, true, "the move is permitted with no regression record anywhere");
      assert.equal(moved.status, "done");
      assert.equal(moved.regressionGate, undefined, "no gate answer is attached to a story's accept");
      // …and no record was invented for it either: the gate is bought back at the MILESTONE door.
      await assert.rejects(() => readFile(path.join(sDir, REGRESSION_RECORD_BASENAME), "utf8"));
    }),
  },
  {
    name: "96/04-01 every other lifecycle move is unaffected — the gate governs one edge and no other",
    run: async () => {
      for (const [from, target] of [["not-started", "in-progress"], ["in-progress", "in-review"], ["in-progress", "blocked"]]) {
        await withDoorFixture({ status: from, record: null }, async ({ ctx }) => {
          const moved = await invoke("work:status", { ref: "70", status: target }, ctx);
          assert.equal(moved.moved, true, `${from} → ${target} is permitted with no regression record`);
          assert.equal(moved.status, target);
        });
      }
    },
  },
  {
    name: "96/04-01 the read form still reports the item's status and its legal next moves, and raises no gate refusal",
    run: () => withDoorFixture({ record: null }, async ({ ctx }) => {
      const read = await invoke("work:status", { ref: "70" }, ctx);
      assert.equal(read.status, "in-progress");
      assert.deepEqual(read.edges, ["in-review", "done", "blocked", "not-started"]);
      assert.equal(read.moved, undefined, "the read moved nothing");
    }),
  },
  {
    name: "96/04-01 the refusal names the repair — the gate command that would produce a record",
    run: () => withDoorFixture({ record: null }, async ({ ctx }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.match(error.message, /aof work regression-gate/, "the message names the gate command");
      assert.match(error.message, /--gate-override/, "…and the escape, so neither path has to be remembered");
    }),
  },
  {
    name: "96/04-01 a record the parser cannot read stops the accept — it is never read as an absent gate",
    run: () => withDoorFixture({ record: recordWith([greenRow({ result: EMPTY_CELL })]) }, async ({ ctx, specPath }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(error.code, RECORD_MALFORMED, "the record's own refusal, not the door's");
      assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m);
    }),
  },

  // ═════════════════════════ task 02 — the override is data and it is recorded ══
  {
    name: "96/04-02 an override permits the accept and records why, as a row marked an override rather than a gate run",
    run: () => withDoorFixture({ record: null }, async ({ ctx, recordPath }) => {
      const reason = "the WSL node cannot host the browser lane";
      const moved = await invoke("work:status", { ref: "70", status: "done", gateOverride: reason, now: INSTANT }, ctx);
      assert.equal(moved.moved, true, "the move is permitted");
      assert.equal(moved.status, "done");

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 1, "a row is appended to the regression record");
      assert.equal(rows[0].detail, reason, "…carrying that reason");
      assert.equal(rows[0].result, "override", "and the row is marked as an override rather than as a gate run");
      assert.notEqual(rows[0].result, "green");
    }),
  },
  {
    name: "96/04-02 an override with no reason is refused, and no row is appended",
    run: async () => {
      for (const [label, input] of [
        ["absent", {}],
        ["an empty string", { gateOverride: "" }],
        ["whitespace only", { gateOverride: "   \t " }],
      ]) {
        await withDoorFixture({ record: null }, async ({ ctx, recordPath, specPath }) => {
          const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done", ...input }, ctx));
          // An ABSENT override is not an override at all: it falls through to the ordinary door,
          // which refuses for the record's absence. Both are refusals and neither writes.
          assert.equal(error.code, label === "absent" ? GATE_MISSING : OVERRIDE_REASON_REQUIRED, `a reason that is ${label} is refused`);
          await assert.rejects(() => readFile(recordPath, "utf8"), "no row is appended");
          assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "and the move did not happen");
        });
      }
    },
  },
  {
    name: "96/04-02 an override over a red gate is permitted and the row names the red row it overrode",
    run: () => withDoorFixture({ record: recordWith([redRow()]) }, async ({ ctx, recordPath }) => {
      const moved = await invoke("work:status", { ref: "70", status: "done", gateOverride: "the runner cannot start here", now: LATER_INSTANT }, ctx);
      assert.equal(moved.moved, true, "the move is permitted");

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 2);
      assert.equal(rows[1].result, "override");
      assert.match(rows[1].detail, new RegExp(COMMIT), "the override row names the red row it overrode");
      assert.match(rows[1].detail, /the runner cannot start here/);
    }),
  },
  {
    name: "96/04-02 an override row survives a later gate run — both rows are present and the override row is unchanged",
    run: () => withDoorFixture({ record: null, status: "in-progress" }, async ({ ctx, mDir, recordPath, root }) => {
      await invoke("work:status", { ref: "70", status: "done", gateOverride: "no runner on this node", now: INSTANT }, ctx);
      const overrideLine = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath)[0].line;

      // The gate later runs green over the same record — the two writers meet on one document.
      await runRegressionGate({ ref: "70", now: LATER_INSTANT }, {
        projectRoot: root,
        config: {},
        resolve: async () => ({ ref: "70", dir: mDir, type: "milestone" }),
        git: gitStub({ commit: LATER_COMMIT }),
        runSuite: async () => suiteResult(),
      });

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 2, "both rows are present");
      assert.equal(rows[0].line, overrideLine, "the override row is unchanged");
      assert.equal(rows[1].result, "green");
    }),
  },
  {
    name: "96/04-02 an override is not a gate result — the row is distinguishable and the milestone reports no green gate run",
    run: () => withDoorFixture({ record: null }, async ({ ctx, recordPath }) => {
      await invoke("work:status", { ref: "70", status: "done", gateOverride: "environment cannot host the run", now: INSTANT }, ctx);
      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);

      assert.equal(rows[0].result, "override", "the override row is distinguishable from a gate run row");
      assert.equal(rows[0].scope, "override", "…in both cells a gate run would use for its run");
      assert.equal(rows.filter((row) => row.result === "green").length, 0, "the milestone reports no green gate run");
    }),
  },
  {
    name: "96/04-02 the shipped verify command document names both paths, prefers the run, and rules out reporting the gate as passed",
    run: async () => {
      const verify = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "verify.md"), "utf8");
      assert.match(verify, /aof work regression-gate/, "it names the gate command as the ordinary path");
      assert.match(verify, /--gate-override/, "…and the override as the escape");
      assert.match(
        verify,
        /environment[\s\S]{0,200}cannot host/i,
        "…named as the environment-cannot-host-it escape rather than as a way past a slow gate",
      );
      assert.match(
        verify,
        /reporting the gate as passed is not/i,
        "and it states that reporting the gate as passed is not a form of evidence",
      );
    },
  },
  // ═══════════ 144 — the gate runs the declared whole-tree program, logs what is not isolated, times itself ══
  //
  // These rows drive the REAL `runTest` body and the REAL `launchRunner` (argv composition and outcome
  // mapping), with only the bounded spawn stubbed as a spy and the clock injected. So "it launched X"
  // is the argument vector the shipped code composed, not one this file assembled.
  {
    name: "144-00 a green sharded run is recorded as a gate that satisfies the door, and the accept door needs no override",
    run: () => withDoorFixture({ record: null }, async ({ ctx, mDir, root }) => {
      const program = programStub();
      const out = await runRegressionGate({ ref: "70", now: INSTANT }, gateDeps144({
        root,
        item: { ref: "70", dir: mDir, type: "milestone" },
        config: config144(GATE_144),
        program,
        git: gitStub({ commit: LATER_COMMIT }),
      }));
      assert.deepEqual(program.launched, ["node scripts/test-sharded.mjs"], "it launched the declared gate program");
      assert.equal(out.result, "green");
      assert.equal(out.scope, "all");
      assert.equal(out.commit, LATER_COMMIT);
      assert.equal(out.satisfiesDoor, true, "the envelope says the row satisfies the door");
      const moved = await invoke("work:status", { ref: "70", status: "done" }, ctx);
      assert.equal(moved.moved, true, "no --gate-override is needed to pass the regression door");
      assert.equal(moved.regressionGate?.commit, LATER_COMMIT);
    }),
  },
  {
    name: "144-00 the operator's settings choose the program and the worker count, and the scope stays all",
    run: async () => {
      for (const [flags, argv] of [
        [{}, "node scripts/test-sharded.mjs"],
        [{ jobs: "8" }, "node scripts/test-sharded.mjs --jobs 8"],
        [{ serial: true }, "node scripts/test.mjs"],
      ]) {
        await withGate144({ config: config144(GATE_144) }, async ({ run, program }) => {
          // Through the CLI's own argv mapping, so the flag names are part of what is driven.
          const out = await run(regressionGateCommand.cli.argv(["70"], flags));
          assert.deepEqual(program.launched, [argv], `${JSON.stringify(flags)} launched ${argv}`);
          assert.equal(out.scope, "all", "…and the row's scope is all");
        });
      }
    },
  },
  {
    name: "144-00 with no gate program declared the gate runs the test program as before, named serial",
    run: () => withGate144({ config: config144(undefined) }, async ({ run, program }) => {
      const out = await run({ ref: "70" });
      assert.deepEqual(program.launched, ["node scripts/test.mjs"]);
      assert.match(out.detail, /^serial · 0\.0 min$/, "the row's detail names the run as serial");
    }),
  },
  {
    name: "144-00 a setting the gate cannot honour is refused before anything runs",
    run: async () => {
      for (const [gate, input, code] of [
        [GATE_144, { serial: true, jobs: "4" }, SETTINGS_CONFLICT],
        [GATE_144, { jobs: "0" }, JOBS_INVALID],
        [GATE_144, { jobs: "many" }, JOBS_INVALID],
        [{ args: ["scripts/test-sharded.mjs"] }, { jobs: "4" }, JOBS_UNDECLARED],
        [undefined, { jobs: "4" }, JOBS_UNDECLARED],
      ]) {
        await withGate144({ config: config144(gate) }, async ({ run, program, recordPath }) => {
          const error = await refusalOf(() => run({ ref: "70", ...input }));
          assert.equal(error.code, code, `${JSON.stringify(input)} against ${JSON.stringify(gate)} is refused ${code}`);
          assert.deepEqual(program.launched, [], "no program was launched");
          await assert.rejects(() => readFile(recordPath, "utf8"), "and REGRESSION.md is unchanged");
        });
      }
    },
  },
  {
    name: "144-00 a malformed gate declaration is the toolchain's own refusal, recorded red naming the key",
    run: async () => {
      for (const [gate, key] of [
        [{ args: "scripts/test-sharded.mjs" }, "args"],
        [{ args: ["scripts/test-sharded.mjs"], jobsArgs: "--jobs" }, "jobsArgs"],
      ]) {
        await withGate144({ config: config144(gate) }, async ({ run, program, recordPath }) => {
          const out = await run({ ref: "70" });
          assert.deepEqual(program.launched, [], "no program was launched");
          const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
          assert.equal(row.result, "red");
          assert.ok(row.detail.includes(`work.test.gate.${key}`), `the detail names work.test.gate.${key}: ${row.detail}`);
          assert.equal(out.exit, 1);
        });
      }
    },
  },
  {
    name: "144-00 settings never get past the dirty-tree refusal",
    run: () => withGate144({ config: config144(GATE_144), git: { dirty: " M packages/work/src/grade.mjs\n" } }, async ({ run, program, recordPath }) => {
      const error = await refusalOf(() => run({ ref: "70", jobs: "8" }));
      assert.equal(error.code, DIRTY_TREE);
      assert.match(error.message, /packages\/work\/src\/grade\.mjs/);
      assert.deepEqual(program.launched, []);
      await assert.rejects(() => readFile(recordPath, "utf8"));
    }),
  },
  {
    name: "144-00 the usage and the operator guide name the settings",
    run: async () => {
      assert.equal(regressionGateCommand.cli.spec.usage, "aof work regression-gate <ref> [--serial] [--jobs N] [--json]");
      const guide = await readFile(path.join(repoRoot, "docs", "acd.md"), "utf8");
      assert.match(guide, /regression-gate[\s\S]{0,400}`work\.test\.gate` when the project declares one/, "the guide says the gate runs work.test.gate when declared");
      assert.match(guide, /`--serial`/);
      assert.match(guide, /`--jobs N`/);
    },
  },
  {
    name: "144-01 a case red in the pool and red again alone makes the row red and names it",
    run: () => withGate144({ config: config144(GATE_144), program: { exitCode: 1, stdout: "TAP version 13\n", stderr: "not ok - loop wave merges home\n" } }, async ({ run, recordPath }) => {
      const out = await run({ ref: "70" });
      const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(row.result, "red");
      assert.match(row.detail, /^loop wave merges home · /);
      assert.equal(out.satisfiesDoor, false);
    }),
  },
  {
    name: "144-01 a case red in the pool and green alone is logged on a green row that satisfies the door",
    run: () => withGate144({ config: config144(GATE_144), program: { stdout: "TAP version 13\n# not isolated - fleet boards branch deleted\n" } }, async ({ run, recordPath }) => {
      const out = await run({ ref: "70" });
      const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(row.result, "green");
      assert.ok(row.detail.startsWith("not isolated: fleet boards branch deleted · "), row.detail);
      assert.equal(out.satisfiesDoor, true);
      assert.deepEqual(out.notIsolated, ["fleet boards branch deleted"]);
    }),
  },
  {
    name: "144-01 every not-isolated case is named, in the order the run reported them",
    run: () => withGate144({
      config: config144(GATE_144),
      program: { stdout: "TAP version 13\n# not isolated - core workspace\n# not isolated - advertised paths\n# not isolated - asset base seam\n" },
    }, async ({ run }) => {
      const out = await run({ ref: "70" });
      assert.ok(out.detail.startsWith("not isolated: core workspace, advertised paths, asset base seam · "), out.detail);
    }),
  },
  {
    name: "144-01 a run that cannot account for every registered case is red, carrying the runner's line",
    run: async () => {
      for (const line of [
        "the sharded run cannot account for the registry: 1 case(s) map to no suite file, 0 duplicate entries",
        "test/loop/loop-command-wave.test.mjs: executed 3 of 5 assigned cases",
      ]) {
        await withGate144({ config: config144(GATE_144), program: { exitCode: 1, stderr: `not ok - ${line}\n` } }, async ({ run, recordPath }) => {
          await run({ ref: "70" });
          const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
          assert.equal(row.result, "red");
          assert.ok(row.detail.includes(line), `the detail carries "${line}": ${row.detail}`);
        });
      }
    },
  },
  {
    name: "144-02 the row says how the run ran and how long it took, and logs an overrun without turning it red",
    run: async () => {
      for (const [flags, minutes, detail] of [
        [{}, 13.8, "sharded · 13.8 min"],
        [{ jobs: "8" }, 14.9, "sharded --jobs 8 · 14.9 min"],
        [{}, 24.1, "sharded · 24.1 min · over budget (15 min)"],
        // 160/ADR-006 §5: the budget binds the sharded gate only, so a serial row is never "over budget".
        [{ serial: true }, 104.0, "serial · 104.0 min"],
      ]) {
        await withGate144({ config: config144({ ...GATE_144, budgetMinutes: 15 }), minutes }, async ({ run }) => {
          const out = await run({ ref: "70", ...flags });
          assert.equal(out.result, "green");
          assert.equal(out.detail, detail);
        });
      }
    },
  },
  {
    name: "144-02 a red row keeps its failing cases first",
    run: () => withGate144({
      config: config144({ ...GATE_144, budgetMinutes: 15 }),
      minutes: 22.0,
      program: { exitCode: 1, stderr: "not ok - loop wave merges home\n" },
    }, async ({ run }) => {
      const out = await run({ ref: "70" });
      assert.equal(out.detail, "loop wave merges home · sharded · 22.0 min · over budget (15 min)");
    }),
  },
  {
    name: "144-02 a not-isolated case sits between the failures and the run line",
    run: () => withGate144({
      config: config144({ ...GATE_144, budgetMinutes: 15 }),
      minutes: 12.5,
      program: { stdout: "TAP version 13\n# not isolated - core workspace\n" },
    }, async ({ run }) => {
      const out = await run({ ref: "70" });
      assert.equal(out.result, "green");
      assert.equal(out.detail, "not isolated: core workspace · sharded · 12.5 min");
    }),
  },
  {
    name: "144-02 with no budget declared nothing is called over budget",
    run: () => withGate144({ config: config144(GATE_144), minutes: 40.0 }, async ({ run }) => {
      assert.equal((await run({ ref: "70" })).detail, "sharded · 40.0 min");
    }),
  },
  {
    name: "144-02 a budget that is not a positive number is refused before anything runs, recorded red",
    run: async () => {
      for (const budgetMinutes of [0, "15"]) {
        await withGate144({ config: config144({ ...GATE_144, budgetMinutes }) }, async ({ run, program, recordPath }) => {
          await run({ ref: "70" });
          assert.deepEqual(program.launched, [], "no program was launched");
          const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
          assert.equal(row.result, "red");
          assert.ok(row.detail.includes("work.test.gate.budgetMinutes"), row.detail);
        });
      }
    },
  },
  {
    name: "144-02 the gate prints where the time went — the slowest-files block unchanged, then its logs",
    run: () => withGate144({
      config: config144(GATE_144),
      program: {
        stdout: [
          "TAP version 13",
          "# sharded run 2026-10-03T00-00-00-000Z",
          "# slowest files (seconds summed across their chunks):",
          "    735s  47 cases  test/loop/loop-command-wave.test.mjs",
          "    412s  18 cases  test/loop/loop-command-reconcile.test.mjs",
          "# logs: .tmp/test-sharded/2026-10-03T00-00-00-000Z",
          "",
        ].join("\n"),
      },
    }, async ({ run }) => {
      const text = regressionGateCommand.cli.render(await run({ ref: "70" }));
      const lines = text.split("\n");
      assert.match(lines[0], /^ok - regression gate 70 /, "the verdict line first");
      const at = lines.indexOf("# slowest files (seconds summed across their chunks):");
      assert.ok(at > 0, "the block follows the verdict");
      assert.deepEqual(lines.slice(at + 1, at + 3), [
        "    735s  47 cases  test/loop/loop-command-wave.test.mjs",
        "    412s  18 cases  test/loop/loop-command-reconcile.test.mjs",
      ], "each line unchanged: summed seconds, case count, file");
      assert.equal(lines[at + 3], "Logs: .tmp/test-sharded/2026-10-03T00-00-00-000Z");
    }),
  },
  // ═══ 160/05 — the runner enforces the budget, and a timeout is not-finished (ADR-006) ══════════
  // task 00 · R1: a unit that runs out of time is not finished, never failed.
  {
    name: "160/05 E1 · a killed integration lane is not finished, and nothing is red",
    run: async () => {
      const lines = shardedReport({ ...REPORT_160, failures: [], flakes: [], notFinished: ["integration lifecycle"], executed: 10, registered: 10 });
      assert.ok(lines.includes("# not finished - integration lifecycle"), "the runner prints # not finished - integration lifecycle");
      assert.equal(lines.some((line) => line.startsWith("not ok")), false, "…and no not ok line");
      await withGate144({ config: config144(GATE_160), program: { exitCode: 1, stdout: `TAP version 13\n${lines.join("\n")}\n` }, minutes: 9.1 }, async ({ run }) => {
        const out = await run({ ref: "70" });
        assert.equal(out.result, "not-finished");
        assert.equal(out.detail, "not finished: integration lifecycle · sharded · 9.1 min", "its detail names the unit and lists no failures");
        assert.equal(out.satisfiesDoor, false);
      });
    },
  },
  {
    name: "160/05 E2 · a failing case and a killed unit make a red row with both named apart",
    run: async () => {
      const failing = { first: unitResult144("work/x", ["work/x: 01 refuses"]), retry: unitResult144("work/x", ["work/x: 01 refuses"]) };
      const lines = shardedReport({ ...REPORT_160, failures: [failing], flakes: [], notFinished: ["test/loop/loop-command-wave.test.mjs"], executed: 9, registered: 10 });
      await withGate144({ config: config144(GATE_160), program: { exitCode: 1, stdout: `TAP version 13\n${lines.join("\n")}\n` }, minutes: 9.5 }, async ({ run }) => {
        const out = await run({ ref: "70" });
        assert.equal(out.result, "red");
        assert.equal(out.detail, "work/x: 01 refuses · not finished: test/loop/loop-command-wave.test.mjs · sharded · 9.5 min", "the failure first, the killed unit apart under not finished");
      });
    },
  },
  {
    name: "160/05 [outline] The row's result, by precedence (5 rows)",
    run: async () => {
      for (const [failures, killed, end, result] of [
        [0, 0, "exit 0", "green"],
        [1, 0, "exit 1", "red"],
        [1, 2, "exit 1", "red"],
        [0, 1, "exit 1", "not-finished"],
        [0, 0, "deadline", "not-finished"],
      ]) {
        const stdout = ["TAP version 13",
          ...Array.from({ length: failures }, (_, at) => `not ok - work/x: case ${at}`),
          ...Array.from({ length: killed }, (_, at) => `# not finished - unit ${at}`), ""].join("\n");
        const program = end === "deadline" ? { outcome: "deadline-expired", stdout } : { exitCode: end === "exit 0" ? 0 : 1, stdout };
        await withGate144({ config: config144(GATE_160), program, minutes: 5 }, async ({ run }) => {
          assert.equal((await run({ ref: "70" })).result, result, `${failures} failing, ${killed} not finished, ending by ${end}`);
        });
      }
    },
  },
  {
    name: "160/05 The TAP reader counts no failure for a not-finished unit",
    run: () => {
      const read = normaliseTap("TAP version 13\n# not finished - integration lifecycle\n");
      assert.equal(read.cases.filter((entry) => entry.status === "failed").length, 0, "it counts no failure");
    },
  },
  // task 01 · R2 and R3: the sharded gate is held to its budget, and only a green row signs off.
  {
    name: "160/05 E4 · a run inside the budget is green",
    run: () => withGate144({ config: config144(GATE_160), minutes: 8.4 }, async ({ run }) => {
      const out = await run({ ref: "70" });
      assert.equal(out.result, "green");
      assert.equal(out.detail, "sharded · 8.4 min");
    }),
  },
  {
    name: "160/05 E6 · a program that cannot be told is stopped by the gate's own deadline",
    run: () => withGate144({ config: config144({ ...GATE_144, budgetMinutes: 10 }), program: { outcome: "deadline-expired", stdout: "TAP version 13\nok - partial\n" }, minutes: 12 }, async ({ run, program }) => {
      const out = await run({ ref: "70" });
      assert.equal(program.calls[0].deadlineMs, 12 * 60_000, "the launch was bounded at the budget plus the report's grace");
      assert.equal(out.result, "not-finished", "the launch ended deadline-expired and the row is not-finished, never red");
      assert.match(out.detail, /^not finished: the gate's own 12-minute deadline expired/u);
    }),
  },
  {
    name: "160/05 [outline] The budget reaches the program (4 rows)",
    run: async () => {
      for (const [budgetArgs, settings, tail, deadlineMs] of [
        [["--budget-min", "{minutes}"], {}, ["--budget-min", "10"], 12 * 60_000],
        [["--budget-min", "{minutes}"], { jobs: "8" }, ["--jobs", "8", "--budget-min", "10"], 12 * 60_000],
        [undefined, {}, ["scripts/test-sharded.mjs"], 12 * 60_000],
        [["--budget-min", "{minutes}"], { serial: true }, ["scripts/test.mjs"], TEST_144.deadlineMs],
      ]) {
        const gate = { ...GATE_144, budgetMinutes: 10, ...(budgetArgs === undefined ? {} : { budgetArgs }) };
        await withGate144({ config: config144(gate) }, async ({ run, program }) => {
          await run({ ref: "70", ...settings });
          const [call] = program.calls;
          assert.deepEqual(call.args.slice(-tail.length), tail, `${JSON.stringify(settings)}: the argument vector ends with ${tail.join(" ")}`);
          assert.equal(call.deadlineMs, deadlineMs, "and the launch deadline is as declared");
        });
      }
    },
  },
  {
    name: "160/05 [outline] A malformed budget template is the toolchain's own refusal (3 rows)",
    run: () => {
      const resolveTestGate = _aofApplication.work.toolchain.resolveTestGate;
      for (const value of ["--budget-min 10", ["--budget-min"], ["--budget-min", "{minutes}", "{minutes}"]]) {
        const answer = resolveTestGate({ work: { test: { gate: { args: ["scripts/test-sharded.mjs"], budgetMinutes: 10, budgetArgs: value } } } });
        assert.equal(answer.ok, false, `${JSON.stringify(value)} is refused`);
        assert.equal(answer.code, "test-runner-declaration-invalid");
        assert.equal(answer.key, "work.test.gate.budgetArgs");
      }
    },
  },
  {
    name: "160/05 This repository declares a 10-minute budget the runner is told",
    run: async () => {
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      assert.equal(config.work.test.gate.budgetMinutes, 10);
      assert.deepEqual(config.work.test.gate.budgetArgs, ["--budget-min", "{minutes}"]);
    },
  },
  {
    name: "160/05 E7 · a not-finished row is refused at the door with its own repair",
    run: () => withDoorFixture({ record: recordWith([greenRow(), greenRow({ result: "not-finished", detail: "not finished: integration lifecycle", instant: LATER_INSTANT, commit: LATER_COMMIT })]) }, async ({ ctx, specPath }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(error.code, "regression-gate-not-finished");
      assert.match(error.message, /re-run/u, "the message says to re-run the gate…");
      assert.match(error.message, /speed the run up/u, "…or speed the run up");
      assert.doesNotMatch(error.message, /failing|fix the suite/iu, "and does not say the suite is failing");
      assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "nothing moved");
    }),
  },
  {
    name: "160/05 E8 · a long serial run that passes still signs off",
    run: () => withGate144({ config: config144(GATE_160), minutes: 104 }, async ({ run }) => {
      const out = await run({ ref: "70", serial: true });
      assert.equal(out.result, "green");
      assert.equal(out.satisfiesDoor, true, "the row satisfies the door");
      assert.equal(out.detail, "serial · 104.0 min");
    }),
  },
  {
    name: "160/05 The verify prose names the word",
    run: async () => {
      const prose = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "verify.md"), "utf8");
      assert.match(prose, /A `not-finished` row is no verdict on the code/u);
      assert.match(prose, /re-run the gate, or to speed the run up/u, "it says a not-finished row is re-run or sped up");
      assert.match(prose, /Never route a not-finished row to a code repair/u, "and is never routed to a code repair");
      const shipped = await readFile(manifestPath(), "utf8");
      assert.equal(shipped, serializeBundleManifest(generateBundleManifest()), "the shipped bundle manifest matches the rendered bundle");
    },
  },
];

// ── 144's fixture ──────────────────────────────────────────────────────────────

const TEST_144 = Object.freeze({ command: "node", args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"], roots: ["test"], deadlineMs: 60000, report: { format: "tap" } });
const GATE_144 = Object.freeze({ args: ["scripts/test-sharded.mjs"], jobsArgs: ["--jobs", "{jobs}"] });
// ── 160/05's fixture: the gate held to a 10-minute budget the runner is told ──────────────────
const GATE_160 = Object.freeze({ ...GATE_144, budgetArgs: ["--budget-min", "{minutes}"], budgetMinutes: 10 });
const REPORT_160 = Object.freeze({ stamp: "2026-10-15T00-00-00-000Z", units: 3, wallSeconds: 540, summedSeconds: 1800, jobs: 16, perFile: {}, logs: ".tmp/test-sharded/2026-10-15T00-00-00-000Z" });
const unitResult144 = (key, failed = []) => ({ unit: { key, positions: [0] }, ok: failed.length === 0, code: failed.length > 0 ? 1 : 0, seconds: 1, executed: 1, failed });
const config144 = (gate) => ({ work: { test: gate === undefined ? { ...TEST_144 } : { ...TEST_144, gate } } });

// The bounded spawn, as a spy behind the REAL `launchRunner`: it records the declared command and
// the argument vector the shipped code composed, and answers in the seam's own envelope.
function programStub({ exitCode = 0, stdout = "TAP version 13\n", stderr = "", outcome = "exited" } = {}) {
  const launched = [];
  const calls = [];
  const launch = (toolchain, files, options) => launchRunner(toolchain, files, {
    ...options,
    launch: async (call) => {
      launched.push([toolchain.command, ...call.args].join(" "));
      calls.push(call);
      return Object.freeze({ outcome, command: call.command, args: call.args, attempted: [call.command, ...call.args].join(" "), deadlineMs: call.deadlineMs, exitCode: outcome === "exited" ? exitCode : null, signal: null, stdout, stderr, error: null });
    },
  });
  return { launched, calls, launch };
}

// A clock that reads 0 at launch and `minutes` at exit.
const clockOf = (minutes) => {
  let reads = 0;
  return () => (reads++ === 0 ? 0 : Math.round(minutes * 60000));
};

function gateDeps144({ root, item, config, program, git, minutes = 0 }) {
  return {
    projectRoot: root,
    config,
    resolve: async (ref) => (ref === item.ref ? item : null),
    git,
    // The shipped command body, with only the suite walk stubbed: `all` launches no selection argv.
    runSuite: (input, deps) => runTest(input, { ...deps, walk: async () => [] }),
    launch: program.launch,
    clock: clockOf(minutes),
  };
}

async function withGate144({ config, git = {}, program: answer = {}, minutes = 0 }, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-regression-gate-144-")));
  const itemDir = path.join(tmp, "wiki", "work", "70_milestone_gate");
  await mkdir(itemDir, { recursive: true });
  const item = { ref: "70", dir: itemDir, type: "milestone" };
  const program = programStub(answer);
  const deps = gateDeps144({ root: tmp, item, config, program, git: gitStub(git), minutes });
  const run = (input) => runRegressionGate({ now: INSTANT, ...input }, deps);
  try {
    await body({ run, program, recordPath: path.join(itemDir, REGRESSION_RECORD_BASENAME) });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
