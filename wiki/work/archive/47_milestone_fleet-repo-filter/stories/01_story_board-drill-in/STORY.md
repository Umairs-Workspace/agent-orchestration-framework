---
type: story
number: 01
slug: board-drill-in
title: "The board drill-in that opens a board — and the unreachable branch it was hiding behind"
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
# 01 · The board drill-in that opens a board

## User story

As the operator looking at a milestone card on the fleet,
I want "Open board →" to actually land me on that milestone's board,
so that the fleet is a way *into* the work rather than a wall I read and then leave.

The benefit is challengeable, and today it fails twice over. The local-board drill-in's `href` is
RELATIVE — `/board` after m45 — so on the fleet origin it resolves to `:4181`, which deliberately
404s `/api/work`: the board page loads and cannot load its stream (m45/STATE **F-45-04-1(a)**). And
the link is UNREACHABLE anyway (m45 QA **F-45-04-QA-3**): since m34/ADR-006 the fleet face's
`/api/mesh/status` payload carries no `boards` key, so `BoardsRegion` has rendered its empty
placeholder in production for two milestones. After this story the drill-in resolves through the
route the peer-board branch and [Fleet.tsx:528](../../../../../../ui/src/fleet/Fleet.tsx#L528) already
use, and the branch that could never render is gone rather than quietly waiting to ship a broken
link.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_board-link-resolved.feature` — the fleet's board drill-in resolves its target through
      `GET /api/mesh/board-url`; no relative or hard-coded board href survives anywhere in
      `ui/src/fleet/`
- [ ] `tasks/01_unreachable-boards-branch-deleted.feature` — the local-shape boards branch, unreachable
      since m34/ADR-006, is deleted along with whatever wire types lose their last reader — and the
      suites that mount the real component stay green

## Notes

**Order — this story goes FIRST, and the reason is a line budget, not taste.** ARCHITECTURE's
codebase-health measurement (2026-08-10) puts `Fleet.tsx` at **1,547 lines, 13 under its 1,560
ratchet**, and `47/03` must add a control, a chip and an empty-state branch to that same file.
ADR-006's deletion is projected to land it near 1,320–1,350. A story that adds the filter to
`Fleet.tsx` *without* this deletion having happened either breaches the ratchet or gets trimmed of
explanation to fit — and ADR-014/E3 forbids the second explicitly.

**Sequencing is a product constraint too** (m45/STATE): fixing the unreachable region *without*
fixing the href would ship a visibly broken link. Fix them together, or (a) first — never (b) alone.

**Parallel-eligible with `47/02`**, which touches only `scope.mjs`. Both `47/03` and `47/04` are
serialised behind this one, for the one reason the graph gives in a line: `Fleet.tsx` ← 2 → **14**,
the surface's composition root and the file every other cluster wants.

**Blast radius, graph-derived:** `Fleet.tsx` only, plus whatever of `api.ts`'s `FleetBoard`/
`MeshStatus` loses its last reader — `api.ts` ← 1, so that radius is exactly one file. Watch
`test/support/fleet-app-harness.mjs` and `test/support/shell-fleet-entry.tsx`, which mount the real
component.

**One build prerequisite, test-support only.** `test/support/react-app-harness.mjs:311` sets
`globalThis.location = { …, assign() {} }` — a no-op that records nothing — while `Fleet.tsx:533`
navigates through `window.location.assign(url)`. Three of task 00's scenarios carry a navigation
clause that cannot be confirmed without one additive accessor (record the argument, expose
`driver.navigations()`, same family as `requestsMatching`). If it is skipped, those clauses come back
to the feature rather than being downgraded to a source read.

**Retire or reduce `test/fleet-scope.test.mjs:245-257`.** It asserts the drill-in with regexes over
`Fleet.tsx`'s own text, so it stays green for a build that calls the resolver with the wrong
workspace id, navigates to a URL it never received, or resolves on every render. Task 00 is its
runtime replacement; whatever it still owns that `acd-fleet-board-link-resolved` does not is all that
should survive.

**Do NOT let `FleetNode` and `FleetStatus` leave with the deletion.** ADR-006 names `FleetBoard` and
`MeshStatus`, and "reduce `api.ts` to what still has a reader" would take `FleetNode` too — it loses
every reader *in `Fleet.tsx`* but `ui/src/fleet/scope.d.mts:2,62,67` still imports and uses it for
`nodePanelFacts` / `nodeCurrentWork`. Taking it breaks `tsc` in a file **`47/02` owns**, during the
window the two run in parallel. Keep both; `FleetStatus` becomes `= GlobalMeshStatus`. Expect
`runStateChip` (imported at `Fleet.tsx:4`) to go unused when `RunStateChip` does — and note
`runChipClasses` and `AssignmentSummaryLine` both survive, the latter sitting *inside* the deleted
span but called from `GlobalNodePanel`, so the cut is not one contiguous block.

**Two m45 lanes go RED on the deletion, measured:** `test/in-app-cross-links.test.mjs`'s `01 scenario
3` lane and rows 5–6 of its mode sweep are the only suites driving the branch. Re-point them in the
same change — never delete them with the code they guarded.

**Decide what a `workspaces`-less payload does before deleting the branch.** `isEmptyStatus` reads
`boards`, so a nodes-and-boards payload evaluates as *populated* and falls into whatever replaces the
deleted branch; handed to `GlobalScopeView` unguarded it maps `status.workspaces` — `undefined` — and
throws, with no error boundary above a headless mount (m45/F-45-M-1 put one at the shell boundary
only). ADR-006 does not say what replaces the branch. The contract pins only that the operator is
never shown a crash; the answer is the build's, with the architect.

**Any future boards region is not restored by guesswork.** ADR-006 writes the terms: one producer or
no region — a restored row must carry `workspaceId` ON THE ROW, published into the global projection,
never a second read path in the fleet face. The next author meets a decision, not an empty region.

Governing ADRs: **006**. Fitness function: `test/arch/acd-fleet-board-link-resolved.test.mjs` (RED on
arrival — [Fleet.tsx:1427](../../../../../../ui/src/fleet/Fleet.tsx#L1427) is the violation it names).
