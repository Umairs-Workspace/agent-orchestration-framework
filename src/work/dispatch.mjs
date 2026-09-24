// src/work/dispatch.mjs — THE LOCAL CONCURRENT-DISPATCH LANE (story 65 / task 02).
//
// WHAT THIS MODULE IS FOR, in one measured sentence. `aof work next` now answers with the
// whole ready set (task 01), and a set is only worth answering if acting on it is SOUND —
// so this module is the local, non-mesh door onto the worktree machinery that makes
// concurrent story builds safe, plus the bound that stops a serialisation problem being
// traded for a contention one.
//
// IT AUTHORS NO WORKTREE MACHINERY. `src/mesh/worktree.mjs` already owns worktree-per-item,
// branch-per-item (`meshItemBranchName`), the `git worktree add` argv form, cleanup and the
// porcelain parser; the dispatch lane's own root/slug/path seams live there too, beside the
// assignment lane's and the session lane's, because the ref sanitizer lives there and a
// second spelling of a path convention is the drift those seams exist to prevent. What
// lives HERE is the policy: which door to take, how many at once, what a lane reports, and
// when a lane may be removed.
//
// THE ORDER OF DOORS IS `resolveSessionWorktree`'s, DELIBERATELY (mesh-session-spawn-handler
// .mjs:126-155). That resolver already answers "which tree does this ref open?" and already
// survives two callers racing one `git worktree add` — the loser reads the winner's tree
// rather than being refused, because the tree it asked for is the outcome it wanted. Both
// properties are exactly what a concurrent dispatcher needs, so the shape is reused rather
// than re-invented; only the lane's root and its branch policy differ.
import path from "node:path";
import { existsSync } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import {
  meshDispatchWorktreePath,
  isUnderMeshDispatchWorktreesRoot,
  addDispatchWorktree,
  removeDispatchWorktree,
  meshItemBranchName,
  findItemWorktree,
  listWorktrees,
  advanceBranchToBase,
  commitWorktreeChanges,
  parsePorcelainStatus,
  resolveExec,
} from "../mesh/worktree.mjs";
// 129/03 — the ref-in-worktree resolver moved here from the mesh's god-node and resolves the
// item the way the primary checkout does: ENUMERATE-then-filter through `findWork`, never a
// path joined from ref text. `work.mjs` imports nothing under `src/work/`, so this edge closes
// no cycle, and `worktree.mjs` already reaches it, so no pinned closure gains a node.
import { findWork } from "../work.mjs";
// m42 item 3 — every swallowed fault reports a coded degrade event, never silence.
import { reportDegrade } from "../degrade.mjs";
import { acquireMeshLauncherLock } from "../mesh/launcher-lock.mjs";

// ───────────────────────────────────── THE BOUND: ONE KEY, ONE DEFAULT, ONE SITE ────
//
// THE CONFIGURED KEY IS `work.dispatch.concurrency`, AND THIS FILE IS ITS ONLY READER.
// Before adding it, every place this repo already resolves a concurrency/parallelism limit
// was searched (2026-08-15): there is none. What the repo has is a well-established SHAPE
// for a single configured limit — `DEFAULT_*` + `resolve*(value)` + `*FromConfig(workspace)`
// in the module that owns the concept — used by `mesh-sync-cadence.mjs`,
// `mesh-presence-loop.mjs`, `mesh-presence.mjs`, `cache-provenance.mjs`, `mesh-session.mjs`
// and `mesh-relay.mjs`. So this is that shape's next instance, not a new idiom, and
// `acd-dispatch-bound-single-home` holds it to one home: a second resolution site is how a
// bound ends up right in one door and silently wrong in the next.
//
// THE VALUE IS A DOCUMENTED DEFAULT, NOT A FINDING. 65/RESEARCH.md is explicit that no
// measurement here fixes the number ("it wants a soak") and task 02 is explicit that the
// bound's VALUE is `PRD-acd-loop-performance.md`'s question — only that a bound is enforced
// and reported. 3 is chosen as the reversible documented default because the same research
// measures agents at 33-44% toolchain wait (worst case 90%), and six lanes contending for
// one test runner is the contention problem this bound exists to avoid; it is changed by a
// config edit, never by a second constant.
export const DEFAULT_DISPATCH_CONCURRENCY = 3;

// resolveDispatchConcurrency(value) — the bound policy over a raw config value, byte-for-byte
// the matrix `resolveSyncCadenceSeconds` keeps: a valid positive INTEGER is used verbatim;
// ANY malformed value falls back to the documented default without crashing. Malformed =
// absent/null/undefined, any non-number type (including the numeric-looking STRING "3" — no
// silent string→number coercion — and a boolean), 0, negative, and a non-integer float.
// NaN/Infinity are caught by the finite+integer checks.
export function resolveDispatchConcurrency(value) {
  if (typeof value !== "number") return DEFAULT_DISPATCH_CONCURRENCY;
  if (!Number.isFinite(value)) return DEFAULT_DISPATCH_CONCURRENCY;
  if (!Number.isInteger(value)) return DEFAULT_DISPATCH_CONCURRENCY;
  if (value <= 0) return DEFAULT_DISPATCH_CONCURRENCY;
  return value;
}

// dispatchConcurrencyFromConfig(workspace) — THE ONE RESOLUTION SITE. Read off
// `workspace.config.work.dispatch.concurrency` through the raw optional-chain idiom (never
// the config editor, whose whitelist would drop an unknown block on rewrite — the m22
// story-01 lesson). Tolerant of a missing config/work/dispatch subtree.
export function dispatchConcurrencyFromConfig(workspace) {
  return resolveDispatchConcurrency(workspace?.config?.work?.dispatch?.concurrency);
}

// narrowDispatchBound(pool, requested) — 129/07 (129/ADR-006, amended). A caller may ask for
// FEWER lanes than the pool allows and never more: a positive-integer request narrows the
// effective bound to min(requested, pool); anything else (absent, 0, a float, a string, a value
// above the pool's) leaves the pool's bound in effect. The pool bound stays the ONE number for
// the machine; this is how the loop's own `work.loop.dispatch.concurrency` reaches admission
// without a second resolution site for the pool's key.
export function narrowDispatchBound(pool, requested) {
  if (typeof requested !== "number" || !Number.isInteger(requested) || requested <= 0) return pool;
  return Math.min(requested, pool);
}

// ───────────────────────────────────────────────────── the injected exec seam ────
//
// BORROWED from `src/mesh/worktree.mjs` (129/03 fix round, I4b): `resolveExec(options)` answers
// the injected `exec(args, { cwd }) => { stdout, stderr, status }` or that module's ONE literal
// `git` spawn — argv-form only, never a shell string. This module used to carry a second copy
// of the spawn; two spellings of one seam drift, and a lane verb that composes the worktree
// module's verbs should meet the same runner they do. Production spawns real git; a test
// injects a double or — for the lane scenarios, which are explicitly resolved to run over a
// REAL `git worktree` in a temp fixture repo — lets the default through.
const text = (result) => String(result?.stdout ?? "").trim();

// ──────────────────────────────── resolving an item AS IT LIVES IN A LANE ────
//
// MOVED HERE at 129/03 from `src/mesh/worker-execution.mjs` (129/ADR-008 §4, ADR-005 §5;
// TECH_DEBT item 83 seam 3). The loop's wave resolves the item in the LANE before every
// run-record write (FF-12903: the tree that commits the change owns the record), and the
// resolver's only previous home was the module that imports the PTY driver — reaching it from
// `src/loop/wave.mjs` would have dragged the driver into the loop family. `worktree.mjs` was
// ruled out too: its closure sits inside the session driver's pinned mesh-blind reach and
// must gain no `work.mjs` edge. The lane's home is where "which item is this, in this tree?"
// belongs. Both are re-exported from `worker-execution.mjs` so every importer keeps its line.

// worktreeWorkDir(projectRoot, workDir, worktreePath) — the SAME work.mjs resolution the
// primary checkout uses, re-rooted at the worktree: workDir is always `projectRoot` joined
// with the configured (default "./wiki/work") relative segment, so re-joining that SAME
// relative segment onto the worktree path resolves the item inside the worktree's OWN
// checkout (never the primary working copy).
export function worktreeWorkDir(projectRoot, workDir, worktreePath) {
  const relative = path.relative(projectRoot, workDir);
  return path.join(worktreePath, relative);
}

// resolveRefInWorktree(projectRoot, workDir, worktreePath, itemRef) — the T3b / F4b
// ref-scoping seam: resolution is ENUMERATE-then-filter (findWork, work.mjs), exactly as the
// primary checkout resolves — NEVER a `path.join(worktreePath, itemRef)` built from directive
// text. A traversal ref (`../../etc`, an absolute path, a `..`-laden ref) matches nothing
// under ITEM_RE and yields no item; no path is ever constructed from it. Returns the resolved
// item row (with `.dir` INSIDE the worktree) or null. `acd-worktree-path-scoped` reads this
// module for the `findWork(rootedWorkDir, itemRef)` form.
export async function resolveRefInWorktree(projectRoot, workDir, worktreePath, itemRef) {
  const rootedWorkDir = worktreeWorkDir(projectRoot, workDir, worktreePath);
  const matches = await findWork(rootedWorkDir, itemRef);
  return matches.find((row) => row.ref === itemRef) ?? matches[0] ?? null;
}

// withDispatchLaneAdmissionLock(projectRoot, operation) — serialize the whole
// inspect -> plan -> materialise decision across independent CLI processes.
// The lock lives in git's COMMON admin directory, so commands launched from the
// main checkout and from linked worktrees still meet at one repository-scoped
// door. It is coordination only, never a lane/lease/occupancy record, and is
// removed by the owner-token release immediately after materialisation.
export async function withDispatchLaneAdmissionLock(projectRoot, operation, options = {}) {
  const exec = resolveExec(options);
  const common = await exec(["rev-parse", "--git-common-dir"], { cwd: projectRoot });
  const commonDirText = String(common.stdout ?? "").trim();
  if (common.status !== 0 || commonDirText.length === 0) {
    const error = new Error(`Dispatch admission could not locate the repository lock root: ${String(common.stderr ?? "git rev-parse failed").trim()}`);
    error.code = "dispatch-admission-undeterminable";
    throw error;
  }
  const lockRoot = path.resolve(projectRoot, commonDirText);
  const timeoutMs = Number.isFinite(options.lockTimeoutMs) ? options.lockTimeoutMs : 30_000;
  const pollMs = Number.isFinite(options.lockPollMs) ? options.lockPollMs : 25;
  const deadline = Date.now() + timeoutMs;
  let lock = null;
  do {
    lock = await acquireMeshLauncherLock({
      paths: { meshRoot: lockRoot },
      lockName: "aof-dispatch-admission.lock",
      ...(options.lockOptions ?? {}),
    });
    if (lock.acquired) break;
    if (Date.now() >= deadline) {
      const error = new Error(`Dispatch admission timed out waiting for repository lock ${lock.path}.`);
      error.code = "dispatch-admission-lock-timeout";
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);

  try {
    return await operation();
  } finally {
    await lock.release();
  }
}

// nativePath(value) — ONE BASIS FOR A LANE'S PATH, and it is a measured fix rather than a
// tidy-up. `git worktree list --porcelain` reports FORWARD-SLASHED paths on Windows
// (`C:/Users/…/dispatch-53-00`) while `meshDispatchWorktreePath` composes OS-native ones
// (`C:\Users\…\dispatch-53-00`), so a lane resolved through door 1 (git) and the same lane
// resolved through door 3 (the seam) came back as two different strings for one directory —
// caught by the reuse and lane-report scenarios. Every path this module RETURNS is
// normalised here, so a caller comparing `lane.worktree` against the seam, keying a map by
// it, or printing it, meets one spelling. `path.resolve` normalises separators only; it
// resolves no symlink and changes no location.
const nativePath = (value) => (typeof value === "string" && value.length > 0 ? path.resolve(value) : value);

// ─────────────────────────────────────────────────────── resolving one lane ────

// resolveDispatchLane(projectRoot, itemRef, options) — WHICH TREE DOES THIS STORY BUILD IN?
//
// THREE DOORS, IN THIS ORDER, and the order is `resolveSessionWorktree`'s with one door's
// reason changed:
//
//   (1) THE ITEM'S LIVE TREE, wherever it is, located as a GIT-LEVEL FACT: the worktree
//       checked out on `refs/heads/aof/mesh/<ref>` (`findItemWorktree`). This is what makes
//       "an existing worktree for the story is reused, not re-created" true whether the
//       earlier tree came from THIS lane, from a mesh assignment, or from an operator's
//       session — one line per item, one tree per line, git's own rule (a branch can be
//       checked out in at most one worktree) making the answer exact rather than a guess.
//       BEST-EFFORT: a git fault here is reported and falls to door 2, because a checkout
//       that cannot be listed is a checkout with no live tree to find, and refusing the
//       dispatch would deny the fallback that still works.
//
//   (2) AN EXISTING LANE TREE at this ref's key, reused as-is with no git call.
//
//   (3) A FRESH LANE TREE — `addDispatchWorktree`, on the item's branch, under the dispatch
//       lane's OWN root.
//
// AND THE RACE, which is the headline concurrency case rather than an edge: two dispatchers
// asking for the same ref in the same moment both see `existsSync === false` and both run
// `git worktree add`. One wins; the loser's git exits non-zero. The loser is NOT refused —
// the postcondition door 2 tests is now true, and a tree at the key's path is precisely the
// outcome it asked for. A genuine add failure (a bad base, a broken repo) creates nothing,
// so `existsSync` stays false and the fault stands.
//
// Returns { ref, worktree, branch, created, reused } — `created` distinguishes "this call
// materialised it" from "it was already there", which is what a dispatcher reports.
//
// `options.advanceTo` (129/03, 129/ADR-002 §7) — A LANE OPENED ON AN EXISTING LINE IS
// ADVANCED TO THE PRIMARY'S HEAD FIRST, so its base is the current primary and never a stale
// tip left by an earlier dispatch. It is a SHA the caller resolved in the PRIMARY (`git
// rev-parse HEAD` there) — never a ref, which the lane would resolve against its own tip.
// Whenever it is given, `advanceBranchToBase(lane, advanceTo)` runs after the lane is
// resolved on ANY door (strict — a lane is nobody's desk) and the answer carries its
// outcome as `advanced`: a fresh cut and a reused current tree answer `already-current`; a
// branch-only reopen (the tree swept, the unmerged line kept) is the case that moves,
// `fast-forwarded` or `merged`; a conflict is aborted by the verb and reported here as
// `{ outcome: "refused", code: "lane-open-failed", cause }`. Without `advanceTo` nothing
// runs and the answer carries no `advanced` key — byte-identical to the door before it.
//
// THE SHA RULE IS ENFORCED, not only stated (129/03 accept, `m129/F-38`): a value that is not a
// hex object name (7–64 hex digits) is a THROWN coded error, `dispatch-lane-advance-not-a-sha`,
// raised before any door opens — a ref such as `HEAD` or `main` would resolve against the LANE
// and answer `already-current` silently, which is exactly the stale base the option exists to
// prevent. A caller passes `git rev-parse HEAD` from the primary, never the words.
const OBJECT_NAME = /^[0-9a-f]{7,64}$/iu;

export async function resolveDispatchLane(projectRoot, itemRef, options = {}) {
  const advanceTo = typeof options.advanceTo === "string" && options.advanceTo.length > 0 ? options.advanceTo : null;
  if (advanceTo != null && !OBJECT_NAME.test(advanceTo)) {
    const error = new Error(`resolveDispatchLane: advanceTo must be a commit sha resolved in the primary (git rev-parse HEAD there), never a ref — got ${JSON.stringify(advanceTo)}`);
    error.code = "dispatch-lane-advance-not-a-sha";
    error.advanceTo = advanceTo;
    throw error;
  }
  const lane = await openDispatchLane(projectRoot, itemRef, options);
  await inheritLocalClaudeSettings(projectRoot, lane.worktree);
  if (advanceTo == null) return lane;
  const advance = await advanceBranchToBase(lane.worktree, advanceTo, { exec: options.exec });
  // EVERY refusal is `lane-open-failed` (PO ruling, 129/03 fix round, I3): a lane that cannot be
  // brought to HEAD cannot be handed out, whichever door refused — a conflict or a dirty tree
  // alike — and the wave switches on ONE code. The verb's own code rides as `cause`.
  const advanced = advance.outcome === "refused"
    ? { ...advance, code: "lane-open-failed", cause: advance.code }
    : advance;
  return { ...lane, advanced };
}

// inheritLocalClaudeSettings(projectRoot, worktree) — A LANE CARRIES THE OPERATOR'S LOCAL CLAUDE
// CONSENT (2026-09-24). `.claude/settings.local.json` is git-ignored, so a lane cut from the primary
// never has it — and in a repo with a `.mcp.json` it is where the operator approved those servers
// (`enabledMcpjsonServers`). Without it every lane's `claude` opens on the MCP-approval dialog,
// which eats the typed directive: no transcript, no session id, `failed / timeout` at the
// deadline (voice-vox-company-portal, 01/01, 01/06, 01/08 — nine attempts, none started). The
// primary's own file is copied, never synthesised: the lane is the same repository and the same
// operator, so it approves exactly what the primary approved. A lane that already holds the file
// keeps its own; a primary with none copies nothing. Best-effort — a failed copy leaves claude's
// dialog in place, as before.
async function inheritLocalClaudeSettings(projectRoot, worktree) {
  const source = path.join(projectRoot, ".claude", "settings.local.json");
  const target = path.join(worktree, ".claude", "settings.local.json");
  if (path.resolve(source) === path.resolve(target) || !existsSync(source) || existsSync(target)) return;
  try {
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  } catch (error) {
    reportDegrade("work-dispatch", error);
  }
}

// openDispatchLane(projectRoot, itemRef, options) — the three doors, exactly as before 129/03
// gave `resolveDispatchLane` its advance; split out so the advance sits AFTER whichever door
// answered rather than being spelled once per door.
async function openDispatchLane(projectRoot, itemRef, options = {}) {
  const branch = meshItemBranchName(itemRef);
  const lanePath = meshDispatchWorktreePath(projectRoot, itemRef);
  const lane = (worktree, created) => ({ ref: itemRef, worktree: nativePath(worktree), branch, created, reused: !created });

  // Door 1 — the item's live tree, by the branch git actually holds.
  try {
    const live = await findItemWorktree(projectRoot, itemRef, { exec: options.exec });
    if (live != null && existsSync(live)) return lane(live, false);
  } catch (error) {
    reportDegrade("work-dispatch", error);
  }

  // Door 2 — this lane's own tree at the ref's key.
  if (existsSync(lanePath)) return lane(lanePath, false);

  // Door 3 — materialise it.
  try {
    return lane(await addDispatchWorktree(projectRoot, itemRef, options.commitish ?? "HEAD", { exec: options.exec }), true);
  } catch (error) {
    // The concurrent-`add` race: the loser reads the winner's tree.
    if (existsSync(lanePath)) {
      reportDegrade("work-dispatch", error);
      return lane(lanePath, false);
    }
    // …or the winner took the item's branch into ITS tree, wherever that is (a mesh
    // assignment lane racing this one), which door 1 can now see.
    try {
      const live = await findItemWorktree(projectRoot, itemRef, { exec: options.exec });
      if (live != null && existsSync(live)) {
        reportDegrade("work-dispatch", error);
        return lane(live, false);
      }
    } catch (lookupError) {
      reportDegrade("work-dispatch", lookupError);
    }
    throw error;
  }
}

// ───────────────────────────────────────────────── the bounded fan-out ────

// dispatchReadySet(members, runLane, options) — run the ready set, AT MOST `bound` AT ONCE.
//
// THE BOUND IS ENFORCED, NOT ADVERTISED. `peak` is measured from the in-flight count rather
// than asserted from the schedule, because "we only ever start `bound` of them" is the claim
// and a scheduler that starts them all and awaits them in chunks would satisfy a weaker one.
// The remainder are dispatched AS LANES FREE — a worker-pool, not a barrier between waves:
// a barrier would idle the whole fan-out behind its slowest member, which is the same
// serialisation cost this story exists to remove, one level down.
//
// `runLane(member, laneIndex)` is INJECTED and is the only thing that varies between "start
// an agent", "run a build" and a test's recorder — this function knows about concurrency and
// nothing else. A lane that THROWS is recorded as `{ ok: false, error }` and never stops the
// others: one failed story must not strand the five that are fine.
//
// Returns { bound, dispatched: [{ ref, ok, value?, error? }], peak, ranAtOnce }.
export async function dispatchReadySet(members, runLane, options = {}) {
  const bound = Number.isInteger(options.bound) && options.bound > 0
    ? options.bound
    : dispatchConcurrencyFromConfig(options.workspace);
  const queue = [...(members ?? [])];
  const dispatched = new Array(queue.length);
  let cursor = 0;
  let inFlight = 0;
  let peak = 0;

  const lane = async () => {
    for (;;) {
      const index = cursor;
      if (index >= queue.length) return;
      cursor += 1;
      const member = queue[index];
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      try {
        dispatched[index] = { ref: member?.ref ?? null, ok: true, value: await runLane(member, index) };
      } catch (error) {
        dispatched[index] = { ref: member?.ref ?? null, ok: false, error };
      } finally {
        inFlight -= 1;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(bound, queue.length) }, lane));
  return { bound, dispatched, peak, ranAtOnce: peak };
}

// ─────────────────────────────────────────────── inspecting the live lanes ────

// laneChanges(worktreePath, options) — the files this lane has touched, from
// `git status --porcelain` inside the lane's OWN tree. Both halves matter: it is how a lane
// says whether it holds uncommitted work (so the sweep never removes one that does) and it
// is the input to the overlap report.
export async function laneChanges(worktreePath, options = {}) {
  const exec = resolveExec(options);
  try {
    const result = await exec(["status", "--porcelain"], { cwd: worktreePath });
    if (result.status !== 0) return [];
    // Through the ONE porcelain parser (`parsePorcelainStatus`, worktree.mjs — 129/03 fix round,
    // I4a): a rename is `XY <old> -> <new>`, and the NEW path is the one this lane now holds.
    return parsePorcelainStatus(result.stdout)
      .map(({ paths }) => paths[paths.length - 1])
      .filter(Boolean);
  } catch (error) {
    reportDegrade("work-dispatch", error);
    return [];
  }
}

// The window a lane may produce nothing in before it is called QUIET rather than working.
// A documented default in the same shape as the bound; injectable per call, because "gone
// quiet" is a judgement an operator tunes.
export const DEFAULT_LANE_QUIET_MS = 10 * 60 * 1000;

// inspectDispatchLanes(projectRoot, refs, options) — EVERY LANE, INDIVIDUALLY REPORTABLE.
//
// The lane set is read from `git worktree list --porcelain` filtered to the dispatch root —
// git is asked what it holds, exactly as `findItemWorktree` does, and NOTHING is inferred
// from a directory name (TECH_DEBT 47's whole lesson). The REF is then recovered by matching
// each entry's path against the paths the known refs derive to (the enumerate-then-filter
// resolver idiom); an entry matching no known ref is still reported, with `ref: null`, so a
// lane left by a since-renumbered item is visible rather than invisible.
//
// Each lane reports `{ ref, worktree, branch, head, changed, dirty, lastActivityAt, state }`
// where state ∈ "working" | "quiet" | "prunable". "Quiet" is the honest local observable: the
// lane has produced no file change inside the quiet window. A lane the sweep can see but git
// cannot (a directory removed under it) is `prunable`.
export async function inspectDispatchLanes(projectRoot, refs = [], options = {}) {
  const exec = resolveExec(options);
  const now = Number.isFinite(options.nowMs) ? options.nowMs : Date.parse(options.now ?? new Date().toISOString());
  const quietMs = Number.isInteger(options.quietMs) && options.quietMs > 0 ? options.quietMs : DEFAULT_LANE_QUIET_MS;
  const byPath = new Map((refs ?? []).map((ref) => [nativePath(meshDispatchWorktreePath(projectRoot, ref)), ref]));

  let entries = [];
  try {
    entries = (await listWorktrees(projectRoot, { exec }))
      .filter((entry) => isUnderMeshDispatchWorktreesRoot(projectRoot, entry.path));
  } catch (error) {
    reportDegrade("work-dispatch", error);
    if (options.throwOnListError === true) throw error;
    return [];
  }

  const lanes = [];
  for (const entry of entries) {
    // ONE BASIS on both sides of the match AND in the answer — git's porcelain is
    // forward-slashed on Windows and the seam is not (see `nativePath`).
    const worktree = nativePath(entry.path);
    const ref = byPath.get(worktree) ?? null;
    const branch = typeof entry.branch === "string" ? entry.branch.replace(/^refs\/heads\//, "") : null;
    if (entry.prunable || !existsSync(worktree)) {
      lanes.push({ ref, worktree, branch, head: entry.head ?? null, changed: [], dirty: false, lastActivityAt: null, state: "prunable" });
      continue;
    }
    const changed = await laneChanges(worktree, { exec });
    const lastActivityAt = await laneActivityAt(worktree, changed, options);
    const quiet = lastActivityAt == null || (Number.isFinite(now) && now - lastActivityAt > quietMs);
    lanes.push({
      ref,
      worktree,
      branch,
      head: entry.head ?? null,
      changed,
      dirty: changed.length > 0,
      lastActivityAt: lastActivityAt == null ? null : new Date(lastActivityAt).toISOString(),
      // A lane that has gone quiet is distinguishable from one that is working, and the
      // distinction is derived from what the lane itself produced — never from a liveness
      // claim some other process made about it.
      state: quiet ? "quiet" : "working",
    });
  }
  return lanes;
}

// dispatchLaneOccupiesSlot(lane) — ADR-006's amended local counted-set rule.
// A real tree holds capacity whether it is producing files or has gone quiet;
// only git's prunable/no-tree report releases it. Dirty is deliberately absent:
// it protects sweep removal, but says nothing about whether work can run here.
export function dispatchLaneOccupiesSlot(lane) {
  return lane?.state === "working" || lane?.state === "quiet";
}

// inspectDispatchLaneAdmission(projectRoot, refs, options) — the read-only local
// admission snapshot. The counted set is git's dispatch-lane worktree set. Reuse
// is wider: an item's branch may already be checked out in a mesh-assignment tree,
// which consumes no LOCAL slot but must remain re-runnable at the local bound.
// No projection/run store is opened and no occupancy fact is persisted.
export async function inspectDispatchLaneAdmission(projectRoot, refs = [], options = {}) {
  // Admission fails closed if git cannot answer. The general operator-facing
  // inspector remains best-effort, but "unknown occupancy" must never mean zero.
  const lanes = await inspectDispatchLanes(projectRoot, refs, { ...options, throwOnListError: true });
  const holders = lanes.filter(dispatchLaneOccupiesSlot);
  const existingRefs = new Set();
  for (const ref of refs ?? []) {
    try {
      const live = await findItemWorktree(projectRoot, ref, { exec: options.exec });
      if (live != null && existsSync(live)) existingRefs.add(ref);
    } catch (error) {
      // Same best-effort lookup contract as resolveDispatchLane door 1. A failed
      // lookup does not invent reuse; the command's capacity decision remains
      // conservative because every dispatch lane it could count is in `holders`.
      reportDegrade("work-dispatch", error);
    }
  }
  return { occupied: holders.length, holders, existingRefs };
}

// planDispatchLaneAdmissions(refs, snapshot, bound) — reserve this request in
// input order BEFORE materialisation fan-out starts. Existing work is idempotent
// and free; each fresh member consumes the next local slot; every member beyond
// capacity receives an actionable refusal rather than being queued or dropped.
// A materialisation fault does not retroactively admit a member already refused:
// asking again observes git's new durable lane set and is the retry protocol.
export function planDispatchLaneAdmissions(refs = [], snapshot = {}, bound = DEFAULT_DISPATCH_CONCURRENCY) {
  const existing = snapshot.existingRefs instanceof Set
    ? snapshot.existingRefs
    : new Set(snapshot.existingRefs ?? []);
  const plannedFresh = new Set();
  let occupied = Number.isInteger(snapshot.occupied) && snapshot.occupied >= 0 ? snapshot.occupied : 0;
  const plans = [];
  for (const ref of refs ?? []) {
    if (existing.has(ref) || plannedFresh.has(ref)) {
      plans.push({ ref, admitted: true, reused: true });
      continue;
    }
    if (occupied >= bound) {
      plans.push({ ref, admitted: false, reused: false, code: "dispatch-capacity-full" });
      continue;
    }
    occupied += 1;
    plannedFresh.add(ref);
    plans.push({ ref, admitted: true, reused: false });
  }
  return { plans, occupiedBefore: snapshot.occupied ?? 0, occupiedAfterAdmission: occupied };
}

// laneActivityAt(worktreePath, changed, options) — the newest mtime among the paths this
// lane has actually touched, falling back to the lane directory's own mtime (which is its
// creation time for a lane that has produced nothing yet). Injectable through
// `options.statMtimeMs` so a test states the clock rather than racing it.
//
// A MISSING PATH IS AN ANSWER, NOT A SWALLOWED FAULT, and the two are told apart rather than
// collapsed (m42 item 3 — "errors are events, not silence"). `git status --porcelain` names
// DELETED paths too, and an agent deleting a file mid-read is ordinary, so ENOENT means "no
// mtime here" and is silent BY DESIGN — reporting it would turn the sink into the noise it
// exists to replace (the degrade sink's own rule 2: never once per row). Anything else is a
// real fault (a permission wall, an I/O error) and is reported.
async function laneActivityAt(worktreePath, changed, options = {}) {
  const mtime = typeof options.statMtimeMs === "function"
    ? options.statMtimeMs
    : async (target) => {
      try {
        return (await stat(target)).mtimeMs;
      } catch (error) {
        if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") reportDegrade("work-dispatch", error);
        return null;
      }
    };
  let newest = await mtime(worktreePath);
  for (const rel of changed) {
    const at = await mtime(path.join(worktreePath, rel));
    if (at != null && (newest == null || at > newest)) newest = at;
  }
  return newest;
}

// overlappingFiles(lanes) — THE OVERLAP REPORT, and the measured reason this task refuses to
// be "isolation later".
//
// In vista-app-web 352, `src/sandbox/provisionSandboxAgent.ts` was edited ×9 during the
// `352/02` build and ×8 during the `352/05` build — two stories the architect had
// partitioned as INDEPENDENT. Isolation means neither lane ever sees the other's partial
// edit; it does NOT mean the collision went away, and a collision nothing reports is a
// merge conflict discovered by whoever merges second. So every file changed in more than one
// lane is named here, with the refs that touched it, in path order.
//
// Deliberately a REPORT and never a merge: this module resolves nothing. "Reported rather
// than silently merged" is the contract, and a dispatcher that auto-merged two lanes' edits
// to one file would be inventing an authorship decision no human made.
export function overlappingFiles(lanes = []) {
  const byFile = new Map();
  for (const lane of lanes) {
    for (const file of lane.changed ?? []) {
      const key = file.replaceAll("\\", "/");
      if (!byFile.has(key)) byFile.set(key, []);
      byFile.get(key).push(lane.ref ?? lane.worktree);
    }
  }
  return [...byFile.entries()]
    .filter(([, owners]) => new Set(owners).size > 1)
    .map(([file, owners]) => ({ path: file, refs: [...new Set(owners)].sort() }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// ────────────────────────────────────────────── sweeping and cleaning up ────

// sweepDispatchLanes(projectRoot, refs, options) — STRANDED LANES ARE RECOVERABLE, NEVER
// LOST.
//
// A lane whose session died leaves its worktree behind, and the operator's question is
// "what is still out there and can I get the work back?". So the sweep REPORTS by default —
// each stranded lane with its ref, its worktree and its branch, plus whether it holds
// uncommitted work — and its commits are recoverable by construction, because the lane was
// checked out ON the item's own branch, which outlives the tree.
//
// `options.live` names the refs a caller knows are still running; everything else under the
// root is stranded. `options.remove` opts INTO removal, and even then a lane holding
// uncommitted work is KEPT and reported: the sweep never removes a tree holding bytes no
// commit points at. That rule is not configurable, and the absence of a `--force` is the
// point (a flag that permits loss will eventually be passed).
export async function sweepDispatchLanes(projectRoot, refs = [], options = {}) {
  const live = new Set(options.live ?? []);
  const lanes = await inspectDispatchLanes(projectRoot, refs, options);
  const stranded = [];
  const removed = [];
  const kept = [];
  for (const lane of lanes) {
    if (lane.ref != null && live.has(lane.ref)) continue; // still running — not this sweep's business
    stranded.push(lane);
    if (!options.remove) continue;
    if (lane.dirty) {
      kept.push({ ...lane, keptBecause: "uncommitted-work" });
      continue;
    }
    if (lane.ref == null) {
      kept.push({ ...lane, keptBecause: "unresolvable-ref" });
      continue;
    }
    try {
      await removeDispatchWorktree(projectRoot, lane.ref, { exec: options.exec, removeBranch: false });
      removed.push(lane);
    } catch (error) {
      reportDegrade("work-dispatch", error);
      kept.push({ ...lane, keptBecause: "remove-failed" });
    }
  }
  return { stranded, removed, kept };
}

// cleanupDispatchLane(projectRoot, itemRef, options) — A FINISHED LANE IS CLEANED UP.
//
// Preconditions, all refusals rather than throws, all leaving the lane exactly as it was:
//   · `dispatch-lane-uncommitted-work` — the tree holds changes no commit points at. The
//     one thing git cannot recover, so it is never removed without the caller committing
//     first; `options.force` is deliberately absent.
//   · `dispatch-lane-not-found` — nothing to clean up, reported rather than silently ok'd.
// And NOTHING IS REMOVED FOR A LANE THAT IS STILL RUNNING: `options.live` names those, and a
// live ref is refused `dispatch-lane-live`.
//
// The command layer may additionally supply `ensureProjection`, the effects-aware
// convergence gate. It runs only after the lane is known clean and before a single git
// removal. An unsettled publication refuses `dispatch-lane-projection-unpublished`, so
// cleanup cannot erase the checkout that a retryable projection event still needs.
//
// The branch goes with the tree when `removeBranch` is set — via `git branch -d`, which
// refuses an unmerged line and reports it (mesh-worktree.mjs's own never-discards rule).
export async function cleanupDispatchLane(projectRoot, itemRef, options = {}) {
  const live = new Set(options.live ?? []);
  if (live.has(itemRef)) {
    return { ref: itemRef, outcome: "refused", code: "dispatch-lane-live", worktree: meshDispatchWorktreePath(projectRoot, itemRef) };
  }
  const lanePath = meshDispatchWorktreePath(projectRoot, itemRef);
  if (!existsSync(lanePath)) {
    return { ref: itemRef, outcome: "refused", code: "dispatch-lane-not-found", worktree: lanePath };
  }
  const changed = await laneChanges(lanePath, options);
  if (changed.length > 0) {
    return { ref: itemRef, outcome: "refused", code: "dispatch-lane-uncommitted-work", worktree: lanePath, changed };
  }
  if (typeof options.ensureProjection === "function") {
    const projection = await options.ensureProjection({ ref: itemRef, worktree: lanePath });
    if (projection?.settled !== true) {
      return {
        ref: itemRef,
        outcome: "refused",
        code: projection?.code ?? "dispatch-lane-projection-unpublished",
        worktree: lanePath,
        projection: projection ?? null,
      };
    }
  }
  const result = await removeDispatchWorktree(projectRoot, itemRef, {
    exec: options.exec,
    removeBranch: options.removeBranch !== false,
  });
  return { ref: itemRef, outcome: "removed", code: null, ...result };
}

// ──────────────────────────────── the lane commits and merges home (129/03) ────
//
// 129/ADR-002 §1-§4, §6-§7 and ADR-008 §4. N lanes are N `aof/mesh/<ref>` branches, and
// nothing in code merged one home before this — `continue.md` did it by prose. The loop's
// merge-home is the MESH'S ONE MERGE DISCIPLINE POINTED THE OTHER WAY: `advanceBranchToBase`
// (m43/ADR-008) advances the branch checked out at `cwd` to include `commit`, and it is
// direction-agnostic — called from the PRIMARY at the LANE'S tip it is the loop's merge, with
// the same four doors and the same never-discards rule (ff when possible, a real merge
// otherwise, a conflict aborted and NAMED, dirt refused by file; never a rebase, a force or a
// reset). The three verbs below COMPOSE it; they spell no `merge`, no `rebase`, no `reset`
// and no `--force` of their own, and FF-12904 sweeps this module to hold that.
//
// The ONLY git verbs this section spells are the read-only `symbolic-ref`, `rev-parse`,
// `merge-base` and `worktree list` (through `listWorktrees`); the loop's own scoped commit
// goes through `commitWorktreeChanges` with `paths`, and the merge through the one verb.

// dispatchLaneBase(lanePath, options) — THE SHA THE LANE WAS CUT FROM: the merge-base of the
// lane's HEAD and the PRIMARY's line. `options.primaryRoot` names the primary (129/03 fix
// round, I2): its HEAD is read THERE (`rev-parse HEAD`) and the merge-base is asked inside the
// lane against that sha — refs and objects are shared across worktrees, so the lane can answer
// for both. This matters because the primary is not always the main checkout: this very repo
// gates in linked worktrees, and a loop run from one has a primary on a branch the main
// checkout is not on, so a base read against the main checkout's line would DISAGREE with the
// base `mergeDispatchLaneHome` reports. Only when no `primaryRoot` is given does the verb fall
// back to git's own list — `git worktree list --porcelain` names the main worktree FIRST, and
// its `branch` (or its `head`, when detached) stands in for the primary's line. A lane reopened
// on an existing branch and advanced (ADR-002 §7) reports the base it was ADVANCED to, which is
// what makes "cut from the current primary" a fact rather than a hope.
export async function dispatchLaneBase(lanePath, options = {}) {
  const exec = resolveExec(options);
  let line = null;
  if (typeof options.primaryRoot === "string" && options.primaryRoot.length > 0) {
    line = text(await exec(["rev-parse", "HEAD"], { cwd: options.primaryRoot })) || null;
  } else {
    const [primary] = await listWorktrees(lanePath, { exec });
    line = typeof primary?.branch === "string" && primary.branch.length > 0 ? primary.branch : primary?.head ?? null;
  }
  if (line == null) {
    const error = new Error(`dispatchLaneBase could not resolve the primary's line from the lane at ${lanePath}`);
    error.code = "dispatch-lane-base-unresolved";
    throw error;
  }
  const result = await exec(["merge-base", "HEAD", line], { cwd: lanePath });
  const base = text(result);
  if (result.status !== 0 || base.length === 0) {
    const error = new Error(`git merge-base HEAD ${line} failed in the lane at ${lanePath}: ${result.stderr || result.stdout}`);
    error.code = "dispatch-lane-base-unresolved";
    throw error;
  }
  return base;
}

// commitDispatchLane(lanePath, options) — the lane's own settle: everything the lane's drive
// left uncommitted is committed on the item's branch under the mesh identity (the ONE commit
// verb, `-A`, `.aof` excluded), and the answer names the tip the merge will read.
// `{ committed, tip }`; a clean lane is `committed: false` with the tip unchanged.
export async function commitDispatchLane(lanePath, options = {}) {
  const exec = resolveExec(options);
  const { committed } = await commitWorktreeChanges(lanePath, { message: options.message, node: options.node, exec: options.exec });
  const tip = text(await exec(["rev-parse", "HEAD"], { cwd: lanePath }));
  return { committed, tip };
}

// mergeDispatchLaneHome(primaryRoot, ref, options) — THE LANE MERGES HOME, in the primary,
// serially, through the one verb. Three steps, in this order:
//
//   1. THE PRIMARY IS ON A BRANCH (`symbolic-ref -q HEAD`). Detached → refused
//      `lane-merge-refused` with `reason: "detached-head"`, BEFORE ANY WRITE: a merge onto a
//      detached HEAD lands on no branch the operator ships.
//   2. THE LOOP'S OWN WRITES ARE COMMITTED FIRST, scoped: `git add -- <milestoneDir>` +
//      `commit --no-verify` under the mesh identity (`commitWorktreeChanges` with `paths`), so
//      the record docs and run records the refine/verify/wave runs wrote under
//      `wiki/work/<milestone dir>/` are the loop's commit and nothing else is swept in. A
//      clean scope is a no-op. What remains dirty is the OPERATOR'S, and it blocks the merge
//      only where the lane touched the same path — by name.
//   3. THE VERB, from the primary at the lane's tip, `dirtyPolicy: "touched-paths"`: door 1
//      answers `already-current` (the resume's "already merged"), door 3 `fast-forwarded`
//      (the common case when the primary did not move), door 4 `merged` (a real `--no-ff`
//      merge under the mesh identity when it did). Its dirty refusal becomes
//      `{ outcome: "refused", code: "lane-merge-refused", files }`; its conflict refusal —
//      already `--abort`ed by the verb, the tree exactly as it was — becomes
//      `{ outcome: "conflict", code: "lane-merge-conflict" }`. The lane worktree and branch
//      are never touched by this function: the operator merges by hand and resumes, and the
//      resume reads the hand-merged tip as door 1.
//
// EVERY answer carries `ref`, `branch`, `base` (the lane's base — the merge-base of the
// primary's HEAD and the lane's tip, read BEFORE anything is written), `tip` (the lane's tip,
// read from the shared refs — no lane tree is opened) and `commit` (the primary's HEAD AFTER,
// so a conflict reports the commit it aborted back to and a dirty refusal reports the
// own-writes commit when one was made).
export async function mergeDispatchLaneHome(primaryRoot, ref, options = {}) {
  const exec = resolveExec(options);
  const run = (args) => exec(args, { cwd: primaryRoot });
  const head = async () => text(await run(["rev-parse", "HEAD"]));
  const branch = meshItemBranchName(ref);
  const message = typeof options.message === "string" && options.message.length > 0
    ? options.message
    : `aof(loop): merge ${ref} home\n\nThe lane's branch ${branch} merged into the primary by the loop (129/ADR-002); every lane commit is preserved.`;

  // (1) on a branch — decided before any write.
  const symbolic = await run(["symbolic-ref", "-q", "HEAD"]);
  const tipResult = await run(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
  const tip = tipResult.status === 0 ? text(tipResult) : null;
  const baseResult = tip == null ? null : await run(["merge-base", "HEAD", tip]);
  const base = baseResult != null && baseResult.status === 0 ? text(baseResult) : null;
  const named = async (extra) => ({ ref, branch, base, tip, commit: await head(), ...extra });
  if (symbolic.status !== 0 || text(symbolic).length === 0) {
    return named({ outcome: "refused", code: "lane-merge-refused", reason: "detached-head" });
  }
  if (tip == null) {
    return named({ outcome: "refused", code: "lane-merge-refused", reason: "branch-missing" });
  }

  // (2) the loop's own writes, scoped to the milestone's folder.
  const milestoneDir = scopedPathspec(primaryRoot, options.milestoneDir);
  if (milestoneDir != null) {
    await commitWorktreeChanges(primaryRoot, { message, node: options.node, exec: options.exec, paths: [milestoneDir] });
  }

  // (3) the one verb, pointed the other way.
  const advance = await advanceBranchToBase(primaryRoot, tip, { dirtyPolicy: "touched-paths", message, node: options.node, exec: options.exec });
  if (advance.outcome === "refused" && advance.code === "assignment-gate-propagation-dirty-worktree") {
    return named({ outcome: "refused", code: "lane-merge-refused", files: advance.files ?? [] });
  }
  if (advance.outcome === "refused" && advance.code === "assignment-gate-propagation-conflict") {
    return named({ outcome: "conflict", code: "lane-merge-conflict" });
  }
  return named({ outcome: advance.outcome, code: null });
}

// scopedPathspec(primaryRoot, dir) — the milestone dir as git wants it: repo-relative,
// forward-slashed. An absolute path inside the primary is relativised; anything else is
// passed as the caller spelled it. `null` when no scope was given (no own-writes commit).
function scopedPathspec(primaryRoot, dir) {
  if (typeof dir !== "string" || dir.length === 0) return null;
  const relative = path.isAbsolute(dir) ? path.relative(primaryRoot, dir) : dir;
  const spec = relative.replaceAll("\\", "/").replace(/\/+$/u, "");
  return spec.length > 0 ? spec : null;
}
