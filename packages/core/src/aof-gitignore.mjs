// The aof workspace `.gitignore` baseline (milestone 04 round-trip finding F-02).
//
// `aof work init` and the local memory backend both need the project's `.aof/`
// to git-ignore the DERIVED, regenerable artifacts (the memory index) while the
// tracked install (the lock, config, rendered members) stays committed. The
// round-trip proof surfaced that init established no such baseline and that the
// memory backend relied on amending the REPO-ROOT `.gitignore`.
//
// PO decision (F-02): do NOT touch / rely on the repo-root `.gitignore`. Write a
// SELF-CONTAINED nested `.gitignore` inside `.aof/`. A nested ignore file is
// applied by git relative to its own directory, so the entry `aof.memory.index.json`
// ignores `.aof/aof.memory.index.json`. This module is the single owner of that
// baseline; both init and the memory backend call it.
//
// 147/03 — the SAME idiom now covers the work dir too (`ensureWorkDirGitFiles`): a nested
// `<work.dir>/.gitignore` for the heartbeat queues a session writes beside its run records, and a
// nested `<work.dir>/.gitattributes` so two lanes' build notes in one milestone `STATE.md` merge by
// union. One additive writer (`ensureEntries`) serves every file this module owns.
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, appendFile, writeFile, mkdir } from "node:fs/promises";
import { workspacePaths } from "./workspace.mjs";

// Paths (relative to `.aof/`) the workspace must never commit — derived/regenerable
// artifacts a committed copy of which would be a duplicate authoritative source.
// Both memory backends keep their derived record store here: the local backend's
// `aof.memory.index.json` (05/ADR-005) and the graphify backend's
// `aof.memory.graphify.index.json` (10/ADR-005) — each rebuilt from the `.md` stream,
// never an authoritative second copy, so each is git-ignored by this baseline. The
// Notion work-board sync's identity sidecar `notion.work-map.json` (17/ADR-001) joins
// them: a derived, aof-owned mapping of aof ref → Notion page id, rebuildable by a
// re-sync, never a committed authoritative source — so it is git-ignored here too.
// m43 / ADR-013/C4 — the artifact-sync QUEUE and its consumed `.batch` sibling join
// them, and for the same reason: per-node runtime state, derived, regenerable, never an
// authoritative copy. It is written into EVERY worktree an agent runs in, so leaving it
// untracked-but-not-ignored would (a) show in every `git status` an agent or an operator
// reads mid-run and (b) make every worktree permanently DIRTY — which is precisely the
// input ADR-008 (43/05) refuses gate propagation on. Story 05 would otherwise inherit a
// defect this story created, three stories from its cause.
export const AOF_GITIGNORE_ENTRIES = [
  "aof.memory.index.json",
  "aof.memory.graphify.index.json",
  "notion.work-map.json",
  "artifact-sync-queue.ndjson",
  "artifact-sync-queue.ndjson.batch",
];

const HEADER = "# aof — derived/regenerable artifacts; never commit (the tracked install is committed).\n";

// ensureEntries(filePath, entries, header) — THE ONE ADDITIVE WRITER. Idempotent: preserves every
// existing line, never duplicates an entry (matched trimmed, whole-line), creates the file with
// `header` when absent, appends the missing entries when present, and never touches a file that
// already holds every entry. Returns true iff the file was created or changed.
async function ensureEntries(filePath, entries, header) {
  const had = existsSync(filePath);
  const existing = had ? await readFile(filePath, "utf8") : "";

  const present = new Set(existing.split(/\r?\n/).map((line) => line.trim()));
  const missing = entries.filter((entry) => !present.has(entry));
  if (missing.length === 0) return false;

  if (!had) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${header}${missing.join("\n")}\n`, "utf8");
    return true;
  }
  const needsNewline = existing.length > 0 && !existing.endsWith("\n");
  await appendFile(filePath, `${needsNewline ? "\n" : ""}${missing.join("\n")}\n`, "utf8");
  return true;
}

// Idempotently ensure `<targetDir>/.aof/.gitignore` ignores every entry. Additive
// (preserves any existing lines, e.g. an assistant-workspace `/work/`), never
// duplicates an entry, and never touches the repo-root `.gitignore`. Returns true
// iff the file was created or changed.
export async function ensureAofGitignore(targetDir, entries = AOF_GITIGNORE_ENTRIES) {
  const { workspaceDir } = workspacePaths(targetDir);
  return ensureEntries(path.join(workspaceDir, ".gitignore"), entries, HEADER);
}

// --------------------------------------------------- graphify-out (10/ADR-005) --

// The graphify backend's derived graph artifact lands at `<projectRoot>/graphify-out/`
// (where `graph:build` writes it, src/graphify.mjs `--out <projectRoot>`) — OUTSIDE
// `.aof/`, so the nested `.aof/.gitignore` baseline above cannot cover it. A committed
// graph would be an authoritative second copy (05/ADR-001 / 10/ADR-005 violation): the
// graph is a pure ranking layer, derived and disposable, holding no fact the records do
// not. We apply the SAME self-contained nested-ignore idiom as F-02 (never touch the
// repo-root `.gitignore`): write `<projectRoot>/graphify-out/.gitignore` whose `*`
// ignores everything in the directory (git applies a nested ignore relative to its own
// directory) while `!.gitignore` keeps the ignore file itself out of the ignore set —
// so the discipline is self-documenting in the tree. Idempotent; returns true iff
// created/changed.
export const GRAPHIFY_OUT_DIR = "graphify-out";
export const GRAPHIFY_OUT_GITIGNORE = ["*", "!.gitignore"];

const GRAPHIFY_OUT_HEADER =
  "# aof — graphify's derived graph (10/ADR-005); never commit (rebuilt from the .md stream).\n";

export async function ensureGraphifyOutGitignore(projectRoot, entries = GRAPHIFY_OUT_GITIGNORE) {
  return ensureEntries(path.join(projectRoot, GRAPHIFY_OUT_DIR, ".gitignore"), entries, GRAPHIFY_OUT_HEADER);
}

// ------------------------------------------------------ the work dir (147/03) --

// THE HEARTBEAT QUEUES ARE PER-NODE RUNTIME STATE. A session's PostToolUse hook appends to
// `<item>/runs/.heartbeats.ndjson` (consumed into `.batch`) for as long as the session runs, so a
// lane's whole-tree commit at its close captured a live queue — and the committed path then refused
// the lane's reopen (`assignment-gate-propagation-dirty-worktree`). A nested `<work.dir>/.gitignore`
// keeps every queue under the work dir untracked, in every worktree, by the F-02 idiom; the one
// commit verb (`@aof/mesh` `commitWorktreeChanges`) spells the same two names as pathspecs, so a
// queue an earlier commit tracked is also removed from the index. The two spellings are held equal
// by 147/03's suite.
export const WORK_DIR_GITIGNORE_ENTRIES = [
  "**/runs/.heartbeats.ndjson",
  "**/runs/.heartbeats.ndjson.batch",
];

// STATE.md MERGES BY UNION (129/ADR-002 §5), in the WORK DIR's own attributes file. Every lane in a
// wave appends its build notes to the one milestone `STATE.md`, so two lanes at one base conflict
// at merge-home — the second of the two halts that motivated 147. A nested `.gitattributes` applies
// relative to its own directory, so the bare pattern reaches every `STATE.md` under the work dir
// and nothing beside it; a `STATE.md`'s frontmatter is `doc: state` alone, so union cannot
// duplicate a key. Nothing else gets union (`TECH_DEBT.md`, `VERIFICATION.md` keep their conflicts).
export const WORK_DIR_GITATTRIBUTES_ENTRIES = [
  "STATE.md merge=union",
];

const WORK_DIR_GITIGNORE_HEADER =
  "# aof — per-node runtime state a session writes beside its run records; never commit (147/03).\n";
const WORK_DIR_GITATTRIBUTES_HEADER =
  "# aof — lane build notes append to one STATE.md; a merge keeps both sides (129/ADR-002 §5, 147/03).\n";

// workDirFor(targetDir, config) — the work dir init and update ensure the files in: the config's
// `work.dir` resolved against the target, with `loadWorkspace`'s own default (`./wiki/work`), so the
// two installers share one resolution rather than each spelling the default (147 review).
export function workDirFor(targetDir, config) {
  return path.resolve(targetDir, config?.work?.dir ?? "./wiki/work");
}

// ensureWorkDirGitFiles(workDir) — idempotently ensure `<workDir>/.gitignore` holds the queue
// entries and `<workDir>/.gitattributes` the union line, each additively, neither rewritten when
// it already holds its entries. `workDir` is the ABSOLUTE work dir (the config's `work.dir`,
// resolved by the caller). Returns `{ gitignore, gitattributes }`, each true iff created/changed.
export async function ensureWorkDirGitFiles(workDir) {
  const gitignore = await ensureEntries(path.join(workDir, ".gitignore"), WORK_DIR_GITIGNORE_ENTRIES, WORK_DIR_GITIGNORE_HEADER);
  const gitattributes = await ensureEntries(path.join(workDir, ".gitattributes"), WORK_DIR_GITATTRIBUTES_ENTRIES, WORK_DIR_GITATTRIBUTES_HEADER);
  return { gitignore, gitattributes };
}
