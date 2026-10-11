---
doc: retrospective
updated: 2026-10-06
---
# 05 · Memory status reports conformance and layers — Retrospective

The build ran solo. One lesson, the milestone's third instance of the same `files:` miss.

## R1 — Two suites pinned the old `status` shape outside `files:`

- **Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** architect, product-owner · **Raised by:** developer
- **What happened:** `files:` missed four paths: the human and `--json` goldens in `test/command/work-memory-command.test.mjs`, one status line in `acd-work-memory-routed`, the per-file port that lets `local-retrieval.mjs` import the vocabulary, and the budget rows for the two new test files.
- **Why:** `status` is a shape with goldens, and the census did not grep for its readers. That is the same root cause as 148/02/R1 and 148/04/R1.
- **Lesson:** The same as 148/02/R1. When a story changes what a command prints, every golden of that output goes in `files:`.
- **Refs:** m148/02/R1 · m148/04/R1
