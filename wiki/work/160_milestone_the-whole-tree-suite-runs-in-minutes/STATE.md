---
doc: state
---
# 160 · The whole-tree suite signs off in minutes — State

## Progress

- 2026-10-14: captured on the backlog, then promoted.
- 2026-10-14: refined (`aof:refine 160 --autonomous`, solo). Seven ADRs in ARCHITECTURE.md and
  seven stories, each with its contract. Two business questions on 160/05 were asked at the refine
  close and answered by the operator (stop at the budget; a serial run still signs off).

## Notes & decisions in flight

- **Re-measured at refine, as this file asked**, from `main` at `219729b8`, which carries
  `ae1495a6` and `79b926b7`. The recorded timings sum to 40,743 s over 1,193 units. Importing
  `scripts/test.mjs` took 14.8 s, and importing the application 1.8–2.9 s. One `loop-command-wave`
  file run alone took 1,230 s wall with 8,003 git calls (1,067 s), and doctor's history reads were
  422 × 3 of them. Profiler: a `--require` preload wrapping `child_process`, then
  `syncBuiltinESMExports`.
- **Risk: the 10-minute budget may still be missed.** The budget needs about 9,000 s summed on 16
  workers, roughly −78%. The stories attack `test/loop` (12.0k s), the lane suites, process start-up
  and doctor's history reads. `test/arch` (7.8k s) has no story of its own. If the gate is still
  over budget after 00–06, the next lever is the heaviest arch suites
  (`acd-candidate-formation-is-lossless`, `acd-control-derives-its-census`,
  `acd-register-declaration-form`, `acd-work-command-cli-bijection`). The SPEC's out-of-scope
  in-process git engine is reconsidered only after that.
- **Default decisions taken (technical, documented in the ADRs):**
  - The read memo is per wave tick, never across ticks (ADR-001).
  - A selection launches `scripts/test-shard.mjs` through a new `selectProgramArgs` key. The
    registry stays in `scripts/test.mjs`, because about twenty suites and the census read its
    import text (ADR-003).
  - The compile cache is enabled in the bin and in the test harness. The SEA launcher is untouched
    (ADR-004).
  - The gate removes `GIT_*`, `CLAUDE*` and `AOF_*` except `AOF_GLOBAL_HOME`. A stopped gate writes
    no row, and the gate learns of a stop from its own run record (ADR-005; 160/04 Q1–Q3).
  - The budget reaches the program through a `budgetArgs` template, and the third row result is
    `not-finished` (ADR-006; 160/05 Q3–Q4).
  - Doctor's citation history is lazy. This lever was found at refine and was not in the SPEC
    (ADR-007, story 06).
- **The codebase graph was unavailable at refine.** `aof graph build .` returned
  `graphify-timeout` after 120 s. Boundaries were drawn from source reading and importer greps. No
  stale artifact was read.
- **Diagrams:** none drawn. Each ADR's flow is linear and is stated in its numbered decisions.
- **Lane-commit trap:** stories 02 and 05 change `.aof/aof.config.json`. A lane's reconcile
  resets `.aof/`, so commit those changes by hand on the lane branch.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-16001 – FF-16007, each with its red probe)
- [ ] Whole-tree gate green under the enforced budget on the control node
