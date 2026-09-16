---
doc: verification
updated: 2026-09-07
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 123 truly done, and what is the evidence?
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's own verification record; there is no
  milestone SPEC box to tick and no milestone regression gate at this door.
  NO @uat and NO @manual scenarios (the one task is `@executable @cli @work @work-stream` alone) →
  no ## User sign-off section.
  NO UI surface and no DESIGN.md → no design-conformance section; the renderability precondition is
  never reached, because there is no DESIGN surface to reach it for.
  NO sibling ARCHITECTURE.md → this story declares no FF-NN of its own → no ## Fitness functions
  register. It WIDENS one declared elsewhere (71's FF-7103), so that control's two new legs and their
  red probes are recorded as evidence rows, with the reasoning stated below.
-->
# 123 · The review close mints no driver — Verification

## Method

Lanes in scope: **`@executable` only**. `tasks/00_the-close-creates-nothing.feature` carries
`@executable @cli @work @work-stream` and nothing else — no `@manual`, no `@uat`, no UI, no
`DESIGN.md`.

Run **inline** by the product owner who authors this record — also the single writer that allocates
the finding ids below, which is why no id was checked against a register before being allocated.

Every run was made under a fresh isolated `AOF_GLOBAL_HOME`, through `node scripts/test.mjs --only
<files>` rather than `node --test` (which passes these files silently, with zero assertions), and
never as the whole repo lane — `global-work-propagation.test.mjs` binds `:4182`, which the live
control daemon holds. Every exit code quoted below was read from `node` or `aof` itself and never
through a pipe. `aof work validate` and `aof work doctor` were run **from the repository root**,
where an empty-stream false green is not possible.

**Three lanes, widening outward from the story's own contract.** Its two own suites; the twelve
suites that consume the module it changed (`src/work/loop.mjs`) plus the command core; then the
entire `test/arch/**` fitness lane. The full repo lane is not run at this door: 123 is a parentless
story, so there is no milestone regression gate here, and the honest trade is stated in `aof:verify`
itself.

**THE CHECKOUT IS SHARED WITH A LARGE CONCURRENT LANE, AND THE BOUNDARY IS DRAWN BY REF.** At this
gate the working tree also carries **119/02** (`commands-gets-an-interior`, `status: in-progress`),
whose declared `files:` envelope is `src/commands/`, `src/command-core.mjs`, `src/cli.mjs`, `test/`
and `scripts/test.mjs` — 135 of the 146 changed paths in `git status`. Story 123's own envelope is
the nine files its `files:` now declares. Every red below is attributed to its own cause rather than
inherited silently or blamed on this diff, and the attribution is made by asking whether the failing
control's INPUTS are inside 123's envelope, never by whether the failure is convenient.

One file is co-touched: `src/commands/promote-finding-to-chore.mjs` carries 123's own header rewrite
(*"SINCE 123 NOTHING ROUTES HERE"*) and 119/02's registry-comment move in the same diff. The header
rewrite is 123's, it was declared under `reads:` and not `files:`, and that is F-123-A below.

## Verification evidence

Run 2026-09-07 at the accept gate. Each row names the procedure and the observation; the outcome is
never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | an isolated `AOF_GLOBAL_HOME` and a focused runner over the story's own two suites — `promote-finding-to-chore` and `arch/acd-promotion-creates-one-type` (FF-7103) | **33 cases, 0 failures, exit 0** — including `123 task00` and the two named `arch/123 FF-7103` | task 00 |
| `@executable` (consumers of the changed module) | the twelve suites that import `src/work/loop.mjs` or reach the command core — `work-loop-{determinism,declaration,stop-set,gate-order,phase-map,review-bound,production-review-bound,scope-guard,level-ladder}`, `loop-command-probe`, `loop-declaration-join`, `command-core-contract` | **122 cases, 2 failed, exit 1** — the eleven loop suites are green, the determinism contract included, which is what proves question 3's answer moved without the module reaching for a sibling. Both failures are in `command-core-contract` and both name `src/command-core.mjs`'s registry (`work:debt` newly exposed) and the validate-scope envelope — neither module is in this story's envelope (F-123-D) | task 00 (`FINDING_ROUTINGS` untouched; no existing caller changes) |
| `@executable` (fitness) | the ENTIRE `test/arch/**` lane — every suite file, imported by path under an isolated global home | **1817 cases, 5 failed, exit 1** — every one of the five is attributed below (F-123-C, F-123-D, F-123-E) and none implicates a file in this story's envelope | the standing fitness lane |
| `@executable` (fitness), over the FINAL tree | the same lane run AGAIN after this record and `OUTCOME.md` were written and after `aof work memory ingest` — several controls read the `wiki/work` corpus, so a lane run that predates the record documents has not seen the tree being accepted | **1817 cases, 5 failed, exit 1** — the same five controls by name, and F-123-E's reading moved from 3345/3750 = 89.20% to **3348/3759 = 89.07%** as this gate's own record documents added 9 qualified citations of which 3 dangle and 6 resolve — a declared share far above the corpus's own, so the ratio fell rather than rose, moving further from the 90% the leg asserts. **No control went red from the record documents** | the accept decision below |
| decider, at the source | `routeFinding` driven in a live process, one call per row of task 00's outlines | checklist + `story`/`milestone`/`spike`/`uat`/**no context** → `story` / `operator-refines` / `creates: null` / `owner: operator`; checklist + `chore` → `amendment` / `reviewed-chore-definition-of-done` / `null` / `loop`; cheap → `fixed` / `fixed-at-close` / `null` / `loop`; cheap **and** checklist → `fixed`; Nit + checklist → `recorded`; `lockedContract: "feature"` → `amendment`/`accepting-item-contract`; `"adr"` → `amendment`/`superseding-adr`; `needsNewCriteria` → `story`/`operator-refines`; nothing → `recorded`. `FINDING_ROUTINGS` reads `["amendment","chore","story","recorded","fixed"]` and `LOOP_CREATED_ITEM_TYPE` reads `"chore"` | task 00 sc. 1–4, 8, 10 |
| decider, at the source | `routeFindings` over a close of three — one cheap, one checklist-shaped, one Nit | `creates: []`; routed `[["cheap one","fixed","loop"],["chore one","story","operator"],["nit one","recorded","loop"]]` | task 00 sc. 6 |
| decider, exhaustively | `arch/123 FF-7103`'s sweep over every declared input — 6 severities × 4 locked-contract values × 3⁵ flag combinations × 6 reviewed types | **9235 combinations**; no routed decision carries a non-null `creates`, an unrouted decision carries no `creates` key at all, and the reachable routing set is exactly `["amendment","fixed","recorded","story"]` — `chore` present in the export, unreachable from the decider | task 00 sc. 5, 10 |
| the block, at the source | the `<finding_triage>` region cut from `src/bundle/commands/continue.md` and read whole | it states **"The loop creates NO item."**; the set of `aof work <verb>` invocations inside the region is **empty**; it still names `amendment`, `chore`, `story`, `recorded` and `fixed`; and the cost question (*"cheaper than the driver that would carry it"*) is still positioned ahead of the checklist question (*"discharged by a checklist against existing code"*) | task 00 sc. 11, 12 |
| the render, at the source | the `<finding_triage>` region cut from all four tracked copies and hashed with whitespace stripped | `src/bundle/commands/continue.md`, `.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md` hash **identically** (`dbc785118…`), and each carries the no-creation statement and an empty verb set | task 00 sc. 13 |
| the manifest | `arch/ADR-002` + `arch/ADR-001` + `arch/ADR-009` over the shipped tree — **15 cases, 0 failures, exit 0** | every `src/bundle/manifest.json` entry hashes to `hashContent` of its re-rendered member, the member set equals the rendered set with no missing and no extra entry, and every hash uses the sha256 lock scheme | task 00 sc. 13 |
| the operator's faces, at the source | `git diff` over `src/commands/promote-gap-to-chore.mjs` and the whole of `src/work-promote/` | **empty** — `work:promote-gap` still declares `at` in its input schema and still advertises `[--at <P>]` in its usage; both `promoteGapToChoreCommand` and `promoteFindingToChoreCommand` are still imported and registered in `src/command-core.mjs`; nothing in this change removes either verb | task 00 sc. 10 |
| the verb's own bound | the six `118 task01` cases in the story lane, run green | `work:promote-finding` still refuses a finding raised while reviewing a chore, still decides that refusal BEFORE the idempotence scan, and the refusal still writes nothing at all | task 00 sc. 10 |
| **red probe** — the exhaustive leg | `src/work/loop.mjs` copied to a scratch path and question 3's answer **restored to `routed("chore", "top-level-chore", LOOP_CREATED_ITEM_TYPE, "loop")`**, then the same sweep run against the mutant | **reported**: *the decider asked the loop to create "chore" for `{"severity":"important","checklistDischargeable":true,"cheaperThanDriver":false,…}`*. The shipped decider passes the identical sweep, so what failed was the mutation and not the harness. The probe ran on a COPY — the shipped tree was never mutated | task 00 sc. 12 |
| **red probe** — FF-7103 leg (b), the no-creation claim | the control's own probes: the `**The loop creates NO item.**` sentence replaced with `**The loop is careful.**`; the promotion instruction pasted back; and a verb this control has never heard of (`aof work invent-a-driver`) appended | each is reported by name — the verb half is a whitelist of **zero**, so a creating verb added to the CLI tomorrow is caught with no edit here. The shipped block passes all three claims in the same case | task 00 sc. 12 |
| **red probe** — FF-7103 leg (b), the question anchors | the cost question dropped, the cost question moved BELOW the checklist question, and the cost priced in lines | each is reported. The anchor was re-pointed from `**top-level chore**` to *"discharged by a checklist against existing code"* precisely because a control keyed to the ANSWER would have gone vacuously green in the beat the answer moved — the 118 legs are green over the re-anchored block | task 00 sc. 12 |
| delivered criteria | `git status` over milestone 71 and story 118 | **empty** — `118/00/tasks/00`'s `chore` routing row and `118/01/tasks/01`'s type table are superseded in task 00's own contract and their files are not edited, annotated or tagged; no delivered `.feature` moved | task 00 preamble |
| gate | `aof work validate 123`, from the repository root, unpiped | `PASS — 123 is well-formed.` **exit 0** | step 4 |
| gate | `aof work validate` (whole stream), from the repository root, unpiped | **exit 1, 3 issues** — all three are `story reads path … does not exist` against `src/commands/mesh-session.mjs` and `src/commands/assets-add.mjs`, raised by 72/03, 77/02 and 96/00. Both paths were renamed by the **uncommitted 119/02 lane**; none is in 123's envelope (F-123-D) | step 4 |
| gate | `aof work doctor 123`, from the repository root, unpiped | **exit 0**, and **no `control-unresolved` at either severity**. Warns only: `numbering-gap` (stream-wide: 42 and 122 missing between 00 and 123) and `rubric-join-unchecked`. `Loop-Ready: 80% (8/10) — clears L1; blocking: grounding, anchor-grounding` — byte-for-byte the score 118 recorded one gate earlier, which is what makes those two stream-wide registry checks inherited rather than caused | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless story
with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` of its own, and the red-probe obligation
reaches declared `FF-NN` ids alone. What the story does is **widen a control declared elsewhere** —
`m71/FF-7103`, per its own statement that 71/ADR-003 is *narrowed to zero, never contradicted* — so
that control's two new legs are recorded as evidence rows above, each with the probe that was run and
what it reported, rather than as register rows this story has no register to hold. `aof work doctor
123` confirms the position: zero `control-unresolved` findings at either severity.

**Why FF-7103 keeps its name after the rule it pins was narrowed to zero.** Legs (a) and (c) bind the
OPERATOR-reachable promotion path, which still creates exactly one type in exactly one place; only
leg (b), the prose leg, moved — from *which* creating verb the block may name, to the stronger claim
that it names none. A control renamed at the moment its subject narrowed would have lost the two legs
that are still load-bearing.

## Findings

Ids are allocated here by the single writer of this record, at the moment of landing them.
**No blocker finding is open.** Two were fixed at this close; three are recorded, and none of the
three is a story 123 defect.

**The rule this story ships was applied to this gate's own findings, which is the first test of it
that matters.** Two remedies were cheaper than the driver that would carry them and were fixed in the
beat that found them; three were not this story's to fix and are recorded or handed back as story
shapes. **This close created nothing.**

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-123-A | **The story wrote a file it declared only as a read.** `src/commands/promote-finding-to-chore.mjs` carries 123's own header rewrite — the removed *"routed to `chore` by `routeFinding` at the review close"* clause and the added *"SINCE 123 NOTHING ROUTES HERE"* paragraph — while `files:` named eight other paths and listed this one under `reads:`. Comment-only: no behaviour, no export, no guard moved. Nothing catches it — `aof work validate 123` is `PASS` with the omission in place, and the file also sits inside concurrent lane 119/02's declared `src/commands/` envelope, so a reader attributing the change by declaration alone would have credited it to the wrong story | declaration inaccuracy | Important | **question 2 answers: cheaper than the driver that would carry it.** The remedy is one line of frontmatter in a file this story already owns, weighed against a story driver's folder, record doc, acceptance criteria and whole `aof:verify` session. Fixed at the close; the path is now in `files:` and stays in `reads:`, which four 119 stories already do for a path they both read and write | the loop, at this close | **fixed** |
| F-123-B | **The story's own scenarios were asserted under its predecessor's name.** `test/promote-finding-to-chore.test.mjs` carried **zero** cases labelled `123`: task 00's hand-back, its reviewed-type outline, its empty close subset and its routing-set claim were all asserted inside cases named `118 task00` / `118 task01`, re-pointed in place. The arch half did label itself (`arch/123 FF-7103` ×2), so the gap was in the behavioural lane alone — and 118 itself set the precedent by adding its own labelled cases rather than folding into `71/01`'s. A rubric join looking for 123's behavioural coverage would have found none, and `aof work doctor 123` says exactly that (`rubric-join-unchecked`), so nothing would have reported it | test traceability | Important | **question 2 answers: cheaper than the driver that would carry it.** The assertions already existed; what was missing was a case that names the contract they discharge. Fixed at the close — one `123 task00` case stating the story's own claim end to end, plus the suite header wired to `123 — tasks/00_the-close-creates-nothing.feature`. The 118 cases keep their names and their assertions, because 118's questions did not move; only question 3's ANSWER did | the loop, at this close | **fixed** |
| F-123-C | **`arch/55 ADR-004 (acd-frozen-set-compiled)` is red at HEAD, from a file nobody in this tree has touched.** The census control requires the literal `assert.equal(direct.length, <N>,` in `test/bundle-asset-manifest-complete.test.mjs`; that file carries `assert.ok(direct.length > 0, …)` instead, so `assert.ok(count != null, "the bundle-tree census literal is readable")` fails. The file is **clean against HEAD**, and the failing assertion is a regex over that one untouched file — it reads nothing 123 changed and nothing 119/02 changed, so it is red on the committed tree and was red before either lane opened | pre-existing red control, inherited | Important | not a story 123 defect and not fixable inside its contract: the remedy is a choice between restoring an exact count and re-pointing the control at the lower bound the census now asserts, and that choice is about what the frozen-set census is FOR. Checklist-shaped in appearance, but **question 2 answers no** — it is not cheaper than the story that must state which of the two is right. Handed back as a story shape; a red fitness lane is never inherited silently | the operator, as a story shape | open |
| F-123-D | **Five controls and the stream-wide `validate` are red from the concurrent 119/02 lane, not from this one.** `arch/FF-6602` (*the named write site is no longer at :231*), `arch/119 FF-11903` (*86 unresolvable `src/` citations against a ceiling of 65* — the list is dominated by `src/commands/mesh-*`, `graph-*` and `assets-*`), `arch/58 FF-5810` (*`src/command-core.mjs:321-324` past EOF, 323 lines*), and both `command-core-contract` failures (`work:debt` newly exposed in the registry; an unresolved validate scope now returning a finding rather than an empty envelope) all read paths 119/02 renamed or modules it changed. `aof work validate`'s three stream issues are the same rename reaching three older stories' `reads:` lists. 119/02 is `status: in-progress` with `files: src/commands/, src/command-core.mjs, src/cli.mjs, test/, scripts/test.mjs` — its own gate is where these are answered | concurrent-lane collateral, correctly attributed | Important | do NOT fix at this close. Repairing another in-flight lane's citations and contracts from 123's gate would touch 135 paths outside this story's envelope to pre-empt a gate that lane has not reached, and would make 119/02's own regression gate read green on work 123 did. Recorded with its owner named; it discharges when 119/02 is accepted, and `aof work validate 123` is `PASS` throughout | 119/02, at its own gate | open |
| F-123-E | **`arch/FF-6603`'s ROUND 3/1 union-resolution floor is red from the COMMITTED corpus, for the third consecutive gate.** `acd-register-declaration-form` asserts that register-only resolution leaves **more** than 90% of qualified citations dangling; it measures **3345/3750 = 89.20%** before this record was written, against 3322/3694 = 89.93% at 118's gate and 3315/3686 = 89.93% at 102's. It is the same control, the same leg and the same direction recorded as **F-118-A** and **F-102-B**: the floor erodes as the corpus adopts register declarations, and each accepted item's records are another instance of that erosion. Story 123's code envelope is one source module, one command header, two test suites and five rendered/manifest artefacts; it contributes no citation the control counts | pre-existing red control, inherited | Important | not a story 123 defect. **Question 2 answers no**, exactly as it did at 118's gate: the remedy is not a checklist against existing code but a re-statement of the assertion as a property that does not decay as adoption grows, which needs acceptance criteria a `.feature` must state. The third recording is itself the signal — a finding recorded at three consecutive gates is evidence the hand-back is not being picked up, and that belongs in the retrospective rather than in a fourth identical row | the operator, as a story shape — the same destination F-118-A and F-102-B were left at | open |

**What is green.** The story's own task: **33 cases, 0 failures, exit 0** across two suites, covering
the hand-back with its vehicle and owner, the reviewed-type outline creating nothing for every type
the stream admits, 118/01's chore fold-in unweakened, the absent-context default, the empty close
subset over a mixed close, the ordered-question outline end to end, the routing set keeping all five
delivered members with `chore` present-but-unreachable, both operator faces untouched and both verbs
still registered, the block's no-creation statement with an empty verb set, and all four rendered
copies hashing identically. The exhaustive leg walked **9235 combinations** and found no non-null
`creates`; restoring question 3's chore answer in a copy made it red. The eleven loop-consumer suites
are green. `aof work validate 123` reports `PASS` and `aof work doctor 123` reports no
`control-unresolved` at either severity, exit 0.

**And the standing fitness lane is green but for five controls this story does not implicate**: 1817
cases with five failures — one red at HEAD (F-123-C), three from the concurrent 119/02 lane
(F-123-D), and the standing corpus floor (F-123-E).

## Accept decision

**ACCEPTED, 2026-09-07, on the first gate.** `aof work status 123 done` was run and stamped the
acceptance.

**What the accept rests on.** Task 00's thirteen scenarios are green in the story's own lane and were
additionally confirmed at the source in a live process — the decider row by row, the close over a
mixed set of three, the block and all four rendered copies cut and hashed, and both operator faces
diffed to empty. The claim the story exists to make is asserted **exhaustively rather than by
enumeration**: 9235 input combinations, no non-null `creates`, and a red probe that restores question
3's chore answer in a copy and is reported. That is the second layer the story argued for, and it is
the layer 118/01's prose bound did not have when milestone 119's closes minted 120, 121 and 122.

**No delivered contract was edited.** 118/00's `chore` routing row and 118/01's type table are
superseded in task 00's own preamble and their files are untouched — `git status` over milestone 71
and story 118 is empty. 71/ADR-003 is narrowed to zero rather than contradicted, so no superseding
ADR is owed; `FINDING_ROUTINGS` keeps all five members in their delivered order; and
`LOOP_CREATED_ITEM_TYPE` and `work:promote-finding` both stay, the latter now reachable by a person
alone, exactly as `work:promote-gap` always has been.

**Three findings remain open, all Important, none a story 123 defect.** F-123-C is a control red on
the committed tree from a file no lane has touched; F-123-D is collateral from the concurrent 119/02
lane, which answers it at its own gate; F-123-E is the corpus floor now recorded at a third
consecutive gate.

**The rule was applied to its own gate, and the gate created nothing.** Two of this close's five
findings were cheaper than the driver that would carry them and were fixed in the beat that found
them — the undeclared write and the unlabelled coverage, both inside this story's own envelope.
Three were not this story's to fix and were recorded or handed back as story shapes. No chore was
minted, no folder was deposited in the stream, and the only work now scheduled is work a person will
choose to schedule. That is the outcome the story exists to make ordinary, demonstrated on the first
close that ran under it.
