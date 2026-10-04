---
type: story
number: 147
slug: the-loop-hands-a-halt-to-a-fresh-session-to-fix
doc: retrospective
created: 2026-10-04
updated: 2026-10-04
schema: 1
aofVersion: 0.1.0
---
# 147 · Retrospective

The hand-over held live on the first run: a real `/aof:repair` session fixed a provoked
`lane-merge-conflict`, and the loop resumed and closed by itself. All three lessons are about the
lanes that proved it, not the mechanism.

## R1 — A bundle member's count pins live in a `node:test` file the story runner cannot run

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer lane · **Raised by:** product owner at verify
- **What happened:** 147 added the `repair` command and updated every pin it found, but not
  `packages/core/test/bundle.suite.mjs`, which still pinned 29 commands and 37 resource members.
  That file belongs to the `aof` workspace's own runner. The story lane's `scripts/test.mjs --only`
  set also held two `node:test` files (`services.test.mjs`, `application.test.mjs`). The runner does
  not run those: it prints `not ok … exports no array of { name, run } entries` and exits 1, which
  reads like a harmless note beside 657 passing cases.
- **Why:** the `--only` runner loads registered arrays only. A package's native and suite tests run
  through `scripts/test-workspace.mjs <workspace>`, and nothing in the lane said so.
- **Lesson:** a story that adds or removes a bundle member, or lists a package's `node:test` file in
  `files:`, also runs `scripts/test-workspace.mjs <workspace>` for each package it touches. A
  `not ok … exports no array` line means that file never ran, not that it passed.
- **Refs:** VERIFICATION `F-147-01`.

## R2 — Overlapping `files:` serialize two lanes, so they can never conflict at merge home

- **Kind:** misunderstanding · **Area:** contract · **Stage:** verify · **Owner:** product owner · **Raised by:** product owner at verify
- **What happened:** task 04's fixture gave two stories the same `src/index.mjs` in `files:` to
  force a merge conflict. The wave held the second story behind the first, so its lane was cut after
  the first had merged, and no conflict could arise. The halt had to be provoked by a primary-side
  commit made after the second lane opened.
- **Why:** declared overlap is a partition input, so a conflict between two DECLARED stories is
  designed out. What still conflicts is what nobody declares: the shared `STATE.md` (now
  union-merged), or a commit in the primary under a live lane.
- **Lesson:** to provoke `lane-merge-conflict` live, move the primary's HEAD under an open lane at
  the lane's insertion point. Do not rely on two stories' declared files.
- **Refs:** VERIFICATION `## Verification evidence`, the "provoking the halt" row.

## R3 — `scripts/check.mjs` is the whole suite, not a story check

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer lane · **Raised by:** the build (STORY Notes, "Process")
- **What happened:** the build ran `scripts/check.mjs` as if it were a focused check. It runs the
  whole suite, and it was killed at 10 minutes under an isolated home.
- **Why:** the name reads like a lint or quick gate.
- **Lesson:** on this machine the story lane is `scripts/test.mjs --only <set>` plus R1's workspace
  runner. The whole tree runs through `yarn test:sharded` from a clean worktree, at a gate.
- **Refs:** STORY.md `## Notes`, the "Process (for retro)" line.
