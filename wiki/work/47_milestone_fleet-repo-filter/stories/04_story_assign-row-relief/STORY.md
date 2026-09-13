---
type: story
number: 04
slug: assign-row-relief
title: "Region 5's relief — a filtered row spends its width on the target, not on the name every card already shares"
parent: 47
status: done
owner: product-owner
created: 2026-08-10
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · Region 5's relief under a filter

## User story

As the operator reading a filtered fleet's assign rows,
I want the row to stop spending its width repeating the repo name I just filtered to,
so that the fact I came for — *which node is this going to* — is the one that survives the truncation
instead of the one that gets cut.

The benefit is challengeable and it is measured, not asserted: the judged render of region 5
truncated the assign target in **every** case, which is the whole reason design gaps DG-13…DG-22
exist and the row's yield order is fitness-locked by
[fleet-assign-row-geometry.test.mjs](../../../../../test/fleet-assign-row-geometry.test.mjs). Under a
repo filter every card on the page belongs to the same repo, so the workspace-name column carries
zero information and costs the target its characters. This story spends that width on the target.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_filtered-row-yield-order.feature` — under a filter the workspace-name column drops and
      the row yields in the stated order — tail, then the drill-in's words, then the target last —
      never overprinting a sibling; every existing unfiltered lane stays green
      *(green 2026-08-11 — `fleet-assign-row-geometry` 22/22; the `@uat` render lanes are the
      milestone's standing operator gate, not this task's `@executable` obligation)*
- [x] `tasks/01_drill-in-unavailable-treatment.feature` — authored, then built. DG-47-5's five
      clauses: the failed and in-flight drill-in keep the yield ladder, drop their words whole at
      `REGION5_DRILLIN_ABBREV_AT_CH`, the pinned `→` SURVIVES both non-rest states, the treatment is
      dashed/muted rather than `text-primary`, `aria-disabled` is forbidden so a second click is the
      retry, and `title` names the remedy
      *(green 2026-08-11 — the contract was authored, `BoardDrillIn.tsx` extracted to carry it, and
      the treatment landed; the three `@uat` render lanes remain owed to the operator gate)*

> **SCOPE ADDED AT BUILD (PO, 2026-08-11) — F-47-01-QA-5.** QA found that **DG-47-5 has no story that
> builds it**: DESIGN §DG-47-5 specifies the treatment in full and says it is *"closed in this
> milestone"*, yet no `@executable` task feature in any of the four stories carries it, and
> `Fleet.tsx:782-791` still inverts the abbreviation gate and drops the `→` in exactly the two states
> that keep their words — DESIGN's own "Observed" column, verbatim. Left as it was, `47/01`'s `@uat`
> render lane could only ever return GAPS with nowhere to route them.
>
> **It lands here rather than in `47/01` because it is region 5's row.** ADR-008 says so in terms —
> *"Everything DG-47-5 adds to that row must fit this same ladder"* — and the clauses are written
> against `REGION5_DRILLIN_ABBREV_AT_CH`, a constant this story already owns in
> `ui/src/fleet/assign-affordance.mjs`. Splitting the drill-in's geometry across two stories would put
> the yield ladder in two hands, which is the defect DG-20/DG-22 closed.
>
> **This task is OWED A CONTRACT before it is built** — the Examples are QA's to design and the
> treatment is the designer's to pin (both are DESIGN §DG-47-5 already; what is missing is the
> `.feature`). Refine this story before building it. The consequence for `47/01` is recorded there:
> its `@uat` render lane judges a treatment this task ships, so the render is taken after this task,
> not before.
>
> **DISCHARGED 2026-08-11.** The contract was authored and built. The consequence it predicted for
> `47/01` arrived exactly as written — that story's five drill-in lanes read the element's FULL text
> and this task's clause 2 added the surviving `→` to it — and was closed the way the amendment says:
> `47/01`'s Then re-expressed as containment of the WORDS, with the glyph asserted here, where the
> ladder lives. The render is still owed, and is still taken after this task rather than before.

> **REVIEW FIX PASS RUN AND CLOSED — 2026-08-12 (`aof:continue 47/04`).** Both review passes had run;
> their findings had not been applied. All are now closed and re-measured independently:
> **161/161 behavioural** (`fleet-assign-row-geometry` **23/23**, +1 lane), **47/47 fitness**,
> `tsc` exit 0, `Fleet.tsx` **1,532/1,560** net-neutral, eleven mutations applied and eleven red.
>
> The blocker **F-47-04-QA-8** was routed here for ADR-008's owner to rule, and the routing was right:
> the cause ran **one level deeper than the finding**. QA's three-child attention cluster is real, and
> so are two defects no one had filed — the region-5 budgets were **also** derived from the 360.66px row
> the card takes at exactly ONE viewport (measured band **286…368.66, NON-monotone**, against a code
> comment asserting the card was "viewport-INVARIANT by construction"), and the secondary token
> **wrapped**, making this row two lines at every measured width. **ADR-014** re-derives every threshold
> from the grid's own floor row and adds one rung; **DG-47-7** retires the chip's `· <when> · <note>`
> tail from the row outright, because it is the one occupant with no degraded-in-place form and its
> presence was therefore a covert signal for node-id length — DG-20's error, one rung down.
> **F-47-04-ARCH-1/2** and the **QA-9…13** coverage seam are closed with them; five contract defects in
> these two features were flagged by the build and amended here by the PO, each with a dated note.
>
> **Still owed, and it is the operator's:** the `@uat` render lanes need a deployed and restarted
> daemon. They now have a fixture-backed face to render against (`node test/support/mesh-ui-assign-fixture.mjs`),
> which is what QA-12/13 was about — nothing on the live mesh has a node id long enough to abbreviate.

## Notes

**This is the cluster most likely to be mis-scoped as "small".** The code is roughly three lines. The
contract is DG-13…DG-22, plus **DG-20's covert-signal objection**, which ADR-008 discharges
explicitly — read that discharge before touching the predicate.

**The relief is DELIBERATE and TEST-UPDATING, in the same change.** SPEC is explicit that region 5's
membership is a contract, not a layout preference. ADR-008 takes the relief: the drop becomes
unconditional under a filter, and the row is byte-identical to today's `nameDropped === true`
geometry — so this is an amendment to a known lane, not a new geometry. `fleet-assign-row-geometry`
gains a **new lane**; **every existing unfiltered lane stays green**. A silent divergence between the
render and the suite is the one outcome this story must not produce.

**One home for the drop predicate**, beside the budget it reads (`REGION5_NAME_BUDGET_CH`) — ADR-008.
Not an inline boolean at the call site.

**Genuinely independent of `47/02`; serialised behind `47/03` for the file.** Blast radius:
`ui/src/fleet/assign-affordance.mjs` (← 2, one of them the geometry suite), one expression in
`Fleet.tsx`, and the geometry suite itself.

**One build prerequisite, test-support only.** `withPublishedAssignFixture` hard-codes
`name: "demo"` (4 characters, inside the budget), so the tree cannot today render a workspace name
*longer* than `REGION5_NAME_BUDGET_CH` on a card that also carries a real assignment — which is the
only condition under which the relief is observable. It needs one additive `name` option, in the same
family as `nodes`/`scope`. If it turns out to be more than one option, ADR-008's own instruction
applies: it goes back to the architect, not into a skipped lane.

**The equivalence this story rests on has no rendered lane today.** ADR-008 and DG-47-2 both rest on
"byte-identical to today's `nameDropped === true` geometry", but no lane in
`fleet-assign-row-geometry.test.mjs` actually renders that branch — every mounting lane runs over the
4-character `demo` workspace, and the two lanes touching region 5 assert the *opposite* case on
purpose (DG-20's fit gate: a name that fits keeps rendering). The contract discharges this by
rendering both branches and comparing them, so the amendment is demonstrated rather than asserted —
and the geometry contract gains a lane it has been missing since DG-16.

**768 is the width most likely to falsify the relief, and ADR-008 does not name it.** The card is
viewport-invariant (`repeat(auto-fill,minmax(320px,1fr))` inside `max-w-[1240px]`), so computed from
the declared values the inner row is ~371px at 1440, ~363px at 1280, ~326px at 390 and **~312px at
768** — where two columns make it narrowest, roughly 8 mono characters tighter than the row every
region-5 budget was derived from. Carried as an Examples row in the `@uat` lane rather than filed as
a defect.

**It carries a `@uat` render lane that nothing else in this milestone does** — a filtered row's
truncation behaviour is judged on a real render, at width, not asserted in prose. That lane keeps the
milestone's `@uat` obligation honest.

Governing ADR: **008**. DESIGN: **DG-47-2** (the relief, with the exact filtered yield order tabled
and DG-20's objection discharged).
