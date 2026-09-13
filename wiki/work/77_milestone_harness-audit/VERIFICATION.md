---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what evidence do we have that this milestone
  works? Owner: aof:verify (the product owner is the SINGLE WRITER of the findings register).
  Scaffolded at refine so the declared controls have a home for their red probes; the evidence rows
  are filled as each story lands, and the accept decision at the close.
-->
# 77 · Harness audit — Verification

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

     TWO ROWS ARE RATCHETS — GREEN ON ARRIVAL over a tree that has never held the defect — and their
     probes must PLANT the thing they forbid rather than repair a defect:
       · FF-7703. Measured 2026-09-03: this repo carries six hook entries, five marked and one
         deliberately unmarked (the operator's `guard-test-isolation` under `Bash\|PowerShell`), and
         ZERO duplicate pairs — 72/03 deleted the three RESEARCH.md measured, mid-session. The probe
         is a PLANTED unmarked twin of a managed entry, and it must additionally show that the
         operator's own unmarked guard is NOT reported, or the rule has the over-claiming shape
         72/ADR-005 §3 refused.
       · FF-7706, on its vocabulary leg only. The family spells `baseline` in one place today
         (`UNREGISTERED_BASELINE`, src/work-audit/census.mjs:96); the probe plants a SECOND meaning
         of the word, and separately plants a subject-root program join, so the two clauses are
         armed apart rather than one assertion wearing two names.

     THREE ROWS ARE NEGATIVE-SPACE CENSUSES and their probes must plant what they forbid, not remove
     what they require: FF-7702 (the lane states its own blindness), FF-7705 (the refresh is
     reachable from no CLI door and the family's closure cannot reach it) and FF-7708 (no lane is
     registered without a read floor). A census green over a tree that never held the literal proves
     nothing until the literal has been planted and seen to red.

     DELIBERATELY NOT RESTATED HERE, because a guard already in service walks the whole subject and
     would already fail on the breach — each is named in ARCHITECTURE.md's register with where it is
     discharged, and none is a gap:
       · 69/FF-6905 (no --max-turns / --max-budget-usd / -p / --print / --output-format argv is
         constructed for the claude driver anywhere in src/**) — ADR-009's first dropped rule.
       · 70/FF-7004 (--exclude-dynamic-system-prompt-sections travels with --append-system-prompt) —
         ADR-009's second.
       · 69/FF-6902 (no framework loop declares an uncapped or unresolvable ceiling) — ADR-008 is
         one row of the bounds join precisely so this is not re-derived.
       · 72/FF-7206 (no unmanaged entry in THIS repo's .claude/settings.json is command-equivalent to
         a managed one) — a repo control 72/ADR-005 §4 states does not travel; 77/01 builds only the
         travelling half.
       · 59/FF-5904 (the audit family imports no project code and spawns through one seam) — 77's
         four lanes are INSIDE that closure, so they are covered on arrival; this is the one place
         77 differs from 72, whose modules sat outside it and needed the species carried over.
       · 59/FF-5903 (a suite imported and never spread is not registered) and 59/FF-5905 (no shared
         finding code between doctor and audit) — both walk the whole subject already.
       · 70/ADR-007's budget controls (an over-budget artifact refuses acceptance). -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-7701 | `test/arch/acd-capability-gap-cites-a-code-span.test.mjs` | **GREEN** — 6 cases, all pass | **Widened the ambiguity rule to a guess**: `prompt-layer.mjs`'s `const role = roles.length === 1 ? roles[0] : (roles.length === 0 ? document.agentId : null)` → `roles.length >= 1 ? roles[0] : document.agentId`, so a clause naming TWO bolded roles attributes to the first. RED at `acd-capability-gap-cites-a-code-span.test.mjs:184` — *"a clause with TWO role words yields none — ambiguity reports nothing rather than guessing / 1 !== 0"*. |
| FF-7702 | `test/arch/acd-duplication-rule-states-its-blindness.test.mjs` | **GREEN** — 7 cases, all pass | **Planted the forbidden computation**: a `similarityThreshold = 0.5` plus a `wordOverlap()` set-intersection into `duplicationFindings`, widening pairing from byte-identity to near-match. RED at `acd-duplication-rule-states-its-blindness.test.mjs:129` — *"`similarity` appears nowhere in src/work-audit/prompt-layer.mjs's implementation — a threshold is a model inside a command specified to have none, and the number that decides truth would be un-reviewable / true !== false"*. |
| FF-7703 | `test/arch/acd-hook-rule-detects-never-writes.test.mjs` | **GREEN** — 6 cases, all pass; **ratchet, green on arrival** | **TWO LEGS, armed apart.** *(a) the over-claim* — deleted the pairing guard `if (managed.event !== operator.event \|\| managed.matcher !== operator.matcher) continue;` in `hook-wiring.mjs`. RED at `:225` — *"an unmanaged entry equivalent to a managed one under a DIFFERENT matcher: the rule cannot claim it"*, quoting the planted twin's own finding verbatim: *"PostToolUse (matcher "Write\|Edit"): one entry carrying the `aofManaged` marker and one carrying none resolve to the same invocation — `node ${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/artifact-sync-enqueue.mjs`…"*. *(b) never-writes* — planted `writeFileSync(settingsPath, JSON.stringify(settings…))` into `runHookWiring`. RED at `:144` — *"src/work-audit/hook-wiring.mjs holds no route to a settings write / ['src/work-audit/hook-wiring.mjs names a synchronous file write']"*, with 4 further legs red behind it. **The negative leg, confirmed on the pristine tree**: the operator's unmanaged `guard-test-isolation` entry (`PreToolUse` / `Bash\|PowerShell`) beside a managed `SessionStart` entry yields `[]` — the escape hatch 55/ADR-004 preserved is not claimed. |
| FF-7704 | `test/arch/acd-seam-liveness-unknown-is-a-limit.test.mjs` | **GREEN** — 8 cases, all pass | **Turned the unknown into a claim**: disabled `seam-liveness.mjs`'s `if (!present.has(candidate.rel)) { unresolved.push(…); continue; }`, so a candidate the graph reports `present: false` falls through to the unwired branch. RED at `acd-seam-liveness-unknown-is-a-limit.test.mjs:199` — *"a candidate the graph HOLDS with no dependents is named"*, with `src/b.mjs` (the absent node) added to the reported set. That is the rule's own worst bug, planted and seen. |
| FF-7705 | `test/arch/acd-reference-corpus-offline-and-sourced.test.mjs` | **GREEN** — 11 cases, all pass | **Opened the CLI door**: planted `import { reachSource } from "../../scripts/refresh-harness-reference.mjs"` into `src/work-audit/declared-bounds.mjs` — the audit path reaching the network-capable refresh. RED at `acd-reference-corpus-offline-and-sourced.test.mjs:225` — *"no module under src/ imports, spawns or spells the refresh program"*, naming BOTH routes: *"declared-bounds.mjs spells "scripts/refresh-harness-reference.mjs" as a literal"* and *"statically imports refresh-harness-reference.mjs"*. |
| FF-7706 | `test/arch/acd-audit-travels-two-roots.test.mjs` | **GREEN** — 11 cases, all pass; **ratchet on the vocabulary leg** | **TWO LEGS, armed apart.** *(a) the second meaning* — appended `export const REFERENCE_BASELINE = 1;` to `src/work-audit/toolkit.mjs`. RED at `:450` — *"the second meaning arrives in none of milestone 77's modules / ['src/work-audit/toolkit.mjs spells the exemption ledger's word']"*. *(b) the subject-root join* — `const probe = toolkitProgram(PROBE_PROGRAM)` → `path.join(repoRoot, PROBE_PROGRAM)` in `census.mjs`. THREE legs red, first at `:140` — *"the suite probe the census points at a runner: the path it started resolves under the toolkit root (…\aof-not-a-checkout-fixture\src\work-audit-probe.mjs) / false !== true"* — plus *"no module in the family joins a program path onto the subject root"* and the governed-workspace census leg, which observed the probe run out of the SUBJECT's temp fixture instead of the payload. |
| FF-7707 | `test/arch/acd-controls-never-execute.test.mjs` *(extended)* | **GREEN** — 16 cases, all pass; the file resolves today, so this row carries no `pending` marker in ARCHITECTURE.md's register | **Collided a 77 code with doctor's**: added `"control-unresolved"` to `SEAM_LIVENESS_FINDING_CODES`. RED at `acd-controls-never-execute.test.mjs:703` — *"the audit and doctor share the code(s) control-unresolved — one command's severity table would then decide the other's meaning (FF-5905)"*. This probe is the ONLY evidence the change is armed: the pre-77 form enumerated `AUDIT_FINDING_CODES` and `EVIDENCE_FINDING_CODES` by name at `:76-77` and would have been silently blind to a seam-liveness code. |
| FF-7708 | `test/arch/acd-audit-lane-registry-complete.test.mjs` | **GREEN** — 8 cases, all pass | **Registered a lane with no read floor**: `seam-liveness.mjs`'s `seam-source` sweep `floor: 1` → `floor: 0`. RED at `acd-audit-lane-registry-complete.test.mjs:202` — *"sweep seam-source declares no floor — a sweep without a floor cannot tell "found nothing" from "looked at nothing", and a default floor would make that indistinguishable everywhere at once (ADR-004 §1)"*. |

**Probe procedure.** Each probe was applied to the working tree, the control run in a FRESH `node`
process (`node scripts/test.mjs --only <control>` under a throwaway `AOF_GLOBAL_HOME`), the message
recorded verbatim with its source line, then REVERTED from a byte copy and the restore confirmed
byte-identical (sha256 before and after — every probe reported `BYTE-IDENTICAL`) before the next
probe began. `git diff --stat src/` after the last probe shows only 77's own delivered change set.

## Verification evidence

<!-- One row per verification claim. Filled as each story lands; the milestone gate rows at accept. -->

| claim | procedure | result | verifies → |
|---|---|---|---|
| The milestone's `@executable` suite is green | `node scripts/test.mjs --only` over 19 suite files — 77's twelve (`work-audit-prompt-layer`, `acd-capability-gap-cites-a-code-span`, `acd-duplication-rule-states-its-blindness`, `work-audit-hook-wiring`, `acd-hook-rule-detects-never-writes`, `work-audit-seam-liveness`, `acd-seam-liveness-unknown-is-a-limit`, `harness-reference`, `work-audit-declared-bounds`, `acd-reference-corpus-offline-and-sourced`, `acd-audit-travels-two-roots`, `acd-audit-lane-registry-complete`) plus the seven audit-family files 77 modified (`acd-controls-never-execute`, `acd-audit-never-imports-project-code`, `acd-codebase-grounding-no-parse`, `acd-codebase-grounding-via-commands`, `acd-evidence-oracle-is-a-message`, `audit-command`, `evidence-re-run`), under `AOF_GLOBAL_HOME=$(mktemp -d)` | **279 `ok`, 0 `not ok`, exit 0** | 77/00 tasks 00–02 · 77/01 tasks 00–01 · 77/02 tasks 00–02 · 77/03 tasks 00–02 · 77/04 tasks 00–01 · 77/05 tasks 00–02 |
| The whole fitness tier, run once at the milestone gate | The declared rubric (`scripts/test-rubric.mjs`) — every arch-test the assembled suite registers, enumerated FROM DISK, measured to bind no port on this control node. Run TWICE: first through `aof work grade 77 --run`, then directly after the repairs | **First run: 10 of 1649 failed.** Triaged into three groups, and the triage is the evidence: **2 were 77's own regressions** (**B-01**, **B-02** — fixed at this gate); **3 were self-interference**, because running the tier *through* `work:grade` sets the grade re-entrancy stamp that those very suites assert against (`arch/54 FF-5409`, both `arch/FF-5405` cases) — each re-ran GREEN standalone, so it was an artifact of the instrument, not a defect in the tree; **5 were inherited reds**. **Second run, direct, after both repairs: 1644 ok / 5 not ok** — every one of the 5 an inherited red with a home, and **zero attributable to 77**: `arch/58 FF-5809` → chore 93 (`not-started`) · `arch/61 FF-6109` → chore 92 (`not-started`) · `arch/43 ADR-005` cache-read pin → chore 91 (`not-started`) · `arch/71 FF-7106` → milestone 96's in-flight stories · `arch/chore-dod-checklist` → chore 97's own `CHORE.md`, which carries **0** `## Definition of Done` sections and cannot close without one | every `FF-NN` in this repository, 77's eight included |
| The composed command still runs clean after the two repairs | `aof work audit --strict --json` re-run over the repaired tree | **exit 0** — 337 findings, 0 error. One fewer than before the repairs, and the difference is the audit noticing its own gate: `evidence-contradicted` 5 → **4**, because a register row claiming a control green is no longer contradicted now that `arch/FF-6601` passes | 77/05 task 00 · 77/05 task 02 |
| The composed command runs clean in this repository | `aof work audit --strict` and `--strict --json`, isolated | **exit 0** — 338 findings, **0 error / 338 warn**. By code: `audit-instruction-duplicated` 262, `evidence-no-register` 44, `audit-agent-capability-gap` 9, `audit-seam-unwired` 6, `evidence-contradicted` 5, `evidence-size-drift` 5, `audit-bound-undeclared` 5, `audit-bound-off-reference` 1, `instrument-silent` 1. Every error leg of the seven codes 77 adds measures zero here | 77/05 task 00 (four lanes join the registry) · 77/05 task 02 (every error leg measures zero on arrival) |
| The live capability gap is real and lands at `warn` | Read the 9 `audit-agent-capability-gap` findings out of the `--json` run against `.aof/aof.config.json`'s `work.agents` | All 9 at **`warn`**, because `productOwner: "inline"` routes the role the finding names inline. Three are the `refine.md` → `aof-product-owner` instance ADR-003 predicted, one per rendering; six are the `.codex`/`.opencode` architect shape recorded as finding **D-01** below | 77/00 task 00 · 77/05 task 02 |
| Every declared control resolves and is registered | `aof work doctor 77`, reading `control-unresolved` at BOTH severities | **No `control-unresolved` at either severity** — all eight declared controls are on disk. Advisory warns only: `control-runner-unchecked` (leg B never ran — see **D-02**), `rubric-join-unchecked` ×6 (see **D-03**), `numbering-gap`. Loop-Ready 80% (8/10) | ARCHITECTURE.md `## Fitness functions`, all eight rows |
| The stream is well-formed at the gate | `aof work validate 77` | **PASS — 77 is well-formed** | the milestone's own gate |

## Findings

<!-- Single writer: the product owner, at triage. One row per finding, with its disposition. -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| B-01 | **77 turned an existing control RED.** `arch/m42-item-3` (`test/arch/acd-no-new-silent-catch.test.mjs`) reports *"NEW silent catch site(s) introduced — a degrade path must emit a coded event (mesh-log sink / onWarning), never say nothing: work-audit-drive.mjs: 1 silent catch site(s), baseline 0"*. 77/04 moved `scripts/drive-control.mjs` → `src/work-audit-drive.mjs`; the catch is a pre-existing best-effort `rmSync` cleanup at `src/work-audit-drive.mjs:190`, which was outside the census while the file sat under `scripts/` and is inside it now. Confirmed RED standalone, not only under the grade harness | **blocker** | error | **FIXED at the gate, 2026-09-03** (operator-authorised). The repair is to emit rather than swallow, and the channel is forced: the driver's stdout carries a single sentinel-prefixed JSON line and a second line there would corrupt the seam's one-line protocol, while stderr is already what `evidence.mjs` reads back on failure. `src/work-audit-drive.mjs:190` now writes one coded line — `AOF_DRIVE_CLEANUP_FAILED <homeRoot>: <message>`. A `BASELINE` entry was REFUSED: it would weaken a ratchet whose own header says it is *"now an outright ban everywhere else"*, and this fault is not one with nowhere to report | 77/04 | **closed** — `arch/m42-item-3` GREEN (both cases), re-run standalone |
| B-02 | **77 turned a second existing control RED.** `arch/FF-6601` (`test/arch/acd-feature-parser-single-home.test.mjs`) now reports THREE Gherkin recogniser homes instead of two, the third being `src/work-audit/prompt-layer.mjs:400` — the `audit-instruction-duplicated` finding message, whose clause *"**When** one is edited the other keeps instructing agents…"* is a keyword string sitting inside an object literal, which is the gate's shape 3 (a KEYWORD TABLE). The gate's own header states the opposite intent: *"a bare keyword string that is neither tested nor emitted as a document — a UI label or an error message… — is NEITHER, on purpose"*. So this is the **first false positive of the `{` widening**, whose header records *"measured, widening it to `{` costs 0 false positives across all 226 modules"* — 77 is the 227th. Confirmed RED standalone | **blocker** | error | **FIXED at the gate, 2026-09-03** (operator-authorised, repair **(a)** chosen of two). The `audit-instruction-duplicated` message's second clause is reworded to carry no Gherkin keyword: *"When one is edited the other keeps instructing agents with the superseded wording."* → *"Editing one leaves the other instructing agents with the superseded wording."* Contract-safe: no `.feature` criterion and no test asserts that clause — task 01's scenarios assert only *"reports N redundant bytes"* and the pair count/order — so no delivered acceptance criterion is touched. The rejected repair **(b)** was to narrow FF-6601's shape 3 so a prose message inside an object literal is not read as a keyword table; it is the larger change and repairs milestone 66's control to match its own header. **NOT taken, and therefore still true**: the gate's stated intent (*"an error message is NEITHER, on purpose"*) remains contradicted by its `{` widening, and the next module writing a keyword into a message string will hit this too | 77/00; the un-taken repair **(b)** → **D-11** | **closed** — `arch/FF-6601` GREEN (all 7 cases), re-run standalone |
| D-01 | The capability rule reads a grant from a `tools:` frontmatter key and from nowhere else. That is right for the Claude rendering and under-serves the other two: `.codex` agents declare no `tools:` key at all and `.opencode` expresses its grant as a `permission:` block (`bash: allow`), so every such document ordering a run is reported. Measured at the gate: of 9 `audit-agent-capability-gap` findings, **3 are the true `refine.md` instance** (one per rendering) and **6 are the architect shape** — a role whose grant is declared, in another key. The lane's own limit states its UNDER-reporting and is silent on this direction | non-blocker | warn | Defer to backlog. The locked contract's own row (*"no `tools:` key in the frontmatter at all → one finding"*) makes the current behaviour correct, so this is not a defect to fix inside 77; a per-runtime grant source needs new acceptance criteria | operator — story shape, no item created (77/STATE, 77/00–02 pass) | open |
| D-02 | `aof work doctor 77` reports `control-runner-unchecked` for all eight declared controls: no `work.controls.runners` is configured, so leg B (*does a runner name this file?*) never ran. Registration is in fact proven by `acd-test-suite-registration` inside the runner's own process, and independently by the rubric tier having executed all eight — but doctor cannot see either | non-blocker | warn | Defer. A project-config gap, not a 77 defect; the authority (`acd-test-suite-registration`) is green and the rubric run is the second witness | backlog — `.aof/aof.config.json` `work.controls.runners` | open |
| D-03 | `rubric-join-unchecked` fires for all six stories: `work.rubric.report` declares `format`/`floor` but **no `path`**, so the scenario→case join has no report to read and the 150 `@executable` scenarios are joined to cases by nobody. The gate is honest about not having looked — it is the "we never looked" branch, not a green | non-blocker | warn | Defer. Declaring `work.rubric.report.path` and pointing it at the tier's TAP output would arm the join for every future item; out of scope for 77, which declares no config change | backlog — `.aof/aof.config.json` `work.rubric.report.path` | open |
| D-04 | `wiki/work/TECH_DEBT.md` was written by 77/04 (closing items 70 and 72) and is not in that story's declared `files:` set, nor in any sibling's — so nothing was contended, but the write set does not describe the writes | non-blocker | warn | Defer. Reported so the convention is repaired at refine rather than rediscovered by breaking it | backlog — refine-time `files:` discipline | open |
| D-05 | 77's `reads:` sets were incomplete: five files outside them were genuinely required by 77/03 (`work-audit/seam-liveness.mjs` and its two suites, `work-audit/report.mjs`, `work-loops-checks.mjs`, `test/support/loop-registry-fixture.mjs`) | non-blocker | warn | Defer to the retrospective as a refine-time lesson — the contract's `reads:` set is authored before the builder knows which precedent it needs | `RETROSPECTIVE.md` | open |
| D-06 | This repository's installed prompt layer carries **262** duplicated file pairs at the shipped 120-byte floor, almost entirely because three runtimes hold near-identical copies of ~35 documents | non-blocker | warn | Defer — `ADR-004` anticipates it (`warn`, never reddens `--strict`), and TECH_DEBT item 79 already indicts the shape. This is the number it was missing | TECH_DEBT 79 | open |
| D-07 | The reference-corpus rows carry `checked: 2026-09-03` recording the day they were WRITTEN, not a day a source was opened — the audit path may not reach the network by construction (FF-7705), so the confirming run is a hand-run one | non-blocker | warn | Routed to an item rather than left as prose, because *"somebody should run the refresh"* is the sentence that stays true for a year | **chore 98** | routed |
| D-08 | `UNREGISTERED_BASELINE` (`census.mjs:96`) is aof's hardcoded list of aof's own suites and its on-disk check runs against the AUDITED workspace, so a governed project gets `audit-baseline-stale` at **error** for suites it was never going to have — measured, 2 of 6 error findings over a fixture workspace. TECH_DEBT 72's species, one lane over | non-blocker | error *(in a governed project; zero here)* | Not fixed in 77 — `ADR-002 §4` enumerates what 77 does not do and this is outside it. `acd-audit-travels-two-roots` PINS the exception (`ledgered.length > 0`) so the day the chore lands, that control fails and is updated rather than quietly tolerating what it was written to name | **chore 99** | routed |
| D-09 | The reference leg of the bounds join anchors its findings at `src/harness-reference.mjs`, a PAYLOAD path, and `report.address()` resolves a finding's `path` against the AUDITED project's root — so in a governed project the anchor names a file that is not there. The message says outright that the corpus ships with the installed payload | non-blocker | warn | Confirmed at 77/05 when the lane was registered and the face taken: the rendered anchor is cosmetic and the message carries the truth; the behavioural suite asserts the audited project is never named as the cause | closed in 77/05 | closed |
| D-10 | A governed project with **no** installed prompt layer and **no** settings file reports `audit-ran-on-nothing` at `error` from the prompt-layer and hook-wiring lanes — measured against a bare temporary directory | non-blocker | warn | No action. This is what those lanes' floors are FOR: *"found nothing"* and *"looked at nothing"* are the two facts `ADR-004 §1` keeps apart, and any project carrying an ACD bundle has both populations. Recorded so the first operator to run this in a bare repository reads the report as the rule working | 77/STATE → `RETROSPECTIVE.md` | closed |
| D-11 | **B-02's un-taken repair, recorded so it is a decision rather than an omission.** FF-6601's shape 3 (a keyword string inside an array or object literal is a KEYWORD TABLE) contradicts the same gate's own header, which says *"a bare keyword string that is neither tested nor emitted as a document — a UI label or an error message… — is NEITHER, on purpose"*. A finding message is an error message; sitting inside an object literal is what made it visible. B-02 was closed by moving 77's message out of the way, which leaves the gate's derivation exactly as it was: the next module under `src/` that writes `When `/`Given `/`Then ` into a message string reds FF-6601 pointing at the wrong thing | non-blocker | warn | Defer to milestone 66's owner. The narrowing is a change to another milestone's control, its consequence reaches every future module, and it is not 77's to make at 77's accept gate. The header records the widening as measured at *"0 false positives across all 226 modules"* — this is the 227th, so the measurement now has a counter-example to carry | backlog — FF-6601 / milestone 66 | open |

**No blocker finding is open.** Two were: `B-01` and `B-02`, both raised AT this gate and both closed
here. Every Blocker raised inside the six stories' own review rounds had already been fixed in its
round (77/STATE records each) — these two were different in kind, and worth saying why. Neither was
visible from any story's own scope: both are controls belonging to OTHER milestones (42 and 66) that
77's change set turned red, and neither could have been seen by a suite scoped to the story that
caused it. They were found only by running the whole tier once here, which is exactly the trade
`verify.md` describes when it scopes a story's suite to the story: *"a poisoning story is caught at
the gate, not immediately, and may need rework after being marked done. That is the intended trade,
not an oversight."* The trade was taken, it paid, and the rework was two lines.

## Acceptance

- [x] `@executable` suite green — 279 cases over the milestone's 19 suite files, exit 0
- [x] Every red probe recorded — 8/8 rows filled, 10 probes run (FF-7703 and FF-7706 carry two
      each), every restore byte-identical
- [x] Fitness functions green — 77's own eight, and the whole tier at **1644 ok / 5 not ok**, with
      **zero of the five attributable to 77**. Each of the five is an inherited red carrying its own
      item (chores 91, 92, 93, 97 and milestone 96's in-flight stories); none is admitted as 77's
- [x] `aof work audit --strict` green in this repo — exit 0, 0 error / 338 warn, exactly as the
      arrival expectation predicted
- [x] `@manual` signed off — **not applicable**: all 150 scenarios across the 16 task features are
      `@executable` (tag census: 16 `@executable`, 0 `@manual`, 0 `@uat`), so there is no manual
      lane to sign off and no human acceptance step. The `## Verification evidence` rows above are
      the agent-run gate checks, not `@manual` scenarios.

## Accept decision

**ACCEPTED — 2026-09-03**, after the gate refused it once.

All six stories built, reviewed and green. `aof work validate 77` returns **PASS**. `aof work doctor
77` reports **no `control-unresolved` at either severity**, so no declared control is unlanded and no
`pending` marker is standing in for a missing file. All eight of 77's declared controls have been
observed **RED against a planted breach** and restored byte-identically — ten probes, because two
rows carry two legs each. The milestone's own suite is **279 / 0**. The whole fitness tier ran once
here at **1644 / 5**, with none of the five attributable to 77. And the command this milestone exists
to build runs over its own repository with `--strict` and **exits zero** — 337 findings, every one a
`warn`, every error leg of the seven codes 77 adds measuring zero on arrival.

**The gate refused this milestone once, and that is the part worth recording.** The first tier run
raised two blockers — `B-01` and `B-02` — and neither was visible from the scope of the story that
caused it. Both were controls belonging to OTHER milestones (42's silent-catch ratchet, 66's
one-Gherkin-parser gate) that 77's change set turned red: one because 77/04 moved a file into `src/`
and carried a pre-existing `catch` into a census it had never been in, the other because a finding
message written in 77/00 contains the word *"When"* inside an object literal. Both were repaired at
this gate, under operator authorisation, and both controls re-run green. The trade `verify.md` names
— scope the suite to the story, run the tier once at the gate, accept that a poisoner is caught late
— was taken deliberately at refine and it paid here, twice, for a rework of two lines.

Eleven non-blocker findings are recorded above: two already carry items (chores 98 and 99), two are
closed, and seven are deferred. Two deserve a reader's attention.

**D-01** is the honest limit of what 77 shipped: the capability rule is correct against its locked
contract and still over-reports 6:3 on this repository, because two of the three runtimes express a
grant in a key it does not read. 77 shipped the rule that travels; the grant source that travels with
it is the next item's, and it needs acceptance criteria before code.

**D-11** is the repair `B-02` did not take. Moving 77's message out of FF-6601's way closed the
blocker without touching that gate's derivation, so the gate's own stated intent — *"an error message
is NEITHER, on purpose"* — is still contradicted by its `{` widening. Its header records that
widening as *"0 false positives across all 226 modules"*. 77 was the 227th, and the measurement now
has a counter-example to carry.
