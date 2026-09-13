---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what evidence do we have that this milestone
  works? Owner: aof:verify (the product owner is the SINGLE WRITER of the findings register).
  Scaffolded at refine so the declared controls have a home for their red probes; the evidence rows
  are filled as each story lands, and the accept decision at the close.
-->
# 96 · The declaration earns its keep — Verification

## Fitness functions

<!-- CITING register (66/ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing itself. The red-probe cell
     records WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control, and this row is where a reviewer reads that it was observed failing. An
     assertion nobody has ever seen red cannot be falsified by its own green.

     An untouched placeholder cell is a MISSING red probe, not a recorded one. Every cell below is
     `pending` at refine and must be FILLED before accept, each probe applied to the working tree,
     run, REVERTED, and the restore confirmed byte-identical before the next probe begins.

     FOUR ROWS ARE NEGATIVE-SPACE CENSUSES, and their probes must PLANT what they forbid rather than
     remove what they require — a census green over a tree that never held the literal proves
     nothing until the literal has been planted and seen to red:
       · FF-9601's second-join leg. There is one transcript→item join today (the `sessionId` join,
         `work-observe.mjs:670-693`), the regex path having been retired under FF-6805. The probe
         plants a SECOND one — a ref-substring match — and observes the message.
       · FF-9602's never-writes leg. `story-contract-derive.mjs` will hold no write path on arrival;
         the probe plants one.
       · FF-9603's restatement ban. The shipped template will carry no path on arrival; the probe
         plants a file table into it.
       · FF-9604's single-selector leg. `selectSuites` is the only selector today; the probe plants
         a second selection function and observes the collision named.

     TWO ROWS GUARD A PROPERTY THAT ALREADY HOLDS AND MUST KEEP HOLDING, so their probes break the
     property rather than plant a violation elsewhere:
       · FF-9602's zero-imports leg — `src/story-contract.mjs` imports nothing today; the probe adds
         one import to it.
       · FF-9605's horizon leg — `src/acceptance-horizon.mjs` imports nothing today (66/ARCHITECTURE
         ROUND 3/3); the probe homes the gate read there, which is the design this milestone
         explicitly refused, so the probe is also the record of why it was refused.

     DELIBERATELY NOT RESTATED HERE, because a guard already in service walks the whole subject and
     would already fail on the breach — each is named in ARCHITECTURE.md's register with where it is
     discharged, and none is a gap:
       · 72/FF-7202 (the selector never narrows on an unknown, and no flag exists to make it) and
         72/FF-7203 (one registration decider). FF-9604 asserts the NEW INPUT cannot smuggle a
         narrowing past them; it restates neither claim.
       · 72/FF-7201 (`src/work-toolchain.mjs` is the only module in `src/` that may read
         `work.test.*`). ADR-007's producer reads a story's frontmatter, never config.
       · 66/`acd-acceptance-horizon-single-predicate` (one predicate, one home). ADR-008 §3 puts the
         door OUTSIDE it precisely so that control stays green.
       · m16/ADR-007's budget controls (a doc at its budget is healthy; over-budget refuses only at
         the accepting item's scoped preflight). ADR-006 adds a row to their map and claims nothing
         about their behaviour.
       · 59/FF-5903 (a suite imported and never spread is not registered) — which is why
         `scripts/test.mjs` is in every story's `files:`. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-9601 | `test/arch/acd-attribution-is-captured-or-absent.test.mjs` | **green** (4/4, 2026-09-04) | **PLANTED a second transcript→item join** — `const widenedRef = sessionId.includes(itemRef ?? "") ? itemRef : null;` beside the `sessionToItem.get(sessionId)` line in `src/work-observe.mjs`. Claim (1b) went RED: *"src/work-observe.mjs tests a ref against prose or a session directory name: `sessionId.includes(itemRef`"*. Reverted; `src/work-observe.mjs` restored byte-identical (`sha256 653ff056…`) |
| FF-9602 | `test/arch/acd-derivation-proposes-never-writes.test.mjs` | **green** (6/6, 2026-09-04) | **TWO probes, one per leg.** (a) *never-writes* — PLANTED `import { writeText } from "./fs.mjs";` + `export async function persistProposal(file, text) { await writeText(file, text); }` into `src/story-contract-derive.mjs`; claim (2) RED: *"the derivation reaches /\bwriteText\b/ — it proposes; the author subtracts (ADR-004 §5)"*; restored `sha256 11c9cafc…`. (b) *zero-imports* — BROKE the standing property by prepending `import * as horizon from "./acceptance-horizon.mjs";` to `src/story-contract.mjs`; claim (1) RED: *"the parser imports only node builtins (found: ./acceptance-horizon.mjs)"*; restored `sha256 aa2e18fd…`. **Method note (F-96-F):** the first attempt at (b) imported a module that does not exist, and the runner died at link time printing NO `not ok` — a probe that names an unresolvable specifier proves nothing, because `scripts/test.mjs` imports the tree eagerly |
| FF-9603 | `test/arch/acd-plan-restates-no-declared-path.test.mjs` | **green** (5/5, 2026-09-04) | **PLANTED a file table into the shipped template** — appended `## Files` + a two-column table whose header names a `file` column, carrying the row `src/work-observe.mjs` to `src/bundle/templates/story/PLAN.md`. Claim (1) RED: *"src/bundle/templates/story/PLAN.md restates a declared path: file-column-table @72 (file)"*. Reverted; restored byte-identical (`sha256 280c9770…`) |
| FF-9604 | `test/arch/acd-one-selector-one-changed-set.test.mjs` | **green** (5/5, 2026-09-04) | **PLANTED a second selection function** — appended `export function chooseSuites(paths) { return paths; }` to `src/work-test-declared.mjs`. Claim (1) RED, naming the collision: *"suite selection must have exactly one home — found src/work-test-declared.mjs, src/work-test-select.mjs"*. Reverted; restored byte-identical (`sha256 6c03b584…`) |
| FF-9605 | `test/arch/acd-gate-door-lives-in-the-command-layer.test.mjs` | **green** (6/6, 2026-09-04) | **BROKE the standing property by homing the gate read where this milestone refused to put it** — prepended `import { readFile } from "node:fs/promises";` to `src/acceptance-horizon.mjs` and appended `export async function gateIsGreen(dir) { return readFile(dir + "/REGRESSION.md", "utf8"); }`. Claim (1) RED: *"src/acceptance-horizon.mjs must import NOTHING — 66/02's FF-6605 forbids the controls lane reaching node:fs through its direct imports, which is why the gate door is in the command layer"*. The probe is therefore also the record of why ADR-008 §3 put the door outside. Reverted; restored byte-identical (`sha256 a2acbd3b…`) |
| FF-9606 | `test/arch/acd-gate-result-is-evidence.test.mjs` | **green** (5/5, 2026-09-04) | **MOVED the record out of the item's own folder** — changed `regressionRecordPath` in `src/regression-record.mjs` from `path.join(itemDir, REGRESSION_RECORD_BASENAME)` to `path.join(itemDir, "runs", REGRESSION_RECORD_BASENAME)`, which is 78/ADR-001's forbidden home. Claim (1) RED: *"the record is a peer of the item's other records"*, with the actual resolving under `…/70_milestone_gate/runs`. Reverted; restored byte-identical (`sha256 79b236e3…`) |

## Verification evidence

<!-- One row per verification claim. Filled as each story lands; the milestone gate rows at accept. -->

| claim | procedure | result | verifies → |
|---|---|---|---|
| The milestone's `@executable` suite is green | `node scripts/test.mjs --only` over this milestone's eleven suites and the seven it modified, under `AOF_GLOBAL_HOME=$(mktemp -d)` | **PASS** — 205 assertions, 0 failures; 218 once the four controls the gate found red were repaired | 96/00–96/04, all tasks |
| Every declared control is REGISTERED, not merely present | read `scripts/test.mjs` for the import and the spread of each of the eleven suites (59/FF-5903's shape, applied by hand because `work.controls.runners` is unset) | **PASS** — all eleven imported at `scripts/test.mjs:3463-3499` and spread at `:4875-4890`; none imported-and-never-spread | ARCHITECTURE.md `## Fitness functions`, all six rows |
| **The whole fitness tier, run once at the milestone gate** | `aof work regression-gate 96` — the whole-tree run on a clean checkout | **GREEN, 2026-09-04T20:54:51Z @ `9fe8df37`, scope `all`, 30m48s** — *"may stand as the accept gate"*. It took SIX runs to get an honest one, and the five reds before it are kept in `REGRESSION.md` as this milestone's history rather than deleted | every `FF-NN` in this repository, 96's six included |
| **The accept door refuses a milestone with no gate record — driven live, on this milestone** | `aof work status 96 done` against the real stream, with no `REGRESSION.md` present | **PASS** — refused: *"no regression gate has run — there is no REGRESSION.md beside its records…"*, and `aof work status 96` still read `in-progress` afterwards, so the refused move wrote nothing. The gate refusing its own milestone is evidence FOR 96/04 | 96/04, tasks 01 and 02 |
| The stream is well-formed at the gate | `aof work validate 96` | **PASS** — "96 is well-formed" | the milestone's own gate |
| Every declared control resolves and is registered | `aof work doctor 96`, reading `control-unresolved` at BOTH severities | **PASS** — zero `control-unresolved` at either severity. Three warn classes stand and none is this check: `numbering-gap` (stream-wide), `control-runner-unchecked` (no `work.controls.runners` configured — discharged by hand in the row above), and `rubric-join-unchecked` on all five stories | ARCHITECTURE.md `## Fitness functions`, all six rows |
| **The phase-path mint writes a joinable run record — driven live through the shipped command, not the suite** | in a throwaway `aof work init` stream, from a tool shell with `CLAUDE_SESSION_ID` **unset**: `aof work run-start 00 --json`, then `aof work run-start 00 --session <id>` | **PASS** — the record lands under the item's own `runs/` carrying `itemRef: "00"`, `state: "running"` and the frozen field set unchanged. With no live session resolvable it answers `sessionId: null` — ADR-001's "ambiguity is absence", not a guess; with the flag rung it answers the id verbatim, which is the exact key `work-observe.mjs`'s join reads. A second mint on an open run is refused `duplicate-run` | 96/00, all tasks |
| **The milestone's own thesis is measurable, and it is the accept oracle** | `aof work observe 96` after the phases have minted run records, compared with the committed standalone miner over the same window | **RECORDED NEGATIVE RESULT — F-96-C.** `Run records: 0`, 418 unattributed. Root cause measured and FIXED: the installed bundle had not been refreshed since `2026-08-06`, so `.claude/commands/aof/{continue,refine}.md` predated story 00 and carried no mint. `aof work update --force` re-installed it. **96's own before/after stays unrecoverable** — its five stories were built by phases running the old prompts, and no phase can mint a record for a run that has finished. Discharge condition: the next milestone's first `/aof:continue` | 96/00, all tasks |
| **`aof-developer`'s cache-creation per run, before and against 96** | the same snapshot, per role | **NOT MEASURABLE — dependent on the row above.** With no run records the per-role table is empty, so the milestone's headline claim (the builder's 2,059,059 falls further than the architect's 793,788 rises) is neither confirmed nor refuted. Recorded as unmeasured, not omitted | 96/01, 96/02 |

## Findings

<!-- The seven columns, with the id ALONE in the first cell. A reviewer reports findings UNNUMBERED;
     the single writer allocates each id here, at the moment of landing it. Findings live here, never
     in a task folder. -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-96-A | **This milestone's own code turned two shipped controls RED.** `acd-codebase-grounding-no-parse` and `acd-codebase-grounding-via-commands` both failed naming `src/story-contract-derive.mjs` as a NEW `src/` module reading the graph outside their frozen allow-lists. 96/ADR-004 sanctions exactly that read, so the decision and the two controls disagreed for two stories | defect | blocker | **FIXED.** Added to both frozen allow-lists, each entry citing 96/ADR-004 and stating why the read is legal — through `normalizeGraph`/`computeImpact` alone, with no second parse, no build and no spawn, all three asserted independently by FF-9602. Neither honest-allow-list leg was weakened | **96/01** — the two control files added to its `files:` | **closed** |
| F-96-B | **A shipped bundle control was RED on 96's own prose.** `acd-status-flag-on-starting-moves-only` failed on `src/bundle/commands/continue.md`. The prose is 96/00's and CORRECT — it exists to FORBID the move — but the control reads every bundle occurrence of the invocation as an instruction | defect | blocker | **FIXED — the prose, not the control.** 74/02's claim was not weakened to admit a negation context it cannot reliably distinguish. The sentence now names the move without spelling an invocation | **96/00** — `src/bundle/manifest.json` added to its `files:` | **closed** |
| F-96-C | **The milestone's own accept oracle reported `runs.count: 0`.** Root cause: the installed bundle had not been refreshed since `2026-08-06`; `.claude/commands/aof/continue.md` differed from source by 1,012 diff lines and carried no `run-start` mint, so story 00's mechanism had never once executed | defect | blocker | **PARTLY DISCHARGED.** The deploy gap is closed (`aof work update --force`) and the mechanism confirmed live through the shipped command. 96's own before/after is unrecoverable and recorded as a negative result. **The carryable lesson: a bundle change is not delivered until it is installed**, and nothing in the build or review lane installs it | **96/00** discharged; measurement is the next milestone's first `/aof:continue`; `RETROSPECTIVE.md` owns the lesson | **open** (measurement only) |
| F-96-D | **The gate could not run on the node that had to accept it.** Two grounds: a dirty tree (by design), and `EADDRINUSE 127.0.0.1:4182` — the live control daemon held the port `global-work-propagation.test.mjs` binds | design-gap | blocker | **CLEARED.** The operator quit the desktop supervisor, freeing `:4182`; 96 was committed, and the gate ran on a clean checkout. `--gate-override` was NOT spent — the milestone that introduced the gate passed it | operator; no residual | **closed** |
| F-96-E | **Five pre-existing reds, none of them 96's, blocked the gate.** `FF-5308` (m53), `FF-6807` (m68), `acd-command-layer-imports-downward` ×2 (chore 116) and `FF-5905` (chore 114). A whole-tree gate is all-or-nothing, so 96 could not go green while any stood | defect | blocker | **ALL FIVE FIXED** at the operator's direction, rather than overridden. The most instructive: **m42 and m78 shipped directly contradictory controls** — 78/FF-7802 REQUIRES `src/loop-record-render.mjs` to import `KIND_SHAPES` from `commands/loops-graph.mjs`, m42 wave (d) FORBIDS any src-root module importing `commands/*`. Both are right; neither could hold while the table sat in the command. Cured m42's own way — the table moved down to `src/loop-graph-shapes.mjs`. `FF-5308` was a NECESSITY leg firing because TECH_DEBT 49 was paid, retired by INVERTING so the fix stays guarded; `FF-6807` matched `truncate` inside a comment saying the writer does NOT truncate; `FF-5905`'s roster listed six lane modules where the spine imports seven | **chores 114 and 116** — work done, records not yet closed | **open** (chore records) |
| F-96-F | **A red probe against an unresolvable import proves nothing, silently.** Method finding: `scripts/test.mjs` imports the tree eagerly, so a probe naming a module that does not exist kills the runner at link time — zero `ok`, zero `not ok`, and "no failures" reads as green | test-gap | non-blocker | **non-blocker.** No control is wrong; the probe method was. A probe harness must assert the run actually RAN — a non-zero exit with zero `not ok` lines is a crashed runner, not a passing control | `RETROSPECTIVE.md`; recorded inline in the FF-9602 cell | open |
| F-96-G | **THE GATE RECORDED FIVE KILLED RUNS AS COMPLETED ONES — a defect in 96/04's own deliverable, found by using it.** `work.test.deadlineMs` was `900000` (15 min); the whole-tree suite is the JS lane (~10 min) PLUS the `app/desktop` cargo build, and the completed run measures **30m48s**. Every earlier gate run was killed mid-flight and recorded as an ordinary `red` with a PARTIAL failure list. Measured, not inferred: at `e64e5d46` a direct `node scripts/test.mjs` enumerated 5 failures and the gate's row recorded 2 — everything recorded sat at runner spread line **<4100**, everything missed at **>4500**; the fourth run recorded `"the runner exited with no verdict and enumerated no failure"`, `failureDetail`'s fallback for a child that never produced a parseable result. The TAP normaliser was cleared by experiment: fed the real output it extracts all 12 | defect | non-blocker | **The immediate cause is FIXED** (`deadlineMs` → `2700000`) and the residual is a real gap in FF-9606: it asserts a run that was NARROWED or WIDENED is recorded and fails the door, and says nothing about a run that was KILLED. **Nothing in a row lets a reader tell a truncated red from a completed one.** The safety property does hold — `green` requires `exit === 0 && failures.length === 0`, so a killed run cannot read green — so this degrades the EVIDENCE, not the door, which is most of what the document is for. Discharge condition: a row carries the run's completion state, and an incomplete run is recorded as such rather than as a red | **`OUTCOME.md` `## Gaps`**, open with a discharge condition; a follow-on item on 96/04's surface | open |
| F-96-H | **Two rows synchronised on a 25ms sleep and went red only under the gate.** `mesh-coordination-launcher/03` fired an async ticker then slept a flat 25ms before asserting. On an idle machine that is plenty and both rows pass standalone every time; inside the 30-minute whole-tree run the presence write had not landed and the row read a stale `heartbeatAt`. Reproduced across two completed gate runs | defect | blocker | **FIXED.** The wait is now the assertion's own predicate, polled — it returns the moment the condition holds, so the fast path costs nothing, and throws naming what never became true. Checked non-vacuous: a predicate that never holds still times out loudly. **This is the gate earning its keep in the plainest way** — a timing assumption that no story-scoped lane could ever have surfaced, because it only fails under whole-suite load | the test's own file; no residual | **closed** |

## Sign-off

<!-- Filled at accept by `aof:verify 96`. -->

### Accept decision — **ACCEPTED, 2026-09-04**

Milestone 96 is accepted on a **green whole-tree gate** — `9fe8df37`, scope `all`, 30m48s,
2026-09-04T20:54:51Z — with `--gate-override` unspent. The milestone that introduced the regression
gate passed it rather than excusing itself from it, which was the point.

**The gate paid for itself before it was accepted.** Across six runs it caught, in order: two
controls 96's own code broke (F-96-A), three separate controls one story's prose edits broke
(F-96-B and the FF-7106 / FF-7102 / span pair), five pre-existing reds nothing had run in months
(F-96-E) — including **two shipped controls that directly contradict each other** — a defect in its
own recording (F-96-G), and a timing assumption that only fails under whole-suite load (F-96-H).
Every one of those was invisible to every story-scoped lane. That is 63/R7's lesson, demonstrated on
the milestone that shipped the cure.

Evidence:

- **218 assertions green** across the eleven suites 96 ships, the seven it modified and the four
  controls the gate found red. `aof work validate 96` PASS; `aof work doctor 96` reports zero
  `control-unresolved` at either severity; all eleven suites confirmed imported **and** spread.
- **All six declared controls carry a recorded red probe** — applied to the working tree, run,
  reverted, restore confirmed byte-identical before the next began. FF-9605's probe doubles as the
  record of why ADR-008 §3 put the door outside `src/acceptance-horizon.mjs`.
- **Both new doors driven live on real state**: `aof work status 96 done` refused
  `regression-gate-missing` and wrote nothing; `aof work run-start` wrote a joinable record from a
  shell with `CLAUDE_SESSION_ID` unset.

Two things are accepted as KNOWN GAPS rather than quietly closed, and both are in `OUTCOME.md`:

1. **The milestone cannot measure its own thesis** (F-96-C). `aof work observe 96` reports
   `runs.count: 0` because the installed bundle predated story 00, so the mint never ran during 96's
   own build. The mechanism is delivered, tested and confirmed live; the before/after is not
   recoverable for 96 itself.
2. **A killed gate run is recorded as a completed one** (F-96-G). The deadline that caused it is
   fixed; the row shape that hides it is not.

Open, routed, non-blocking: chores **114** and **116** have their work done and their records not yet
closed; F-96-F and F-96-G carry lessons into `RETROSPECTIVE.md` and `OUTCOME.md` respectively.
