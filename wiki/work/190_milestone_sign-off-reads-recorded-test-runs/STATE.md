---
doc: state
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — State

## Progress

- 2026-11-09: refined autonomously in solo mode. 2026-11-10: built and reviewed solo, and stories 00–04 were accepted at `aof:verify 190` (03 after F-01; 04 after a rework for F-05–F-07).
- 2026-11-10: the milestone was accepted on a green regression gate run on a GitHub runner. See VERIFICATION `## Milestone accept decision`.
- [x] `00_story_a-repeat-run-is-answered-from-its-record` — accepted at verify 2026-11-10, done
- [x] `01_story_impacted-narrows-on-what-it-knows` — accepted at verify 2026-11-10, done
- [x] `02_story_a-gate-that-did-not-finish-resumes` — accepted at verify 2026-11-10, done
- [x] `03_story_the-doors-stop-prescribing-repeat-runs` — declined at verify (F-01), fixed there, accepted 2026-11-10, done
- [x] `04_story_an-existing-project-declares-its-test-layout` — declined at verify 2026-11-10 (F-05, F-06, F-07), reworked (ADR-008 §6–§9, `@bug` task 05), reviewed and accepted 2026-11-10, done

## Decisions (graduated)

- Every `aof test` run is recorded against its content key. A repeat is answered from the record,
  and the agent never supplies a result (ADR-001, ADR-002).
- `impacted` narrows only on positive knowledge, and anything unknown widens (ADR-003).
- No tier declaration (ADR-004): the end-to-end lanes run only in whole-tree runs. §3's revisit is
  open, as F-08 and the milestone OUTCOME's Gap.
- A `not-finished` gate resumes on the same content, and a gate run is a test record (ADR-005).
- The doors ask `aof test` once and read its answer (ADR-006).
- An existing project is told what its declaration leaves out. One answer decides what a suite is,
  and `/aof:map-tests` declares the layout (ADR-008 with its amendment, §6–§9).

## Archived

The build blow-by-blow, the per-story decisions and the `## Feedback (for retro)` notes have
graduated. The lessons are in the milestone's `RETROSPECTIVE.md` (R1–R3) and in each story's own.
The evidence is in VERIFICATION, and the open follow-ups are in OUTCOME's Gaps and VERIFICATION's
F-04 and F-08. The full pre-compaction text is in git at `4a006d7b`.

## Verification

- [x] `@executable` story lanes green for 00–03. The remaining reds are F-02, F-03 and two records
  that are not 190's (VERIFICATION, scoped runs).
- [x] Fitness functions FF-19001–FF-19006 green, each with a red probe
- [x] `@manual` 190/01 task 03 recorded; scenario 3 completed at verify with `--plan`
- [x] 190/02 live resume check recorded (in a clone)
- [x] `@manual` 190/04 task 04: E14 and E15 hold after the rework; F-05, F-06 and F-07 closed
- [x] Milestone regression gate: green at `4a006d7b`, run on a GitHub runner through `gate.yml`
  (`REGRESSION.md`)
- [x] F-08 and ADR-004: the milestone is accepted with F-08 as an open Gap, and ADR-004 stands
