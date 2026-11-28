// Traceability wiring for milestone 210 / story 05 — bounded fix rounds.
//
//   00_fix-round-selection — a fix round reruns the failing suites plus what the fix can reach;
//   01_no-progress-stop    — a fix loop that stops converging stops itself and hands over;
//   02_pre-existing-reds   — a red that also fails on the work's base is not the story's.
//
// Every row drives `runTest` against a temporary git repository, with an injected runner whose
// output carries the light entry's `# file` lines, the real record leaf and the real scan. The
// pre-existing rows use the real baseline service, so each base is a real detached worktree.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defaultApplication as _aofApplication } from "aof/default-application";
import { runBounded } from "@aof/execution/bounded-process";
import { createTestRecord } from "@aof/work/testing/record";
import { createBaseline } from "@aof/work/testing/baseline";
import { RECORD_DOC_BY_TYPE } from "@aof/work/identity";

const { FAILED_NO_RED, FAILED_UNATTRIBUTED, FIX_ROUND_LINE, FIX_STOPPED, baselineServices, chainStop, runTest } = _aofApplication.work.commandTools.test;
const testCommand = _aofApplication.getCommand("test");
const records = createTestRecord({ runBounded });
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

const A = "test/a.test.mjs";
const B = "test/b.test.mjs";
const C = "test/c.test.mjs";
const WHOLE = Object.freeze([A, B, C]);

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});
const resolveToolchain = () => TOOLCHAIN;
const walk = async () => [...WHOLE];

async function git(cwd, args) {
  const out = await runBounded({ command: "git", args, cwd, deadlineMs: 60_000 });
  assert.equal(out.exitCode, 0, `git ${args.join(" ")} failed: ${out.stderr}`);
  return String(out.stdout).trim();
}

const COMMIT = ["-c", "user.email=aof@example.invalid", "-c", "user.name=aof", "-c", "commit.gpgsign=false", "commit", "-q", "-m"];

// b imports src/util.mjs and c imports src/other.mjs, so a change to either reaches one suite.
const SEED = Object.freeze({
  "src/util.mjs": "export const util = 1;\n",
  "src/other.mjs": "export const other = 1;\n",
  "src/note.mjs": "export const note = 1;\n",
  [A]: "export const tests = [];\n",
  [B]: 'import { util } from "../src/util.mjs";\nexport const tests = [util];\n',
  [C]: 'import { other } from "../src/other.mjs";\nexport const tests = [other];\n',
});

async function write(root, files) {
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), text, "utf8");
  }
}

async function commit(root, message) {
  await git(root, ["add", "-A"]);
  await git(root, [...COMMIT, message]);
  return await git(root, ["rev-parse", "HEAD"]);
}

async function withRepo(body, files = SEED) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-210-05-"));
  try {
    await git(root, ["init", "-q"]);
    await write(root, files);
    await commit(root, "seed");
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// THE LIGHT ENTRY'S OUTPUT: per suite, its cases in order and then its `# file` marker, so every
// failure is attributed to its suite (210/ADR-002).
function tap(bySuite) {
  const lines = ["# unit"];
  for (const [file, cases] of Object.entries(bySuite)) {
    for (const [name, ok] of cases) lines.push(ok ? `ok - ${name}` : `not ok - ${name}`, ...(ok ? [] : [`AssertionError: ${name}`]));
    lines.push(`# file ${file} 0.010 ${cases.length}`);
  }
  return lines.join("\n");
}

function observedOf(bySuite) {
  const failing = Object.values(bySuite).flat().some(([, ok]) => !ok);
  const exitCode = failing ? 1 : 0;
  return { outcome: "exited", command: "/usr/bin/node", args: [], attempted: "node scripts/test-shard.mjs", deadlineMs: 900_000, exitCode, stdout: tap(bySuite), stderr: "", verdict: failing ? "failed" : "passed", status: exitCode, message: `exited ${exitCode}` };
}

// A runner whose answer depends on the suites it is handed, and on the tree it runs in.
function runner(answer) {
  const launches = [];
  const run = async (_toolchain, files, options) => {
    launches.push({ files: [...files], cwd: options?.cwd ?? null });
    const bySuite = {};
    for (const file of files) bySuite[file] = answer(file, options?.cwd ?? "");
    return observedOf(bySuite);
  };
  return { run, launches };
}

// Failing `count` cases in `file`, named so each round's set is its own.
const failing = (count, prefix = "x") => Array.from({ length: count }, (_, index) => [`${prefix}${index + 1}`, false]);
const passing = [["passes", true]];

const deps = (root, extra = {}) => ({ projectRoot: root, config: {}, resolveToolchain, walk, record: records, ...extra });

const lastLine = (out) => testCommand.cli.render(out).split("\n").at(-1);

// Change the working tree so the next round's content key differs.
let edits = 0;
const touch = (root, rel = "src/note.mjs") => writeFile(path.join(root, rel), `export const edit = ${++edits};\n`, "utf8");

// A chain whose runs fail these counts in suite A: a named red, then a round per further count,
// each after an unrelated edit. Answers every run's result.
async function chainOf(root, counts, extra = {}) {
  const outs = [];
  for (const [index, count] of counts.entries()) {
    const stub = runner(() => (count === 0 ? passing : failing(count)));
    if (index > 0) await touch(root);
    const input = index === 0 ? { files: [A], reason: "the change" } : { failed: true };
    outs.push(await runTest(input, deps(root, { run: stub.run, ...extra })));
  }
  return outs;
}

async function storedById(root, id) {
  const store = path.join(await git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), "aof", "test-records");
  return JSON.parse(await readFile(path.join(store, `${id}.json`), "utf8"));
}

// The story whose run is open, as the story-work check answers it.
const storyAt = (root) => ({ ref: "17/02", type: "story", dir: path.join(root, "wiki/work/17/stories/02") });
const STORY_DOC = "wiki/work/17/stories/02/STORY.md";

const baselineTrees = async (root) => {
  const dir = path.join(await git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), "aof", "baselines");
  return existsSync(dir) ? (await readdir(dir)).sort() : [];
};

export const testFixRoundsTests = [
  // ── 00 · a fix round reruns the failing suites plus everything the fix can reach ──────────────
  {
    name: "210/05 E1 · the failing suite and the suite the fix reaches run, and nothing else",
    run: async () => withRepo(async (root) => {
      const red = await runTest({ files: [...WHOLE], reason: "the change" }, deps(root, { run: runner((file) => (file === A ? failing(1) : passing)).run }));
      assert.equal(red.exit, 1);
      await writeFile(path.join(root, "src/util.mjs"), "export const util = 2;\n");
      const stub = runner(() => passing);
      const out = await runTest({ failed: true }, deps(root, { run: stub.run }));
      assert.deepEqual(stub.launches.map((launch) => launch.files), [[A, B]]);
      const stored = await storedById(root, out.recorded.id);
      assert.deepEqual({ mode: stored.mode, parent: stored.parent, round: stored.round }, { mode: "failed", parent: red.recorded.id, round: 1 });
    }),
  },
  {
    name: "210/05 E2 · a round can start from a gate red",
    run: async () => withRepo(async (root) => {
      const ledger = await records.openLedger({ projectRoot: root });
      await records.writeRecord(ledger, {
        scope: "all", askedScope: "all", mode: "gate", source: "gate", item: "17", selected: "all", outcome: "exited", exit: 1, round: 0,
        failures: [A, B, C].map((file) => ({ case: `${file} breaks`, message: "red", file })),
      });
      await writeFile(path.join(root, "src/util.mjs"), "export const util = 3;\n");
      await writeFile(path.join(root, "src/other.mjs"), "export const other = 3;\n");
      const stub = runner(() => passing);
      await runTest({ failed: true }, deps(root, { run: stub.run }));
      assert.deepEqual(stub.launches.map((launch) => launch.files), [[A, B, C]]);
    }),
  },
  {
    name: "210/05 [outline] a round that cannot start is refused, and runs nothing (3 rows)",
    async run() {
      const rows = [
        { state: "no red record for this worktree", plant: async () => {}, code: FAILED_NO_RED, named: ["aof test <suite>… --reason"] },
        {
          state: "a red record for another worktree of this clone only",
          plant: async (root) => {
            const ledger = await records.openLedger({ projectRoot: root });
            await records.writeRecord({ ...ledger, worktree: path.join(root, ".git", "worktrees", "other") }, { scope: "named", selected: [A], outcome: "exited", exit: 1, failures: [{ case: "x1", file: A }] });
          },
          code: FAILED_NO_RED,
          named: ["aof test <suite>… --reason"],
        },
        {
          state: "the newest red has a failure with no suite",
          plant: async (root) => {
            const ledger = await records.openLedger({ projectRoot: root });
            await records.writeRecord(ledger, { scope: "named", selected: [A], outcome: "exited", exit: 1, failures: [{ case: "lost case", file: null }] });
          },
          code: FAILED_UNATTRIBUTED,
          named: ["lost case", "aof test <suite>… --reason"],
        },
      ];
      for (const row of rows) {
        await withRepo(async (root) => {
          await row.plant(root);
          const stub = runner(() => passing);
          const out = await runTest({ failed: true }, deps(root, { run: stub.run }));
          assert.equal(out.refusal?.code, row.code, row.state);
          for (const words of row.named) assert.ok(out.refusal.message.includes(words), `${row.state}: ${words} — ${out.refusal.message}`);
          assert.deepEqual(stub.launches, [], `${row.state}: no runner is launched`);
        });
      }
    },
  },
  {
    name: "210/05 E4 · every red summary ends with the fix-round command",
    run: async () => withRepo(async (root) => {
      const named = await runTest({ files: [A], reason: "the change" }, deps(root, { run: runner(() => failing(2)).run }));
      assert.equal(lastLine(named), FIX_ROUND_LINE);
      assert.equal(FIX_ROUND_LINE, "aof test --failed");
      await touch(root);
      const round = await runTest({ failed: true }, deps(root, { run: runner(() => failing(1)).run }));
      assert.equal(round.exit, 1);
      assert.equal(lastLine(round), FIX_ROUND_LINE);
      const green = await runTest({ files: [B], reason: "green" }, deps(root, { run: runner(() => passing).run }));
      assert.notEqual(lastLine(green), FIX_ROUND_LINE, "a green summary does not");
    }),
  },
  {
    name: "210/05 a round follows the newest red of its chain",
    run: async () => withRepo(async (root) => {
      await runTest({ files: [A, B], reason: "the change" }, deps(root, { run: runner(() => failing(1)).run }));
      await touch(root);
      const r1 = await runTest({ failed: true }, deps(root, { run: runner((file) => (file === A ? failing(1) : passing)).run }));
      assert.equal(r1.round, 1);
      await writeFile(path.join(root, "src/other.mjs"), "export const other = 4;\n");
      const stub = runner(() => passing);
      const r2 = await runTest({ failed: true }, deps(root, { run: stub.run }));
      assert.deepEqual(stub.launches.map((launch) => launch.files), [[A, C]], "A, plus the suites the changes since R1 reach");
      const stored = await storedById(root, r2.recorded.id);
      assert.deepEqual({ parent: stored.parent, round: stored.round }, { parent: r1.recorded.id, round: 2 });
    }),
  },
  {
    name: "210/05 a round whose fix touched nothing new reruns only the failing suites",
    run: async () => withRepo(async (root) => {
      const red = await runTest({ files: [A], reason: "the change" }, deps(root, { run: runner(() => failing(1)).run }));
      const stub = runner(() => passing);
      const out = await runTest({ failed: true }, deps(root, { run: stub.run }));
      assert.deepEqual(stub.launches, [], "no runner is launched");
      assert.equal(out.reused?.id, red.recorded.id, "the question is answered from the red run");
    }),
  },

  // ── 01 · a fix loop that stops converging stops itself and hands over ─────────────────────────
  {
    name: "210/05 [outline] the chain stops when its failure set stops shrinking (5 rows)",
    async run() {
      const set = (count, round) => Array.from({ length: count }, (_, index) => ({ file: A, case: `r${round}-${index}` }));
      const rows = [
        { counts: [5, 3, 1, 0], at: null },
        { counts: [4, 4, 4], at: 3 },
        { counts: [4, 4, 3, 3, 3], at: 5 },
        { counts: [4, 5], at: null },
        { counts: [4, 5, 5], at: 3 },
      ];
      for (const row of rows) {
        const fired = chainStop(row.counts.map(set), { bound: 2 });
        if (row.at == null) assert.equal(fired, null, `${row.counts.join(", ")} never stops`);
        else assert.deepEqual({ rule: fired?.rule, at: fired?.at }, { rule: "no progress", at: row.at }, row.counts.join(", "));
      }
    },
  },
  {
    name: "210/05 E6 · E12 · a stopped chain refuses the next round, twice, and the refusal is the hand-over",
    run: async () => withRepo(async (root) => {
      const outs = await chainOf(root, [4, 4, 4]);
      assert.equal(outs[1].stopped, null, "the second run does not stop");
      assert.equal(outs[2].stopped?.rule, "no progress", "the third run latches");
      assert.match(testCommand.cli.render(outs[2]), /STATE\.md/u, "the latching summary is the hand-over");
      for (const time of [1, 2]) {
        await touch(root);
        const stub = runner(() => passing);
        const out = await runTest({ failed: true }, deps(root, { run: stub.run }));
        assert.equal(out.refusal?.code, FIX_STOPPED, `refused, time ${time}`);
        for (const words of ["no progress", "4, 4, 4", "a blocker in the item's STATE.md", "the loop's question"]) assert.ok(out.refusal.message.includes(words), `${words}: ${out.refusal.message}`);
        assert.deepEqual(stub.launches, []);
      }
    }),
  },
  {
    name: "210/05 E7 · a fix that makes a new suite fail stops the chain at once",
    run: async () => withRepo(async (root) => {
      await runTest({ files: [A], reason: "the change" }, deps(root, { run: runner(() => failing(2)).run }));
      await writeFile(path.join(root, "src/other.mjs"), "export const other = 5;\n");
      const out = await runTest({ failed: true }, deps(root, { run: runner((file) => (file === C ? failing(1, "c") : failing(1))).run }));
      assert.equal(out.stopped?.rule, "new suite failing");
      assert.deepEqual([...out.stopped.suites], [C]);
    }),
  },
  {
    name: "210/05 a newly failing suite whose failures are all pre-existing does not stop the chain",
    run: async () => withRepo(async (root) => {
      const baseline = { measure: async ({ failures }) => ({ failures: failures.map((failure) => ({ ...failure, preExisting: failure.file === C })), baseline: { sha: "b".repeat(40), from: "fake" } }) };
      await runTest({ files: [A], reason: "the change" }, deps(root, { run: runner(() => failing(2)).run, baseline }));
      await writeFile(path.join(root, "src/other.mjs"), "export const other = 6;\n");
      const out = await runTest({ failed: true }, deps(root, { run: runner((file) => (file === C ? failing(1, "c") : failing(1))).run, baseline }));
      assert.equal(out.exit, 1);
      assert.equal(out.stopped, null);
    }),
  },
  {
    name: "210/05 the bound is read from its one home",
    run: async () => withRepo(async (root) => {
      const outs = await chainOf(root, [4, 4, 4, 4], { config: { work: { loop: { buildNoProgressRounds: 3 } } } });
      assert.equal(outs[2].stopped, null, "not at the third run");
      assert.deepEqual({ rule: outs[3].stopped?.rule, at: outs[3].stopped?.at }, { rule: "no progress", at: 4 }, "at the fourth");
    }),
  },
  {
    name: "210/05 E11 · after a stop, a named run with a reason starts a new chain",
    run: async () => withRepo(async (root) => {
      await chainOf(root, [4, 4, 4]);
      await touch(root);
      const stub = runner(() => failing(2));
      const named = await runTest({ files: [A], reason: "retry after reading the hand-over" }, deps(root, { run: stub.run }));
      assert.equal(stub.launches.length, 1, "the runner is launched");
      assert.equal((await storedById(root, named.recorded.id)).round, 0, "its record starts a new chain at round 0");
      await touch(root);
      const next = await runTest({ failed: true }, deps(root, { run: runner(() => failing(1)).run }));
      assert.equal(next.refusal, null, next.refusal?.message);
      assert.deepEqual({ parent: next.parent, round: next.round }, { parent: named.recorded.id, round: 1 });
    }),
  },

  // ── 02 · a red that also fails on the work's base is pre-existing ─────────────────────────────
  {
    name: "210/05 E8 · a case that fails on the base is labelled, shown apart, and not counted",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      await writeFile(path.join(root, "src/util.mjs"), "export const util = 7;\n");
      const out = await runTest({ files: [A], reason: "the change" }, deps(root, { run: runner(() => [["X", false]]).run, baseline: baselineServices, inStoryWork: async () => storyAt(root) }));
      assert.equal(out.exit, 1, "the run is still red");
      const [x] = out.report.failures;
      assert.equal(x.preExisting, true, "X is labelled pre-existing");
      const text = testCommand.cli.render(out);
      assert.doesNotMatch(text, /^not ok - X$/mu, "X is not among the story's failures");
      assert.match(text, /# pre-existing[^\n]*\n#\s+X \(test\/a\.test\.mjs\)/u, "X is shown apart");
      assert.deepEqual((await storedById(root, out.recorded.id)).failures.filter((failure) => failure.preExisting !== true), [], "X is not in the chain's failure set");
    }),
  },
  {
    name: "210/05 E9 · a case that fails only in the working tree is not labelled",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      await writeFile(path.join(root, "src/util.mjs"), "export const util = 8;\n");
      const run = runner((_file, cwd) => (cwd.includes(`${path.sep}baselines${path.sep}`) ? [["Y", true]] : [["Y", false]])).run;
      const out = await runTest({ files: [A], reason: "the change" }, deps(root, { run, baseline: baselineServices, inStoryWork: async () => storyAt(root) }));
      assert.equal(out.report.failures[0].preExisting, false);
    }),
  },
  {
    name: "210/05 E10 · a base that cannot be prepared labels every failure unmeasured",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      await writeFile(path.join(root, "src/util.mjs"), "export const util = 9;\n");
      const config = { work: { worktree: { prepare: { command: "node", args: ["-e", "process.exit(1)"], deadlineMs: 60_000 } } } };
      const out = await runTest({ files: [A], reason: "the change" }, deps(root, { config, run: runner(() => [["X", false], ["Y", false]]).run, baseline: baselineServices, inStoryWork: async () => storyAt(root) }));
      assert.deepEqual(out.report.failures.map((failure) => failure.preExisting), ["unmeasured", "unmeasured"]);
      assert.match(out.baseline.reason, /prepare step failed/u);
      assert.match(testCommand.cli.render(out), /# baseline unmeasured: the declared worktree prepare step failed/u);
      assert.deepEqual(await baselineTrees(root), [], "the half-prepared tree was removed");
    }),
  },
  {
    name: "210/05 [outline] which commit is the base (4 rows)",
    run: async () => withRepo(async (root) => {
      await write(root, { "wiki/work/17/SPEC.md": "---\ntype: milestone\n---\n" });
      const m17 = await commit(root, "m17");
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      const base17 = await commit(root, "base17");
      const items = [{ ref: "17", type: "milestone", dir: path.join(root, "wiki/work/17") }, storyAt(root)];
      const story = await baselineServices.resolveBase({ projectRoot: root, working: storyAt(root), items });
      assert.equal(story.sha, base17, "a running story's base dates its STORY.md");
      const gate = await baselineServices.resolveBase({ projectRoot: root, root: { source: "gate", item: "17" }, items });
      assert.equal(gate.sha, m17, "a gate red's base dates its milestone's SPEC.md");
      const clean = await baselineServices.resolveBase({ projectRoot: root, items });
      assert.equal(clean.sha, null);
      assert.match(clean.reason, /baseline unmeasured/u, "a clean tree with no running item has no base");
      await touch(root);
      const dirty = await baselineServices.resolveBase({ projectRoot: root, items });
      assert.equal(dirty.sha, await git(root, ["rev-parse", "HEAD"]), "an uncommitted change is measured against HEAD");
    }),
  },
  {
    name: "210/05 the base's result is reused in later rounds",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      const stub = runner(() => [["X", false]]);
      const seams = { run: stub.run, baseline: baselineServices, inStoryWork: async () => storyAt(root) };
      await touch(root);
      const first = await runTest({ files: [A], reason: "the change" }, deps(root, seams));
      assert.equal(first.report.failures[0].preExisting, true);
      await touch(root);
      const round = await runTest({ failed: true }, deps(root, seams));
      assert.equal(round.report.failures[0].preExisting, true, "the next round fails X again, pre-existing");
      assert.equal(round.baseline.answered, true, "the baseline is answered from its record");
      assert.equal(stub.launches.filter((launch) => launch.cwd.includes(`${path.sep}baselines${path.sep}`)).length, 1, "the base tree ran once");
    }),
  },
  {
    name: "210/05 a suite that does not exist at the base is not pre-existing",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      const D = "test/d.test.mjs";
      await write(root, { [D]: "export const tests = [];\n" });
      const out = await runTest({ files: [D], reason: "the new suite" }, deps(root, { walk: async () => [...WHOLE, D], run: runner(() => [["D fails", false]]).run, baseline: baselineServices, inStoryWork: async () => storyAt(root) }));
      assert.equal(out.report.failures[0].preExisting, false);
    }),
  },
  {
    name: "210/05 only the newest two baseline trees are kept",
    run: async () => withRepo(async (root) => {
      const shas = [];
      for (const name of ["b1", "b2", "b3"]) {
        await touch(root);
        shas.push(await commit(root, name));
      }
      for (const sha of shas) {
        const tree = await baselineServices.ensureTree({ projectRoot: root, sha });
        assert.equal(tree.ok, true, tree.reason);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      assert.deepEqual(await baselineTrees(root), [shas[1], shas[2]].sort());
    }),
  },
  {
    name: "210/05 @finding-F-07 · the baseline tree is added through the one worktree implementation",
    run: async () => {
      // The baseline asks its injected add, never git, for a new tree.
      const adds = [];
      const spied = createBaseline({ runBounded, addTree: async (...args) => { adds.push(args); throw new Error("planted"); } });
      await withRepo(async (root) => {
        const sha = await git(root, ["rev-parse", "HEAD"]);
        const tree = await spied.ensureTree({ projectRoot: root, sha, config: { marker: 1 } });
        assert.equal(tree.ok, false);
        assert.equal(tree.reason, "planted", "the add's own message is the reason");
        assert.equal(adds.length, 1, "the injected add is the one door");
        assert.deepEqual([adds[0][0], path.basename(adds[0][1]), adds[0][2], adds[0][3].config], [root, sha, sha, { marker: 1 }]);
        assert.deepEqual(await baselineTrees(root), [], "nothing was added behind it");
        // The assembled service's add is the execution package's: a real detached tree, listed by git.
        const real = await baselineServices.ensureTree({ projectRoot: root, sha });
        assert.equal(real.ok, true, real.reason);
        assert.match(await git(root, ["worktree", "list", "--porcelain"]), new RegExp(`HEAD ${sha}\\ndetached`, "u"));
      });
      const binding = await readFile(path.join(REPO, "packages/core/src/application/bindings/commands/test.mjs"), "utf8");
      assert.match(binding, /import \{ createWorktreeOperations \} from "@aof\/execution\/worktrees"/u, "core composes the add from the execution package");
      // arch/38 ADR-006's own detector: an argv or an exec of the add, never prose about it.
      const ADD = /["']worktree["']\s*,\s*["']add["']|\b(?:exec|execSync)\s*\(\s*["'`]git\s+worktree\s+add\b/u;
      const testing = path.join(REPO, "packages/work/src/testing");
      for (const name of (await readdir(testing)).filter((entry) => entry.endsWith(".mjs"))) {
        assert.doesNotMatch(await readFile(path.join(testing, name), "utf8"), ADD, `${name} spawns no git worktree add`);
      }
    },
  },
  {
    name: "210/05 @finding-F-08 · the working item's record doc is read from the identity leaf's one map",
    run: async () => {
      const source = await readFile(path.join(REPO, "packages/work/src/testing/baseline.mjs"), "utf8");
      assert.match(source, /import \{ RECORD_DOC_BY_TYPE \} from "\.\.\/identity\.mjs"/u);
      assert.doesNotMatch(source, /\bstory:\s*["']STORY\.md["']|\bmilestone:\s*["']SPEC\.md["']/u, "baseline.mjs declares no type → record-doc map of its own");
      // Every type the leaf maps dates its base from that doc, a type it does not map has none.
      await withRepo(async (root) => {
        for (const [type, doc] of Object.entries(RECORD_DOC_BY_TYPE)) {
          await write(root, { [`wiki/work/${type}/${doc}`]: `---\ntype: ${type}\n---\n` });
          const sha = await commit(root, type);
          const base = await baselineServices.resolveBase({ projectRoot: root, working: { ref: type, type, dir: path.join(root, "wiki/work", type) } });
          assert.deepEqual([base.sha, base.from], [sha, `${type}'s ${doc}`], `${type} dates ${doc}`);
        }
        const none = await baselineServices.resolveBase({ projectRoot: root, working: { ref: "x", type: "unmapped", dir: path.join(root, "wiki/work/x") } });
        assert.equal(none.sha, null);
      });
    },
  },
  {
    name: "210/05 @finding-F-11 · a base that lacks the working tree's instructions file is still measured",
    run: async () => withRepo(async (root) => {
      await write(root, { [STORY_DOC]: "---\ntype: story\n---\n" });
      await commit(root, "base17");
      // The working project declares its instructions file, which the base commit does not hold.
      await write(root, { "wiki/TESTING.md": "# Testing\n" });
      await git(root, ["cat-file", "-e", "HEAD:wiki/TESTING.md"]).then(() => assert.fail("the base holds no instructions file"), () => {});
      const config = { work: { test: { instructions: "wiki/TESTING.md", command: "node", args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"], roots: ["test"], deadlineMs: 900_000, report: { format: "tap" } } } };
      const run = runner((_file, cwd) => (cwd.includes(`${path.sep}baselines${path.sep}`) ? [["X", false], ["Y", true]] : [["X", false], ["Y", false]])).run;
      // The real toolchain compile, so the instructions file is checked in each tree it runs in.
      const out = await runTest({ files: [A], reason: "the change" }, deps(root, { config, resolveToolchain: undefined, run, baseline: baselineServices, inStoryWork: async () => storyAt(root) }));
      assert.equal(out.refusal, null, out.refusal?.message);
      assert.deepEqual(out.report.failures.map((failure) => [failure.case, failure.preExisting]), [["X", true], ["Y", false]], "each failure is labelled true or false");
      assert.equal(out.baseline.reason, undefined, "the base's run answered");
      assert.doesNotMatch(testCommand.cli.render(out), /unmeasured|instructions file/u, "no failure is unmeasured for a missing instructions file");
    }),
  },
];
