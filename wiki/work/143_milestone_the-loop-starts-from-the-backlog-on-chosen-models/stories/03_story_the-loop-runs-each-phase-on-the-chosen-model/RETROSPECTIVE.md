---
doc: retrospective
updated: 2026-10-03
---
# 03 · The loop runs each phase on the chosen model — Retrospective

## R1 — the build brief told a branch worktree to install the live payload

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** the orchestrating session
- **Raised by:** the developer, at build

**What happened.** The brief's last step was `node scripts/install-local.mjs`. Run from the `aof-143`
branch worktree, that would have replaced the payload the operator's daemons run (built from 134's
checkout) with an unmerged branch. The step was skipped, and the CLI was checked through the
worktree's own `packages/core/bin/aof.mjs`.

**Why.** The brief was written as if the build checkout and the deploy checkout were the same.

**Lesson.** A build brief for a branch worktree checks the CLI through that worktree's own bin and
never installs. The live payload is installed from the main checkout, after merge.

## R2 — three rows are proven in pieces, not end to end

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** QA
- **Raised by:** the independent reviewer

**What happened.** Task 01's wave-lane row and task 02's resumed-refine and supervisor-relaunch rows
are evidenced by a source match plus `sessionLendFor` and the resume rule. No case drives a loop
through those seams and observes the spawned session's model. The reviewer traced each end to end.

**Why.** The loop fixtures can drive a wave and a resume, but not cheaply with a session spawn
observed at the far side.

**Lesson.** When a contract row is about what a spawned session receives, the case observes the
spawn. A trace in review is evidence for accepting the row, but it does not protect it later.

**Refs:** F-143-03.
