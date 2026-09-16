---
type: milestone
number: 47
slug: fleet-repo-filter
title: "/fleet with a repo filter — narrow the mesh to the repo in hand"
status: done
owner: product-owner
created: 2026-08-02
updated: 2026-08-13
depends: [45]
origin: ../../planning/PRD-web-ui-restructure.md
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 47 · /fleet with a repo filter — narrow the mesh to the repo in hand

## Objective

The fleet page renders everything the mesh knows — every workspace, every milestone card, every node
([Fleet.tsx:372-388](../../../../ui/src/fleet/Fleet.tsx#L372-L388)) — and the only narrowing available is
`?scope=global|local`, which means "the whole mesh" versus "the daemon's own workspace". An operator
working in one repo has no way to say so.

The filter key already exists: every card carries workspace identity (`workspaceId`, `name`,
`projectRoot`). Only the filter is missing. This milestone moves the fleet surface onto its own
`/fleet` route and gives it a first-class repo/workspace filter, applied consistently to every region.

It is the arc's **earliest visible win** — it needs only the router, nothing else, and it is
independent of the terminal work entirely.

Origin: [PRD — Web UI Restructure](../../../planning/PRD-web-ui-restructure.md), milestone
`fleet-repo-filter`.

## Scope

In scope:

- **The fleet surface at `/fleet`.** Milestone 45 introduces the route; this milestone is where `<Fleet>`
  becomes its owner and the surface stops being a `?mode=` value.
- **A repo/workspace filter applied to every region** — workspaces, milestone cards and nodes alike. A
  filter that narrows one region and not another is worse than none.
- **URL persistence beside `?scope=`.** The filter is a deep-link, shareable and refresh-surviving, and
  it composes with the existing scope parameter rather than replacing it.
- **An honest empty state and a visible "filtered by" chip.** A filtered view that looks like an idle
  fleet is a bug; the operator must always be able to see *why* they are looking at nothing.
- **The assign-row geometry contract kept intact.** Region 5's yield order was settled across design
  gaps DG-13…DG-22 and is fitness-locked by
  [fleet-assign-row-geometry.test.mjs](../../../../test/fleet-assign-row-geometry.test.mjs). The filter is
  in fact *relief* here — a filtered view can drop the workspace-name column — but the assign row's
  membership is a contract, not a layout preference. Treat any change to it as a deliberate,
  test-updating decision.
- **The `?scope=` question, answered.** A repo filter subsumes most of what `scope=local` is used for.
  The PRD's recommendation is to **keep both initially** — `scope` is a deep-link contract with existing
  consumers — and revisit after soak. This milestone records the decision either way rather than leaving
  two overlapping narrowings undocumented.

Out of scope:

- **Introducing the route itself** — milestone 45.
- **Any terminal change.** The fleet card's peek is re-homed by milestone 46; this milestone does not
  touch it beyond whatever the filter does to card visibility.
- **Filtering the terminals home.** Milestone 49 has its own surface and its own narrowing question.
- **New fleet mutations.** `/api/mesh/assign` remains the one write; the filter is read-side only, and
  [mesh-ui-read-only-contract.test.mjs](../../../../test/mesh-ui-read-only-contract.test.mjs) stays green
  untouched.
- **Reworking what a card shows.** The filter changes *which* cards render, not their content.

## Stories

Broken down 2026-08-10 (`aof:refine 47 --autonomous`). Boundaries follow the call/dependency coupling
`aof graph impact` reports (graph built 2026-08-10T12:50:26Z, 9,200 nodes / 22,138 edges, egress
none); the rationale is in [ARCHITECTURE.md](ARCHITECTURE.md) §Story-boundary guidance.

- [x] `01_story_board-drill-in` — the board drill-in resolves through `GET /api/mesh/board-url`, and
      the local-shape boards branch that has been unreachable since m34/ADR-006 is deleted. Closes
      both defects m45 routed here (F-45-04-1 a+b), and buys `Fleet.tsx` the line budget the rest of
      the milestone needs.
- [x] `02_story_repo-filter-model` — the `?repo=<workspaceId>` URL contract and the narrowing itself,
      as pure functions in the one existing home (`ui/src/fleet/scope.mjs`), exercised headlessly by
      `node:test`. Zero blast radius; imported by no new caller.
- [x] `03_story_filtered-fleet-surface` — the wiring: one narrowing seam above the region fan-out, the
      picker and "filtered by" chip, three honest empty states, and the deep-link that survives
      refresh, poll and `?scope=`.
- [x] `04_story_assign-row-relief` — region 5 drops the workspace-name column under a filter, as a
      deliberate, test-updating amendment to the DG-13…DG-22 geometry contract.

**Parallel:** `01 ∥ 02`. **Sequenced:** `01 → 03`, `02 → 03`, `03 → 04` — all four edges for one
reason, `Fleet.tsx` (← 2 → 14), the surface's composition root and the file every cluster wants.

The `?scope=` ruling is **not** a story: it is a recorded decision (ADR-005 — `scope` survives;
`scope` and `repo` compose by intersection) plus a composition rule that falls out of `02`'s helpers
and `03`'s empty-state copy. A story for it would be a story with no diff.

## Dependencies

- **45 · ui-app-shell-routing** — this milestone needs a `/fleet` path to own and the shell's
  URL-parameter handling to persist the filter in. It depends on nothing else in the arc: not on the
  spike, not on the terminal control, not on session identity. Once 45 lands it can run in parallel with
  everything above it.
