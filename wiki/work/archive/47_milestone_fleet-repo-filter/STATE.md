---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 47 · /fleet with a repo filter — State

**COMPACTED AT ACCEPT, 2026-08-13.** The blow-by-blow (four story builds, three quota stops, two
review-fix passes and three verification passes) is archived. What follows is the shape of the run and
the pointers; nothing below restates a decision that now lives in an ADR, a finding that lives in
[VERIFICATION.md](VERIFICATION.md), or a lesson that lives in [RETROSPECTIVE.md](RETROSPECTIVE.md).

## Progress — ACCEPTED

| | |
|---|---|
| Framed | 2026-08-02 (`aof:shatter wiki/planning/PRD-web-ui-restructure.md`) |
| Refined | 2026-08-10 (`aof:refine 47 --autonomous`) — four stories, every contract authored |
| Built | 2026-08-10/11 (`aof:continue` → `aof:autonomous`), `47/01 ∥ 47/02` in parallel |
| Verified | 2026-08-11 (declined), 2026-08-13 (declined), **2026-08-13 (accepted)** |
| Delivered | see [OUTCOME.md](OUTCOME.md) · Lessons: [RETROSPECTIVE.md](RETROSPECTIVE.md) (R1–R21) |

- [x] `47/01` board-drill-in · [x] `47/02` repo-filter-model · [x] `47/03` filtered-fleet-surface ·
      [x] `47/04` assign-row-relief — all `done`

**At Accept:** 176/176 behavioural · 53/53 fitness · `tsc` exit 0 · `aof work validate` PASS ·
`Fleet.tsx` 1,539/1,560 · `assign-affordance.mjs` 724 (< 800) · `scope.mjs` 619. Design conformance
**CONFORMS** on every region judged. Evidence and the accept decision: [VERIFICATION.md](VERIFICATION.md).

## Durable decisions — all graduated to ADRs

Fourteen ADRs in [ARCHITECTURE.md](ARCHITECTURE.md). The ones a later milestone is most likely to need:

| ADR | what it settles |
|---|---|
| **002** | the narrowing is client-side — so `src/` is not edited by the filter, and the read-only suites stay green *without being touched* |
| **003** | `?repo=<workspaceId>` — the stable opaque id, not the nullable `name` or the machine-local `projectRoot` |
| **004** | the completeness rule: every wire collection is narrowed, or declared machine-wide **with its reason** — a new region added later is narrowed on the day it is added, without its author knowing the rule exists |
| **005** | `?scope=` survives; scope and repo are different questions and compose by intersection |
| **006** | the boards region is deleted, not restored — with pre-set terms for any future restoration |
| **008** | region 5's geometry has ONE home, ratcheted on the concept rather than on today's names |
| **009** | view-emptiness is a second, **filter-aware** predicate; the surviving workspace row is the filter's subject, not content, and becomes the discriminator between known-but-quiet and unknown |
| **010** | the composition is an intersection **per collection**; a partial intersection is a third answer, is `populated`, and owes a notice; the unknown accusation is permitted only when the client was served the whole mesh |
| **011** | the one resolver must give a truthful answer, not merely be the one door — a wrong *success* does not report itself the way a wrong refusal does |
| **012** | R0's defining property is **position, not container** |
| **013** | `sessions` is ADR-004 case 1, narrowed by rule 1 — recorded as evidence the ratchet works |
| **014** | the three-child attention cluster: arity is a **subtrahend** against a budget re-derived from the grid's own floor row, and Gate B couples the constant to that CSS fact |

DESIGN adds **DG-47-1…7** (chip position, the name drop, the empty states, the ≤`sm` slot drops, the
drill-in states, the unfilled producer half, and region 5's degrade-in-place membership rule).

## What this milestone leaves for whoever comes next

1. **`Fleet.tsx` has 21 lines of headroom** (1,539 / 1,560). The file is the fleet's composition root
   and every cluster wants it; TECH_DEBT item 33 owns the aggregate signal. See RETROSPECTIVE R21 —
   the ratchet measures the file and nothing measures the trend.
2. **`MeshSession.repo` vs the `?repo=` URL key** — two different concepts under one name, both now on
   the fleet surface. Flagged in ADR-013, owed to m48's author. See OUTCOME §Gaps.
3. **DG-47-6 — the pre-click mark for an unopenable card.** Specified as a gap with its reason:
   nothing on the wire carries the fact, and `controlNode` is not the same fact. Next fleet milestone.
4. **No browser harness backs any layout claim** — three defects in this milestone shipped through
   that gap and were found only by rendering. RETROSPECTIVE R13 states the case; it is a project
   decision, not this milestone's to take.
5. **The a11y lane is off** (`work.tags.domains` carries no `a11y` entry), so the two `@uat` clauses
   that remain — focus-indicator visibility and whether a screen reader speaks the live region — have
   no automated channel behind them either. Recorded NOT RUN in VERIFICATION §User sign-off.
6. **Two operator-owned items, neither self-authorised:** `aof-designer` owns `DESIGN.md` and cannot
   `Edit` it (R15), and the test-isolation guard has a side door via any aggregate entry point that
   chains the suite (R16).
7. **`DESIGN.md`'s unruled a11y clause** (F-47-V-16(a)) — the build is deliberately unchanged pending
   the designer's ruling.
8. **`test/fleet-scope.test.mjs:245-257` is a source grep wearing a behavioural suite's clothes** —
   47/01 task 00 is its runtime replacement; retire or reduce it.

## Verification

- [x] `@executable` suite green — **176 / 176**
- [x] Fitness functions green — **53 / 53**; `tsc` exit 0; `aof work validate` **PASS**
- [x] `@manual` — every clause passes on the deployed build
- [x] Design conformance — **CONFORMS** (three passes; the render was taken against a live deployed
      build and, for region 5's abbreviated forms, against the fixture-backed face)
- [ ] `@uat` — **2 clauses, both NOT RUN with their reasons** (focus-indicator visibility; screen-reader
      announcement), plus two staged human errands. Never counted as passes; see VERIFICATION
      §User sign-off.

**Accepted 2026-08-13** with no blocker open. Full evidence, all 23 findings with triage and routing,
and the accept decision: [VERIFICATION.md](VERIFICATION.md).

## How the run actually went

Kept because the shape is the lesson, and the numbers are in `observability/report.md`.

**Calendar span 644h47m; real active agent time 9h49m.** The rest was waiting: 107h28m blocked on a
human, 31h20m of dead air with nothing running and nobody asked, six infra kills costing 36h20m.
Parallelism 1.78×; serialising four roles cost ~10h48m of recoverable wall-clock. RETROSPECTIVE R20.

**Three verification passes, and each one earned its keep by rendering something no earlier pass had.**
Pass 1 rendered the page and pressed the keys for the first time and found six blockers — every one a
behaviour written down and never executed. Pass 2 re-measured them closed and found the last one
(a hand-transcribed sum inside the fix for that very species). Pass 3 fixed it, and the fix's own
boundary move created one more, caught by the designer *in numbers this session had already printed
and misread*. That progression — asserted, then executed-but-transcribed, then measured-but-unread —
is the milestone's whole story and is written up as RETROSPECTIVE R1, R5 and R6.

**Not one finding was ever in the narrowing.** It was correct at every level it was checked, at every
stage, and it is what the milestone set out to deliver.

<!--
  ARCHIVED AT ACCEPT: the per-story build narrative, the three quota stops and their resume tables,
  47/03's and 47/04's review-finding logs, the two review-fix passes, and the `## Feedback (for retro)`
  running notes (20 entries — graduated into RETROSPECTIVE.md R1–R21 and removed here rather than
  duplicated, exactly as durable decisions graduate into ADRs). Recoverable from git history.
-->
