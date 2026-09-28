---
doc: retrospective
updated: 2026-09-28
---
# 141 · Subagents and loops think at a chosen effort — Retrospective

The story was loop-driven: one refine run and one continue run, both done at attempt 1. There were
two lessons, and the first is a repeat.

## R1 — 140/R1 recurred: the `files:` census missed the controls that pin the changed seam

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine → build · **Owner:** product owner (refine), builder · **Raised by:** verifier
- **What happened:** 141 changed what every drive emits, adding `--effort high` to the argv and `effort` to the dry-run answer. Two tests outside `files:` pinned the old shape. They were `cache-stable-launch` (70/01, "passes neither `--model` nor `--effort`") and FF-5303's `acd-phase-door-not-a-driver`, the same control 140/R1 named. The story lane was green (426/0), and both were red. Verify found them only by running every importer of a changed module (101 files) and every test that drives the seam.
- **Why:** 140/R1's lesson was written as advice to grep `test/arch/` for the seam's verb. Nobody ran it: PLAN.md checked FF-5304 by name and did not sweep. A story with no milestone has no full-suite gate to catch what its own lane misses.
- **Lesson:** For a story that changes a seam's output, verify runs the importer sweep: `grep -rl` over `test/` for the changed `src/` modules, minus `files:`, through `scripts/test.mjs --only`. For a parentless story this is the only wider check it gets. Put what it finds into `files:` before accepting.
- **Refs:** VERIFICATION F-01, F-02 · m140/R1

## R2 — A test fixture invented the transcript shape, so the ingest never read the real field

- **Kind:** latent defect · **Area:** code · **Stage:** (milestone 70) → verify · **Owner:** builder · **Raised by:** verifier
- **What happened:** The spend ingest read `message.effort`. Real Claude Code transcripts put `effort` on the record, beside `message`. The ingest's own fixture used the nested shape, so the test passed for as long as the code existed, and every live run recorded `spend.effort: "unknown"`. It surfaced here because 141 is the first item whose user story is "effort I can see". Its own two runs read `unknown` while their transcripts said `high` on all 340 turns.
- **Why:** The fixture comment claims to "mirror the live Claude Code JSONL shape", and nobody checked that against a live transcript.
- **Lesson:** A fixture that claims to mirror a vendor's format is checked against one real record, and that record's key path is cited in the fixture comment. When a stored value reads `unknown` for every row, suspect the reader before the data.
- **Refs:** VERIFICATION F-03, F-04
