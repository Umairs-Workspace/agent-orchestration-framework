---
doc: retrospective
updated: 2026-10-06
---
# 04 · A live lesson's meta line is held — Retrospective

The build ran solo. Two lessons, both recurrences.

## R1 — `files:` missed the controls that pin a new doctor lane and a new source file

- **Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** architect, product-owner · **Raised by:** developer
- **What happened:** `files:` missed six paths: the doctor lane roster in `acd-controls-never-execute`, the `packages/work/src/doctor` budget row and the examples-lane test that pins it, the per-file `node:path` port in `yarn-installation.test.mjs`, and 149's retrospective, which was not live at refine. The declared `lesson-meta-hold.test.mjs` had to be a `.suite.mjs`, because a package `.test.mjs` must be native `node:test`.
- **Why:** Each of those controls lists files by name, so a new lane or a new source file edits it. Refine planned the new files without asking which controls name their directory.
- **Lesson:** For every new source file, refine names in `files:` the controls that pin its directory: the budget row, the native-port list, and a lane roster when it adds a doctor lane. A new test file under `packages/*/test` is a `.suite.mjs`.
- **Refs:** m141/R1 · m127/01/R3

## R2 — Four stories added files to budgeted directories, and none raised the row

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** developer
- **What happened:** 01, 02, 03 and 05 grew `packages/work/src`, `packages/work/test`, `packages/knowledge/test`, `test/arch/memory`, `test/arch/work` and `test/memory`, and left all six budget rows red. 04 raised each row, naming the story and file that grew it.
- **Why:** Each story's lane held its own suites, not FF-11904, so each story was green alone while the milestone was red. That is 146/R1's case.
- **Lesson:** A story that adds a file to a budgeted directory raises that row in its own change, and its lane includes `test/arch/testing/acd-source-directory-budget.test.mjs`.
- **Refs:** m146/R1
