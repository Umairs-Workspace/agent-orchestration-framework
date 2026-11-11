import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 190 / story 04 task 00 — the project doctor names what the test
// declaration leaves out (190/ADR-008 §1).
//
// Covers every @executable scenario in
//   tasks/00_the-project-doctor-names-what-the-declaration-leaves-out.feature
//
// Each case plants a config and a git index in a scratch directory and runs the shipped
// `project:doctor` command over it, so the family is measured through the face an operator reads:
// the raw config read, the toolchain's compile, `git ls-files` at the doctor's edge, and the pure
// check. The files are staged, never committed: the family reads what git TRACKS, and a staged
// file is tracked. `AOF_GLOBAL_HOME` is isolated by the runner.
//
// One test object per scenario, Scenario-Outline rows folded into one entry iterating the rows.
// node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const doctor = _aofApplication.getCommand("project:doctor");
const runTest = _aofApplication.work.commandTools.test.runTest;
const resolveTestToolchain = _aofApplication.work.toolchain.resolveTestToolchain;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The smallest `work.test` the toolchain compiles. `node` resolves wherever this suite runs.
const declaration = (extra = {}) => ({
  command: "node",
  args: ["scripts/test.mjs"],
  selectArgs: ["--only", "{file}"],
  roots: ["test"],
  deadlineMs: 60_000,
  report: { format: "tap" },
  ...extra,
});

const GATE = Object.freeze({ args: ["scripts/test-sharded.mjs"], jobsArgs: ["--jobs", "{jobs}"] });

async function project({ test = undefined, workDir = undefined, tracked = [], git = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-190-04-layout-"));
  const work = { ...(workDir == null ? {} : { dir: workDir }), ...(test === undefined ? {} : { test }) };
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "p", resources: [], work }, null, 2)}\n`);
  for (const file of tracked) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "// fixture\n");
  }
  if (git) {
    const init = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    if (tracked.length > 0) {
      const add = spawnSync("git", ["add", "--", ...tracked], { cwd: root, encoding: "utf8" });
      assert.equal(add.status, 0, add.stderr);
    }
  }
  return root;
}

async function doctorOver(options) {
  const root = await project(options);
  try {
    return await doctor.run({ target: root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const check = (report, id) => report.checks.find((entry) => entry.id === id);
const family = (report) => report.checks.filter((entry) => entry.id.startsWith("test-layout-"));

const E1_TREE = Object.freeze([
  "test/a.test.mjs",
  "packages/work/test/one.suite.mjs",
  "packages/work/test/two.suite.mjs",
  "packages/work/test/three.suite.mjs",
  "packages/core/test/one.test.mjs",
  "packages/core/test/two.test.mjs",
]);

export const testLayoutCheckTests = [
  {
    name: "190/04-00 E1 · test files outside the declared roots and suffixes are named",
    async run() {
      const report = await doctorOver({ test: declaration({ roots: ["test"] }), tracked: E1_TREE });
      const suites = check(report, "test-layout-suites");
      assert.equal(suites?.severity, "warning", JSON.stringify(report.checks));
      assert.match(suites.message, /^5 tracked test files /u, "the count");
      const work = suites.message.indexOf("packages/work/test (3)");
      const core = suites.message.indexOf("packages/core/test (2)");
      assert.ok(work >= 0 && core > work, `largest first: ${suites.message}`);
      assert.match(suites.message, /\/aof:map-tests/u);
    },
  },
  {
    name: "190/04-00 E2 · a declaration that covers every test file is ok",
    async run() {
      const report = await doctorOver({
        test: declaration({ roots: ["test", "packages/work/test", "packages/core/test"], suiteSuffixes: [".test.mjs", ".suite.mjs"] }),
        tracked: E1_TREE,
      });
      assert.equal(check(report, "test-layout-suites")?.severity, "ok", check(report, "test-layout-suites")?.message);
    },
  },
  {
    name: "190/04-00 E3 · the language-neutral name set finds a test file outside the predicate (Examples)",
    async run() {
      for (const file of ["src/cart.spec.ts", "src/cart_test.go", "tests/test_cart.py", "src/__tests__/cart.js"]) {
        const report = await doctorOver({ test: declaration({ roots: ["src"] }), tracked: [file, "src/cart.js"] });
        const suites = check(report, "test-layout-suites");
        assert.equal(suites?.severity, "warning", `${file}: ${suites?.message}`);
        assert.match(suites.message, /^1 tracked test file is /u, `${file} is the one file counted`);
      }
    },
  },
  {
    name: "190/04-00 E4 · a test-shaped file a coupling accounts for is not counted",
    async run() {
      const report = await doctorOver({
        test: declaration({ roots: ["test"], couplings: [{ paths: ["test/fixtures/**"], suites: [], why: "fixtures no suite runs as a suite" }] }),
        tracked: ["test/fixtures/app/login.spec.ts", "test/a.test.mjs"],
      });
      assert.equal(check(report, "test-layout-suites")?.severity, "ok", check(report, "test-layout-suites")?.message);
    },
  },
  {
    name: "190/04-00 a test-shaped file under the work dir is not counted",
    async run() {
      const report = await doctorOver({
        test: declaration({ roots: ["test"] }),
        workDir: "wiki/work",
        tracked: ["wiki/work/12_milestone_x/probe.test.mjs", "test/a.test.mjs"],
      });
      assert.equal(check(report, "test-layout-suites")?.severity, "ok", check(report, "test-layout-suites")?.message);
    },
  },
  {
    name: "190/04-00 E5 · absent couplings are a question nobody has answered",
    async run() {
      const report = await doctorOver({ test: declaration(), tracked: ["test/a.test.mjs"] });
      const couplings = check(report, "test-layout-couplings");
      assert.equal(couplings?.severity, "warning");
      assert.match(couplings.message, /every changed document widens the run/u);
      assert.match(couplings.message, /\/aof:map-tests/u);
    },
  },
  {
    name: "190/04-00 E6 · empty couplings are the considered answer",
    async run() {
      const report = await doctorOver({ test: declaration({ couplings: [] }), tracked: ["test/a.test.mjs"] });
      assert.equal(check(report, "test-layout-couplings")?.severity, "ok");
    },
  },
  {
    name: "190/04-00 E7 · a declared gate that cannot resume is named (Examples)",
    async run() {
      const rows = [
        ["neither reportArgs nor filesArgs", {}],
        ["reportArgs without filesArgs", { reportArgs: ["--report-json", "{report}"] }],
        ["filesArgs without reportArgs", { filesArgs: ["--files", "{files}"] }],
      ];
      for (const [declared, extra] of rows) {
        const report = await doctorOver({ test: declaration({ gate: { ...GATE, ...extra } }), tracked: ["test/a.test.mjs"] });
        const resume = check(report, "test-layout-resume");
        assert.equal(resume?.severity, "warning", declared);
        assert.match(resume.message, /a stopped gate re-runs the whole tree/u, declared);
        assert.match(resume.message, /\/aof:map-tests/u, declared);
      }
    },
  },
  {
    name: "190/04-00 a gate declaring both templates is ok",
    async run() {
      const gate = { ...GATE, reportArgs: ["--report-json", "{report}"], filesArgs: ["--files", "{files}"] };
      const report = await doctorOver({ test: declaration({ gate }), tracked: ["test/a.test.mjs"] });
      assert.equal(check(report, "test-layout-resume")?.severity, "ok");
    },
  },
  {
    name: "190/04-00 E8 · no gate, no resume check",
    async run() {
      const report = await doctorOver({ test: declaration(), tracked: ["test/a.test.mjs"] });
      assert.equal(check(report, "test-layout-resume"), undefined);
    },
  },
  {
    name: "190/04-00 E9 · an undeclared or malformed declaration emits nothing (Examples)",
    async run() {
      for (const [state, test] of [["absent", undefined], ["declared with suiteSuffixes: [\"test.mjs\"]", declaration({ suiteSuffixes: ["test.mjs"] })]]) {
        const report = await doctorOver({ test, tracked: ["packages/x/test/a.suite.mjs"] });
        assert.deepEqual(family(report), [], state);
        // The family is advisory, so the doctor's health is what its other checks make it.
        const errors = report.checks.filter((entry) => entry.severity === "error").length;
        assert.equal(report.healthy, errors === 0, state);
        assert.equal(report.warnings, report.checks.filter((entry) => entry.severity === "warning").length, state);
      }
    },
  },
  {
    name: "190/04-00 a directory that is not a git checkout is not a finding",
    async run() {
      const report = await doctorOver({ test: declaration({ roots: ["test"] }), tracked: ["packages/x/test/a.suite.mjs"], git: false });
      const suites = check(report, "test-layout-suites");
      assert.equal(suites?.severity, "ok");
      assert.match(suites.message, /tracked files could not be listed/u);
      assert.ok(!report.checks.some((entry) => entry.id.startsWith("test-layout-") && entry.severity === "error"));
    },
  },
  // ═══════════ 190/04 task 05 (`@bug` F-05, F-06) — the doctor and the selector agree on what a suite is ══

  {
    name: "190/04-05 E1 · files the runner does not run are not reported as undeclared suites",
    async run() {
      // This repository, with its 190 declaration: the native `node:test` files under four
      // packages are excluded with a reason, so the doctor neither names them nor tells anyone to
      // declare them as suites.
      const real = await doctor.run({ target: repoRoot });
      const suites = check(real, "test-layout-suites");
      assert.equal(suites?.severity, "ok", suites?.message);
      for (const dir of ["packages/effects/test", "packages/server/test", "packages/contracts/test", "packages/messaging/test"]) {
        assert.ok(!suites.message.includes(dir), `${dir} is not named`);
      }
      // A fixture: the excluded files are not counted, and a file nothing accounts for is named
      // with both repairs, so the warning never tells anyone only to declare it a suite.
      const report = await doctorOver({
        test: declaration({ roots: ["test"], exclude: [{ paths: ["packages/native/test/**"], why: "native node:test files the per-file runner rejects" }] }),
        tracked: ["test/a.test.mjs", "packages/native/test/one.test.mjs", "packages/native/test/two.test.mjs", "packages/other/test/three.test.mjs"],
      });
      const warned = check(report, "test-layout-suites");
      assert.equal(warned?.severity, "warning", warned?.message);
      assert.match(warned.message, /^1 tracked test file is /u, "only the unaccounted file is counted");
      assert.ok(!warned.message.includes("packages/native/test"), "the excluded directory is not named");
      assert.match(warned.message, /Declare them as suites, or exclude them with a reason where the runner does not run them/u);
    },
  },
  {
    name: "190/04-05 E2 · a declared suffix defines the whole suite",
    async run() {
      const tree = ["src/cart.test.ts", "test/price.test.ts", "src/cart.ts"];
      const test = declaration({ roots: ["src", "test"], suiteSuffixes: [".test.ts"] });
      const root = await project({ test, tracked: tree });
      try {
        const out = await runTest({ scope: "all", plan: true }, { projectRoot: root, config: { work: { test } } });
        assert.equal(out.refusal, null, out.refusal?.message);
        assert.deepEqual([...out.selected], ["src/cart.test.ts", "test/price.test.ts"], "the plan's whole suite holds both .test.ts files");
        assert.equal(out.total, 2);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
      assert.equal(check(await doctorOver({ test, tracked: tree }), "test-layout-suites")?.severity, "ok", "a non-empty whole suite is ok");
      // The same tree under the default suffix selects nothing, and that is never `ok`.
      const empty = check(await doctorOver({ test: declaration({ roots: ["src", "test"] }), tracked: ["src/cart.ts", "README.md"] }), "test-layout-suites");
      assert.equal(empty?.severity, "warning", empty?.message);
      assert.match(empty.message, /the whole suite is empty/u);
    },
  },
  {
    name: "190/04-05 an excluded file leaves the whole suite, and a malformed exclusion is refused naming the key",
    async run() {
      const tree = ["test/a.test.mjs", "test/native/b.test.mjs"];
      const test = declaration({ roots: ["test"], exclude: [{ paths: ["test/native/**"], why: "native" }] });
      const root = await project({ test, tracked: tree });
      try {
        const out = await runTest({ scope: "all", plan: true }, { projectRoot: root, config: { work: { test } } });
        assert.equal(out.refusal, null, out.refusal?.message);
        assert.deepEqual([...out.selected], ["test/a.test.mjs"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
      for (const exclude of [{}, [{ paths: [], why: "x" }], [{ paths: ["a/**"] }], [{ paths: ["a/**"], why: " " }]]) {
        const compiled = resolveTestToolchain({ work: { test: declaration({ exclude }) } });
        assert.equal(compiled.ok, false, JSON.stringify(exclude));
        assert.equal(compiled.field ?? compiled.key, "work.test.exclude", JSON.stringify(compiled));
      }
    },
  },
];
