---
doc: state
---
# 164 · Every project change reaches the global store — State

## Closure

Accepted 2026-10-19 by `aof:verify 164`. All four stories are done, including the two `@bug`
tasks verify added (00/03 F-06, 01/03 F-02). The whole-tree regression gate is green at
`7ce469dc` (REGRESSION.md row 5); rows 1, 2 and 4 were red, and their causes are VERIFICATION
F-01, F-05 and a load flake. The live check (01/02) passed on the control node after the global
store's node records were repaired (F-02).

- **Decisions graduated.** The operator's framing rulings and the refine defaults are ADR-001 to
  ADR-007. The two verify amendments are on ADR-004, and the build's own decisions are under
  ARCHITECTURE "Build refinements".
- **Lessons.** RETROSPECTIVE R1 (probe the shared global inputs before a live command), R2 (the
  pinned whole-tree censuses, a third occurrence and a promotion candidate) and R3 (an `@manual`
  step reads its command's scope) are indexed, with one retrospective per story.
- **Carried follow-up.**
  - F-04: stale registered dispatch-worktree workspaces warn on every tick (OUTCOME gap, 01).
  - F-05: the per-command stat walk costs 0.6–0.95 s on this repository (OUTCOME gap, 00).
  - F-07: the codex commit `c9d0a0ca`, committed onto this branch by another session, turns
    `yarn-installation` and `workspace-boundaries` red until it audits its child processes. Its
    owner's to fix.
  - The desktop daemon still runs payload `3e2bcd62` until it is restarted (tray Quit, then
    `aof mesh desktop run`); until then it republishes the workspace from the sibling worktree
    whenever the descriptor names that root.
