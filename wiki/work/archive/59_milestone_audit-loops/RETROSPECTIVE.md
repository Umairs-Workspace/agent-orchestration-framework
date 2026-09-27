---
type: milestone
number: 59
slug: audit-loops
doc: retrospective
created: 2026-08-30
updated: 2026-08-30
schema: 1
aofVersion: 0.1.0
---
# 59 · Retrospective

Five stories, twenty-two task features, eleven declared controls, seven findings. The milestone that
exists to catch instruments reporting something other than what they measure **found four of them in
its own toolchain, and shipped two of its own**: a control that scanned nothing because its input is
gitignored, a fixture-only field whose green said nothing about the shipped value, a gate whose
verdict depends on CPU contention, and a text-classifying sweep that classifies by the path a file
spells. None of these was the subject of any story. All of them are the subject of the milestone.

The second theme is quieter and cost more hours: **`aof:refine` declared the wrong sets, four
different ways, and three of the four were reported by consecutive stories before anyone changed the
practice.** A story's `files:` and `reads:` are contracts about coupling, and this repository couples
through the *contents* of exported collections — which `aof graph impact` cannot see.

_Observability: `aof work observe 59 --write` wrote a snapshot with **zero** sessions. Every story was
built in a dispatch worktree under its own session, and those transcripts are not visible from the
control checkout — so there is no per-agent time/token/stall record for this milestone, and the
process lessons below are drawn from `STATE.md` and `VERIFICATION.md` alone._

## R1 — The milestone was blocked at the door by a stale cache, because an accepted item's status had been hand-edited

**Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** orchestration · **Raised by:** operator

`aof work next 59` answered *blocked on 58* while 58 was accepted and committed on disk. 58 and three
of its stories had their `status:` frontmatter edited by hand rather than moved through `aof work
status`, so no `item-status.changed` event fired and publish-on-mutate never ran. With the control
daemon down nothing re-published, and because `nextWorkCacheFirst` treats the cache as authoritative
for the depends gate, a driver `done` only on DISK blocks its dependents indefinitely.

**Lesson.** The lifecycle verb is the single writer for exactly this reason, and "it is a one-line
frontmatter change" is precisely the reasoning that breaks it. The deeper carry is that **nothing
reports disk↔cache divergence** — a natural candidate for this milestone's own audit lane, and not
built here.

**Refs:** `STATE.md` `## Feedback (for retro)`; commit `d46a173d`.

## R2 — A publish from a dispatch worktree silently overwrote the control's newer rows

**Kind:** blocker · **Area:** code · **Stage:** build · **Owner:** mesh · **Raised by:** operator

`buildStreamView` guards READS from a worktree (`isMeshWorktree` short-circuits the cache so a
worktree answers from its own disk); the PUBLISH path carries no equivalent guard, so
`publishItemProjection` hands `publishGlobalWorkSnapshot` the worktree as the workspace and writes the
WHOLE workspace snapshot from that worktree's older disk. Measured: `aof work status 59/01
in-progress` inside a worktree branched from an older HEAD reverted the control's `59/00` row from
`in-review` back to `in-progress`.

**Lesson.** Same failure class as R1 — the cache disagrees with the authoritative record and the
depends gate believes the cache — reached through a door that needs no hand edit at all. A publish
from a materialised worktree should be refused or narrowed to the refs the event names, exactly as
the operator-authorship rule already narrows publish-on-mutate.

**Refs:** `STATE.md` `## Feedback (for retro)`.

## R3 — Widening a frozen vocabulary touches every gate that states that vocabulary as a literal, and impact analysis cannot find them

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (59/00)

59/00's declared `files:` was nine short. Every one of the nine was a literal set-equality gate that a
purely additive widening reds by construction — `acd-loop-vocabulary-closed` (thirteen literals),
four sibling `*-taxonomy-additive` gates, `acd-registry-framework-owned`, `acd-anchor-grounding-seed`,
`acd-registry-fixture-closed`, and `src/commands/loops-graph.mjs`, where a two-directional parity gate
draws a sixth kind with no glyph as an undeclared endpoint. 59/04 hit the same shape one species
along: a new registered command reds every registry-DERIVED gate (`WORK_IDS` set-equality, the
CLI-bijection switch that throws on an unmapped sub, `BOARD_DEFERRED`, FF-5809's lane classification).

**Why.** Both couple through an exported collection's **contents**, not its identity, so
`aof graph impact` finds neither.

**Lesson.** A refine that widens an enum should enumerate the literal-set gates by grepping the
exported name; one that adds a command should enumerate them by grepping `startsWith("work:")` and
`listCommands()`. Neither is discoverable from the import graph.

**Refs:** `STATE.md` 59/00 items 2, 59/04 item 2.

## R4 — A story whose contract says "repair whatever this turns out to have broken" cannot enumerate its `files:` at refine

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (59/01)

59/01's ADR put "repair or ledger the suites this re-arming breaks" in scope, but which two of the
twenty-six had rotted red while dead was not knowable until they were run — so the story breached a
`files:` set that was never completable.

**Lesson.** Declare the set a story MAY repair (here: the twenty-six named suites), or state
explicitly that the write set is discovered. Leaving it implicit makes the builder choose between
breaching the contract and not doing the work.

**Refs:** `STATE.md` 59/01 item 1.

## R5 — `reads:` listed what a story imports, not the contracts it must not contradict — reported by three consecutive stories

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developers (59/02, 59/03, 59/04)

59/02 needed the gates that CONSTRAIN it (`acd-audit-never-imports-project-code`, `work-doctor.mjs`)
and had none of them declared. 59/03 needed `census.mjs` and `evidence.mjs` because ADR-004 §1 governs
the finding it emits — and its leaf imports nothing at all, so for it the import set and the contract
set are disjoint by construction. 59/04 repeated the same omission while its whole job was assembling
those two lanes behind one face.

**Why it is a refine habit and not three slips:** the third report says so explicitly, and nothing
changed between them.

**Lesson.** A `reads:` set must include the modules a story's ADR-level obligations point at, not only
its import graph. The strongest signal that this is wrong is a story that imports nothing.

**Refs:** `STATE.md` 59/02 item 2, 59/03 item 3, 59/04 item 1.

## R6 — A structural rule stated as a PATH or as SOURCE TEXT is a rule with a door, and it happened twice

**Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** both review lanes (59/01), architect (59/04)

FF-5904 froze "the audit never imports project code" over a DIRECTORY. Both review lanes planted an
escape and both passed all five lanes — QA one directory down (unseen by a non-recursive `readdir`),
the architect one directory up (`census.mjs` statically importing `../work-audit-loader.mjs`, which no
directory sweep covers). The subject is now the family's **import closure**, walked recursively and
re-proved against a synthetic module map so the recursion itself is drivable.

The same species, one gate over: FF-5809 classifies a suite by whether its source spells `bundle/loops`
— but `loadLoops(path.join(root, "src", "bundle"))` reaches the same sixteen records without spelling
`loops` at all, so two of 59/04's three new suites were invisible to the gate that exists to classify
them, and a third was inside the population only because an assertion *message* contained the string.

**Lesson.** 59/ADR-003 §2's own ruling — *registration is decided by runtime membership, never by the
runner's source text* — is a general rule this milestone applied to exactly one gate. It should be
swept over every text-classifying gate in the repository. A freeze must name what a module can REACH,
not where it sits or what it spells.

**Refs:** `@finding` 59/01 review item 6; `STATE.md` 59/04 item 3; TECH_DEBT 70 (closed), 75.

## R7 — A refusal keyed on characters refused legal paths, and would have failed every run rather than one

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** architect (59/01 review)

The spawn seam's `SHELL_SHAPED` guard held `'`, `#`, `~`, `!`, `*`, `?`, `$`. The architect ran real
shapes: `C:\Users\O'Brien\node.exe`, `C:\dev\aof#2\node.exe`, and — the sharpest —
`C:\PROGRA~1\nodejs\node.exe`, the 8.3 short form of the same directory the seam's own header cites.
On such a machine every census run would report `audit-runtime-membership-unavailable` blaming a
metacharacter in a path that is fine, and 59/02 would report every control unrunnable.

**Lesson.** A path on disk is not a shell string whatever it contains. The refusal now needs BOTH a
shell control character AND the command not existing as a file, driven through an injected `exists` so
six real shapes are regressions on every platform rather than only on the one that has them.

**Refs:** `STATE.md` 59/01 review item 7.

## R8 — A control cannot fail for the reason its row states if it is pointed where the two variables never meet

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** reviewer (59/04 review, the round's BLOCKER)

The rule is *addressing does not vary with severity*. `addresseesFor` takes no severity — by
construction there is no channel through which one could reach it — so the Examples rows used the
severity value to pick a *code* instead, and both rows executed an identical body. FF-5909 had the same
shape one level up: a `for (const severity of …)` loop whose binding appeared only inside an assertion
*message*. Re-routing every `warn` finding to the escalation actor at the finding-construction site
left 31/31 behavioural and 1350/1350 arch green.

**Lesson, and it generalises to every control in this repository.** When a rule says *"X does not vary
with Y"*, the control must vary Y through the ONE place X and Y meet. Asserting over a function Y
cannot reach proves the type signature, not the rule.

**Refs:** `STATE.md` 59/04 review item 1.

## R9 — A fitness control passed because its input is gitignored, and it hid a real defect

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** architect · **Raised by:** orchestration (at the 59/03 merge)

`acd-no-internal-project-names` reads its term list from `.aof/private-terms.json`, which is
gitignored. A `git worktree` created by `aof work dispatch` never has that file, `loadTerms()` returns
`null`, and the control reports **green having scanned nothing** — `ok` in all four arch-tier runs
inside the 59/02 and 59/03 worktrees, and RED on the same commit in the main checkout. What it hid:
`TECH_DEBT.md` named two private projects, introduced during 59/02's review, passed by every lane gate.

**Lesson.** This is the milestone's own thesis inside the milestone's own toolchain: the dashboard
stayed green while the measurement had quietly stopped measuring, and nothing said the question was
never asked. Two candidate fixes, and they are not exclusive — make the control report INCONCLUSIVE
(or refuse) when its term list is absent, and/or make `aof work dispatch` carry gitignored control
inputs into the lane worktree.

**Refs:** `STATE.md` `## 59 orchestration`; spike **82** (vacuous-control-detection).

## R10 — Two defects in this milestone's own delivery were invisible to every story's lane and were caught only at the milestone gate

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the milestone gate

D-59-6: 59/04 added the 85th file under `src/bundle/**` and did not move the census literal pinned at
84 — the **seventh** recurrence of a species that file's own comment has argued five times, and whose
verdict at the fourth recurrence was that a comment asking each future author to remember is the wrong
instrument. D-59-3: the shipped command printed `limit (instrument-census): undefined — undefined`
twice on every run, because two lanes wrote the limit record in two vocabularies and the face read
one.

**Why D-59-3 survived a green suite, and this is the transferable half:** every fixture lane in
`test/audit-command.test.mjs` declared `limits: []`. The suite's green was a statement about fixtures,
not about the field. A field whose only test value is empty is a field nobody tested.

**Lesson.** Where a story's tests inject a seam, at least one case must drive the SHIPPED value
through it. Both defects are also the story-scoping trade working as `aof:verify` describes it —
caught at the gate, bisected in one step, paid for with rework on a story already marked `in-review`.

**Refs:** `VERIFICATION.md` `@finding-D-59-3`, `@finding-D-59-6`; commit `b517e896`.

## R11 — The gate this milestone was accepted on contains assertions that report the machine's load

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the milestone gate

Across two full-suite runs, three distinct cases in two suites failed; none failed twice, and every one
was later observed green. The mechanism is in the source: a completion watcher driven with `pollMs: 5`
behind a real `setTimeout(…, 40)`, so the assertion needs roughly eight poll ticks to fit inside a
40 ms wall-clock sleep. Under a 7,493-case run that budget is not met, and WHICH case loses is a
function of scheduling.

**Lesson.** Both suites already inject a `now` — the poll loop should be advanced deterministically
rather than waited on. The sharper point is what a flaky gate costs *this* milestone specifically: the
full suite is the one instrument that adjudicates a cross-story poisoner, and an instrument whose
verdict moves with CPU contention cannot do that job. It took three observations to tell a real
regression (D-59-6) from two artefacts.

**Refs:** `VERIFICATION.md` `@finding-D-59-7`.

## R12 — A reuse claimed "wholesale" was two divergences, and only one was flagged

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** architect (at the close)

59/04's `STORY.md` Notes said `--strict` was "reused unchanged" from `work:doctor`. It shipped TWO
deliberate divergences — the audit gates only under `--strict`, AND `--strict` promotes nothing (a
warn-only run exits 0 under it). Only the first was flagged at build. 15/ADR-002 had explicitly
considered and REJECTED that exact policy for doctor, so the divergence read as drift rather than as a
decision until the architect landed ADR-002 §2a and FF-5911 at the milestone close.

**Lesson.** When a story reuses a sibling command's contract "wholesale", the reuse claim needs a
cell-by-cell table at build time, not a sentence in Notes. A sentence cannot be checked and this one
was false.

**Refs:** `STATE.md` `## Feedback (for retro)`; ADR-002 §2a; FF-5911.

## R13 — A build loop whose terminus is `in-review` cannot cross a dependency edge gated on `done`

**Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** orchestration · **Raised by:** developer (59/01)

`siblingGate` requires a dependency to be literally `done`, and `done` is only ever set by
`aof:verify`; `aof:continue`'s terminus for a story is `in-review`. So 59/02, 59/03 and 59/04 could not
become ready until 59/00 and 59/01 were ACCEPTED — and those two are the milestone's whole
dependency-root set.

**Lesson.** Worth naming as a loop property rather than as a stopping choice: the build loop and the
verify loop must interleave, and today only the operator interleaves them. Any autonomous walk of a
multi-stage milestone will stall at the first stage boundary.

**Refs:** `STATE.md` 59/01 item 13.

## R14 — Three shell measurements of the same fact were confidently wrong and agreed with each other

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (59/03)

`arch/55 FF-5502` pins a hash of source bytes INCLUDING line endings, so a whole-file rewrite that
flips them reds it while `git status` stays clean. Every instrument reached for gave the wrong answer:
`git show <ref>:file` always yields the LF-normalised blob; `grep -c $'\r$'` in Git Bash collapses to
`$` and returns the line count for every file; and `od -c` piped through an alternation grep reported
only the `\n`. Round 1 spent its budget learning this, and the architect had diagnosed it independently
by the time a binary read counting `b"\r\n"` settled it.

**Lesson.** On this control node, a claim about bytes on disk needs a binary reader, and a shell
one-liner reaching for `\r` is very likely measuring nothing. The fix to the control (normalise inside
`test/support/source-slice.mjs`, re-freeze once, ratchet) is TECH_DEBT 74; the transferable lesson is
the measurement, not the fix.

**Refs:** `STATE.md` 59/03 item 4; TECH_DEBT 74.

## R15 — A number taken from a mid-build run is a number about the build, not about the deliverable

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** reviewer (59/04 review)

Two measurement claims in 59/04's build report and in `b517e896`'s commit body were wrong, and both
were caught by review rather than by their author. The arch tier's plan line is `1..1350`, not 1352 —
`grep -c '^ok '` counts two `ok - skipped …` notices that carry no test number. And "3 errors" from
`aof work audit 59` was measured before the story's own two arch suites existed; re-measured at the end
it is 0 errors / 1 warning scoped, 0 / 49 unscoped.

**Lesson.** Cite the plan line, never a grep of `^ok`. And a number quoted about a deliverable must be
re-measured at the end or not quoted — a mid-build measurement describes work in progress, and
reporting it as a standing result is how a build report becomes fiction nobody set out to write.

**Refs:** `STATE.md` 59/04 review item 0.

## R16 — The verify pass crossed the sole-writer rule to fix what it found, on the product owner's judgement alone

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** self

Closing D-59-3 required writing `src/work-audit/census.mjs` and `test/instrument-census.test.mjs`
(59/01, accepted) and `src/work-audit/evidence.mjs` (59/02, accepted), because a unified limit shape
has to be constructed wherever a lane declares its limits. ADR-008 §2 gives each file exactly one
owning story.

**Why it was not a defect in practice:** the rule's hazard is two lanes writing one file concurrently,
and this was one sequential actor at verify with the full suite run afterwards. **Why it is recorded
anyway:** the rule was crossed on the product owner's judgement rather than by an architect's ruling,
and an unrecorded crossing is how a structural rule becomes a convention — which is the same sentence
this milestone's own ADR-002 uses about the doctor/audit boundary.

**Lesson.** ADR-008 §2 should say what a verify-stage fix does when the fix's write set spans accepted
stories: cross it and record it, route it back to each owning story, or require an architect's ruling.
Today it says nothing, so the answer was improvised.

**Refs:** `VERIFICATION.md` `## Accept decision`, 59/04; ADR-008 §2.
