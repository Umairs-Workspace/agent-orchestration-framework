---
doc: state
---
# 204 · What aof apply, init and clean write is held to baselines, including their merges into files the user owns — State

## Progress

- 2026-11-21 — Refined with `--all`, solo (run `20261121T232637388Z-0000`): ADR-001 to ADR-007,
  FF-20401 and FF-20402, four stories, 13 task features. The operator decided that 204 fixes the
  four defects that damage user files, and holds the rest.
- 2026-11-22 — `aof:continue 204`, solo (milestone run `20261122T183526467Z-0001`): 204/00 to 204/03
  built and reviewed. All 23 registered golden scenarios match.
- 2026-11-22 — `aof:verify 204`: FF-20401 and FF-20402 red-probed, all four stories accepted,
  F-01 to F-06 deferred. Committed at `e44face1`. The regression gate runs on the committed tree.

## Closure record

Compacted at verify, 2026-11-22. The build-time notes and feedback as they stood are in commit
`e44face1`.

- **Durable decisions** are ADR-001 to ADR-007 (ARCHITECTURE). Two were taken during the build and
  stay as recorded there: 204/01 amended 204/00's E9 to count the journal's `CLAUDE.md` and
  `.mcp.json` entries, and the doctor's `generated-output-drift` counts a co-authored `conflict` as
  drift. `--global` is held through `assets add --global` and `assets use --global`, because
  `assets apply --global` refuses by design (ADR-001).
- **Product observations** are VERIFICATION F-01 to F-06. All are non-blockers deferred to the
  backlog. F-01 to F-03 are the behaviours ADR-006 holds in the baselines, and F-06 is m203/F-01's
  cause on `assets apply`.
- **Recorded, not fixed:** the four Codex-named functions that now serve every co-authored output
  (F-05), and the TOML merge's blank lines (F-04).
- **Pre-existing reds met on this MacBook, not 204's:** `acd-source-directory-budget` on `test/loop`
  (66 > 64) and `packages/foundation/src` (9 > 8), and `codex-ownership`'s two "156 — retained …
  lane" cases (`fatal: … is a main working tree`).

## Feedback (for retro)

Archived at verify. Its lessons graduated into the milestone's and the stories' `RETROSPECTIVE.md`
(204 R1–R2, 204/00 R1, 204/01 R1). Stories 02 and 03 surfaced none.
