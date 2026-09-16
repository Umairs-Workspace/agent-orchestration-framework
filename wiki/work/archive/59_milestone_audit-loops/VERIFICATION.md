---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Four sections: the evidence, the fitness register (the red probe per declared control), the
  findings, and the accept decision. Write only the sections that have content — the absence of a
  section is information, and an empty "None" placeholder is not.

  OPENED AT REFINE, 2026-08-29, carrying the register alone. Ten controls were declared in
  ARCHITECTURE.md at break-down, and each of them owes a red probe here once its file lands; the
  register exists from the start so that obligation is visible rather than remembered.

  STAGE ONE closed 2026-08-29 (59/00 and 59/01 accepted; FF-5901–FF-5904 probed).
  STAGE TWO, 2026-08-30 (`aof:verify 59`): 59/02, 59/03 and 59/04 have landed, FF-5911 was added to
  the declaring register by the architect at the milestone close, and all ELEVEN controls now resolve
  on disk with a recorded red probe. STAGE THREE, the same day: D-59-3 and D-59-6 were fixed inline on the operator's instruction, 59/04 and the milestone are ACCEPTED, and FF-5908 gained the leg that makes D-59-3 a red gate rather than a thing found by eye.
-->
# 59 · The audit loop — Verification

## Fitness functions

<!-- CITING register (66/ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing. The red-probe cell records
     WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control and this row is where a reviewer reads that it was observed failing. An
     assertion nobody has ever seen red cannot be falsified by its own green.

     An untouched placeholder cell is a MISSING red probe rather than a recorded one. Four rows
     extend a guard already in service (FF-5903, FF-5905, FF-5907, and FF-5908 as extended by 59/04)
     — for those the red probe is the ONLY evidence the change is armed, because the file was already
     green before this milestone touched it.

     EVERY PROBE BELOW WAS APPLIED TO THE WORKING TREE, RUN, AND REVERTED, with `git status` on the
     probed file confirmed clean afterwards. The `result` cell counts the WHOLE control file, which
     for the three extended guards includes legs owned by earlier milestones. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-5901 | `test/arch/acd-auditor-taxonomy-additive.test.mjs` | green — 6/6 assertions pass (`aof:verify 59`, 2026-08-29) | `"actuator"` added to `AUDITOR_KEYS` in `src/work-loops.mjs`. **2 of 6 assertions went red**: *"the auditor's frozen key set"* — `+ 'actuator'` in the actual set — and *"actuator: one slip, one finding"* — expected `['loop-key-not-admitted-for-kind']`, observed `[]`. Reverted. |
| FF-5902 | `test/arch/acd-anchor-freshness-declared.test.mjs` | green — 3/3 assertions pass (`aof:verify 59`, 2026-08-29) | `"checked"` added to `LOOP_KEYS` in `src/work-loops.mjs`, admitting the key on a second kind. Red: *"`checked:` is admitted on `kind: anchor` and on no other kind"* — actual `['loop', 'anchor']` against expected `['anchor']`. Reverted. |
| FF-5903 | `test/arch/acd-test-suite-registration.test.mjs` *(extended)* | green — 4/4 assertions pass (`aof:verify 59`, 2026-08-29) | `...auditSpawnBoundedTests,` deleted from the assembled `tests` array in `scripts/test.mjs`, **import left in place** — the exact 15e0a92 shape the old source-text lane could not see. Red, and it named the file: *"`audit-suite-imported-never-spread  test/audit-spawn-bounded.test.mjs` … is IMPORTED by a runner and none of the tests it exports reach the assembled suite — the binding is imported and never spread, so the file looks registered and executes nothing. First missing: \"audit-spawn/03 …\""*. Reverted. |
| FF-5904 | `test/arch/acd-audit-never-imports-project-code.test.mjs` | green — 5/5 assertions pass (`aof:verify 59`, 2026-08-29) | `export async function probe() { return await import("../work-loops.mjs"); }` appended to `src/work-audit/census.mjs`. Red: *"src/work-audit/census.mjs contains a dynamic `import()` — importing a project module EXECUTES ITS MODULE SCOPE inside the aof process, which is 66/ADR-004 §2's refusal."* Reverted. |
| FF-5905 | `test/arch/acd-controls-never-execute.test.mjs` *(extended)* | green — 15/15 assertions pass (`aof:verify 59`, 2026-08-30); 5 of the 15 are 59's FF-5905 legs, the rest 66's FF-6605 and 54's FF-5407 | `import "./work-audit/census.mjs";` prepended to `src/work-doctor.mjs` — a doctor→executor edge, the one thing ADR-002 §2 makes structural rather than conventional. Red on the CLOSURE leg, and it named the TRANSITIVE hop as well as the planted one: *"doctor reaches the audit family: `src/work-audit/census.mjs`, `src/work-audit/spawn.mjs`. The boundary between reading and executing is the COMMAND (ADR-002 §2); an import makes it a convention."* — actual `['src/work-audit/census.mjs', 'src/work-audit/spawn.mjs']` against expected `[]`. Reverted. |
| FF-5906 | `test/arch/acd-evidence-oracle-is-a-message.test.mjs` | green — 11/11 assertions pass (`aof:verify 59`, 2026-08-30) | `const failCount = [].length;` prepended to `src/work-audit/evidence.mjs` — a pass/fail tally identifier in the lane whose oracle must be the message. Red on lane (A): *"src/work-audit/evidence.mjs: carries a pass/fail tally identifier — this lane's verdicts compare dispositions and messages, never counts (ADR-004 §3)"*. Reverted. |
| FF-5907 | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* | green — 7/7 assertions pass (`aof:verify 59`, 2026-08-30); 2 of the 7 are 59's FF-5907 legs, the rest 52/55/57/58's | `const PROBE_WINDOW_MS = 86400000;` appended to `src/work-loops-checks.mjs` — a duration literal in the leaf where every window must arrive on the call. Red on the magnitude rule: *"no numeric literal is large enough to be a duration in milliseconds"* — actual `[86400000]` against expected `[]`. Reverted. |
| FF-5908 | `test/arch/acd-audit-reports-what-it-read.test.mjs` *(extended again at verify)* | green — 9/9 assertions pass (`aof:verify 59`, 2026-08-30); the ninth is the limit leg D-59-3's fix added | **Two probes, because the control gained a leg at this pass.** (a) `floor: 1` → `floor: 0` on the `anchor-freshness` entry of `AUDIT_LANES` (`src/work-loops-checks.mjs`) — a lane that can no longer tell "found nothing" from "looked at nothing". **3 assertions went red**: *"sweep anchor-freshness declares no floor — a sweep without a floor cannot tell \"found nothing\" from \"looked at nothing\", and a default floor would make that indistinguishable everywhere at once (ADR-004 §1)"*; *"anchor-freshness: a lane that read nothing raises exactly one finding about it"* — `0 !== 1`; and the one-shape leg, *"checks: and a floor"*. (b) For the new limit leg: `sweepLimits()` in `src/work-audit/census.mjs` restored to its **pre-D-59-3 vocabulary** (`claim`/`limit` in place of `question`/`consequence`) — the exact bytes that shipped the defect. Red, and the message carries the defect's own signature: *"a shipped limit carries exactly the frozen keys: **undefined**"*, `- 'answeredBy'` against the frozen set. Both reverted. |
| FF-5909 | `test/arch/acd-audit-reports-to-the-owner.test.mjs` | green — 7/7 assertions pass (`aof:verify 59`, 2026-08-30) | `for (const owner of owners) candidates.delete(owner);` deleted from `resolveAddressees` (`src/work-audit/report.mjs`) — the culprit subtraction, so an owner may hear about its own instrument. Red over the SHIPPED registry rather than over a fixture: *"prose:src/bundle/agents/aof-developer.md (anchor-stale): addressed to `[actor:operator, actor:product-owner, loop:autonomous-cascade]` while owned by `[loop:autonomous-cascade, loop:build-to-green, loop:review-fix-rereview, loop:verify-triage-accept]` — a loop deciding whether its own bad news matters is the arrangement this milestone replaces"*. Reverted. |
| FF-5910 | `test/arch/acd-day-one-audit-complete.test.mjs` | green — 7/7 assertions pass (`aof:verify 59`, 2026-08-30) | `loop:build-to-green` added to BOTH `audits:` and `reporting:` on `src/bundle/loops/instrument-audit.md` — the auditor reporting to something it audits. Red on the intended leg: *"the auditor does not report to anything it audits, and it declares no edge the kind refuses"* → *"no node appears in both its reporting edges and its subject list"*, actual `['loop:build-to-green']`. **Two further plants were also caught, one leg earlier, and the reason is worth recording:** `watcher:build-to-green-watcher` in `reporting:` and `actor:operator` in `audits:` each red the *registry-loads-clean* leg as `loop-bad-value`, because the endpoint grammar admits actors on `reporting:` and never on `audits:`. The disjointness leg is therefore belt to the grammar's braces — reachable only through the one scheme (`loop:`) both keys admit. All three reverted. |
| FF-5911 | `test/arch/acd-strict-is-two-policies.test.mjs` | green — 6/6 assertions pass (`aof:verify 59`, 2026-08-30) | `return strict && errors > 0 ? 1 : 0;` → `return errors > 0 ? 1 : 0;` in `src/commands/audit.mjs` — the harmonisation toward doctor the control exists to refuse. **3 of 6 assertions went red**: the audit's own policy leg (*"the audit's exit policy is `strict && errors > 0` — an error alone is advisory, and a warn-only run exits 0 EVEN under `--strict`"*); the two-cell divergence leg, which printed both tables and named the failure mode — *"A SHRUNK list means somebody harmonised the two — most likely by making the audit gate on a bare error, which adds a sixth rung to 54/FF-5409's FROZEN cost ladder by the back door"*; and the envelope leg, *"work:audit @ error/plain: a CI step reading `healthy` and one reading the exit code reach the SAME verdict"* — `true !== false`. Reverted. |

## Verification evidence

<!-- STAGE ONE, 2026-08-29 — the first two rows, for {59/00 ‖ 59/01}, ADR-008's first landing stage.
     STAGE TWO, 2026-08-30 — 59/02, 59/03 and 59/04's lanes, the eleven-control probe sweep, and the
     dogfood run of the command this milestone ships.

     THE FULL-REPOSITORY SUITE WAS RUN AT THIS PASS, and it earned its keep: it is what found D-59-6,
     a red gate no story's own lane could see. It is not runnable WHOLE on this control node —
     `test/global-work-propagation.test.mjs` binds :4182, which the live control daemon holds — so the
     assembled `tests` array was imported and run with that one suite's six entries excluded, under
     the same per-test `AOF_GLOBAL_HOME` the runner uses. 7,488 of 7,494 selected. The exclusion is
     named rather than silent, and it is the only one.

     Every scenario in all five stories is `@executable`. There is NO `@manual` lane and NO `@uat`
     lane anywhere in this milestone, so no procedure was brokered and no human was asked for
     anything. No story carries a `DESIGN.md` or a frontend surface, so the design-conformance step
     does not apply.

     The per-story lanes were run FOCUSED: each story's own suites imported from their test-array
     exports and run under a per-test `AOF_GLOBAL_HOME`, exactly as `scripts/test.mjs` does it.
     `node --test` over these files is a silent false pass — they export arrays, they do not register
     with the node runner. -->

| story | lane | procedure | result | verifies → |
|---|---|---|---|---|
| 59/00 | `@executable` | The story's twelve suites imported from their test-array exports and run under a per-test `AOF_GLOBAL_HOME`: the two milestone-59 controls (`acd-auditor-taxonomy-additive`, `acd-anchor-freshness-declared`), the behavioural suites its scenarios extend (`anchor-taxonomy`, `work-loops-record`, `work-loops-value`) and the six sibling taxonomy/registry gates its widening could have broken (`acd-loop-vocabulary-closed`, `acd-anchor-taxonomy-additive`, `acd-watcher-taxonomy-additive`, `acd-arbiter-taxonomy-additive`, `acd-registry-framework-owned`, `acd-anchor-grounding-seed`, `acd-registry-fixture-closed`). | **129/129 pass, 0 fail** | `tasks/00_a-sixth-kind.feature`, `tasks/01_what-an-auditor-must-declare.feature`, `tasks/02_an-auditor-cannot-act.feature`, `tasks/03_the-report-is-an-edge-and-nothing-points-back.feature`, `tasks/04_an-anchor-says-when-it-was-checked.feature` |
| 59/01 | `@executable` | The story's seven suites run the same way: the new behavioural pair (`instrument-census`, `audit-spawn-bounded`), the milestone-59 control (`acd-audit-never-imports-project-code`), the extended registration gate and its reciprocal (`acd-test-suite-registration`, `acd-roundtrip-registration`), and the two re-armed suites the story REPAIRED after they rotted red while dead (`mesh-node-identity`, `mesh-registry-store-seam`). | **49/49 pass, 0 fail** | `tasks/00_registration-is-membership-not-text.feature`, `tasks/01_the-de-armed-suites-are-re-armed.feature`, `tasks/02_the-census-reports-what-it-read.feature`, `tasks/03_the-audit-runs-code-in-a-child-and-never-in-itself.feature` |
| 59/02 | `@executable` | The story's three suites: the behavioural lane (`evidence-re-run`, 32 cases), its own control (`acd-evidence-oracle-is-a-message`, 11) and the extended never-executes guard it re-asserts from this side (`acd-controls-never-execute`, 15). | **58/58 pass, 0 fail** | `tasks/00_the-register-is-re-executed.feature`, `tasks/01_the-oracle-is-the-message.feature`, `tasks/02_evidence-that-cannot-run-says-so.feature`, `tasks/03_the-count-recorded-is-the-count-observed.feature` |
| 59/03 | `@executable` | The story's five suites: the new behavioural lane (`instrument-staleness`, 31), the two suites over the leaf it widened (`work-loops-checks`, 32; `work-loops-registry-census`, 15), its own control (`acd-audit-reports-what-it-read`, 8) and the extended purity guard (`acd-loop-checks-pure`, 7). | **93/93 pass, 0 fail** | `tasks/00_an-unrefreshed-anchor-is-not-an-anchor.feature`, `tasks/01_an-instrument-that-has-said-nothing.feature`, `tasks/02_a-metric-that-has-not-moved.feature`, `tasks/03_a-loop-nobody-consults.feature` |
| 59/04 | `@executable` | The story's five suites: the command's behavioural lane (`audit-command`, 38), the two registry surfaces it touches (`work-loops-commands`, 26; `groundedness-report`, 5) and its two controls (`acd-audit-reports-to-the-owner`, 7; `acd-day-one-audit-complete`, 7). | **83/83 pass, 0 fail** | `tasks/00_one-command-over-the-instruments.feature`, `tasks/01_bad-news-does-not-travel-through-the-culprit.feature`, `tasks/02_the-escalation-bypass.feature`, `tasks/03_the-day-one-auditor.feature` |
| 59 (close) | `@executable` | The control the architect added at the milestone close, run on its own: `acd-strict-is-two-policies`. | **6/6 pass, 0 fail** | `ARCHITECTURE.md#fitness-functions` (FF-5911) |
| 59 (all) | fitness functions | All ELEVEN declared controls run green, then each run again with the invariant it guards deliberately broken in the working tree, and the probed file reverted and re-checked with `git status`. | **11 green, and all eleven observed RED under probe** — see `## Fitness functions` | `ARCHITECTURE.md#fitness-functions` |
| 59 (dogfood) | agent-run | The command this milestone ships, run over this repository by the product owner rather than over a fixture: `aof work audit`, then `aof work audit --json`. | **0 error(s), 49 warning(s), exit 0.** All three lanes ran and each declared its population against its floor: `instrument-census` — `suite-population=899/300, runner-bindings=897/100, assembled-suite=7494/500`, 0 findings; `evidence-re-run` — `register-rows=114/1`, 48 findings; `registry-checks` — `anchor-freshness=3/1, instrument-silence=8/1, metric-movement=3/1, loop-consultation=7/1`, 1 finding. Every finding carried `about … → to actor:…`, and none was addressed to a loop that owns the instrument it is about. The escalation line resolved to `actor:operator`. **The limits footer is defective — see D-59-3.** | `stories/04_story_the-audit-face/tasks/00_one-command-over-the-instruments.feature`, `…/01_bad-news-does-not-travel-through-the-culprit.feature`, `…/03_the-day-one-auditor.feature` |
| 59 (branch) | milestone gate | The assembled `tests` array from `scripts/test.mjs` imported and run whole under a per-test `AOF_GLOBAL_HOME`, excluding only `test/global-work-propagation.test.mjs` (6 entries), which binds :4182 against the live control daemon. Run TWICE — before the D-59-3/D-59-6 fixes and after. | **Run 1: 7,485 / 7,488.** Three failures. One real and 59's — **D-59-6**. **Run 2, after both fixes: 7,492 / 7,493** (the population grew by the five cases those fixes added). D-59-6 gone; ONE failure, in the same load-sensitive suite family, and a DIFFERENT case from run 1's. Every one of the three timing failures has since been observed green — see **D-59-7**, which records why they are load artifacts rather than regressions and how each was settled. | — |
| 59 (branch) | flake adjudication | The three non-D-59-6 failures, each observed under a different load. | `87/00 the withdrawal reaches exactly the surfaces…` (`framework-stops-shipping-guard`) — red in run 1, **green in run 2**. `premature-done: an end_turn that goes quiet but RESUMES…` (`mesh-worker-completion-detection`) — red in run 1, **green in run 2 and green in isolation**. `declared completion: the DIRECTIVE_COMPLETE sentinel settles after the SHORT confirmation window…` (same suite) — green in run 1, red in run 2, **green in isolation, 7/7 with the machine idle**. No case failed twice, no two failures were the same case, and none is in a file any 59 story owns. | — |
| 59 (stream) | gate | `aof work validate 59` | **PASS — 59 is well-formed** | — |
| 59 (stream) | gate | `aof work doctor 59`, read at BOTH severities for `control-unresolved` | **No `control-unresolved` finding at either severity** — all eleven declared controls resolve on disk. The `verification-missing-red-probe` errors doctor reported before this pass (six untouched probe placeholders, plus FF-5911 declared with no row here) are what this document's register now closes. Re-run after this pass's writes: the eleven `verification-missing-red-probe` errors this register closes are gone and NOTHING remains at error severity. What remains is warn-only — D-59-2 and D-59-4 below, the standing `numbering-gap`, and two `mtime-ahead-of-updated` notices on 59/00 and 59/01 whose folders gained an `OUTCOME.md` after their recorded `updated:` date; their `updated:` is deliberately not bumped, because neither story was touched at this pass and re-dating an accepted record to a day nothing changed on it is the worse error. `Loop-Ready` moved 70% → 80%. | `ARCHITECTURE.md#fitness-functions` |

## Findings

<!-- Register for milestone 59. Ids allocated HERE, at the moment of landing, by the single writer
     (`aof:verify`'s product owner) — never read-then-allocate. -->

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| D-59-1 | `59/00`'s `reads:` cited `wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#Fitness functions`, which does not resolve — `storyAnchorResolves` slugifies the heading, so the anchor has to be spelled `#fitness-functions`. `aof work validate 59` reported it as the stream's only issue, which held the accept gate closed. | contract-defect | blocker | Fixed in place at verify — a malformed pointer in a record doc the product owner owns, not a behavioural defect, so it earns no `@bug` scenario and no return to `aof:continue`. The anchor now resolves and validate is PASS. | 59/00 `STORY.md` | closed |
| D-59-2 | `aof work doctor 59` reports `rubric-join-unchecked` for all five stories: `work.rubric.report` is declared in `.aof/aof.config.json` as `{ "format": "tap", "floor": 500 }` with **no `path`**, so `readReport` finds no snapshot report and the `@executable`→emitted-case join is never checked. The lane reports honestly that it did not run — it does not report the scenarios unjoined — so nothing is green for the wrong reason, but the traceability instrument is dark stream-wide. | instrument-gap | non-blocker | Deferred to the backlog. Pre-existing and not caused by 59; the direct evidence above (every story's suites run and counted) is stronger than the join would have been. Worth noting that this is precisely the species milestone 59 exists to detect — a configured-looking instrument that reads nothing. | backlog | open |
| D-59-3 | `aof work audit`'s human face renders two of its three lanes' limits as literal absent values. Measured on this repository, 2026-08-30: the report footer prints `limit (instrument-census): undefined — undefined` **twice**. Cause: two limit vocabularies. `sweepLimits()` (`src/work-audit/census.mjs`, 59/01) emits `{sweep, basis, claim, limit, authority}`; `REGISTRATION_LIMIT` and the evidence lane's per-run limit (`src/work-audit/evidence.mjs` and `src/commands/audit.mjs`, 59/02) emit `{question, answeredBy, consequence}`; the renderer (`src/commands/audit.mjs:232`) interpolates `${limit.question} — ${limit.consequence}` for every entry. `--json` carries both shapes in full, so the operator's DEFAULT face is the only one that loses the text. One of the two lost lines is `spreadClaimLimit()` — the disclosure that the text-level registration claim has two shapes that de-arm a suite while satisfying it — and it is lost in exactly the case 59/01's review promoted it for: a CLEAN census lane, which is what this repository produces today. | defect | **blocker** | **FIXED INLINE at this pass**, on the operator's instruction, rather than returned to `aof:continue`. The contract was authored first as `59/04/tasks/04_the-limits-are-stated-in-one-shape.feature` (`@bug @finding-D-59-3`, four `@executable` scenarios) and then built to green, which is the same order `aof:continue` would have used. It is FF-5908's own ruling one field over: that control made the READ record ONE shape across all three lanes on the reasoning that no lane's record may be substitutable-looking and unsubstitutable; the LIMIT record was left with two spellings. **What landed:** `LIMIT_KEYS` / `limitRecord` / `limitDeclarationProblems` in `src/work-audit/reads.mjs` beside the read record — complete by construction, refused at construction and again at lane assembly (`assertLaneLimits`, `report.mjs`) rather than rendered blank; `sweepLimits()` and `REGISTRATION_LIMIT` built through it; the face rendering every limit with its lane, its sweep, and its qualifiers on their own lines. **And it is now a control**, because a green `@executable` suite did not catch it: FF-5908 gains a leg binding RENDERER KEYS ⊆ DECLARED KEYS over the limits the lanes really ship — the fixture lanes all declared `limits: []`, which is why nothing rendered one. Probed red against the pre-fix bytes. | 59/04 — closed | closed |
| D-59-4 | `aof work doctor 59` reports `control-runner-unchecked`: eleven controls are declared here and `work.controls.runners` is unset in `.aof/aof.config.json`, so doctor's leg B — *does a runner name this file?* — has never run, for this milestone or any other. Leg A alone has decided control health throughout. | instrument-gap | non-blocker | Deferred; already ledgered by the architect as TECH_DEBT 69, which also records why arming leg B **as written** would be worse than the warn: it is the `runners.includes(basename)` substring rule that 59/01 retired as unsound. The registration question is answered for this milestone by a stronger instrument — FF-5903 decides membership inside the runner's own process, and the dogfood run above reports `runner-bindings=897/100` and `assembled-suite=7494/500` from a child that actually imported the runner. | backlog (TECH_DEBT 69) | open |
| D-59-6 | `test/bundle-asset-manifest-complete.test.mjs` is RED at HEAD on this branch: *"the real `src/bundle/**` tree carries exactly 84 files — 85 !== 84"*. 59/04 (`b517e896`) added `src/bundle/loops/instrument-audit.md`, the day-one auditor record — the 85th file — and correctly registered it in `src/bundle/manifest.json` and `src/bundle/bundle.json`, but did not move the hand-pinned count in that suite, which was last moved to 84 by 58/01. Reproduced in isolation after the concurrent run, so it is not a flake. | regression | **blocker** | **FIXED INLINE at this pass**: the literal moved 84 → 85 and the suite's own recurrence note gained the seventh entry. No `@bug` scenario — the contract IS the assertion and the fix is the literal. **This is the SEVENTH recurrence of a species the suite's own comment has already argued five times** — *"the story that grew the tree did not move the literal, and the gate that told us was a census in another milestone's suite"* — and its verdict, recorded at the fourth recurrence, is that a comment asking each future author to remember is the wrong instrument for a number derivable from the tree it measures. That verdict is now evidence rather than opinion, and it is retro material for this milestone in particular: a pinned literal nobody derives is an instrument that rots, which is 59's whole subject. | 59/04 — closed | closed |
| D-59-7 | `test/mesh-worker-completion-detection.test.mjs` and `test/framework-stops-shipping-guard.test.mjs` carry assertions that fail under CPU load and pass idle. Measured across two full-suite runs and one isolated run: three distinct cases failed, no case failed twice, and every one has been observed green. The mechanism is visible in the source — `defaultWatchTranscriptCompletion` is driven with `pollMs: 5` behind a real `await new Promise((r) => setTimeout(r, 40))`, so the assertion depends on roughly eight poll ticks fitting inside a 40 ms wall-clock sleep. Under a 7,493-case run that budget is not met, and WHICH case loses is a function of scheduling, which is why the failure moved between runs. | flaky-instrument | non-blocker | Deferred to the backlog, and recorded here rather than in a passing note because of what it is: an assertion that reports the machine's load as the system's behaviour. That is a milestone-59 species — an instrument whose reading is not about its subject — sitting inside the gate this milestone is accepted on. It is not 59's code and no 59 story owns either file, so fixing it here would be a fourth sole-writer crossing in one pass for a defect the milestone did not introduce. **The fix is to drive the clock rather than the scheduler**: both suites already inject a `now`, so the poll loop should be advanced deterministically instead of waited on. | backlog | open |
| D-59-5 | An auditor's `audits:` and `escalation:` endpoints are checked for SCHEME and never for RESOLUTION. Measured on the shipped registry at verify, 2026-08-30: `audits: [watcher:no-such-watcher-typo]` produces **zero** findings, and so does `escalation: actor:nobody-declares-me`, against a loader that emits 18 findings overall — so an auditor's declared subject can be nothing, permanently, and its bypass can terminate at an actor no record declares. `src/work-loops-checks.mjs` mentions neither key. | coverage-gap | non-blocker | Deferred to the backlog. Raised by both review lanes at 59/00 and routed to 59/03; 59/03's four task features contract anchors, instruments, metrics and loops and none of them contracts endpoint resolution, so the story delivered its contract in full and this is a carry rather than a defect in it. The day-one record is covered — FF-5910 asserts every `audits:` pointer resolves and that `escalation:` names a declared actor whose `ground:` is exogenous — so what is uncovered is a project-authored auditor, of which none exists yet. Not routed into 59/04's return: the fix belongs in 59/03's file, and crossing the sole-writer boundary twice in one pass is what ADR-008 §2 exists to stop. | backlog | open |

## Accept decision

<!-- STAGE ONE (2026-08-29) accepted 59/00 and 59/01; both blocks are kept verbatim below.
     STAGE TWO (2026-08-30) accepts 59/02 and 59/03, declines 59/04, and therefore does not reach
     the milestone's own gate. -->

**59/00 — ACCEPTED** (2026-08-29). All five task features are `@executable` and the story's lane is
129/129 green; FF-5901 and FF-5902 are green and both were observed RED under probe; `aof work
validate 59` is PASS; no blocker finding is open (D-59-1 is closed).

**59/01 — ACCEPTED** (2026-08-29). All four task features are `@executable` and the story's lane is
49/49 green; FF-5903 and FF-5904 are green and both were observed RED under probe; the twenty-six
re-armed suites and the fast-lane-only six are members of the assembled runner suite, which the
extended FF-5903 now decides by runtime membership rather than by reading the runner's text; no
blocker finding is open.

**59/02 — ACCEPTED** (2026-08-30). All four task features are `@executable` and the story's lane is
58/58 green; FF-5905 and FF-5906 are green and both were observed RED under probe — FF-5906's is the
one that carries the story, because it is the leg proving a verdict cannot be reached from a tally.
The story reached `in-review` through `aof:continue`'s review gate. `aof work validate 59` is PASS.
No blocker finding is open against this story: D-59-3 is a defect in the FACE assembled by 59/04, not
in this lane's verdicts, and the evidence lane's own limit is the one shape the renderer reads
correctly.

**59/03 — ACCEPTED** (2026-08-30). All four task features are `@executable` and the story's lane is
93/93 green; FF-5907 and FF-5908 are green and both were observed RED under probe. The leaf still
imports nothing and holds no date, clock or duration literal — the probe is the whole of that
evidence, because the file was green before this milestone touched it. The story reached `in-review`
through `aof:continue`'s review gate. `aof work validate 59` is PASS. No blocker finding is open
against this story: the `AUDIT_LANES` floors it declares are read correctly by the face, and D-59-3
is about the limits footer, which this lane does not write. **D-59-5 is open against this story's
file and is deliberately not a blocker on it** — the two endpoint-resolution gaps were routed here
from 59/00's review as coverage questions for the check lane, and none of this story's four task
contracts contracts them. The story delivered what it was asked for; the carry is recorded in the
register and in its `OUTCOME.md` `## Gaps` so accepting it does not lose the question.

**59/04 — ACCEPTED** (2026-08-30), after two blockers found at this gate were fixed inline at the
operator's instruction. Its five task features are `@executable` and its lane is 87/87 green (83 at
arrival, plus the four cases the D-59-3 contract added); FF-5909 and FF-5910 are green and both were
observed RED under probe; `aof work validate 59` is PASS.

What the story's own lane could not see, and the gate did:

- **D-59-3** — the command this story exists to deliver printed `undefined — undefined` where two of
  its three lanes' limits belong. Closed by giving the limit record ONE home beside the read record,
  refusing an unrenderable limit at construction and again at lane assembly, and — because a green
  `@executable` suite had not caught it — binding **renderer keys ⊆ declared keys** as a new leg of
  FF-5908, probed red against the pre-fix bytes.
- **D-59-6** — a red gate at HEAD: the day-one auditor record is the 85th file under `src/bundle/**`
  and the census pinned in `test/bundle-asset-manifest-complete.test.mjs` said 84. Closed by moving
  the literal. No new contract, because the assertion IS the contract.

**D-59-6 is the story-scoping trade working exactly as `aof:verify` describes it**, and it is worth
recording that the trade paid. A story's lane runs that story's own scenarios; the full suite runs
once, at the milestone gate, where the per-story commits make a poisoner mechanical to bisect. This
one was bisected in one step — `b517e896` is the commit that added the file. The cost the process
names in advance was also paid in full: the story sat `in-review` while poisoned, and both defects
were found by the gate rather than by the story.

**Recorded against this acceptance: the fix crossed ADR-008 §2's sole-writer boundary.** Closing
D-59-3 meant writing `src/work-audit/census.mjs` and `test/instrument-census.test.mjs` (59/01,
accepted) and `src/work-audit/evidence.mjs` (59/02, accepted), because the unified limit shape has to
be constructed where each lane declares its limits. The rule's actual hazard — two lanes writing one
file concurrently — did not arise: this was one sequential actor at verify, with the full suite run
afterwards. But the rule was crossed on the product owner's judgement rather than by an architect's
ruling, and saying so is the point of recording it.

The reason this is a blocker rather than a deferral is the milestone's own thesis. The limit is the
sentence that says *what this run could not see*; 59/01's review specifically promoted it from
"quoted into findings" to "declared on every result" because a limit quoted only into findings says
nothing in exactly the case a reader most needs it. The face loses it in exactly that case. A defect
that silences an audit's own statement of its blind spot is not a rendering nit in this milestone —
it is the failure mode the milestone was commissioned to end, reproduced in the milestone's own
deliverable.

**59 (the milestone) — NOT ACCEPTED.** A milestone is accepted only when ALL its stories are done, and
59/04 is not; separately, the branch does not close with a green suite (D-59-6). Everything else the
milestone gate asks for is in hand and recorded above: all eleven declared controls resolve on disk,
each is green, and each was observed red under a probe applied to the working tree and then reverted;
`aof work validate 59` is PASS; `aof work doctor 59` reports no `control-unresolved` at either
severity; the full assembled suite was run (7,485/7,488, one named exclusion); and the command itself
was run over this repository rather than only over fixtures. The milestone stays `in-progress`.
SUPERSEDED at the same pass — see below.

**59 (the milestone) — ACCEPTED** (2026-08-30). All five stories are `done`. Every gate the milestone
owns is in hand:

- **The eleven declared controls** all resolve on disk, are green, and were each observed RED under a
  probe applied to the working tree and then reverted, with `git status` re-checked each time.
  FF-5908 carries two probes, because it gained a leg at this pass.
- **The full assembled suite** — 7,492 of 7,493, one named exclusion (`global-work-propagation`,
  which binds the live daemon's port), and the single failure adjudicated as a load artifact with
  that case observed green in isolation (D-59-7).
- **`aof work validate 59`** — PASS. **`aof work doctor 59`** — nothing at error severity; no
  `control-unresolved` and no `verification-missing-red-probe` at either severity. Loop-Ready 80%.
- **The command itself**, run over this repository rather than over fixtures: 0 errors, 49 warnings,
  three lanes each declaring their population against a floor, every finding addressed away from the
  loop that owns its instrument, and — since D-59-3 — every limit stated in full.

**What is open, and deliberately so.** D-59-2, D-59-4, D-59-5 and D-59-7 are non-blockers, all four
recorded rather than carried in anyone's head: two dark traceability instruments, one coverage gap on
project-authored auditors, and two load-sensitive suites inside the gate itself. Three of the four are
the species this milestone exists to detect, which is the honest note to close on — the audit loop
ships with a written list of the instruments it cannot yet vouch for, and that list is the deliverable
working rather than a caveat on it.
