---
type: story
doc: retrospective
number: 02
slug: a-live-session-proves-it
parent: 138
title: "Retrospective — a live session proves it"
created: 2026-09-27
updated: 2026-09-27
---
# 138/02 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — A recording names the environment it was drawn in

- **Kind:** defect · **Area:** verification · **Stage:** build · **Owner:** developer · **Raised by:** m138/F-01

**What happened.** 01's captures ran under Git Bash's `TERM=xterm-256color`. The first live drive ran
from a PowerShell with no `TERM`, where claude drew `>` for `❯`, so no registered screen could match.
The fix declares the PTY's terminal at launch, instead of inheriting the operator's.

**Lesson.** A launch declares every input that changes what the child draws. A recording states the
environment it was taken in, so the gap between the recording and the drive is visible before a live
leg finds it.

## R2 — A deploy path's first dependency is the first test of its reinstall branch

- **Kind:** defect · **Area:** deploy · **Stage:** build · **Owner:** developer · **Raised by:** m138/F-02

**What happened.** `deploy-wsl.sh` had only ever synced `src/`. `@xterm/headless` was the first
dependency it carried. It sent the manifest without the lock, stamped a failed `npm ci` as installed,
and `install-local` exited 0 over a node with no emulator.

**Lesson.** When a story adds a runtime dependency, read it back on every node, not only here: the
package's `package.json` at the node's own resolution, plus the install stamp.

## R3 — Live legs on a shared machine read their build at both ends, and state what the machine cannot give

- **Kind:** process · **Area:** verification · **Stage:** build · **Owner:** product-owner · **Raised by:** m138/F-04, m138/F-08

**What happened.** Another session reinstalled the payload 4 s before the real leg, which voided the
first attempt. And the contract's "`~/.claude.json` mtime unchanged" check cannot hold while any live
claude runs on the machine, because every claude rewrites the file.

**Lesson.** A live leg reads `aof --version` immediately before and after the leg. A contract names a
reading the machine can give; a check the environment confounds is recorded as confounded, never as
passed.
