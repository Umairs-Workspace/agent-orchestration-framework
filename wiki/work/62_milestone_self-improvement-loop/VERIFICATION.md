---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what evidence do we have that this milestone
  works? Owner: aof:verify (the product owner is the SINGLE WRITER of the findings register).
  Scaffolded at refine so the declared controls have a home for their red probes; the evidence rows
  are filled as each story lands, and the accept decision at the close.
-->
# 62 · The self-improvement loop — Verification

## Fitness functions

<!-- CITING register (66/ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing itself. The red-probe cell
     records WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control, and this row is where a reviewer reads that it was observed failing. An
     assertion nobody has ever seen red cannot be falsified by its own green.

     An untouched placeholder cell is a MISSING red probe, not a recorded one. EVERY CELL BELOW IS
     FILLED, and each was applied to the working tree, run, REVERTED, and the restore confirmed
     byte-identical before the next probe began (2026-09-01).

     The probes were deliberately deferred through the DECLINED first pass of this gate and applied
     only after its four blockers were fixed — a probe run against bytes that a pending fix is about
     to change records evidence for a build that never shipped, which is exactly what this field
     cannot catch. Two of them then found defects no green run had: FF-6204's first probe came back
     GREEN (a self-comparison cannot see a change beneath both of its sides), and FF-6209's probe
     turned the WRONG leg red because the leg its own ARCHITECTURE declaration describes did not
     exist. Both are recorded in the register below as D-07 and in the FF-6204 cell itself.

     NO ROW HERE EXTENDS AN EXISTING GUARD. Four invariants that would have wanted one are instead
     discharged by guards already in service that walk the whole tree — 61/FF-6107, 66/FF-6604,
     53/FF-5305 and 59/FF-5911 — and the ARCHITECTURE register names each rather than restating it.

     THREE LEGS NONETHELESS CARRY AN EXTENSION'S WEIGHT, and their probes are the only evidence the
     tree is armed, because each is green over a tree that has never held the defect:
       · FF-6201's fresh-process import leg — the first ratchet on TECH_DEBT item 26's TDZ ring.
       · FF-6205's third-run-record-reader leg — TECH_DEBT item 59.
       · FF-6204's BYTE-UNCHANGED leg on `controlPathsIn` — the one place this milestone writes
         outside its own family (ADR-011 §3, two additive exports in `src/work-doctor-controls.mjs`,
         a module with 16 importers that the doctor's control lane depends on). This probe answers
         "did the split change an answer?", and it is the reason that edit is reviewable at all.

     AMENDED THREE TIMES on 2026-08-31 — at the Three Amigos pass (ADR-011, ADR-012), at the
     developer's feasibility pass (ADR-013), and at the task-authoring pass (ADR-014). Every one of the
     seven original declarations gained legs, and TWO ids were added: FF-6208 (the corpus-wide
     acceptance condition, gathered out of four stage-1 controls that could never have cleared it) and
     FF-6209 (formation, the story that did not exist before). No id was retired and no intended path
     changed. What each control must assert is recorded in `ARCHITECTURE.md`, not restated here.

     TWO PROBES ARE UNUSUAL AND THE PROBER SHOULD READ THIS FIRST. FF-6208's red probe is an EMPTIED
     CORPUS, not an edited module — it fails when this repository stops having anything to say, which
     is the state it exists to detect. And FF-6209's tie-break leg goes red by SHUFFLING THE INPUT,
     not by breaking the module: a tie-break that reads input position passes every ordinary run and
     fails only that one.

     Probes are applied to the working tree, run, and REVERTED, with `git status` on the probed file
     confirmed clean afterwards. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-6201 | `test/arch/acd-tune-carries-no-second-rule.test.mjs` | green — 62/04, 4 legs | planted `"not-admissible"` — one of 61's eight ruling codes, read from `RULING_REFUSAL_ORDER` — as a code literal in `src/work-tune/distance.mjs`. RED: *no tune-family module carries the acceptor's ruling vocabulary or arithmetic* — "not-admissible is rendered from the answer, not restated" (1 of 4 legs). |
| FF-6202 | `test/arch/acd-proposal-class-is-computed.test.mjs` | green — 62/01, 3 legs | planted the shipped tunable key `"work.loop.reviewRounds"` as a literal in `src/work-tune/proposal.mjs`. RED: *the proposer contains no shipped tunable-key literal or command-core import* — "proposal leaf must not spell work.loop.reviewRounds" (1 of 3 legs). |
| FF-6203 | `test/arch/acd-no-patch-no-applier.test.mjs` | green — 62/01, 4 legs | let a patchless proposal keep the applier it asked for (`patch == null` returned `candidate.applierId` instead of `null`). RED: *every patch has target from and to and no patchless proposal has an applier* (1 of 4 legs). |
| FF-6204 | `test/arch/acd-proposal-provenance-resolves.test.mjs` | green — 62/02, 4 legs | **two probes, because the first came back GREEN and that is itself the finding.** (a) Changed the shared `normalizeCitedPath` — still green: the byte-unchanged leg is a SELF-comparison of `controlPathsIn` against `pathCitationsIn`+`isControlFileName`, so a change beneath BOTH sides moves them together and is invisible to it. (b) Dropped `isControlFileName` from inside `controlPathsIn` alone, so the whole no longer equals its composition. RED: *the control extractor remains the same exact composition over the corpus* at `wiki/work/52_milestone_loop-registry-and-graph/ARCHITECTURE.md:1890` (1 of 4 legs). (c) Re-declared `CITED_PATH` inside `src/work-tune/provenance.mjs`. RED: *both owning grammars are imported and no private grammar is authored* (1 of 4 legs). **Recorded boundary:** that leg matches NAMED signatures (`CITED_PATH`, `LOCATOR_SUFFIX`, …), so a private regex under a different name is not caught — probe (c) passes only because the plant carries the grammar's own name. |
| FF-6205 | `test/arch/acd-tune-corpus-declares-its-reads.test.mjs` | green — 62/00, 6 legs | dropped the lessons lane's floor from the corpus registry (`lane("lessons", …, 392)` → no floor). RED: *the three corpus lanes are complete declarations with fixed positive floors* (3 of 6 legs — the refusal reaches the lanes, the finding and the report). |
| FF-6206 | `test/arch/acd-distance-to-live-is-computed.test.mjs` | green — 62/03, 4 legs | copied the acceptor's own removal sentence `"a consumer reading the resolved value at a decision site"` (`REFUSAL_REMOVALS[NOT_ADMISSIBLE]`) into `src/work-tune/distance.mjs`. RED: *every work-tune module contains no acceptor ruling code or removal copy* — "distance.mjs must render report-owned removal text" (1 of 4 legs). |
| FF-6207 | `test/arch/acd-tune-writes-nothing.test.mjs` | green — 62/04, 2 legs | made the read face write one file (`.probe-write`) inside the workspace before assembling the corpus. RED: *two tune runs leave every workspace byte unchanged and carry no state back* (1 of 2 legs). |
| FF-6208 | `test/arch/acd-tune-is-non-vacuous-over-this-repo.test.mjs` | green — 62/04, 1 leg | **EMPTIED THE CORPUS**, as this register's own note requires — not an edited predicate: the assembler was made to admit no item, so this repository has nothing to say. RED: *this repository emits both lanes with resolved evidence and distance* — "the real corpus emits proposals" (1 of 1 leg). |
| FF-6209 | `test/arch/acd-candidate-formation-is-lossless.test.mjs` | green — 62/05, **7** legs (one added at this gate, D-07) | keyed the tie-break on ARRIVAL POSITION (a sequence counter in `sourceKey`) rather than content — the shuffle probe. RED: *a shuffled input yields byte-identical candidates* — "planted ties: seed 1 moved a candidate, so arrival order is reachable from the tie-break". **This probe is why D-07 exists:** run against the control AS SHIPPED it turned only the real-corpus TRADEOFF leg red, incidentally, because the measured table happened to move — the declared shuffle leg did not exist. The leg was added, and the probe now lands on it directly. |

## Verification evidence

<!-- Filled story by story as each lands, and at the milestone gate. Pointers and measurements, not
     restatements of the contract.

     ADR-001 §4 adds ONE non-vacuity condition to this gate that no suite can discharge: at accept,
     `aof work tune` over this repository's own corpus must emit at least one proposal whose
     provenance resolves, and must state a distance for every proposal it emits. Record the command,
     the emitted count and the distances here. A green suite over fixtures is not that evidence. -->

| subject | lane | what was run | result | contract |
|---|---|---|---|---|
| 62 (stream) | gate | `aof work doctor 62` | at refine, 2026-08-31: returns; 7 controls declared, each `control-unresolved` downgraded to warn by its `pending` marker | — |
| 62 (milestone) | @executable | the whole assembled unit lane — `scripts/test.mjs`'s exported `tests`, run test-array-wise minus `global-work-propagation` (6 tests; it binds `:4182`, which the live control daemon on this machine holds) | 2026-09-01: **8006 of 8012 run, 6 failures** — D-01, D-02, D-03, D-04 (blocker), D-05, D-06 (non-blocker). The excluded 6 are this gate's one un-run lane, named rather than skipped quietly. | — |
| 62 (milestone) | @executable | the 15 milestone-62 suites alone (5 story suites, `tune-command`, and all 9 declared controls) by the same test-array import | 2026-09-01: **142 tests, 1 failure** — D-01. Every other 62 leg is green. | 28 task features, all `@executable` |
| 62 (milestone) | @manual / @uat | tag census over all 28 task `.feature` files | 2026-09-01: `@executable` 28, `@cli` 28, `@work` 28, `@validate` 26, `@work-stream` 2 — **no `@manual` and no `@uat` scenario exists**, and the milestone carries no `DESIGN.md`. The agent-run manual lane, the human sign-off step and the design-conformance review are therefore out of scope here rather than skipped. | — |
| 62 (milestone) | gate | `aof work doctor 62` | 2026-09-01: **no `control-unresolved` at either severity** — all 9 declared control files resolve on disk. Warns only: `mtime-ahead-of-updated`, `numbering-gap`, `control-runner-unchecked` (no `work.controls.runners` configured) and `rubric-join-unchecked` × 6. Loop-Ready 80% (8/10). | ARCHITECTURE.md `## Fitness functions` |
| 62 (milestone) | gate | `aof work validate 62` | 2026-09-01: **PASS — 62 is well-formed.** | — |
| 62 (milestone) | @executable | the whole assembled unit lane again, AFTER the six fixes | 2026-09-01: **8007 run, 1 failure** — D-05 alone, the pre-existing SEA-recipe guard that neither this branch's subject nor its test touches. D-01 – D-04, D-07 and D-08 are gone; D-06 passed on this run, which is the evidence for reading it as order-dependent. One test more than the first sweep: D-07's missing leg. | — |
| 62 (milestone) | @executable | the 15 milestone-62 suites alone, after the fixes | 2026-09-01: **142 → 143 tests, 0 failures.** | 28 task features |
| 62 (milestone) | red probes | all nine declared controls, each broken / run / reverted / restore verified | 2026-09-01: **9 of 9 observed RED**, recorded per control in `## Fitness functions` above. Two probes did not behave as the declaration implied and both became findings — FF-6204's first probe stayed green (self-comparison blind spot) and FF-6209's landed on the wrong leg (D-07). | ARCHITECTURE.md `## Fitness functions` |
| 62 (milestone) | ADR-001 §4 non-vacuity | `aof work tune --json` over this repository's own corpus | 2026-09-01, **exit 0**. Corpus read: lessons 402 against floor 196, lineage 61 against floor 30, observations 6 readings against floor 3 — no lane below its floor. Formation took 796 records into 593 candidates at criterion 3. **63 proposals emitted and both lanes are non-empty** (62 advisory `story-sizing`; 1 tunable `cap-adjustment` on `work.loop.reviewRounds`). **Every emitted proposal cites ≥2 distinct resolved source documents** (min 2, max 9) and **every one of the 63 carries a distance**; no citation on the emitted set is unresolved. The prerequisite limb set is non-empty at HEAD — 5 distinct obstacles, including the `decision-site-consumer` limb measuring 3 knobs examined / 0 consumed / 3 remaining. 530 findings (506 `below-evidence-floor`, 24 `unresolvable-provenance`), all demotions, none of which reaches the exit code. | ADR-001 §4, FF-6208 |

## Findings

<!-- Register for milestone 62. Ids allocated HERE, at the moment of landing, by the single writer
     (`aof:verify`'s product owner) — never read-then-allocate.

     **Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both
     spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside
     its own item's documents, so a cross-item citation carries the ref. -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| D-01 | `FF-6209`'s real-corpus leg (`architecture: FF-6209 default 3 is checked against the tracked real-corpus tradeoff`) asserts one citation per record — `formCandidates(...).citations.length === records.length` — and over the lessons lane carries **654 citations for 402 records** (154 records carry more than one). The carry itself is correct and lossless; the leg's premise is stale. It held only while every record had exactly one citation, and 62/04's `9898750b` gave each lesson record a `citations` array of `[lesson.source, ...pathCitationsIn(section)]`. A control this milestone declares is therefore RED at HEAD. | defect | blocker | new `@bug` (+ `@finding-D-01`) task scenario on 62/05, then fix: assert the leg against the citations the records actually carry (lossless carry) rather than against the record count. The partition proof at the sources leg is unaffected and stays as it is. | 62/05 (leg), 62/04 (cause) — fixed inline at this gate | **fixed** |
| D-02 | `loops-record/00 the loader's namespace holds eleven vocabulary sets and one frozen code array` is red: `src/work-loops.mjs` now exports a **twelfth** member, `loopPointersIn`, added by 62/04's `9898750b` so the corpus could join a lesson's structured config pointer to its owning lesson. The loader's own namespace census was never reconciled with it. | defect | blocker | new `@bug` (+ `@finding-D-02`) task scenario; fix by deciding whether `loopPointersIn` belongs in that namespace's census or behind a different export surface, then making the census say so. | 62/04 — fixed inline at this gate | **fixed** |
| D-03 | `arch/58 FF-5809` is red: `test/tune-corpus.test.mjs` (62/00's suite) reaches the shipped registry under `src/bundle/loops/` and is classified into no lane. 58's control is explicit that a new such file fails there until it is classified — it is doing exactly what it was built to do. | defect | blocker | new `@bug` (+ `@finding-D-03`) task scenario; classify `test/tune-corpus.test.mjs` in 58's census, or route its registry read through the one helper. | 62/00 — fixed inline at this gate | **fixed** |
| D-04 | `arch/FF-6602: the horizon predicate has exactly ONE home` is red: `src/work.mjs` now spells all five frozen status words. `"in-review"` appears **0× on `main` and 1× at HEAD**, introduced on this branch by `178a3566` (`fix continue advancement past review`) as `status === "done" \|\| (throughReview && status === "in-review")`. That is a second home for the vocabulary 66/ADR-002 homes in `src/acceptance-horizon.mjs`. It is not part of 62's declared write set, but it landed on 62's branch during 62's build and this is the gate where it surfaces. | defect | blocker | new `@bug` (+ `@finding-D-04`) task scenario; read the two words out of `acceptance-horizon.mjs`'s exported vocabulary instead of spelling them in `src/work.mjs` — the same correction `src/import/recovery.mjs` already took. | 62 (branch) — fixed inline at this gate | **fixed** |
| D-05 | `build-sea-recipe-guards/F14 refuses an --out that resolves to the repo root` is red: `assertSafeOutDir(".", { repoRoot, cwd: repoRoot })` does not throw. **Pre-existing, not this branch's**: neither the subject (`scripts/build-sea.mjs`) nor the test changed between `main` and HEAD, and the only branch edit under `scripts/` is the 50-line 62 suite registration in `scripts/test.mjs`. | defect | non-blocker | defer to backlog — a real red control, but it belongs to the SEA build recipe and predates this milestone. | backlog | deferred |
| D-06 | the `premature-done` lane's "an `end_turn` that goes quiet but RESUMES (a background agent reporting back) is NEVER settled" test fails in the full-lane ordering and **passes when re-run in isolation** — order-dependent or timing-sensitive, and not a property of 62's change set. | defect | non-blocker | defer to backlog — a flaky lane is worth fixing, but it is not this milestone's and it blocks nothing here. Re-run at the accept pass: it **passed** in the full lane, which confirms the order/timing reading rather than a defect in its subject. | backlog | deferred |
| D-07 | `FF-6209`'s ARCHITECTURE declaration says the tie-break is "a function of CONTENT, never of ARRIVAL … and a shuffled input yields byte-identical candidates" (ADR-014 §5). **The shipped control never shuffled anything** — no leg asserted it. Found by the control's own red probe: keying `sourceKey` on arrival position turned exactly one leg red, the real-corpus TRADEOFF leg, and only because the measured table happened to move. Had the corpus's clusters been insensitive to that ordering, an arrival-reading tie-break would have passed the whole control. A declared invariant with no assertion is a clause whose green means nothing. | gap | blocker | fix inline: author the missing leg. It drives BOTH inputs — planted records tying on all four dimensions (where the tie-break is the only thing deciding) and the real lessons lane (where the ties are the ones this repository actually produces) — under a deterministic Fisher-Yates, with a non-vacuity check that a shuffle really moved the input. | 62/05 — fixed inline at this gate | **fixed** |
| D-08 | the same leg asserted the live measurement byte-equal to `FORMATION_DEFAULT_BASIS.measurements` and `lessons.length` equal to its stored `measuredRecordCount`. **Both go stale the moment any retrospective is written — including this milestone's own**, which `aof:verify` authors minutes after the suite goes green, so the control was set to fail on the very commit that accepted it. `FF-6208` already states the rule it was breaking: "it runs over the corpus as it stands and holds no expected figure — a stored count would go stale on the next retrospective, which is the corpus this milestone reads." Two controls over one corpus disagreed, and the stored-figure one was wrong. Confirmed by re-measurement at this gate: the record COUNT was unmoved at 402 while the table moved on all three rows, because 62/04 changed the record SHAPE (`citations`, `target` feed `stableValue`, which feeds the tie-break) — the drift a stored figure hides. | defect | blocker | fix inline: assert the DECISION rather than the numbers — default 3 must still earn its place over the corpus as it stands (largest loose cluster collapses, recurring classes survive, tightest fragments), with the recorded basis kept as dated provenance and held to the same three relations so a basis that never justified the default is still caught. | 62/05 — fixed inline at this gate | **fixed** |

## Accept decision

**ACCEPTED — 2026-09-01**, on the second pass of this gate. `aof work validate 62` is **PASS**,
`aof work doctor 62` reports **no `control-unresolved`** at either severity, all six stories are
`done` by the `aof work status` verb, **all nine declared controls are green and all nine have an
observed red probe**, and **no blocker finding is open**.

**The first pass DECLINED, and the record of that is kept above rather than tidied away.** Four
blockers were open — D-01 to D-04 — and one of them was this milestone's own control going red. They
were then fixed inline at the operator's instruction, and fixing them turned up two more (D-07, D-08),
both blockers, both also fixed. Eight findings, six of them defects in this milestone's own controls
rather than in its product code, which is the honest summary of what this gate found.

**Two of the six were the cross-story poisoner the milestone gate exists to catch**, and both trace to
one commit. 62/04's `9898750b` widened a lesson record (`citations`) and widened `src/work-loops.mjs`'s
export surface (`loopPointersIn`). Each was green in its own story's lane and red in a sibling's
(D-01) and in a neighbouring milestone's (D-02). That is the trade `aof:verify` records deliberately —
caught at the gate rather than immediately — and the per-story commits made attributing both
mechanical. **Two more were only findable by the red probes** (D-07, D-08), and would have survived any
number of green runs.

**What the milestone delivers.** `aof work tune` over this repository's own corpus emits **63
proposals**, both lanes populated, **every** proposal carrying at least two distinct resolved source
documents and a measured distance, at exit 0 — ADR-001 §4's non-vacuity condition, met against the
real tree rather than a fixture. Capability statements are in `OUTCOME.md`; process lessons are in
`RETROSPECTIVE.md`.

**One red control is open in this repository and it is NOT this milestone's**, named rather than
absorbed into the accept: D-05, `build-sea-recipe-guards/F14`. Neither its subject
(`scripts/build-sea.mjs`) nor its test changed between `main` and HEAD; the only branch edit under
`scripts/` is the 62 suite registration in `scripts/test.mjs`. It is deferred to the backlog as a
pre-existing defect, and this milestone is accepted with it open because it belongs to the SEA build
recipe.

**Not run at this gate, named rather than skipped quietly:** the 6 `global-work-propagation` tests,
which bind `:4182` — held on this machine by the live control daemon. Every other assembled test ran
(8007 of 8013).

**One boundary this gate could not close, recorded because the next reader should not have to
rediscover it:** FF-6204's private-grammar leg matches NAMED signatures, so a private citation regex
under a different name is not caught. The probe that turned it red plants the grammar's own name. That
is a real limit of the control, not of the probe.
