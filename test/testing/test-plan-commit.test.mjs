import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 190 / story 04 task 02 — a commit's selection is replayed
// without running anything (190/ADR-008 §2).
//
// Covers every @executable scenario in
//   tasks/02_a-commit-is-replayed-without-running-anything.feature
//
// EVERY CHANGED SET HERE IS GIT'S. Each case builds a scratch repository with known commits and
// lets the shipped changed-set reader answer `--commit`, so the first-parent diff, the root commit
// and the unresolvable revision are git's own answers rather than a stub's. The graph is a real
// artifact on disk, read back through the shipped reader. The runner and the record store are the
// two seams stubbed, and both are SPIES: "the stub runner was not launched" and "the record store
// holds no new record" are claims about what ran, so they are measured, not read off the source.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { graphJsonPath } from "@aof/knowledge/graph-normalize";
const COMMIT_NEEDS_PLAN = _aofApplication.work.commandTools.test.COMMIT_NEEDS_PLAN;
const STORY_AND_SINCE = _aofApplication.work.commandTools.test.STORY_AND_SINCE;
const SINCE_REV_UNRESOLVABLE = _aofApplication.work.testSelect.SINCE_REV_UNRESOLVABLE;
const runTest = _aofApplication.work.commandTools.test.runTest;
const testCommand = _aofApplication.getCommand("test");

const WHOLE = Object.freeze(["test/a.test.mjs", "test/b.test.mjs", "test/c.test.mjs"]);

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    suiteSuffixes: Object.freeze([".test.mjs"]),
    couplings: Object.freeze([]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});

function git(root, ...args) {
  const result = spawnSync("git", ["-c", "user.name=aof", "-c", "user.email=aof@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

async function put(root, file, body = "export const value = 1;\n") {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), body, "utf8");
}

// A raw node_link_data artifact where the shipped reader looks for it: `a` and `b` import the
// library, `c` imports nothing.
async function writeGraph(root) {
  const nodes = ["src/lib.mjs", ...WHOLE];
  await mkdir(path.join(root, "graphify-out"), { recursive: true });
  await writeFile(graphJsonPath(root), JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: nodes.map((file, index) => ({ id: `n${index}`, label: file, source_file: file })),
    links: [1, 2].map((from) => ({ source: `n${from}`, target: "n0", relation: "imports", confidence: "EXPLICIT" })),
  }), "utf8");
}

// A repository whose first commit holds the library and the three suites, and whose second
// changes only the library. The graph artifact is ignored, as a real one is.
async function history(root) {
  git(root, "init", "-q", "-b", "main");
  await put(root, ".gitignore", "graphify-out/\n");
  await put(root, "src/lib.mjs");
  for (const suite of WHOLE) await put(root, suite, "import '../src/lib.mjs';\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "first");
  await put(root, "src/lib.mjs", "export const value = 2;\n");
  git(root, "commit", "-q", "-am", "change the library");
  await writeGraph(root);
  return git(root, "rev-parse", "HEAD");
}

const withRoot = (body) => async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-190-04-plan-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

function spies({ answer = null } = {}) {
  const launched = [];
  const touched = [];
  const record = {
    openLedger: async (...args) => { touched.push(["openLedger", args]); return { ok: true }; },
    acquire: async (...args) => { touched.push(["acquire", args]); return { answer, lock: null, reclaimed: false }; },
    tryLock: async (...args) => { touched.push(["tryLock", args]); return null; },
    writeRecord: async (...args) => { touched.push(["writeRecord", args]); return { id: "r", instant: "now", key: "k", result: "passed" }; },
    releaseLock: async () => {},
  };
  const run = async (_toolchain, files) => { launched.push([...files]); throw new Error("the runner was launched"); };
  return { launched, touched, record, run };
}

async function invoke(root, input, seams = spies()) {
  const out = await runTest(input, {
    projectRoot: root,
    config: {},
    resolveToolchain: () => TOOLCHAIN,
    walk: async () => WHOLE,
    run: seams.run,
    record: seams.record,
  });
  return out;
}

export const testPlanCommitTests = [
  {
    name: "190/04-02 E10 · a planned selection launches nothing and writes no record",
    run: withRoot(async (root) => {
      const sha = await history(root);
      const seams = spies();
      const out = await invoke(root, { scope: "impacted", commit: sha, plan: true }, seams);
      assert.equal(out.refusal, null, out.refusal?.message);
      assert.deepEqual([...out.changed], ["src/lib.mjs"]);
      assert.deepEqual([...out.selected], ["test/a.test.mjs", "test/b.test.mjs"]);
      for (const entry of out.selectedBy) assert.deepEqual(entry.because.map((item) => item.reason), ["graph-dependent"], entry.suite);
      assert.deepEqual(seams.launched, [], "the stub runner was not launched");
      assert.deepEqual(seams.touched, [], "the record store was not asked anything, so it holds no new record");
      assert.equal(out.plan, true);
      assert.equal(out.launched, false);
      assert.equal(out.recorded, null);
    }),
  },
  {
    name: "190/04-02 a planned selection that widens says why",
    run: withRoot(async (root) => {
      await history(root);
      await put(root, "schemas/aof.schema.json", "{}\n");
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "a schema");
      const seams = spies();
      const out = await invoke(root, { scope: "impacted", commit: "HEAD", plan: true }, seams);
      assert.equal(out.scope, "all");
      assert.deepEqual(out.widened.map(({ file, reason }) => ({ file, reason })), [{ file: "schemas/aof.schema.json", reason: "not-in-graph" }]);
      assert.deepEqual(seams.launched, []);
    }),
  },
  {
    name: "190/04-02 a plan is not answered from a record",
    run: withRoot(async (root) => {
      await history(root);
      await put(root, "src/lib.mjs", "export const value = 3;\n");
      const answer = { id: "green", instant: "2026-11-10T00:00:00.000Z", key: "0123456789abcdef", result: "passed", exit: 0, failures: [], runner: null, report: { ok: true } };
      const seams = spies({ answer });
      const out = await invoke(root, { scope: "impacted", plan: true }, seams);
      assert.equal(out.refusal, null, out.refusal?.message);
      assert.deepEqual([...out.selected], ["test/a.test.mjs", "test/b.test.mjs"], "the selection is computed");
      assert.equal(out.reused, null, "not answered from a record");
      assert.deepEqual(seams.touched, [], "the record was never looked up");
      assert.doesNotMatch(testCommand.cli.render(out), /answered from the run of/u);
    }),
  },
  {
    name: "190/04-02 E11 · one changed-set source per run (Examples)",
    run: withRoot(async (root) => {
      await history(root);
      for (const [flag, other] of [["--story", { story: "190/04" }], ["--since", { since: "HEAD~1" }]]) {
        const seams = spies();
        const out = await invoke(root, { scope: "impacted", plan: true, commit: "HEAD", ...other }, seams);
        assert.equal(out.refusal?.code, STORY_AND_SINCE, flag);
        assert.match(out.refusal.message, /--commit/u, flag);
        assert.ok(out.refusal.message.includes(flag), `${flag} is named`);
        assert.deepEqual(seams.launched, [], flag);
      }
    }),
  },
  {
    name: "190/04-02 E12 · a past commit's selection is never run",
    run: withRoot(async (root) => {
      await history(root);
      const seams = spies();
      const out = await invoke(root, { scope: "impacted", commit: "HEAD~1" }, seams);
      assert.equal(out.refusal?.code, COMMIT_NEEDS_PLAN);
      assert.match(out.refusal.message, /a run is always of the working tree/u);
      assert.match(out.refusal.message, /--plan/u);
      assert.deepEqual(seams.launched, []);
    }),
  },
  {
    name: "190/04-02 E13 · a merge commit is diffed against its first parent",
    run: withRoot(async (root) => {
      await history(root);
      git(root, "checkout", "-q", "-b", "side");
      await put(root, "src/a.mjs");
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "side adds a");
      git(root, "checkout", "-q", "main");
      await put(root, "README.md", "main moves on\n");
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "main moves on");
      git(root, "merge", "-q", "--no-ff", "-m", "merge side", "side");
      const out = await invoke(root, { scope: "impacted", commit: "HEAD", plan: true });
      assert.ok(out.changed.includes("src/a.mjs"), JSON.stringify(out.changed));
      assert.ok(!out.changed.includes("README.md"), "the first parent already held README.md");
    }),
  },
  {
    name: "190/04-02 an unknown revision is refused by name",
    run: withRoot(async (root) => {
      await history(root);
      const out = await invoke(root, { scope: "impacted", commit: "no-such-rev", plan: true });
      assert.equal(out.refusal?.code, SINCE_REV_UNRESOLVABLE);
      assert.match(out.refusal.message, /no-such-rev/u);
      assert.match(out.refusal.message, /does not resolve/u);
    }),
  },
  {
    name: "190/04-02 the human summary of a plan",
    run: withRoot(async (root) => {
      const sha = await history(root);
      const out = await invoke(root, { scope: "impacted", commit: sha, plan: true });
      const summary = testCommand.cli.render(out).split("\n").at(-1);
      assert.match(summary, /^plan: 2\/3 suites /u, summary);
      assert.match(summary, /nothing ran$/u, summary);
    }),
  },
];
