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

Probes were run 2026-10-11 in a clean detached worktree at `187fa143`. Each mutation was restored byte for byte before the next one. After restore, the three controls, `test/memory/retrieval-eval.test.mjs`, FF-6207 and the effectiveness suite ran green: 59 ok, exit 0.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-15301 | `test/arch/memory/acd-recall-ledger-consumers.test.mjs` | GREEN | `packages/work/src/counters.mjs` `rawFeedback` changed to admit `kind === "recall"`. Observed: `raw feedback denominator is 5, expected 2`. |
| FF-15302 | `test/arch/memory/acd-memory-recurrence-calibration.test.mjs` | GREEN | `packages/knowledge/src/memory/recurrence.mjs` threshold 0.23 → 0.21, which admits the held-out negative at 0.2146. Observed: (a) `the recorded threshold is the shipped one — 0.23 !== 0.21`; (b) the zero-false-positive case failed on its deep-equal. The base-retrieval eval was green after restore. |
| FF-15303 | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` | GREEN | In `packages/core/assets/commands/continue.md`, the `record-recall` submission was replaced with a plain `recall`. Observed: `continue-developer's capture protocol is whole in packages/core/assets/commands/continue.md` failed. FF-12405 leg 9 also failed, on the manifest hash for `.claude/commands/aof/continue.md` (render parity). |

## Verification recovery — 2026-10-10

The live 153/01 Astra/high verification run `20261010T212005453Z-0004` successfully used Codex, then stopped when Windows denied test child processes with `spawn EPERM`. The native request to rerun `node test/integration/cli.mjs memory-recall-ledger` with elevated permission was declined by AOF's unattended adapter (`operator_action_required`). The runtime handoff correction is confirmed; native permission handling remains a live acceptance blocker.

The governing recovery session ran that exact scoped command through the host's approved execution tool: exit 0, every selected memory-recall-ledger scenario passed. This is executable evidence only; no story or milestone acceptance is claimed, and remaining review, fitness/manual checks and the regression gate remain required. The failed run is preserved. A bare `--resume` cannot retry this reason.

## Verification evidence — 2026-10-11

Run by the governing `aof:verify 153` session, inline, with no subagents. Every run below was isolated with `AOF_GLOBAL_HOME=$(mktemp -d)`.

### Executable lanes, scoped to each story

| Story | Lane | Result |
|---|---|---|
| 01 | `node --test packages/work/test/feedback.test.mjs` (native); `node test/integration/cli.mjs memory-recall-ledger` and `work-memory`; registered suites `work-counters`, `work-memory-command`, `memory-integration`, `graphify-backend-selection`, `memory-hooks-inert`, `acd-work-memory-routed`, `acd-board-write-isolation`, `acd-recall-ledger-consumers` | 16/16 native; integration 21 ok + 3 ok, exit 0 |
| 02 | `memory-lesson-recurrence` (integration); `memory-vocabulary`, `lesson-meta-hold`, `memory-meta-normalised`, `memory-recurrence`, `acd-memory-vocabulary-one-home`, `acd-memory-recurrence-calibration` | integration 9 ok, exit 0 |
| 03 | `memory-effectiveness` (integration); `memory-accounting`, `memory-effectiveness` (work and knowledge), `acd-controls-never-execute` | integration 23 ok, exit 0 |
| 04 | `acd-learning-edge-reaches-every-cut` (FF-15303) | green |
| 05 | `memory-tune-prompt` (integration); `tune-corpus`, `tune-proposal`, `tune-command`, `tune-distance`, `acd-tune-corpus-declares-its-reads`, `acd-tune-writes-nothing` | integration 16 ok, exit 0 |

The registered suites ran together as one `scripts/test.mjs --only` selection: 365 ok. The only reds in that selection were FF-11904 and 138/00. Both are the `packages/execution/src` budget row, inherited (see F-03).

### Agent-run `@manual` scenarios

Disposable demo stream: `demo153` in the session scratchpad. It holds milestone 10, whose R1 is the prior lesson; milestone 20 with story 01, an invoice refine and build; and shatter drivers 30 and 31. Everything in it was driven through the real CLI: `memory ingest/recall/record-recall/recurrence/status --lessons`, then `doctor`.

- **01/02 · omitted partition is detectable.** Procedure and observed message: FF-15301 above. verifies → `01_story_recalls-have-complete-verdict-records/tasks/02_preserve-feedback-and-retire-brief.feature` "The mixed-consumer control can detect an omitted partition".
- **02/02 · auditable threshold basis.** RESEARCH `## Recurrence threshold — measured at 153/02` records the labels, exclusions, frozen split, score rule and threshold 0.23 (strict `>`). It reports training precision and recall, and held-out precision 1.00, recall 0.50 (TP 3, FP 0). The named pair is detected and no held-out pair is a false positive. The weakening probe went red (FF-15302 above), and the base-retrieval eval was green after restore. verifies → `02_…/tasks/02_match-recurrences-from-labelled-evidence.feature` "The threshold has an auditable labelled basis and a failing negative probe".
- **03/01 · the refine and build observation path reconciles.** The demo ledgers hold four observations: refine-architect returned `10/R1` (honoured); refine-po returned nothing; continue-developer returned nothing; shatter-po on driver 30 returned `10/R1` (departed). A resubmission of the architect file answered `replayed: true` and added no row. The retrospective of milestone 20 wrote R1 with `Recurs: 10/R1`, matched by `memory recurrence` at score 0.753 against threshold 0.23. `memory status --lessons --json` reports `10/R1` as surfaced 2, honoured 1, departed 1, irrelevant 0, recurred 1, and `complete: true`, which reconciles row for row. Doctor reports `memory-lesson-recurs` for `10/R1`. verifies → `03_…/tasks/01_account-for-memory-effectiveness.feature` "The complete refine and build observation path is inspectable".
- **03/02 · removing the boundary check is observable.** In `packages/work/src/doctor/memory-effectiveness.mjs`, `later >= threshold` was changed to `later >= threshold - 1`, and `packages/work/test/memory-effectiveness.suite.mjs` went red. Observed: `153/03 E4: … quiet at four, present at five` failed, and so did `lesson 10/R1 is unpromoted (explicit none) at age 4 accepted milestones, default threshold 5 — 1 !== 0`. The change was restored and the suite is green. verifies → `03_…/tasks/02_report-recurring-and-unpromoted-lessons.feature` "Removing the boundary check is observable in the age fixture".
- **04/01 E1 · refine keeps two distinct role observations.** Milestone 20's ledger holds two recall ids. The architect's has `scope {"area":"code"}` and `10/R1` honoured; the PO's has `scope {"item":"20"}` and `records: []`. Each query is verbatim. verifies → `04_…/tasks/01_capture-declared-edges.feature` "E1".
- **04/01 E2 · an empty developer recall is still recorded.** Story 20/01's ledger has one `continue-developer` row with `scope {"kind":"near-miss"}` and `records: []`. No verdict was invented. verifies → "E2".
- **04/01 E3 · shatter captures once, under one owner.** Driver 30 owns the single `shatter-po` row (`scope {}`, the original query). Driver 31 has no `FEEDBACK.ndjson`. verifies → "E3".
- **04/01 · shatter with no driver invents no ledger.** `record-recall 99` answered `ref-not-found`, exit 1. No item and no `FEEDBACK.ndjson` were created. `shatter.md` step 1 states the rule. verifies → "Shatter without a created driver does not invent an item ledger".
- **04/01 · operator modifications survive regeneration.** `aof work update --dry-run --json` from the main checkout reported 165 skipped, 0 created, 0 updated, 0 drift-warning. The rendered Claude and Codex outputs equal what the renderer produces, so regeneration has nothing to clobber and no force-adopt is needed. verifies → "Existing operator modifications survive owned-output regeneration".
- **04/02 E4 · a new recurrence is stamped before ingest.** Shown twice. First in the demo: milestone 20's retrospective sets `promotionFrom: 1`, R1 carries `Recurs: 10/R1 · Promoted to: rule:AGENTS.md`, 10/R1 is untouched, and ingest ran after authoring. Second, live in 153's own `RETROSPECTIVE.md`: R1 was matched by `memory recurrence` to `146/R1` (score 0.252) before it was written. verifies → `04_…/tasks/02_compile-and-demonstrate-lessons.feature` "E4".
- **04/02 E5 and the unmatched lesson.** Live in this close. Story 04 surfaced no lesson, so it has no `RETROSPECTIVE.md`. Every new lesson whose recurrence came back `qualifying: null` carries no `Recurs` and an honest `Promoted to` (`none` unless a prevention already exists). verifies → "E5", "An unmatched lesson still carries an honest promotion answer".
- **05/02 · read-only behaviour survives a concrete proposal.** The E3 fixture was built through the feature's own Given steps, then `aof work tune --json` ran over a copy of it. The proposal was `prompt-or-brief-revision`, lane `advisory`, with no applier. Its patch was `from "# refine\nstep one\n"` to the same text plus a `<!-- aof:lesson 45/R13 -->` block. Before and after the run, all 48 files had identical sha256. Probe: `tune.mjs` `readContent` was given an `appendFileSync` to the target, and FF-6207 failed on `prompts\handoff.md` (Buffer 29 against 15). Restored and green. verifies → `05_…/tasks/02_compute-read-only-prompt-patches.feature` "Read-only behaviour survives a concrete prompt proposal".

## User sign-off

- **04/02 `@uat` · an operator traces a lesson from recall to repeated incident.** The operator inspected the demo stream's ledgers (`20_milestone_invoices`, `30_milestone_driver-30`), both retrospectives, and the `memory status --lessons` counts. Asked whether, without reading storage code, they could tell which advice was honoured, which later incident repeated it, and where its prevention now lives, the operator answered "Yes, it seems to look good" on 2026-10-11. This is a human response, recorded verbatim; no agent approval stands in for it.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The whole-tree gate (`REGRESSION.md` row of 2026-10-11) showed six reds that 153 introduced and its story lanes never selected. Four `work-memory-seam` cases still asserted the retired `brief` verb. 130/01's literal guard refused the recall verdict `"honoured"`. The `command-inventory` fixture lacked `work:memory`'s new flags. `yarn-installation` did not declare imports in five 153 work modules. The doctor-lane pin read 11. Attribution: the reds were measured at `9070395b` (before 153) and `98e0c98a` (after 153), against HEAD. | bug | blocker | fix in item | aof:verify | fixed: test-only corrections. `brief` is now asserted refused; `"honoured"` is scoped like `"requested"`; inventory entry 70; allowlist entries; pin 12. Re-run: none of these remain red. |
| F-02 | Run record `runs/node-7297/20261010T111015635Z-0003.json` disclosed a private term: the recorded answer's `by` handle, and an absolute path in a summary. `acd-no-internal-project-names` was red. | bug | blocker | fix in item | aof:verify | fixed: scrubbed with the repo rule; no other 153 file carries a term. The runtime still writes the operator's handle into the recorded answer, so every future asked run can repeat this. |
| F-03 | The branch carried reds that were not 153's: 36 already red at `9070395b`, and four added after `98e0c98a` by 156 and the MCP merge. | process | blocker (milestone door) | fix in item (operator: "fix issues inline", 2026-10-11) | aof:verify | fixed in `589cc9b6` and `84d94ae7`; gate green at `84d94ae7`. |
| F-04 | Stories 02, 03 and 05 each touched census and budget tests that their `files:` lists did not declare (STATE feedback). | process | non-blocker | lesson | RETROSPECTIVE R1 | recorded |
| F-05 | The recurrence matcher cannot detect a paraphrased lesson, or a free-prose lesson indexed by its title alone (RESEARCH, 153/02). | gap | non-blocker | defer | OUTCOME gap | recorded |
| F-06 | Under the default policy the real stream reports 738 `memory-lesson-unpromoted-aged` warnings, because legacy lessons have no promotion and acceptance age is read from `updated`. | gap | non-blocker | defer (a policy change is the operator's, per 153/03 Q1) | OUTCOME gap | recorded |
| F-07 | A tune candidate built from several lessons promoted to one prompt quotes only its canonical lesson, so the others are never proposed once that block is in force. | gap | non-blocker | defer (contract amendment to E3/E4) | OUTCOME gap | recorded |
| F-08 | `record-recall` publishes through `feedback.recorded`, so the acceptor census counts recall observations under the feedback label. It over-counts and never under-counts. | gap | non-blocker | defer | OUTCOME gap | recorded |
| F-09 | Several inherited reds were product regressions of delivered contracts, not stale tests. 156 leaked config paths into the loop's `sessions` provenance (143/03 says `config`). It refused `fable` (143's example). It widened Codex effort words for any `--model`, so `refine=:turbo` passed the door. It lent configured parts to Claude drives (143/03 task01). The MCP merge's per-file untracked listing made run records count as progress, so a stalled build never reset (69/06). 141/00 got a duplicate diagnostic, and the new disclosure had no focus ring (154/10). | bug | blocker | fix in item | aof:verify | fixed in `589cc9b6`. 156 remains `in-review`; its own verify should re-read these files. |
| F-10 | The 38-06 terminal-view preconditions waited at most 600 ms for a worker spawn, so they went red under the gate's 16-worker pool and once in its isolated retry. | bug | non-blocker | fix in item | aof:verify | fixed in `84d94ae7` (bound raised to 5 s, assertions unchanged). |

## Regression gate

Three runs of `aof work regression-gate 153`, each in a clean detached worktree with `ui/dist` built. All three rows are in `REGRESSION.md`:

| commit | result | what it showed |
|---|---|---|
| `187fa143` | red | About 46 cases red. Bisected against `9070395b` and `98e0c98a`: six were 153's (F-01, F-02) and the rest inherited (F-03, F-09). |
| `589cc9b6` | red | Three left: the declared-id golden had not learned 153/ADR-002's forward fields, and one timing-sensitive spawn wait (F-10). |
| `84d94ae7` | green | 12,659 cases, 29.0 min. Two units were red only in the pool and green alone. |

## Accept decision

Accepted on 2026-10-11. Five of five stories are done. Validate passes. Doctor shows no `control-unresolved`. FF-15301, FF-15302 and FF-15303 are green with observed red probes. The operator signed off the `@uat`. The regression gate is green at `84d94ae7`. No blocker finding is open; F-04 to F-08 are deferred non-blockers recorded in the outcomes' `## Gaps`.
