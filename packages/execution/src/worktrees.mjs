// Git worktree mechanisms. Callers supply preparation, diagnostics and merge identity/message policy.
// Historical error codes are preserved for existing callers. No mesh paths or application imports.
import { execFile } from "node:child_process";

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


function gitError(message, code, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
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


export function createWorktreeOperations({ reportDegrade, prepareWorktree, identityArgs, mergeMessage }) {
  for (const [name, service] of Object.entries({ reportDegrade, prepareWorktree, identityArgs, mergeMessage })) {
    if (typeof service !== "function") throw new TypeError(`createWorktreeOperations: ${name} is required`);
  }

// headCommit(projectRoot, options) — the checkout's current HEAD hash, or null when
// the path is not a usable git repo. The CONTROL side stamps this onto every
// directive it dispatches (the m42 base-commit pin): the assignment is made
// against a KNOWN state of the stream, and the worker builds from exactly that
// commit instead of whatever its own clone's stale HEAD happens to be.
async function headCommit(projectRoot, options = {}) {
  const exec = resolveExec(options);
  try {
    const result = await exec(["rev-parse", "HEAD"], { cwd: projectRoot });
    const hash = result.stdout.trim();
    return result.status === 0 && /^[0-9a-f]{7,64}$/i.test(hash) ? hash : null;
  } catch (error) {
    // Not-a-repo / no-git degrades to "no pin" (the caller sends no commit and
    // the worker keeps its HEAD fallback) — reported, never silent (m42 item 3).
    reportDegrade(error);
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
async function ensureCommitAvailable(projectRoot, commit, options = {}) {
  const exec = resolveExec(options);
  const present = async () => {
    try {
      return (await exec(["cat-file", "-e", `${commit}^{commit}`], { cwd: projectRoot })).status === 0;
    } catch (error) {
      reportDegrade(error);
      return false;
    }
  };
  if (await present()) return true;
  try {
    await exec(["fetch", "origin"], { cwd: projectRoot });
  } catch (error) {
    // An unreachable origin leaves the local answer to decide — the caller's
    // coded refusal is the loud half; the fetch fault itself is still reported.
    reportDegrade(error);
  }
  return await present();
}

// localBranchExists(projectRoot, branch, options) — does the checkout already hold
// this branch? The m42 one-branch-per-item cure needs it at dispatch time: a
// re-refine of an item whose derived branch exists must take the REUSE door (`-b`
// would refuse), so the item's line continues instead of forking. Same injected
// exec seam as every other git call here.
async function localBranchExists(projectRoot, branch, options = {}) {
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
async function remoteBranchExists(projectRoot, branch, options = {}) {
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
async function adoptRemoteBranch(projectRoot, branch, options = {}) {
  const exec = resolveExec(options);
  // Best-effort refresh, mirroring reuseWorktreeOnBranch's own first step: a fault here
  // (origin unreachable) must not block adopting the ref this clone already has — but it is
  // still a DEGRADE, and this module's rule (line 45) is that one reports a coded event rather
  // than saying nothing. The adopt below then proceeds against whatever `refs/remotes/origin/`
  // this clone last saw, which is the fact an operator reading a stale adopt needs.
  try {
    await exec(["fetch", "origin", branch], { cwd: projectRoot });
  } catch (error) {
    reportDegrade(new Error(`origin could not be refreshed before adopting ${branch}, so the adopt used this clone's last-known refs/remotes/origin/${branch}: ${error?.message ?? error}`), { path: projectRoot });
  }
  const result = await exec(["branch", branch, `refs/remotes/origin/${branch}`], { cwd: projectRoot });
  return result.status === 0;
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

async function advanceBranchToBase(worktreePath, commit, options = {}) {
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
    : mergeMessage({ branch, base });
  const merged = await run([...identityArgs(options.node), "merge", "--no-ff", "--no-edit", "-m", message, base]);
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

// listWorktrees(projectRoot, options) — `git worktree list --porcelain`, parsed into
// [{ path, head, branch, detached, locked, prunable }]. Used by the retention sweep +
// the "no stale prunable metadata" assertion (task 03).
async function listWorktrees(projectRoot, options = {}) {
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


  return { headCommit, ensureCommitAvailable, localBranchExists, remoteBranchExists, adoptRemoteBranch, runWorktreeAdd, advanceBranchToBase, listWorktrees };
}
