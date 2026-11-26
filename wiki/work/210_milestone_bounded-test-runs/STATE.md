---
doc: state
---
# 210 · Bounded test runs — State

## Progress

- 2026-11-26 — Framed from a design discussion with the operator, after an Opus session looped on
  the whole suite while fixing reds. Promoted, not started. To be broken down by `aof:refine`.

## Notes & decisions in flight

- 2026-11-26 — **The measurement.** `aof test --scope impacted --commit HEAD~N --plan --json` for
  N = 0…7 at `eb2c25c4`: every one is `scope: "all"`, 1,314 suites.

  | Commit | Changed files | Widened |
  |---|---|---|
  | HEAD~0 | 4 | 3 `not-in-graph` |
  | HEAD~1 | 1 | 1 `not-in-graph` |
  | HEAD~2 | 7 | 5 `not-in-graph` |
  | HEAD~3 | 102 | 54 `not-in-graph`, 2 `no-registered-dependent` |
  | HEAD~4 | 91 | 59 `not-in-graph`, 4 `no-registered-dependent` |
  | HEAD~5 | 2 | 2 `not-in-graph` |
  | HEAD~6 | 5 | 5 `not-in-graph` |
  | HEAD~7 | 138 | 36 `not-in-graph`, 13 `no-registered-dependent` |

  HEAD~1, HEAD~5 and HEAD~6 changed only `wiki/work` records, and all three widened.
- 2026-11-26 — **Operator decisions.**
  - The testing approach is rewritten, and nothing is kept for backwards compatibility.
  - The loop to prevent is the fix loop: a whole-tree run, fixes, another whole-tree run "in case
    the fixes regressed something", and round again.
  - The fix-regression worry is answered by covering what the fix changed (`--failed` = the failures
    plus the importers of the fix's changes), with the whole tree at the gate.
- 2026-11-26 — **Open for refine.** None of these is decided yet:
  - Should `--all`'s refusal inside story work have an operator override?
  - How does the tool know it is inside story work rather than the gate?
  - What is "pre-existing" measured against? A clean-HEAD run of just the failing cases is the
    proposal; the last gate record is the cheaper alternative.
  - Is `--suggest` worth keeping alongside the instructions file? The proposal is yes.
  - Should anything besides the gate challenge a named run's reason, such as a review lane?
  - Is about three rounds the right no-progress threshold?
- 2026-11-26 — **Refined (`aof:refine 210 --all`).** Eight ADRs and six stories. The architecture
  answered each open item above; the default decisions taken are these:
  - **Story work** is `AOF_RUN_ID` naming a story or task run, else any running story or task run
    in this checkout (ADR-007; 210/04 Q2).
  - **Pre-existing** is measured on the work's base: the commit that added the working item's
    STORY.md or SPEC.md. It runs in its own prepared worktree, not on HEAD, because HEAD already
    holds the change once it is committed, and is the gated commit after a gate (ADR-006; 210/05 Q4).
  - **`--suggest` is kept.** The SPEC scopes it in (ADR-003).
  - **The no-progress bound is the build terminator's own**, `work.loop.buildNoProgressRounds`,
    default 2, so the third run stops a chain that has not shrunk. That is "about three", and it
    adds no second bound (ADR-005; 210/05 Q2).
  - **A fix round reruns suites, not cases** (ADR-004; 210/05 Q3).
  - **The scan follows test helpers and path mentions, never source-to-source imports** (ADR-003,
    honouring m191/R4 and m72/R7).
  - **`test-layout-suites` and `test-layout-resume` stay**, and the other four layout checks go
    (ADR-008; 210/00 Q3).
  - **A removed config key is a refusal that names it**, not a silent ignore (ADR-008).

  Asked of the operator at the review stop and answered (2026-11-26):
  - **210/00 Q1.** Yes: the structural review lane checks the agent's choice of suites.
  - **210/03 Q1.** The gate refuses a third launch, but a flag can override it, and the flag's
    use must be confirmed. That is read as the operator's harness-recorded answer to a
    `<ref> G<n>` question (ADR-007).
  - **210/04 Q1.** No override for `--all` inside story work.
  - **210/05 Q1.** A named run starts a fresh chain, and a stopped chain is never re-opened.
- 2026-11-26 — diagram not drawn: diagram-generator-missing (ADR-005's brief is kept).

## Verification
