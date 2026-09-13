// milestone 54 / story 00 — THE CAPTURE HARNESS FOR THE REPORT-NORMALISER FIXTURES.
//
// `m38/ADR-008` is unambiguous: *wherever we do not own the PRODUCER, the contract test
// MUST be fed a REAL CAPTURED payload from that producer.* A hand-written fixture of what
// TAP "looks like" is not evidence — it is the author's belief about the producer, tested
// against itself. So every fixture beside this file is the byte-exact stdout of a real run
// of a real producer, and this script is how it was taken.
//
//   node test/fixtures/rubric-reports/capture.mjs
//
// Re-runnable by any reviewer. It rewrites every `.tap`/`.out` in this directory; a diff
// after running it is a producer whose output has moved, which is exactly the signal a
// captured fixture exists to give.
//
// THE TWO PRODUCERS, AND WHY BOTH. They disagree about TAP, and a normaliser written
// against one and asserted against a hand-made specimen of the other would ship broken and
// read as correct:
//   • node's own test runner  — `TAP version 13`, `# Subtest:` lines, ORDINALS (`ok 1 - …`),
//     a plan line (`1..1`), YAML diagnostic blocks and a `# tests`/`# suites` summary.
//   • this repo's own runner  — bare `ok - <name>` with NO ordinal (scripts/test.mjs:3821,
//     scripts/test-unit.mjs:233, test/integration/support/feature-runner.mjs:66), no plan
//     line, no summary count, and its reds on STDERR (`:3824`, `:236`, `:69`).
//
// ON THE REPO-RUNNER CAPTURES' PROVENANCE. `scripts/test.mjs` is the whole suite and this
// machine may not run it (`global-work-propagation.test.mjs` binds :4182, which the live
// control daemon holds — .claude/rules/build-deploy-restart.md). The captures below are
// therefore taken from `test/integration/support/feature-runner.mjs` — the emit loop
// `scripts/test.mjs` EMBEDS at `:3836`, and the one the suite's own integration lane runs
// through. Same format, same code, reachable by a focused door. `scripts/test.mjs`'s three
// `#` section headers (`# unit` :3815, `# integration` :3833, `# cargo` :3848) are the one
// element of its stdout no focused door reproduces; they are `#` comment lines, the same
// shape as the `# tests`/`# suites` lines fixture `node-vacuous.tap` really carries, and
// the normaliser treats every `#` line alike.
//
// PROVENANCE LIVES IN THE FIXTURE, as a leading `#` comment line naming the exact command.
// `#` is a comment in BOTH formats, so the fixture stays a valid document of its own format
// and the line is one more real thing the normaliser must decline to enumerate.
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

// Every capture runs under a throwaway global home. An unisolated aof run writes fixture
// records into the REAL ~/.aof and pollutes the live mesh store.
async function throwawayHome() {
  return mkdtemp(path.join(os.tmpdir(), "aof-capture-gh-"));
}

function write(name, command, payload) {
  const target = path.join(here, name);
  writeFileSync(target, `# captured from: ${command}\n${payload}`, "utf8");
  console.log(`captured ${name} (${payload.split(/\r?\n/).length} lines) <- ${command}`);
}

// ---------------------------------------------------------------- node's test runner ----

// (1) THE MEASURED FALSE GREEN — the run this whole milestone is built on. The subject file
// declares FOUR real arch-tests; the runner reports ONE case (the file itself), zero
// suites, and exits 0.
async function captureNodeVacuous() {
  const command = "node --test test/arch/audit/acd-controls-never-execute.test.mjs";
  const result = spawnSync(process.execPath, ["--test", "test/arch/audit/acd-controls-never-execute.test.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
  });
  write("node-vacuous.tap", command, result.stdout);
}

// (2) A MIXED RUN — a pass, a fail with a multi-line diagnostic, and a skip. The two case
// names are deliberately adversarial: the PASSING one contains the word "fail" and the
// FAILING one contains "ok", so a normaliser that reads the words in a name rather than the
// format's own marker fields gets both backwards (ADR-006 §1, FF-5408's behavioural twin).
const MIXED_TESTS = `import test from "node:test";
import assert from "node:assert/strict";

test("the grader must not read this name as a failure", () => {});

test("this one is ok to the eye and red to the runner", () => {
  assert.deepEqual({ cases: 1, suites: 0 }, { cases: 4, suites: 4 });
});

test("a case the runner was told to skip", { skip: "no rubric declared on this platform" }, () => {});
`;

async function captureNodeMixed() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-capture-mixed-"));
  const file = path.join(dir, "mixed.test.mjs");
  await writeFile(file, MIXED_TESTS, "utf8");
  try {
    const command = "node --test <a three-case file: a pass named \"…fail…\", a red named \"…ok…\", a skip> (see MIXED_TESTS in this file)";
    const result = spawnSync(process.execPath, ["--test", file], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
    });
    // The absolute temp path is the ONE thing that cannot survive a re-capture (and the one
    // thing that would put a machine's home directory in a committed fixture); the case
    // names, markers, ordinals, plan line and YAML diagnostics are all the producer's.
    write("node-mixed.tap", command, redactTemp(result.stdout, dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// (6) A PASS AND A SKIP, AND NOTHING ELSE — a skipped case is neither a pass nor a fail,
// and a report of two cases with one skipped must not read as two passes. `node-mixed.tap`
// cannot answer this: it carries a red as well, so its counts cannot isolate the skip.
const SKIP_TESTS = `import test from "node:test";

test("a case the runner ran", () => {});

test("a case the runner skipped", { skip: "no rubric declared on this platform" }, () => {});
`;

async function captureNodeSkipped() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-capture-skip-"));
  const file = path.join(dir, "skipped.test.mjs");
  await writeFile(file, SKIP_TESTS, "utf8");
  try {
    const command = "node --test <a two-case file: one run, one skipped> (see SKIP_TESTS in this file)";
    const result = spawnSync(process.execPath, ["--test", file], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
    });
    write("node-skipped.tap", command, redactTemp(result.stdout, dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// (7) A NESTED RUN — a `describe` with three `it`s, one of them red. Found at REVIEW, and
// it is the milestone's own defect shape pointed at the milestone: node emits FOUR result
// lines for THREE real tests, because the SUITE itself resolves as `ok N - <describe name>`
// alongside its children. A normaliser counting result lines would report four cases for
// three, and a rubric declaring `floor: 4` would be cleared by three tests — an inflated
// green, in the module that exists to refuse inflated greens.
//
// The producer says which is which in its OWN field: the suite's diagnostic block declares
// `type: 'suite'` where a case declares `type: 'test'`. That is ADR-006 §1 exactly — the
// subject is what the runner EMITS — so the normaliser reads that field rather than
// inferring a container from indentation or from the words in a name. The runner's own
// summary is the check: `# tests 3`, `# suites 1`.
const NESTED_TESTS = `import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("a suite whose children are the real cases", () => {
  it("the first child", () => {});

  it("the second child, which is red", () => {
    assert.equal(1, 4);
  });

  it("the third child", () => {});
});
`;

async function captureNodeNested() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-capture-nested-"));
  const file = path.join(dir, "nested.test.mjs");
  await writeFile(file, NESTED_TESTS, "utf8");
  try {
    const command = "node --test <a describe of three its, one red> (see NESTED_TESTS in this file)";
    const result = spawnSync(process.execPath, ["--test", file], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
    });
    const payload = redactTemp(result.stdout, dir);
    if (!/type: 'suite'/.test(payload)) throw new Error("the nested capture carries no `type: 'suite'` — the discriminator is gone");
    if (!/# tests 3/.test(payload) || !/# suites 1/.test(payload)) {
      throw new Error("the nested capture's own summary no longer reports 3 tests / 1 suite — the fixture's own check is stale");
    }
    write("node-nested.tap", command, payload);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------- this repo's own runner ----

// (3) A REAL, WHOLLY GREEN RUN of this repo's own format, through the focused door of the
// integration runner `scripts/test.mjs` embeds: bare `ok - <name>`, no ordinals, no plan
// line, no summary count.
async function captureRepoPassing() {
  const command = "node test/integration/cli.mjs dsl";
  const result = spawnSync(process.execPath, ["test/integration/cli.mjs", "dsl"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
  });
  write("repo-passing.out", command, result.stdout);
}

// (4) A REAL FAILING RUN, CAPTURED FROM STDOUT ONLY — the shape that makes an exit code
// worthless as evidence. This repo's runner writes `ok - <name>` to STDOUT and
// `not ok - <name>` plus the stack to STDERR, so a stdout-only capture of a failing run is
// an all-green text beside a non-zero exit, exactly.
//
// The EMIT is the shipped producer's (`runFeatureFiles`, feature-runner.mjs:54-80) — this
// harness supplies the input and takes what the producer wrote. `driver.mjs` runs in its
// own child so the capture is a real process's stdout rather than an intercepted console.
const FAILING_DRIVER = `import { runFeatureFiles } from "REPO/test/integration/support/feature-runner.mjs";
await runFeatureFiles(["FEATURE"], {
  createContext: () => ({}),
  cleanupContext: () => {},
  runStep: (_context, step) => {
    if (step.startsWith("the rubric reports a red")) throw new Error("expected 4 cases, observed 1");
  },
});
`;

const FAILING_FEATURE = `Feature: A rubric run

  Scenario: a case the runner could satisfy
    Given a declared runner
    Then it reports a green

  Scenario: a case the runner could not satisfy
    Given a declared runner
    Then the rubric reports a red

  Scenario: a second case the runner could satisfy
    Given a declared runner
    Then it reports a green
`;

async function captureRepoFailing() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-capture-failing-"));
  try {
    await mkdir(path.join(dir, "features"), { recursive: true });
    const feature = path.join(dir, "features", "rubric.feature");
    await writeFile(feature, FAILING_FEATURE, "utf8");
    const driver = path.join(dir, "driver.mjs");
    await writeFile(
      driver,
      FAILING_DRIVER.replace("REPO", pathToPosixUrl(repoRoot)).replace("FEATURE", feature.split("\\").join("\\\\")),
      "utf8",
    );
    const command = "node <driver> — the shipped runFeatureFiles (test/integration/support/feature-runner.mjs) over a 3-scenario feature whose middle step throws; STDOUT ONLY (see FAILING_DRIVER in this file)";
    const result = spawnSync(process.execPath, [driver], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
    });
    if (result.status === 0) throw new Error("the failing capture exited 0 — the planted red did not fire");
    write("repo-failing-stdout.out", command, result.stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// (5) A RUN THE DEADLINE CUT OFF — the only honest source of "a named case with no pass or
// fail marker", and the report a `runner-timeout` really leaves behind.
//
// EVERY BYTE IS THE PRODUCER'S; ONLY THE CUT IS OURS, AND IT IS A REAL BYTE BOUNDARY. This
// is `node-mixed.tap`'s own run, taken again and TRUNCATED after the `# Subtest:` line that
// announces its second case — so case 1 is resolved, case 2 is ANNOUNCED AND UNRESOLVED,
// and there is no plan line and no summary, because a killed process never writes them.
//
// Why the cut is deterministic rather than raced: node's TAP reporter announces a case
// (`# Subtest: <name>`) and resolves it (`ok`/`not ok`) in the SAME flush at completion, so
// the window a SIGKILL would have to land in is a few bytes wide and not reproducible.
// Measured here first: a `node --test` killed at 5s reported the whole file as one failed
// case with `exitCode: 143` and still wrote its plan and summary — a truncation that never
// truncated. Choosing the boundary is what makes this fixture a repeatable one; inventing
// the bytes around it is what `m38/ADR-008` forbids, and nothing here does that.
const TRUNCATE_AFTER = "# Subtest: this one is ok to the eye and red to the runner";

async function captureNodeTruncated() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-capture-truncated-"));
  const file = path.join(dir, "mixed.test.mjs");
  await writeFile(file, MIXED_TESTS, "utf8");
  try {
    const command = `node --test <the node-mixed.tap file>, truncated at a real byte boundary — after "${TRUNCATE_AFTER}" — as a killed process leaves it`;
    const result = spawnSync(process.execPath, ["--test", file], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, AOF_GLOBAL_HOME: await throwawayHome() },
    });
    const lines = redactTemp(result.stdout, dir).split(/\r?\n/);
    const cut = lines.findIndex((line) => line.trim() === TRUNCATE_AFTER);
    if (cut < 0) throw new Error(`the producer did not emit "${TRUNCATE_AFTER}" — the cut point is stale`);
    const payload = `${lines.slice(0, cut + 1).join("\n")}\n`;
    if (/^(not )?ok \d+ - this one is ok/m.test(payload)) {
      throw new Error("the cut left the second case RESOLVED — it must carry no status");
    }
    if (!/^ok 1 - the grader must not read this name as a failure$/m.test(payload)) {
      throw new Error("the cut lost the first case — a truncated report must still enumerate what completed");
    }
    write("node-truncated.tap", command, payload);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const pathToPosixUrl = (p) => `file:///${p.split("\\").join("/")}`;

// A temp directory reaches the producer's output in three spellings: raw, YAML-escaped
// (`\\`) and as a `file://` URL. All three are redacted, so a committed fixture never
// carries a machine's home directory and a re-capture diffs only on real movement.
function redactTemp(text, dir) {
  return text
    .split(dir.split("\\").join("\\\\")).join("<tmp>")
    .split(pathToPosixUrl(dir)).join("<tmp>")
    .split(dir.split("\\").join("/")).join("<tmp>")
    .split(dir).join("<tmp>");
}

await captureNodeVacuous();
await captureNodeMixed();
await captureNodeTruncated();
await captureNodeSkipped();
await captureNodeNested();
await captureRepoPassing();
await captureRepoFailing();
