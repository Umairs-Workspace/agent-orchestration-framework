import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function: acd-loop-git-reads-once-per-step (milestone 160 / story 00; FF-16001; ADR-001) —
//
//   "Within one memoised step, no ref/topology read repeats between two writes, any write clears the
//    memo, and a failed read is never kept; one lane cycle stays under its pinned call ceiling."
//
// MEASURED AT REFINE (three wave cases, real git): one lane cycle asked `rev-parse HEAD` 28 times,
// `merge-base` 10, `worktree list` 6 and `symbolic-ref` 4, and `advanceBranchToBase` made four calls on
// a lane already at its base. The loop's port (`ctx.exec`) is wrapped once per step by `memoGitReads`
// (`packages/execution/src/worktrees.mjs`), and the two targeted cuts land beside it.
//
// PORT LEG (tasks/00) — the memo's rule over a counting double: what it keeps, what clears it, what
// it never keeps, and that a tree is part of the key.
//
// FIXTURE LEG (tasks/01) — real git, real lanes (`test/support/loop/lane-fixture.mjs`), every call the
// loop makes counted at its port: no ref read repeats in one tree between two writes, the outcome
// equals the same loop run unmemoised (`ctx.memoGitReads`, the wave's seam), the memo does not
// outlive its step, a lane at its base is answered by one question, the loop's own commit reads its
// tip from the commit, and one lane cycle stays under LANE_CYCLE_CEILING.
//
// STRUCTURAL LEG — `runWaveBuild` names `ctx.exec` once, where it builds the step port: no git verb
// in the wave is handed the raw port.
//
// Red probe (VERIFICATION.md's register): make `memoGitReads` keep a `status` answer — the port leg's
// `status --porcelain` row goes red.
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { memoGitReads } from "@aof/execution/worktrees";
import { functionBody, stripComments } from "../../support/source-slice.mjs";
import {
  withLaneRepo, fakeLaneChild, stubRubric, emits, passingTap, collector, fakeTimers, fakeSignals,
  primaryDriver, verifyCompleter, laneCtx, statusOf, git, realExec,
} from "../../support/loop/lane-fixture.mjs";

const runLoopBody = _aofApplication.loop.commandTools.loop.runLoopBody;
const advanceBranchToBase = _aofApplication.mesh.worktree.advanceBranchToBase;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOW = "2026-10-15T12:00:00.000Z";

// THE CEILING FF-16001 PINS — the git calls one lane cycle made through the loop's port when the cut
// landed (one ready story, open → drive → ladder → commit → merge → cleanup → verify), measured on the
// fixture below, 2026-10-15 on the Windows control node: 28 calls (9 `rev-parse HEAD` spawns of 47 git
// spawns in all). Unmemoised, the same run made UNMEMOISED_AT_CUT. It may only fall. 28 -> 34 is 160/01:
// the dispatch verb's own git (list, admission, the admission lock, cleanup) moved onto the port it
// used to bypass, so the port now counts calls that ran outside it; the tick's memo covers them (37 unmemoised).
const LANE_CYCLE_CEILING = 34;
const UNMEMOISED_AT_CUT = 37;

// The verb classes, as ADR-001 states them: the six memoised ref/topology reads, the four content
// reads that pass without clearing, and every other verb a write.
const MEMOISED = new Set(["rev-parse", "symbolic-ref", "merge-base", "show-ref", "rev-list"]);
const PASSED = new Set(["status", "diff", "log", "check-ignore"]);
function verbOf(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (["-c", "-C", "--git-dir", "--work-tree", "--namespace"].includes(args[index])) { index += 1; continue; }
    if (String(args[index]).startsWith("-")) continue;
    return { verb: args[index], sub: args[index + 1] ?? null };
  }
  return { verb: null, sub: null };
}
const classOf = (args) => {
  const { verb, sub } = verbOf(args);
  if (MEMOISED.has(verb) || (verb === "worktree" && sub === "list")) return "read";
  return PASSED.has(verb) ? "passed" : "write";
};
const treeOf = (cwd) => path.resolve(String(cwd ?? "")).toLowerCase();

// A counting exec over `base`: every call that reaches it, with its answer.
function counting(base) {
  const log = [];
  const exec = async (args, options = {}) => {
    const result = await base(args, options);
    log.push({ args: [...args], cwd: options.cwd, tree: treeOf(options.cwd), status: result?.status, stdout: String(result?.stdout ?? "") });
    return result;
  };
  exec.log = log;
  exec.saw = (argv, cwd) => log.filter((call) => call.args.join(" ") === argv && (cwd == null || call.cwd === cwd)).length;
  return exec;
}

// A double that answers every call status 0 with its own argv and tree, so two answers are comparable.
const echo = async (args, { cwd } = {}) => ({ status: 0, stdout: `${args.join(" ")} @ ${cwd}\n`, stderr: "" });
const split = (argv) => argv.split(" ");
const TIMES = { once: 1, twice: 2 };

// Every repeat of a ref/topology read in one tree with no write between, over the whole log.
function repeatsBetweenWrites(log) {
  const seen = new Set();
  const repeats = [];
  for (const call of log) {
    const kind = classOf(call.args);
    if (kind === "write") { seen.clear(); continue; }
    if (kind !== "read") continue;
    const key = `${call.tree}\0${call.args.join("\0")}`;
    if (seen.has(key)) repeats.push(`${call.args.join(" ")} @ ${call.cwd}`);
    seen.add(key);
  }
  return repeats;
}

// One refine_first loop over the fixture's milestone with every seam injected; `exec` is the port.
async function runLoop(fx, { exec, extra = {}, child = fakeLaneChild(fx), driver, report = collector() } = {}) {
  const drive = driver ?? primaryDriver(fx, { onCommand: verifyCompleter(fx) });
  const ctx = laneCtx(fx, { child, rubric: stubRubric(emits(passingTap())), report, driver: drive, timers: fakeTimers(), signals: fakeSignals(), now: NOW, exec, extra });
  const state = await runLoopBody({ scope: fx.milestone }, ctx);
  return { state, report };
}

// What a loop run left behind, without the ids and timestamps two repositories cannot share.
async function outcomeOf(fx, state) {
  const subjects = (await git(["log", "--format=%s", "main"], fx.root)).stdout.trim().split(/\r?\n/u);
  return {
    state: state.state,
    act: state.act?.act ?? null,
    rows: state.driven.map((row) => ({ ref: row.ref, phase: row.phase, outcome: row.outcome, cycle: row.cycle, merge: row.merge?.outcome ?? null })),
    story: await statusOf(path.join(fx.storyDir("07/01"), "STORY.md")),
    subjects,
    mergedFiles: (await git(["show", "--name-only", "--format=", "main"], fx.root)).stdout.trim().split(/\r?\n/u).map((file) => file.replace(/\/runs\/[^/]+$/u, "/runs/*")).sort(),
  };
}

// A bare repository with one commit and a lane worktree on its own branch at that commit.
async function withLane(body) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-git-memo-")));
  const primary = path.join(root, "primary");
  const lane = path.join(root, "lane");
  try {
    await git(["init", "-q", "-b", "main", primary], root);
    for (const [key, value] of [["user.email", "fixture@aof.test"], ["user.name", "aof fixture"], ["core.autocrlf", "false"]]) await git(["config", key, value], primary);
    await writeFile(path.join(primary, "a.txt"), "a\n", "utf8");
    await git(["add", "-A"], primary);
    await git(["commit", "-q", "-m", "base"], primary);
    await git(["worktree", "add", "-q", "-b", "lane", lane, "HEAD"], primary);
    const head = async (cwd) => (await git(["rev-parse", "HEAD"], cwd)).stdout.trim();
    return await body({ primary, lane, head });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

export const archTests = [
  // ── tasks/00 · a step memoises its git reads, at the port ─────────────────────────────────
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): A repeated ref read in one step reaches git once",
    run: async () => {
      const port = counting(echo);
      const exec = memoGitReads(port);
      const answers = [];
      for (let i = 0; i < 3; i += 1) answers.push(await exec(["rev-parse", "HEAD"], { cwd: "primary" }));
      assert.equal(port.saw("rev-parse HEAD", "primary"), 1, "the counting exec saw rev-parse HEAD once");
      assert.ok(answers.every((answer) => answer === answers[0]), "all three answers are the same envelope");
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): [outline] Only the ref and topology verbs are kept (10 rows)",
    run: async () => {
      const rows = [
        ["rev-parse HEAD", "once"],
        ["symbolic-ref --quiet --short HEAD", "once"],
        ["merge-base HEAD main", "once"],
        ["show-ref --verify refs/heads/main", "once"],
        ["rev-list --count main..HEAD", "once"],
        ["worktree list --porcelain", "once"],
        ["status --porcelain", "twice"],
        ["diff --cached --name-only", "twice"],
        ["log --format= -1", "twice"],
        ["check-ignore -- .claude/x.mjs", "twice"],
      ];
      for (const [argv, calls] of rows) {
        const port = counting(echo);
        const exec = memoGitReads(port);
        await exec(split(argv), { cwd: "primary" });
        await exec(split(argv), { cwd: "primary" });
        assert.equal(port.saw(argv, "primary"), TIMES[calls], `${argv}: the counting exec saw it ${calls}`);
      }
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): [outline] Any other verb clears the memo before it runs (6 rows)",
    run: async () => {
      const rows = [
        ["add -A", "lane"],
        ["-c user.name=aof-mesh commit -q -m wave", "lane"],
        ["merge --ff-only lane", "primary"],
        ["worktree add -b aof/07-01 ../lane HEAD", "primary"],
        ["reset -q -- wiki", "primary"],
        ["frobnicate --now", "lane"],
      ];
      for (const [write, where] of rows) {
        const port = counting(echo);
        const exec = memoGitReads(port);
        for (const cwd of ["primary", "lane"]) await exec(["rev-parse", "HEAD"], { cwd });
        await exec(split(write), { cwd: where });
        for (const cwd of ["primary", "lane"]) await exec(["rev-parse", "HEAD"], { cwd });
        for (const cwd of ["primary", "lane"]) assert.equal(port.saw("rev-parse HEAD", cwd), 2, `after "${write}" in the ${where}, rev-parse HEAD reached git twice in the ${cwd}`);
      }
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): A failed read is asked again",
    run: async () => {
      let first = true;
      const port = counting(async () => {
        const status = first ? 128 : 0;
        first = false;
        return { status, stdout: status === 0 ? "abc\n" : "", stderr: status === 0 ? "" : "fatal" };
      });
      const exec = memoGitReads(port);
      const one = await exec(["rev-parse", "HEAD"], { cwd: "primary" });
      const two = await exec(["rev-parse", "HEAD"], { cwd: "primary" });
      assert.deepEqual([one.status, two.status], [128, 0], "the first answer has status 128 and the second has status 0");
      assert.equal(port.saw("rev-parse HEAD"), 2, "the counting exec saw rev-parse HEAD twice");
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): The same argv in two trees is two facts",
    run: async () => {
      const port = counting(echo);
      const exec = memoGitReads(port);
      const primary = await exec(["rev-parse", "HEAD"], { cwd: "primary" });
      const lane = await exec(["rev-parse", "HEAD"], { cwd: "lane" });
      assert.equal(port.saw("rev-parse HEAD", "primary"), 1);
      assert.equal(port.saw("rev-parse HEAD", "lane"), 1, "the counting exec saw rev-parse HEAD once in each tree");
      assert.notEqual(primary.stdout, lane.stdout, "each tree has its own answer");
    },
  },

  // ── tasks/01 · a lane cycle stays under its call ceiling, on real git ─────────────────────
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): A wave tick hands one memoised port to everything it calls",
    run: async () => {
      let memoised;
      await withLaneRepo(async (fx) => {
        const exec = counting(realExec);
        const { state, report } = await runLoop(fx, { exec });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.deepEqual(repeatsBetweenWrites(exec.log), [], "no ref or topology read repeats in one tree between two writes");
        memoised = await outcomeOf(fx, state);
      }, { stories: ["01"] });
      await withLaneRepo(async (fx) => {
        const { state } = await runLoop(fx, { exec: realExec, extra: { memoGitReads: (exec) => exec } });
        assert.deepEqual(memoised, await outcomeOf(fx, state), "the outcome, records and merged commit equal those of the same loop unmemoised");
      }, { stories: ["01"] });
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): The memo does not outlive its tick",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const exec = counting(realExec);
        let operator = null;
        // The child runs between steps: the operator commits in the primary while the lane works.
        const child = fakeLaneChild(fx, { answers: { "07/01": async () => {
          await writeFile(path.join(fx.root, "operator.txt"), "operator\n", "utf8");
          await git(["add", "--", "operator.txt"], fx.root);
          await git(["commit", "-q", "-m", "operator: between ticks"], fx.root);
          operator = (await git(["rev-parse", "HEAD"], fx.root)).stdout.trim();
          return undefined;
        } } });
        const { state, report } = await runLoop(fx, { exec, child });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(operator, "the operator's commit was made");
        // Every read of the primary's HEAD, alone or as the first answer of the advance's one question.
        const heads = exec.log.filter((call) => call.tree === treeOf(fx.root) && call.status === 0 && call.args[0] === "rev-parse" && call.args[1] === "HEAD").map((call) => call.stdout.split(/\r?\n/u)[0].trim());
        assert.ok(heads.includes(operator), `a later step read the operator's commit as the primary's HEAD: ${heads.join(", ")}`);
        const row = state.driven.find((r) => r.ref === "07/01" && r.merge != null);
        assert.equal(row?.merge?.outcome, "merged", "the lane merged over the moved primary rather than fast-forwarding a stale tip");
        assert.equal((await git(["merge-base", "--is-ancestor", operator, "main"], fx.root)).status, 0, "the operator's commit is on main");
      }, { stories: ["01"] });
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): A lane already at its base is not advanced",
    run: async () => {
      await withLane(async ({ primary, lane, head }) => {
        const base = await head(primary);
        const exec = counting(realExec);
        const answer = await advanceBranchToBase(lane, base, { exec });
        assert.equal(answer.outcome, "already-current");
        assert.equal(answer.tip, base, "it answers with the lane's tip");
        assert.equal(answer.branch, "lane");
        assert.equal(exec.log.length, 1, `git was asked one question: ${exec.log.map((c) => c.args.join(" ")).join(" | ")}`);
        assert.ok(exec.log.every((call) => classOf(call.args) !== "write"), "and nothing was written");
      });
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): A lane behind its base is still fast-forwarded",
    run: async () => {
      await withLane(async ({ primary, lane, head }) => {
        await writeFile(path.join(primary, "b.txt"), "b\n", "utf8");
        await git(["add", "-A"], primary);
        await git(["commit", "-q", "-m", "ahead"], primary);
        const base = await head(primary);
        const answer = await advanceBranchToBase(lane, base, { exec: realExec });
        assert.equal(answer.outcome, "fast-forwarded");
        assert.equal(await head(lane), base, "the lane's tip is the base");
        assert.equal(answer.tip, base);
      });
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): The loop's own commit reads its tip once",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const exec = counting(realExec);
        const lines = [];
        let narrated = null;
        const report = (line) => {
          lines.push(String(line));
          if (narrated == null && String(line).startsWith("Refine phase complete")) narrated = exec.log.length;
        };
        report.lines = lines;
        const driver = primaryDriver(fx, { onCommand: async (command) => {
          if (command === "/aof:refine 07/02 --solo") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_ready.feature"), "@executable\nFeature: R\n  Scenario: r\n    Given a\n    When b\n    Then c\n", "utf8");
          await verifyCompleter(fx)(command);
        } });
        const { state } = await runLoop(fx, { exec, driver, report });
        assert.equal(state.state, "done", lines.join("\n"));
        assert.ok(narrated != null, "the refine phase narrated its commit");
        const primary = treeOf(fx.root);
        const at = exec.log.findIndex((call) => call.tree === primary && verbOf(call.args).verb === "commit" && call.args.includes("aof(loop): refine 07"));
        assert.ok(at >= 0, "the loop committed its own writes");
        const own = exec.log.slice(0, narrated).filter((call) => call.tree === primary);
        const start = own.findLastIndex((call, index) => index < own.indexOf(exec.log[at]) && classOf(call.args) === "write" && verbOf(call.args).verb !== "add");
        const span = own.slice(start + 1);
        assert.deepEqual(span.filter((call) => ["add", "commit"].includes(verbOf(call.args).verb)).map((call) => verbOf(call.args).verb), ["add", "commit"], "git saw one add and one commit");
        assert.equal(span.slice(span.findIndex((call) => verbOf(call.args).verb === "commit") + 1).filter((call) => call.args.join(" ") === "rev-parse HEAD").length, 0, "and no rev-parse HEAD after the commit");
        const sha = (await git(["log", "--format=%H", "--grep=^aof(loop): refine 07$", "main"], fx.root)).stdout.trim();
        assert.ok(lines.includes(`Refine phase complete — 1 story refined; committed ${sha}.`), `the answer names the commit that holds the records: ${lines.filter((l) => l.startsWith("Refine")).join(" | ")}`);
      }, { stories: ["01", { number: "02", tasks: false }] });
    },
  },
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): One lane cycle stays under the pinned ceiling",
    run: async () => {
      let memoised = null;
      let unmemoised = null;
      await withLaneRepo(async (fx) => {
        const exec = counting(realExec);
        const { state, report } = await runLoop(fx, { exec });
        assert.equal(state.state, "done", report.lines.join("\n"));
        memoised = exec.log.length;
      }, { stories: ["01"] });
      await withLaneRepo(async (fx) => {
        const exec = counting(realExec);
        await runLoop(fx, { exec, extra: { memoGitReads: (port) => port } });
        unmemoised = exec.log.length;
      }, { stories: ["01"] });
      assert.ok(memoised <= LANE_CYCLE_CEILING, `the git calls made (${memoised}) are no more than the ceiling FF-16001 pins (${LANE_CYCLE_CEILING}); unmemoised ${unmemoised}`);
      assert.ok(LANE_CYCLE_CEILING < UNMEMOISED_AT_CUT && memoised < unmemoised, `the ceiling (${LANE_CYCLE_CEILING}) is the measured cut below the unmemoised count (${UNMEMOISED_AT_CUT} at the cut, ${unmemoised} now)`);
    },
  },

  // ── structural ────────────────────────────────────────────────────────────────────────────
  {
    name: "arch/160 FF-16001 (acd-loop-git-reads-once-per-step): structural — runWaveBuild names ctx.exec once, where it builds the step port",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, "packages/work-loop/src/wave.mjs"), "utf8"));
      const body = functionBody(code, "async function runWaveBuild(");
      assert.ok(body != null, "runWaveBuild was found");
      const uses = body.match(/\bctx\.exec\b/gu) ?? [];
      assert.equal(uses.length, 1, "ctx.exec is named once in runWaveBuild");
      assert.match(body, /const portExec = resolveExec\(\{ exec: ctx\.exec \}\);/u, "…and that once builds the port the step memo wraps");
      assert.match(body, /const stepExec = \(\) => memo\(portExec\);/u, "every step takes a fresh memo over the port");
    },
  },
];
