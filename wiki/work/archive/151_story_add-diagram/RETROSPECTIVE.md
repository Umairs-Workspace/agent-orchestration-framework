---
type: story
number: 151
slug: add-diagram
doc: retrospective
created: 2026-10-05
updated: 2026-10-05
schema: 1
aofVersion: 0.1.0
---
# 151 · Retrospective

The command did what it promised live: an undrawn brief and a named, unbriefed ADR were both drawn,
exported and pasted, and a third run drew nothing. The lessons are about the write set refine
declared, and about the one step aof does not perform for the session.

## R1 — The declared write set missed a census, the test ledger and a directory budget (recurs m150/R1)

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** aof-continue (build)
- **What happened:** `files:` named four command censuses. The build met a fifth, the
  `bundle/descriptor` resource-member count in `bundle.suite.mjs`. It also touched two files outside
  the set: the 142 test ledger (`archive/142_.../plans/09-test-ledger.json`: case count, names hash
  and registry total) and `test/arch/testing/acd-source-directory-budget.test.mjs`.
- **Why:** 151 was refined on 2026-10-04, before m150/R1 (grep the tree for an existing command's id)
  was written. That grep would find the fifth census. It would not find the ledger or the budget,
  because neither names a command id.
- **Lesson:** a story that adds a test case always moves the 142 ledger, and a story that adds a file
  checks its directory's budget row. Both belong in refine's `files:` beside the censuses that m150/R1's
  grep finds.
- **Refs:** STATE `## Feedback (for retro)`, entry 1; m150/R1.

## R2 — 150 left `test/bundle` over its budget, and the next story found it

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** the build lane · **Raised by:** aof-continue (build)
- **What happened:** 150's `explain-command.test.mjs` took `test/bundle` to 24 children over a ceiling
  of 23, with no row change. 150 was accepted green. 151's build found the red and raised the row with
  its reason stated.
- **Why:** 150's story lane did not include `acd-source-directory-budget.test.mjs`. The control runs
  only when a lane names it, or at the whole-tree gate, and a parentless story has no milestone gate.
- **Lesson:** a lane that adds a file under a budgeted directory runs the directory-budget control. A
  parentless story has no regression gate to catch what its own lane leaves out.
- **Refs:** STATE `## Feedback (for retro)`, entry 2.

## R3 — The paste is the one step aof does not perform, and only doctor checks it

- **Kind:** near-miss · **Area:** contract · **Stage:** verify · **Owner:** the session running the command · **Raised by:** aof-verify (`@manual` run)
- **What happened:** in the `@manual` run, the verifier's first paste of ADR-001's block matched no
  anchor and wrote nothing. The run carried on. `aof work doctor` then reported three `diagram-orphan`
  warns, and the block was re-pasted.
- **Why:** aof writes the diagrams and returns the `block`; the session edits `ARCHITECTURE.md`. A
  paste that misses its anchor leaves exported files linked from nothing, and the command's report
  step does not re-read the record.
- **Lesson:** after pasting, re-read the ADR's section for its `](diagrams/` link, or run
  `aof work doctor <ref>`, before reporting the ADR drawn. A `diagram-orphan` right after a run means
  the paste missed.
- **Refs:** VERIFICATION `## Verification evidence`, the `@manual`: doctor row.
