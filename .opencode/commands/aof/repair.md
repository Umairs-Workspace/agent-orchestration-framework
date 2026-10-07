---
description: Repair a lane halt the loop handed over — diagnose the cause named in the hand-over file, fix the loop's own records (a lane that would not merge home or would not reopen), and hand back so the loop resumes by itself. Never the story's code, never the loop.
---

<objective>
Repair is bounded to the handover's named cause: diagnose it, apply its local remedy and run
the named proof once. A failed or inconclusive proof is a handback, not an unbounded retry loop.
A loop (`aof work loop`) halted on one of its three LANE stops — `lane-open-failed`,
`lane-merge-refused` or `lane-merge-conflict` — and handed the halt to you. A lane halt is about the
loop's OWN bookkeeping (a dispatch worktree that will not merge home, or will not reopen), never about
the code a story built. Your one job is to remove that cause so the loop, which is waiting on this
session's outcome, can resume on its own. You end `done` only when the cause is gone.
</objective>

<input>
`$ARGUMENTS` is `<ref> <file>`: the halted ref (a story such as `03/03`, or a milestone when the
halt was the loop's own commit), and the path of the hand-over file the loop wrote under the aof home
(`loop-repairs/<runId>.json`).

**It reads the hand-over file named in its arguments, and the loop-diag log the file names.** The
file holds exactly these keys: `stop` (the halt's code), `producer` (which door produced it), `ref`,
`details` (the halt line's `Details:` text exactly as the loop printed it — lane, branch, base, tip,
files, reason, error, whatever the producer carried), `diagLog` (this invocation's loop-diag log
path, or null), `lane` (the lane worktree's path, or null when no lane exists), `branch`, `base`,
`tip` (the lane's branch and the two commits its merge home was asked between, or null) and `scope`
(the loop's scope). Read the file first and in full; then read the tail of `diagLog` when it is
named — it records the loop's own exit reasons and the driver's stop bracket, which is where a halt
that is not what its code says is explained.
</input>

<where>
**It works in the primary checkout, and in the lane worktree only when the file names one.** The
session is launched in the primary (the checkout the loop runs in). Merge-home and the lane reopen
both act from the primary, so that is where the cause usually lives. Enter the lane (`lane`) only
when the hand-over names one and the cause is inside it — a lane that holds uncommitted work, a lane
whose branch is behind. A lane may not exist at all (`lane: null`): then there is nothing to enter.
</where>

<the_three_halts>
- **`lane-merge-conflict`** (`dispatch:merge-home:conflict`) — the lane's branch (`branch`, at
  `tip`) could not be merged into the primary's HEAD from `base`; the merge was aborted and the
  primary is exactly as it was. Find what conflicts: `git merge-tree <base> HEAD <tip>`, or
  `git diff <base> <tip> -- <path>` against `git diff <base> HEAD -- <path>`. The common cause is
  two lanes appending to one milestone `STATE.md` — resolve by keeping BOTH sides. Merge the lane's
  branch into the primary by hand (`git merge --no-ff <branch>`), resolve every conflicted file keeping
  every lane commit's intent, and commit the merge under your own identity. The loop's resume reads a
  merged tip as "already an ancestor" and cleans the lane up itself.
- **`lane-merge-refused`** (`dispatch:merge-home:refused`, or `dispatch:commit-own-writes:<code>`) —
  the one merge verb refused before touching anything: `files` names the primary's dirty paths the
  lane also touched (`reason` may say `detached-head`, `branch-missing`, `commit-failed`,
  `gate-propagation-failed`). A detached primary is checked back out on its branch. A dirty path the
  OPERATOR owns is not yours to commit (see the rule below). A `.git/index.lock` nobody holds is
  removed only after `git status` proves no git process is running.
- **`lane-open-failed`** (`work:dispatch:<code>`, `run-store:duplicate-run`, `lane:<code>`) — the
  lane could not be opened or brought to HEAD. `assignment-gate-propagation-dirty-worktree` means the
  lane worktree holds uncommitted changes: inspect them in the lane; a heartbeat queue
  (`runs/.heartbeats.ndjson`) or another per-node file is removed from the index and ignored, real
  work is committed on the lane's branch. `run-store:duplicate-run` means a `running` run record
  stands on the item (`aof work run-status <ref>`): a stale one is reclaimed by `aof work resume`
  or settled with `aof work run-complete <ref> --outcome failed`; a LIVE one (a session still
  heartbeating) is not yours — end the repair failed naming it. `at-capacity` means every lane slot is
  held (`aof work dispatch --list`); a stranded lane is swept with `aof work dispatch --sweep`.
</the_three_halts>

<rules>
These rules are what let an unattended repair run without doing harm. Each is absolute.

- **It never discards a commit: no `reset --hard`, `rebase`, `push --force`, `branch -f`,
  `checkout -B`.** Nor `update-ref`, nor a `git worktree remove --force` of a lane holding
  uncommitted work. Every lane commit and every primary commit is preserved; a merge is `--no-ff`
  and resolved by hand, never squashed or rewritten.
- **It never commits, stashes or discards the operator's uncommitted changes in the primary; a
  cause that is the operator's own work ends the repair failed, naming the paths.** The loop's own
  writes live under `wiki/work/<milestone dir>/` (record docs, run records) and may be committed;
  anything else that is dirty in the primary is the operator's desk. If the merge is refused because
  of such a path, you do not touch it — you end failed and say which paths, so the operator decides.
- **It never edits a delivered `.feature`.** A task's contract is locked; a merge that conflicts in
  one is resolved keeping the delivered text, never by rewriting a scenario.
- **It never runs `aof work loop`; the loop resumes itself.** The loop that handed you this halt is
  waiting on this session's outcome and re-enters its body with `--resume` the moment you end
  `done`. Starting another loop would run two over one scope. Likewise never `aof work drive`.
- **It changes nothing the halt did not cause.** No fixes to story code, no refactors, no record
  edits beyond what the cause needs. A problem you notice that is not the cause is reported in your
  closing statement and left alone.
</rules>

<verify>
Before you end `done`, prove the cause is gone the way the loop will test it:

- a merge conflict — `git merge-base --is-ancestor <tip> HEAD` exits 0 (the lane's tip is now an
  ancestor of the primary's HEAD), `git status --porcelain` in the primary shows nothing new of yours,
  and no `.git/MERGE_HEAD` remains;
- a refused merge — the named `files` are no longer both dirty in the primary and touched by the
  lane, or the primary is back on its branch;
- a lane that would not open — `git status --porcelain` in the lane is empty and the lane's branch
  carries whatever work it held; `aof work dispatch --list --json` shows it as a clean lane; no
  `running` run stands on the item unless a live session owns it.

A repair you cannot verify is not `done`.
</verify>

<output>
**It ends by stating the cause it found and what it changed, or why it could not repair.** Three or
four sentences, as the last thing you say: the stop and ref, the cause (the actual file or record,
not the code's name for it), each change you made (commits by sha, files by path), and the check
that proves the cause is gone — or, when you could not repair, exactly what stands in the way and
whose it is. Then end the session. The loop reads your outcome: `done` resumes it, anything else
stops it for the operator with your run named in its halt line.
</output>
