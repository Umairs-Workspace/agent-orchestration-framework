---
doc: state
---
# 165 · Planning runs in Cowork — State

## Progress

- [x] Refined 2026-10-19 (`aof:refine 165 --autonomous`, solo): RESEARCH, ADR-001…005, FF-16501…16506.
- [x] Built and reviewed 2026-10-19 (`aof:continue 165`, solo, in the sibling worktree `aof-165`),
  then moved onto `164-project-changes-reach-the-global-store` at the operator's request.
- [x] Verified 2026-10-20 (`aof:verify 165`). 165/03 was reopened at verify for Q4 (ADR-006: the
  packages live once in the aof home, FF-16507), rebuilt, and accepted after the operator's
  `@uat` E5 in Cowork.
  - [x] 165/00, 165/01, 165/02 and 165/03 accepted
  - [x] Whole-tree regression gate green (`REGRESSION.md`)

## Notes & decisions

Durable decisions live in ARCHITECTURE (ADR-001…006, FF-16501…16507). The ones taken at refine as
defaults, and kept:

- refine is **not** shipped to Cowork. Only shatter and explain are (ADR-002).
- The packages are written by an in-repo stored-zip writer, adding no dependency, and only if
  every step succeeded (ADR-005).
- The skill descriptions open with the explicit invocation, because the plugin syncs to every
  Claude Code session on the account (RESEARCH R2).

The one default the operator overturned, where the packages go, is ADR-006 and 165/03/R1.

Carried forward (open, non-blocking): F-03, the control daemon's CPU, routed to
`backlog/milestone_daemon-stays-within-a-resource-budget`; F-05, PRD auto-discovery not yet
exercised in Cowork; F-07, the concurrent-cowork-init race (a review Nit).

The build and verify blow-by-blow, and the feedback notes, graduated into `VERIFICATION.md` and
the retrospectives at accept (2026-10-20).

## Verification

- [x] `@executable` suite green: the whole-tree gate in `REGRESSION.md`
- [x] Fitness functions green (FF-16501…16507), each with a red probe (`VERIFICATION.md`)
- [x] `@manual`: 165/02's live clone at `v2.0.0`, re-run at verify
- [x] `@uat`: 165/03 E5, signed off by the operator (`VERIFICATION.md` § User sign-off)
