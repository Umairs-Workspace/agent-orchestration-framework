import path from "node:path";
import { readdir, stat, utimes } from "node:fs/promises";
import { RECORD_DOC_BY_TYPE } from "../identity.mjs";

// Application composition supplies the bounded launch and `addTree(projectRoot, tree, sha, { config })`:
// the execution package's one worktree add, which runs the toolchain's prepare step and throws a
// message naming what failed, the add or the prepare (38/ADR-006: one materialization implementation).
export function createBaseline({ runBounded, addTree }) {
// THE WORK'S BASE (210/ADR-006). A failing case is PRE-EXISTING when the same suite fails the same
// case on the work's base: the newest commit that added the working item's record doc, written at
// refine or framing before any of the item's code. HEAD is not the base, because once the story's
// code is committed HEAD holds the change being judged, and after a gate HEAD is the gated commit.
//
// The base runs in its own detached worktree under `<git common dir>/aof/baselines/<commit>`,
// added and prepared by the project's `work.worktree.prepare` through the execution package's
// worktree implementation, as every lane is, and the caller runs the failing suites there through the same `runTest`. So
// the base's result is an ordinary record, written by the one writer and answered from on the next
// round. When the base cannot be found, added or prepared, every failure is `unmeasured` with the
// reason: nothing is ever assumed pre-existing.

const VCS = "git";
const GIT_DEADLINE_MS = 120_000;
const BASELINE_DIR = Object.freeze(["aof", "baselines"]);
// The newest two baseline trees are kept: the work's base and the one before it.
const BASELINES_KEPT = 2;

const posix = (file) => String(file).replaceAll("\\", "/");

async function git(args, cwd, launch) {
  const out = await launch({ command: VCS, args, cwd, deadlineMs: GIT_DEADLINE_MS });
  return out.outcome === "exited" && out.exitCode === 0 ? { ok: true, stdout: String(out.stdout ?? "").trim() } : { ok: false, message: String(out.stderr ?? out.error ?? "").trim() || `git ${args[0]} did not answer` };
}

// The item's record doc, whose adding commit is the work's base: a task is its own feature file;
// every other item names its doc by type, from the identity leaf's one map (168/ADR-002).
function recordDocOf(item) {
  if (item.type === "task" || String(item.dir).endsWith(".feature")) return item.dir;
  const doc = RECORD_DOC_BY_TYPE[item.type];
  return doc == null ? null : path.join(item.dir, doc);
}

// WHICH COMMIT IS THE BASE. `working` is the story or task whose run is open; `root` the red a fix
// round follows, whose gate record names its milestone; `items` the stream, to find that milestone.
// Answers `{ sha, from }`, or `{ sha: null, reason }` when there is no base to measure against.
async function resolveBase({ projectRoot, working = null, root = null, items = [], launch = runBounded } = {}) {
  let item = working;
  if (item == null && root?.source === "gate" && root.item != null) item = items.find((entry) => entry.ref === root.item) ?? null;
  if (item != null) {
    const doc = recordDocOf(item);
    if (doc == null) return { sha: null, reason: `${item.ref} is a ${item.type}, which has no record doc to date its base from` };
    const added = await git(["log", "--diff-filter=A", "-1", "--format=%H", "--", doc], projectRoot, launch);
    if (!added.ok || added.stdout === "") return { sha: null, reason: `${posix(path.relative(projectRoot, doc))} has no commit that added it, so ${item.ref} has no base yet` };
    return { sha: added.stdout, from: `${item.ref}'s ${path.basename(doc)}` };
  }
  const status = await git(["status", "--porcelain"], projectRoot, launch);
  if (!status.ok) return { sha: null, reason: `the working tree could not be read: ${status.message}` };
  if (status.stdout === "") return { sha: null, reason: "baseline unmeasured: no item is running and the working tree is clean, so there is no base to compare against" };
  const head = await git(["rev-parse", "HEAD"], projectRoot, launch);
  return head.ok ? { sha: head.stdout, from: "HEAD" } : { sha: null, reason: `HEAD could not be read: ${head.message}` };
}

// The baseline trees' directory, under the clone's common git dir so every worktree shares it.
async function baselinesRoot(projectRoot, launch) {
  const common = await git(["rev-parse", "--path-format=absolute", "--git-common-dir"], projectRoot, launch);
  return common.ok ? path.join(common.stdout, ...BASELINE_DIR) : null;
}

const exists = async (file) => stat(file).then(() => true, () => false);

// A DETACHED, PREPARED TREE AT THE BASE. Reused when present, and touched so pruning keeps it.
// Answers `{ ok: true, path }`, or `{ ok: false, reason }` after removing a tree it could not prepare.
async function ensureTree({ projectRoot, sha, config = {}, launch = runBounded } = {}) {
  const root = await baselinesRoot(projectRoot, launch);
  if (root == null) return { ok: false, reason: "the clone's git dir could not be read" };
  const tree = path.join(root, sha);
  if (await exists(path.join(tree, ".git"))) {
    const now = new Date();
    await utimes(tree, now, now);
    return { ok: true, path: tree };
  }
  try {
    await addTree(projectRoot, tree, sha, { config, launch });
  } catch (error) {
    // A tree that was added but not prepared is removed through git, so a later add is not blocked.
    if (await exists(path.join(tree, ".git"))) await git(["worktree", "remove", "--force", tree], projectRoot, launch);
    return { ok: false, reason: String(error?.message ?? error) };
  }
  await prune({ projectRoot, root, launch });
  return { ok: true, path: tree };
}

// THE NEWEST TWO TREES ARE KEPT, by when they were last used; the rest are removed through git, so
// no stale worktree metadata blocks a later add.
async function prune({ projectRoot, root = null, launch = runBounded } = {}) {
  const dir = root ?? await baselinesRoot(projectRoot, launch);
  if (dir == null) return [];
  let names = [];
  try { names = (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name); }
  catch { return []; }
  const used = await Promise.all(names.map(async (name) => ({ name, at: (await stat(path.join(dir, name))).mtimeMs })));
  const stale = used.sort((a, b) => b.at - a.at).slice(BASELINES_KEPT);
  for (const { name } of stale) await git(["worktree", "remove", "--force", path.join(dir, name)], projectRoot, launch);
  return stale.map((entry) => entry.name);
}

// LABEL EACH FAILURE against the base. `rerun({ projectRoot, files, reason })` runs suites by name
// in a tree and answers `runTest`'s result. A suite the base does not hold is never pre-existing.
async function measure({ projectRoot, config = {}, failures = [], working = null, root = null, items = [], rerun, launch = runBounded } = {}) {
  const unmeasured = (reason, base = null) => ({
    failures: failures.map((failure) => ({ ...failure, preExisting: "unmeasured" })),
    baseline: { sha: base, reason },
  });
  const base = await resolveBase({ projectRoot, working, root, items, launch });
  if (base.sha == null) return unmeasured(base.reason);
  const tree = await ensureTree({ projectRoot, sha: base.sha, config, launch });
  if (!tree.ok) return unmeasured(tree.reason, base.sha);
  const suites = [];
  for (const file of new Set(failures.map((failure) => failure.file).filter(Boolean))) {
    if (await exists(path.join(tree.path, file))) suites.push(file);
  }
  const atBase = new Set();
  let answered = false;
  if (suites.length > 0) {
    const out = await rerun({ projectRoot: tree.path, files: suites.sort(), reason: `baseline: ${base.from} at ${base.sha.slice(0, 12)}` });
    if (out.refusal != null || out.report == null || out.report.ok === false) {
      return unmeasured(`the base's run did not answer: ${out.refusal?.message ?? out.runner?.message ?? "its report could not be read"}`, base.sha);
    }
    answered = out.reused != null;
    for (const failure of out.report.failures) atBase.add(`${failure.file ?? ""}\0${failure.case}`);
  }
  const failedAtBase = (failure) => atBase.has(`${failure.file}\0${failure.case}`) || atBase.has(`\0${failure.case}`);
  return {
    failures: failures.map((failure) => ({ ...failure, preExisting: failure.file != null && suites.includes(failure.file) && failedAtBase(failure) })),
    baseline: { sha: base.sha, from: base.from, answered },
  };
}

return { BASELINES_KEPT, BASELINE_DIR, ensureTree, measure, prune, resolveBase };
}
