---
doc: state
---
# 160 · The whole-tree suite signs off in minutes — State

## Closure

Accepted 2026-10-18 by `aof:verify 160`. All fourteen stories are done. The objective was re-aimed by the operator on
2026-10-17 (SPEC.md, ADR-014): the 10-minute budget is the pull request suite's wall time on GitHub-hosted Linux
runners, where the whole tree signs off in 1.8 minutes (PR #12). The regression gate is green at `21cfaaf4`
(REGRESSION.md, newest row), run unchanged on a runner by `.github/workflows/gate.yml`; the CLI reads nothing from CI.

- **Rounds.** Round 1 (00–06) and round 2 (07–11) cut the control node's summed test time from 40,743 s to about
  15,000 s; round 3 (12–13) removed the tests' writes to the operator's `~/.claude.json` and the stores' re-migration,
  then moved the suite and the gate onto runners. The control node's own run varied by about the budget between
  identical runs (VERIFICATION, the worker sweep), which is why the budget moved.
- **Decisions graduated.** Every default chosen at refine and build is in ARCHITECTURE.md: ADR-001 (a step's git memo,
  and a step narrower than one tick), ADR-002/009 (the git model and the template), ADR-003 (`selectProgramArgs`),
  ADR-004 (the compile cache; module ceilings, raised only with their story and reason), ADR-005 (the clean gate
  launch and its stdin watch), ADR-006 (`not-finished`), ADR-007 (lazy citation history), ADR-008 (the test bundle),
  ADR-010 (packed units, bounded by argument length since F-06), ADR-011, ADR-012, ADR-013 (the test's claude home;
  migrate only an old schema), ADR-014 (the PR suite, the summary's verdict, no control-node budget, the gate on a
  runner). Nothing else here is durable.
- **Lessons.** The milestone's RETROSPECTIVE (R1 the budget's environment, R2 a killed process's pipe, R3 a second
  session committing onto this branch) and every story's own retrospective are indexed by `aof work memory ingest`.
- **Superseded delivered assertions** (tests changed, `.feature` files unedited): 160/01's `merge --no-ff` refusal row
  (by ADR-009 §1), site-build/01's `--only` gate (ADR-012 §2), 160/05's "this repository declares a 10-minute budget"
  and site-build/00's workflow set (ADR-014 §3, §5, §6).

## Carried follow-up

- **m138/F-06** — the production trust writer ignores `CLAUDE_CONFIG_DIR` (160/12 OUTCOME, Gaps). Open for its owner.
- **The drift baseline** — exists once a green push to `main` saves its timings (160/13 OUTCOME, Gaps).
- **F-03** (the compile cache did not lower start-up medians) and **F-04** (contract wording) stay open, non-blocking.
- **Timing-sensitive cases of other items**, red only under heavy load on the control node and green on every runner:
  `53/00 task03` (a 30 s watch ceiling), `154/08 task01` (a 30 ms heartbeat race), `131/01 ask-request/02` (a fixed
  20 ms wait).
- **Housekeeping (the operator's):** the trial and gate worktrees (`../aof-trial-160`, `../aof-gate-160`) and the
  `gate/160` trigger branch can be removed; `aof work archive 160` moves the folder under `archive/`.
