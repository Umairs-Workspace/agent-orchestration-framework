---
doc: state
---
# 170 · Excalidraw phase 1 — State

Migrated from a source folder on 2026-10-24 (status: in-review), the hand-numbered temporary
`200_milestone_excalidraw-phase-1` on `feat/excalidraw-collaborative-refinement` (RETROSPECTIVE R4).
SPEC, ARCHITECTURE, VERIFICATION and RETROSPECTIVE were carried verbatim, renumbered 200 → 170; the
ten story folders were written at import from the story list, the ADRs and VERIFICATION.

## Progress

- [x] 00–09 built on the branch (PR #13 and after).
- [x] Accepted through `aof:verify 170` on 2026-10-24: the operator's UAT on the control node, the
  d3-shape admission signed off, and every open finding fixed or deferred (VERIFICATION).

## Decisions at verify

- **No `.feature` contracts are owed.** The work was built before the milestone entered the stream.
  Its acceptance is the registered suites, the controls, the browser smoke and the operator's UAT,
  which VERIFICATION records. The stories keep no task contract, and that is a decision, not a gap.
- **The import-time review's findings all closed.** Four were fixed at import with a failing-first
  test each (a frame edge, a split multi-byte save, revived notes, a library name with a space),
  and five at verify (VERIFICATION F-170-02, F-170-04..07).
- **Deferred by the operator:** contextual notes, library search and an editor that updates when the
  architect finishes (F-170-11..13), to a later milestone.
- **Accepted trade-off, not owed:** a crashed writer leaves the `.lock`, and every write answers 409
  until it is deleted by hand (ADR-004). With host sleep and tree-kills on this machine, it is worth
  revisiting.
