---
doc: retrospective
updated: 2026-10-06
---
# 02 · The map is a document — Retrospective

## R1 — `--scope impacted` ran the whole suite

- **Kind:** near-miss (process) · **Area:** process (testing) · **Stage:** build · **Owner:** developer
- **Raised by:** the 02 build

**What happened.** `scripts/test.mjs` was in `files:` (the two index registrations), so
`--scope impacted --story 134/02` widened to every suite. It ran at the same time as another lane's
full run.

**Lesson.** A story that founds a test family touches the runner, so its build checks with an
`--only` set of its own suites, never `impacted`.

## R2 — the loop re-dispatched a story already in review

- **Kind:** mistake (defect) · **Area:** code (loop) · **Stage:** build · **Owner:** developer
- **Raised by:** loop cycle 3

**What happened.** Cycle 3 dispatched `continue` on 134/02 while it was `in-review`. The worktree's
own `aof work next 134 --through-review` did not offer it. Nothing was rebuilt, but a session was
spent.

**Lesson.** A wave should skip `in-review` items, as `next` does.
