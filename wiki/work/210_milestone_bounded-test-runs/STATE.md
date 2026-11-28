---
doc: state
updated: 2026-11-28
---
# 210 · Bounded test runs — State

## Progress

- 2026-11-26: framed from a design discussion after an Opus session looped on the whole suite while
  fixing reds; refined with `aof:refine 210 --all` (eight ADRs, six stories).
- 2026-11-27: built and reviewed solo. Verify round 1 accepted 01, 02 and 03, and returned 00, 04
  and 05 with `@bug` scenarios (F-07 to F-12). The fix round turned all six green.
- 2026-11-28: verify round 2 accepted 00, 04 and 05. Gate 1 at `f42f9a9e` was red (F-15, which was
  210's, and F-16, which was 198's); both were fixed in verify. Gate 2 at `ef8b280f` was green, and
  the milestone was accepted.
- [x] `00_story_testing-instructions` — declined at round 1 (F-09), fixed, accepted 2026-11-28
- [x] `01_story_importer-scan` — accepted 2026-11-27
- [x] `02_story_attributed-test-records` — accepted 2026-11-27
- [x] `03_story_gate-runs-twice` — accepted 2026-11-27
- [x] `04_story_named-test-runs` — declined at round 1 (F-10, F-12), fixed, accepted 2026-11-28
- [x] `05_story_bounded-fix-rounds` — declined at round 1 (F-07, F-08, F-11), fixed, accepted 2026-11-28

## Decisions (graduated)

- The project's own plain-words instructions file (`work.test.instructions`) guides the agent's
  choice of suites, and every testing skill reads it at its test step (ADR-001).
- A named run states its reason, and the record carries it (ADR-002). `--suggest` is a fresh import
  scan, never a graph (ADR-003).
- A fix round reruns the failing suites plus the fix's reach (ADR-004). A chain that stops
  shrinking within `work.loop.buildNoProgressRounds` rounds stops itself and is never re-opened; a
  named run starts a fresh chain (ADR-005; 210/05 Q1).
- Pre-existing is measured on the work's base in a tree of its own, rerun with the working
  declaration less `work.test.instructions` (ADR-006; F-11).
- The whole tree belongs to the gate, with at most two launches per milestone and a third only
  with the operator's recorded confirmation. `--all` has no override inside story work (ADR-007;
  210/03 Q1, 210/04 Q1).
- The old selection was removed with no compatibility layer. A removed config key is a refusal
  that names it, and a retired control keeps its register row, marked retired, and cites its
  replacement (ADR-008; F-10).

## Archived

The build blow-by-blow, the per-story decisions and the `## Feedback (for retro)` notes have
graduated. The lessons are in `RETROSPECTIVE.md` (R1–R4) and in the retrospectives of stories 00,
02, 04 and 05. The evidence is in VERIFICATION. The open follow-ups are in OUTCOME's Gaps and in
VERIFICATION's F-04, F-05, F-06 and F-13. The full pre-compaction text is in git at `ef8b280f`.

## Verification

- [x] Every story's `@executable` scenarios are green, including the six `@bug` scenarios (verify
  round 2's 586-suite sweep and the native files)
- [x] FF-21001, FF-21002 and FF-21003 are green, each with a red probe
- [x] `@manual` E12 and E13 (the structural lane checks the choice of suites) were recorded at round 1
- [x] Pre-existing labels proved on this repo (round 2; the SPEC's third outsider check)
- [x] Milestone regression gate: green at `ef8b280f` (REGRESSION.md row 2)
