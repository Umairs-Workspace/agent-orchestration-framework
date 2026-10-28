---
doc: retrospective
promotionFrom: 1
---
# 01 · Every conversation in one panel — retrospective

## R1 · Retiring a module owed every suite that reads its source

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** Removing `note-threads.mjs` and the note bar broke two 171/00 cases in
`canvas-anchor.suite.mjs` that read the retired bar's source, and two budget rows that named the
removed modules. Neither file was in `files:`.

**Why:** Refine declared the suites that test the retired module, not the suites and budget rows that
read its source text.

**Lesson:** A story that retires a module greps the tests and the budget table for its file name and
exports at refine, and declares every hit.

**Refs:** STATE `## Feedback (for retro)` (172/01 close).

## R2 · The smoke's dock fake had been stale since 171's verify

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** After F-171-01's byte gate the dock waited for claude's TUI to say it was ready,
but the smoke's fake socket never sent output, so the dock typed nothing and the two dock checks
could not pass. The fake now sends paste mode on and a drawn banner, as claude does.

**Why:** F-171-01 changed what the dock waits for, and the fake that stands in for claude was not
changed with it.

**Lesson:** When a fix changes what a client waits for from a real process, change every stand-in
for that process in the same commit, and run the smoke that uses it.

**Refs:** m171 VERIFICATION `@finding-F-171-01`; STATE `## Feedback (for retro)` (172/01 close).
