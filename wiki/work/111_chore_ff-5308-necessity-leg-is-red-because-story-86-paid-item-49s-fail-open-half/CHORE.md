---
type: chore
number: 111
slug: ff-5308-necessity-leg-is-red-because-story-86-paid-item-49s-fail-open-half
title: "FF-5308's necessity leg is red because story 86 paid item 49's fail-open half"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 111 · FF-5308's necessity leg is red, and it is the good news it says it is

## Intent

`test/arch/acd-loop-scope-guard.test.mjs`'s SCOPE-NEC-01 leg asserts that `nextWork(workDir, "02/01")`
LEAKS to an earlier active milestone's ready item — it measures a live defect, so it goes red the day
that defect is paid. Story 86 paid it, and the leg is red with its own designed message:

> GOOD NEWS — this red means the fix landed, not that the gate broke: TECH_DEBT item 49 /
> `src/work.mjs:847-860` (`inRange` falling through to `() => true`) has been FIXED, so a story-shaped
> scope no longer walks out of the milestone the caller named. FOLLOW-ON: widen `LOOP_SCOPE_FORMS` to
> whatever the single parser now admits, and retire this necessity leg.

This chore discharges that follow-on. It is not story 86's to take: the leg and `LOOP_SCOPE_FORMS`
live in files story 86 declares in neither `reads:` nor `files:`, and the widening is a 53/ADR-003 act
(the loop's scope vocabulary was frozen to `driver` + `range` on purpose) rather than a test edit.

## Definition of Done

<!-- The CLOSE CRITERION — a checklist of concrete, checkable items. The chore closes when every box
     below is ticked. Keep each item independently verifiable (a black-box check, not a vague goal). -->

- [x] Decide, as a 53/ADR-003 act rather than as a test edit, whether `LOOP_SCOPE_FORMS` widens to the
      two story-grained forms `parseStorySpan` now admits (`NN/SS` and `NN/MM-PP`). The loop refuses a
      story ref today BY DESIGN — `aof work loop` drives sessions, and 53/ADR-003 chose a refusal over
      a widening precisely so the fix was not forced by whichever caller needed it first. Record the
      decision (widen, or keep frozen and say why) in `53_milestone_loop-artifact/ARCHITECTURE.md`
      before touching either file.
- [x] Retire FF-5308's SCOPE-NEC-01 necessity leg and the fixture machinery that exists only to serve
      it (`necessityLeg`, `assertDiscriminating`, `twoActiveMilestones`, the `GOOD_NEWS` constant and
      the SCOPE-MUT-01/02 vacuity row that guards it), replacing it with a leg that asserts the PAID
      behaviour: a story-shaped scope resolves to the story the caller named and reaches no earlier
      milestone's competitor. Keep the FF-5308 id and the frozen-vocabulary rows, which are a
      different claim and are still green.
- [x] `node scripts/test.mjs --only test/arch/acd-loop-scope-guard.test.mjs` is green, and the
      `test/arch` tree carries one red fewer than the 7 measured at story 86's gate on 2026-09-04.
- [x] `aof work validate` is green (no regression)

## Notes

## Evidence (2026-09-05)

**Box 1 — the decision: KEEP FROZEN, recorded as ADR-017.** `LOOP_SCOPE_FORMS` stays exactly
`["driver", "range"]`. The ADR is appended to `53_milestone_loop-artifact/ARCHITECTURE.md` and it
**confirms ADR-003 §1 rather than superseding it** — what it changes is the GROUND, because ADR-003
argued from a defect that has since been paid. The five reasons that survive the payment: (1) only one of
ADR-003's two grounds was contingent on the fall-through, and the semantic one — the loop sequences
DRIVERS, and a story-grained scope's exhaustion closes no driver — is untouched; (2) the vocabulary is no
longer the loop's alone, it is the admission grammar of **four** unattended launch surfaces
(`commands/loop.mjs:814`, `commands/trigger.mjs:310`, `work-trigger/declaration.mjs:211`, and
`mesh-assignment-directive.mjs:128`, which dispatches to a REMOTE worker), plus the engine's own
invocation/declaration/resume doors; (3) `loopScopeIncludes` (`work-loop.mjs:649`) compares DRIVER
numbers, so admitting a span without teaching it story-grained semantics would silently select a whole
driver under a scope naming three of its stories — the exact class ADR-003 exists to refuse; (4) no
caller needs it, both alternatives already exist and are named in the refusal (`aof work drive`, and
`/aof:continue NN/MM-PP` for the prompt lane), and story 86 said so in the god node itself
(`src/work.mjs:97-98`); (5) three delivered suites assert the closed pair. ADR-017 carries a **named
discharge trigger** — a caller that genuinely needs an unattended loop over a story span — so the freeze
is no longer resting on an unstated premise.

**Two further surfaces carried the same stale follow-on and are AMENDED IN PLACE**, to the file's own
dated convention (as FF-5301 and FF-5311 were), rather than rewritten:
`ARCHITECTURE.md`'s **FF-5308 row** (its necessity-leg description and its `State now` cell) and the
**item-49 codebase-health note**, whose *"when it lands, 53's `LOOP_SCOPE_FORMS` guard (FF-5308) can
widen"* line is now ruled. `wiki/work/TECH_DEBT.md` carries no copy of the follow-on, so those two plus
the ADR are the whole set. Item 49's other half — the one-home leaf `src/work-scope.mjs` — is untouched
and still wants a story.

**Box 2 — the retirement was ALREADY DELIVERED, at milestone 96's gate (commit `43e159dd`), and this
chore verified it rather than repeating it.** The leg retired by **INVERTING**, not by deletion: the same
fixture, the same shipped `nextWork`, the same discrimination preamble, and the claim became that a
story-shaped scope resolves to its OWN item (`SCOPED`, `acd-loop-scope-guard.test.mjs`). The
machinery this chore's checklist named for retirement — `necessityLeg`, `assertDiscriminating`,
`twoActiveMilestones`, `GOOD_NEWS` and the SCOPE-MUT-01/02 vacuity row — is **deliberately retained**,
and that satisfies the box rather than dodging it: the checklist scoped the retirement to machinery *"that
exists only to serve it"*, and none of it does any longer. `assertDiscriminating` and
`twoActiveMilestones` are the inverted leg's own discrimination preamble (a leg answering "02/01 scoped
correctly" over a fixture with nothing to leak to would be green for no reason); SCOPE-MUT-01/02 drive
that preamble over four mutated fixtures and are what make it load-bearing; and `GOOD_NEWS` is still
ASSERTED — as the record of what the fixture first proved, and, in the negative, as proof that no
assertion carries it any more. The FF-5308 id and the frozen-vocabulary rows are kept, as the box
required.

**Box 3 — measured 2026-09-05, this checkout.**
`node scripts/test.mjs --only test/arch/acd-loop-scope-guard.test.mjs` → **6/6 green**.
The whole `test/arch` tree → **1764 / 1765, ONE red**, against the **7** measured at story 86's gate on
2026-09-04. The one remaining red is `arch/FF-6603`
(`test/arch/acd-register-declaration-form.test.mjs:401` — a ruling-as-property threshold that has
drifted to `3322/3694` = 89.9% against its `> 0.9` floor as the corpus grew). It is **not this chore's
subject and not caused by its edit**: verified by restoring `53/ARCHITECTURE.md` to HEAD, re-running
that suite alone, and finding the same red, then restoring this chore's version.
**Attribution, stated rather than claimed:** FF-5308's red was closed at 96's gate, and the other five
were closed by their own owning items (chore `106`, milestone `96` and the lanes in flight in this
shared checkout) — this chore closes the follow-on those reds pointed at, not the reds themselves.

**Box 4.** `aof work validate` → `PASS — work stream is well-formed.` `aof work validate 111` →
`PASS — 111 is well-formed.`

## Review (2026-09-05, solo — every lane run in-session, one round)

**Gate ladder, walked before any lane.** `aof work validate 111` → PASS, 0 findings.
`aof work doctor 111` → **0 admitted findings** (`admittedDoctorFindings`, `src/commands/loop.mjs:211`,
admits `severity: "error"` in `DOCTOR_GATE_CODES` only). Its one `warn` is stream-wide and
pre-existing: `numbering-gap — number 42 is missing between 00 and 118`. Re-walked clean after the fix
round below.

**Structural (architect) — PASS, two findings, both fixed in-round.** Recall first
(`aof work memory recall … --kind near-miss`) surfaced **R3 (m06)**: *"an arch-test's assertion scope
must match the ADR invariant's stated scope"* — and it caught this ADR:

- **A1 (Blocker) — FIXED.** ADR-017's Invariant claimed `acd-loop-scope-guard` enforces *"no module
  reached through `decideLoopScope` spells a scope grammar of its own"*. It does not — that clause is
  `acd-trigger-never-classifies`'s (`:300-320`), and the scope guard never reads the trigger family.
  Exactly m06/R3's near-miss. The Invariant now states the two claims the scope guard really carries and
  names the §2 half's gate separately, so the clause is owned in the record as well as enforced in fact.
- **A2 (Important) — FIXED.** The rejected *"delegate to `inRange`"* alternative cited the
  imports-nothing rule as "ADR-011 §1". ADR-011 governs evidence ownership, not module purity. Re-cited
  to what actually carries it: 53/01's partition row (*"a PURE leaf with no `node:fs`/
  `node:child_process`/clock"*), FF-5307, and `test/work-loop-determinism.test.mjs`.

**Behavioural (QA) — PASS.** Each box driven as a black-box check, and box 1's *"before touching either
file"* clause verified at the source: `git status` shows `src/work-loop.mjs` and
`test/arch/acd-loop-scope-guard.test.mjs` **untouched by this chore** — the decision was to change
neither, so the ordering clause is satisfied vacuously and honestly. FF-3706
(`acd-chore-dod-checklist`) green over this record. Re-run after the fix round:
`acd-loop-scope-guard` 6/6, `work-loop-scope-guard` 4/4, `acd-chore-dod-checklist` 2/2 — all green.

**Craft pass.** No `src/` or test file changed; the change set is two records. `npm run check` was NOT
run: it shells the FULL suite, which this machine's rule forbids (`global-work-propagation` binds
`:4182`, held by the live control daemon). `aof test --scope impacted --story 111` **refuses by
design** — `story-ref-not-a-story`: *"only a story declares a write set"* — so the suites were selected
by what the change set can reach: the record-doc gate, the ADR/citation corpus gate, and both scope
guards. CRLF preserved (the file's own EOL; verified zero lone LFs) and the amended FF-5308 table row
still parses as one four-cell row.

## Finding triage (review close)

**F1 — `arch/FF-6603` ROUND-3/1 is red on a DRIFTED THRESHOLD, and it is unowned →
HANDED BACK TO THE OPERATOR.** `test/arch/acd-register-declaration-form.test.mjs:401` asserts its
ruling as a property — `registerOnly / cited > 0.9` — against a comment measuring 99.6% at the time.
The corpus has grown and the ratio is now **89.93%**, so the leg reds. Measured on both sides to
attribute it honestly: **3321/3693 (0.89926) with `53/ARCHITECTURE.md` at HEAD**, and **3323/3695
(0.89932) with ADR-017 added** — pre-existing, and this chore's edit moves it *toward* green by
0.00006. Routing: it is not a locked-contract change (Q1); the remedy is a judgement about whether the
FLOOR re-baselines or the PROPERTY restates, which is not cheap-and-obvious (Q2); it IS
checklist-shaped (Q3) — **but the item under review is itself a chore, so the loop creates nothing**,
and this remedy does not belong in chore 111's checklist (FF-6603 is the register/declaration-form
gate, a different control from a different milestone). Handed back rather than minted.

**F2 — Nit, recorded.** The `aof:continue` review lane instructs `aof test --scope impacted --story
<ref>` unconditionally, and that verb cannot serve a **chore** — a chore declares no `files:`, so it
answers `story-ref-not-a-story` and `0/0 suites … may not stand as a verdict`. The refusal is correct;
what is missing is a stated selection rule for a chore's review lane. Recorded here rather than
promoted.

Nothing else survived. No Blockers outstanding; one review round run, no second round earned.



- **Raised at:** `aof:verify 86`, finding `D-01`. Story 86 is `done`; this red is the receipt for it,
  not a regression against it.
- **Related:** chore `109` (TECH_DEBT item 49's Status still records the fail-open half as open) and
  chore `88` (the arch reds from 71/00 and 71/01), which named this red and attributed it to story 86
  without owning it. Item 49's remaining half — the three parsers consolidated into one home — is a
  story, not this chore: `src/work.mjs` sits at the ADR-015 §5 reach ceiling of 24 exactly, so it
  cannot import a leaf without reddening FF-5301.
