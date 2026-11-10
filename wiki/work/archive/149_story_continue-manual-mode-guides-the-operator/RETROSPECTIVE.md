---
type: story
doc: retrospective
number: 149
slug: continue-manual-mode-guides-the-operator
title: "Retrospective — manual mode: continue guides the operator"
created: 2026-10-05
updated: 2026-10-06
---
# 149 · Retrospective

Story-level lessons. Findings are referenced, never restated (`VERIFICATION.md`). The STATE
`## Feedback (for retro)` notes they come from are archived below.

## R1 — The live-store rung can mint a run for someone else's session

- **Kind:** blocker · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** product-owner

**What happened.** Refine's `run-start` took a concurrent session's prompt inside its 120 s window and
attributed the run to that session. The example-map doctor then read the wrong transcript and called
every stated answer unanchored. The run was failed as `session-misattributed` and re-minted with
`--session <id>`.

**Lesson.** When other sessions are live on the same checkout, mint with `--session <id>` and never rely
on the live-store rung. A doctor result that calls every anchor missing points to a misattributed run,
not to missing answers.

**Refs:** `runs/node-7297/20261004T171320398Z-0000.json`

## R2 — A suite's case count is pinned elsewhere, so the write set reaches the pin

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer

**What happened.** Six of 149's suites gained rows. The 142 test ledger
(`archive/142_…/plans/09-test-ledger.json`) pins every suite's case count and name hash, so the build
had to re-pin it outside the declared `files:`. 150 hit the same wall, and the re-pin also absorbed
five suites that 147 grew without re-pinning. The learning-edge control (FF-12405 leg 7) also wanted
147's `repair.md` classified.

**Lesson.** A story that adds cases to an existing suite declares the 142 test ledger in `files:` at
refine. Two stories on one branch that both grow suites re-pin once, in the later story, and say so.

## R3 — A command that closes runs reads the run reactor first

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** developer

**What happened.** `reads:` lacked `packages/work/src/effects.mjs`. Its `run.completed` reactor rolls a
`failed` story back to `not-started`, so a review that closed its run `failed` would have undone the
operator's started story. The build found it and closes every review run `done`.

**Lesson.** A new command that mints or closes a run lists the run reactor in `reads:`. The outcome it
writes has to agree with the status it means to leave behind.

## R4 — A stacked branch puts other items' reds in every story's sweep

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** developer

**What happened.** 149 was built uncommitted on 147's branch, which also carries 150's commits, while
148's in-flight records sat untracked in the same tree. The review and verify importer sweeps were both
red on three controls that 149's diff never touches. Each one had to be re-run and attributed by hand
before it could be set aside (F-03).

**Lesson.** Build a story on its own branch off `main`, in a sibling worktree when the checkout is
shared. Otherwise every sweep starts with an attribution exercise, and a real red of the story's own
can hide among the inherited ones.

**Refs:** VERIFICATION `F-03`

## R5 — A real repository finds what the fixture tree cannot

- **Kind:** near-miss · **Area:** process (verification) · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner

**What happened.** Task 04's walk ran in the test-bed, which declares no `work.test` runner and does
not ignore `graphify-out/`. In both sessions `aof test --scope impacted` refused, and the prompts fell
back to the project's own runner as they should. The review's graph build left 260 untracked files
that no suite in this repository can see, because this repository ignores the directory (F-01).

**Lesson.** A `@manual` walk in a repository other than aof's own is the proof that matters for
prompts that shell out. Snapshot `git status` with content hashes before and after each command, since
a dirty tree hides a delta that a plain status read would miss. Contracts that say "red is what
`aof test` reports" also name the answer for a project that declares no runner.

**Refs:** VERIFICATION `F-01`

## Archived — STATE `## Feedback (for retro)` (graduated into R1–R4)

- refine: run-start's live-store rung misattributed a concurrent session (R1)
- build: the declared write set missed the 142 test ledger and 147's learning-edge row (R2)
- build: `reads:` lacked `packages/work/src/effects.mjs` (R3)
- review: the importer sweep was red on three controls outside the diff (R4)
