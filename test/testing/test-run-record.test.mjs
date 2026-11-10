// Behavioural evidence for 190/00 — a repeat `aof test` on unchanged content is answered from the
// record of the run that already happened (ADR-001, ADR-002).
//
//   tasks/00_every-run-leaves-one-record-keyed-to-its-content.feature
//   tasks/01_a-repeat-on-the-same-content-is-answered-from-its-record.feature
//   tasks/02_callers-asking-together-make-one-run.feature
//
// Every row drives `runTest` and the record leaf against a TEMP git repository with an injected
// runner that counts its launches — never against this repository's own `.git`, whose store a
// stubbed verdict must never reach. The record leaf's git is the real one: the key is git's
// answer, and a fake git would make the key rows a test of the fake. The FF rows of each feature
// are their controls, `test/arch/testing/acd-test-record-one-writer.test.mjs` (FF-19001, FF-19004)
// and the second leg of `acd-test-command-reports-not-decides.test.mjs` (FF-19002).
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defaultApplication as _aofApplication } from "aof/default-application";
import { runBounded } from "@aof/execution/bounded-process";
import { createTestRecord } from "@aof/work/testing/record";

const runTest = _aofApplication.work.commandTools.test.runTest;
const testCommand = _aofApplication.getCommand("test");
const records = createTestRecord({ runBounded });

// ── A TEMP REPOSITORY ────────────────────────────────────────────────────────────────────────

async function git(cwd, args, env) {
  const out = await runBounded({ command: "git", args, cwd, env, deadlineMs: 60_000 });
  assert.equal(out.exitCode, 0, `git ${args.join(" ")} failed: ${out.stderr}`);
  return String(out.stdout).trim();
}

const COMMIT = ["-c", "user.email=aof@example.invalid", "-c", "user.name=aof", "-c", "commit.gpgsign=false", "commit", "-q", "-m"];

async function tempRepo(files = {}) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-190-00-"));
  await git(root, ["init", "-q"]);
  const seeded = {
    ".gitignore": "*.log\n",
    "src/a.mjs": "export const a = 1;\n",
    "test/a.test.mjs": "export const tests = [];\n",
    "test/b.test.mjs": "export const tests = [];\n",
    "wiki/work/NOTE.md": "one\n",
    ...files,
  };
  for (const [rel, text] of Object.entries(seeded)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), text, "utf8");
  }
  await git(root, ["add", "-A"]);
  await git(root, [...COMMIT, "seed"]);
  return root;
}

async function withRepo(body, files) {
  const root = await tempRepo(files);
  try {
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// The key, computed here independently of the leaf — a test that asked the leaf for the key it
// then compared the leaf's record against would prove nothing.
async function independentKey(root) {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-190-00-key-"));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") };
    await git(root, ["read-tree", "HEAD"], env);
    await git(root, ["add", "-A"], env);
    return await git(root, ["write-tree"], env);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function storeOf(root) {
  return path.join(await git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), "aof", "test-records");
}

async function storedRecords(root) {
  const store = await storeOf(root);
  if (!existsSync(store)) return [];
  const names = (await readdir(store)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => JSON.parse(await readFile(path.join(store, name), "utf8"))));
}

// ── THE SEAMS ────────────────────────────────────────────────────────────────────────────────

const WHOLE = Object.freeze(["test/a.test.mjs", "test/b.test.mjs"]);

const toolchainOf = (deadlineMs = 900_000) => () => ({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs,
    report: Object.freeze({ format: "tap" }),
  }),
});

const walk = async (_root, root) => (root === "test" ? [...WHOLE] : []);

function observed({ exitCode = 0, failing = [], passing = ["a passes"], outcome = "exited" } = {}) {
  const stdout = ["# unit", ...passing.map((name) => `ok - ${name}`)].join("\n");
  const stderr = failing.flatMap(([name, message]) => [`not ok - ${name}`, message]).join("\n");
  const code = outcome === "exited" ? (failing.length > 0 && exitCode === 0 ? 1 : exitCode) : null;
  return {
    outcome,
    command: "/usr/bin/node",
    args: ["scripts/test.mjs"],
    attempted: "/usr/bin/node scripts/test.mjs",
    deadlineMs: 900_000,
    exitCode: code,
    stdout,
    stderr,
    verdict: outcome === "exited" ? (code === 0 ? "passed" : "failed") : null,
    status: outcome === "exited" && code === 0 ? 0 : 1,
    message: outcome === "exited" ? `exited ${code}` : "did not finish within its deadline and was killed — a run that produced no verdict is a failure, never a pass",
  };
}

// A runner that counts its launches.
function counting(output = observed()) {
  const launches = [];
  return { launches, run: async (_toolchain, files) => { launches.push([...files]); return output; } };
}

// A runner that holds every launch until it is released.
function gated(output = observed()) {
  const launches = [];
  const releases = [];
  return {
    launches,
    release: () => { for (const release of releases.splice(0)) release(output); },
    run: (_toolchain, files) => new Promise((resolve) => { launches.push([...files]); releases.push(resolve); }),
  };
}

// The record leaf with a fast poll, and optionally a liveness probe, for the lock rows.
const fastRecords = (extra = {}) => ({
  ...records,
  acquire: (ledger, selection, options) => records.acquire(ledger, selection, { ...options, pollMs: 10, ...extra }),
});

function deps(root, extra = {}) {
  return {
    projectRoot: root,
    config: {},
    resolveToolchain: toolchainOf(),
    walk,
    record: records,
    ...extra,
  };
}

// The impacted scope for `--story 190/00`, with the declared set and the selector stubbed: these
// rows are about the record, not the selection.
function impacted(selected, { scope = "impacted", widened = [] } = {}) {
  return {
    readDeclared: async () => ({ ok: true, changed: Object.freeze(["src/a.mjs"]) }),
    resolveStory: async () => null,
    select: async () => Object.freeze({
      scope,
      selected: Object.freeze([...selected]),
      widened: Object.freeze([...widened]),
      builtAt: "2026-11-09T00:00:00.000Z",
      graphPath: "graphify-out/graph.json",
      refusal: null,
    }),
  };
}

const STORY_INPUT = Object.freeze({ scope: "impacted", story: "190/00" });

async function ledgerOf(root) {
  const ledger = await records.openLedger({ projectRoot: root });
  assert.equal(ledger.ok, true, "the temp repo has a key");
  return ledger;
}

// Plant a record through the one writer, as a run would have left it.
async function plant(root, { result = "green", selected = ["test/a.test.mjs"], scope = "file", widened = [], failures = [], environment = null, gate = false } = {}) {
  const ledger = await ledgerOf(root);
  const exit = result === "green" ? 0 : 1;
  return await records.writeRecord(
    environment == null ? ledger : { ...ledger, environment },
    {
      scope,
      askedScope: scope,
      selected,
      widened,
      gate,
      outcome: result === "not-finished" ? "deadline-expired" : "exited",
      failures,
      runner: { outcome: result === "not-finished" ? "deadline-expired" : "exited", exitCode: result === "not-finished" ? null : exit, message: "planted" },
      report: { ok: true, format: "tap", contradiction: false },
      exit,
      wallMs: 10,
    },
  );
}

const summary = (out) => testCommand.cli.render(out).split("\n").at(-1);

const waitUntil = async (predicate, label) => {
  for (let tries = 0; tries < 500; tries += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`timed out waiting until ${label}`);
};

export const testRunRecordTests = [
  // ── tasks/00 · every run leaves one record keyed to its content ────────────────────────────
  {
    name: "190/00 E1 · a launched run writes one record naming its content",
    run: async () => withRepo(async (root) => {
      const runner = counting();
      const out = await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: runner.run }));
      assert.equal(runner.launches.length, 1);
      const stored = await storedRecords(root);
      assert.equal(stored.length, 1, "exactly one record is added");
      const [record] = stored;
      assert.equal(record.key, await independentKey(root), "keyed to the working tree with untracked files added");
      assert.equal(record.environment.platform, process.platform);
      assert.equal(record.environment.arch, process.arch);
      assert.equal(record.environment.node, Number(process.versions.node.split(".")[0]));
      assert.equal(record.scope, "file");
      assert.deepEqual(record.selected, ["test/a.test.mjs"]);
      assert.equal(record.result, "green");
      assert.equal(record.exit, 0);
      assert.equal(out.recorded.id, record.id);
    }),
  },
  {
    name: "190/00 [outline] the key follows the content and nothing else (6 rows)",
    run: async () => {
      const rows = [
        { change: "nothing changes", act: async () => {}, same: true },
        { change: "E2 one tracked file's content changes", act: async (root) => writeFile(path.join(root, "src/a.mjs"), "export const a = 2;\n"), same: false },
        { change: "E3 a new untracked file is created", act: async (root) => writeFile(path.join(root, "notes.mjs"), "x\n"), same: false },
        { change: "a new file matching .gitignore is created", act: async (root) => writeFile(path.join(root, "build.log"), "x\n"), same: true },
        { change: "a file under wiki/work/ changes", act: async (root) => writeFile(path.join(root, "wiki/work/NOTE.md"), "two\n"), same: false },
      ];
      for (const row of rows) {
        await withRepo(async (root) => {
          const before = await records.treeKey({ projectRoot: root });
          await row.act(root);
          const after = await records.treeKey({ projectRoot: root });
          assert.equal(before.ok && after.ok, true);
          if (row.same) assert.equal(after.key, before.key, `${row.change}: the key is K`);
          else assert.notEqual(after.key, before.key, `${row.change}: the key differs from K`);
        });
      }
      await withRepo(async (root) => {
        await writeFile(path.join(root, "src/a.mjs"), "export const a = 3;\n");
        const unstaged = await records.treeKey({ projectRoot: root });
        await git(root, ["add", "src/a.mjs"]);
        const staged = await records.treeKey({ projectRoot: root });
        assert.equal(staged.key, unstaged.key, "the same change staged with git add keys the same as unstaged");
      });
    },
  },
  {
    name: "190/00 computing the key leaves the operator's index untouched",
    run: async () => withRepo(async (root) => {
      await writeFile(path.join(root, "src/a.mjs"), "export const a = 4;\n");
      await git(root, ["add", "src/a.mjs"]);
      await writeFile(path.join(root, "wiki/work/NOTE.md"), "unstaged\n");
      const cachedBefore = await git(root, ["diff", "--cached", "--name-only"]);
      const gitDir = path.join(root, ".git");
      const entriesBefore = (await readdir(gitDir)).sort();
      const keyed = await records.treeKey({ projectRoot: root });
      assert.equal(keyed.ok, true);
      assert.equal(await git(root, ["diff", "--cached", "--name-only"]), cachedBefore, "the staged set is what it was");
      assert.equal(cachedBefore, "src/a.mjs");
      assert.deepEqual((await readdir(gitDir)).sort(), entriesBefore, "no throwaway index is left in the git directory");
    }),
  },
  {
    name: "190/00 a project outside git runs and records nothing",
    run: async () => {
      const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-190-00-nogit-"));
      try {
        const runner = counting();
        const out = await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: runner.run }));
        assert.equal(runner.launches.length, 1, "the runner is launched");
        assert.equal(out.recorded, null, "no record is written");
        assert.equal(out.notRecorded, "no git");
        assert.match(summary(out), /not recorded: no git/u);
        assert.equal(existsSync(path.join(root, ".git")), false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "190/00 [outline] the record names the result of the run it records (4 rows)",
    run: async () => {
      const rows = [
        { how: "with exit 0 and no failing case", output: observed(), result: "green" },
        { how: "with a failing case", output: observed({ failing: [["a refuses", "AssertionError: no"]] }), result: "red" },
        { how: "with exit 1 and no failing case enumerated", output: observed({ exitCode: 1 }), result: "red" },
        { how: "at the toolchain deadline", output: observed({ outcome: "deadline-expired" }), result: "not-finished" },
      ];
      for (const row of rows) {
        await withRepo(async (root) => {
          await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: counting(row.output).run }));
          const [record] = await storedRecords(root);
          assert.equal(record?.result, row.result, row.how);
        });
      }
    },
  },
  {
    name: "190/00 the store keeps the newest 200 records",
    run: async () => withRepo(async (root) => {
      const ledger = await ledgerOf(root);
      const base = Date.parse("2026-11-09T00:00:00.000Z");
      const fields = { scope: "file", selected: ["test/a.test.mjs"], outcome: "exited", exit: 0 };
      for (let index = 0; index < 200; index += 1) {
        await records.writeRecord(ledger, fields, { now: () => new Date(base + index * 1000) });
      }
      const store = await storeOf(root);
      const names = async () => (await readdir(store)).filter((name) => name.endsWith(".json")).sort();
      const before = await names();
      assert.equal(before.length, 200);
      await records.writeRecord(ledger, fields, { now: () => new Date(base + 500_000) });
      const after = await names();
      assert.equal(after.length, 200, "the store holds 200 records");
      assert.equal(after.includes(before[0]), false, "the oldest record is the one that was removed");
      assert.deepEqual(after.slice(0, 199), before.slice(1));
    }),
  },

  // ── tasks/01 · a repeat on the same content is answered from its record ────────────────────
  {
    name: "190/00 E1 · the same question on the same content launches nothing",
    run: async () => withRepo(async (root) => {
      const first = counting();
      const made = await runTest(STORY_INPUT, deps(root, { run: first.run, ...impacted(["test/a.test.mjs"]) }));
      assert.equal(first.launches.length, 1);
      const repeat = counting();
      const out = await runTest(STORY_INPUT, deps(root, { run: repeat.run, ...impacted(["test/a.test.mjs"]) }));
      assert.equal(repeat.launches.length, 0, "the runner is launched 0 times");
      assert.equal(out.launched, false);
      assert.deepEqual({ id: out.reused.id, instant: out.reused.instant }, { id: made.recorded.id, instant: made.recorded.instant });
      assert.equal(summary(out).includes(`answered from the run of ${made.recorded.instant} (tree ${made.recorded.key.slice(0, 7)})`), true, summary(out));
      const json = testCommand.cli.json(out);
      assert.equal(json.reused.id, made.recorded.id);
      assert.equal(json.launched, false);
      assert.equal(out.exit, 0);
    }),
  },
  {
    name: "190/00 E4 · a record from another platform does not answer",
    run: async () => withRepo(async (root) => {
      const here = records.currentEnvironment();
      await plant(root, { environment: { ...here, platform: here.platform === "win32" ? "darwin" : "win32" } });
      const runner = counting();
      await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: runner.run }));
      assert.equal(runner.launches.length, 1, "the runner is launched once");
    }),
  },
  {
    name: "190/00 [outline] which records answer which questions (7 rows)",
    run: async () => {
      const A = "test/a.test.mjs";
      const B = "test/b.test.mjs";
      const rows = [
        { example: "E7", result: "green", scope: "all", recorded: "all", asked: [A], launches: 0 },
        { result: "green", recorded: [A, B], asked: [A], launches: 0 },
        { result: "green", recorded: [A], asked: [A, B], launches: 1 },
        { result: "green", scope: "all", recorded: "all", widened: [{ file: "x.mjs", reason: "not-in-graph" }], asked: [A], launches: 0 },
        { example: "E5", result: "red", recorded: [A, B], asked: [A, B], launches: 0 },
        { example: "E6", result: "red", recorded: [A, B], asked: [A], launches: 1 },
        { example: "E8", result: "not-finished", recorded: [A], asked: [A], launches: 1 },
      ];
      for (const row of rows) {
        await withRepo(async (root) => {
          await plant(root, { result: row.result, scope: row.scope ?? "file", selected: row.recorded, widened: row.widened ?? [] });
          const runner = counting();
          await runTest({ scope: "file", files: row.asked }, deps(root, { run: runner.run }));
          assert.equal(runner.launches.length, row.launches, `${row.example ?? ""} ${row.result} ${JSON.stringify(row.recorded)} asked ${JSON.stringify(row.asked)}`);
        });
      }
    },
  },
  {
    name: "190/00 E5 · an answered red is the recorded red",
    run: async () => withRepo(async (root) => {
      const files = ["test/a.test.mjs", "test/b.test.mjs"];
      await plant(root, { result: "red", selected: files, failures: [{ case: "b refuses x", message: "AssertionError: x was refused" }] });
      const runner = counting();
      const out = await runTest({ scope: "file", files }, deps(root, { run: runner.run }));
      assert.equal(runner.launches.length, 0);
      const text = testCommand.cli.render(out);
      assert.match(text, /^not ok - b refuses x$/mu);
      assert.match(text, /AssertionError: x was refused/u);
      assert.equal(testCommand.cli.exit(out), 1);
    }),
  },
  {
    name: "190/00 an answer carries the selection's own gate flag",
    run: async () => withRepo(async (root) => {
      await plant(root, { scope: "all", selected: "all", gate: true });
      const runner = counting();
      const out = await runTest(STORY_INPUT, deps(root, { run: runner.run, ...impacted(["test/a.test.mjs"]) }));
      assert.equal(runner.launches.length, 0, "answered from the whole run");
      assert.equal(out.gate, false, "the answer's gate is the proper subset's own");
      assert.match(summary(out), /may not stand as a verdict/u);
    }),
  },
  {
    name: "190/00 E11 · --fresh runs and says so",
    run: async () => withRepo(async (root) => {
      await plant(root, { selected: ["test/a.test.mjs"] });
      const runner = counting();
      const out = await runTest({ scope: "file", files: ["test/a.test.mjs"], fresh: true }, deps(root, { run: runner.run }));
      assert.equal(runner.launches.length, 1, "the runner is launched once");
      const fresh = (await storedRecords(root)).find((record) => record.id === out.recorded.id);
      assert.equal(fresh.fresh, true, "the new record carries fresh: true");
      assert.match(summary(out), /fresh run/u);
      assert.equal(testCommand.cli.argv([], { scope: "file", fresh: true }).fresh, true, "the flag reaches the input");
    }),
  },

  // ── tasks/02 · callers asking together make one run ────────────────────────────────────────
  {
    name: "190/00 E9 · three callers, one runner",
    run: async () => withRepo(async (root) => {
      const runner = gated();
      const calls = [0, 1, 2].map(() => runTest(STORY_INPUT, deps(root, { run: runner.run, record: fastRecords(), ...impacted(["test/a.test.mjs"]) })));
      await waitUntil(() => runner.launches.length >= 1, "the first runner starts");
      await new Promise((resolve) => setTimeout(resolve, 150));
      runner.release();
      const results = await Promise.all(calls);
      assert.equal(runner.launches.length, 1, "the runner was launched once");
      const ran = results.filter((out) => out.launched);
      const answered = results.filter((out) => out.reused != null);
      assert.equal(ran.length, 1);
      assert.equal(answered.length, 2);
      for (const out of answered) assert.equal(out.reused.id, ran[0].recorded.id, "reused names the third's record");
      assert.deepEqual(results.map((out) => out.exit), [0, 0, 0]);
    }),
  },
  {
    name: "190/00 a caller whose question the in-flight run would not answer does not wait",
    run: async () => withRepo(async (root) => {
      const runner = gated();
      const first = runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: runner.run, record: fastRecords() }));
      await waitUntil(() => runner.launches.length === 1, "the first runner starts");
      const second = runTest({ scope: "file", files: ["test/a.test.mjs", "test/b.test.mjs"] }, deps(root, { run: runner.run, record: fastRecords() }));
      await waitUntil(() => runner.launches.length === 2, "a second runner starts while the first is held");
      runner.release();
      await Promise.all([first, second]);
    }),
  },
  {
    name: "190/00 [outline] a lock nobody will release is reclaimed, never trusted (2 rows)",
    run: async () => {
      const deadlineMs = 60_000;
      const rows = [
        { example: "E10", owner: "process id names no running process", plant: { pid: 2_147_483_000, now: () => new Date() } },
        { owner: "start instant is older than the toolchain's deadlineMs", plant: { pid: process.pid, now: () => new Date(Date.now() - deadlineMs - 1000) } },
      ];
      for (const row of rows) {
        await withRepo(async (root) => {
          const ledger = await ledgerOf(root);
          const planted = await records.tryLock(ledger, ["test/a.test.mjs"], row.plant);
          assert.equal(planted.ok, true);
          const runner = counting();
          const out = await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, {
            run: runner.run,
            resolveToolchain: toolchainOf(deadlineMs),
            record: fastRecords({ isAlive: (pid) => pid === process.pid }),
          }));
          assert.equal(runner.launches.length, 1, `${row.owner}: the runner is launched once`);
          assert.equal(out.reused, null);
          assert.match(summary(out), /reclaimed a stale lock/u);
        });
      }
    },
  },
  {
    name: "190/00 a waiter that outlives the deadline runs the suite itself",
    run: async () => withRepo(async (root) => {
      const deadlineMs = 300;
      const held = gated();
      const first = runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: held.run, resolveToolchain: toolchainOf(deadlineMs), record: fastRecords() }));
      await waitUntil(() => held.launches.length === 1, "the first runner starts");
      const own = counting();
      const second = await runTest({ scope: "file", files: ["test/a.test.mjs"] }, deps(root, { run: own.run, resolveToolchain: toolchainOf(deadlineMs), record: fastRecords() }));
      assert.equal(own.launches.length, 1, "the second caller launches the runner itself");
      assert.equal(second.reused, null, "the second result is its own run");
      held.release();
      const firstOut = await first;
      assert.equal(firstOut.reused, null, "the first result is its own run");
      assert.equal(firstOut.launched && second.launched, true);
    }),
  },
];
