// src/mesh/worktree.mjs — the ONE mesh-worktrees path seam + the real `git worktree`
// mechanics (milestone 35 / story 02, ADR-004, task 00/03).
//
// THE ONE SEAM (fitness #8 acd-assignment-worktree-path-scoped / SECURITY F4
// acd-worktree-path-scoped): every worktree materialization joins
// `meshWorktreePath(projectRoot, assignmentId)` — a prefix-child of
// `<repo>/.aof/mesh/worktrees/` — never `os.tmpdir()`, never a hand-built path. The
// location is INSIDE the repo's own `.aof/` (already git-ignored, already the home of
// `.aof/mesh/` state, ADR-004) so worktrees never pollute the working tree and are
// removed with the repo.
//
// THE INJECTED EXEC SEAM (mirroring mesh-fabric.mjs's `(bin, args) => Promise<{
// stdout, status }>` idiom, the git-argv shell-less precedent — NEVER a shell string;
// narrowed here to ONE bin since this module only ever spawns `git`):
// `options.exec(args, { cwd }) => Promise<{ stdout, stderr, status }>`. Production
// spawns real `git` via node:child_process execFile; tests inject a fake that scripts
// stdout/status without a real binary OR (for tasks 00/03, which are explicitly
// RESOLVED to run over a REAL git worktree in a temp fixture repo, RESEARCH.md §4/§5)
// exercise the real spawn against a disposable fixture repo (the DEFAULT — `exec`
// absent — IS the real spawn).
//
// RETENTION (task 03, ADR-004): `done` → `git worktree remove` (dir + admin metadata
// gone, path reusable — RESEARCH.md §4 measured; NEVER a bare `rm`, which leaves stale
// `.git/worktrees/<name>` prunable metadata that blocks re-add). `failed` → RETAIN for
// inspection, bounded by a DOCUMENTED retention ceiling (a constant, not scattered) —
// `sweepRetainedWorktrees` removes anything past it.
//
// MILESTONE 38 / STORY 07 (ADR-015, task 00) — a REAL branch, not always detached.
// `addWorktree` checks out ON a branch when the caller passes `options.branch`
// (mesh-worker-execution.mjs does, on every dispatch), contrasting the STILL-DEFAULT
// `--detach` form every other caller keeps unchanged.
//
// M42 (the brittleness cure, 2026-07-31) — ONE DERIVABLE BRANCH PER ITEM.
// `meshItemBranchName(itemRef)` computes `aof/mesh/<itemRef>` — derivable from the
// ref alone, so NO consumer has to remember a lookup to find where an item's work
// lives. The m38 convention (`aof/mesh/<itemRef>-<assignmentId>`, a distinct branch
// per assignment) is RETIRED: it made the `global_item_branches` side table the only
// memory of where work went, and every consumer that forgot to consult it dispatched
// from the wrong base (the 2026-07-27 measured defect). The side table survives as a
// CACHE that wins when present — it carries the old suffixed names for pre-cure
// items and the pre-rename names for reindexed items (a renumber does not rename the
// origin branch) — and the derivation is the always-available default beneath it.
import path from "node:path";
import { execFile } from "node:child_process";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../degrade.mjs";
import { loadWorkspace } from "../work.mjs";

// The documented retention ceiling for a RETAINED (failed) worktree, in milliseconds
// (ADR-004 "bounded by an explicit retention default … a documented constant, not
// scattered"). 24h: long enough for an operator to inspect a failure before the next
// sweep prunes it, short enough that disk does not grow unbounded across many failed
// assignments.
export const DEFAULT_WORKTREE_RETENTION_MS = 24 * 60 * 60 * 1000;

// meshWorktreesRoot(projectRoot) — the ONE root every worktree lives under.
export function meshWorktreesRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "mesh", "worktrees");
}

// meshWorktreePath(projectRoot, assignmentId) — THE ONE SEAM (fitness #8 / F4). Keyed
// by assignmentId (not itemRef) — a stable, collision-free path even across
// reassignments (ADR-004). Never called with anything but a real assignmentId; never
// composed with directive/ref text (T3b — the ref resolves INSIDE the checkout via the
// enumerate-then-filter resolver, never a path.join(root, ref)).
//
// AND THAT SENTENCE IS AN INVARIANT OF THE ROOT, NOT ONLY OF THIS FUNCTION (m50/03,
// TECH_DEBT item 47): `listStrandedWorktreeAssignments` enumerates this root at every
// worker start and trusts each DIRECTORY NAME as an assignmentId, with no store lookup.
// A lane that is not the assignment lane must therefore never materialize here — see
// `meshSessionWorktreePath` below, which is where a path composed from wire-borne ref
// text lives instead.
export function meshWorktreePath(projectRoot, assignmentId) {
  return path.join(meshWorktreesRoot(projectRoot), String(assignmentId));
}

// ------------------------------------------ milestone 38 / story 07 (ADR-015) ----

// MESH_BRANCH_PREFIX — the DOCUMENTED DEFAULT branch namespace every worker-pushed
// branch lives under (ADR-015 decision 1). Fixed, safe, never user-controlled — the
// full branch name always starts with these literal (ASCII-letter-leading) segments,
// so the "cannot begin with a hyphen/slash" git-ref rule is satisfied by construction
// regardless of what the sanitized slug beneath it looks like.
const MESH_BRANCH_PREFIX = "aof/mesh/";

// sanitizeRefSlug(value, fallback) — collapses an arbitrary (possibly ref-HOSTILE)
// string into a slug that is always safe to embed as the LAST path-component of a
// git ref (git-check-ref-format's rules, https://git-scm.com/docs/git-check-ref-format):
// no control chars/space/~/^/:/?/*/[/\, no "@{", no ".." run anywhere, no leading or
// trailing ".", no trailing ".lock". A single whitelist pass (keep only
// [A-Za-z0-9._-], replace everything else — INCLUDING "/" — with "-") both strips
// every forbidden character in one step AND collapses a slash into the "valid
// path-component or collapsed" shape the task allows, never leaving a stray empty
// path segment. Returns `fallback` (itself assumed already-safe) if sanitizing would
// otherwise yield an empty string (e.g. a value that is entirely forbidden chars).
function sanitizeRefSlug(value, fallback) {
  let slug = String(value ?? "").replace(/[^A-Za-z0-9._-]/g, "-");
  // No TWO-OR-MORE consecutive dots anywhere in a ref (forbidden regardless of
  // position) — collapsed to a single "-" in one pass (a single global replace of
  // every 2+-dot run cannot leave a residual ".." behind, since the replaced chars
  // are never dots).
  slug = slug.replace(/\.{2,}/g, "-");
  // A ref component cannot begin with "." nor end with "." or the sequence ".lock".
  slug = slug.replace(/^\.+/, "").replace(/\.lock$/i, "-lock").replace(/\.+$/, "");
  // Cosmetic tidy-up only (not required for validity): collapse runs of "-" the
  // substitutions above may have produced, and drop stray leading/trailing "-".
  slug = slug.replace(/-{2,}/g, "-").replace(/^-+/, "").replace(/-+$/, "");
  return slug.length > 0 ? slug : fallback;
}

// meshItemBranchName(itemRef) — THE derivable branch (m42 brittleness cure):
// `aof/mesh/<itemRef>`, itemRef sanitized to a git-ref-safe slug. ONE branch per
// item, derivable from the ref alone — a consumer that never consults the
// `global_item_branches` cache still lands on the item's own line (converging,
// never a divergent per-assignment fork). The sanitizing keeps task 00's hostile-
// input invariant: always a `git check-ref-format`-valid ref, prefixed `aof/mesh/`.
// The m38 two-arg form (`meshWorkerBranchName`, distinct per assignmentId) is
// RETIRED — its collision-freedom was the disease's carrier: distinct branches per
// assignment are exactly what only a side table could remember.
export function meshItemBranchName(itemRef) {
  const itemSlug = sanitizeRefSlug(itemRef, "item");
  return `${MESH_BRANCH_PREFIX}${itemSlug}`;
}

// ────────────────── milestone 50 / story 03 — THE SESSION LANE'S OWN KEYSPACE ────
//
// A BARE SESSION IS NOT AN ASSIGNMENT, AND ITS WORKTREE MAY NOT LIVE IN THE ASSIGNMENT
// LANE'S ROOT. This is a measured defect fix (TECH_DEBT item 47), not tidiness. The
// session lane keyed its worktree `session-<slug>` and resolved it through
// `meshWorktreePath` — the root `listStrandedWorktreeAssignments`
// (mesh-worker-execution.mjs) enumerates at every worker start, trusting each DIRECTORY
// NAME as an assignmentId with no store lookup. Measured 2026-08-14:
//
//     stranded entries the launcher would report failed/daemon-restarted: ["session-50"]
//
// i.e. every worker restart emitted a false `startup-reclaim` warning and pushed a
// `failed`/`daemon-restarted` report THROUGH THE DURABLE OUTBOX for an assignment that
// never existed, then swept run records looking for it — permanent, per-restart, founded
// on a fabricated fact.
//
// So the lanes get DISJOINT ROOTS under the same already-git-ignored `.aof/mesh/` parent
// (TECH_DEBT 47's fix (a), the per-lane subroot). That also restores `meshWorktreePath`'s
// stated contract at its single home: the session path IS composed from wire-borne ref
// text, which that seam's own comment forbids — so it is composed HERE, under a root no
// assignment scan reads, with the sanitizer that makes it safe.

// meshSessionWorktreesRoot(projectRoot) — the ONE root every SESSION worktree lives
// under. Deliberately a SIBLING of `meshWorktreesRoot`, never a child: a child would be
// enumerated by the assignment scan as a directory named "session-worktrees".
export function meshSessionWorktreesRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "mesh", "session-worktrees");
}

// sessionWorktreeSlug(itemRef) — the ONE flat, traversal-proof path component for an
// item-scoped session worktree, and the ONE home of that derivation.
//
// It lives here because THE SANITIZER LIVES HERE. The handler used to reach the same
// slug by calling `meshItemBranchName(itemRef).split("/").pop()` — dismantling another
// module's return value to re-derive a fact that module already knows, so a change to the
// branch prefix would silently change a filesystem path. `sanitizeRefSlug` is
// module-private on purpose (a second copy of a ref-safety rule is the drift it exists to
// prevent), so the borrow becomes an export instead of a string surgery.
//
// SECURITY T3b/F4 — the safety properties are the sanitizer's, unchanged: the slug's
// charset is [A-Za-z0-9._-] (every "/" and every traversal character collapses to "-"),
// no `..` run survives anywhere, and no leading dot. The composed key is therefore always
// ONE flat path component and can never escape the root above it.
//
// Keyed by the ITEM, not the session: two sessions opened on the same item SHARE one
// worktree, which is what an operator opening a second terminal on the same work expects.
export function sessionWorktreeSlug(itemRef) {
  return `session-${sanitizeRefSlug(itemRef, "item")}`;
}

// meshSessionWorktreePath(projectRoot, itemRef) — THE session lane's path seam. The
// mirror of `meshWorktreePath` for a lane whose key is a REF rather than an assignmentId.
export function meshSessionWorktreePath(projectRoot, itemRef) {
  return path.join(meshSessionWorktreesRoot(projectRoot), sessionWorktreeSlug(itemRef));
}

// isUnderMeshSessionWorktreesRoot(projectRoot, candidatePath) — the session lane's own
// prefix-child predicate, the twin of `isUnderMeshWorktreesRoot`, so "scoped" has one
// definition per lane and a test never re-derives it.
export function isUnderMeshSessionWorktreesRoot(projectRoot, candidatePath) {
  const root = path.resolve(meshSessionWorktreesRoot(projectRoot)) + path.sep;
  const normalized = path.resolve(candidatePath) + path.sep;
  return normalized.startsWith(root);
}

// ────────────────── story 65 / task 02 — THE LOCAL DISPATCH LANE'S OWN KEYSPACE ────
//
// THE THIRD LANE, AND WHY IT IS A LANE RATHER THAN A CALLER. `src/mesh/worktree.mjs`
// already does worktree-per-item, branch-per-item, cleanup-on-done and stranded recovery,
// and it is reachable from exactly two places — assignment dispatch
// (`mesh-worker-execution.mjs`) and the session lane (`mesh-session-spawn-handler.mjs`) —
// NEITHER of which is the local build loop. Story 65 dispatches independent stories
// CONCURRENTLY on one machine, and the measured reason it must be isolated is not
// theoretical: in vista-app-web's milestone 352, `src/sandbox/provisionSandboxAgent.ts` was
// edited ×9 during the `352/02` build and ×8 during the `352/05` build — two stories the
// architect had partitioned as INDEPENDENT. A partition's independence claim is not
// reliable, so two lanes in one working tree would have corrupted that file.
//
// SO IT IS WIRING, AND THE WIRING IS THREE DECISIONS, EACH TAKEN FROM AN EXISTING RULING:
//
//   (1) ITS OWN ROOT, a SIBLING of the other two (TECH_DEBT item 47, measured). The
//       assignment lane's startup scan enumerates `worktrees/` and trusts every DIRECTORY
//       NAME there as an assignmentId, reporting each through the durable outbox — so a
//       lane that is not the assignment lane must never materialize in it. Same reason,
//       same shape as `meshSessionWorktreesRoot`; a sibling, never a child.
//
//   (2) THE ITEM'S OWN BRANCH — `meshItemBranchName`, NOT a fourth namespace. m42's cure
//       ("ONE DERIVABLE BRANCH PER ITEM") retired per-assignment branches precisely because
//       a divergent line per dispatcher made a side table the only memory of where work
//       went. A local dispatch of `53/00` puts its commits on `aof/mesh/53/00`, which is
//       the same line a mesh assignment for `53/00` would use and the same line
//       `findItemWorktree` locates — so an operator, a worker and this loop all converge.
//       KNOWN CONSEQUENCE, recorded rather than discovered later: `reuseWorktreeOnBranch`
//       (the assignment lane's continue door) RELEASES any worktree holding the branch
//       before taking it, so a mesh assignment issued for an item that has a live local
//       dispatch lane will evict that lane's tree. That is m42's one-line-per-item rule
//       working, not a bug in this lane — but it is the reason a local dispatch and a mesh
//       assignment for the SAME item are not a supported concurrency.
//
//   (3) THE PATH IS KEYED BY THE REF, sanitized here, where the sanitizer lives — never
//       assembled from wire text elsewhere and never recovered by dismantling a branch name.

// meshDispatchWorktreesRoot(projectRoot) — the ONE root every locally-dispatched lane lives
// under. A SIBLING of both `meshWorktreesRoot` and `meshSessionWorktreesRoot`.
export function meshDispatchWorktreesRoot(projectRoot) {
  return path.join(projectRoot, ".aof", "mesh", "dispatch-worktrees");
}

// dispatchWorktreeSlug(itemRef) — the ONE flat, traversal-proof path component for a
// locally-dispatched lane, and the ONE home of that derivation (`sessionWorktreeSlug`'s
// twin, borrowing the same module-private sanitizer for the same reason).
export function dispatchWorktreeSlug(itemRef) {
  return `dispatch-${sanitizeRefSlug(itemRef, "item")}`;
}

// meshDispatchWorktreePath(projectRoot, itemRef) — THE dispatch lane's path seam.
export function meshDispatchWorktreePath(projectRoot, itemRef) {
  return path.join(meshDispatchWorktreesRoot(projectRoot), dispatchWorktreeSlug(itemRef));
}

// isUnderMeshDispatchWorktreesRoot(projectRoot, candidatePath) — the dispatch lane's own
// prefix-child predicate, so "scoped" has exactly one definition per lane.
export function isUnderMeshDispatchWorktreesRoot(projectRoot, candidatePath) {
  const root = path.resolve(meshDispatchWorktreesRoot(projectRoot)) + path.sep;
  const normalized = path.resolve(candidatePath) + path.sep;
  return normalized.startsWith(root);
}

// addDispatchWorktree(projectRoot, itemRef, commitish, options) — the dispatch lane's
// materialization: a worktree at `meshDispatchWorktreePath`, checked out ON the item's
// derivable branch (never detached — a build's commits must land on the item's own line, so
// the work survives the lane being torn down).
//
// CREATE-OR-CONTINUE, decided here rather than by the caller, because `git worktree add -b`
// REFUSES an existing branch and the two doors are one question ("does this item already
// have a line?"). A second dispatch after a cleanup that left the branch behind therefore
// CONTINUES that line instead of forking a second one — m43/story 05's measured lesson
// (a create door taken against an existing line orphans every commit the previous phase
// made), applied at the door that can hit it here.
export async function addDispatchWorktree(projectRoot, itemRef, commitish = "HEAD", options = {}) {
  const worktreePath = meshDispatchWorktreePath(projectRoot, itemRef);
  const branch = typeof options.branch === "string" && options.branch.length > 0 ? options.branch : meshItemBranchName(itemRef);
  const fault = { subject: `dispatch item "${itemRef}"`, fields: { itemRef, branch } };
  return (await localBranchExists(projectRoot, branch, options))
    ? runWorktreeAdd(projectRoot, worktreePath, commitish, { ...options, branch: undefined, checkout: branch }, fault)
    : runWorktreeAdd(projectRoot, worktreePath, commitish, { ...options, branch }, fault);
}

// removeDispatchWorktree(projectRoot, itemRef, options) — cleanup for a FINISHED lane:
// `git worktree remove` (never a bare rm — RESEARCH.md §4), then, when
// `options.removeBranch` is set, `git branch -d <branch>`.
//
// TWO DELIBERATE ABSENCES, both the same rule:
//   · NO `--force` ON THE REMOVE, unlike `removeWorktree`'s assignment-lane twin. A lane
//     holding uncommitted work must not be removable at all, so the door that decides
//     (`cleanupDispatchLane`) refuses it before reaching here, and this function keeps no
//     escape hatch for a caller that skipped the check. Plain `git worktree remove` already
//     refuses a dirty tree, so the safety rule is enforced twice and bypassable neither way.
//   · `-d`, NEVER `-D` OR `-f`, on the branch: `-d` refuses a branch whose commits are not
//     merged, so a cleanup run against a lane whose work has NOT come back leaves the line
//     intact and reports the refusal.
// Both are the never-discards discipline this module already keeps for
// `advanceBranchToBase`: the one thing git cannot recover is a commit nothing points at, and
// a flag that permits that loss will eventually be passed.
//
// Returns { worktree, branch, branchRemoved } so a caller can report which half happened.
export async function removeDispatchWorktree(projectRoot, itemRef, options = {}) {
  const exec = resolveExec(options);
  const worktreePath = meshDispatchWorktreePath(projectRoot, itemRef);
  const branch = typeof options.branch === "string" && options.branch.length > 0 ? options.branch : meshItemBranchName(itemRef);
  const result = await exec(["worktree", "remove", worktreePath], { cwd: projectRoot });
  if (result.status !== 0) {
    throw gitError(`git worktree remove failed for dispatch item "${itemRef}": ${result.stderr || result.stdout}`, "dispatch-worktree-remove-failed", { itemRef, worktreePath, branch, stderr: result.stderr });
  }
  let branchRemoved = false;
  if (options.removeBranch) {
    const deleted = await exec(["branch", "-d", branch], { cwd: projectRoot });
    branchRemoved = deleted.status === 0;
    if (!branchRemoved) {
      // Not a throw: an unmerged line is exactly what `-d` exists to protect, and the
      // honest report is "the tree is gone, the line is not" rather than a failed cleanup.
      reportDegrade("mesh-worktree", new Error(`git branch -d ${branch} refused (unmerged work is never discarded): ${deleted.stderr || deleted.stdout}`));
    }
  }
  return { worktree: worktreePath, branch, branchRemoved };
}

// findItemWorktree(projectRoot, itemRef, options) — WHERE IS THIS ITEM'S LIVE WORK TREE?
// (m50/03, the operator's ruling of 2026-08-14.)
//
// THE QUESTION IT ANSWERS. An operator who attaches an itemRef to a session wants to LOOK
// AT (or unstick) that item's work. A fresh detached tree at HEAD shows them none of it —
// so a session with a ref opens in the ASSIGNMENT lane's tree for that item when one
// exists, and only falls back to a session-owned tree when it does not.
//
// ANSWERED AS A GIT-LEVEL FACT, NEVER BY NAME AND NEVER BY A STORE LOOKUP. The item's
// tree is the one CHECKED OUT ON the item's derivable branch — `aof/mesh/<ref>`, m42's
// one-line-per-item cure (`meshItemBranchName`), which mesh-worker-execution.mjs puts
// every dispatch on (ADR-015: never detached). So the join is
// `git worktree list --porcelain` → the entry whose `branch` is
// `refs/heads/aof/mesh/<ref>`. Two independent reasons this is the right instrument:
//   - it does not depend on the assignment store being readable, current, or even
//     present (a worker's checkout is the authority on what IS checked out where);
//   - it is the OPPOSITE of the name-trusting inference that made
//     `listStrandedWorktreeAssignments` wrong (TECH_DEBT 47) — nothing is derived from a
//     directory's name; git is asked what it holds.
//
// UNAMBIGUOUS BY GIT'S OWN RULE, which is why `find` is exact rather than a guess: a
// branch can be checked out in AT MOST ONE worktree (a second `worktree add` on a
// checked-out branch is refused — the same rule `reuseWorktreeOnBranch` above has to
// release a holder for). So there is either one match or none.
//
// A `prunable` entry is SKIPPED: its admin metadata survives a directory that is gone, and
// a cwd that does not exist is a failed spawn, not a resolution. Returns the path or null.
export async function findItemWorktree(projectRoot, itemRef, options = {}) {
  const branchRef = `refs/heads/${meshItemBranchName(itemRef)}`;
  const entries = await listWorktrees(projectRoot, options);
  const match = entries.find((entry) => entry.branch === branchRef && !entry.prunable);
  return match?.path ?? null;
}

// headCommit(projectRoot, options) — the checkout's current HEAD hash, or null when
// the path is not a usable git repo. The CONTROL side stamps this onto every
// directive it dispatches (the m42 base-commit pin): the assignment is made
// against a KNOWN state of the stream, and the worker builds from exactly that
// commit instead of whatever its own clone's stale HEAD happens to be.
export async function headCommit(projectRoot, options = {}) {
  const exec = resolveExec(options);
  try {
    const result = await exec(["rev-parse", "HEAD"], { cwd: projectRoot });
    const hash = result.stdout.trim();
    return result.status === 0 && /^[0-9a-f]{7,64}$/i.test(hash) ? hash : null;
  } catch (error) {
    // Not-a-repo / no-git degrades to "no pin" (the caller sends no commit and
    // the worker keeps its HEAD fallback) — reported, never silent (m42 item 3).
    reportDegrade("mesh-worktree", error);
    return null;
  }
}

// ensureCommitAvailable(projectRoot, commit, options) — is the dispatched base
// commit present in this checkout, fetching origin once on a miss (the worker's
// clone is never otherwise refreshed, so the control's newest commit routinely
// is not here yet)? False after the fetch means the commit genuinely cannot be
// built from (an unpushed control checkout, a typo'd hash) — the caller fails
// LOUDLY instead of silently building from a stale base, which is the wrong-base
// disease this pin exists to kill.
export async function ensureCommitAvailable(projectRoot, commit, options = {}) {
  const exec = resolveExec(options);
  const present = async () => {
    try {
      return (await exec(["cat-file", "-e", `${commit}^{commit}`], { cwd: projectRoot })).status === 0;
    } catch (error) {
      reportDegrade("mesh-worktree", error);
      return false;
    }
  };
  if (await present()) return true;
  try {
    await exec(["fetch", "origin"], { cwd: projectRoot });
  } catch (error) {
    // An unreachable origin leaves the local answer to decide — the caller's
    // coded refusal is the loud half; the fetch fault itself is still reported.
    reportDegrade("mesh-worktree", error);
  }
  return await present();
}

// localBranchExists(projectRoot, branch, options) — does the checkout already hold
// this branch? The m42 one-branch-per-item cure needs it at dispatch time: a
// re-refine of an item whose derived branch exists must take the REUSE door (`-b`
// would refuse), so the item's line continues instead of forking. Same injected
// exec seam as every other git call here.
export async function localBranchExists(projectRoot, branch, options = {}) {
  const exec = resolveExec(options);
  const result = await exec(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: projectRoot });
  return result.status === 0;
}

// remoteBranchExists(projectRoot, branch) — m43 / story 05, VERIFICATION F-05.3.
//
// "Does this item already have a line?" has TWO halves, and `localBranchExists` answers
// only one. A checkout built fresh — a SECOND worker, or one whose checkout was rebuilt
// after cleanup — has fetched `refs/remotes/origin/<branch>` and has nothing under
// `refs/heads/`. Asking the local half alone therefore answered "no line" for an item
// whose line was sitting in the same clone, and the create door forked it off the pinned
// base, orphaning every commit the previous phase made (measured live 2026-08-05: local
// tip == the pinned base, the previous phase's commit unreachable, while
// `origin/<branch>` still held it).
export async function remoteBranchExists(projectRoot, branch, options = {}) {
  const exec = resolveExec(options);
  const result = await exec(["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`], { cwd: projectRoot });
  return result.status === 0;
}

// adoptRemoteBranch(projectRoot, branch) — give a remote-only line a LOCAL head at the
// commit the remote already has, so the reuse door (which checks out a local branch) and
// its advance apply unchanged.
//
// Deliberately NOT a checkout and NOT a merge: this only NAMES the line locally. Moving
// it to the pinned base stays the sole business of `advanceBranchToBase`, so there is
// still exactly one function that decides how a branch reaches its base — which is what
// keeps ADR-008's refusal semantics (and its never-discards invariant) in one place.
export async function adoptRemoteBranch(projectRoot, branch, options = {}) {
  const exec = resolveExec(options);
  // Best-effort refresh, mirroring reuseWorktreeOnBranch's own first step: a fault here
  // (origin unreachable) must not block adopting the ref this clone already has — but it is
  // still a DEGRADE, and this module's rule (line 45) is that one reports a coded event rather
  // than saying nothing. The adopt below then proceeds against whatever `refs/remotes/origin/`
  // this clone last saw, which is the fact an operator reading a stale adopt needs.
  try {
    await exec(["fetch", "origin", branch], { cwd: projectRoot });
  } catch (error) {
    reportDegrade("mesh-worktree", new Error(`origin could not be refreshed before adopting ${branch}, so the adopt used this clone's last-known refs/remotes/origin/${branch}: ${error?.message ?? error}`), { path: projectRoot });
  }
  const result = await exec(["branch", branch, `refs/remotes/origin/${branch}`], { cwd: projectRoot });
  return result.status === 0;
}

// isUnderMeshWorktreesRoot(projectRoot, candidatePath) — the structural/behavioural
// "prefix-child of the dedicated root" check tests + the reclaim/cleanup paths reuse,
// so "scoped" has one definition.
export function isUnderMeshWorktreesRoot(projectRoot, candidatePath) {
  const root = path.resolve(meshWorktreesRoot(projectRoot)) + path.sep;
  const normalized = path.resolve(candidatePath) + path.sep;
  return normalized.startsWith(root);
}

// ── IS THIS PATH INSIDE A WORKTREE? (milestone 72 / story 04, ADR-007 §2, §3) ────────────────
//
// The three predicates above answer "is this under the root", and FF-7207 needs a different
// question: "is this a WORKTREE". The difference is measured rather than theoretical — each of them
// compares `resolve(root) + sep` against `resolve(candidate) + sep`, and for `candidate === root`
// the two strings are EQUAL, so all three return `true` for the root itself. A census built on them
// directly would classify the roots as worktrees, and the roots are not worktrees: a recursive
// delete of the ROOT is a lane teardown, while a recursive delete of a TREE is TECH_DEBT item 36.
//
// So this is COMPOSED over the three shipped predicates rather than replacing them, and they are
// left byte-unchanged: they carry eight `src/` callers plus an arch control pinning their import
// shape. One new export, three untouched.
//
// It also spells no path of its own. A census that matched `.aof/mesh/worktrees` as a literal would
// go green the day a root is renamed, which is the failure mode the derivation exists to prevent.
const WORKTREE_ROOTS = Object.freeze([
  { root: meshWorktreesRoot, under: isUnderMeshWorktreesRoot },
  { root: meshSessionWorktreesRoot, under: isUnderMeshSessionWorktreesRoot },
  { root: meshDispatchWorktreesRoot, under: isUnderMeshDispatchWorktreesRoot },
]);

export function isInsideMeshWorktree(projectRoot, candidatePath) {
  return WORKTREE_ROOTS.some(({ root, under }) =>
    under(projectRoot, candidatePath) && path.resolve(candidatePath) !== path.resolve(root(projectRoot)));
}

// ------------------------------------------------- the injected exec seam ----

function settleExecFile(error, stdout, stderr, resolve, reject) {
  if (error && (error.code === "ENOENT" || error.killed || error.signal)) {
    reject(error);
    return;
  }
  resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
}

// The ONE literal `git` spawn call-form in this module (the mesh-fabric.mjs precedent)
// — execFile's argv form only, never a shell string. `env` is FORWARDED (129/03): the
// commit verb below rides a per-invocation env (`GIT_TERMINAL_PROMPT=0`, `LC_ALL=C`) and
// dropping it here would silently hand a headless commit a prompt. An absent `env` is
// `undefined`, which execFile reads as "inherit process.env" — byte-identical for every
// other caller in this module.
//
// EXPORTED (129/03 fix round, I4b) so `src/work/dispatch.mjs` — the lane's home, which
// composes this module's verbs — borrows THIS seam instead of carrying a second literal
// `execFile("git", …)` of its own. One spawn form, one resolver; a caller that injects `exec`
// meets the same shape at both doors.
export function defaultGitExec(args, { cwd, env, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, env, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) =>
      settleExecFile(error, stdout, stderr, resolve, reject)
    );
  });
}

export function resolveExec(options) {
  return typeof options?.exec === "function" ? options.exec : defaultGitExec;
}

// meshIdentityArgs(node) — the mesh identity, spelled ONCE (129/03 fix round, I4c): the
// `-c user.*` pair every commit this module makes on a worker's or the loop's behalf carries,
// so a worker whose git identity is unset still commits and the fleet reads one author. The
// node rides in the name (`aof-mesh (umamis-msi)`) so a commit names the machine that made it.
export function meshIdentityArgs(node) {
  const name = `aof-mesh${typeof node === "string" && node.length > 0 ? ` (${node})` : ""}`;
  return ["-c", `user.name=${name}`, "-c", "user.email=aof-mesh@users.noreply.github.com"];
}

function gitError(message, code, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

// -------------------------------------------------------- worktree verbs ----

// addWorktree(projectRoot, assignmentId, commitish, options) — `git worktree add
// --detach <path> <commitish>` at the ONE seam path BY DEFAULT (detached-at-commit,
// RESEARCH.md §4/§5: no branch-name contention between concurrent assignments) —
// UNLESS `options.branch` names a real branch (milestone 38 / story 07, ADR-015
// decision 1), in which case the worktree is checked out ON that branch (`git
// worktree add -b <branch> <path> <commitish>`), HEAD on it, never detached. The
// caller (mesh-worker-execution.mjs) computes the branch via `meshItemBranchName`
// above and passes it here — this function stays agnostic of itemRef/assignmentId
// naming, only "was a branch requested". Every EXISTING detached call site (no
// `options.branch`) is byte-unchanged. Returns the materialized path. A non-zero exit
// is a thrown, coded fault (the caller/orchestrator decides how to surface it — this
// module never swallows a real git failure).
export async function addWorktree(projectRoot, assignmentId, commitish, options = {}) {
  const worktreePath = meshWorktreePath(projectRoot, assignmentId);
  return runWorktreeAdd(projectRoot, worktreePath, commitish, options, { subject: `assignment "${assignmentId}"`, fields: { assignmentId } });
}

// runWorktreeAdd(...) — the ONE `git worktree add` argv form the two keyed add verbs
// share (m50/03). Extracted rather than copied: a second lane wanting a worktree must
// bring its own KEY (and its own root), never its own spelling of the git call — the
// `--detach`-by-default / `-b <branch>`-on-request rule, the non-zero-exit coded throw and
// the never-swallow-a-real-git-failure discipline are properties of `git worktree add`
// here, not of the assignment lane.
async function runWorktreeAdd(projectRoot, worktreePath, commitish, options = {}, fault = {}) {
  const exec = resolveExec(options);
  // THREE FORMS, one argv builder (65/02 adds the third): create a new branch
  // (`options.branch`), CHECK OUT an existing one (`options.checkout` — the door
  // `git worktree add -b` refuses), or the STILL-DEFAULT detached-at-commit form. The
  // third exists because "does this item already have a line?" has two answers and only
  // one of them may take `-b`; letting a caller spell the checkout form itself would be
  // the second `git worktree add` this function exists to prevent.
  const args = options.branch
    ? ["worktree", "add", "-b", options.branch, worktreePath, commitish]
    : options.checkout
      ? ["worktree", "add", worktreePath, options.checkout]
      : ["worktree", "add", "--detach", worktreePath, commitish];
  const result = await exec(args, { cwd: projectRoot });
  if (result.status !== 0) {
    // `fault.verb` and `fault.code` default to the plain add's, so every existing caller's message
    // and thrown code are byte-unchanged; the reuse door supplies its own two (72/ADR-007 §1).
    throw gitError(`${fault.verb ?? "git worktree add"} failed for ${fault.subject}: ${result.stderr || result.stdout}`, fault.code ?? "worktree-add-failed", { ...fault.fields, worktreePath, stderr: result.stderr });
  }
  // THE PREPARE STEP HANGS HERE, ON THE ONE CHOKE POINT, and that is the whole of ADR-007 §1's
  // "at EVERY door, and there are FOUR". All four materialisation doors funnel through this
  // function, so a fifth door added later inherits the step rather than forgetting it — which is
  // exactly what the first draft of that clause got wrong by naming `addWorktree` alone, the door a
  // CONTINUING item does not take.
  await prepareWorktree(projectRoot, worktreePath, options, fault);
  return worktreePath;
}

// ── THE PREPARE STEP (milestone 72 / story 04, ADR-007 §1, §4, §4a, §5) ──────────────────────
//
// A git worktree is materialised with no dependencies, nothing in the worker runtime installs them,
// and the tree is discarded on completion — so every assignment begins with the agent paying for an
// install out of its own tokens and ends by throwing the result away.
//
// THE OBVIOUS FIX IS THE FORBIDDEN ONE, and this repository has the scar (TECH_DEBT item 36, twice
// in four hours): a junctioned dependency directory, a forced worktree removal that followed the
// junction, and 113 tracked files gone. So dependencies arrive by INSTALL, never by LINK — the
// project's own declared program, run INSIDE the tree, through the ONE bounded seam.
//
// THREE ANSWERS, DELIBERATELY DISTINCT, because two of them would otherwise render identically:
//
//   ABSENT   — no step, silently. An optional declaration nobody made is not a fault, and an
//              optional declaration that warns when omitted trains everyone to ignore the warning.
//   MALFORMED — a coded refusal, raised at COMPILE time in the one home. *Present and naming no
//              command* is neither absent nor failed, and that is the gap where a typo becomes an
//              invisible non-install.
//   FAILED   — a loud coded outcome, one code per outcome, and THE TREE IS REMOVED.
//
// THE REMOVAL IS THE CLAUSE THAT MATTERS MOST, and it is measured rather than defensive: two
// shipped callers key on `existsSync(<worktreePath>)` — the deliberate lost-the-race reader — so a
// throw AFTER `git worktree add` has created the directory leaves them reading a half-installed
// tree as READY, in two files this story cannot edit. So the module removes what it just created
// and then throws. That trades away the retain-for-inspection artifact, which is why the prepare's
// stdout and stderr ride the thrown message: the diagnosis has to survive the tree that carried it.
//
// The outcome is surfaced through an OBSERVER on `options`, never by widening the return type: all
// four doors return a bare path string and three callers outside this story's write set consume it
// as one.

// One code per outcome, never folded into one — three different repairs.
export const WORKTREE_PREPARE_FAILED = "worktree-prepare-failed";
export const WORKTREE_PREPARE_DEADLINE_EXPIRED = "worktree-prepare-deadline-expired";
export const WORKTREE_PREPARE_NOT_STARTED = "worktree-prepare-not-started";

const PREPARE_OUTCOME_CODES = Object.freeze({
  exited: WORKTREE_PREPARE_FAILED,
  "deadline-expired": WORKTREE_PREPARE_DEADLINE_EXPIRED,
  "not-started": WORKTREE_PREPARE_NOT_STARTED,
});

// THE TOOLCHAIN ARRIVES BY DYNAMIC IMPORT, AND THE DEFERRAL IS THE POINT — not a dodge.
//
// This module is a high-fan-in near-leaf: 39 modules import it, and almost all of them want the
// PATH SEAM (`meshWorktreePath` and its siblings) rather than the git verbs, let alone the prepare
// step. A static edge to the declaration compiler would put its bounded-spawn seam into all 39
// closures to serve the handful of calls that materialise a tree — which is the same cost this
// milestone's story 03 just removed from the CLI's boot path, arriving at a different door.
//
// It is also, measured, what keeps a frozen reach ceiling frozen: `acd-session-driver-mesh-blind`
// pins the assignment sink's reach at exactly 68 with an ADR named for every increment, and the
// static edge took it to 70. That control is milestone 53's and this story is sanctioned to edit
// neither it nor the ADR behind it — so the honest answer is not to widen the reach, which is the
// same answer the paragraph above reaches on its own merits.
async function toolchain() {
  return await import("../work/toolchain.mjs");
}

// The compiled declaration, from ITS one home. `options.prepare` is a seam of the same kind as
// `options.exec`: a caller that already holds the compiled step hands it over rather than making
// this module load a workspace twice.
async function compilePrepare(projectRoot, options) {
  if (options.prepare !== undefined) return options.prepare;
  const { resolveWorktreePrepare } = await toolchain();
  const load = options.loadWorkspace ?? loadWorkspace;
  let config = {};
  try {
    config = (await load(projectRoot))?.config ?? {};
  } catch (error) {
    // A workspace that will not LOAD AT ALL declares nothing this module can read, so the answer is
    // the ABSENT one — materialising a worktree is not the place to fail a repository. But it is
    // REPORTED rather than swallowed: silence here would be indistinguishable from "no step was
    // declared", which is precisely the pair ADR-007 §5 exists to keep apart. Measured: this is a
    // genuine last resort — `loadWorkspace` answers `{ config: {} }` for a missing config file AND
    // for one that does not parse, so only an fs-level fault reaches here.
    reportDegrade("mesh-worktree", new Error(`the workspace at ${projectRoot} could not be loaded, so no worktree prepare step could be read: ${error?.message ?? error}`), { path: projectRoot });
    return { ok: true, prepare: null };
  }
  return resolveWorktreePrepare(config, { projectRoot });
}

// Best-effort teardown of the tree this call created. Its own fault is swallowed on purpose — it
// must never mask the prepare failure that is being reported, which is the thing the operator has
// to read. `git worktree remove --force`, never a bare recursive delete (ADR-007 §3).
async function discardWorktree(projectRoot, worktreePath, options) {
  const exec = resolveExec(options);
  try {
    await exec(["worktree", "remove", "--force", worktreePath], { cwd: projectRoot });
  } catch (error) {
    // The removal's OWN fault must never replace the prepare failure being reported — that is the
    // thing the operator has to read. But it is not swallowed either: a teardown that did not land
    // leaves exactly the half-installed tree this whole clause exists to prevent, so it rides the
    // degrade channel while the prepare failure rides the throw. Best-effort means "does not
    // crash", never "says nothing" (m42 / TECH_DEBT item 3).
    reportDegrade("mesh-worktree", new Error(`the half-installed worktree at ${worktreePath} could not be removed after its prepare step failed — it may still be on disk and will read as ready: ${error?.message ?? error}`), { path: worktreePath });
  }
}

async function prepareWorktree(projectRoot, worktreePath, options = {}, fault = {}) {
  const compiled = await compilePrepare(projectRoot, options);

  if (compiled.ok !== true) {
    // PRESENT AND MALFORMED. Raised at compile time in `src/work/toolchain.mjs` and carried through
    // with ITS code and ITS message — a re-phrasing here would be a second vocabulary for one
    // situation, and the operator has to be sent to the key that is wrong.
    await discardWorktree(projectRoot, worktreePath, options);
    throw gitError(compiled.message, compiled.code, { ...fault.fields, worktreePath, key: compiled.key });
  }

  const step = compiled.prepare;
  if (step == null) return null;

  const { launchStep } = await toolchain();
  const report = await launchStep(step, { cwd: worktreePath, launch: options.launch });
  if (typeof options.onPrepare === "function") options.onPrepare({ worktreePath, ...report });
  if (report.status === 0) return report;

  await discardWorktree(projectRoot, worktreePath, options);
  throw gitError(
    `the declared worktree prepare step failed for ${fault.subject ?? worktreePath}: ${report.message}\n--- prepare stdout ---\n${report.stdout}\n--- prepare stderr ---\n${report.stderr}`,
    PREPARE_OUTCOME_CODES[report.outcome] ?? WORKTREE_PREPARE_FAILED,
    { ...fault.fields, worktreePath, outcome: report.outcome, exitCode: report.exitCode, deadlineMs: report.deadlineMs, stdout: report.stdout, stderr: report.stderr },
  );
}

// addSessionWorktree(projectRoot, itemRef, commitish, options) — the SESSION lane's
// materialization: the same `git worktree add --detach` mechanics as `addWorktree`, at
// `meshSessionWorktreePath` instead of `meshWorktreePath`. Detached on purpose — a bare
// session carries no branch policy (no assignment, no base commit, no push contract), so
// inventing one here would be a lifecycle the session lane does not have; and a session
// tree must never take the item branch, which would make the assignment lane's own reuse
// door have to evict an operator's shell.
export async function addSessionWorktree(projectRoot, itemRef, commitish, options = {}) {
  const worktreePath = meshSessionWorktreePath(projectRoot, itemRef);
  return runWorktreeAdd(projectRoot, worktreePath, commitish, options, { subject: `session item "${itemRef}"`, fields: { itemRef } });
}

// reuseWorktreeOnBranch(projectRoot, assignmentId, baseBranch, options) — VERIFICATION
// (continue-on-existing-branch, 2026-07-25). Materialize this assignment's worktree
// checked out ON an EXISTING mesh branch `baseBranch` (the item's active branch, carried
// on the directive), so a continue/verify runs on the refine's own branch and its commits
// accumulate there — never a fresh branch off main. The worktree PATH is still
// assignmentId-keyed (meshWorktreePath — the SECURITY F4 invariant is untouched: the path
// is never composed from the branch/ref text); only the checked-out branch is reused.
//
// A git branch can be checked out in at most ONE worktree, so this first RELEASES any
// worktree still holding `baseBranch` (the refine's own, if it survived) and prunes stale
// metadata, then adds THIS assignment's worktree on the branch:
//   - `git fetch origin <baseBranch>` (best-effort — brings the latest pushed tip; a
//     local-only branch or an unreachable origin is not fatal, the local branch stands);
//   - `git worktree prune` + remove any worktree whose checked-out branch IS baseBranch;
//   - if the branch resolves locally → `git worktree add <path> <baseBranch>`; else (a
//     re-cloned checkout that has it only on origin) → `git worktree add -b <baseBranch>
//     <path> origin/<baseBranch>` (a local branch tracking the pushed one).
// Returns the materialized path. A non-zero `worktree add` is a thrown coded fault (the
// caller decides how to surface it — the never-swallow discipline addWorktree keeps).
export async function reuseWorktreeOnBranch(projectRoot, assignmentId, baseBranch, options = {}) {
  const exec = resolveExec(options);
  const worktreePath = meshWorktreePath(projectRoot, assignmentId);
  // The exec seam may be sync (a test double) or async (production `git` spawn), so every
  // best-effort step is `await exec(...)` inside a try/catch — never `.catch()` on the
  // return (which a sync double does not carry). A best-effort step's fault is swallowed.
  const tryExec = async (args) => {
    try { return await exec(args, { cwd: projectRoot }); } catch { return { status: 1, stdout: "", stderr: "" }; }
  };

  // Best-effort refresh of the branch from origin — a fault here (local-only branch,
  // origin unreachable) never blocks the reuse; the local branch, if present, is used.
  await tryExec(["fetch", "origin", baseBranch]);

  // Release any worktree still holding the branch (the refine's), then prune stale admin
  // metadata so a later add at this path is never blocked (RESEARCH §4's prunable note).
  const refName = `refs/heads/${baseBranch}`;
  let holders = [];
  try {
    holders = (await listWorktrees(projectRoot, { exec })).filter((entry) => entry.branch === refName);
  } catch {
    holders = [];
  }
  for (const holder of holders) {
    await tryExec(["worktree", "remove", "--force", holder.path]);
  }
  await tryExec(["worktree", "prune"]);

  // THROUGH THE ONE CHOKE POINT (72/ADR-007 §1). This door's two argv forms were byte-identical to
  // `runWorktreeAdd`'s checkout and branch forms already — the only delta was the thrown code, and
  // nothing in `src/`, `test/` or `ui/` references it — so routing through that function costs a
  // threaded `verb`/`code` and buys the prepare step on the DOMINANT path. A continuing item takes
  // this door, and under a prepare hung on `addWorktree` alone it would have paid the install on
  // every dispatch after the first: the story's own requirement failing on the path it exists for.
  const hasLocal = (await tryExec(["rev-parse", "--verify", "--quiet", refName])).status === 0;
  const addOptions = hasLocal
    ? { ...options, branch: undefined, checkout: baseBranch }
    : { ...options, checkout: undefined, branch: baseBranch };
  return runWorktreeAdd(projectRoot, worktreePath, `origin/${baseBranch}`, addOptions, {
    subject: `assignment "${assignmentId}"`,
    verb: `git worktree add (reuse branch "${baseBranch}")`,
    code: "worktree-reuse-failed",
    fields: { assignmentId, baseBranch },
  });
}

// advanceBranchToBase(worktreePath, commit, options) — M43 / STORY 05 (ADR-008): GATE-TIME
// PROPAGATION. The m42 base-commit pin already carries a control-side edit to a worker, but
// only through the CREATE door — "the reuse doors ignore it by design: an existing line
// continues from where it is" (mesh-worker-execution.mjs). So a CONTINUING item, which by
// definition takes the reuse door, never saw an edit the operator made at a gate. This
// brings the item branch UP TO the directive's pinned base, in the materialized worktree,
// after `reuseWorktreeOnBranch` and BEFORE the agent starts.
//
// It lives HERE, not at the dispatch call site, for two independent reasons (ADR-010 R5.2):
// this module already owns every git verb and imports 0 mesh modules (so the 3,174-line
// worker-execution god-file gains a CALL SITE, not a block — TECH_DEBT item 10); and the
// dispatch path ALWAYS materializes a fresh worktree, so the dirty-tree refusal is only
// exercisable against a directly-callable function. An untestable safety rule is not one.
//
// THE MECHANISM — fast-forward-if-possible, a REAL MERGE otherwise. SPEC/STATE's word
// "fast-forward" needs an honest reading: the item branch was cut from an earlier control
// HEAD and carries the WORKER's commits while the control's new HEAD carries the gate edit,
// so in git's terms the two are DIVERGED, not "behind". A strict `--ff-only` rule would
// deliver the propagation only in the rare case where the worker committed nothing.
//   - the pinned base is already an ancestor  → NO-OP, `already-current`;
//   - the branch is strictly behind           → `merge --ff-only`, `fast-forwarded`
//                                               (nothing created, nothing lost);
//   - the two lines diverged                  → a REAL merge of the pinned base INTO the
//                                               item branch, `merged` — every worker commit
//                                               preserved by construction, the gate edit
//                                               arrives, and the history stays honest.
//
// FORBIDDEN ABSOLUTELY on this path, with NO `--force` escape hatch (a flag that permits
// history loss will eventually be passed): `rebase`, `push --force`/`--force-with-lease`,
// `reset --hard`, `checkout -B`, `branch -f`, any `update-ref` against `refs/heads/*`. Every
// one of them can discard a worker commit. The absence is guarded by the fitness function
// `acd-gate-propagation-never-discards`, which arms as an outright ban the moment a `merge`
// verb appears in this module.
//
// TWO PRECONDITIONS, each a LOUD CODED REFUSAL that leaves the tree exactly as it was:
//   - `assignment-gate-propagation-dirty-worktree` — never check out or merge over
//     uncommitted work; the operator's unstaged bytes are the one thing git cannot recover.
//   - `assignment-gate-propagation-conflict` — a conflicting merge is `git merge --abort`ed
//     and refused. Handing an agent a half-merged tree is strictly WORSE than not
//     propagating: it would begin a phase on a state no human authored.
// Both are RETURNED (never thrown) as `{ outcome: "refused", code }`, so the caller settles
// the assignment `failed` with the code exactly as `assignment-base-commit-unavailable`
// already does. A git fault that is NOT one of those two is a thrown coded error — this
// module's never-swallow-a-real-git-failure discipline.
//
// ORDERING NOTE (a decision, not an accident): the already-an-ancestor no-op is decided
// BEFORE the dirty-tree check, because that case runs no git verb at all — refusing a
// dispatch that was never going to touch the tree would turn today's working continue into
// a coded failure for no safety gain. Every path that ACTS (`--ff-only` and the merge alike,
// both of which update tracked files) is behind the clean-tree guard.
//
// Returns `{ outcome, code, branch, base, tip }` — `base` is the resolved pinned commit and
// `tip` the branch tip the agent will actually start from (unchanged on both refusals), the
// pair the caller reports on the `worker-worktree-base` log channel so "which base did this
// phase run on" stays one `aof mesh logs --node` read.
//
// THE DIRTY POLICY (129/03, 129/ADR-002 §1) — ONE additive option, `dirtyPolicy`, and the
// loop is why it exists: the loop merges each lane home in the PRIMARY checkout, which is the
// operator's live desk with a hundred dirty files, and refusing on files the merge never
// touches would make the live soak impossible on that tree.
//   `"strict"`        — the default and today's door 2, byte-identical for the mesh: a
//                       non-empty `status --porcelain` refuses before anything is touched. A
//                       worker's tree is nobody's desk. Strict answers carry no `files` key.
//   `"touched-paths"` — two sets must both be empty, else the refusal RETURNS the union as
//                       `files` (sorted, deduplicated): (a) every STAGED index entry whatever
//                       its path (first porcelain column in `MADRC` — a real merge refuses any
//                       staged entry and a fast-forward would carry it across silently, so an
//                       operator mid-commit is refused by name under both doors), a rename
//                       contributing BOTH its paths; and (b) the worktree-side and untracked
//                       paths intersected with what the advance would bring in — the THREE-DOT
//                       diff `HEAD...<commit>` (merge-base to commit; the two-dot form lists
//                       paths only THIS side changed and manufactures refusals git itself would
//                       not raise), `--no-renames` so a renamed path contributes both its old
//                       and new name. Git enforces the same rule itself ("your local changes
//                       would be overwritten"); computing it FIRST is what keeps the refusal
//                       returned rather than thrown and the tree exactly as it was.
// An unknown value is a THROWN coded error (`gate-propagation-bad-option`) raised before any
// git verb runs — a policy nobody asked for must never be the one applied. The literal set is
// exactly `DIRTY_POLICIES`; FF-12904 asserts it.
const DIRTY_POLICIES = Object.freeze(["strict", "touched-paths"]);

export async function advanceBranchToBase(worktreePath, commit, options = {}) {
  const dirtyPolicy = options.dirtyPolicy === undefined ? "strict" : options.dirtyPolicy;
  if (!DIRTY_POLICIES.includes(dirtyPolicy)) {
    throw gitError(`advanceBranchToBase: unknown dirtyPolicy ${JSON.stringify(dirtyPolicy)} — expected one of ${DIRTY_POLICIES.map((policy) => JSON.stringify(policy)).join(", ")}`, "gate-propagation-bad-option", { worktreePath, commit, dirtyPolicy });
  }
  const exec = resolveExec(options);
  const run = (args) => exec(args, { cwd: worktreePath });
  const text = (result) => String(result?.stdout ?? "").trim();
  // Best-effort only — a step whose own failure must never mask the outcome it is
  // classifying (the abort below), mirroring reuseWorktreeOnBranch's tryExec.
  const tryRun = async (args) => {
    try { return await run(args); } catch { return { status: 1, stdout: "", stderr: "" }; }
  };

  // HEAD is on the item branch at the reuse door (ADR-015: never detached) — read it for
  // the report rather than re-deriving it, so the line names the branch git actually holds.
  const branch = text(await tryRun(["symbolic-ref", "--quiet", "--short", "HEAD"])) || null;

  const resolved = await run(["rev-parse", "--verify", "--quiet", `${commit}^{commit}`]);
  const base = text(resolved);
  if (resolved.status !== 0 || base.length === 0) {
    // The caller has already run ensureCommitAvailable, so a miss here is a genuine fault
    // (a mid-dispatch prune, a corrupt object db) and never the routine unpushed-control
    // case that `assignment-base-commit-unavailable` names.
    throw gitError(`the pinned base commit "${commit}" does not resolve in the worktree at ${worktreePath}`, "gate-propagation-base-unresolved", { worktreePath, commit, branch });
  }
  const tipBefore = text(await run(["rev-parse", "HEAD"]));
  const settle = (outcome, code, tip) => ({ outcome, code, branch, base, tip });

  // (1) The pinned base is already on the branch — nothing to do, and nothing touched.
  if ((await run(["merge-base", "--is-ancestor", base, "HEAD"])).status === 0) {
    return settle("already-current", null, tipBefore);
  }

  // (2) The clean-tree precondition, checked BEFORE anything is touched. `--ff-only` is as
  // capable of writing over an uncommitted change as a merge is, so the guard covers both.
  // Under `strict` the invocation is byte-identical to the mesh's (`status --porcelain`).
  // Under `touched-paths` the porcelain is read with `--untracked-files=all` — the default
  // COLLAPSES a wholly-untracked directory to one `?? dir/` line, whose path never intersects
  // the advance's file list, so an untracked file the advance would overwrite fell through to
  // git's own refusal and THREW instead of returning (129/03 fix round, I1) — and with
  // `core.quotePath=false`, so a non-ASCII name is named as itself in `files` rather than as
  // its C-escaped spelling. Only the dirt the advance would actually overwrite (plus every
  // staged entry) refuses — named, so the operator commits or stashes exactly those and resumes.
  if (dirtyPolicy === "strict") {
    if (text(await run(["status", "--porcelain"])).length > 0) {
      return settle("refused", "assignment-gate-propagation-dirty-worktree", tipBefore);
    }
  } else {
    const porcelain = String((await run(["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"]))?.stdout ?? "");
    if (porcelain.trim().length > 0) {
      const touched = text(await run(["-c", "core.quotePath=false", "diff", "--name-only", "--no-renames", `HEAD...${base}`]))
        .split(/\r?\n/)
        .map((line) => unquotePorcelainPath(line.trim()))
        .filter(Boolean);
      const files = dirtyTouchedPaths(porcelain, touched);
      if (files.length > 0) {
        return { ...settle("refused", "assignment-gate-propagation-dirty-worktree", tipBefore), files };
      }
    }
  }

  // (3) Strictly behind — take the cheap door: nothing is created, nothing is lost.
  if ((await run(["merge-base", "--is-ancestor", "HEAD", base])).status === 0) {
    const forward = await run(["merge", "--ff-only", base]);
    if (forward.status !== 0) {
      throw gitError(`git merge --ff-only ${base} failed in worktree "${worktreePath}": ${forward.stderr || forward.stdout}`, "gate-propagation-failed", { worktreePath, commit: base, branch });
    }
    return settle("fast-forwarded", null, text(await run(["rev-parse", "HEAD"])));
  }

  // (4) Diverged — the COMMON case: a real merge of the pinned base INTO the item branch.
  // Under the mesh identity (`meshIdentityArgs`, the one spelling commitWorktreeChanges shares)
  // so a worker whose git identity is unset can still create the merge commit.
  const message = typeof options.message === "string" && options.message.length > 0
    ? options.message
    : `aof(mesh): advance ${branch ?? "the item branch"} to the dispatched base ${base}\n\nGate-time propagation (m43 ADR-008): the control's pinned base is merged INTO the item branch so an edit made at a gate reaches this phase. Every worker commit is preserved — this path never rebases, force-updates or resets.`;
  const merged = await run([...meshIdentityArgs(options.node), "merge", "--no-ff", "--no-edit", "-m", message, base]);
  if (merged.status !== 0) {
    // Classify BEFORE aborting — an unmerged index (or a MERGE_HEAD) is what makes this a
    // conflict rather than some other git fault.
    const conflicted =
      (await tryRun(["rev-parse", "-q", "--verify", "MERGE_HEAD"])).status === 0 ||
      /^(U.|.U|AA|DD)/m.test(String((await tryRun(["status", "--porcelain"]))?.stdout ?? ""));
    await tryRun(["merge", "--abort"]);
    if (!conflicted) {
      throw gitError(`git merge ${base} failed in worktree "${worktreePath}": ${merged.stderr || merged.stdout}`, "gate-propagation-failed", { worktreePath, commit: base, branch });
    }
    return settle("refused", "assignment-gate-propagation-conflict", text(await run(["rev-parse", "HEAD"])));
  }
  return settle("merged", null, text(await run(["rev-parse", "HEAD"])));
}

// unquotePorcelainPath(value) — git quotes a path carrying a special character in C style
// (`"…"`, `core.quotePath`); the surrounding quotes are stripped so the name compares against
// the diff's spelling of the same path.
function unquotePorcelainPath(value) {
  return String(value ?? "").replace(/^"(.*)"$/u, "$1");
}

// parsePorcelainStatus(text) — THE ONE porcelain-v1 parser (129/03 fix round, I4a): every
// `git status --porcelain` this module or the lane's home reads goes through here, so the
// column rule and the quote strip are spelled once. Each line is `XY <path>`, a rename or copy
// `XY <old> -> <new>`; X is the INDEX column, Y the worktree column, `??` an untracked entry,
// `!!` an ignored one. Answers `[{ index, worktree, paths }]` — `paths` is one entry for an
// ordinary line and `[old, new]` for a rename, quotes already stripped. Lines too short to
// carry a path are skipped rather than guessed at.
export function parsePorcelainStatus(text) {
  const entries = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    if (raw.length < 4) continue;
    const paths = raw.slice(3).split(" -> ").map((half) => unquotePorcelainPath(half)).filter(Boolean);
    if (paths.length === 0) continue;
    entries.push({ index: raw[0], worktree: raw[1], paths });
  }
  return entries;
}

// dirtyTouchedPaths(porcelain, touched) — the `touched-paths` refusal set, PURE over the two
// texts git answered so the rule is readable in one place.
//   staged   — X not blank and not `?`/`!` (so `M`, `A`, `D`, `R`, `C`, `T`, and an unmerged
//              `U`), every path of the entry: a merge refuses any of these and a fast-forward
//              would carry them across silently.
//   worktree — Y in `M`/`D`/`T`, or an untracked entry, the path the working tree holds —
//              refused only where the advance would write the same path.
// Sorted and deduplicated so the answer is deterministic whatever order git printed in.
function dirtyTouchedPaths(porcelain, touched) {
  const touchedSet = new Set(touched);
  const files = new Set();
  for (const { index, worktree, paths } of parsePorcelainStatus(porcelain)) {
    const untracked = index === "?";
    const staged = !untracked && index !== " " && index !== "!";
    if (staged) {
      for (const entry of paths) files.add(entry);
      continue;
    }
    const worktreeDirty = untracked || worktree === "M" || worktree === "D" || worktree === "T";
    if (!worktreeDirty) continue;
    const held = paths[paths.length - 1];
    if (touchedSet.has(held)) files.add(held);
  }
  return [...files].sort();
}

// The commit verb's budget when it falls back to this module's default runner (129/03 fix
// round, I5). The verb used to ride the worker's push seam, whose default gave a commit five
// minutes; this module's default is 30s — right for a `rev-parse`, wrong for `git add -A` over
// a worktree that has just materialised a large tree on a cold disk, which is exactly the
// worker's commit. Injected runners are handed `{ cwd, env }` alone, exactly as before.
const WORKTREE_COMMIT_TIMEOUT_MS = 5 * 60 * 1000;

// scopeReachesAofHome(paths) — does a scoped stage reach `.aof/`? Only then is the `.aof`
// reset owed: a path equal to `.aof`, inside it, or an ancestor of it (`.`). A scope like
// `wiki/work/<milestone dir>` cannot stage anything under `.aof`, and resetting anyway would
// unstage an operator's OWN staged `.aof/aof.config.json` outside the scope — the loop's
// commit touching a file the loop was told to leave alone (129/ADR-002 §2, ADR-008 §7(d)).
function scopeReachesAofHome(paths) {
  return paths.some((entry) => {
    const spec = String(entry).replaceAll("\\", "/").replace(/^(\.\/)+/u, "").replace(/\/+$/u, "");
    return spec === "" || spec === "." || spec === ".aof" || spec.startsWith(".aof/");
  });
}

// commitWorktreeChanges(worktreePath, options) — story 07 COMPLETION (VERIFICATION
// F-38.06i, live two-machine soak 2026-07-25). The autonomous agent produces its diff
// in the worktree but does NOT commit it — the agent is commit-agnostic (it runs the
// SAME whether local or on a worker; committing-to-sync-home is the mesh's concern,
// not the agent's). So story 07's `pushWorktreeBranch` had nothing to carry: it pushed
// the branch at its base commit and the worker's work stayed stranded, UNCOMMITTED, in
// the worktree — the exact live-soak finding (a full refine, 7 stories + ADRs + ~180KB
// of docs, that never left the Mac). This commits that diff, right before the push.
//
//   `git add -A`  — stages every change (honouring .gitignore, so a per-worktree
//                   node_modules / build output — RESEARCH §4 — is never committed).
//   `git reset -- .aof` — but NEVER commit aof's OWN config/state (`.aof/aof.config.json`
//                   carries worker-local mesh settings; the milestone deliverables live
//                   under wiki/work/ + the source tree, never under .aof/). Best-effort.
//   `git commit`  — under a mesh identity (`-c user.*`, so a worker whose git identity
//                   is unset still commits), `--no-verify` because this is a HEADLESS
//                   autonomous commit on an ARBITRARY target repo whose commit hooks may
//                   need a dev environment this worktree lacks; the diff is reviewed on
//                   the pushed branch, never merged unseen.
//
// A CLEAN worktree (the agent committed already, or produced nothing) is a NO-OP →
// { committed: false }, so a produce-nothing run is never a spurious empty commit and
// the push still carries any commits the agent DID make. A non-zero git exit THROWS a
// coded `commit-failed` — the caller (handleDirective) treats it exactly like a failed
// push: loud coded `failed`, worktree RETAINED for inspection, never a silent clean
// `done` over an uncommitted diff.
//
// MOVED HERE at 129/03 (129/ADR-008 §4, TECH_DEBT item 83 seam 3 — one verb of it), from
// `worker-execution.mjs`, which re-exports it so every importer keeps its line. Two rulings
// travelled with it:
//   · THE RUNNER is `options.exec ?? options.pushExec` ?? this module's default. The worker's
//     two call sites pass `pushExec` (the ONE fake git a mesh test scripts commit + push
//     through); the loop's lane commit passes `exec`, this module's own idiom. Whichever is
//     given receives every invocation, with the per-invocation env below.
//   · `paths` (129/ADR-002 §2) SCOPES THE WHOLE VERB, not only the stage: a non-empty array of
//     repo-relative paths makes the stage `git add -- <paths…>` (never `-A`), the staged check
//     `diff --cached --name-only -- <paths…>` and the commit itself
//     `commit --no-verify -m <message> -- <paths…>`, so the loop commits ONLY
//     `wiki/work/<milestone dir>/` in the operator's live primary through this one verb and an
//     operator's pre-staged `M  README.md` outside the scope STAYS staged, where
//     `advanceBranchToBase`'s touched-paths door then refuses it by name (129/03 fix round,
//     B1 — a scope that staged narrowly but committed the whole index swept the operator's
//     staged work into the loop's commit). `git add -- <pathspec>` that matches nothing is a
//     fatal exit 128 while `status --porcelain -- <pathspec>` on the same input is a clean
//     empty answer, so the scoped door reads the porcelain FIRST and is a no-op on an empty
//     scope. The `.aof` reset runs on the scoped door ONLY when the scope can reach `.aof`
//     (`scopeReachesAofHome`); for `wiki/work/<milestone>` it is skipped, because in the live
//     primary it silently unstaged a staged `.aof/aof.config.json` outside the scope. And
//     because `git commit -- <pathspec>` takes the WORKING-TREE contents of the matched paths
//     (it disregards the index for them — measured: `commit -- .` after the reset still
//     committed `.aof/aof.config.json`), a scope that reaches `.aof` carries the pathspec
//     `:(exclude).aof` on its check and its commit, so the reset's intent holds on that door
//     too. Absent, `-A`, the reset, the unscoped check and the unscoped commit, exactly as
//     before.
export async function commitWorktreeChanges(worktreePath, { message, node, exec, pushExec, paths } = {}) {
  const runner = typeof exec === "function"
    ? exec
    : typeof pushExec === "function"
      ? pushExec
      : (args, opts) => defaultGitExec(args, { ...opts, timeoutMs: WORKTREE_COMMIT_TIMEOUT_MS });
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C", LANG: "C" };
  const fail = (result, verb) => gitError(`git ${verb} failed in worktree "${worktreePath}": ${result.stderr || result.stdout}`, "commit-failed", { worktreePath, stderr: result.stderr });

  const scoped = Array.isArray(paths) && paths.length > 0 ? paths.map(String) : null;
  const reachesAof = scoped != null && scopeReachesAofHome(scoped);
  const scope = scoped == null ? [] : ["--", ...scoped];
  const commitScope = scoped == null ? [] : [...scope, ...(reachesAof ? [":(exclude).aof"] : [])];
  if (scoped != null) {
    const pending = await runner(["status", "--porcelain", ...scope], { cwd: worktreePath, env });
    if (pending.status !== 0) throw fail(pending, "status");
    if (!String(pending.stdout ?? "").trim()) return { committed: false };
  }
  const add = await runner(scoped != null ? ["add", ...scope] : ["add", "-A"], { cwd: worktreePath, env });
  if (add.status !== 0) throw fail(add, "add");
  // Never sync aof's own config/state home — best-effort, its own outcome is not fatal. Owed
  // only when the stage could have reached it; a narrower scope leaves the operator's index alone.
  if (scoped == null || reachesAof) {
    await runner(["reset", "-q", "--", ".aof"], { cwd: worktreePath, env });
  }

  const staged = await runner(["diff", "--cached", "--name-only", ...commitScope], { cwd: worktreePath, env });
  if (!String(staged.stdout ?? "").trim()) return { committed: false };

  const commit = await runner(
    [...meshIdentityArgs(node), "commit", "--no-verify", "-m", message, ...commitScope],
    { cwd: worktreePath, env },
  );
  if (commit.status !== 0) throw fail(commit, "commit");
  return { committed: true };
}

// removeWorktree(projectRoot, assignmentId, options) — `git worktree remove` (NEVER a
// bare rm — RESEARCH.md §4: a bare rm leaves `.git/worktrees/<name>` behind as
// prunable metadata that blocks a later `add` at the same path; `git worktree remove`
// clears BOTH the dir and the admin metadata). `options.force` passes `--force` (a
// worktree holding uncommitted/untracked changes needs it — RESEARCH.md §4).
export async function removeWorktree(projectRoot, assignmentId, options = {}) {
  const exec = resolveExec(options);
  const worktreePath = meshWorktreePath(projectRoot, assignmentId);
  const args = ["worktree", "remove", ...(options.force ? ["--force"] : []), worktreePath];
  const result = await exec(args, { cwd: projectRoot });
  if (result.status !== 0) {
    throw gitError(`git worktree remove failed for assignment "${assignmentId}": ${result.stderr || result.stdout}`, "worktree-remove-failed", { assignmentId, worktreePath, stderr: result.stderr });
  }
  return worktreePath;
}

// listWorktrees(projectRoot, options) — `git worktree list --porcelain`, parsed into
// [{ path, head, branch, detached, locked, prunable }]. Used by the retention sweep +
// the "no stale prunable metadata" assertion (task 03).
export async function listWorktrees(projectRoot, options = {}) {
  const exec = resolveExec(options);
  const result = await exec(["worktree", "list", "--porcelain"], { cwd: projectRoot });
  if (result.status !== 0) {
    throw gitError(`git worktree list failed: ${result.stderr || result.stdout}`, "worktree-list-failed", { stderr: result.stderr });
  }
  return parseWorktreeListPorcelain(result.stdout);
}

function parseWorktreeListPorcelain(stdout) {
  const entries = [];
  let current = null;
  for (const line of stdout.split("\n")) {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: trimmed.slice("worktree ".length), head: null, branch: null, detached: false, locked: false, prunable: false };
    } else if (current && trimmed.startsWith("HEAD ")) {
      current.head = trimmed.slice("HEAD ".length);
    } else if (current && trimmed.startsWith("branch ")) {
      current.branch = trimmed.slice("branch ".length);
    } else if (current && trimmed === "detached") {
      current.detached = true;
    } else if (current && (trimmed === "locked" || trimmed.startsWith("locked "))) {
      current.locked = true;
    } else if (current && (trimmed === "prunable" || trimmed.startsWith("prunable "))) {
      current.prunable = true;
    }
  }
  if (current) entries.push(current);
  return entries;
}

// sweepRetainedWorktrees(projectRoot, retainedAssignments, options) — the bounded
// RETENTION sweep (ADR-004/task 03): each `{ assignmentId, failedAt }` whose age
// (`now - failedAt`) exceeds the documented ceiling is removed via `git worktree
// remove` (never a bare rm); everything within the ceiling is left untouched. Returns
// `{ swept: [assignmentId…], kept: [assignmentId…] }`. `now`/`retentionMs` are
// INJECTED (the 22/R2 inject-the-clock discipline) — this function reads no wall clock
// by default only at the top-level default parameter, never internally re-read.
export async function sweepRetainedWorktrees(projectRoot, retainedAssignments, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const retentionMs = typeof options.retentionMs === "number" ? options.retentionMs : DEFAULT_WORKTREE_RETENTION_MS;
  const swept = [];
  const kept = [];
  for (const entry of retainedAssignments) {
    const ageMs = nowMs - Date.parse(entry.failedAt);
    if (ageMs > retentionMs) {
      await removeWorktree(projectRoot, entry.assignmentId, options);
      swept.push(entry.assignmentId);
    } else {
      kept.push(entry.assignmentId);
    }
  }
  return { swept, kept };
}
