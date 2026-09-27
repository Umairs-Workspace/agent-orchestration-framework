---
doc: verification
updated: 2026-09-05
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 118 truly done, and what is the evidence?
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's own verification record; there is no
  milestone SPEC box to tick and no milestone regression gate at this door.
  NO @uat scenarios (both tasks are @executable alone) → no ## User sign-off section.
  NO UI surface and no DESIGN.md → no design-conformance section; the renderability precondition is
  never reached, because there is no DESIGN surface to reach it for.
  NO sibling ARCHITECTURE.md → this story declares no FF-NN of its own → no ## Fitness functions
  register. It WIDENS one that is declared elsewhere (71's FF-7103), so that control's three new
  legs and their red probes are recorded as evidence rows, with the reasoning stated below.
-->
# 118 · Finding triage weighs what a driver costs — Verification

## Method

Lanes in scope: **`@executable` only**. Both tasks carry `@executable @cli @work @work-stream` and
nothing else — no `@manual`, no `@uat`, no UI, no `DESIGN.md`.

Run **inline** by the product owner who authors this record — also the single writer that allocates
the finding ids below, which is why no id was checked against a register before being allocated.

Every run was made under a fresh isolated `AOF_GLOBAL_HOME`, through `node scripts/test.mjs --only
<files>` rather than `node --test` (which passes these files silently, with zero assertions), and
never as the whole repo lane — `global-work-propagation.test.mjs` binds `:4182`, which the live
control daemon holds. Every exit code quoted below was read from `node` itself and never through a
pipe. `aof work doctor` was run **from the repository root**, where an empty-stream false green is
not possible.

**Three lanes were run, widening outward from the story's own contract.** Its five own suites; then
the ten suites that consume the module it changed (`src/work-loop.mjs`), because a story that edits a
shared decider must show it did not move anything already delivered through it; then the entire
`test/arch/**` fitness lane. The full repo lane is not run at this door: 118 is a parentless story,
so there is no milestone regression gate here, and the honest trade is stated in `aof:verify` itself.

**The checkout is shared with two concurrent lanes, and the boundary is drawn by ref.** At this gate
the tree also carried `src/workspace.mjs`, `src/commands/doctor.mjs` and
`test/doctor-cwd-independence.test.mjs` (chore 103), and story 102's now-accepted records. Neither is
in story 118's `files:` envelope; the one red below is attributed to its own cause rather than
inherited silently or blamed on this diff.

## Verification evidence

Run 2026-09-05 at the accept gate. Each row names the procedure and the observation; the outcome is
never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | an isolated `AOF_GLOBAL_HOME` and a focused runner over the story's own five suites — `promote-finding-to-chore`, `arch/acd-promotion-creates-one-type` (FF-7103), `arch/acd-bundle-manifest-hashes`, `arch/acd-bundle-membership`, `arch/acd-declared-writes-include-generated-siblings` (FF-7106) | **42 cases, 0 failures, exit 0** — including the seven rows named `118 task00`/`118 task01` and the three named `arch/118 FF-7103` | tasks 00 + 01 |
| `@executable` (consumers of the changed module) | the ten suites that import `src/work-loop.mjs` or reach the command core — `work-loop-declaration`, `work-loop-determinism`, `work-loop-stop-set`, `loop-command-board-state`, `loop-cap-exhaustion-carries-the-record`, `loop-only-fail-redrives`, `loop-record-reaches-the-redrive`, `loop-resumed-redrive-declares-its-grade`, `loop-declaration-join`, `command-core-contract` | **92 cases, 0 failures, exit 0** — the determinism contract included, which is what proves the fifth routing and the second argument were added without the module reaching for a sibling | task 00 preamble ("appended last"), task 01 ("no existing caller changes") |
| `@executable` (fitness) | the ENTIRE `test/arch/**` lane — every suite file, imported by path under an isolated global home | **1759 cases, 1 failed, exit 1** — the single failure is `arch/FF-6603`'s ROUND 3/1 floor (F-118-A), which implicates no file in this story's envelope | the standing fitness lane |
| `@executable` (fitness), over the FINAL tree | the same lane run AGAIN after this record, `RETROSPECTIVE.md` and `OUTCOME.md` were written, and after `aof work memory ingest` — several controls read the `wiki/work` corpus, so a lane run that predates the record documents has not seen the tree being accepted | **1759 cases, 1 failed, exit 1** — the same single control, F-118-A, its reading moved by seven citations to 3322/3694 = 89.93%. **No control went red from the record documents** | the accept decision below |
| decider, at the source | `routeFinding` driven in a live process, one call per row of task 00's ordered-question outline and task 01's type outline | `FINDING_ROUTINGS` reads `["amendment","chore","story","recorded","fixed"]`. Cheap alone → `fixed`/`fixed-at-close`/`creates: null`/`owner: loop`; cheap **and** checklist-dischargeable → `fixed`; cheap **and** `lockedContract: "feature"` → `amendment`/`accepting-item-contract`; cheap **and** `lockedContract: "adr"` → `amendment`/`superseding-adr`; a Nit that is cheap **and** checklist-dischargeable → `recorded`; cheap **and** `needsNewCriteria` → `fixed`; checklist-dischargeable with `reviewedType: "chore"` → `amendment`/`reviewed-chore-definition-of-done`; the same with `story`, `milestone`, `spike`, `uat` → `chore`/`top-level-chore`/`creates: "chore"`; cheap with `reviewedType: "chore"` → still `fixed`, the bound never reached | task 00 sc. 1–6, task 01 sc. 1–2, 4–5 |
| decider, at the source | `routeFindings` over a close of three — one cheap, one checklist-dischargeable, one Nit — with no context supplied | routed `["cheap one","fixed"]`, `["chore one","chore"]`, `["nit one","recorded"]`; the `creates` subset holds the chore alone and no entry for the fixed finding | task 00 sc. 7, task 01 sc. 3 |
| the verb, at the source, against THIS repository's real stream | `aof work promote-finding 88 "a probe finding that must never land" --remedy "do nothing"`, run live against `wiki/work` — 88 is a real top-level chore, so a passing verb would have written a real folder | refused: *reviewed item "88" is itself a chore — a chore's review mints no chore. Fold the remedy into 88's own `## Definition of Done`, or hand it back to the operator, who can schedule it with `aof work promote-gap`.* **exit 1**, read unpiped. The work-dir listing and `git status -- wiki/work` were captured before and after and hash identically: nothing created, nothing renumbered, nothing amended | task 01 sc. 6–7 |
| the verb, at the source | reading the ordered guards in `src/commands/promote-finding-to-chore.mjs` | the type refusal sits after the ref-resolution guard and **before** `promotionKey`/`findPromotedChore`, so an already-promoted finding on a chore cannot cross the bound by having crossed it once; the literal it refuses is `PROMOTED_TYPE`, not a second spelling of `"chore"` | task 01 sc. 8, 12 |
| the operator's face, at the source | `git diff` over `src/commands/promote-gap-to-chore.mjs` and the whole of `src/work-promote/` | **empty** — `work:promote-gap` still declares `at` in its input schema, still advertises `[--at <P>]` in its usage, and nothing in this change reaches it | task 01 sc. 9 |
| the block, at the source | the `<finding_triage>` region cut from `src/bundle/commands/continue.md` and read whole | it says **"five ordered questions"**; question 2 is the cost question and is stated ahead of question 3, the one that routes to a top-level chore; it weighs the remedy against *"a top-level folder and its record doc, a Definition of Done to author, a validate gate the stream must keep green, and a whole `aof:verify` session"* and explicitly *"never against a line count or a duration"*; it names the `fixed` routing; question 3 names both destinations for a remedy raised reviewing a chore — the reviewed chore's own `## Definition of Done`, and the hand-back to the operator — and states that the verb refuses the case too. No occurrence of *"four ordered questions"* survives anywhere under `src/bundle/`, `.claude/`, `.codex/` or `.opencode/` | task 00 sc. 9, task 01 sc. 10 |
| the render, at the source | the `<finding_triage>` region cut from all four tracked copies and hashed with whitespace stripped | `src/bundle/commands/continue.md`, `.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md` hash **identically** (`48130c2d…`) — no tracked rendered copy is left at an earlier render, which is the defect chore 108 is the open record of | task 00 sc. 10, task 01 sc. 11 |
| the manifest | `arch/ADR-002` over the shipped tree | every `src/bundle/manifest.json` entry hashes to `hashContent` of its re-rendered member, the member set equals the rendered set with no missing and no extra entry, and every hash uses the sha256 lock scheme | task 00 sc. 10, task 01 sc. 11 |
| FF-7106, the reason the four render entries are in `files:` | `arch/71 FF-7106` over the OPEN horizon, which includes this story | green in all six cases, including the two non-vacuity legs — a story declaring a bundle member without the manifest, or without its tracked rendered copies, is reported by name | `STORY.md` `### Refine`, FF-7106 |
| **red probe** — FF-7103 leg (b), the cost question | the control's own probes, run in the story lane: a `<finding_triage>` block with the cost question DROPPED, one with it asked AFTER the chore question, and one pricing it in lines | each is reported by the control; the shipped block passes first in the same case, so what failed was the mutation and not the cutting | `arch/118 FF-7103` case 1 |
| **red probe** — FF-7103 leg (b), the depth bound | a block with the bound dropped, and a block dropping either of the two destinations | each is reported by the control, naming the missing destination | `arch/118 FF-7103` case 2 |
| **red probe** — FF-7103 leg (c), the bound at the act | the type check REMOVED from `src/commands/promote-finding-to-chore.mjs`, and the same check MOVED to after the idempotence scan | both are reported by the control — the second is the probe that matters, because a bound placed after the scan is green on every first promotion and silently absent on every repeat | task 01 sc. 13, `arch/118 FF-7103` case 3 |
| delivered criteria | `git status` over milestone 71 | **empty** — `71/01/tasks/00_the-triage-rule-routes-every-finding.feature`'s "four ordered questions" and its un-costed chore row are superseded in task 00's own contract and are not edited, annotated or tagged; no delivered `.feature` moved | task 00 preamble |
| gate | `aof work validate` (whole stream) and `aof work validate 118` | `PASS — work stream is well-formed.` and `PASS — 118 is well-formed.` | step 4 |
| gate | `aof work doctor 118`, from the repository root | **no `control-unresolved` at either severity**; warns only — `numbering-gap` (stream-wide) and `rubric-join-unchecked`. `Loop-Ready: 80% (8/10)` | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless story
with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` of its own, and the red-probe obligation
reaches declared `FF-NN` ids alone. What the story does is **widen a control declared elsewhere** —
`m71/FF-7103`, per its own `### Refine` note that ADR-003 is *narrowed, never contradicted* — so that
control's three new legs are recorded as evidence rows above, each with the probe that was run and
what it reported, rather than as register rows this story has no register to hold. `aof work doctor
118` confirms the position: zero `control-unresolved` findings at either severity.

**`numbering-gap` is explained rather than inherited.** It lists 73, 74, 79–81, 83–87 and 102 as
missing while every one of them is on disk. That is the check behaving as designed, not a stale read:
`structuralIntegrityGroup` (`src/work-doctor-freshness.mjs:198`) computes the sequence over
`isDriver` items only, and a top-level **story** is not a driver — which is also why the range stops
at 117 rather than at this story's own 118. The warn is advisory by construction (*"gaps are usually
intentional reservations"*), and it is not evidence of the stream doctor cannot see that chore 103
is the open record of.

## Findings

Ids are allocated here by the single writer of this record, at the moment of landing them.
**No blocker finding is open.** Neither of the two below is a story 118 defect.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-118-A | **`arch/FF-6603`'s union-resolution floor is red from the COMMITTED corpus, not from this tree.** `acd-register-declaration-form`'s ROUND 3/1 leg asserts that register-only resolution leaves **more** than 90% of qualified citations dangling; it measures **3316/3687 = 89.94%** before this record was written and **3322/3694 = 89.93%** after. It is the same control, the same leg and the same direction story 102 recorded as **F-102-B** one gate earlier (3315/3686 = 89.93%): the floor erodes as the corpus adopts register declarations, and this record is a small instance of that erosion — it added 7 qualified citations of which 6 dangle, a declared share above the corpus's own, so the ratio fell from 0.89937 to 0.89929 and moved **away** from the 90% the leg asserts. Story 118's code envelope is nine source and test files and four rendered copies; it contributes no citation the control counts | pre-existing red control, inherited | Important | not a story 118 defect, and not fixable inside this story's contract: re-basing a `done` milestone's control is a decision about the corpus, not about finding triage. **Question 2 of the rule this story just shipped applies to it and answers `story (operator)`, not `chore`** — the remedy is not a checklist against existing code but a re-statement of the assertion as a property that does not decay as adoption grows, which needs acceptance criteria a `.feature` must state. Recorded, not promoted; a red fitness lane is never inherited silently | the operator, as a story shape — the same destination 102's F-102-B was left at | open |
| F-118-B | **The decider has no production caller, so over a real close the rule binds through two layers and not three.** `routeFinding`/`routeFindings` are imported by `test/promote-finding-to-chore.test.mjs` and `test/arch/acd-promotion-creates-one-type.test.mjs` and by **nothing under `src/`** — grepped at this gate. What actually binds an `aof:continue` review close is (a) the `<finding_triage>` prose the agent reads, now carrying both the cost question and the depth bound, and (b) `aof work promote-finding`'s refusal, which is the layer every one of the six measured recursions would have hit. The decider is the drivable STATEMENT of the rule, which is exactly what 71/ADR-009 §B asked for and what makes task 00's ordered-question outline a scenario rather than a claim — it is not, and was never claimed to be, a runtime gate. Recorded so that a green decider suite is not later read as proof that the loop consulted it, which is the F-78-A species — inferring a discharge from a green control | scope boundary, correctly declared and pre-existing | Important | do NOT treat this as unfinished work in 118: neither task asserts a production caller, and adding one would put an import into a module whose determinism contract (`work-loop-determinism`) exists to keep it importing nothing. The condition that would close it is a close path that calls the decider rather than restating it — a design question about the loop shell, not about triage | recorded; the same open question 102's F-102-D leaves against the phase-command path | open |

**What is green.** The story's own two tasks: **42 cases, 0 failures** across five suites, covering
the fifth routing appended last with the four unmoved, the cost question deciding ahead of the
checklist question, a locked-contract change never being merely cheap, a Nit never widened into
`fixed`, the whole ordered-question outline, a close whose `creates` subset holds no fixed finding,
the fold to `reviewed-chore-definition-of-done` under a chore and the unchanged `top-level-chore`
under every other type, the absent-context default, the verb's live refusal against this repository's
real stream with the tree byte-identical afterwards, the refusal deciding before the idempotence
scan, the gap face untouched, and the block and all three rendered copies carrying the rule
identically. The ten consumer suites are **92 cases, 0 failures**. `aof work validate` reports `PASS`
for the stream and for 118, and `aof work doctor 118` reports no `control-unresolved` at either
severity.

**And the standing fitness lane is green but for one control this story does not implicate**: 1759
cases with a single failure, `arch/FF-6603`'s ROUND 3/1 floor (F-118-A).

## Accept decision

**ACCEPTED, 2026-09-05, on the first gate.** `aof work status 118 done` was run and stamped the
acceptance.

**What the accept rests on.** Both tasks' scenarios are green in their own lane and were additionally
confirmed at the source in a live process — the decider row by row, and the verb driven against this
repository's real stream, where a passing verb would have written a real chore folder and instead
left the tree byte-identical. The three layers the story set out to change all carry the rule and
carry it identically: the decider, the `<finding_triage>` prose, and the verb. The four rendered
copies are current, which is the defect chore 108 records and this story's `files:` envelope was
enumerated to prevent.

**No delivered contract was edited.** `71/01/tasks/00`'s "four ordered questions" is superseded in
task 00's own preamble and its file is untouched — `git status` over milestone 71 is empty. 71/ADR-003
is narrowed rather than contradicted, so no superseding ADR is owed, and FF-7103 was widened in place
with three new legs, each with a recorded red probe.

**Two findings remain open, both Important, neither a story 118 defect.** F-118-A is a red control
inherited from the committed corpus, which this story's own records push further from rather than
toward; F-118-B records that the decider has no production caller, so that a green decider suite is
never later read as proof the loop consulted it.

**And the rule was applied to this gate's own findings, which is the first test of it that matters.**
F-118-A is checklist-shaped in appearance and would have been question 3's chore under the old rule;
under the new one it is not cheap, but it needs criteria a `.feature` must state, so it is handed to
the operator. F-118-B is recorded. **This close created no chore** — which is the outcome the story
exists to make ordinary.
