// test/grade/gate-propagation-refusals-leave-branch.test.mjs — traceability for milestone 43 /
// story 05 (gate-time propagation), task
//   wiki/work/43_milestone_mesh-artifact-authority/stories/05_story_gate-propagation/
//     tasks/01_advance-refusals-leave-the-branch-untouched.feature
//
// The two preconditions of the advance, each a LOUD CODED REFUSAL that leaves the branch
// byte-unchanged: `assignment-gate-propagation-dirty-worktree` (never check out or merge
// over uncommitted work) and `assignment-gate-propagation-conflict` (a conflicting merge is
// `git merge --abort`ed, because handing an agent a half-merged tree is strictly worse than
// not propagating). Every Then is read back from real git state after the dispatch returns —
// the branch tip against a hash captured BEFORE, `git status --porcelain`, the absence of
// MERGE_HEAD, the working files' BYTES — plus the settled assignment state and code from the
// recorded status/effect frames.
//
// ALTITUDE (the feature's own FEASIBILITY NOTE + ADR-010 R5.2, honoured rather than worked
// around): the dispatch path ALWAYS materializes a FRESH worktree (`reuseWorktreeOnBranch`
// releases any holder, prunes, then `git worktree add`), so a dirty tree is not reachable at
// dispatch altitude by ordinary means. This file therefore exercises the dirty guard TWICE,
// and neither is a substitute for the other:
//   (a) at the SEAM's own altitude — `advanceBranchToBase` called directly against a
//       worktree the fixture dirtied, which is where the guard lives and the only altitude
//       at which its byte-level "untouched" proof is meaningful; and
//   (b) at DISPATCH altitude — the uncommitted work is planted through the injected exec
//       seam at the instant the worktree is materialized (the moment an operator's leftovers
//       would already be there), so the settle/never-spawn/retain half of the contract is
//       proven through the real handler exactly as the scenario words it.
// The conflict refusal is routinely reachable at dispatch altitude and is driven there.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { meshWorktreePath, listWorktrees, advanceBranchToBase, addDispatchWorktree } from "../../src/mesh/worktree.mjs";
import {
  withGatePropagationFixture,
  buildItemLine,
  createGateDispatch,
  recordingGitExec,
  dirtyWorktree,
  captureWorktreeState,
  git,
  gitOk,
  revParse,
  isAncestor,
  settledFrame,
  GATE_EDITED_PATH,
  CONTESTED_PATH,
  DOOMED_PATH,
} from "../support/gate-propagation-fixture.mjs";

const NOW = "2026-08-04T09:00:00.000Z";
const DIRTY = "assignment-gate-propagation-dirty-worktree";
const CONFLICT = "assignment-gate-propagation-conflict";

// mergeHeadAbsent(cwd) — `git rev-parse -q --verify MERGE_HEAD` exits non-zero: the repo is
// NOT left in a MERGING state.
function mergeHeadAbsent(cwd) {
  return git(cwd, ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).status !== 0;
}

// unmergedEntries(cwd) — the `U*` / `*U` / `AA` / `DD` porcelain lines a half-applied merge
// would leave behind.
function unmergedEntries(cwd) {
  return git(cwd, ["status", "--porcelain"]).stdout
    .split(/\r?\n/)
    .filter((line) => /^(U.|.U|AA|DD)/.test(line));
}

// conflictMarkersAnywhere(dir) — a real recursive scan of the worktree's files (never a
// single named path): `<<<<<<<`, `=======`, `>>>>>>>` must exist NOWHERE after the abort.
async function conflictMarkersAnywhere(dir) {
  const hits = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === ".aof" || entry.name === "node_modules") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      const body = await readFile(full, "utf8").catch(() => "");
      if (/^<{7}/m.test(body) || /^={7}$/m.test(body) || /^>{7}/m.test(body)) hits.push(full);
    }
  };
  await walk(dir);
  return hits;
}

// plantDirt(worktreePath, mode) — the dispatch-altitude hook: the uncommitted work appears
// the instant the worktree is materialized, and the BEFORE snapshot is taken right there,
// so "identical to the capture" is a real comparison rather than a re-derivation.
function plantDirt(worktreePath, mode, box) {
  return async () => {
    if (!existsSync(worktreePath) || box.planted) return;
    box.planted = true;
    await dirtyWorktree(worktreePath, { mode });
    box.before = await captureWorktreeState(worktreePath);
  };
}

// ── 129/03 task 01 — advanceBranchToBase gains a dirtyPolicy, and strict stays byte-identical ──
//
// `wiki/work/129_milestone_loop-concurrency/stories/03_story_the-lane-commits-and-merges-home/
//   tasks/01_advance-branch-gains-a-dirty-policy.feature`
//
// Over a REAL dispatch fixture: a repo at B0 (`README.md`, `src/x.mjs`, `src/n.mjs`), a
// dispatch worktree for `127/02` on `aof/mesh/127-02` cut from B0, and the primary moved to B1,
// which modifies `src/x.mjs` and adds `src/new.mjs`. Every Then is read back from git.

const BAD_OPTION = "gate-propagation-bad-option";

async function writeRel(root, rel, body) {
  const target = path.join(root, ...rel.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, "utf8");
}

// `b1Adds` — extra paths B1 adds beyond `src/new.mjs` (the I1 row needs B1 to add a file in a
// directory the worktree holds wholly untracked).
async function withDirtyPolicyFixture(body, { b1Adds = [] } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-dirty-policy-")));
  try {
    gitOk(root, ["init", "-b", "main"]);
    gitOk(root, ["config", "user.email", "fixture@aof.test"]);
    gitOk(root, ["config", "user.name", "aof fixture"]);
    await writeRel(root, "README.md", "# fixture\n");
    await writeRel(root, "src/x.mjs", "export const x = 0;\n");
    await writeRel(root, "src/n.mjs", "export const n = 0;\n");
    await writeRel(root, ".aof/aof.config.json", `${JSON.stringify({ name: "dirty-policy-fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`);
    await writeRel(root, ".gitignore", ".aof/mesh/\n");
    gitOk(root, ["add", "-A"]);
    gitOk(root, ["commit", "-m", "B0"]);
    const b0 = revParse(root, "HEAD");
    const worktree = await addDispatchWorktree(root, "127/02", "HEAD");
    await writeRel(root, "src/x.mjs", "export const x = 1; // B1\n");
    await writeRel(root, "src/new.mjs", "export const added = true;\n");
    for (const rel of b1Adds) await writeRel(root, rel, `// B1 adds ${rel}\n`);
    gitOk(root, ["add", "-A"]);
    gitOk(root, ["commit", "-m", "B1"]);
    const b1 = revParse(root, "HEAD");
    return await body({ root, worktree, b0, b1 });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

const porcelainOf = (cwd) => git(cwd, ["status", "--porcelain"]).stdout;
const porcelainLinesOf = (cwd) => porcelainOf(cwd).split(/\r?\n/).filter((line) => line.length > 0);

// The dirt vocabulary the outlines share — one applier per phrase, applied INSIDE the worktree.
const DIRT = {
  "an unstaged edit to `README.md`": async (wt) => writeRel(wt, "README.md", "# edited\n"),
  "a staged edit to `README.md`": async (wt) => { await writeRel(wt, "README.md", "# edited\n"); gitOk(wt, ["add", "--", "README.md"]); },
  "a staged new file `src/added.mjs`": async (wt) => { await writeRel(wt, "src/added.mjs", "export const added = 1;\n"); gitOk(wt, ["add", "--", "src/added.mjs"]); },
  "an unstaged deletion of `README.md`": async (wt) => unlink(path.join(wt, "README.md")),
  "a staged deletion of `README.md`": async (wt) => { gitOk(wt, ["rm", "-q", "--", "README.md"]); },
  "a staged rename of `README.md` to `README2.md`": async (wt) => { gitOk(wt, ["mv", "README.md", "README2.md"]); },
  "an untracked `notes.txt`": async (wt) => writeRel(wt, "notes.txt", "scratch\n"),
  // `notes.txt` is not tracked at B0, so an "edit" to it is an untracked file — a path B1 does
  // not touch either way, which is all the row that names it needs.
  "an unstaged edit to `notes.txt`": async (wt) => writeRel(wt, "notes.txt", "scratch\n"),
  "an unstaged edit to `src/x.mjs`": async (wt) => writeRel(wt, "src/x.mjs", "export const x = 42; // operator\n"),
  "a staged edit to `src/x.mjs`": async (wt) => { await writeRel(wt, "src/x.mjs", "export const x = 42; // operator\n"); gitOk(wt, ["add", "--", "src/x.mjs"]); },
  "an unstaged deletion of `src/x.mjs`": async (wt) => unlink(path.join(wt, "src", "x.mjs")),
  "a staged deletion of `src/x.mjs`": async (wt) => { gitOk(wt, ["rm", "-q", "--", "src/x.mjs"]); },
  "an untracked `src/new.mjs`": async (wt) => writeRel(wt, "src/new.mjs", "export const mine = true;\n"),
  "a staged rename of `src/x.mjs` to `src/y.mjs`": async (wt) => { gitOk(wt, ["mv", "src/x.mjs", "src/y.mjs"]); },
  "nothing": async () => {},
};
const applyDirt = async (wt, phrase) => {
  for (const part of phrase.split(" and ")) {
    const applier = DIRT[part.trim()] ?? DIRT[part.trim().replace(/^one /u, "an ")];
    assert.ok(applier, `the fixture knows the dirt phrase "${part}"`);
    await applier(wt);
  }
};

// laneCommit(wt, rel, body, message) — a commit L1 ON the lane's branch, so it diverges from B1.
function laneCommit(wt, rel, body, message) {
  return writeRel(wt, rel, body).then(() => {
    gitOk(wt, ["add", "--", rel]);
    gitOk(wt, ["-c", "user.email=lane@aof.test", "-c", "user.name=lane", "commit", "-q", "-m", message]);
    return revParse(wt, "HEAD");
  });
}

export const gatePropagationRefusalsTests = [
  // ------------------------------------------------------------------
  // Scenario: uncommitted work in the tree refuses the advance and survives it untouched
  // ------------------------------------------------------------------
  {
    name: "task01/43-05 advance-refusals: uncommitted work refuses the advance with `assignment-gate-propagation-dirty-worktree` and survives it byte-untouched — at the seam's own altitude AND through the real dispatch",
    run: async () => withGatePropagationFixture(async (fx) => {
      const shape = await buildItemLine(fx, { cutFrom: "C1", workerCommits: 2 });
      const worktreePath = meshWorktreePath(fx.root, "asg-dirty");
      const box = { planted: false, before: null };
      const exec = recordingGitExec([], { afterWorktreeAdd: plantDirt(worktreePath, "all", box) });

      const { frames } = await createGateDispatch(fx, fx.ws)("asg-dirty", { commit: shape.C2, exec, now: NOW });

      // (a) the settle — through the real handler, exactly as the scenario words it
      const failed = settledFrame(frames, "asg-dirty", "failed");
      assert.equal(failed?.code, DIRTY, "the assignment settles `failed` with code assignment-gate-propagation-dirty-worktree");

      // (b) the branch — unchanged from the hash captured BEFORE the dispatch
      assert.equal(revParse(fx.root, shape.branch), shape.tipBefore, "git rev-parse <branch> equals the hash captured before the dispatch");

      // (c) the operator's uncommitted bytes — the one thing git itself cannot recover
      const after = await captureWorktreeState(worktreePath);
      assert.ok(box.before != null, "the fixture captured the worktree state at the moment the dirt was planted");
      assert.equal(after.status, box.before.status, "git status --porcelain in the worktree is identical to the capture before the advance");
      assert.equal(after.tracked, box.before.tracked, "the modified tracked file's bytes on disk are identical");
      assert.equal(after.untracked, box.before.untracked, "the untracked file is still present with identical bytes");
      assert.ok(String(after.untracked ?? "").length > 0, "…and it is genuinely still there, not merely equal-and-absent");

      assert.equal(mergeHeadAbsent(worktreePath), true, "git rev-parse -q --verify MERGE_HEAD exits non-zero — no merge was ever begun");
      assert.notEqual(git(fx.root, ["cat-file", "-e", `${shape.branch}:${GATE_EDITED_PATH}`]).status, 0, "git cat-file -e <branch>:<the-gate-edited-path> exits non-zero — the gate edit did NOT arrive");

      // (d) the SEAM's own altitude — the guard called directly against a dirty worktree,
      // the altitude ADR-010 R5.2 requires it to be exported and callable at.
      const direct = await advanceBranchToBase(worktreePath, shape.C2, {});
      assert.equal(direct.outcome, "refused", "advanceBranchToBase refuses outright");
      assert.equal(direct.code, DIRTY, "…with the dirty-worktree code");
      assert.equal(direct.tip, shape.tipBefore, "…reporting the branch tip unchanged");
      assert.equal(direct.base, shape.C2, "…and the pinned base it refused to advance to");
      const afterDirect = await captureWorktreeState(worktreePath);
      assert.equal(afterDirect.status, box.before.status, "the direct call left the porcelain status identical too");
      assert.equal(afterDirect.tracked, box.before.tracked, "…and the tracked file's bytes");
    }),
  },

  // ------------------------------------------------------------------
  // Scenario: a conflicting merge is aborted and the branch is left byte-unchanged
  // ------------------------------------------------------------------
  {
    name: "task01/43-05 advance-refusals: a conflicting merge is `git merge --abort`ed and refused — the branch is byte-unchanged, the repo is not MERGING, and no conflict marker exists anywhere",
    run: async () => withGatePropagationFixture(async (fx) => {
      const shape = await buildItemLine(fx, { cutFrom: "C1", workerCommits: 2, conflict: "same-line" });
      const worktreePath = meshWorktreePath(fx.root, "asg-conflict");
      const w1Contested = git(fx.root, ["show", `${shape.W1}:${CONTESTED_PATH}`]).stdout;

      const { frames } = await createGateDispatch(fx, fx.ws)("asg-conflict", { commit: shape.C2, now: NOW });

      const failed = settledFrame(frames, "asg-conflict", "failed");
      assert.equal(failed?.code, CONFLICT, "the assignment settles `failed` with code assignment-gate-propagation-conflict");
      assert.equal(revParse(fx.root, shape.branch), shape.tipBefore, "git rev-parse <branch> equals the hash captured before the dispatch");
      assert.notEqual(git(fx.root, ["rev-parse", "--verify", `${shape.branch}^2`]).status, 0, "git rev-parse --verify <branch>^2 exits non-zero — no merge commit was created");
      assert.equal(mergeHeadAbsent(worktreePath), true, "git rev-parse -q --verify MERGE_HEAD exits non-zero — the repo is NOT left in a MERGING state");
      assert.deepEqual(unmergedEntries(worktreePath), [], "git status --porcelain carries no unmerged entry (no UU, AA, DD, AU or UA line)");
      assert.deepEqual(await conflictMarkersAnywhere(worktreePath), [], "no conflict-marker text exists in ANY file in the worktree");
      // "identical to their content at W1" is compared against the BLOB, with line endings
      // normalised on both sides: a Windows checkout with `core.autocrlf=true` materialises
      // an LF blob as CRLF on disk, so a raw byte compare would assert the platform's
      // checkout filter rather than the abort's completeness. The filter-independent half of
      // the same claim — that the working tree matches the branch exactly — is asserted
      // beside it with `git diff --quiet` and the HEAD identity.
      const onDisk = await readFile(path.join(worktreePath, CONTESTED_PATH), "utf8");
      const normalise = (text) => String(text).replace(/\r\n/g, "\n");
      assert.equal(normalise(onDisk), normalise(w1Contested), "the contested file's bytes on disk are identical to their content at W1");
      assert.equal(git(worktreePath, ["diff", "--quiet"]).status, 0, "…and the working tree carries no difference from the branch at all");
      assert.equal(revParse(worktreePath, "HEAD"), shape.W2, "…with HEAD still at the worker's own tip");
      assert.equal(isAncestor(fx.root, shape.W1, shape.branch), true, "git merge-base --is-ancestor W1 <branch> exits 0 — the worker's commit is untouched");
    }),
  },

  // ------------------------------------------------------------------
  // Scenario Outline: each refusal settles `failed` with its code, preserves every worker
  // commit, and never starts the agent (5 rows)
  // ------------------------------------------------------------------
  {
    name: "task01/43-05 advance-refusals: Examples — each refusal settles `failed` with its code, preserves every worker commit, never starts the agent and retains the worktree (5 rows)",
    run: async () => {
      const rows = [
        { precondition: "an uncommitted modification to a tracked file", code: DIRTY, dirt: "tracked", conflict: null },
        { precondition: "an untracked file the operator left in the tree", code: DIRTY, dirt: "untracked", conflict: null },
        { precondition: "a staged-but-uncommitted change in the index", code: DIRTY, dirt: "staged", conflict: null },
        { precondition: "a merge that conflicts on the same line of the same file", code: CONFLICT, dirt: null, conflict: "same-line" },
        { precondition: "a merge that conflicts on a delete/modify pair", code: CONFLICT, dirt: null, conflict: "delete-modify" },
      ];
      for (const row of rows) {
        await withGatePropagationFixture(async (fx) => {
          const label = `[${row.precondition}]`;
          const shape = await buildItemLine(fx, { cutFrom: "C1", workerCommits: 2, conflict: row.conflict });
          const assignmentId = `asg-${row.code}-${row.dirt ?? row.conflict}`;
          const worktreePath = meshWorktreePath(fx.root, assignmentId);
          const box = { planted: false, before: null };
          const exec = row.dirt != null
            ? recordingGitExec([], { afterWorktreeAdd: plantDirt(worktreePath, row.dirt, box) })
            : undefined;
          const spawns = [];
          const spawnRuntime = async (brief) => {
            spawns.push(brief);
            return { outcome: "failed", failureReason: "agent_error" };
          };

          const { frames } = await createGateDispatch(fx, fx.ws)(assignmentId, { commit: shape.C2, exec, spawnRuntime, now: NOW });

          assert.equal(settledFrame(frames, assignmentId, "failed")?.code, row.code, `${label} the assignment settles \`failed\` with code ${row.code}`);
          assert.equal(revParse(fx.root, shape.branch), shape.tipBefore, `${label} git rev-parse <branch> equals the hash captured before the dispatch`);
          assert.equal(isAncestor(fx.root, shape.W1, shape.branch), true, `${label} W1 is still reachable — every worker commit survives`);
          assert.equal(isAncestor(fx.root, shape.W2, shape.branch), true, `${label} …and W2`);
          assert.equal(mergeHeadAbsent(worktreePath), true, `${label} MERGE_HEAD is absent — nothing is left half-applied`);
          assert.deepEqual(spawns, [], `${label} the runtime is never spawned — no agent begins a phase on this state`);
          assert.equal(existsSync(worktreePath), true, `${label} the worktree is RETAINED for inspection`);
          const entries = await listWorktrees(fx.root);
          assert.equal(entries.some((entry) => entry.path.includes(assignmentId)), true, `${label} …and git itself still lists it`);

          // the row's own untouched_proof
          if (row.dirt === "tracked" || row.dirt === "untracked") {
            const after = await captureWorktreeState(worktreePath);
            const which = row.dirt === "tracked" ? "tracked" : "untracked";
            assert.ok(String(box.before?.[which] ?? "").length > 0, `${label} the fixture genuinely planted the ${which} change`);
            assert.equal(after[which], box.before[which], `${label} it is still on disk with identical bytes`);
          } else if (row.dirt === "staged") {
            const staged = git(worktreePath, ["diff", "--cached", "--name-only"]).stdout;
            assert.ok(staged.includes("c1.md"), `${label} the fixture genuinely staged a change`);
            assert.equal(staged, box.before.staged, `${label} git diff --cached --name-only lists the same paths as before`);
          } else if (row.conflict === "same-line") {
            assert.deepEqual(unmergedEntries(worktreePath), [], `${label} git status --porcelain carries no unmerged entry after the abort`);
          } else {
            assert.equal(existsSync(path.join(worktreePath, DOOMED_PATH)), false, `${label} the deleted-on-one-side file is in the state W1 left it in — deleted`);
            assert.equal(git(fx.root, ["cat-file", "-e", `${shape.branch}:${DOOMED_PATH}`]).status !== 0, true, `${label} …and absent from the branch's tree too`);
          }
        });
      }
    },
  },

  // ------------------------------------------------------------------
  // Scenario: the refusal is visible on the fleet as a coded failure, exactly as an
  // unavailable base commit is
  // ------------------------------------------------------------------
  {
    name: "task01/43-05 advance-refusals: the refusal reaches the OPERATOR — the terminal frame carries `failed` + the code, the detail names the branch and the pinned base, and the code is never conflated with assignment-base-commit-unavailable",
    run: async () => withGatePropagationFixture(async (fx) => {
      const shape = await buildItemLine(fx, { cutFrom: "C1", workerCommits: 2, conflict: "same-line" });

      const { frames, recorder, logs } = await createGateDispatch(fx, fx.ws)("asg-fleet", { commit: shape.C2, now: NOW });

      const terminal = settledFrame(frames, "asg-fleet", "failed");
      assert.ok(terminal, "the worker reports a terminal frame for this assignment");
      assert.equal(terminal.state, "failed", "…carrying state `failed`");
      assert.equal(terminal.code, CONFLICT, "…and the code assignment-gate-propagation-conflict");
      assert.ok(recorder.effectSteps.length > 0, "…on the DURABLE terminal channel, the same one every other coded failure settles through");

      const detail = logs.find((entry) => entry.code === CONFLICT);
      assert.ok(detail, "the coded failure also rides the worker's log channel");
      assert.equal(detail.level, "warn", "…at warn level");
      assert.ok(detail.message.includes(shape.branch), "the failure detail names the branch, so the cause is readable without an SSH inspection");
      assert.ok(detail.message.includes(shape.C2), "…and the pinned base commit");

      assert.notEqual(CONFLICT, "assignment-base-commit-unavailable", "the code is distinct from assignment-base-commit-unavailable");
      assert.equal(frames.some((frame) => frame.code === "assignment-base-commit-unavailable"), false, "…and the two causes are never conflated on the wire");
    }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 129/03 task 01 — advanceBranchToBase gains a dirtyPolicy, and strict stays
  // byte-identical
  // ══════════════════════════════════════════════════════════════════════════
  ...[
    "an unstaged edit to `README.md`",
    "a staged edit to `README.md`",
    "a staged new file `src/added.mjs`",
    "an unstaged deletion of `README.md`",
    "a staged rename of `README.md` to `README2.md`",
    "an untracked `notes.txt`",
    "an unstaged edit to `src/x.mjs`",
  ].map((dirt) => ({
    name: `129/03 task 01 — strict is the default and refuses every kind of dirt on any path [${dirt}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b0, b1 }) => {
      await applyDirt(worktree, dirt);
      const before = porcelainOf(worktree);
      assert.ok(before.trim().length > 0, "the fixture genuinely dirtied the worktree");
      const answer = await advanceBranchToBase(worktree, b1);
      assert.equal(answer.outcome, "refused", "the answer is refused");
      assert.equal(answer.code, DIRTY, "…with the dirty-worktree code");
      assert.equal(answer.base, b1, "…base B1");
      assert.equal(answer.tip, b0, "…tip B0");
      assert.equal("files" in answer, false, "strict answers carry no `files` key");
      assert.equal(revParse(worktree, "HEAD"), b0, "git rev-parse HEAD in the worktree is B0");
      assert.equal(porcelainOf(worktree), before, "git status --porcelain is byte-identical to its output before the call");
    }),
  })),
  ...[
    { dirt: "an unstaged edit to `README.md`", after: [" M README.md"] },
    { dirt: "an unstaged deletion of `README.md`", after: [" D README.md"] },
    { dirt: "an untracked `notes.txt`", after: ["?? notes.txt"] },
  ].map(({ dirt, after }) => ({
    name: `129/03 task 01 — touched-paths admits unstaged and untracked dirt on paths the fast-forward does not touch [${dirt}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b1 }) => {
      await applyDirt(worktree, dirt);
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.equal(answer.outcome, "fast-forwarded", `the answer is fast-forwarded: ${JSON.stringify(answer)}`);
      assert.equal(answer.code, null, "…code null");
      assert.equal(answer.base, b1, "…base B1");
      assert.equal(answer.tip, b1, "…tip B1");
      assert.equal(revParse(worktree, "HEAD"), b1, "git rev-parse HEAD in the worktree is B1");
      assert.deepEqual(porcelainLinesOf(worktree), after, `git status --porcelain is exactly ${JSON.stringify(after)}`);
    }),
  })),
  ...[
    { dirt: "a staged edit to `README.md`", files: ["README.md"] },
    { dirt: "a staged new file `src/added.mjs`", files: ["src/added.mjs"] },
    { dirt: "a staged deletion of `README.md`", files: ["README.md"] },
    { dirt: "a staged rename of `README.md` to `README2.md`", files: ["README.md", "README2.md"] },
    { dirt: "a staged edit to `README.md` and an unstaged edit to `notes.txt`", files: ["README.md"] },
  ].map(({ dirt, files }) => ({
    name: `129/03 task 01 — touched-paths refuses every staged index entry, whatever its path [${dirt}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b0, b1 }) => {
      await applyDirt(worktree, dirt);
      const before = porcelainOf(worktree);
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, base: answer.base, tip: answer.tip, files: answer.files },
        { outcome: "refused", code: DIRTY, base: b1, tip: b0, files },
        "the answer is the dirty refusal naming exactly the staged entry's paths",
      );
      assert.equal(revParse(worktree, "HEAD"), b0, "git rev-parse HEAD in the worktree is B0");
      assert.equal(porcelainOf(worktree), before, "git status --porcelain is byte-identical to its output before the call");
    }),
  })),
  ...[
    { dirt: "an unstaged edit to `src/x.mjs`", files: ["src/x.mjs"] },
    { dirt: "a staged edit to `src/x.mjs`", files: ["src/x.mjs"] },
    { dirt: "an unstaged deletion of `src/x.mjs`", files: ["src/x.mjs"] },
    { dirt: "a staged deletion of `src/x.mjs`", files: ["src/x.mjs"] },
    { dirt: "an untracked `src/new.mjs`", files: ["src/new.mjs"] },
    { dirt: "an unstaged edit to `src/x.mjs` and an unstaged edit to `README.md`", files: ["src/x.mjs"] },
    { dirt: "an unstaged edit to `src/x.mjs` and an untracked `src/new.mjs`", files: ["src/new.mjs", "src/x.mjs"] },
  ].map(({ dirt, files }) => ({
    name: `129/03 task 01 — touched-paths refuses dirt on a path the advance touches and names only the intersection [${dirt}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b0, b1 }) => {
      await applyDirt(worktree, dirt);
      const before = porcelainOf(worktree);
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, base: answer.base, tip: answer.tip, files: answer.files },
        { outcome: "refused", code: DIRTY, base: b1, tip: b0, files },
        "the answer is the dirty refusal naming only the intersection",
      );
      assert.equal(revParse(worktree, "HEAD"), b0, "git rev-parse HEAD in the worktree is B0");
      assert.equal(porcelainOf(worktree), before, "git status --porcelain is byte-identical to its output before the call");
      assert.equal(mergeHeadAbsent(worktree), true, "git rev-parse -q --verify MERGE_HEAD exits non-zero");
    }),
  })),
  {
    name: "129/03 task 01 — a rename contributes both its paths",
    run: () => withDirtyPolicyFixture(async ({ worktree, b1 }) => {
      await applyDirt(worktree, "a staged rename of `src/x.mjs` to `src/y.mjs`");
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.equal(answer.outcome, "refused");
      assert.deepEqual(answer.files, ["src/x.mjs", "src/y.mjs"], "the refusal's files is both halves of the rename");
    }),
  },
  {
    name: "129/03 task 01 — touched-paths carries worktree-only dirt across a real merge",
    run: () => withDirtyPolicyFixture(async ({ worktree, b1 }) => {
      const l1 = await laneCommit(worktree, "src/n.mjs", "export const n = 1; // L1\n", "L1");
      await applyDirt(worktree, "an unstaged edit to `README.md` and an untracked `notes.txt`");
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths", message: "m", node: "n" });
      assert.equal(answer.outcome, "merged", `the answer is merged: ${JSON.stringify(answer)}`);
      assert.equal(answer.code, null, "…code null");
      assert.equal(answer.base, b1, "…base B1");
      assert.equal(answer.tip, revParse(worktree, "HEAD"), "…tip equal to git rev-parse HEAD");
      assert.equal(revParse(worktree, "HEAD^1"), l1, "git rev-parse HEAD^1 is L1");
      assert.equal(revParse(worktree, "HEAD^2"), b1, "git rev-parse HEAD^2 is B1");
      assert.deepEqual(porcelainLinesOf(worktree), [" M README.md", "?? notes.txt"], "the worktree-only dirt was carried across the merge");
    }),
  },
  ...["strict", "touched-paths"].map((policy) => ({
    name: `129/03 task 01 — already-current is decided before any dirt check under either policy [${JSON.stringify(policy)}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b1 }) => {
      gitOk(worktree, ["merge", "--ff-only", b1]);
      assert.equal(revParse(worktree, "HEAD"), b1, "B1 is already an ancestor of the worktree's HEAD");
      await applyDirt(worktree, "an unstaged edit to `src/x.mjs`");
      const before = porcelainOf(worktree);
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: policy });
      assert.equal(answer.outcome, "already-current", `the answer is already-current: ${JSON.stringify(answer)}`);
      assert.equal(answer.code, null, "…code null");
      assert.equal(answer.base, b1, "…base B1");
      assert.equal(answer.tip, revParse(worktree, "HEAD"), "…tip equal to git rev-parse HEAD");
      assert.equal(porcelainOf(worktree), before, "git status --porcelain is byte-identical to its output before the call");
    }),
  })),
  ...[
    { dirt: "nothing", after: [] },
    { dirt: "an unstaged edit to `README.md` and an untracked `notes.txt`", after: [" M README.md", "?? notes.txt"] },
  ].map(({ dirt, after }) => ({
    name: `129/03 task 01 — a conflict under touched-paths is still aborted and refused with the rest of the tree kept [${dirt}]`,
    run: () => withDirtyPolicyFixture(async ({ worktree, b1 }) => {
      const l1 = await laneCommit(worktree, "src/x.mjs", "export const x = 7; // L1 conflicts with B1\n", "L1");
      await applyDirt(worktree, dirt);
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, base: answer.base, tip: answer.tip },
        { outcome: "refused", code: CONFLICT, base: b1, tip: l1 },
        "the answer is the conflict refusal",
      );
      assert.equal(revParse(worktree, "HEAD"), l1, "git rev-parse HEAD in the worktree is L1");
      assert.equal(mergeHeadAbsent(worktree), true, "git rev-parse -q --verify MERGE_HEAD exits non-zero");
      assert.deepEqual(porcelainLinesOf(worktree), after, `git status --porcelain is exactly ${JSON.stringify(after)}`);
      assert.deepEqual(await conflictMarkersAnywhere(worktree), [], "no file under the worktree contains a conflict marker");
    }),
  })),
  // ── 129/03 fix round 1 ──────────────────────────────────────────────────────────────
  {
    name: "129/03 task 01 (fix round 1, I1) — a wholly-untracked directory holding a path the advance adds is a RETURNED refusal naming the file, never a throw, and the tree is untouched",
    run: () => withDirtyPolicyFixture(async ({ worktree, b0, b1 }) => {
      // `src2/` exists only as untracked files in the worktree — the default porcelain collapses
      // it to one `?? src2/` line, whose path never intersects the advance's `src2/new.mjs`.
      await writeRel(worktree, "src2/new.mjs", "export const mine = true;\n");
      const before = porcelainOf(worktree);
      assert.deepEqual(porcelainLinesOf(worktree), ["?? src2/"], "the plain porcelain collapses the directory (the shape that used to fall through)");
      const answer = await advanceBranchToBase(worktree, b1, { dirtyPolicy: "touched-paths" });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, base: answer.base, tip: answer.tip, files: answer.files },
        { outcome: "refused", code: DIRTY, base: b1, tip: b0, files: ["src2/new.mjs"] },
        `a returned refusal naming the file: ${JSON.stringify(answer)}`,
      );
      assert.equal(revParse(worktree, "HEAD"), b0, "HEAD is still B0");
      assert.equal(porcelainOf(worktree), before, "the tree is untouched");
      assert.equal(mergeHeadAbsent(worktree), true, "no merge was begun");
    }, { b1Adds: ["src2/new.mjs"] }),
  },
  {
    name: "129/03 task 01 (fix round 1, I4a) — parsePorcelainStatus is the one porcelain parser: columns, both halves of a rename, quote-stripped paths, and short lines skipped",
    run: async () => {
      const { parsePorcelainStatus } = await import("../../src/mesh/worktree.mjs");
      const parsed = parsePorcelainStatus([
        " M src/x.mjs",
        "M  README.md",
        "R  old.md -> new.md",
        "?? notes.txt",
        '?? "sp ace.txt"',
        "",
        "XY",
      ].join("\n"));
      assert.deepEqual(parsed, [
        { index: " ", worktree: "M", paths: ["src/x.mjs"] },
        { index: "M", worktree: " ", paths: ["README.md"] },
        { index: "R", worktree: " ", paths: ["old.md", "new.md"] },
        { index: "?", worktree: "?", paths: ["notes.txt"] },
        { index: "?", worktree: "?", paths: ["sp ace.txt"] },
      ]);
    },
  },
  ...["lenient", "Strict", ""].map((value) => ({
    name: `129/03 task 01 — an unknown policy is a thrown coded error before any git verb runs [${JSON.stringify(value)}]`,
    // No repository is built for these rows (129/03 accept, m129/F-41): the double receives no
    // invocation, so the cwd is never opened — a bare temp directory and a placeholder sha are
    // the whole fixture, and a row that needed git here would be a row that ran a git verb.
    run: async () => {
      const worktree = await mkdtemp(path.join(os.tmpdir(), "aof-bad-policy-"));
      try {
        const calls = [];
        const double = async (args, opts) => { calls.push({ args, opts }); return { status: 0, stdout: "", stderr: "" }; };
        await assert.rejects(
          () => advanceBranchToBase(worktree, "0123456789abcdef0123456789abcdef01234567", { dirtyPolicy: value, exec: double }),
          (error) => {
            assert.equal(error.code, BAD_OPTION, "the thrown error's code is gate-propagation-bad-option");
            assert.ok(error.message.includes(JSON.stringify(value)), `the message names the value: ${error.message}`);
            return true;
          },
        );
        assert.deepEqual(calls, [], "the double received no invocation");
      } finally {
        await rm(worktree, { recursive: true, force: true });
      }
    },
  })),
];
