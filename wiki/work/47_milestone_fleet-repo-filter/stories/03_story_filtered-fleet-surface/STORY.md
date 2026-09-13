---
type: story
number: 03
slug: filtered-fleet-surface
title: "The filtered fleet — one narrowing seam, a control that is always there, and a page that says why it is empty"
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
# 03 · The filtered fleet — one seam, one control, an honest empty page

## User story

As an operator working in one repo,
I want to say so on the fleet page and have the whole page believe me,
so that I can look at the machine I am actually working on instead of reading past every other
workspace on the mesh.

The benefit is challengeable. Today the only narrowing is `?scope=global|local` — "the whole mesh"
versus "the daemon's own workspace" — and an operator in one repo among several on this machine has
no way to say which. The filter key already exists on every card (`workspaceId`, `name`,
`projectRoot`); only the filter is missing. The bar this story has to clear is not "a dropdown
appears": SPEC's own words are that **a filter which narrows one region and not another is worse than
none**, and that **a filtered view that looks like an idle fleet is a bug**. Those two sentences are
what the tasks below have to make true.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_one-narrowing-seam.feature` — the narrowing is applied ONCE, above the region fan-out;
      no region component ever receives the un-narrowed status, and every region reports what it is
      showing out of what it has — **green 7/7** (`fleet-narrowing-seam`)
- [x] `tasks/01_filter-control-and-chip.feature` — the picker is present in EVERY page state
      (loading / error / empty / populated), reads `All repos` at rest, offers only options the
      payload carries, and clears through both of its two doors — **green 7/7**
      (`fleet-filter-control`)
- [x] `tasks/02_honest-empty-states.feature` — three ways of arriving at nothing, three true
      sentences: an idle mesh, a filter that matched nothing, and a filter naming a workspace this
      payload does not carry — **green 6/6** (`fleet-empty-states`). Grew to FIVE states during the
      build: ADR-010 added the partial intersection and the OUT-OF-SCOPE accusation guard.
- [x] `tasks/03_deep-link-and-survival.feature` — the filter is a shareable address that survives a
      refresh, the ⟳ control, the background poll and a navigation away and back, and composes with
      `?scope=` rather than replacing it — **green 5/5** (`fleet-filter-address`)

## Notes

**This is the story with real breadth, and it is where a review should look hardest** — it is where
"every region" either becomes structural or becomes a habit. ADR-004's rule is that the narrowing
happens at one seam above the fan-out; a per-region `if` is the failure mode, and it is the one that
passes a demo and fails the next region someone adds.

**Serialised behind `47/01` for the file, and behind `47/02` for its functions.** `Fleet.tsx` ← 2 →
14; it is the surface's composition root, and `47/01`'s deletion is what buys this story its line
budget under the 1,560 ratchet. It imports `47/02`'s helpers and adds none of its own.

**The control goes in the shell's surface slot, not a bar of its own** (ADR-007). `SurfaceSlot.tsx`
← 3, and the fleet is already one of them — this is a *use* of an existing contribution mechanism,
not a change to it. It sits beside the scope control, and it inherits that control's standing
invariant: present in every page state, which `acd-mesh-ui-scope-visible` has pinned since
m34/ADR-006.

**The chip lives in the page, not the bar** (DESIGN, three reasons incl. m45's *"a second word would
say it twice"*), and the in-body `Filtered to workspace` line at
[Fleet.tsx:442](../../../../../ui/src/fleet/Fleet.tsx#L442) is **re-homed, not duplicated** — it sits
inside the populated branch today, which is exactly why a filtered *empty* page currently says
nothing (**DG-47-1**).

**"Not yet known is not not found"** (**DG-47-3**). An unknown filter has no home in `pageState`'s
four states and `isEmptyStatus` is filter-agnostic, so today it would render as an idle mesh. It gets
the house dashed absent/not-yet treatment, and **the address is not rewritten** — the operator keeps
the link they were handed.

**Three build prerequisites, all test-support only, no production change** — measured by QA against
the real harness, and each blocks a lane rather than softening it. (a) The harness cannot observe
address writes: `test/support/react-app-harness.mjs:312` installs `history.pushState` as a no-op with
no log, and the stub `location.search` is never updated — without an address-write log, task 03 is
not `@executable` at all. (b) `withFleetApp` does not plumb `settle`/`holdFromStart`, so a fleet
mounted alone cannot reach its loading state (`withShellComposedFleet` can). (c) No fixture publishes
a quiet workspace — zero work items — and it must be a real published snapshot, not a trimmed
payload.

**This story owns the one-line `Fleet.tsx` change that consumes `emptyStateCopy`'s new
`{ heading, body }` shape** — `47/02` grows the shape, this story reads it, and that split is what
keeps `47/02`'s blast radius at zero. **Land `47/02` and `47/03` together.** Between the two there is
a window in which the empty card passes an object where a string is expected, and it is *invisible*:
the only readers are `test/fleet-scope.test.mjs:109,117` and `Fleet.tsx:1518`, and no mount-based
suite asserts that copy, so nothing goes red. The handshake also has no fitness function — it is
QA's pin, not an ADR's — so `47/02` must carry the shape into `scope.d.mts`, which is the one place
the two stories meet.

**Plan the child-component extraction from the start.** Measured at feasibility: `47/01`'s deletion
lands `Fleet.tsx` near **1,290**, and this story's additions — a disclosure picker with a popover, the
banner with per-narrowing chips and an inline clear, the seam plus the un-narrowed totals, four
`<n> of <N>` header changes and a rewritten empty state with a recovery button — size at **~170–275
lines** against this file's own comment density, i.e. **~1,460–1,565** against a 1,560 ratchet. The
upper end breaches it, and ADR-014/E3 forbids trimming explanation to fit. Note the trap: today
`acd-fleet-filter-single-home` rejects any file in `ui/src/fleet/` whose *name* matches
`/(repo|filter|narrow)/i`, so the obvious extraction names fail CI — a fix is in flight with the
architect; check it before naming the child.

**Keep `ScopeControl` defined after `TopBar`.** `test/arch/acd-mesh-ui-scope-visible.test.mjs:40`
slices TopBar's body by `indexOf("\nfunction ScopeControl(")` and asserts the result is after the
body start. Inserting the picker's component between them is fine; moving `ScopeControl` above
`TopBar` fails that gate for an entirely unrelated reason.

**Diagnostics is a compound, not an exemption** (ADR-004, and DESIGN was amended to match): the
disabled/skipped-workspace strip narrows, `Projection: updated …` and descriptor errors stay
machine-wide, and the region states fact-by-fact which of its numbers are filtered.

**Region order after `47/01`: R0 filter banner · R1 Workspaces · R2 Milestones · R3 Nodes ·
R4 Diagnostics.** Four regions — which is also the number of `RegionPlaceholder`s the loading state
already reserves. There is no boards region and no page R5.

**The `<n> of <N>` total has no legal holder yet.** ADR-004 hands every region an already-narrowed
status, so a region knows `n` and cannot know `N`. The total must arrive as a scalar computed at the
seam — never the raw payload passed alongside, and never a second narrowing call to recover `N`.

**"Survives a navigation away and back" is only half true, deliberately.** `shell-nav.mjs:161-169`'s
positional href rule — which ADR-003 forbids this milestone from touching — means leaving
`/fleet?repo=X` for `/board` and returning via the nav lands on a bare `/fleet`. What survives is the
current-route nav item carrying the address byte-identically, plus browser Back. Stated in the
contract so it is never logged later as a defect.

**No mock is committed yet.** DESIGN.md's mandatory binding checklists are the conformance source of
truth for both surfaces until frames land in
[mocks/](../../mocks/) — see `mocks/PROMPT.md`. When they land, the committed file becomes the source
of truth for its surface. Design-conformance review judges against whichever is current.

Governing ADRs: **002** (client-side narrowing), **003** (the URL contract; `routes.mjs` is NOT
edited), **004** (every region, or none — the one seam), **007** (the control and chip's homes, and
an empty state that names every narrowing that produced it). DESIGN: **DG-47-1**, **DG-47-3**,
**DG-47-4** (the ≤390 discrete drops — scope and filter protected in full at every width). Fitness
functions: `acd-fleet-filter-every-region`, `acd-fleet-filter-single-home`.
