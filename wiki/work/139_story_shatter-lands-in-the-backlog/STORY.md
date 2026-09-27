---
type: story
number: 139
slug: shatter-lands-in-the-backlog
title: "Shatter lands its drivers in the backlog, with their depends kept as slug edges that promotion enforces and resolves"
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/139_story_shatter-lands-in-the-backlog/PLAN.md
  - wiki/work/archive/127_milestone_backlog-and-archive/ARCHITECTURE.md#adr-003
  - wiki/work/archive/127_milestone_backlog-and-archive/ARCHITECTURE.md#adr-005
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/01_story_one-enumerator-three-roots/tasks/03_validate-and-doctor-read-three-roots.feature
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/tasks/02_depends-are-validated-at-promotion.feature
  - wiki/work/archive/02_milestone_planning-init/stories/01_story_shatter-consumes-prd/fixtures/PRD-acme-notify.md
  - src/commands/insert-shared.mjs
  - src/effects/stream-transitions.mjs
  - src/work-promote/promotion.mjs
  - src/work/doctor-depends.mjs
  - src/bundle/commands/add-milestone.md
  - src/bundle/commands/add-spike.md
  - .aof/templates/work/milestone/SPEC.md
  - .aof/templates/work/spike/SPIKE.md
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/arch/work/acd-one-mint.test.mjs
  - test/arch/work/acd-intake-write-side-only.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
files:
  - src/commands/promote.mjs
  - src/work.mjs
  - src/work/reindex.mjs
  - src/bundle/commands/shatter.md
  - src/bundle/commands/promote.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
  - .claude/commands/aof/shatter.md
  - .codex/skills/aof-shatter/SKILL.md
  - .opencode/commands/aof/shatter.md
  - .claude/commands/aof/promote.md
  - .codex/skills/aof-promote/SKILL.md
  - .opencode/commands/aof/promote.md
  - test/work/stream/work-promote-mints-the-number.test.mjs
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
  - test/work/stream/work-reindex-depends-parent-rewrite.test.mjs
  - test/planning/planning-prd.test.mjs
---
# 139 · Shatter lands its drivers in the backlog

## User story

As **the operator turning a PRD into a roadmap**,
I want **`aof:shatter` to put the milestones and spikes it frames into the backlog, not the stream.
Their cross-driver `depends` should be kept as edges between backlog items. Promotion should refuse
an item while anything it depends on is still in the backlog**,
so that **a shattered PRD becomes a set of candidates I schedule one at a time. Nothing takes a
stream number until I promote it. The order the PRD implies still holds, because an item cannot enter
the stream ahead of the work it waits on, and I never re-type an edge by hand.**

## What refine measured, and the decisions it took

**Today.** `shatter.md` step 2 numbers every driver "as the next contiguous block" — prompt
arithmetic, which 127/ADR-003 retired everywhere else — and step 5 writes `depends: [NN]`. The gate
the operator asked for already exists (`classifyDepends`, `promote-depends-backlog`), but nothing
feeds it, and once a target is promoted its dependents' slug entries dangle
(`promote-depends-unresolved`) until someone re-types them.

1. **One authoring path; the intake decides only whether the drivers stay.** Shatter always writes
   un-numbered `backlog/[<group>/]<type>_<slug>/` drivers with slug edges, backward in PRD order.
   Under `"backlog"` they stay. Under `"stream"` (or no key) it then runs `aof work promote` over
   each in PRD order, which yields today's contiguous block and backward numeric edges — minted by
   the one verb, the pattern `aof:add-*` step 3 already follows. This departs from the captured
   note ("keeps today's behaviour"): the outcome is kept, the arithmetic is not.
2. **Promotion resolves the edge it satisfies.** After the move and the stamp, promote rewrites
   each entry naming the promoted slug in every other backlog row's `depends:` to the minted ref —
   surgically, per entry, and after the `--at` seam so the entry reads `P`, never `P + 1`. Only
   backlog rows, and only when the slug was unique in the backlog. `rewired` joins the envelope
   only when non-empty, so every delivered envelope is unchanged.
3. **Validate checks the new kind of edge, and only it.** On a backlog row, a slug entry must name
   a backlog item, and the backlog's slug edges must form no cycle. Numeric entries there stay
   unchecked, so every row of 127/01 task 03's delivered outline still holds. The reason for the new
   check: a typo'd slug or a cycle would otherwise surface only at promotion, and a cycle deadlocks
   every item on it.
4. **A slug is never read as a number.** The number/slug split is one all-digit predicate exported
   from `src/work.mjs`, which gains no import (the ADR-015 §5 reach ceiling). The shift's per-entry
   rewriter reads `Number.parseInt` today, so `10x-faster` would become `11` when item 10 shifts —
   latent until slug edges exist, fixed here. Validate's numbered path reads through it too.
5. **One surgical `depends:` rewriter.** The per-entry rewrite moves out of `reindex.mjs` into
   `src/work.mjs` (beside `applyItemFrontmatter`), taking the caller's mapping. The shift and
   promote both call it. Promote still never imports `reindex.mjs` (FF-12703), and neither
   `src/work/` (45/45) nor `test/work/stream/` (35/35) gains a file — every new case lands on the
   suite its act already owns.

**The four questions the capture raised.** (a) Validate — decision 3. (b) A backlog item cannot be
archived (`archive` refuses a backlog ref: "promote it first"), so a slug target leaves the backlog
only by promotion (rewired) or deletion (validate reports the dangling edge; promote refuses the
dependent `promote-depends-unresolved`). (c) Showing "blocked by" in `list`/`find` is out of scope:
there is no `aof work backlog`, `list`'s row shape is frozen, and promote's refusal already names
every blocker. (d) No group is invented: a group is a path the operator makes, so shatter takes the
same optional `in <group/path>` the `aof:add-*` prompts take, and defaults to the backlog root.

## Tasks

- [x] `tasks/00_promotion-resolves-the-edge-it-satisfies.feature` — the dependent is refused while
  its target waits; promoting the target rewrites every backlog slug edge on it to the minted ref,
  after the seam, per entry, backlog-only and unique-only; `rewired` iff non-empty; nothing on refusal
- [x] `tasks/01_validate-checks-a-backlog-slug-edge.feature` — a backlog slug entry must name a
  backlog item (a stream item's slug is named with its number); backlog slug cycles are reported once
  at `<work>/backlog`; 127/01's backlog rows still report nothing; scheduling readers unchanged
- [x] `tasks/02_a-slug-is-never-read-as-a-number.feature` — one all-digit predicate: the shift leaves
  a digit-led slug alone, promote classifies it as a slug, validate's numbered path neither resolves
  it nor graphs it
- [x] `tasks/03_shatter-lands-its-drivers-in-the-backlog.feature` — the prompt contract: backlog
  folders with no number, slug edges backward in PRD order, the intake branch promoting in order
  under `"stream"`, `in <group/path>`; `promote.md` names the rewrite; FF-12405's recall block and
  the three mirrors of each prompt hold
- [x] `tasks/04_a-shattered-prd-schedules-one-promotion-at-a-time.feature` — `@manual`: shatter
  the committed Acme Notify PRD in a scratch project under each intake and read the result at the
  source

## Notes

- Standalone: `depends` nothing, and no open UAT gate feeds it.
- `.aof/aof.lock.json` is under `.aof/`, which a loop lane's reconcile resets before it commits —
  commit it by hand on the lane branch.
- Out of scope: the `nextWork` readiness walk and the doctor depends lane, which still parse a
  numbered item's entries with `Number.parseInt` (validate now reports the only shape that fools
  them); a scalar `depends: gamma` (every template and prompt writes the list form, and the shift
  never rewrote a scalar either); letting `aof:add-*` accept slug `depends`.
- Graph: `aof graph build .` timed out at 120s, then built at 540s (18,327 nodes, egress none).
  `graph impact` puts `promote.mjs` and `reindex.mjs` on `src/work.mjs` already, so the shared
  rewriter adds no edge. The derive proposal's test-lane paths (`test/promote.test.mjs` and similar)
  do not exist and were replaced by the owning `test/work/stream/` suites.
