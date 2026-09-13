---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what evidence do we have that this milestone
  works? Owner: aof:verify. Scaffolded at refine so the declared controls have a home for their red
  probes; the evidence rows are filled as each story lands, and the accept decision at the close.
-->
# 61 · The disciplined acceptor — Verification

## Fitness functions

<!-- CITING register (66/ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing itself. The red-probe cell
     records WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control, and this row is where a reviewer reads that it was observed failing. An
     assertion nobody has ever seen red cannot be falsified by its own green.

     FOUR ROWS EXTEND A GUARD ALREADY IN SERVICE — FF-6104 (66's horizon guard), FF-6109 (69's
     ceiling-consumption guard), FF-6111 (53/69's cap single-home guard) and FF-6108's
     effects-ledger leg. For those the red probe is the ONLY evidence the change is armed, because
     the file was already green before this milestone touched it.

     Every probe below was applied to the working tree, run, and REVERTED byte-for-byte (sha256 of
     the file before and after the probe compared, and `git status --short` confirmed unchanged
     against the pre-probe baseline: the same 11 modified paths and 4 untracked paths, the same
     367/34 diff stat). Assertion counts are the 61-owned legs the control declares; where a control
     file also carries an earlier milestone's legs, those are not counted here. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-6101 | `test/arch/acd-acceptor-rule-is-one-object.test.mjs` | green — 8/8 assertions pass (`aof:verify 61`, 2026-08-31) | `const PLANTED_THRESHOLD = 8;` added to `src/work-acceptor/rule.mjs`. Red: *"src/work-acceptor/rule.mjs holds the literal 8 — that is N, the earliest crossing, and a literal is a number that SURVIVES a revision of the criterion it should follow (61/ADR-001 §2)."* Reverted. |
| FF-6102 | `test/arch/acd-trial-metric-declared.test.mjs` | green — 5/5 assertions pass (`aof:verify 61`, 2026-08-31) | Two probes, and the FIRST is part of the evidence: `const PLANTED_METRIC = "roundsToAccept";` (a STRING) left the control GREEN — correct, and the distinction the control declares: a pointer is data an operator edits. Re-cut as an identifier — `export const plantedProbe = (counters, items) => counters.roundsToAccept(items);` in `rule.mjs`. Red: *"src/work-acceptor/rule.mjs spells \"roundsToAccept\" in CODE — the criterion holds the metric as a pointer and the engine resolves it, so a name held here is the engine knowing which metric it scores (61/ADR-002 §5)."* Reverted. |
| FF-6103 | `test/arch/acd-per-knob-sizing.test.mjs` | green — 6/6 assertions pass (`aof:verify 61`, 2026-08-31) | `rawPairsFor`'s integer form `Math.floor((numerator + denominator - 1) / denominator)` replaced with the float path `Math.ceil(criterion.B / (1 - rate.n / rate.d))` in `src/work-acceptor/rule.mjs`. Red: *"the declared rational gives 110 raw pairs, exactly"* — the planted 90% case returning the float path's 111. Reverted. |
| FF-6104 | `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` *(extended)* | green — 5/5 61-owned assertions pass (`aof:verify 61`, 2026-08-31); the file also carries 66/FF-6602's legs, all green | EXTENDS a guard already in service, so this probe is the only evidence the new leg is armed. `closesEpoch`'s parameter renamed `status` → `to` in `src/acceptance-horizon.mjs` — the exact defect ADR-004 §1 names, a predicate written against the field the LIFECYCLE TABLE spells rather than the one the payload carries. Red: *"one parameter, named for the payload's own field"* — actual `'to'`, expected `'status'`. Reverted. |
| FF-6105 | `test/arch/acd-criterion-frozen-in-epoch.test.mjs` | green — 8/8 assertions pass (`aof:verify 61`, 2026-08-31) | `rulingsUnderCurrentCriterion`'s maximal trailing run `Object.freeze(list.slice(start))` replaced with a filter `list.filter((ruling) => digestValue(ruling?.criterion) === current)` in `src/work-acceptor/criterion.mjs`. **2 of 8 went red**: *"only the trailing run counts"*, and the control's own RED PROBE leg — *"Expected \"actual\" to be strictly unequal to: 2"*, a criterion revised and revised BACK resurrecting the superseded ruling. Reverted. |
| FF-6106 | `test/arch/acd-acceptor-ledger-accrues-across-epochs.test.mjs` | green — 7/7 assertions pass (`aof:verify 61`, 2026-08-31) | `"dwellExpiry"` added to `RULING_KEYS` in `src/work-acceptor/ledger.mjs` — the computed field ADR-006 §3 bans by name. **6 of 7 went red**: the frozen-set leg (*"two independent statements of one frozen set"*, actual `+ 'dwellExpiry'`) and five construction refusals *"Refusing the ruling: dwellExpiry is missing. A ruling is the record justifying a configuration change, and a blank in it is the missing \"why\"."* Reverted. |
| FF-6107 | `test/arch/acd-observation-census-filtered.test.mjs` | green — 6/6 assertions pass (`aof:verify 61`, 2026-08-31) | `const PLANTED_ROOT = "dispatch-worktrees";` added to `src/work-acceptor/observations.mjs`. **2 of 6 went red**: *"`dispatch-worktrees` is spelled in exactly one module under src/"* — actual `+ 'work-acceptor/observations.mjs'` — and *"the census spells no dispatch-worktrees literal of its own"*. Reverted. |
| FF-6108 | `test/arch/acd-harness-ruling-ledgered.test.mjs` | green — 9/9 assertions pass (`aof:verify 61`, 2026-08-31) | A TENTH event name, `"harness.planted"` with a reactor of its own, added to `EFFECTS` in `src/effects/table.mjs`. Red: *"the vocabulary gained exactly one name: run.started, run.completed, feedback.recorded, item-status.changed, stream.reindexed, assignment.reported, terminal.resume-refused, assignment.settled, harness.ruled, harness.planted"* — the control names the whole vocabulary back, so the tenth is visible rather than merely counted. Reverted. |
| FF-6109 | `test/arch/acd-progress-ledger-consumed.test.mjs` *(extended)* | green — 3/3 61-owned assertions pass (`aof:verify 61`, 2026-08-31); the file also carries 69/F-69-V7 and F-69-V8's legs, all green | EXTENDS a guard already in service, so this probe is the only evidence the new leg is armed. Two probes, and the FIRST is part of the evidence: a planted decision-site consumer for ONE knob left the control GREEN — correct, the leg is shrink-only by design (a knob that gains a consumer drops out without the gate needing an edit). Re-cut as `src/commands/planted-consumer.mjs` carrying `if (taken >= bound) return "stop"` for ALL THREE declared knobs. **Both legs went red**: *"…and not one of them has a CONSUMER: a vacuous control is the failure this exists to prevent"* and *"the mutation has something real to remove"*. File deleted. |
| FF-6110 | `test/arch/acd-tunable-set-is-the-registry.test.mjs` | green — 5/5 assertions pass (`aof:verify 61`, 2026-08-31) | Two probes, and the FIRST is part of the evidence: `const PLANTED_KEY = "work.loop.reviewRounds";` (a STRING) left the control GREEN — correct, and the line the control declares: a key quoted in a diagnostic is not a claim of membership. Re-cut as a key ACTED ON — `export const plantedKnob = (config) => config?.work.loop.reviewRounds;` in `rule.mjs`. Red, with two entries: *"src/work-acceptor/rule.mjs spells \"work.loop.\" in CODE"* and *"…spells \"work.loop.reviewRounds\" in CODE — the tunable set is the registry's `parameter-tuning:` edge, and a key this machinery acts on is a second home for it (61/ADR-008 §4)."* Reverted. |
| FF-6111 | `test/arch/acd-loop-cap-single-home.test.mjs` *(extended)* | green — 3/3 61-owned assertions pass (`aof:verify 61`, 2026-08-31); the file also carries 69/FF-6901 and 53/FF-5310's legs, all green | EXTENDS a guard already in service, so this probe is the only evidence the new leg is armed. The clamp removed AT ITS OWN FUNNEL: `resolveBuildNoProgressRounds`'s `Math.min(positiveInteger(…), MAX_BUILD_NO_PROGRESS_ROUNDS)` replaced with `Math.max(positiveInteger(…), 0)` in `src/loop-bounds.mjs` — the value still resolves, and nothing else in the tree changes. Red: *"work.loop.buildNoProgressRounds: resolve(ceiling + 1) !== ceiling + 1"* — ADR-009 §2's probe no longer bounding anything. Reverted. |
| FF-6112 | `test/arch/acd-report-only-is-the-default.test.mjs` | green — 1/1 assertion passes (`aof:verify 61`, 2026-08-31), re-confirmed after 61/06's review and its Blocker fix | `strict: { type: "boolean", description: "planted" }` added to `acceptorCommand.cli.spec.flags` in `src/commands/acceptor.mjs` — ADR-010 §3's refused flag. Red on the no-strict-flag assertion (`Object.hasOwn(…, "strict")` expected `false`). Reverted. |
| FF-6113 | `test/arch/acd-dwell-gates-reversion-only.test.mjs` | green — 1/1 assertion passes (`aof:verify 61`, 2026-08-31), re-confirmed after 61/06's review and its Blocker fix | The harm path given a dwell term: `withdrawalOnHarm`'s `degraded` predicate extended with `&& String(record?.dwell ?? "").length < 9` in `src/commands/acceptor.mjs`. Red: *"changing dwell cannot change the harm path's answer"* — the long-dwell record answering `withdraw: false, to: null, trigger: null` against the short-dwell record's `withdraw: true, to: 1`. Reverted. |

## Verification evidence

<!-- Filled story by story as each lands, and at the milestone gate. Pointers and measurements, not
     restatements of the contract. -->

| subject | lane | what was run | result | contract |
|---|---|---|---|---|
| 61 (stream) | gate | `aof work validate 61` | **PASS — 61 is well-formed** (at refine, 2026-08-30) | — |
| 61/00 … 61/06 | `@executable` | the whole assembled unit array from `scripts/test.mjs` — **7,856 entries**, run at the first milestone gate by test-array import under a per-test hermetic `AOF_GLOBAL_HOME` (the same isolation `runSuite` applies) | **7,856 / 7,856 green** | all 26 task `.feature` files across 61/00–61/06; every one is `@executable`, and there is no `@manual` and no `@uat` scenario in this milestone |
| 61/06 | review | the structural + behavioural review the story had never had (D-61-3), run at this gate | **one Blocker (D-61-6) found and fixed**, seven uncovered contract obligations closed; the story's behavioural suite went 9 → 16 entries | 61/06's five task `.feature` files |
| 61/06 | regression | the evidence-source fix run against its own lock: the old expression restored, the new regression re-run | **red — _"the caller's sequence is not evidence"_**; restored, `git status` clean on the probed file | ADR-005 §1a |
| 61/00 … 61/06 | `@executable` | the whole assembled unit array again, **after** the review's fix and the seven new cases — **7,863 entries** | **7,863 / 7,863 green**, 0 failures | as above |
| 61 (stream) | `@executable` | `test/integration/cli.mjs` with `AOF_IN_PROCESS_INTEGRATION=1`, before and after the fix | **131 / 131 green** both times, 0 failures | the integration lane `runSuite` runs after the unit array |
| 61 (stream) | gate | `aof work validate 61` | **PASS — 61 is well-formed** (at the close, 2026-08-31, with all seven stories done) | — |
| 61 (health) | gate | `aof work doctor 61` | **no `control-unresolved` at EITHER severity** — all 13 declared controls resolve, and all 13 now read `landed` in `ARCHITECTURE.md` rather than `pending`. 9 warns, every one a pre-existing class: one `numbering-gap` (the top-level driver sequence), one `control-runner-unchecked` (TECH_DEBT 69 — `work.controls.runners` has never been set in this repo), seven `rubric-join-unchecked` (one per story; `work.rubric.report` declares no `path`, D-59-2's standing residue). Loop-Ready 80% (8/10) | ADR-012; the accept rule's `control-unresolved` gate |
| the 13 declared controls | fitness | each control run green, then run again with the invariant it guards deliberately broken | **13 / 13 observed failing**, messages in the register above; working tree restored byte-for-byte after every probe | `ARCHITECTURE.md` `## Fitness functions` |

**How the suite was run, and what was NOT run.** `node ./scripts/test.mjs` is refused on this machine
(the project rule forbids the full suite here: `global-work-propagation.test.mjs` binds `:4182`, which
the control daemon holds). The sanctioned path was used instead — importing the assembled `tests`
array from `scripts/test.mjs` and running every entry with the same per-test hermetic
`AOF_GLOBAL_HOME` the real runner applies, which executes the identical array. The **cargo lane**
(`app/desktop`) was NOT run: it is not part of the unit array, and no Rust source is in this
milestone's file set.

**One reported failure in the FIRST run was an artefact of the runner, not of the tree, and is
recorded rather than quietly dropped.** `build-sea-recipe-guards/F14 refuses an --out that resolves to
the repo root` came back red — *"`--out .` from the repo root is refused"*. Cause: the runner's import
specifier spelled the drive letter lowercase (`file:///c:/…`), which propagated a lowercase
`import.meta.url` through the whole module graph, so `repoRoot` read the drive letter in lower case
while `process.cwd()` read it in upper case, and the case-sensitive comparison missed. Re-run with the
casing corrected, all 8 entries in that file are green, and the second full run — which used the
corrected runner throughout — reports 0 failures across all 7,863. Nothing in `src/` was involved.

## Findings

<!-- Register for milestone 61. Ids allocated HERE, at the moment of landing, by the single writer
     (`aof:verify`'s product owner) — never read-then-allocate. The `D-61-` series is shared with
     STATE's decisions: D-61-1 and D-61-2 were allocated at refine, so this register opens at 3. -->

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| D-61-3 | **61/06 reached the acceptance gate built but never reviewed, with its `status:` line hand-edited to say otherwise.** Four independent measurements agreed. (a) The fleet cache still held `in-progress` for 61/06 (`aof work find "61/06" --json`, `syncedAt` 2026-08-30T21:51:41Z) while its `STORY.md` on disk read `in-review` — `aof work doctor 61` reported the divergence as `cache-status-divergence`, and the only way to move a status without moving the cache is to edit the file by hand. **That divergence no longer reproduces**: accepting 61/00–61/05 through the verb re-synced this node's report, so the measurement stands as recorded evidence rather than as something a later reader can re-run. (b) `STATE.md` carried a *"From 61/0N's build and review"* section for 61/01 … 61/05 and none for 61/06. (c) There was no build commit, no `61/06 → in-review` commit and no merge commit for it. (d) The last thing STATE recorded about 61/06 was the re-refine, which closes with *"nothing was built"*. Confirmed with the operator at the gate | process | **blocker** | **RESOLVED at this gate, by running the gate rather than re-marking the file.** `aof work status 61/06 in-progress` corrected the record through the verb; the structural + behavioural review then ran and found D-61-6; the fix landed; the verb moved the story to `in-review` and then to `done`. The review is recorded in `STATE.md` | 61/06 | **closed** |
| D-61-6 | **The reporting face preferred evidence carried on its CALLER's proposal to the evidence in the ledger.** `evidenceFor` read `Array.isArray(proposal.sequence) ? proposal.sequence : recorded`, and `acceptorCommand.input` declares `proposals` as an array of unconstrained objects — so `run({ proposals: [{ key, from, to, sequence: <eight wins>, counterMetric, epochId }], commit: key })` granted an explicit commit on evidence the caller supplied, never reading the store and skipping the criterion-digest suffix `rulingsUnderCurrentCriterion` applies on the way in. That is ADR-005 §1a's *"enforcement point that cannot be routed around"*, routed around through `input`. **The story's own test drove that exact path and asserted `applied: true`**, which is why a green suite did not catch it: the defect and its test agreed | correctness | **blocker** | **FIXED in-lane.** Evidence comes from the ledger, full stop — a proposal names a key and a step and says nothing about how much evidence stands behind it; `input` is caller input and the ledger is read at the composition root. Locked by a new regression (*"the evidence is the LEDGER's — a proposal cannot hand in its own, and a superseded criterion's rulings do not count"*) and red-probed: restoring the old expression turns it red with *"the caller's sequence is not evidence"* | 61/06 | **closed** |
| D-61-4 | `STATE.md`'s `## Progress` roll-up read `not-started` for all seven stories while six were `in-review` and their work merged. The roll-up's own comment says the source of truth is each `STORY.md`, so nothing downstream was wrong — but it is the at-a-glance answer for anyone reading the milestone, and it had been wrong since the first story landed | record | non-blocker | **RESOLVED** as part of the STATE compaction at this accept | 61 `STATE.md` | **closed** |
| D-61-5 | `trial-unit-undeclared` names **two subjects** in `src/work-acceptor/rule.mjs` — a malformed tie rate (thrown at `rawPairsFor`, `:258`) and a knob with no trial unit (`basket.refusal`, `:308`). That is the species `src/work-acceptor/admissibility.mjs:64-67` indicts by name — *"one code for two subjects is a finding nobody can act on"* — and it breaches ADR-013 §3's own discipline. Found at 61/06's re-refine and recorded in ADR-013 §3, but not ledgered anywhere a backlog sweep would find it | design | non-blocker | **DEFERRED and ledgered** as `TECH_DEBT` item 77, owned by `rule.mjs`'s owner. Not a blocker: both subjects are construction refusals, so neither reaches the ruling lane under either reading, and the two messages already differ so the face renders them apart | `TECH_DEBT.md` | deferred |
| D-61-7 | **The observed yield has no producer, so the structural-silence lane cannot fire on a real run.** `yieldReading` reads `proposal.observedYield`; nothing in `runCommand` computes one, so `yieldState` is always null in production and every knob renders on the `evidence-short` (accruing) branch. Task 03's Examples all supply a yield, so the contract never says what an *unknown* yield should render as — the implementation chose the accruing reading silently | design | non-blocker | **DEFERRED**, recorded as a declared gap on 61/06's `OUTCOME.md` and on the milestone's. Fixing it means either inventing a producer (the observation-series prerequisite ADR-011 §1 assigns to neither 61 nor 62) or minting a third silence the contract does not define — neither is this story's | 61/06, milestone 62 | deferred |

## Accept decision

**ACCEPTED (2026-08-31). All seven stories and the milestone.**

`aof work validate 61` is **PASS**; `aof work doctor 61` reports **no `control-unresolved` at either
severity**, with all thirteen declared controls resolving and now marked `landed`; the whole assembled
suite is **7,863 / 7,863 green** with the integration lane at **131 / 131**; and every one of
`FF-6101` … `FF-6113` has been run green *and* observed failing under a deliberate break, with the
working tree restored byte-for-byte after each probe. **No blocker finding is open**: both blockers
this gate raised — D-61-3 and D-61-6 — were closed here, and the two remaining findings are
non-blockers, one ledgered as debt and one recorded as a declared gap.

**The accept is worth stating in the terms this milestone is about.** 61/06 arrived claiming a review
it had not had, and the record — not a test — refused it. Running the review then found a Blocker the
suite could not have found, because the story's own test asserted the defective behaviour as correct.
A green suite was, precisely here, evidence that the machinery agreed with itself. What caught it is
the thing this milestone ships: evidence has to come from somewhere nobody proposing can reach.

**What was NOT done at this accept, deliberately.** The two non-blocker findings stay open by
decision, not by oversight: D-61-5 is `TECH_DEBT` item 77 and belongs to `rule.mjs`'s sole writer, and
D-61-7 is a gap the contract defines no rendering for. Both are stated on the outcomes, so a later
reader meets them as declared state rather than as a surprise.
