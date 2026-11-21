---
doc: state
---
# 203 · Every file aof generates is held to a committed baseline, and any drift shows as a reviewable diff — State

## Progress

- 2026-11-20 — Refined with `--all`, solo (run `20261120T182303148Z-0000`): ADR-001 to ADR-007,
  FF-20301 to FF-20303, three stories, 13 task features.
- 2026-11-21 — `aof:continue 203`, solo (milestone run `20261121T160300065Z-0001`): 203/00, 01 and 02
  built and reviewed.
- 2026-11-21 — `aof:verify 203`: the contract amendment ratified, 203/02 task 03 amended from a
  Windows run to an any-OS `@executable` proof, all three stories accepted, F-01 to F-03 deferred.
  The regression gate goes to a clean runner through `gate/203` (VERIFICATION, Accept decision).

## Closure record

Compacted at verify, 2026-11-21. The build-time notes and feedback as they stood are in commit
`123261b4`.

- **Durable decisions** are ADR-001 to ADR-007 (ARCHITECTURE). The amendments made at verify are in
  VERIFICATION's Accept decision: aof's own `.aof/` records named in 01 task 00 R1, E5 and E7 and in
  02 task 01; 02 task 03 made `@executable`; the SPEC's acceptance line restated as an any-OS property.
- **Product observations** are VERIFICATION F-01 (first-time `init` replaces a user's file at an aof
  path), F-02 (Codex's refine skill renders from a hand-kept copy) and F-03 (a kept file's lock entry
  moves to the end). All three are non-blockers deferred to the backlog.
- **Recorded, not fixed (Nits from review):** the line diff's LCS is quadratic after the common
  prefix and suffix (around 100 MB for a wholesale rewrite of a multi-thousand-line file).
  `fillPlaceholders` writes a raw path, which would need JSON escaping if a `<project>` ever appeared
  inside a JSON file (none does). 01 E10's "each marked aofManaged" holds for hooks, but a deny is a
  plain string.
- **Rebuild scope:** the rebuild recomputes one Codex ownership kind, hook groups, and refuses any
  other by name (203/02 OUTCOME, Assumptions).
- **Pre-existing reds met on this MacBook, not 203's:** `acd-source-directory-budget` on `test/loop`
  (66 > 64) and `packages/foundation/src` (9 > 8), and FF-7106 on 198/02's `STORY.md`.

## Feedback (for retro)

Archived at verify. Its lessons graduated into the stories' and the milestone's `RETROSPECTIVE.md`
(203/00 R1–R3, 203/01 R1–R2, 203/02 R1–R4, 203 R1–R2).
