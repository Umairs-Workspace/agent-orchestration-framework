---
aof-generated: true
description: Repair a halt the loop handed over — diagnose the cause named in the hand-over file, fix it (the loop's own records, or the story's code, tests or rubric), ask the operator when a decision or permission is theirs, and hand back so the loop resumes by itself.
argument-hint: "<halted ref> <hand-over file>"
aof-invocation: /aof:repair
aof-runtime: claude
---

<objective>
A loop (`aof work loop`) halted and, rather than stop for the operator, handed the halt to you. The
loop tries its best before it stops: your one job is to remove the cause so the loop, which is
waiting on this session's outcome, can resume on its own. Diagnose the named cause, fix it, prove it
is gone with the check the loop will apply, and end `done`. When the fix needs a decision or a
permission that is the operator's, ask (below) and carry on with the answer. A failed or
inconclusive proof is a handback, not an unbounded retry loop: you get one repair per halt.
</objective>

<input>
`$ARGUMENTS` is `<ref> <file>`: the halted ref (a story such as `03/03`, or a milestone when the
halt was the loop's own), and the path of the hand-over file the loop wrote under the aof home
(`loop-repairs/<runId>.json`).

**It reads the hand-over file named in its arguments, and the loop-diag log the file names.** The
file holds exactly these keys: `stop` (the halt's code), `producer` (which door produced it), `ref`,
`details` (the halt line's `Details:` text exactly as the loop printed it — lane, branch, base, tip,
files, verdict, codes, cases, exit, runner output, reason, error, whatever the producer carried),
`diagLog` (this invocation's loop-diag log path, or null), `lane` (the lane worktree's path, or
null), `branch`, `base`, `tip` (the lane's branch and the two commits its merge home was asked
between, or null) and `scope` (the loop's scope). Read the file first and in full; then read the
tail of `diagLog` when it is named — it records the loop's own exit reasons, every attempt's settle
line and the driver's stop bracket, which is where a halt that is not what its code says is
explained. The ref's run records (`aof work run-status <ref> --json`) hold each attempt's outcome and
`failureReason`.
</input>

<where>
**It works in the primary checkout, and in the story's lane worktree when the cause is there.** The
session is launched in the primary (the checkout the loop runs in). Merge-home and the lane reopen
act from the primary. A story driven in a wave is built in its lane,
`.aof/mesh/dispatch-worktrees/dispatch-<NN>-<SS>` (the hand-over's `lane` when it names one): its
code, its tests and its gates live there, and the loop brings the lane's branch home when it resumes.
So a fix to a story's code or tests is made IN THE LANE and committed on the lane's branch, never in
the primary. When no lane exists, the story was built in the primary.
</where>

<the_halts>
**The lane stops — the loop's own bookkeeping:**

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
  OPERATOR owns is not yours to commit — ask the operator what to do with it (see the rules). A
  `.git/index.lock` nobody holds is removed only after `git status` proves no git process is running.
- **`lane-open-failed`** (`work:dispatch:<code>`, `run-store:duplicate-run`, `lane:<code>`) — the
  lane could not be opened or brought to HEAD. `assignment-gate-propagation-dirty-worktree` means the
  lane worktree holds uncommitted changes: inspect them in the lane; a heartbeat queue
  (`runs/.heartbeats.ndjson`) or another per-node file is removed from the index and ignored, real
  work is committed on the lane's branch. `run-store:duplicate-run` means a `running` run record
  stands on the item (`aof work run-status <ref>`): a stale one is reclaimed by `aof work resume`
  or settled with `aof work run-complete <ref> --outcome failed`; a LIVE one (a session still
  heartbeating) is not yours — end the repair failed naming it. `at-capacity` means every lane slot is
  held (`aof work dispatch --list`); a stranded lane is swept with `aof work dispatch --sweep`.

**The story stops — the build, its gates and its grade:**

- **`grade-indeterminate`** (`work:grade:<code>`) — the rubric ran and its result could not be read
  as a verdict. `details` carries `verdict`, `codes`, `cases`, and on a non-zero exit `exit` and the
  runner's own output tail. `report-vacuous` with no failing case and a non-zero `exit` means the
  runner failed OUTSIDE any case — an unhandled error, a test module that did not load, a crashed
  sub-run — and the cause is in its output. `report-missing` / `report-unreadable` mean the declared
  report (`work.rubric.report`) was not written or not in its format; `runner-timeout` that the rubric
  outran its deadline; `runner-spawn-failed` that it never started. Reproduce in the lane:
  `aof work grade <ref> --run --json` (it prints the runner's detail), fix the cause — the story's
  code or tests, or the project's rubric script when the rubric itself is wrong — and re-grade.
- **`cap-exhausted`**, **`no-progress`**, **`progress-exhausted`** — the build was driven its
  allowed number of attempts or review rounds and the same findings kept coming back. `details`
  carries the findings (gate, code, case, message). Read them and the last attempt's transcript
  summary in the diag log; fix what they name in the lane, then prove it with the same gates.
- **`run-not-retryable`** — an attempt ended in a way a retry cannot cure. Read the run's
  `failureReason`: a story-code cause is fixed in the lane; an environment cause that is the
  operator's (a signed-out `claude`, a missing credential, a full disk) is asked about, never
  worked around.
- **`dependency-blocked`** — the next item depends on one that is not `done`. Check the dependency at
  the source (`aof work status <dep>`): a dependency that is in fact delivered but whose record lags
  is the operator's to accept — ask; never mark another item done yourself.
- **`unmapped-item-type`** — the item's type has no driven phase. Read the record doc; a misspelled
  `type:` is fixed, anything else is asked.
</the_halts>

<asking>
**When the fix needs the operator, ask — one question per ask, through `AskUserQuestion`.** The
loop posts it, notifies the operator and waits; the answer is typed into this session and you carry
on. Ask before: changing the project's rubric, test configuration or CI; touching a file the
operator owns (dirty in the primary and not the loop's own write); deleting anything you did not
create; anything the rules below do not already allow. Put on the question's first line what the
halt is and what you need decided, then `Decision needed:`, `Options:`, `I would pick:` and
`What the answer changes:`, under 1,500 characters, with the options also given as the tool's
options. Do not ask what you can find out: read, run and measure first.
</asking>

<rules>
These rules are what let an unattended repair run without doing harm. Each is absolute.

- **It never discards a commit: no `reset --hard`, `rebase`, `push --force`, `branch -f`,
  `checkout -B`.** Nor `update-ref`, nor a `git worktree remove --force` of a lane holding
  uncommitted work. Every lane commit and every primary commit is preserved; a merge is `--no-ff`
  and resolved by hand, never squashed or rewritten.
- **It never commits, stashes or discards the operator's uncommitted changes in the primary without
  asking.** The loop's own writes live under `wiki/work/<milestone dir>/` (record docs, run records)
  and may be committed; anything else that is dirty in the primary is the operator's desk. When the
  cause is such a path, ask what to do with it; an unanswered question ends the repair failed,
  naming the paths.
- **It never edits a delivered `.feature`.** A task's contract is locked; a merge that conflicts in
  one is resolved keeping the delivered text, never by rewriting a scenario, and a failing scenario
  is fixed in the code or its step definitions, never by weakening the contract.
- **It never runs `aof work loop`; the loop resumes itself.** The loop that handed you this halt is
  waiting on this session's outcome and re-enters its body with `--resume` the moment you end
  `done`. Starting another loop would run two over one scope. Likewise never `aof work drive`.
- **It fixes the cause, and only the cause.** No refactors, no unrelated fixes, no record edits
  beyond what the cause needs. A problem you notice that is not the cause is reported in your
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
  `running` run stands on the item unless a live session owns it;
- a story stop — in the tree the story is built in, `aof work validate <ref>` and
  `aof work doctor <ref>` are clean and `aof work grade <ref> --run --json` answers `pass` (or, for a
  grade the baseline excuses, no failing case beyond the inherited ones); your fix is committed on
  the lane's branch, and `git status --porcelain` in the lane is empty;
- a dependency or type stop — the record now reads as the loop needs it.

A repair you cannot verify is not `done`.
</verify>

<output>
**It ends by stating the cause it found and what it changed, or why it could not repair.** Three or
four sentences, as the last thing you say: the stop and ref, the cause (the actual file or record,
not the code's name for it), each change you made (commits by sha, files by path) and each answer
the operator gave, and the check that proves the cause is gone — or, when you could not repair,
exactly what stands in the way and whose it is. Then end the session. The loop reads your outcome:
`done` resumes it, anything else stops it for the operator with your run named in its halt line.
</output>
