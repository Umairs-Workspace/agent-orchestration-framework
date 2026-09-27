# 04 · The fix loop resumes the build — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A fix resumes the build session that wrote the code
When the loop's review gate produces a fix, the drive command resolves the session id recorded on that
particular build run and launches with `--resume <id>`. The two halves that existed separately — the
driver's `resumeSessionId` option and the run record's persisted `sessionId` — are joined.

### A resumed fix is handed the findings and the diff, not the tree
The compiled brief is attached only when no resume target resolved. A warm fix receives the review
findings and the change under review; the session it re-enters already holds the tree.

### The change under review is the build's delta, not the working tree
The diff handed to a fix is taken between the build's recorded baseline and the tree it produced, so
staged and unstaged work that predated the build is excluded while the build's own delta is retained.

### An unresolvable target degrades cold rather than refusing to run
A pruned transcript, an absent session id, a session id that is not a bare basename, and a run
recorded on another node all resolve to no target; the fix then runs as a cold spawn with a compiled
brief. A fix that cannot be warmed still runs.

### The cold fallback is a visible retry record, never a hidden second process
A positively unavailable target produces its own retry record rather than a second process inside one
attempt, and a resumed process that fails for a generic reason is not re-dressed as a cold one.

### A resume whose spend baseline cannot be established says so
When the resumed session's transcript cannot be snapshotted, the run reports
`resume-spend-baseline-unavailable` and the spend settle is skipped by name, rather than being stamped
from an unreliable baseline.

### The resume target is derived from the phase, never from a caller
A caller's `resumeSessionId` is stripped from the options before they reach the launch, and a fix
payload is admitted only on the `continue` phase. A `refine` or `verify` launch supplied with both a
raw resume id and a rich fix payload resumes neither.

### Node placement is decided by the loop, not by the executor
`admitResumeBuildRun` returns the build run only when it was recorded on the node now running; the
drive command receives either an admitted local run or null and makes no placement decision of its own.

### A review is never resumed, and a control enforces it
FF-7007 drives the real production commands rather than the resolver helper, so a helper that returns
null cannot stay green while a caller still forwards a build session into a review launch.

### Interruption preserves the pending fix
A fix interrupted after its review keeps its identity and its findings through the existing run
lineage, and the review-round cap survives repeated interruption and resume.

### Bookkeeping is unchanged by warmth
A resumed fix mints its run, attributes its session, settles its spend, and carries its attempt and
retry lineage exactly as a cold one does.

## Assumptions

- **The build run's `sessionId` is a persisted fact** — milestone 68's `recordSessionId` is what makes
  a target resolvable at all; this story records no id of its own.
- **A transcript file under the Claude projects directory is the resumability test** — a session whose
  `.jsonl` is absent is treated as pruned, and a session present but unusable to the runtime would
  still be attempted.
- **`--resume` behaves as the installed binary documents it** — verified present on `claude 2.1.233`
  at refine; nothing re-checks the flag at runtime.
- **The reviewer is deliberately cold** — the saving available from warming a reviewer with the
  builder's transcript is left on the table on purpose, and this story's control is what stops it
  being taken by accident.
- **`fix` is a sub-path of `continue`, not an ambient option** — any future phase wanting warmth must
  add itself to that derivation rather than passing an option.

## Gaps

### The saving is not measured anywhere
- **Status:** open
- **Discharge condition:** a fix run in this repo reports a cache ratio against a build run, so the
  before/after this story exists to produce is a number rather than an expectation.
70/02 delivers the reading and this story delivers the warmth; nothing has yet run a loop under both.
Every run record in this stream still reports `unmeasured`, so the "twelve of thirteen delta runs start
cold" figure has no measured successor.

**Still open after `m70/06`, and the distinction is the point.** 70/06 took the milestone's first
real measurement — a `continue` phase driven to `done` with a full `spend` envelope and a per-phase
ratio of 12.921 — but it took it in the `aof-test-repo` fixture, over a single act with `--cap 1`, so
no **fix** run was resumed against a **build** run and no run record in THIS repo carries a ratio.
The discharge condition above is unchanged and unmet: what this story needs is a measured fix-against-build
pair, which is a strictly stronger thing than the milestone-level `unmeasured` claim that 70/06 closed.

### The mesh worker's fix path is not warmed
- **Status:** open
- **Discharge condition:** the mesh assignment carries a phase, so the worker's fix launch can resolve
  a resume target the same way the drive command does.
The resume derivation lives on the phase-scoped drive caller. The mesh assignment is phase-less by
construction — the same boundary ADR-005 records for `--model`/`--effort` — so a fix executed by a
worker starts cold regardless of what its build run recorded.

### A resumable session on another node is discarded, not transferred
- **Status:** open
- **Discharge condition:** a build run recorded on another node either has its session made reachable,
  or the cold fallback records why it was cold so the loss is visible in the record.
`admitResumeBuildRun` returns null for a foreign node, which is correct and is also silent: the fix
runs cold with no statement that a warm target existed elsewhere.
