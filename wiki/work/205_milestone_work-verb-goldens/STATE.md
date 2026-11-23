---
doc: state
---
# 205 · Work verb goldens

## Progress

- 2026-11-22 — Refined in solo mode: ADR-001 to ADR-003, FF-20501, four stories with example maps, build briefs and task contracts. Story 00 supplies the fixture, and 01 to 03 depend only on it.
- 2026-11-23 — `aof:continue 205`, solo: 205/00 to 205/03 built and reviewed, 150 registered golden captures. The 205/00 build closed before review on a widened impacted gate, and the operator reopened it (Closure record).
- 2026-11-23 — `aof:verify 205`: 337 cases green across the 205 suites, FF-20501 and the three repaired suites. All four stories accepted. The milestone gate result is in VERIFICATION, Accept decision.

## Closure record

Compacted at verify, 2026-11-23. The build-time notes and feedback as they stood are in this milestone's verify commit.

- **Durable decisions** are ADR-001 to ADR-003 (ARCHITECTURE). Two were taken during the build and stay as recorded there and in the story retros. The runner stores stdout and stderr as separate files, so the suite parses stored JSON on every replay (205/03 R1). A verification attachment distinguishes preserved evidence from the retrospective citations that renumber rewrites.
- **Observed behaviour held as it is:** `archive --done` selects a done prototype, and `renumber` leaves a sibling's bare `depends: [00]` (RESEARCH, ADR-002).
- **Gate repair (operator, 2026-11-23):** `work.test.couplings` maps the fixture's non-suite files to their suites, so the 205/00 plan selects 19 of 1,311 suites. The bundle suite admits `template-variant`. `codex-ownership`'s retained-lane fixture uses the canonical temp directory. The source-directory budget records `test/loop` at 66 and `packages/foundation/src` at 9, each with zero allowance. These three were red at 204's gate, and a clean run on `2fa9bdd7` confirmed they predate 205.

## Feedback (for retro)

Archived at verify. Its lessons graduated into the milestone's and the stories' `RETROSPECTIVE.md` (205 R1, 205/00 R1, 205/03 R1). Stories 01 and 02 surfaced none.
