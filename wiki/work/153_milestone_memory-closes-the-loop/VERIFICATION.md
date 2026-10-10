# 153 · Verification

## Refine evidence — 2026-10-10

This is a documentation-only refine pass. No product tests, manual product rehearsal or human
UAT has run. No shipped behaviour is claimed. All roles were performed inline in solo mode;
there was no independent review and no subagent launch.

| Surface | Evidence |
|---|---|
| Dependency | `aof work find 148 --json`: done |
| Initial example maps | Doctor ran before any task feature; 01/02/04/05 had no example errors. 03 reported its unanswered business question, so no task was authored. |
| Story contracts 01/02/04/05 | Each `aof work validate 153/SS --json` returned `[]`, exit 0; each subsequent doctor returned 0 errors, exit 0. |
| Existing doctor advisories | Top-level missing number 122 and stream-wide unchecked dependency edges remain visible; neither belongs to these story contracts. |
| Story 03 | The driven ask records the operator selecting five milestones. EXAMPLES marks Q1 answered and E4 stated Q1. Doctor returned zero errors before its two task features were authored. |
| Graph | Extraction EPERM; source fallback, not a successful graph build. |
| Milestone pass | After completing story 03, validate returned `[]`, exit 0; doctor returned zero errors and ten warnings, exit 0. Its tasks-authored check reports 5 of 5 stories. |

Milestone doctor also reports advisory lack of configured control-runner/report joins and the
two explicitly pending control files. Registration is declared against the real indexes above;
doctor has not verified that join, and no runtime test report exists at refine. These warnings
are not represented as passes.

## Consolidated solo refine review

PO: objective covered by the five story outcomes; no UI or new product surface needing mocks.
Architect/security: reviewed package direction, append/publication boundary, historical records,
cross-kind calibration, path containment and write-disjoint ownership. Shared hubs are ordered
through story dependencies. QA: every key example of all five stories is represented, with
empty, invalid, duplicate and negative cases; the answered age example is a headline scenario
under its own rule. Developer: contracts bind the existing CLI and suite registrations; no
implementation was substituted for a contract.

| Story | Completed contract | Important edge coverage |
|---|---|---|
| 01 | capture-recall; preserve-feedback-and-retire-brief | empty/off, identity, partial verdict, concurrent replay, mixed consumers, publication |
| 02 | preserve-forward-lesson-metadata; match-recurrences-from-labelled-evidence | legacy watermark, cross-kind known pair, held-out negatives, equality/self exclusion |
| 03 | account-for-memory-effectiveness; report-recurring-and-unpromoted-lessons | zero/unresolved evidence, five-milestone boundary, archive/story scope, advisory versus strict doctor |
| 04 | capture-declared-edges; compile-and-demonstrate-lessons | one shatter owner, explicit role verdicts, generated parity, clean retrospective, human UAT |
| 05 | use-memory-evidence; compute-read-only-prompt-patches | provenance floor, concrete stable patch, conflicts, path containment, no automatic application |

Review result: all requested contracts are authored; no unresolved refine Blocker or Important
finding remains. The ten features carry 55 executable scenarios/outlines, 13 agent-manual
scenarios and one genuine human UAT scenario. Outlines contain additional boundary cases.
This is contract review, not evidence that their implementations pass.

Business decision: Q1 selected five later accepted milestones, from the operator's actual answer.
Engineering decisions: the five ADRs retain explicit composite identities, idempotent capture,
forward metadata, calibrated cross-kind recurrence, shared accounting and read-only prompt patches.
No other contract was reopened to apply the answer. No human UAT approval is inferred from it.

The graph fallback, pending fitness controls, unavailable runner/report joins and existing stream
advisories remain disclosed. Doctor's separate loop-ready score is 80/L1 with grounding and
anchor-grounding checks failing; a green refine doctor is not a claim that those registry checks
or an L2 execution readiness gate have passed. Build and acceptance still owe their own checks.

## Fitness functions

| id | current state | required red probe |
|---|---|---|
| FF-15301 | pending; intended runnable control declared in ARCHITECTURE | Count recall rows as raw, or omit a mixed-kind consumer; observe the wrong raw denominator, then restore. |
| FF-15302 | pending; labelled calibration and matcher not implemented | Weaken matching to admit a held-out same-topic negative; observe its false-positive failure, then restore. |
| FF-15303 | pending new assertions in an already-registered suite | Remove one declared edge's capture or one runtime render's capture; observe the missing edge/render failure, then restore. |

Executable checks, agent-run manual scenarios and human UAT must have separate evidence at build
and verify. A pending control is not acceptance; no item can close until the controls land and
their red probes have actual observed messages.

## Verification recovery — 2026-10-10

The live 153/01 Astra/high verification run `20261010T212005453Z-0004` successfully used Codex, then stopped when Windows denied test child processes with `spawn EPERM`. The native request to rerun `node test/integration/cli.mjs memory-recall-ledger` with elevated permission was declined by AOF's unattended adapter (`operator_action_required`). The runtime handoff correction is confirmed; native permission handling remains a live acceptance blocker.

The governing recovery session ran that exact scoped command through the host's approved execution tool: exit 0, every selected memory-recall-ledger scenario passed. This is executable evidence only; no story or milestone acceptance is claimed, and remaining review, fitness/manual checks and the regression gate remain required. The failed run is preserved. A bare `--resume` cannot retry this reason.
