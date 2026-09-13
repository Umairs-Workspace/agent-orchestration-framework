// THE CHANGED SET, READ FROM GIT THROUGH THE ONE BOUNDED SEAM — milestone 72 / story 01,
// ADR-002 §5. This is the story's SECOND deliverable, not a helper: ADR-002 prices it as new code
// because no reusable changed-files reader exists in `src/` to borrow.
//
// WHY IT IS A MODULE OF ITS OWN, beside `src/work/test-select.mjs` rather than inside it. The
// selector's control (FF-7202) censuses it for ROUTES TO THE GRAPH, and the contract's own row
// list ends with *"a child process of any kind"* — a row whose companion clause is *"with nothing
// planted no route is found"*. Those two can only both hold over a subject that starts no child.
// The selector therefore stays spawn-free and stays the censused subject; the git reader lives
// here, where the rule that governs it is ADR-001 §5's — one bounded seam, argument vector, no
// shell, deadline armed — rather than the graph-route census.
//
// WHY IT IS NEW CODE, measured rather than assumed: `src/build-info.mjs:53,60` uses `execFileSync`
// directly, `src/commands/ratchet.mjs` sits in the command layer and is unimportable upward (the
// layer gate), and `src/mesh/worktree.mjs` carries its own private exec. Three near-misses, no
// reusable surface.
//
// THE DEFAULT BASE IS THE WORKING TREE, AND NO DEFAULT BRANCH IS EVER INFERRED. A worktree on a
// story branch has no reliable answer for "what is my base", and a wrong base SILENTLY NARROWS the
// changed set — which is the one thing the selection invariant forbids. `--since <rev>` widens the
// base explicitly, and a revision that does not resolve is a REFUSAL naming it, never a widening
// and never an empty set.
import { runBounded } from "../work-audit/spawn.mjs";
import { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SINCE_REV_UNRESOLVABLE } from "./test-select.mjs";

// The version-control program. Not a project-declared runner and not one of the five names
// FF-7201 freezes: git is a precondition of the repository this reads, not a toolchain choice the
// project gets to make.
const VCS = "git";

// A bound of its own. Reading a changed set is a sub-second operation on any tree an inner loop
// runs in; a minute is a generous ceiling and the point of naming it is that there is no unbounded
// call, ever.
export const CHANGED_SET_DEADLINE_MS = 60_000;

const refusal = (code, message, detail = null) => Object.freeze({ ok: false, code, message, detail });

// `status --porcelain` in its v1 short format. Each line is `XY <path>`, where a rename carries
// `R  old -> new` and an untracked file carries `?? path`. Untracked files are INCLUDED — a file
// created this turn is the second-most-common inner-loop action there is, and the selection's
// whole invariant is that an unknown widens rather than disappears.
export function parsePorcelain(text) {
  const files = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (line.length < 4) continue;
    const payload = line.slice(3);
    // A rename reports both ends; the NEW path is the one on disk now, and the OLD one is a
    // deletion the graph will not resolve either — both are changed, and both are handed on.
    const arrow = payload.indexOf(" -> ");
    if (arrow >= 0) {
      files.push(unquote(payload.slice(0, arrow)), unquote(payload.slice(arrow + 4)));
      continue;
    }
    files.push(unquote(payload));
  }
  return files;
}

// git quotes a path containing unusual bytes and wraps it in double quotes. The quoting is C-style
// and the only escapes an ordinary repo path produces are `\"` and `\\`.
function unquote(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed.replaceAll("\\", "/");
  return trimmed.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\").replaceAll("\\", "/");
}

export function parseNameOnly(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => unquote(line))
    .filter((line) => line.length > 0);
}

// One bounded child, through the shared seam. `launch` is injected so every row of the contract
// drives without a repository, and the real two-commit fixture drives the same code path.
async function git(args, { cwd, launch, deadlineMs }) {
  return await launch({ command: VCS, args, cwd, deadlineMs });
}

// THE CHANGED SET. Returns `{ ok: true, changed, base }` or a coded refusal.
//
//   since — null for the working tree (index + working tree), or a revision to widen the base to.
//
// The three refusals are the module's whole error vocabulary and all three exist for one reason:
// an answer that selected nothing must never be mistaken for an answer that found nothing
// affected. They are kept APART because they are three different repairs — name a revision that
// exists, make a change, or find out why git could not answer.
export async function changedFiles({ projectRoot, since = null, launch = runBounded, deadlineMs = CHANGED_SET_DEADLINE_MS } = {}) {
  const options = { cwd: projectRoot, launch, deadlineMs };

  if (since != null) {
    // ONLY GIT CAN SAY A REVISION DOES NOT RESOLVE, so the check is itself a child and cannot
    // precede "any spawn" — the honest ordering is that it precedes the RUNNER.
    const verified = await git(["rev-parse", "--verify", `${since}^{commit}`], options);
    if (verified.outcome !== "exited" || verified.exitCode !== 0) {
      return refusal(
        SINCE_REV_UNRESOLVABLE,
        `the revision ${JSON.stringify(since)} does not resolve in this repository, so there is no base to compare against. This is a refusal rather than a widening: the four widening reasons are aof failing to KNOW something about the tree, and this is a revision that does not exist.`,
        verified.stderr?.trim() || verified.error || null,
      );
    }
  }

  const status = await git(["status", "--porcelain"], options);
  if (status.outcome !== "exited" || status.exitCode !== 0) {
    return refusal(
      CHANGED_SET_UNREADABLE,
      `the working tree could not be read (${status.attempted}), so the changed set is unknown — and an unknown changed set is not an empty one.`,
      status.stderr?.trim() || status.error || null,
    );
  }

  const files = new Set(parsePorcelain(status.stdout));

  if (since != null) {
    const diff = await git(["diff", "--name-only", since], options);
    if (diff.outcome !== "exited" || diff.exitCode !== 0) {
      return refusal(
        CHANGED_SET_UNREADABLE,
        `the changes since ${JSON.stringify(since)} could not be read (${diff.attempted}), so the changed set is unknown — the revision resolved, so this is git failing to answer rather than a base that does not exist.`,
        diff.stderr?.trim() || diff.error || null,
      );
    }
    for (const file of parseNameOnly(diff.stdout)) files.add(file);
  }

  const changed = [...files].sort();
  if (changed.length === 0) {
    return refusal(
      CHANGED_SET_EMPTY,
      "nothing has changed, so there is nothing to select. A clean tree just after a commit is one of the commonest states an agent is in, and an empty changed set selects NOTHING — reporting that as a green run over zero tests is the silent narrowing this refuses.",
    );
  }

  return Object.freeze({ ok: true, changed: Object.freeze(changed), base: since });
}
