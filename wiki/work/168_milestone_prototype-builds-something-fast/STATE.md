---
doc: state
---
# 168 · A prototype builds something fast — State

## Closure

Accepted 2026-10-22 by `aof:verify 168`. All four stories are done (00–03), and each has its own
OUTCOME and RETROSPECTIVE. The first whole-tree gate (`d63b05e6`) was red on pinned censuses
(VERIFICATION F-03). They were repaired in `7514acf1`, which is whole-tree green in 167's gate. The
door is passed by a recorded override (REGRESSION.md row 2): the code at `25d69b87` is byte-identical
to `7514acf1`, and the repaired suites were re-run there through `--only`.

- **Decisions graduated.** The operator's framing rulings (no time-boxing, wants not criteria,
  fixed as a prototype on the current branch, diagrams through `add-diagram`, no phase files, each
  checkpoint copied into the log) and the refine defaults are ADR-001 to ADR-007. The answers
  given at contract (on `main` it says so once, a redraw overwrites, the card opens on
  `PROTOTYPE.md` with a `STATE.md` tab) are ratified in the story contracts. The build's own
  decisions are under ARCHITECTURE "Build refinements".
- **Lessons.** RETROSPECTIVE R1 (a new type or verb needs its census set named at refine, with
  41/R3 recurring) and R2 (never re-prove identical code with a whole-tree run). Each story has its
  own R1. The build-time `## Feedback (for retro)` notes graduated into these lessons and into
  VERIFICATION F-01.
- **Carried follow-up.**
  - F-02: whether the `prototype · abandoned` tag truncates on a narrow lane card is unjudged
    (OUTCOME gap, 03).
  - The pasted diagram link on a prototype is checked by nothing (OUTCOME gap, 02, open by
    decision).
  - Archiving a done prototype, and prototypes on the fleet or mesh, are out of scope (milestone
    OUTCOME gaps).
