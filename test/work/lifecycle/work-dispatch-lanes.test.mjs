// Traceability wiring for story 65, task 02 —
// `wiki/work/65_story_concurrent-story-dispatch/tasks/02_concurrent-dispatch-into-worktrees.feature`
// (@executable). One exported entry per @executable Scenario, one per Scenario-Outline ROW.
//
// The @manual scenario ("a real milestone measures above 1.00× on the story builds") is NOT
// here and is not forced: it needs a real concurrent milestone run and `aof work observe`
// over the result, and manufacturing that from a fixture would be evidence of nothing. It
// is outstanding for the aof:verify gate.
//
// EVERY LANE BELOW RUNS OVER A REAL `git worktree` in a disposable fixture repo. The claims
// are claims about git — that two trees cannot see each other's edits, that a branch is
// checked out in at most one worktree (which is what makes racing dispatchers RESOLVE
// rather than fork), that `worktree remove` clears the admin metadata a bare `rm` leaves
// behind, that `branch -d` refuses an unmerged line — so a scripted exec double would be
// asserting the fixture's opinion of git rather than git's behaviour.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveDispatchLane,
  dispatchReadySet,
  inspectDispatchLanes,
  sweepDispatchLanes,
  cleanupDispatchLane,
  overlappingFiles,
  laneChanges,
  dispatchConcurrencyFromConfig,
  narrowDispatchBound,
  resolveDispatchConcurrency,
  DEFAULT_DISPATCH_CONCURRENCY,
  dispatchLaneBase,
  commitDispatchLane,
  mergeDispatchLaneHome,
} from "../../../src/work/dispatch.mjs";
import {
  meshDispatchWorktreePath,
  meshDispatchWorktreesRoot,
  isUnderMeshDispatchWorktreesRoot,
  isUnderMeshWorktreesRoot,
  isUnderMeshSessionWorktreesRoot,
  meshItemBranchName,
  listWorktrees,
} from "../../../src/mesh/worktree.mjs";
import { withDispatchRepo, git, dirtyPaths, writeRel, mergeHeadAbsent, conflictMarkers } from "../../support/dispatch-lane-fixture.mjs";
import { dispatchCommand } from "../../../src/commands/dispatch.mjs";
import { findWork } from "../../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHARED = "src/sandbox/provisionSandboxAgent.ts";

// ── 129/03 tasks 02 + 03 — the lane commits and merges home ─────────────────────────────────
//
// `wiki/work/129_milestone_loop-concurrency/stories/03_story_the-lane-commits-and-merges-home/
//   tasks/02_the-lane-merges-home.feature` and `tasks/03_state-md-merges-by-union.feature`.
//
// Layered on `withDispatchRepo` (a real repo, a real work stream, `.aof/mesh/` ignored): the
// merge-home fixture adds a milestone dir `wiki/work/127_m/` (a STATE.md and an `old.md`),
// another milestone's `wiki/work/128_x/STATE.md`, `src/promote.mjs` and `README.md`, commits
// B0, opens the `127/02` lane from it and — unless told otherwise — commits L1 on the lane
// touching `src/promote.mjs`. Every Then below is read back from real git.

const MILESTONE_DIR = "wiki/work/127_m";
const STATE_BASE = "---\ndoc: state\n---\n\n## Notes\n\n- base note\n";

const rev = async (cwd, ref) => (await git(["rev-parse", ref], cwd)).stdout.trim();
const porcelain = async (cwd) => (await git(["status", "--porcelain"], cwd)).stdout.split(/\r?\n/).filter((line) => line.length > 0);
const shownNames = async (cwd, ref) => (await git(["show", "--name-only", "--format=", ref], cwd)).stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).sort();

// commitIn(cwd, rel, body|null, message) — one commit on whatever branch `cwd` is checked out on;
// `body: null` deletes the path instead of writing it.
async function commitIn(cwd, rel, body, message) {
  if (body == null) await unlink(path.join(cwd, ...rel.split("/")));
  else await writeRel(cwd, rel, body);
  await git(["add", "-A", "--", rel], cwd);
  await git(["-c", "user.email=fixture@aof.test", "-c", "user.name=aof fixture", "commit", "-q", "-m", message], cwd);
  return rev(cwd, "HEAD");
}

async function withMergeHomeRepo(body, { laneCommit = true } = {}) {
  return withDispatchRepo(async ({ root }) => {
    await writeRel(root, `${MILESTONE_DIR}/STATE.md`, STATE_BASE);
    await writeRel(root, `${MILESTONE_DIR}/old.md`, "an old record\n");
    await writeRel(root, "wiki/work/128_x/STATE.md", STATE_BASE);
    await writeRel(root, "src/promote.mjs", "export const promote = 0;\n");
    await writeRel(root, "README.md", "# fixture\n");
    await git(["add", "-A"], root);
    await git(["commit", "-q", "-m", "B0"], root);
    const b0 = await rev(root, "HEAD");
    const opened = await resolveDispatchLane(root, "127/02");
    const l1 = laneCommit ? await commitIn(opened.worktree, "src/promote.mjs", "export const promote = 1; // L1\n", "L1") : null;
    return body({ root, lane: opened.worktree, branch: opened.branch, milestoneDir: MILESTONE_DIR, b0, l1 });
  });
}

// The primary's own moves, by phrase.
const PRIMARY = {
  "not moved": async () => null,
  "P1 touching `README.md`": async (root) => commitIn(root, "README.md", "# P1\n", "P1"),
  "P1 conflicting on `src/promote.mjs`": async (root) => commitIn(root, "src/promote.mjs", "export const promote = 2; // P1 conflicts with L1\n", "P1"),
};

// checkAttr(attrs, paths) — git's own matcher over THIS repository, parsed to { path: { attr } }.
async function checkAttr(attrs, paths) {
  const result = await git(["check-attr", ...attrs, "--", ...paths], repoRoot);
  assert.equal(result.status, 0, `git check-attr runs cleanly (stderr: ${result.stderr})`);
  const out = {};
  for (const line of result.stdout.split(/\r?\n/)) {
    const m = /^(.+?): (merge|text|eol): (.+)$/u.exec(line.trim());
    if (m) (out[m[1]] ??= {})[m[2]] = m[3];
  }
  return out;
}

// withUnionRepo(body, { doc, base }) — task 03's fixture: THIS repository's `.gitattributes`
// committed beside the doc at B0, then two lanes (`127/01`, `127/02`) opened from B0.
async function withUnionRepo(body, { doc, base }) {
  return withDispatchRepo(async ({ root }) => {
    await writeFile(path.join(root, ".gitattributes"), await readFile(path.join(repoRoot, ".gitattributes"), "utf8"), "utf8");
    await writeRel(root, doc, base);
    await git(["add", "-A"], root);
    await git(["commit", "-q", "-m", "B0"], root);
    const b0 = await rev(root, "HEAD");
    const a = await resolveDispatchLane(root, "127/01");
    const b = await resolveDispatchLane(root, "127/02");
    return body({ root, b0, a, b });
  });
}

export const workDispatchLaneTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a story is dispatched into its own worktree on its own branch
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 a story is dispatched into its OWN worktree on its OWN branch, under the local lane's own root — and the operator's main working tree is untouched",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const before = await dirtyPaths(root);
        assert.deepEqual(before, [], "the fixture starts clean, so 'untouched' is a real claim");

        const lane = await resolveDispatchLane(root, "53/00");
        assert.equal(lane.created, true, "a story with no worktree of its own gets one");
        assert.ok(existsSync(lane.worktree), "the worktree exists on disk");

        // …for that story ALONE, under the LOCAL lane's own root — a sibling of both the
        // assignment lane's and the session lane's (TECH_DEBT 47: a lane that is not the
        // assignment lane must never materialise in the root its startup scan enumerates).
        assert.equal(lane.worktree, meshDispatchWorktreePath(root, "53/00"), "at the ref's own key");
        assert.ok(isUnderMeshDispatchWorktreesRoot(root, lane.worktree), "under the dispatch lane's root");
        assert.equal(isUnderMeshWorktreesRoot(root, lane.worktree), false, "NOT in the assignment lane's keyspace");
        assert.equal(isUnderMeshSessionWorktreesRoot(root, lane.worktree), false, "NOT in the session lane's keyspace");

        // …on a branch named for that story, and genuinely checked out on it (never detached).
        assert.equal(lane.branch, meshItemBranchName("53/00"));
        assert.equal(lane.branch, "aof/mesh/53-00");
        const head = await git(["symbolic-ref", "--quiet", "--short", "HEAD"], lane.worktree);
        assert.equal(head.stdout.trim(), lane.branch, "HEAD is ON the branch, not detached");

        // …and the operator's main working tree is untouched: no file added, no branch
        // switched, nothing staged.
        assert.deepEqual(await dirtyPaths(root), [], "the origin tree has no uncommitted change");
        const originHead = await git(["symbolic-ref", "--quiet", "--short", "HEAD"], root);
        assert.equal(originHead.stdout.trim(), "main", "the operator is still on their own branch");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: two stories dispatched together never share a tree
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 two stories dispatched together never share a tree — each has its own worktree and branch, and a file edited in one is invisible in the other",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const [a, b] = await Promise.all([resolveDispatchLane(root, "53/00"), resolveDispatchLane(root, "53/01")]);
        assert.notEqual(a.worktree, b.worktree, "distinct trees");
        assert.notEqual(a.branch, b.branch, "distinct branches");

        // A file edited in one is NOT visible in the other until it is merged back.
        const target = path.join(a.worktree, "lane-a-only.txt");
        await writeFile(target, "written by 53/00\n", "utf8");
        assert.ok(existsSync(target), "the edit landed in lane A");
        assert.equal(existsSync(path.join(b.worktree, "lane-a-only.txt")), false, "…and is invisible in lane B");
        // …and after a commit it is still invisible, because the lanes are on different
        // lines. "Until it is merged back" is a property of the branches, not of caching.
        await git(["add", "-A"], a.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "commit", "-m", "lane a"], a.worktree);
        assert.equal(existsSync(path.join(b.worktree, "lane-a-only.txt")), false, "still invisible after lane A commits");
        // …and it IS visible once merged back, which is what makes the isolation a
        // trade-off rather than a wall.
        await git(["merge", "--no-ff", "--no-edit", "-m", "merge a", a.branch], b.worktree);
        assert.ok(existsSync(path.join(b.worktree, "lane-a-only.txt")), "…and visible once merged back");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the same-file overlap that motivated this cannot corrupt either
  //           lane
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 the vvw-352 same-file overlap cannot corrupt either lane — each edits its own copy, neither observes the other's partial edit, and the overlap is REPORTED rather than silently merged",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const lanes = await Promise.all([resolveDispatchLane(root, "53/00"), resolveDispatchLane(root, "53/01")]);
        // Both builds edit the SAME source file — the measured case: in vista-app-web 352,
        // provisionSandboxAgent.ts was edited ×9 during 352/02 and ×8 during 352/05, two
        // stories the architect had partitioned as INDEPENDENT.
        await Promise.all(lanes.map(async (lane, index) => {
          const file = path.join(lane.worktree, SHARED);
          await mkdir(path.dirname(file), { recursive: true });
          // A deliberately PARTIAL edit: written in two steps, so a shared tree would let
          // the other lane observe the half-written state.
          await writeFile(file, `// lane ${index} — half written\n`, "utf8");
          await writeFile(file, `// lane ${index} — half written\n// lane ${index} — complete\n`, "utf8");
        }));

        // Each edits its OWN copy…
        const bodies = await Promise.all(lanes.map((lane) => readFile(path.join(lane.worktree, SHARED), "utf8")));
        assert.match(bodies[0], /lane 0 — complete/);
        assert.match(bodies[1], /lane 1 — complete/);
        // …and neither observes the other's partial edit: not one byte of lane 1 is in
        // lane 0's copy, or the reverse.
        assert.ok(!bodies[0].includes("lane 1"), "lane 0's copy holds nothing of lane 1");
        assert.ok(!bodies[1].includes("lane 0"), "lane 1's copy holds nothing of lane 0");
        // …and the ORIGIN's copy is the committed one, untouched by either.
        assert.equal(await readFile(path.join(root, SHARED), "utf8"), "// the file both stories edit\n", "the origin's copy is untouched");

        // The overlap is REPORTED. Isolation means neither lane saw the other's bytes; it
        // does NOT mean the collision went away, and a collision nothing reports is a
        // conflict discovered by whoever merges second.
        const inspected = await inspectDispatchLanes(root, ["53/00", "53/01"]);
        const overlaps = overlappingFiles(inspected);
        assert.deepEqual(
          overlaps,
          [{ path: SHARED, refs: ["53/00", "53/01"] }],
          `the overlapping file is named with the refs that touched it: ${JSON.stringify(overlaps)}`,
        );
        // …and never silently merged: each lane still holds only its own edit.
        assert.ok(!(await readFile(path.join(lanes[0].worktree, SHARED), "utf8")).includes("lane 1"), "reported, not merged");
      }, { shared: { path: SHARED } }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: two dispatchers racing the same story resolve to one tree
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 two dispatchers racing the SAME story resolve to one tree — exactly one exists, both callers use it, and the loser is not refused",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        // Genuinely concurrent: both calls see `existsSync === false` and both run
        // `git worktree add`. One wins; git refuses the other.
        const settled = await Promise.allSettled([
          resolveDispatchLane(root, "53/00"),
          resolveDispatchLane(root, "53/00"),
        ]);
        assert.deepEqual(
          settled.map((entry) => entry.status),
          ["fulfilled", "fulfilled"],
          `the loser is NOT refused — the tree it asked for is the outcome it wanted: ${JSON.stringify(settled.map((e) => e.reason?.message))}`,
        );
        const [first, second] = settled.map((entry) => entry.value);
        assert.equal(first.worktree, second.worktree, "both callers use the same tree");

        // EXACTLY ONE tree exists for that ref — git's own rule (a branch is checked out in
        // at most one worktree) is what makes this exact rather than a guess.
        const entries = await listWorktrees(root);
        const forRef = entries.filter((entry) => entry.branch === `refs/heads/${meshItemBranchName("53/00")}`);
        assert.equal(forRef.length, 1, `exactly one worktree holds the item's branch: ${JSON.stringify(forRef)}`);
        // …and exactly one directory under the lane root.
        const underRoot = entries.filter((entry) => isUnderMeshDispatchWorktreesRoot(root, entry.path));
        assert.equal(underRoot.length, 1, "one lane directory, not two");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: an existing worktree for the story is reused, not re-created
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 an existing worktree for the story is REUSED, not re-created — the same tree comes back and no second tree is created for the same ref",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const first = await resolveDispatchLane(root, "53/00");
        assert.equal(first.created, true, "the first dispatch materialised it");
        // Work left behind by the earlier dispatch — the thing an operator would lose if
        // the second dispatch re-created the tree.
        await writeFile(path.join(first.worktree, "in-progress.txt"), "half-done work\n", "utf8");

        const second = await resolveDispatchLane(root, "53/00");
        assert.equal(second.created, false, "the second dispatch created nothing");
        assert.equal(second.reused, true, "…it reused");
        assert.equal(second.worktree, first.worktree, "the SAME tree");
        assert.ok(existsSync(path.join(second.worktree, "in-progress.txt")), "…with the earlier dispatch's work still in it");

        const underRoot = (await listWorktrees(root)).filter((entry) => isUnderMeshDispatchWorktreesRoot(root, entry.path));
        assert.equal(underRoot.length, 1, "no second tree was created for the same ref");

        // THE MIXED-BASIS TRAP, pinned because it was a real red here rather than a
        // hypothetical: `git worktree list --porcelain` reports FORWARD-SLASHED paths on
        // Windows and the path seam composes OS-native ones, so a lane resolved through the
        // git door and the same lane resolved through the seam came back as two different
        // strings for one directory. Every path this lane returns is in ONE basis.
        assert.equal(second.worktree, meshDispatchWorktreePath(root, "53/00"), "the reused path is in the seam's own basis, not git's");
        if (path.sep === "\\") assert.ok(!second.worktree.includes("/"), "on Windows a returned lane path is not forward-slashed");
      }),
  },
  {
    name: "dispatch/02 a lane re-opened after cleanup CONTINUES the item's own line — it never forks a second branch for the same ref",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const first = await resolveDispatchLane(root, "53/00");
        await writeFile(path.join(first.worktree, "landed.txt"), "committed work\n", "utf8");
        await git(["add", "-A"], first.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "commit", "-m", "lane work"], first.worktree);
        const tip = (await git(["rev-parse", "HEAD"], first.worktree)).stdout.trim();

        // Clean the TREE up but keep the LINE (the branch holds unmerged work, so `-d`
        // refuses it — which is the never-discards rule, not a failure).
        const cleaned = await cleanupDispatchLane(root, "53/00", { removeBranch: true });
        assert.equal(cleaned.outcome, "removed", "the tree is removed");
        assert.equal(cleaned.branchRemoved, false, "…and the unmerged line is KEPT, never discarded");

        // Re-opening takes the CONTINUE door: `-b` would refuse, and forking a second
        // branch is the divergence m42's one-line-per-item cure retired.
        const again = await resolveDispatchLane(root, "53/00");
        assert.equal((await git(["rev-parse", "HEAD"], again.worktree)).stdout.trim(), tip, "the re-opened lane continues from the line's own tip");
        assert.ok(existsSync(path.join(again.worktree, "landed.txt")), "…so the earlier dispatch's commits are still reachable");
        const branches = (await git(["branch", "--list", "aof/mesh/53-00*"], root)).stdout
          .split(/\r?\n/).map((line) => line.replace(/^[*+]?\s*/, "").trim()).filter(Boolean);
        assert.deepEqual(branches, ["aof/mesh/53-00"], "exactly ONE line for the item, never a second fork");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the fan-out never exceeds the bound
  //   | ready | bound |
  //   | 6     | 3     |
  //   | 2     | 3     |
  //   | 1     | 1     |
  // ══════════════════════════════════════════════════════════════════════════
  ...[
    { ready: 6, bound: 3 },
    { ready: 2, bound: 3 },
    { ready: 1, bound: 1 },
  ].map(({ ready, bound }) => ({
    name: `dispatch/02 fan-out outline row [ready ${ready}, bound ${bound}] -> at most ${bound} run at once, and the remainder are dispatched as lanes free`,
    run: async () => {
      const members = Array.from({ length: ready }, (_, index) => ({ ref: `53/${String(index).padStart(2, "0")}` }));
      let inFlight = 0;
      let observedPeak = 0;
      const startOrder = [];
      // A lane whose duration VARIES, so "as lanes free" is distinguishable from "in waves":
      // under a barrier the 4th member cannot start until the slowest of the first three
      // ends, and this recorder would show it.
      const runLane = async (member, index) => {
        startOrder.push(member.ref);
        inFlight += 1;
        observedPeak = Math.max(observedPeak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, index === 0 ? 40 : 1));
        inFlight -= 1;
        return member.ref;
      };

      const result = await dispatchReadySet(members, runLane, { bound });
      assert.equal(result.bound, bound, "the bound is reported on the answer");
      assert.ok(observedPeak <= bound, `at most ${bound} ran at once (observed peak ${observedPeak})`);
      assert.equal(result.peak, observedPeak, "the reported peak is the MEASURED in-flight count, not the schedule's claim");
      assert.equal(observedPeak, Math.min(bound, ready), "…and the bound is actually saturated, so the lane count is not accidentally low");
      // Every member ran, exactly once, and the remainder were dispatched as lanes freed.
      assert.equal(result.dispatched.length, ready, "every ready member was dispatched");
      assert.ok(result.dispatched.every((entry) => entry.ok), "…each successfully");
      assert.deepEqual(
        result.dispatched.map((entry) => entry.value).sort(),
        members.map((member) => member.ref).sort(),
        "…once each, none dropped or duplicated",
      );
      assert.equal(new Set(startOrder).size, ready, "no member was started twice");
    },
  })),
  {
    name: "dispatch/02 a lane that THROWS is recorded and never strands the others — one failed story must not take five healthy ones with it",
    run: async () => {
      const members = [{ ref: "53/00" }, { ref: "53/01" }, { ref: "53/02" }];
      const result = await dispatchReadySet(members, async (member) => {
        if (member.ref === "53/01") throw new Error("build blew up");
        return member.ref;
      }, { bound: 2 });
      assert.deepEqual(result.dispatched.map((entry) => entry.ok), [true, false, true], "the failure is contained to its own lane");
      assert.equal(result.dispatched[1].error.message, "build blew up", "…and carried, not swallowed");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the bound is read, never invented
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 the bound is READ, never invented — one configured key with one default, and the malformed matrix falls back rather than crashing",
    run: async () => {
      // ONE CONFIGURED KEY. The value an operator writes is the value the fan-out uses.
      assert.equal(dispatchConcurrencyFromConfig({ config: { work: { dispatch: { concurrency: 5 } } } }), 5);
      // ONE DEFAULT, reached by an absent key at every level of the subtree.
      for (const workspace of [undefined, null, {}, { config: {} }, { config: { work: {} } }, { config: { work: { dispatch: {} } } }]) {
        assert.equal(dispatchConcurrencyFromConfig(workspace), DEFAULT_DISPATCH_CONCURRENCY, `absent config falls back: ${JSON.stringify(workspace)}`);
      }
      // …and the malformed matrix, byte-for-byte the one every other configured limit in
      // this repo keeps (resolveSyncCadenceSeconds / resolvePresenceCadenceSeconds): no
      // silent string→number coercion, no zero, no negative, no float, no NaN/Infinity.
      for (const bad of [undefined, null, "3", true, false, 0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, {}, []]) {
        assert.equal(resolveDispatchConcurrency(bad), DEFAULT_DISPATCH_CONCURRENCY, `malformed value falls back: ${JSON.stringify(bad)}`);
      }
      assert.equal(resolveDispatchConcurrency(1), 1, "a valid positive integer is used verbatim");

      // …and the fan-out READS it rather than inventing one when no bound is passed.
      const workspace = { config: { work: { dispatch: { concurrency: 2 } } } };
      let peak = 0;
      let inFlight = 0;
      const result = await dispatchReadySet(
        Array.from({ length: 5 }, (_, index) => ({ ref: `53/0${index}` })),
        async () => { inFlight += 1; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 2)); inFlight -= 1; },
        { workspace },
      );
      assert.equal(result.bound, 2, "the fan-out resolved the bound from the workspace config");
      assert.equal(peak, 2, "…and enforced it");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a finished lane is cleaned up
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 a finished lane is cleaned up — its worktree AND branch are removed once the work is merged back, and nothing is removed for a lane that is still running",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const finished = await resolveDispatchLane(root, "53/00");
        const running = await resolveDispatchLane(root, "53/01");

        // The finished lane's work reaches a terminal outcome and is MERGED BACK.
        await writeFile(path.join(finished.worktree, "done.txt"), "the story's work\n", "utf8");
        await git(["add", "-A"], finished.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "commit", "-m", "53/00 done"], finished.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "merge", "--no-ff", "--no-edit", finished.branch], root);

        const cleaned = await cleanupDispatchLane(root, "53/00", { removeBranch: true });
        assert.equal(cleaned.outcome, "removed");
        assert.equal(existsSync(finished.worktree), false, "the worktree is gone");
        assert.equal(cleaned.branchRemoved, true, "…and so is the branch, now that its work is merged back");
        const branches = (await git(["branch", "--list", finished.branch], root)).stdout.trim();
        assert.equal(branches, "", "git agrees the branch is gone");
        // `git worktree remove`, never a bare rm: no stale prunable admin metadata is left
        // that would block a later add at the same path (RESEARCH.md §4).
        const stale = (await listWorktrees(root)).filter((entry) => entry.path === finished.worktree);
        assert.deepEqual(stale, [], "no stale worktree metadata survives");

        // NOTHING is removed for a lane that is still running.
        assert.ok(existsSync(running.worktree), "the running lane's tree is untouched");
        const refused = await cleanupDispatchLane(root, "53/01", { live: ["53/01"], removeBranch: true });
        assert.equal(refused.outcome, "refused");
        assert.equal(refused.code, "dispatch-lane-live");
        assert.ok(existsSync(running.worktree), "…and it is STILL untouched after the refusal");
      }),
  },
  {
    name: "dispatch/02 cleanup refuses a lane holding uncommitted work — the one thing git cannot recover is never removed, and there is no --force to pass",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const lane = await resolveDispatchLane(root, "53/00");
        await writeFile(path.join(lane.worktree, "unsaved.txt"), "bytes no commit points at\n", "utf8");

        const refused = await cleanupDispatchLane(root, "53/00", { removeBranch: true });
        assert.equal(refused.outcome, "refused");
        assert.equal(refused.code, "dispatch-lane-uncommitted-work");
        assert.deepEqual(refused.changed, ["unsaved.txt"], "…naming what it is protecting");
        assert.ok(existsSync(path.join(lane.worktree, "unsaved.txt")), "the bytes are still there");
      }),
  },
  {
    name: "dispatch/02 cleanup refuses a clean lane while its projection consequence remains unpublished",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const lane = await resolveDispatchLane(root, "53/00");
        let checked = 0;
        const refused = await cleanupDispatchLane(root, "53/00", {
          removeBranch: true,
          ensureProjection: async ({ ref, worktree }) => {
            checked += 1;
            assert.equal(ref, "53/00");
            assert.equal(worktree, lane.worktree);
            return {
              settled: false,
              code: "dispatch-lane-projection-unpublished",
              remaining: [{ eventId: "event-1", status: "failed", attempts: 2 }],
            };
          },
        });

        assert.equal(checked, 1, "the convergence gate runs once after the clean-tree check");
        assert.equal(refused.outcome, "refused");
        assert.equal(refused.code, "dispatch-lane-projection-unpublished");
        assert.equal(refused.projection.remaining[0].status, "failed", "the retryable consequence is reported");
        assert.equal(dispatchCommand.cli.exit({ action: "cleanup", outcome: "refused" }), 1, "the refusal is a non-zero loop stop");
        assert.ok(existsSync(lane.worktree), "the worktree remains available for retry");
        assert.equal((await git(["branch", "--list", lane.branch], root)).stdout.trim().replace(/^[*+]?\s*/, ""), lane.branch, "the branch remains too");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: a stranded lane is recoverable rather than lost
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 a stranded lane is recoverable rather than lost — the sweep reports its ref and branch, its commits are recoverable, and it never removes a tree holding uncommitted work",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        // A dispatched story whose session died leaving its worktree behind, with one
        // COMMITTED change (recoverable) and one UNCOMMITTED (must never be removed).
        const stranded = await resolveDispatchLane(root, "53/00");
        await writeFile(path.join(stranded.worktree, "committed.txt"), "survived\n", "utf8");
        await git(["add", "-A"], stranded.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "commit", "-m", "work before the session died"], stranded.worktree);
        const tip = (await git(["rev-parse", "HEAD"], stranded.worktree)).stdout.trim();
        await writeFile(path.join(stranded.worktree, "uncommitted.txt"), "not yet saved\n", "utf8");
        // …and a LIVE lane the sweep must not touch.
        const live = await resolveDispatchLane(root, "53/01");

        const swept = await sweepDispatchLanes(root, ["53/00", "53/01"], { live: ["53/01"], remove: true });
        assert.deepEqual(swept.stranded.map((lane) => lane.ref), ["53/00"], "only the stranded lane is reported");
        const report = swept.stranded[0];
        assert.equal(report.ref, "53/00", "reported WITH its ref");
        assert.equal(report.branch, meshItemBranchName("53/00"), "…and its branch");
        assert.equal(report.worktree, stranded.worktree, "…and its worktree");

        // Its commits are recoverable: the line outlives the tree, and the tip is reachable
        // from the ORIGIN checkout, not just from inside the lane.
        const recovered = (await git(["rev-parse", report.branch], root)).stdout.trim();
        assert.equal(recovered, tip, "the branch still points at the stranded lane's work");
        const blob = await git(["show", `${report.branch}:committed.txt`], root);
        assert.equal(blob.stdout, "survived\n", "…and the content is readable from the origin");

        // The sweep NEVER removes a tree holding uncommitted work, even asked to remove.
        assert.deepEqual(swept.removed, [], "nothing was removed");
        assert.deepEqual(swept.kept.map((lane) => lane.keptBecause), ["uncommitted-work"], "…and the reason is named");
        assert.ok(existsSync(path.join(stranded.worktree, "uncommitted.txt")), "the unsaved bytes are still there");
        assert.ok(existsSync(live.worktree), "and the live lane was never in scope");
      }),
  },
  {
    name: "dispatch/02 a stranded lane holding NO uncommitted work is removable, and its line still survives — recoverable, not lost",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const lane = await resolveDispatchLane(root, "53/00");
        await writeFile(path.join(lane.worktree, "committed.txt"), "survived\n", "utf8");
        await git(["add", "-A"], lane.worktree);
        await git(["-c", "user.email=a@aof.test", "-c", "user.name=a", "commit", "-m", "clean work"], lane.worktree);
        const tip = (await git(["rev-parse", "HEAD"], lane.worktree)).stdout.trim();

        const swept = await sweepDispatchLanes(root, ["53/00"], { remove: true });
        assert.deepEqual(swept.removed.map((entry) => entry.ref), ["53/00"], "a clean stranded lane is removed");
        assert.equal(existsSync(lane.worktree), false, "…its tree is gone");
        assert.equal((await git(["rev-parse", meshItemBranchName("53/00")], root)).stdout.trim(), tip, "…and its line, with every commit, is not");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: every lane is individually reportable
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 every lane is individually reportable — each reports its ref, worktree and current state, and a lane that has gone quiet is distinguishable from one that is working",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const refs = ["53/00", "53/01", "53/02"];
        const lanes = [];
        for (const ref of refs) lanes.push(await resolveDispatchLane(root, ref));
        // Two lanes are working (they have just written); one has produced nothing since it
        // was created and — with the quiet window closed behind it — has gone quiet.
        await writeFile(path.join(lanes[0].worktree, "a.txt"), "working\n", "utf8");
        await writeFile(path.join(lanes[1].worktree, "b.txt"), "working\n", "utf8");

        const quietLane = path.resolve(lanes[2].worktree);
        const nowMs = Date.now();
        const report = await inspectDispatchLanes(root, refs, {
          nowMs,
          quietMs: 60_000,
          // The clock is INJECTED, so "gone quiet" is a fact of the test rather than of
          // wall time: the third lane's last activity is pushed an hour into the past.
          statMtimeMs: async (target) => {
            const resolved = path.resolve(target);
            if (resolved === quietLane || resolved.startsWith(`${quietLane}${path.sep}`)) return nowMs - 3_600_000;
            try { return (await stat(target)).mtimeMs; } catch { return null; }
          },
        });

        assert.equal(report.length, 3, "every lane is reported");
        for (const ref of refs) {
          const lane = report.find((entry) => entry.ref === ref);
          assert.ok(lane != null, `lane ${ref} is reported`);
          assert.equal(lane.worktree, meshDispatchWorktreePath(root, ref), "…with its worktree");
          assert.equal(lane.branch, meshItemBranchName(ref), "…and its branch");
          assert.ok(typeof lane.state === "string" && lane.state.length > 0, "…and its current state");
        }
        assert.equal(report.find((lane) => lane.ref === "53/00").state, "working");
        assert.equal(report.find((lane) => lane.ref === "53/01").state, "working");
        assert.equal(report.find((lane) => lane.ref === "53/02").state, "quiet", "a lane that has gone quiet is distinguishable from one that is working");
        assert.deepEqual(report.find((lane) => lane.ref === "53/00").changed, ["a.txt"], "…and each lane's own changes are its own");
        assert.deepEqual(report.find((lane) => lane.ref === "53/02").changed, [], "a quiet lane has produced nothing");
      }),
  },
  {
    name: "dispatch/02 laneChanges reads the lane's OWN tree — the origin's changes are never attributed to a lane, and a lane's are never attributed to the origin",
    run: () =>
      withDispatchRepo(async ({ root }) => {
        const lane = await resolveDispatchLane(root, "53/00");
        await writeFile(path.join(root, "origin-only.txt"), "the operator's own edit\n", "utf8");
        await writeFile(path.join(lane.worktree, "lane-only.txt"), "the lane's edit\n", "utf8");
        assert.deepEqual(await laneChanges(lane.worktree), ["lane-only.txt"], "the lane sees only its own");
        assert.deepEqual(await dirtyPaths(root), ["?? origin-only.txt"], "…and the origin sees only its own");
      }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the prompt fans out over the ready set instead of taking its head
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "dispatch/02 the prompt fans out over the ready set instead of taking its head — continue.md asks for the ready set, dispatches its members together up to the bound, and no longer says the loop is one-at-a-time",
    run: async () => {
      const prompt = await readFile(path.join(repoRoot, "src", "bundle", "commands", "continue.md"), "utf8");

      // (a) It ASKS for the ready set, by the key the command actually answers with.
      assert.match(prompt, /aof work next[^\n]*--json/, "it asks `aof work next --json`");
      assert.match(prompt, /readySet/, "…and reads the ready set off the answer");
      // (b) It DISPATCHES the members together, up to the bound, through the real door.
      assert.match(prompt, /aof work dispatch/, "it opens each member's own worktree through the real verb");
      assert.match(prompt, /\bbound\b/, "…and is told about the bound");
      // (c) The superseded instruction is GONE — the prompt used to be told, in terms, that
      //     the loop is serial and deliberately so, because nothing recorded what may run
      //     at once. Something does now.
      assert.ok(
        !prompt.includes("The loop is SERIAL, and deliberately so"),
        "the prompt no longer states the loop is serial and deliberately so",
      );
      assert.ok(
        !prompt.includes("one at a\n  time is the only safe order") && !prompt.includes("one at a time is the only safe order"),
        "…nor that one-at-a-time is the only safe order",
      );
      // (d) …and it still refuses to infer concurrency from PROSE, which was the correct
      //     half of the superseded instruction and stays true: a partition's independence
      //     claim in an ARCHITECTURE.md is not data (vvw 352, two "independent" stories,
      //     one file, ×9 and ×8).
      assert.match(prompt, /ARCHITECTURE\.md|prose/, "the prompt still refuses to infer concurrency from a prose claim");
      // (e) The parallelism sentence at :30 that motivated all of this now has an answer.
      assert.match(prompt, /parallelism across independent stories/, "the orchestrated-mode rationale is still stated");
      assert.match(prompt, /propagation warning is also a stop signal/i, "the loop does not clean through a failed shared projection");
      assert.match(prompt, /cleanup[\s\S]*refuses non-zero/i, "cleanup's convergence refusal is part of the lane-close protocol");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 129/03 task 02 — dispatch.mjs composes commitDispatchLane,
  // mergeDispatchLaneHome and dispatchLaneBase
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "129/03 task 02 — a lane merges home by fast-forward when the primary did not move",
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      assert.equal(answer.outcome, "fast-forwarded", `the answer's outcome is fast-forwarded: ${JSON.stringify(answer)}`);
      assert.equal(answer.commit, l1, "…and commit equals L1");
      assert.equal(await rev(root, "main"), l1, "git rev-parse main is L1");
      const log = (await git(["log", "--oneline", `${b0}..main`], root)).stdout.split(/\r?\n/).filter(Boolean);
      assert.equal(log.length, 1, `git log --oneline B0..main lists exactly L1: ${JSON.stringify(log)}`);
      assert.ok(log[0].startsWith(l1.slice(0, 7)), "…and it is L1");
    }),
  },
  {
    name: "129/03 task 02 — a lane merges home by a real merge when the primary moved elsewhere",
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, l1 }) => {
      const p1 = await PRIMARY["P1 touching `README.md`"](root);
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir, message: "aof(loop): merge 127/02", node: "win-host-a" });
      assert.equal(answer.outcome, "merged", `the answer's outcome is merged: ${JSON.stringify(answer)}`);
      assert.equal(answer.commit, await rev(root, "main"), "…and commit equals git rev-parse main");
      assert.equal(await rev(root, "main^1"), p1, "git rev-parse main^1 is P1");
      assert.equal(await rev(root, "main^2"), l1, "git rev-parse main^2 is L1");
      const log = (await git(["log", "-1", "--format=%an <%ae>%n%s", "main"], root)).stdout.split(/\r?\n/);
      assert.equal(log[0], "aof-mesh (win-host-a) <aof-mesh@users.noreply.github.com>", "the merge is under the mesh identity, node named");
      assert.equal(log[1], "aof(loop): merge 127/02", "…with the given message");
    }),
  },
  ...[
    { primary: "not moved", lane: "L1", outcome: "fast-forwarded", base: "B0", tip: "L1", mainAfter: "L1" },
    { primary: "P1 touching `README.md`", lane: "L1", outcome: "merged", base: "B0", tip: "L1", mainAfter: "a new merge sha" },
    { primary: "P1 conflicting on `src/promote.mjs`", lane: "L1", outcome: "conflict", base: "B0", tip: "L1", mainAfter: "P1" },
    { primary: "L1 already merged into `main`", lane: "L1", outcome: "already-current", base: "L1", tip: "L1", mainAfter: "unchanged" },
    { primary: "P1 touching `README.md`", lane: "no commit", outcome: "already-current", base: "B0", tip: "B0", mainAfter: "P1" },
  ].map((row) => ({
    name: `129/03 task 02 — every answer names the lane, its base, its tip and the primary's HEAD after [primary: ${row.primary}, lane: ${row.lane}]`,
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      let p1 = null;
      if (row.primary === "L1 already merged into `main`") await git(["merge", "--ff-only", l1], root);
      else p1 = await PRIMARY[row.primary](root);
      const mainBefore = await rev(root, "main");
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      const sha = { B0: b0, L1: l1, P1: p1 };
      assert.deepEqual(
        { outcome: answer.outcome, ref: answer.ref, branch: answer.branch, base: answer.base, tip: answer.tip },
        { outcome: row.outcome, ref: "127/02", branch: "aof/mesh/127-02", base: sha[row.base], tip: sha[row.tip] ?? b0 },
        `the answer names outcome, ref, branch, base and tip: ${JSON.stringify(answer)}`,
      );
      const mainAfter = await rev(root, "main");
      assert.equal(answer.commit, mainAfter, "the answer's commit equals git rev-parse main after the call");
      if (row.mainAfter === "a new merge sha") {
        assert.ok(![b0, l1, p1].includes(mainAfter), "…which is a new merge sha");
        assert.equal(await rev(root, "main^2"), l1, "…with L1 as its second parent");
      } else if (row.mainAfter === "unchanged") {
        assert.equal(mainAfter, mainBefore, "…which is unchanged");
      } else {
        assert.equal(mainAfter, sha[row.mainAfter], `…which is ${row.mainAfter}`);
      }
    }, { laneCommit: row.lane === "L1" }),
  })),
  ...[
    { dirt: "nothing uncommitted", plant: async () => {}, ownWrites: "none", outcome: "fast-forwarded", after: [] },
    { dirt: "an edit to `wiki/work/127_m/STATE.md`", plant: (root) => writeRel(root, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- loop note\n`), ownWrites: [`${MILESTONE_DIR}/STATE.md`], outcome: "merged", after: [] },
    { dirt: "an untracked `wiki/work/127_m/runs/n/r1.json`", plant: (root) => writeRel(root, `${MILESTONE_DIR}/runs/n/r1.json`, "{}\n"), ownWrites: [`${MILESTONE_DIR}/runs/n/r1.json`], outcome: "merged", after: [] },
    { dirt: "a deletion of `wiki/work/127_m/old.md`", plant: (root) => unlink(path.join(root, ...`${MILESTONE_DIR}/old.md`.split("/"))), ownWrites: [`${MILESTONE_DIR}/old.md`], removes: true, outcome: "merged", after: [] },
    { dirt: "an edit to `wiki/work/127_m/STATE.md` and an edit to `README.md`", plant: async (root) => { await writeRel(root, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- loop note\n`); await writeRel(root, "README.md", "# operator\n"); }, ownWrites: [`${MILESTONE_DIR}/STATE.md`], outcome: "merged", after: [" M README.md"] },
    { dirt: "an edit to `wiki/work/128_x/STATE.md` (another milestone's dir)", plant: (root) => writeRel(root, "wiki/work/128_x/STATE.md", `${STATE_BASE}- other\n`), ownWrites: "none", outcome: "fast-forwarded", after: [" M wiki/work/128_x/STATE.md"] },
  ].map((row) => ({
    name: `129/03 task 02 — the loop's own writes are committed before the merge, scoped to the milestone dir [${row.dirt}]`,
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      await row.plant(root);
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir, message: "aof(loop): 127/02 home", node: "win-host-a" });
      assert.equal(answer.outcome, row.outcome, `the answer's outcome is ${row.outcome}: ${JSON.stringify(answer)}`);
      if (row.ownWrites === "none") {
        const log = (await git(["log", "--format=%H", `${b0}..main`], root)).stdout.split(/\r?\n/).filter(Boolean);
        assert.deepEqual(log, [l1], "no commit was created besides the merge (a fast-forward to L1)");
      } else {
        const shown = (await git(["show", "--name-status", "--format=%an%n%s", "main^1"], root)).stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        assert.equal(shown[0], "aof-mesh (win-host-a)", "main^1 is the own-writes commit under the mesh identity");
        assert.equal(shown[1], "aof(loop): 127/02 home", "…with the message");
        const entries = shown.slice(2).map((l) => l.split(/\s+/u));
        assert.deepEqual(entries.map((e) => e[1]).sort(), row.ownWrites, `…containing exactly ${row.ownWrites.join(", ")}`);
        if (row.removes) assert.deepEqual(entries.map((e) => e[0]), ["D"], "…as a removal");
        assert.equal(await rev(root, "main^2"), l1, "…and the merge's second parent is L1");
      }
      assert.deepEqual(await porcelain(root), row.after, `git status --porcelain in the primary is exactly ${JSON.stringify(row.after)}`);
    }),
  })),
  ...[
    { dirt: "an unstaged edit to `src/promote.mjs`", plant: (root) => writeRel(root, "src/promote.mjs", "export const promote = 9; // operator\n"), files: ["src/promote.mjs"], mainAfter: "B0", after: [" M src/promote.mjs"] },
    { dirt: "an unstaged edit to `src/promote.mjs` and one to `README.md`", plant: async (root) => { await writeRel(root, "src/promote.mjs", "export const promote = 9; // operator\n"); await writeRel(root, "README.md", "# operator\n"); }, files: ["src/promote.mjs"], mainAfter: "B0", after: [" M README.md", " M src/promote.mjs"] },
    { dirt: "an edit to `src/promote.mjs` and one to `wiki/work/127_m/STATE.md`", plant: async (root) => { await writeRel(root, "src/promote.mjs", "export const promote = 9; // operator\n"); await writeRel(root, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- loop note\n`); }, files: ["src/promote.mjs"], mainAfter: "the own-writes commit (child of B0)", after: [" M src/promote.mjs"] },
  ].map((row) => ({
    name: `129/03 task 02 — operator dirt on a lane-touched path refuses by name [${row.dirt}]`,
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      await row.plant(root);
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, ref: answer.ref, branch: answer.branch, base: answer.base, tip: answer.tip, files: answer.files },
        { outcome: "refused", code: "lane-merge-refused", ref: "127/02", branch: "aof/mesh/127-02", base: b0, tip: l1, files: row.files },
        `the answer is the named refusal: ${JSON.stringify(answer)}`,
      );
      const main = await rev(root, "main");
      if (row.mainAfter === "B0") {
        assert.equal(main, b0, "git rev-parse main is B0");
      } else {
        assert.notEqual(main, b0, "git rev-parse main is the own-writes commit");
        assert.equal(await rev(root, "main^"), b0, "…a child of B0");
        assert.deepEqual(await shownNames(root, "main"), [`${MILESTONE_DIR}/STATE.md`], "…holding exactly the loop's own write");
      }
      assert.equal(answer.commit, main, "…and the answer's commit is the primary's HEAD after");
      assert.deepEqual(await porcelain(root), row.after, `git status --porcelain in the primary is exactly ${JSON.stringify(row.after)}`);
    }),
  })),
  ...[
    { dirt: "nothing uncommitted", plant: async () => {}, after: [] },
    { dirt: "an unstaged edit to `README.md`", plant: (root) => writeRel(root, "README.md", "# operator\n"), after: [" M README.md"] },
  ].map((row) => ({
    name: `129/03 task 02 — a conflict is aborted and named with everything intact [${row.dirt}]`,
    run: () => withMergeHomeRepo(async ({ root, lane, milestoneDir, b0, l1 }) => {
      const p1 = await PRIMARY["P1 conflicting on `src/promote.mjs`"](root);
      await row.plant(root);
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, ref: answer.ref, branch: answer.branch, base: answer.base, tip: answer.tip, commit: answer.commit },
        { outcome: "conflict", code: "lane-merge-conflict", ref: "127/02", branch: "aof/mesh/127-02", base: b0, tip: l1, commit: p1 },
        `the answer is the named conflict: ${JSON.stringify(answer)}`,
      );
      assert.equal(await mergeHeadAbsent(root), true, "git rev-parse -q --verify MERGE_HEAD in the primary exits non-zero");
      assert.deepEqual(await porcelain(root), row.after, `git status --porcelain there is exactly ${JSON.stringify(row.after)}`);
      assert.deepEqual(await conflictMarkers(root), [], "no file in the primary contains a conflict marker");
      assert.equal(await rev(root, "aof/mesh/127-02"), l1, "git rev-parse aof/mesh/127-02 is L1");
      const entries = await listWorktrees(root);
      const laneEntry = entries.find((entry) => path.resolve(entry.path) === path.resolve(lane));
      assert.ok(laneEntry, "git worktree list --porcelain still lists the lane's worktree");
      assert.equal(laneEntry.branch, "refs/heads/aof/mesh/127-02", "…on refs/heads/aof/mesh/127-02");
    }),
  })),
  {
    name: "129/03 task 02 — a detached primary is refused before any write",
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      await git(["checkout", "-q", "--detach", b0], root);
      await writeRel(root, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- loop note\n`);
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, reason: answer.reason, ref: answer.ref },
        { outcome: "refused", code: "lane-merge-refused", reason: "detached-head", ref: "127/02" },
        `the answer is the detached-head refusal: ${JSON.stringify(answer)}`,
      );
      assert.equal(await rev(root, "main"), b0, "git rev-parse main is B0");
      assert.equal(await rev(root, "aof/mesh/127-02"), l1, "git rev-parse aof/mesh/127-02 is L1");
      assert.deepEqual(await porcelain(root), [` M ${MILESTONE_DIR}/STATE.md`], "git status --porcelain in the primary is exactly the uncommitted edit — nothing was written");
    }),
  },
  ...[
    { dirt: "an edited record doc and an untracked run record", plant: async (lane) => { await writeRel(lane, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- lane note\n`); await writeRel(lane, `${MILESTONE_DIR}/runs/n/r1.json`, "{}\n"); }, committed: true },
    { dirt: "nothing uncommitted", plant: async () => {}, committed: false },
  ].map((row) => ({
    name: `129/03 task 02 — commitDispatchLane commits the lane and reports its tip [${row.dirt}]`,
    run: () => withMergeHomeRepo(async ({ lane, l1 }) => {
      await row.plant(lane);
      const answer = await commitDispatchLane(lane, { message: "aof(loop): 127/02 settled", node: "win-host-a" });
      assert.equal(answer.committed, row.committed, `committed is ${row.committed}`);
      assert.equal(answer.tip, await rev(lane, "HEAD"), "tip equals git rev-parse HEAD in the lane");
      if (row.committed) {
        assert.notEqual(answer.tip, l1, "the tip is a new sha");
        assert.equal(await rev(lane, "HEAD^"), l1, "…whose parent is L1");
        assert.equal((await git(["log", "-1", "--format=%an", "HEAD"], lane)).stdout.trim(), "aof-mesh (win-host-a)", "…by the mesh identity");
      } else {
        assert.equal(answer.tip, l1, "the tip is L1");
      }
      assert.deepEqual(await porcelain(lane), [], "git status --porcelain in the lane is empty");
    }),
  })),
  ...[
    { lane: "no commit", primary: "not moved", base: "B0" },
    { lane: "L1", primary: "not moved", base: "B0" },
    { lane: "L1", primary: "P1 touching `README.md`", base: "B0" },
    { lane: "L1", primary: "L1 merged home", base: "L1" },
  ].map((row) => ({
    name: `129/03 task 02 — dispatchLaneBase reports the base a lane was cut from [lane: ${row.lane}, primary: ${row.primary}]`,
    run: () => withMergeHomeRepo(async ({ root, lane, milestoneDir, b0, l1 }) => {
      if (row.primary === "L1 merged home") {
        const merged = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
        assert.equal(merged.outcome, "fast-forwarded", "the fixture merged L1 home");
      } else {
        await PRIMARY[row.primary](root);
      }
      assert.equal(await dispatchLaneBase(lane), { B0: b0, L1: l1 }[row.base], `dispatchLaneBase answers ${row.base}`);
    }, { laneCommit: row.lane === "L1" }),
  })),
  ...[
    { tree: "its worktree still exists", options: "advanceTo", created: false, advanced: ["fast-forwarded", "merged"], base: "B1" },
    { tree: "its worktree was swept, branch kept", options: "advanceTo", created: true, advanced: ["fast-forwarded", "merged"], base: "B1" },
    { tree: "no branch and no worktree exist", options: "advanceTo", created: true, advanced: ["already-current"], base: "B1" },
    { tree: "its worktree still exists", options: "none", created: false, advanced: null, base: "B0" },
  ].map((row) => ({
    name: `129/03 task 02 — a lane opened on an existing line is advanced to the primary's HEAD before it is handed out [${row.tree}, ${row.options === "advanceTo" ? "{ advanceTo: B1 }" : "{}"}]`,
    run: () => withMergeHomeRepo(async ({ root, b0 }) => {
      // The lane branch exists from the earlier dispatch at B0 (the fixture's open, no L1).
      if (row.tree === "its worktree was swept, branch kept") {
        const cleaned = await cleanupDispatchLane(root, "127/02", { removeBranch: false });
        assert.equal(cleaned.outcome, "removed", "the tree was swept");
        assert.equal((await git(["rev-parse", "--verify", "--quiet", "refs/heads/aof/mesh/127-02"], root)).status, 0, "…and the branch kept");
      } else if (row.tree === "no branch and no worktree exist") {
        const cleaned = await cleanupDispatchLane(root, "127/02", { removeBranch: true });
        assert.equal(cleaned.outcome, "removed", "the tree was removed");
        assert.equal(cleaned.branchRemoved, true, "…and the branch (at B0, merged) with it");
      }
      const b1 = await PRIMARY["P1 touching `README.md`"](root);
      const answer = await resolveDispatchLane(root, "127/02", row.options === "advanceTo" ? { advanceTo: b1 } : {});
      assert.equal(answer.created, row.created, `created is ${row.created}`);
      if (row.advanced == null) {
        assert.equal("advanced" in answer, false, "the answer carries no `advanced` key");
        assert.equal(await rev(answer.worktree, "HEAD"), b0, "…and the lane's HEAD is still B0");
      } else {
        assert.ok(row.advanced.includes(answer.advanced?.outcome), `advanced.outcome is ${row.advanced.join(" or ")}: ${JSON.stringify(answer.advanced)}`);
        assert.equal(await rev(answer.worktree, "HEAD"), b1, "…and the lane's HEAD is B1");
      }
      assert.equal(await dispatchLaneBase(answer.worktree), { B0: b0, B1: b1 }[row.base], `dispatchLaneBase now answers ${row.base}`);
    }, { laneCommit: false }),
  })),
  {
    name: "129/03 task 02 — a reused lane that conflicts with HEAD is lane-open-failed",
    run: () => withMergeHomeRepo(async ({ root, lane, l1 }) => {
      const b1 = await PRIMARY["P1 conflicting on `src/promote.mjs`"](root);
      const answer = await resolveDispatchLane(root, "127/02", { advanceTo: b1 });
      assert.equal(answer.worktree, lane, "the same lane came back");
      assert.deepEqual({ outcome: answer.advanced?.outcome, code: answer.advanced?.code, cause: answer.advanced?.cause }, { outcome: "refused", code: "lane-open-failed", cause: "assignment-gate-propagation-conflict" }, `advanced is the lane-open-failed refusal carrying the verb's code as cause: ${JSON.stringify(answer.advanced)}`);
      assert.equal(await rev(lane, "HEAD"), l1, "git rev-parse HEAD in the lane is L1");
      assert.equal(await mergeHeadAbsent(lane), true, "git rev-parse -q --verify MERGE_HEAD there exits non-zero");
    }),
  },
  ...["HEAD", "main", "refs/heads/main", "B1", "0123abc-not-hex"].map((value) => ({
    name: `129/03 task 02 (accept, m129/F-38) — advanceTo that is not a commit sha is a thrown coded error before any door opens [${JSON.stringify(value)}]`,
    run: () => withDispatchRepo(async ({ root }) => {
      const calls = [];
      const double = async (args, opts) => { calls.push({ args, opts }); return { status: 0, stdout: "", stderr: "" }; };
      await assert.rejects(
        () => resolveDispatchLane(root, "53/00", { advanceTo: value, exec: double }),
        (error) => {
          assert.equal(error.code, "dispatch-lane-advance-not-a-sha", "the thrown error's code is dispatch-lane-advance-not-a-sha");
          assert.ok(error.message.includes(JSON.stringify(value)), `the message names the value: ${error.message}`);
          return true;
        },
      );
      assert.deepEqual(calls, [], "the double received no invocation — no door opened");
      assert.equal(existsSync(meshDispatchWorktreePath(root, "53/00")), false, "…and no lane was materialised");
    }),
  })),

  // ── 129/03 fix round 1 ──────────────────────────────────────────────────────────────
  {
    name: "129/03 task 02 (fix round 1, B1) — the own-writes commit holds exactly the scope: a staged out-of-scope README.md stays staged and is then refused by name",
    run: () => withMergeHomeRepo(async ({ root, milestoneDir, b0, l1 }) => {
      await writeRel(root, "README.md", "# operator, mid-commit\n");
      await git(["add", "--", "README.md"], root);
      await writeRel(root, `${MILESTONE_DIR}/STATE.md`, `${STATE_BASE}- loop note\n`);
      assert.deepEqual(await porcelain(root), ["M  README.md", " M wiki/work/127_m/STATE.md"], "the fixture planted a STAGED out-of-scope edit and a dirty in-scope one");
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir, message: "aof(loop): 127/02 home", node: "win-host-a" });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, files: answer.files, base: answer.base, tip: answer.tip },
        { outcome: "refused", code: "lane-merge-refused", files: ["README.md"], base: b0, tip: l1 },
        `the merge is refused naming the operator's staged file: ${JSON.stringify(answer)}`,
      );
      const main = await rev(root, "main");
      assert.notEqual(main, b0, "main is the own-writes commit");
      assert.equal(await rev(root, "main^"), b0, "…a child of B0");
      assert.equal(answer.commit, main, "…and the answer's commit is it");
      assert.deepEqual(await shownNames(root, "main"), [`${MILESTONE_DIR}/STATE.md`], "the own-writes commit contains exactly STATE.md — never the staged README.md");
      assert.deepEqual(await porcelain(root), ["M  README.md"], "README.md is still staged (`M `), untouched by the loop's commit");
    }),
  },
  {
    name: "129/03 task 02 (fix round 1, I1) — an untracked file in a wholly-untracked directory that the lane adds is lane-merge-refused by name, never a throw",
    run: () => withMergeHomeRepo(async ({ root, lane, milestoneDir, b0 }) => {
      const l1 = await commitIn(lane, "src2/new.mjs", "export const lane = true;\n", "L1 adds src2/new.mjs");
      await writeRel(root, "src2/new.mjs", "export const operator = true;\n");
      assert.deepEqual(await porcelain(root), ["?? src2/"], "the primary's plain porcelain collapses the directory");
      const answer = await mergeDispatchLaneHome(root, "127/02", { milestoneDir });
      assert.deepEqual(
        { outcome: answer.outcome, code: answer.code, files: answer.files, base: answer.base, tip: answer.tip, commit: answer.commit },
        { outcome: "refused", code: "lane-merge-refused", files: ["src2/new.mjs"], base: b0, tip: l1, commit: b0 },
        `a returned refusal naming the file: ${JSON.stringify(answer)}`,
      );
      assert.deepEqual(await porcelain(root), ["?? src2/"], "the primary is untouched");
      assert.equal(await mergeHeadAbsent(root), true, "no merge was begun");
    }, { laneCommit: false }),
  },
  {
    name: "129/03 task 02 (fix round 1, I2) — dispatchLaneBase answers against the PRIMARY's line when told which worktree the primary is, and only falls back to the main checkout's line without it",
    run: () => withDispatchRepo(async ({ root }) => {
      const m0 = await rev(root, "HEAD");
      // A linked worktree `dev` on its own branch is the primary (this repo gates in worktrees).
      const dev = path.join(root, ".aof", "mesh", "dev-primary");
      await git(["worktree", "add", "-q", "-b", "dev", dev, "HEAD"], root);
      const d1 = await commitIn(dev, "README.md", "# D1 on dev\n", "D1");
      assert.notEqual(d1, m0, "dev moved past the main checkout");
      assert.equal(await rev(root, "main"), m0, "…and main did not");
      const opened = await resolveDispatchLane(dev, "127/02");
      assert.equal(await rev(opened.worktree, "HEAD"), d1, "the lane was cut from the primary's HEAD, D1");
      assert.equal(await dispatchLaneBase(opened.worktree, { primaryRoot: dev }), d1, "with primaryRoot the base is D1 — the primary's line");
      assert.equal(await dispatchLaneBase(opened.worktree), m0, "…while the fallback answers the main checkout's line, M0, which is the disagreement the option exists to close");
    }),
  },
  {
    name: "129/03 task 02 (fix round 1, I3) — a reused tree holding uncommitted work cannot be brought to HEAD, and that too is lane-open-failed with the verb's code as cause",
    run: () => withMergeHomeRepo(async ({ root, lane, b0 }) => {
      await writeRel(lane, "in-progress.txt", "half-done work\n");
      const b1 = await PRIMARY["P1 touching `README.md`"](root);
      const answer = await resolveDispatchLane(root, "127/02", { advanceTo: b1 });
      assert.equal(answer.worktree, lane, "the same lane came back");
      assert.equal(answer.created, false, "…reused");
      assert.deepEqual(
        { outcome: answer.advanced?.outcome, code: answer.advanced?.code, cause: answer.advanced?.cause },
        { outcome: "refused", code: "lane-open-failed", cause: "assignment-gate-propagation-dirty-worktree" },
        `advanced is lane-open-failed with the dirty-worktree cause: ${JSON.stringify(answer.advanced)}`,
      );
      assert.equal(await rev(lane, "HEAD"), b0, "the lane's HEAD is still B0");
      assert.ok(existsSync(path.join(lane, "in-progress.txt")), "…and the uncommitted work is still there");
    }, { laneCommit: false }),
  },
  {
    name: "129/03 task 02 (fix round 1, I4a) — laneChanges reads through the one porcelain parser and still answers the NEW path of a rename and the held path of everything else",
    run: () => withDispatchRepo(async ({ root }) => {
      const lane = await resolveDispatchLane(root, "53/00");
      await git(["mv", "wiki/work/53_milestone_dispatch/SPEC.md", "wiki/work/53_milestone_dispatch/SPEC2.md"], lane.worktree);
      await writeFile(path.join(lane.worktree, "lane-only.txt"), "the lane's edit\n", "utf8");
      assert.deepEqual(await laneChanges(lane.worktree), ["wiki/work/53_milestone_dispatch/SPEC2.md", "lane-only.txt"], "the rename's NEW path, then the untracked path — the answer laneChanges gave before the parser was shared");
    }),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 129/03 task 03 — STATE.md merges by union, and only STATE.md
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "129/03 task 03 — the union attribute matches the real STATE.md paths and nothing beside them (10 rows, git's own matcher over this repository)",
    run: async () => {
      const rows = [
        ["wiki/work/127_m/STATE.md", "union"],
        ["wiki/work/127_m/stories/02_s/STATE.md", "union"],
        ["wiki/work/STATE.md", "union"],
        ["wiki/work/127_m/SPEC.md", "unspecified"],
        ["wiki/work/TECH_DEBT.md", "unspecified"],
        ["wiki/work/127_m/VERIFICATION.md", "unspecified"],
        ["wiki/work/loops.md", "unspecified"],
        ["wiki/work/127_m/stories/02_s/tasks/00_t.feature", "unspecified"],
        ["STATE.md", "unspecified"],
        ["wiki/work/127_m/STATE.md.bak", "unspecified"],
      ];
      const attrs = await checkAttr(["merge"], rows.map(([p]) => p));
      for (const [p, merge] of rows) assert.equal(attrs[p]?.merge, merge, `git check-attr merge -- ${p} reports "${p}: merge: ${merge}"`);
    },
  },
  {
    name: "129/03 task 03 — text and eol stay as they were (3 rows)",
    run: async () => {
      const rows = [
        ["wiki/work/26_milestone_distributed-runs-leasing/SPEC.md", "unspecified", "unspecified"],
        ["wiki/work/127_m/STATE.md", "unspecified", "unspecified"],
        ["scripts/deploy-wsl.sh", "set", "lf"],
      ];
      const attrs = await checkAttr(["text", "eol"], rows.map(([p]) => p));
      for (const [p, text, eol] of rows) {
        assert.equal(attrs[p]?.text, text, `${p}: text: ${text}`);
        assert.equal(attrs[p]?.eol, eol, `${p}: eol: ${eol}`);
      }
    },
  },
  ...[
    {
      laneA: "appends `- A's note` after `- base note`", laneB: "appends `- B's note` after `- base note`",
      a: `${STATE_BASE}- A's note\n`, b: `${STATE_BASE}- B's note\n`,
      result: "ends `- base note`, `- A's note`, `- B's note` in that order",
      check: (lines) => assert.deepEqual(lines.slice(-3), ["- base note", "- A's note", "- B's note"]),
    },
    {
      laneA: "appends `- same` after `- base note`", laneB: "appends `- same` after `- base note`",
      a: `${STATE_BASE}- same\n`, b: `${STATE_BASE}- same\n`,
      result: "ends `- base note`, `- same` — one copy",
      check: (lines) => { assert.deepEqual(lines.slice(-2), ["- base note", "- same"]); assert.equal(lines.filter((l) => l === "- same").length, 1, "one copy"); },
    },
    {
      laneA: "appends `- A's note` under `## Notes`", laneB: "appends `- B's feedback` under a new `## Feedback (for retro)`",
      a: `${STATE_BASE}- A's note\n`, b: `${STATE_BASE}\n## Feedback (for retro)\n\n- B's feedback\n`,
      result: "contains both `- A's note` and `- B's feedback`",
      check: (lines) => { assert.ok(lines.includes("- A's note"), "contains A's note"); assert.ok(lines.includes("- B's feedback"), "contains B's feedback"); },
    },
    {
      laneA: "rewrites `- base note` as `- base note A`", laneB: "rewrites `- base note` as `- base note B`",
      a: STATE_BASE.replace("- base note", "- base note A"), b: STATE_BASE.replace("- base note", "- base note B"),
      result: "contains `- base note A` then `- base note B` and no `- base note` line",
      check: (lines) => { assert.ok(lines.indexOf("- base note A") >= 0 && lines.indexOf("- base note A") < lines.indexOf("- base note B"), "A then B"); assert.ok(!lines.includes("- base note"), "no `- base note` line"); },
    },
  ].map((row) => ({
    name: `129/03 task 03 — two lanes' edits to one STATE.md merge clean under union, both kept [A ${row.laneA}; B ${row.laneB}]`,
    run: () => withUnionRepo(async ({ root, a, b }) => {
      await commitIn(a.worktree, `${MILESTONE_DIR}/STATE.md`, row.a, "lane A");
      await commitIn(b.worktree, `${MILESTONE_DIR}/STATE.md`, row.b, "lane B");
      const first = await mergeDispatchLaneHome(root, "127/01", { milestoneDir: MILESTONE_DIR, node: "n" });
      assert.equal(first.outcome, "fast-forwarded", `the first merge answers fast-forwarded: ${JSON.stringify(first)}`);
      const second = await mergeDispatchLaneHome(root, "127/02", { milestoneDir: MILESTONE_DIR, node: "n" });
      assert.equal(second.outcome, "merged", `the second merge answers merged: ${JSON.stringify(second)}`);
      assert.equal(await mergeHeadAbsent(root), true, "git rev-parse -q --verify MERGE_HEAD exits non-zero");
      const body = (await git(["show", `main:${MILESTONE_DIR}/STATE.md`], root)).stdout;
      const lines = body.split(/\r?\n/).filter((line) => line.length > 0);
      row.check(lines);
      assert.ok(!/^(<{7}|={7}|>{7})/mu.test(body), "…and contains no conflict-marker line");
      assert.ok(body.startsWith("---\ndoc: state\n---\n"), "main's STATE.md begins with the `---` / `doc: state` / `---` block");
      assert.equal(body.split("\n").filter((line) => line === "---").length, 2, "…exactly one such block");
      assert.equal(body.split("\n").filter((line) => line === "doc: state").length, 1, "…with one `doc: state` line");
    }, { doc: `${MILESTONE_DIR}/STATE.md`, base: STATE_BASE }),
  })),
  ...[
    { doc: `${MILESTONE_DIR}/VERIFICATION.md`, base: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | pending |\n", a: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | A |\n", b: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | B |\n", label: "VERIFICATION.md, both rewrite the F-1 row" },
    { doc: `${MILESTONE_DIR}/VERIFICATION.md`, base: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | pending |\n", a: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | pending |\n| F-2 | A |\n", b: "# Verification\n\n| id | result |\n|---|---|\n| F-1 | pending |\n| F-2 | B |\n", label: "VERIFICATION.md, both append an F-2 row after F-1" },
    { doc: "wiki/work/TECH_DEBT.md", base: "# Tech debt\n\n## 4. D\n\nfour\n", a: "# Tech debt\n\n## 4. D\n\nfour\n\n## 5. A\n", b: "# Tech debt\n\n## 4. D\n\nfour\n\n## 5. B\n", label: "TECH_DEBT.md, both append ## 5." },
    { doc: `${MILESTONE_DIR}/stories/02_s/tasks/00_t.feature`, base: "Feature: t\n\n  Scenario: s\n    When x\n    Then y\n", a: "Feature: t\n\n  Scenario: s\n    When x\n    Then A\n", b: "Feature: t\n\n  Scenario: s\n    When x\n    Then B\n", label: "a task .feature, both rewrite the Then line" },
  ].map((row) => ({
    name: `129/03 task 03 — a same-hunk collision on a non-union record doc still conflicts [${row.label}]`,
    run: () => withUnionRepo(async ({ root, a, b }) => {
      await commitIn(a.worktree, row.doc, row.a, "lane A");
      const bTip = await commitIn(b.worktree, row.doc, row.b, "lane B");
      const first = await mergeDispatchLaneHome(root, "127/01", { node: "n" });
      assert.equal(first.outcome, "fast-forwarded", "lane A merged first");
      const second = await mergeDispatchLaneHome(root, "127/02", { node: "n" });
      assert.deepEqual({ outcome: second.outcome, code: second.code, ref: second.ref }, { outcome: "conflict", code: "lane-merge-conflict", ref: "127/02" }, `the second merge answers the conflict: ${JSON.stringify(second)}`);
      assert.equal(await mergeHeadAbsent(root), true, "git rev-parse -q --verify MERGE_HEAD in the primary exits non-zero");
      assert.equal((await git(["show", `main:${row.doc}`], root)).stdout, (await git(["show", `aof/mesh/127-01:${row.doc}`], root)).stdout, "git show main:<doc> is byte-identical to git show aof/mesh/127-01:<doc>");
      assert.equal(await rev(root, "aof/mesh/127-02"), bTip, "git rev-parse aof/mesh/127-02 is lane B's tip");
      assert.deepEqual(await conflictMarkers(root), [], "no file in the primary contains a conflict marker");
    }, { doc: row.doc, base: row.base }),
  })),
  {
    name: "129/03 task 03 — the attributes file carries exactly one merge attribute",
    run: async () => {
      const lines = (await readFile(path.join(repoRoot, ".gitattributes"), "utf8")).split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
      const mergeLines = lines.filter((line) => line.includes("merge="));
      // 119/FF-11902's admitted form (applied at aof:verify 127; 129/03's case): the union line is named
      // AMONG the derived set and every member is asserted admitted — never the set as a literal.
      const UNION_LINE = "wiki/work/**/STATE.md merge=union";
      assert.ok(mergeLines.includes(UNION_LINE), "the union line is the merge attribute");
      for (const line of mergeLines) assert.equal(line, UNION_LINE, `only the union line carries merge= — found ${line}`);
      for (const line of lines) {
        if (line === "wiki/work/**/STATE.md merge=union") continue;
        const [, ...attrs] = line.split(/\s+/u);
        assert.ok(attrs.length > 0, `${line} names an attribute`);
        for (const attr of attrs) assert.match(attr, /^-?text$|^eol=/u, `${line}: "${attr}" is a text/eol attribute, as before this story`);
      }
    },
  },
  // ── 129/07 task 01 — the lane bound narrows ──────────────────────────────────
  //
  // `wiki/work/129_milestone_loop-concurrency/stories/07_story_the-loop-settings-are-self-contained/
  //   tasks/01_the-lane-bound-narrows.feature` — the dispatch-side rows. The loop-side rows (the
  // key passed when set, the serial wave) are in `test/loop/loop-command-wave.test.mjs`.
  ...[
    [3, {}, 3],
    [3, { bound: 2 }, 2],
    [3, { bound: 1 }, 1],
    [3, { bound: 3 }, 3],
    [3, { bound: 5 }, 3],
    [3, { bound: 0 }, 3],
    [3, { bound: 2.5 }, 3],
    [3, { bound: "2" }, 3],
    [undefined, { bound: 2 }, 2],
    [undefined, {}, 3],
    [2, { bound: 3 }, 2],
  ].map(([pool, ask, effective]) => ({
    name: `129/07 task01 the effective bound is the pool's narrowed by a caller's positive integer [pool ${pool ?? "unset"}, ${JSON.stringify(ask)} → ${effective}]`,
    run: () => withDispatchRepo(async ({ root }) => {
      const workspace = { projectRoot: root, config: { work: pool === undefined ? {} : { dispatch: { concurrency: pool } } } };
      const answer = await dispatchCommand.run({ list: true, ...ask }, { workspace });
      assert.equal(answer.action, "list");
      assert.equal(answer.bound, effective, "the answer's bound is the effective one");
      assert.equal(narrowDispatchBound(pool === undefined ? 3 : pool, ask.bound), effective, "…and the pure narrowing agrees");
    }),
  })),
  {
    name: "129/07 task01 admission runs under the narrowed bound and every face answers it",
    run: () => withDispatchRepo(async ({ root }) => {
      const workspace = { projectRoot: root, config: { work: { dispatch: { concurrency: 3 } } } };
      let inFlight = 0;
      let peak = 0;
      const ctx = {
        workspace,
        runDispatchLane: async (member) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 10));
          inFlight -= 1;
          return { ref: member.ref, outcome: "opened", worktree: `lane-${member.ref}`, created: true, reused: false };
        },
      };
      const answer = await dispatchCommand.run({ refs: ["53/00", "53/01", "53/02"], bound: 2 }, ctx);
      assert.equal(answer.bound, 2, "the answer's bound is the narrowed one");
      const outcomes = answer.dispatched.map((entry) => entry.value?.outcome ?? entry.outcome ?? "opened");
      assert.deepEqual(outcomes, ["opened", "opened", "refused"], "two admitted, one refused");
      assert.equal(answer.dispatched[2].value.reason, "at-capacity");
      assert.ok(answer.peak <= 2, `materialised peak ${answer.peak} is at most 2`);
      assert.ok(peak <= 2, `observed peak ${peak} is at most 2`);
      assert.equal((await dispatchCommand.run({ list: true, bound: 2 }, ctx)).bound, 2);
      assert.equal((await dispatchCommand.run({ list: true }, ctx)).bound, 3, "…and without the narrowing the pool's bound is answered");
      assert.equal((await dispatchCommand.run({ cleanup: true, ref: "53/00", bound: 2 }, ctx)).bound, 2, "cleanup answers the narrowed bound too");
    }, { stories: ["00", "01", "02"] }),
  },
  {
    name: "129/07 task01 the input schema declares bound as a number, additionalProperties stays false, and the narrowing ignores a non-integer",
    run: () => {
      assert.deepEqual(dispatchCommand.input.properties.bound, { type: "number" });
      assert.equal(dispatchCommand.input.additionalProperties, false);
      assert.equal(narrowDispatchBound(3, 2.5), 3);
      assert.equal(narrowDispatchBound(3, "2"), 3);
      assert.equal(narrowDispatchBound(3, Number.NaN), 3);
      assert.equal(narrowDispatchBound(3, -1), 3);
      assert.equal(narrowDispatchBound(3, 2), 2);
    },
  },
  {
    name: "129/07 task01 ADR-006 records the amendment — a dated 2026-09-15 narrowing, read in the bounds home, handed to work:dispatch as bound; the invariant still says the family reads neither key",
    run: async () => {
      // 127/ADR-004 §3 — the milestone is reached by REF, never by a literal folder: `findWork`
      // answers wherever the folder sits, so 129's own archive after its accept reddens nothing here.
      const [milestone] = await findWork(path.join(repoRoot, "wiki", "work"), "129");
      assert.ok(milestone?.dir, "milestone 129 resolves through findWork (live or archived)");
      const adr = await readFile(path.join(milestone.dir, "ARCHITECTURE.md"), "utf8");
      const start = adr.indexOf("## ADR-006");
      const end = adr.indexOf("## ADR-007");
      assert.ok(start >= 0 && end > start, "ADR-006 is present");
      const body = adr.slice(start, end);
      assert.ok(body.includes("AMENDED 2026-09-15 (129/07"), "a dated amendment");
      for (const needle of ["work.loop.dispatch.concurrency", "min(bound, pool)", "src/loop-bounds.mjs", "narrowDispatchBound", "`bound`"]) assert.ok(body.includes(needle), `the amendment names ${needle}`);
      const invariant = body.slice(body.indexOf("### Invariant"));
      assert.ok(invariant.includes("contain no read of `work.dispatch.concurrency`, spell no") && invariant.includes("`work.loop.dispatch.concurrency`"), "the invariant still holds the family to neither key");
    },
  },
];
