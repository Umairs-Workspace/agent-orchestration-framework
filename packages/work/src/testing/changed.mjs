
// Application composition supplies the bounded launch.
export function createChangedFilesReader({ runBounded }) {
// THE CHANGED SET, READ FROM GIT THROUGH THE ONE BOUNDED SEAM — milestone 72 / story 01, trimmed by
// 210/ADR-003 to its one remaining producer: the working tree against HEAD, untracked files
// included, which is what `aof test --suggest` hands the importer scan; and, for a fix round, the
// difference between two content keys (below). `--since` and `--commit` went with the selector they
// fed (210/ADR-008).
//
// AN EMPTY SET IS AN ANSWER, NOT A REFUSAL. The selector refused it because a narrowed run over
// nothing read as a green run over zero tests. A suggestion over nothing runs nothing either way,
// so "nothing has changed" is simply said. Only a tree git could not read is refused: an unknown
// changed set is not an empty one.

// The version-control program. Not a project-declared runner and not one of the five names
// FF-7201 freezes: git is a precondition of the repository this reads, not a toolchain choice the
// project gets to make.
const VCS = "git";

// A bound of its own. Reading a changed set is a sub-second operation on any tree an inner loop
// runs in; a minute is a generous ceiling and the point of naming it is that there is no unbounded
// call, ever.
const CHANGED_SET_DEADLINE_MS = 60_000;

const CHANGED_SET_UNREADABLE = "changed-set-unreadable";

const refusal = (code, message, detail = null) => Object.freeze({ ok: false, code, message, detail });

// `status --porcelain` in its v1 short format. Each line is `XY <path>`, where a rename carries
// `R  old -> new` and an untracked file carries `?? path`. Untracked files are INCLUDED — a file
// created this turn is the second-most-common inner-loop action there is.
function parsePorcelain(text) {
  const files = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (line.length < 4) continue;
    const payload = line.slice(3);
    // A rename reports both ends; both are changed, and both are handed on.
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

// THE CHANGED SET. Returns `{ ok: true, changed }` — possibly empty — or the one coded refusal.
// `launch` is injected so every row drives without a repository, and a real repository drives the
// same code path.
async function changedFiles({ projectRoot, launch = runBounded, deadlineMs = CHANGED_SET_DEADLINE_MS } = {}) {
  const status = await launch({ command: VCS, args: ["status", "--porcelain", "--untracked-files=all"], cwd: projectRoot, deadlineMs });
  if (status.outcome !== "exited" || status.exitCode !== 0) {
    return refusal(
      CHANGED_SET_UNREADABLE,
      `the working tree could not be read (${status.attempted}), so the changed set is unknown — and an unknown changed set is not an empty one.`,
      status.stderr?.trim() || status.error || null,
    );
  }
  return Object.freeze({ ok: true, changed: Object.freeze([...new Set(parsePorcelain(status.stdout))].sort()) });
}

// WHAT CHANGED BETWEEN TWO CONTENT KEYS (210/ADR-004). Both are git tree ids written by the record
// leaf, so one `git diff --name-only <tree> <tree>` answers what a fix round hands the importer
// scan. The same key is no change at all.
async function changedBetween({ projectRoot, from, to, launch = runBounded, deadlineMs = CHANGED_SET_DEADLINE_MS } = {}) {
  if (from === to) return Object.freeze({ ok: true, changed: Object.freeze([]) });
  const diff = await launch({ command: VCS, args: ["diff", "--name-only", from, to], cwd: projectRoot, deadlineMs });
  if (diff.outcome !== "exited" || diff.exitCode !== 0) {
    return refusal(
      CHANGED_SET_UNREADABLE,
      `what changed since the red run could not be read (${diff.attempted}), so the fix's reach is unknown — and an unknown reach is not an empty one.`,
      diff.stderr?.trim() || diff.error || null,
    );
  }
  const changed = String(diff.stdout).split(/\r?\n/u).map((line) => unquote(line)).filter((line) => line.length > 0);
  return Object.freeze({ ok: true, changed: Object.freeze([...new Set(changed)].sort()) });
}

return { CHANGED_SET_DEADLINE_MS, CHANGED_SET_UNREADABLE, changedBetween, changedFiles, parsePorcelain };
}
