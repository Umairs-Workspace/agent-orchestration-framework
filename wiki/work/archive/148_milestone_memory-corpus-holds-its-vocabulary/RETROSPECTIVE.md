---
doc: retrospective
updated: 2026-10-06
---
# 148 · The memory corpus holds its vocabulary — Retrospective

The milestone was refined solo and autonomously on 2026-10-04, and its five stories were built and
reviewed solo from 2026-10-05 to 2026-10-06. Each story's own lessons are in its folder. These are
the lessons from running the milestone as a whole.

## R1 — Three of five stories missed the same `files:` class that five earlier lessons name

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine · **Owner:** architect, product-owner · **Raised by:** verifier
- **What happened:** 02 missed six paths, 04 six and 05 four. Each time it was the same kind of path: the suites, goldens, budget rows, port lists and rosters pinned to a shape or a directory the story changed. Across the milestone, four stories left six directory-budget rows red, and 04 raised them all.
- **Why:** The lesson is already written: 61/R6, 126/R2, 127/R3, 141/R1 and 146/R1. Each was recalled at refine and read as advice, while refine's census still lists only where new code lives. A lesson that has recurred five times is not changing what refine does.
- **Lesson:** Stop writing this lesson and make it mechanical. Refine's `files:` census runs a grep for the readers of every frozen shape a story changes (field lists, version constants, goldens, command output) and the controls over every directory it adds a file to, and puts the results in `files:`. Until that exists, every refine brief names the grep.
- **Refs:** m148/02/R1 · m148/04/R1 · m148/04/R2 · m148/05/R1 · m146/R1 · m141/R1

## R2 — A story accepted on this branch left two stream-wide controls red

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier
- **What happened:** 152 was accepted and committed on this branch (`a035aa5d`) with FF-11904's `test/work/stream` row at 36 against a ceiling of 35, and `promote/candidates.mjs` missing from the native-port list. 148's story lane surfaced both, and verify repaired them before the gate (F-148-01).
- **Why:** 152's verify ran its own suites and the importers of its changed code. Neither control imports promote: each lists files by name. 152/R3 recorded the same gap, for a record-keyed control, in the same verify.
- **Lesson:** A story whose diff adds a file runs `acd-source-directory-budget` and `yarn-installation` in its verify lane, whatever it imports. A commit that lands on a shared branch is green on both before the next item builds on it.
- **Refs:** m148/F-148-01 · m152/R3 · m146/R1

## R3 — The gate depended on other items' state, and three verifies stepped around it

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** verify · **Owner:** verifier, architect · **Raised by:** operator
- **What happened:** 148's door was refused because twelve done items had not been archived, because citations inside done records had gone dark, and because an archived milestone's ledger had not been hand-edited for this PR. Verify repaired the records, re-pinned ceilings, and then asked the operator to archive twelve items before 148 could be signed off. The operator ruled that the defect was the coupling itself (F-148-06).
- **Why:** The repository uses its own work stream as test data, so checks on stream hygiene were written as suite controls instead of validate or doctor lanes. Each time one went red over another item's records, the session treated it as a trap to step around. The memory recorded it as "a done-but-unarchived milestone at the root reds every later gate". It did not record it as a defect, and 148's own FF-14801 added another control of the same kind.
- **Lesson:** A red caused by another item's records or state is a defect in the test, never a task for the stream. Decouple the test with a fixture, or scope it to items that are not done, and never ask the operator to tidy the stream so an item can be signed off. A new control never reads the live stream in a way that a later item's ordinary work can turn red.
- **Refs:** m148/F-148-06 · m148/F-148-03 · m148/F-148-05 · m148/01
