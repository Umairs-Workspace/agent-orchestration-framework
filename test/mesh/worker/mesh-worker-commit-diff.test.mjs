// test/mesh/worker/mesh-worker-commit-diff.test.mjs — VERIFICATION F-38.06i (live two-machine soak
// 2026-07-25). Story 07's push-home (ADR-015) shipped verified against a scripted agent
// that COMMITTED its own diff (mesh-worker-push-before-remove.test.mjs's
// `scriptedSpawnRuntimeThatCommits`). The REAL agent — interactive `claude` running a
// directive — does NOT commit: it leaves its output UNCOMMITTED in the worktree. So the
// real push carried the branch at its base commit and the worker's work stayed stranded
// (measured: a full refine — 7 stories + ADRs + ~180KB of docs — never left the Mac; the
// board read "not-started" over completed work). The fix commits the diff in the handler
// (the mesh's concern, not the agent's) right before the push. These lanes drive the REAL
// createMeshWorkerExecutionHandler over a REAL local bare origin with an agent double that
// leaves an UNCOMMITTED diff (the real producer's shape), plus scripted-exec units for the
// clean-no-op / aof-excluded / loud-failure edges.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeFile, mkdir, mkdtemp, readFile, realpath, rm, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorkspace } from "../../../src/work.mjs";
import { createMeshWorkerExecutionHandler, commitWorktreeChanges, resolveRefInWorktree } from "../../../src/mesh/worker-execution.mjs";
import { meshWorktreePath, meshItemBranchName, addDispatchWorktree, commitWorktreeChanges as commitWorktreeChangesFromHome } from "../../../src/mesh/worktree.mjs";
import { resolveRefInWorktree as resolveRefInWorktreeFromHome } from "../../../src/work/dispatch.mjs";
import { markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder } from "../../support/mesh-worker-exec-fixture.mjs";
import { withMeshWorkerPushFixture } from "../../support/mesh-worker-push-fixture.mjs";
import { spawnSyncHardened } from "../../support/cli-spawn.mjs";
import { git, writeRel as writeUnder } from "../../support/dispatch-lane-fixture.mjs";
import { stripComments, matchedParenSpan } from "../../support/source-slice.mjs";

const NODE_ID = "worker-a";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function readyFixture(fx) {
  await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
  await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
  return loadWorkspace(fx.root, undefined, { env: fx.env });
}

// A REAL git exec — every add/reset/commit/push/worktree op runs against the real repo
// and the real bare origin (no mock git). This is the seam the handler's exec + pushExec
// occupy in production.
function realGitExec(args, { cwd, env } = {}) {
  const r = spawnSyncHardened("git", args, { cwd, env, encoding: "utf8" });
  return { status: r.status ?? 1, stdout: String(r.stdout ?? ""), stderr: String(r.stderr ?? "") };
}

// The REAL agent's shape: writes files into the worktree and returns `done` WITHOUT
// committing (the exact behaviour interactive `claude` running a directive has).
function scriptedAgentUncommitted(writeFn) {
  return async (brief) => {
    await writeFn(brief.worktreeCwd);
    return { outcome: "done" };
  };
}

function driveAssignment(fx, ws, assignmentId, { spawnRuntime, now = "2026-07-18T09:00:00.000Z" } = {}) {
  const recorder = createStatusRecorder();
  const handler = createMeshWorkerExecutionHandler({
    loadWs: () => Promise.resolve(ws),
    nodeId: NODE_ID,
    sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
    spawnRuntime,
    now: () => now,
    globalWorkStoreOptions: { env: fx.env },
    exec: realGitExec,
    pushExec: realGitExec,
    requestWriteCredential: async () => null, // local bare origin needs no auth
  });
  return handler({ kind: "directive", to: NODE_ID, assignmentId, itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: now }).then(() => recorder);
}

// A scripted git exec for the UNIT edges — records argv, returns scripted status/stdout.
function scriptedExec(script = {}) {
  const calls = [];
  const exec = async (args, opts) => {
    calls.push({ args, opts });
    const sub = args.includes("commit") ? "commit" : args.includes("add") ? "add" : args.includes("reset") ? "reset" : args.includes("diff") ? "diff" : args[0];
    const r = script[sub] ?? { status: 0, stdout: "", stderr: "" };
    return { status: 0, stdout: "", stderr: "", ...r };
  };
  return { exec, calls };
}

// ── 129/03 task 00 — the move, over a REAL dispatch fixture ─────────────────────────────────
//
// `wiki/work/129_milestone_loop-concurrency/stories/03_story_the-lane-commits-and-merges-home/
//   tasks/00_commit-worktree-changes-moves-home.feature`
//
// Every git-facing scenario below runs over a REAL `git worktree` in a disposable repo (the
// dispatch-lane fixture's own argument: a scripted double asserts the fixture's opinion of git);
// the runner-resolution and failure rows use recording doubles, as the contract words them.

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

// withMoveFixture(body) — a repo at T0 holding a tracked `src/a.mjs`, `README.md`, a plain
// `wiki/work/07_m/STATE.md` (the paths-scope subject; `07_m` is not an item dir, so the work
// scanner skips it), a VALID work stream for `07/01`, a committed `.aof/aof.config.json`, and a
// dispatch worktree for `07/01` on `aof/mesh/07-01` at T0.
async function withMoveFixture(body) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-commit-move-")));
  try {
    await git(["init", "-b", "main"], root);
    await git(["config", "user.email", "fixture@aof.test"], root);
    await git(["config", "user.name", "aof fixture"], root);
    await writeUnder(root, "src/a.mjs", "export const a = 1;\n");
    await writeUnder(root, "README.md", "# fixture\n");
    await writeUnder(root, "wiki/work/07_m/STATE.md", "---\ndoc: state\n---\n\n## Notes\n\n- base note\n");
    await writeUnder(root, "wiki/work/07_milestone_m/SPEC.md", frontmatter({
      type: "milestone", number: "07", slug: "m", status: "in-progress", title: '"M"', created: "2026-09-01", updated: "2026-09-01", schema: 1,
    }));
    await writeUnder(root, "wiki/work/07_milestone_m/stories/01_story_s/STORY.md", frontmatter({
      type: "story", number: "01", slug: "s", parent: "07", status: "not-started", title: '"S"', created: "2026-09-01", updated: "2026-09-01", schema: 1,
    }));
    await writeUnder(root, ".aof/aof.config.json", `${JSON.stringify({ name: "move-fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`);
    await writeUnder(root, ".gitignore", ".aof/mesh/\n");
    await git(["add", "-A"], root);
    await git(["commit", "-m", "T0"], root);
    const t0 = (await git(["rev-parse", "HEAD"], root)).stdout.trim();
    const worktree = await addDispatchWorktree(root, "07/01", "HEAD");
    return await body({ root, worktree, t0 });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

const porcelainLines = async (cwd) => (await git(["status", "--porcelain"], cwd)).stdout.split(/\r?\n/).filter((line) => line.length > 0);
const revParse = async (cwd, ref) => (await git(["rev-parse", ref], cwd)).stdout.trim();
const nameStatus = async (cwd) => (await git(["show", "--name-status", "--format=", "HEAD"], cwd)).stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/\t/g, " "));
const nameOnly = async (cwd) => (await git(["show", "--name-only", "--format=", "HEAD"], cwd)).stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).sort();

// A recording double that answers every verb clean and stages nothing, so a run through it
// never reaches the real tree (and a commit is never attempted — the diff is empty).
function recordingDouble() {
  const calls = [];
  const exec = async (args, opts) => {
    calls.push({ args, opts });
    return { status: 0, stdout: "", stderr: "" };
  };
  return { exec, calls };
}

const DIRT_ROWS = [
  {
    dirt: "one unstaged edit to a tracked file `src/a.mjs`",
    apply: async (wt) => writeUnder(wt, "src/a.mjs", "export const a = 2;\n"),
    committedAs: ["M src/a.mjs"],
  },
  {
    dirt: "one untracked file `src/b.mjs`",
    apply: async (wt) => writeUnder(wt, "src/b.mjs", "export const b = 1;\n"),
    committedAs: ["A src/b.mjs"],
  },
  {
    dirt: "one unstaged deletion of a tracked file `src/a.mjs`",
    apply: async (wt) => unlink(path.join(wt, "src", "a.mjs")),
    committedAs: ["D src/a.mjs"],
  },
  {
    dirt: "one staged rename of `src/a.mjs` to `src/c.mjs`",
    apply: async (wt) => { await git(["mv", "src/a.mjs", "src/c.mjs"], wt); },
    committedAs: ["R100 src/a.mjs src/c.mjs"],
  },
  {
    dirt: "an edit to `src/a.mjs` and an untracked `runs/n/r1.json`",
    apply: async (wt) => { await writeUnder(wt, "src/a.mjs", "export const a = 3;\n"); await writeUnder(wt, "runs/n/r1.json", "{}\n"); },
    committedAs: ["A runs/n/r1.json", "M src/a.mjs"],
  },
];

const AOF_ROWS = [
  {
    dirt: "an edit to `.aof/aof.config.json` and an edit to `src/a.mjs`",
    apply: async (wt) => { await writeUnder(wt, ".aof/aof.config.json", "{ \"name\": \"edited\" }\n"); await writeUnder(wt, "src/a.mjs", "export const a = 9;\n"); },
    answer: { committed: true }, committed: ["src/a.mjs"], porcelainAfter: [" M .aof/aof.config.json"],
  },
  {
    dirt: "an untracked `.aof/notes.json` and an untracked `src/b.mjs`",
    apply: async (wt) => { await writeUnder(wt, ".aof/notes.json", "{}\n"); await writeUnder(wt, "src/b.mjs", "export const b = 1;\n"); },
    answer: { committed: true }, committed: ["src/b.mjs"], porcelainAfter: ["?? .aof/notes.json"],
  },
  {
    dirt: "an edit to `.aof/aof.config.json` alone",
    apply: async (wt) => writeUnder(wt, ".aof/aof.config.json", "{ \"name\": \"edited\" }\n"),
    answer: { committed: false }, committed: null, porcelainAfter: [" M .aof/aof.config.json"],
  },
];

const PATHS_ROWS = [
  { paths: ["wiki/work/07_m"], answer: { committed: true }, committed: ["wiki/work/07_m/STATE.md", "wiki/work/07_m/runs/n/r1.json"].sort(), porcelainAfter: [" M README.md"] },
  { paths: ["docs"], answer: { committed: false }, committed: null, porcelainAfter: [" M README.md", " M wiki/work/07_m/STATE.md", "?? wiki/work/07_m/runs/"] },
  { paths: undefined, answer: { committed: true }, committed: ["README.md", "wiki/work/07_m/STATE.md", "wiki/work/07_m/runs/n/r1.json"].sort(), porcelainAfter: [] },
];

export const meshWorkerCommitDiffTests = [
  {
    name: "task01/38-07 (F-38.06i) the REAL agent leaves an UNCOMMITTED diff; the handler commits it before the push, and it reaches origin — the work is no longer stranded",
    run: async () => withMeshWorkerPushFixture(async (fx) => {
      const ws = await readyFixture(fx);
      const assignmentId = "asg-uncommitted";
      const branch = meshItemBranchName(fx.itemRef);
      const worktreePath = meshWorktreePath(fx.root, assignmentId);

      const recorder = await driveAssignment(fx, ws, assignmentId, {
        spawnRuntime: scriptedAgentUncommitted(async (wt) => {
          await writeFile(path.join(wt, "refined-output.md"), "# the worker's produced work\n", "utf8");
        }),
      });

      // The done frame is sent (the loop closes), the worktree is force-removed AFTER push.
      assert.ok(recorder.frames.find((f) => f.state === "done"), "a clean done status frame was sent");
      assert.equal(existsSync(worktreePath), false, "the worktree is force-removed only after the commit+push succeeded");

      // The agent's UNCOMMITTED file now reaches origin — because the HANDLER committed it.
      const show = spawnSyncHardened("git", ["show", `${branch}:refined-output.md`], { cwd: fx.bareOrigin, encoding: "utf8" });
      assert.equal(show.status, 0, "the agent's file — which it never committed — reaches origin, committed by the handler");
      assert.equal(show.stdout, "# the worker's produced work\n");

      // …committed under the mesh identity, not a random/empty author.
      const author = spawnSyncHardened("git", ["log", "-1", "--format=%an", branch], { cwd: fx.bareOrigin, encoding: "utf8" });
      assert.ok(author.stdout.includes("aof-mesh"), "the diff is committed under the aof-mesh worker identity");
    }),
  },
  {
    name: "task01/38-07 (F-38.06i) a produce-NOTHING run makes NO empty commit — a clean done, the branch unchanged on origin",
    run: async () => withMeshWorkerPushFixture(async (fx) => {
      const ws = await readyFixture(fx);
      const assignmentId = "asg-empty";
      const branch = meshItemBranchName(fx.itemRef);

      const baseTip = spawnSyncHardened("git", ["rev-parse", "HEAD"], { cwd: fx.root, encoding: "utf8" }).stdout.trim();
      const recorder = await driveAssignment(fx, ws, assignmentId, {
        spawnRuntime: async () => ({ outcome: "done" }), // writes nothing
      });

      assert.ok(recorder.frames.find((f) => f.state === "done"), "a produce-nothing run still reports a clean done");
      // The branch on origin points at the base tip — no fabricated empty commit.
      const originTip = spawnSyncHardened("git", ["rev-parse", branch], { cwd: fx.bareOrigin, encoding: "utf8" });
      assert.equal(originTip.stdout.trim(), baseTip, "no empty commit was fabricated — the branch on origin is the base tip");
    }),
  },
  {
    name: "task01/38-07 (F-38.06i) commitWorktreeChanges: a DIRTY worktree stages all, EXCLUDES .aof, and commits under a mesh identity with --no-verify",
    run: async () => {
      const { exec, calls } = scriptedExec({ diff: { status: 0, stdout: "wiki/work/18/STORY.md\n" } });
      const result = await commitWorktreeChanges("/tmp/wt", { message: "msg", node: "worker-a", pushExec: exec });
      assert.deepEqual(result, { committed: true });
      const kinds = calls.map((c) => (c.args.includes("commit") ? "commit" : c.args[0]));
      assert.deepEqual(kinds, ["add", "reset", "diff", "commit"], "the sequence is add -A, reset -- .aof, diff --cached, commit");
      assert.deepEqual(calls[0].args, ["add", "-A"]);
      assert.deepEqual(calls[1].args, ["reset", "-q", "--", ".aof"], "aof's own config/state is never synced home");
      const commitArgs = calls[3].args;
      assert.ok(commitArgs.includes("--no-verify"), "the headless commit skips hooks the worktree cannot run");
      assert.ok(commitArgs.some((a) => a.startsWith("user.name=aof-mesh")), "committed under the aof-mesh identity");
      assert.ok(commitArgs.includes("msg"), "the given message is used");
    },
  },
  {
    name: "task01/38-07 (F-38.06i) commitWorktreeChanges: a CLEAN worktree is a no-op — { committed: false }, never an empty commit",
    run: async () => {
      const { exec, calls } = scriptedExec({ diff: { status: 0, stdout: "  \n" } }); // nothing staged
      const result = await commitWorktreeChanges("/tmp/wt", { message: "msg", node: "worker-a", pushExec: exec });
      assert.deepEqual(result, { committed: false });
      assert.ok(!calls.some((c) => c.args.includes("commit")), "no commit is ever attempted on a clean worktree");
    },
  },
  {
    name: "task01/38-07 (F-38.06i) commitWorktreeChanges: a failing git commit THROWS a coded `commit-failed` (loud, retained — never a silent done over an uncommitted diff)",
    run: async () => {
      const { exec } = scriptedExec({ diff: { status: 0, stdout: "file\n" }, commit: { status: 1, stderr: "hook rejected" } });
      await assert.rejects(
        () => commitWorktreeChanges("/tmp/wt", { message: "msg", node: "worker-a", pushExec: exec }),
        (error) => error.code === "commit-failed",
        "a non-zero git commit surfaces a coded commit-failed",
      );
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 129/03 task 00 — commitWorktreeChanges moves to src/mesh/worktree.mjs and gains a
  // paths scope; resolveRefInWorktree moves to src/work/dispatch.mjs; both re-exported
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "129/03 task 00 — the definition lives in worktree.mjs and the re-export is the same reference",
    run: async () => {
      assert.strictEqual(commitWorktreeChanges, commitWorktreeChangesFromHome, "both bindings are the same function");
      const sink = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "worker-execution.mjs"), "utf8"));
      assert.doesNotMatch(sink, /function\s+commitWorktreeChanges\b/u, "worker-execution.mjs contains no `function commitWorktreeChanges` definition");
      assert.match(sink, /export\s*\{[^}]*\bcommitWorktreeChanges\b[^}]*\}\s*from\s*["']\.\/worktree\.mjs["']/u, "worker-execution.mjs carries commitWorktreeChanges in an `export { … } from \"./worktree.mjs\"` clause");
    },
  },
  ...DIRT_ROWS.map((row) => ({
    name: `129/03 task 00 — a dirty worktree is committed under the mesh identity, whatever the dirt [${row.dirt}]`,
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      await row.apply(worktree);
      const answer = await commitWorktreeChanges(worktree, { message: "aof(loop): lane 127/02", node: "win-host-a" });
      assert.deepEqual(answer, { committed: true }, "the answer is { committed: true }");
      const head = await revParse(worktree, "HEAD");
      assert.notEqual(head, t0, "HEAD is a new commit");
      assert.equal(await revParse(worktree, "HEAD^"), t0, "…whose parent is T0");
      const log = (await git(["log", "-1", "--format=%an <%ae>%n%s"], worktree)).stdout.split(/\r?\n/);
      assert.equal(log[0], "aof-mesh (win-host-a) <aof-mesh@users.noreply.github.com>", "committed under the mesh identity, node named");
      assert.equal(log[1], "aof(loop): lane 127/02", "…with the given message");
      assert.deepEqual((await nameStatus(worktree)).sort(), [...row.committedAs].sort(), `git show --name-status lists exactly ${row.committedAs.join(" and ")}`);
      assert.deepEqual(await porcelainLines(worktree), [], "git status --porcelain in the worktree is empty");
    }),
  })),
  {
    name: "129/03 task 00 — a clean worktree is a no-op",
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      assert.deepEqual(await porcelainLines(worktree), [], "the worktree starts clean");
      const answer = await commitWorktreeChanges(worktree, { message: "m", node: "n" });
      assert.deepEqual(answer, { committed: false }, "the answer is { committed: false }");
      assert.equal(await revParse(worktree, "HEAD"), t0, "HEAD is still T0");
    }),
  },
  ...AOF_ROWS.map((row) => ({
    name: `129/03 task 00 — the .aof home is never staged [${row.dirt}]`,
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      await row.apply(worktree);
      const answer = await commitWorktreeChanges(worktree, { message: "m", node: "n" });
      assert.deepEqual(answer, row.answer, `the answer is ${JSON.stringify(row.answer)}`);
      if (row.committed == null) {
        assert.equal(await revParse(worktree, "HEAD"), t0, "no commit was made — HEAD is T0 (T0's paths)");
      } else {
        assert.notEqual(await revParse(worktree, "HEAD"), t0, "a commit was made");
        assert.deepEqual(await nameOnly(worktree), row.committed, `git show --name-only lists ${row.committed.join(", ")} only`);
      }
      assert.deepEqual(await porcelainLines(worktree), row.porcelainAfter, `git status --porcelain is exactly ${JSON.stringify(row.porcelainAfter)}`);
    }),
  })),
  ...[
    { label: "{ message, exec: double }", build: (double, other) => ({ message: "m", exec: double.exec }), receivesNone: "the real runner" },
    { label: "{ message, pushExec: double }", build: (double, other) => ({ message: "m", pushExec: double.exec }), receivesNone: "the real runner" },
    { label: "{ message, exec: double, pushExec: other }", build: (double, other) => ({ message: "m", exec: double.exec, pushExec: other.exec }), receivesNone: "other" },
  ].map((row) => ({
    name: `129/03 task 00 — the runner is resolved from exec first, then pushExec [${row.label}]`,
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      // Real dirt in the real tree: if the real runner received anything, the tree would change.
      await writeUnder(worktree, "src/a.mjs", "export const a = 2;\n");
      const before = await porcelainLines(worktree);
      const double = recordingDouble();
      const other = recordingDouble();
      const options = row.build(double, other);
      await commitWorktreeChanges(worktree, options);
      assert.ok(double.calls.length > 0, "the double received every git invocation");
      assert.deepEqual(other.calls, [], `${row.receivesNone} received none`);
      assert.deepEqual(await porcelainLines(worktree), before, "the real runner received none — the real tree is exactly as it was");
      assert.equal(await revParse(worktree, "HEAD"), t0, "…and HEAD did not move");
      for (const call of double.calls) {
        assert.equal(call.opts.cwd, worktree, `every recorded invocation's cwd is the worktree (${call.args.join(" ")})`);
        assert.equal(call.opts.env?.GIT_TERMINAL_PROMPT, "0", "…and its env carries GIT_TERMINAL_PROMPT: \"0\"");
        assert.equal(call.opts.env?.LC_ALL, "C", "…and LC_ALL: \"C\"");
        // 129/03 fix round 1, I5: the five-minute budget is the DEFAULT runner's business; an
        // injected runner is handed exactly { cwd, env }, as before the move.
        assert.deepEqual(Object.keys(call.opts).sort(), ["cwd", "env"], "an injected runner receives exactly { cwd, env }");
      }
    }),
  })),
  ...[
    { verb: "add", stderr: "index locked", names: ["git add", "index locked"], script: { add: { status: 1, stderr: "index locked" } } },
    { verb: "commit", stderr: "hook rejected", names: ["git commit", "hook rejected"], script: { diff: { status: 0, stdout: "src/a.mjs\n" }, commit: { status: 1, stderr: "hook rejected" } } },
  ].map((row) => ({
    name: `129/03 task 00 — a failing add or commit throws commit-failed with the verb named [${row.verb} / ${row.stderr}]`,
    run: async () => {
      const { exec, calls } = scriptedExec(row.script);
      await assert.rejects(
        () => commitWorktreeChanges("/tmp/wt", { message: "m", node: "n", exec }),
        (error) => {
          assert.equal(error.code, "commit-failed", "the thrown error's code is commit-failed");
          for (const name of row.names) assert.ok(error.message.includes(name), `the message names ${name}: ${error.message}`);
          return true;
        },
      );
      const last = calls[calls.length - 1];
      assert.ok(last.args.includes(row.verb), `the failing ${row.verb} was the LAST invocation — nothing ran after it`);
    },
  })),
  {
    name: "129/03 task 00 — a failing reset of the .aof home is best-effort and does not fail the commit",
    run: async () => {
      const { exec, calls } = scriptedExec({ reset: { status: 1, stderr: "pathspec did not match" }, diff: { status: 0, stdout: "src/a.mjs\n" } });
      const answer = await commitWorktreeChanges("/tmp/wt", { message: "m", node: "n", exec });
      assert.deepEqual(answer, { committed: true }, "the answer is { committed: true }");
      assert.ok(calls.some((call) => call.args.includes("commit")), "the commit invocation was made");
    },
  },
  {
    name: "129/03 task 00 — the worker's two call sites are unchanged lines",
    run: async () => {
      const sink = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "worker-execution.mjs"), "utf8"));
      const sites = [...sink.matchAll(/\bcommitWorktreeChanges\s*\(/gu)];
      assert.equal(sites.length, 2, "exactly two commitWorktreeChanges( call sites");
      for (const site of sites) {
        const span = matchedParenSpan(sink, site.index + site[0].length - 1);
        assert.ok(span != null, "the call's argument span was read");
        assert.match(span.body, /\bpushExec,?\s*\}/u, `the call passes pushExec exactly as before: ${span.body.trim().slice(0, 80)}…`);
        assert.doesNotMatch(span.body, /\bexec\s*:/u, "…and passes no exec of its own");
      }
      // …and the messages the two sites pass are the ones they passed before this story.
      assert.match(sink, /commitWorktreeChanges\(worktreePath, \{\s*message: `aof\(mesh\): \$\{itemRef\} — \$\{directiveLabel\}/u, "the done-path site is its pre-story line");
      assert.match(sink, /commitWorktreeChanges\(worktreePath, \{\s*message: `aof\(mesh\): \$\{itemRef \?\? assignmentId\} — recovery push/u, "the recovery-push site is its pre-story line");
    },
  },
  ...PATHS_ROWS.map((row) => ({
    name: `129/03 task 00 — paths scopes the stage to the named paths only [paths: ${row.paths == null ? "absent" : JSON.stringify(row.paths)}]`,
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      await writeUnder(worktree, "wiki/work/07_m/STATE.md", "---\ndoc: state\n---\n\n## Notes\n\n- base note\n- lane note\n");
      await writeUnder(worktree, "wiki/work/07_m/runs/n/r1.json", "{}\n");
      await writeUnder(worktree, "README.md", "# edited\n");
      const before = await porcelainLines(worktree);
      assert.equal(before.length, 3, `the fixture planted all three: ${JSON.stringify(before)}`);
      const answer = await commitWorktreeChanges(worktree, row.paths == null ? { message: "m" } : { message: "m", paths: row.paths });
      assert.deepEqual(answer, row.answer, `the answer is ${JSON.stringify(row.answer)}`);
      if (row.committed == null) {
        assert.equal(await revParse(worktree, "HEAD"), t0, "no commit was made — T0's paths");
        assert.deepEqual(await porcelainLines(worktree), before, "all three, unchanged");
      } else {
        assert.notEqual(await revParse(worktree, "HEAD"), t0, "a commit was made");
        assert.deepEqual(await nameOnly(worktree), row.committed, `git show --name-only lists ${row.committed.join(", ")}`);
        assert.deepEqual(await porcelainLines(worktree), row.porcelainAfter, `git status --porcelain is exactly ${JSON.stringify(row.porcelainAfter)}`);
      }
    }),
  })),
  {
    name: "129/03 task 00 (fix round 1, B1) — paths scopes the COMMIT, not only the stage: a staged out-of-scope README.md and a staged .aof/aof.config.json stay staged, and HEAD holds exactly the scope",
    run: () => withMoveFixture(async ({ worktree, t0 }) => {
      await writeUnder(worktree, "README.md", "# operator, mid-commit\n");
      await git(["add", "--", "README.md"], worktree);
      await writeUnder(worktree, ".aof/aof.config.json", "{ \"name\": \"operator-staged\" }\n");
      await git(["add", "--", ".aof/aof.config.json"], worktree);
      await writeUnder(worktree, "wiki/work/07_m/STATE.md", "---\ndoc: state\n---\n\n## Notes\n\n- base note\n- loop note\n");
      assert.deepEqual(await porcelainLines(worktree), ["M  .aof/aof.config.json", "M  README.md", " M wiki/work/07_m/STATE.md"], "the fixture planted the three: one in scope unstaged, two out of scope STAGED");
      const answer = await commitWorktreeChanges(worktree, { message: "aof(loop): own writes", paths: ["wiki/work/07_m"] });
      assert.deepEqual(answer, { committed: true }, "the answer is { committed: true }");
      assert.equal(await revParse(worktree, "HEAD^"), t0, "one commit, on T0");
      assert.deepEqual(await nameOnly(worktree), ["wiki/work/07_m/STATE.md"], "HEAD's --name-only is exactly the scope");
      assert.deepEqual(await porcelainLines(worktree), ["M  .aof/aof.config.json", "M  README.md"], "README.md is still staged (`M `) and the staged .aof/aof.config.json is still staged — the scope touched neither");
    }),
  },
  {
    name: "129/03 task 00 (fix round 1, B1) — the .aof reset is owed on the scoped door only when the scope can reach .aof: `.` resets it, `wiki/work/07_m` leaves it alone",
    run: () => withMoveFixture(async ({ worktree }) => {
      await writeUnder(worktree, ".aof/aof.config.json", "{ \"name\": \"edited\" }\n");
      await writeUnder(worktree, "wiki/work/07_m/STATE.md", "---\ndoc: state\n---\n\n## Notes\n\n- base note\n- loop note\n");
      const answer = await commitWorktreeChanges(worktree, { message: "m", paths: ["."] });
      assert.deepEqual(answer, { committed: true }, "a `.` scope commits");
      assert.deepEqual(await nameOnly(worktree), ["wiki/work/07_m/STATE.md"], "…but never the .aof home, which the reset unstaged");
      assert.deepEqual(await porcelainLines(worktree), [" M .aof/aof.config.json"], "…leaving the .aof edit unstaged, as the -A door does");
    }),
  },
  {
    name: "129/03 task 00 — resolveRefInWorktree is defined in dispatch.mjs and re-exported from the god-node",
    run: async () => {
      assert.strictEqual(resolveRefInWorktree, resolveRefInWorktreeFromHome, "both bindings are the same function");
      const sink = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "worker-execution.mjs"), "utf8"));
      assert.doesNotMatch(sink, /function\s+resolveRefInWorktree\b/u, "worker-execution.mjs contains no `function resolveRefInWorktree` definition");
      assert.doesNotMatch(sink, /function\s+worktreeWorkDir\b/u, "…and no `function worktreeWorkDir` definition");
      assert.match(sink, /export\s*\{[^}]*\bresolveRefInWorktree\b[^}]*\}\s*from\s*["']\.\.\/work\/dispatch\.mjs["']/u, "…and re-exports resolveRefInWorktree from ../work/dispatch.mjs");
      const home = stripComments(await readFile(path.join(repoRoot, "src", "work", "dispatch.mjs"), "utf8"));
      assert.match(home, /export\s+async\s+function\s+resolveRefInWorktree\b/u, "dispatch.mjs defines resolveRefInWorktree");
      assert.match(home, /export\s+function\s+worktreeWorkDir\b/u, "…and worktreeWorkDir");
      // worktree.mjs GAINS no import of ../work.mjs: its one pre-existing `loadWorkspace` import
      // line is the only one, and it takes no `findWork` — the resolver's edge is dispatch.mjs's.
      const worktreeSource = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "worktree.mjs"), "utf8"));
      const workImports = [...worktreeSource.matchAll(/^\s*import\s*\{([^}]*)\}\s*from\s*["']\.\.\/work\.mjs["']/gmu)];
      assert.equal(workImports.length, 1, "worktree.mjs carries exactly its one pre-existing ../work.mjs import line");
      assert.deepEqual(workImports[0][1].split(",").map((name) => name.trim()).filter(Boolean), ["loadWorkspace"], "…binding loadWorkspace alone, as before this story");
      assert.doesNotMatch(worktreeSource, /\bfindWork\b/u, "worktree.mjs never reaches findWork");
    },
  },
  {
    name: "129/03 task 00 — resolveRefInWorktree still answers the item as it lives in the lane",
    run: () => withMoveFixture(async ({ root, worktree }) => {
      const ws = await loadWorkspace(root);
      const item = await resolveRefInWorktree(root, ws.workDir, worktree, "07/01");
      assert.ok(item != null, "the item resolves");
      assert.equal(item.ref, "07/01", "the answer's ref is 07/01");
      const laneRoot = path.resolve(worktree) + path.sep;
      assert.ok(path.resolve(item.dir).startsWith(laneRoot), `its dir is under the lane: ${item.dir}`);
      assert.ok(!path.resolve(item.dir).startsWith(path.join(path.resolve(root), "wiki") + path.sep), "…never the primary's");
      // "Constructs no path" is proved by PLANTING one (129/03 accept, m129/F-40): a milestone-shaped
      // folder sits exactly where `path.join(<lane work dir>, "../../etc")` would land, so a resolver
      // that joined the ref text would find it. Enumerate-then-filter never looks there.
      const laneWorkDir = path.join(worktree, path.relative(root, ws.workDir));
      const planted = path.resolve(laneWorkDir, "../../etc");
      await mkdir(planted, { recursive: true });
      await writeFile(path.join(planted, "SPEC.md"), "---\ntype: milestone\nnumber: 99\nslug: planted\ntitle: planted\nstatus: not-started\n---\n# planted\n", "utf8");
      for (const traversal of ["../../etc", "/abs/outside", "01/../../..", "../../etc/"]) {
        assert.equal(await resolveRefInWorktree(root, ws.workDir, worktree, traversal), null, `a traversal ref (${traversal}) answers null even though ${planted} exists`);
      }
    }),
  },
];
