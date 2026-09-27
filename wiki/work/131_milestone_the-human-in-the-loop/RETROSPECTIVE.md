---
type: milestone
doc: retrospective
number: 131
slug: the-human-in-the-loop
title: "Retrospective — the human in the loop"
created: 2026-09-27
updated: 2026-09-27
---
# 131 · Retrospective

Milestone-level lessons. Story lessons live in each story's own RETROSPECTIVE.md; findings live in
VERIFICATION.md and are referenced, never restated.

## R1 — The sign-off cost more than the build, because the runner is serial and blind

- **Kind:** blocker · **Area:** testing · **Stage:** verify · **Owner:** architect · **Raised by:** the operator ("It shouldn't take an hour or more to run tests… half a day to sign off")

Eight whole-tree gate rows over two days: twelve real reds on the first, then one load flake per
run, a host sleep, and three runs killed at their deadline with no verdict. `scripts/test.mjs` runs
11,228 cases one at a time on a 22-core machine and recorded no timing. A 16-shard profile showed the
whole tree in 13.8 minutes of wall time, with 254 cases (2%) holding over half the time. 131 was
accepted on a recorded `--gate-override`.

**Lesson.** A whole-tree gate that cannot finish inside its bound on the machine it runs on is a
defect of the runner, and it is fixed before the next milestone relies on it: sharded workers with
one isolated home each, per-case timing, and the slow tail trimmed. Pre-scan the known classes of
gate red before launching (memory `full-suite-eaddrinuse-focused-runs`), never the gate itself.

**Refs:** REGRESSION.md, memory `test-runner-serial-no-timing`.

## R2 — Scope grew in the middle of verify, and each growth was right

- **Kind:** process · **Area:** planning · **Stage:** verify · **Owner:** product-owner · **Raised by:** the operator

The bot (09–12) arrived after the first accepts. `messaging test`, `--allow` and the project name
(13) came from the first live setup, and one channel for every project (14) came from the live run.
Each was small, governed by its own story, and each removed a real friction the operator hit.

**Lesson.** A milestone that ends in a live run should expect its operator to find missing setup
verbs and UX. Budget a small "what the live run asks for" story rather than treating it as scope creep.

**Refs:** stories 13, 14; 07's retrospective.
