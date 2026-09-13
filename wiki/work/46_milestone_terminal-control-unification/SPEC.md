---
type: milestone
number: 46
slug: terminal-control-unification
title: "One terminal control — the duplicate is deleted, not kept in parallel"
status: done
owner: product-owner
created: 2026-08-02
updated: 2026-08-08
depends: [44, 45]
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
# 46 · One terminal control — the duplicate is deleted, not kept in parallel

## Objective

A terminal appears in two places in this UI, and each place implements it. The board dock
([TerminalDock.tsx](../../../ui/src/board/TerminalDock.tsx)) and the fleet card's peek
([FleetTerminalView.tsx](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx)) each carry their
own xterm lifecycle, their own connection-state ramp, their own socket-URL builder and their own
geometry rule. A fix to either lands in one of them.

This milestone extracts **one** terminal control — a component plus framework-free `.mjs` state
helpers — parameterised by **session source**, and re-homes both call sites onto it. The duplicate is
deleted in the same milestone that replaces it; two implementations behind one name is the failure
mode this exists to end.

Origin: [PRD — Web UI Restructure](../../planning/PRD-web-ui-restructure.md), milestone
`terminal-control-unification`.

**The PRD's "two-and-a-half implementations" count is out of date, measured 2026-08-02** — in this
milestone's favour. m42 item 6 (commit `54f6bbf`, "ONE terminal surface") already collapsed the
bolt-on widget: the dock is now a single component carrying **both** a local-PTY lane and a `remote`
mirror lane ([TerminalDock.tsx:71](../../../ui/src/board/TerminalDock.tsx#L71)), including the
fit-vs-scale split ([:167](../../../ui/src/board/TerminalDock.tsx#L167)) and the input path on both
lanes ([:261-263](../../../ui/src/board/TerminalDock.tsx#L261-L263)). So the work is **two**
implementations, not two-and-a-half, and the dock is already most of the target design. What remains is
to lift it out of `ui/src/board/`, delete `FleetTerminalView`, and retire the hard-coded
`FLEET_PORT = 4181` ([:78](../../../ui/src/board/TerminalDock.tsx#L78)) per spike 44's finding.

## Scope

In scope:

- **The control itself** — one component owning xterm lifecycle, the connection-state ramp (one
  vocabulary, colour never the only signal), viewport-responsive sizing, drag-resize and
  expand-to-fullscreen. Extracted to a shared location, not left in `ui/src/board/`.
- **Session-source parameterisation.** The control takes a source kind and derives its behaviour from
  it. The kind list is **fixed by spike 44's finding** — at minimum `local-pty` and `mirror`, plus a
  relayed-local kind if 44 lands that way.
- **Fit-vs-scale as a declared property of the source, not a branch in the component.** The board's
  local PTY is fitted (`FitAddon.fit()` plus a resize frame up the socket); the worker mirror is pinned
  to 80×24 and CSS-transform-scaled, because the worker's `claude` TUI paints with absolute cursor
  addressing ([mesh-worker-execution.mjs](../../../src/mesh-worker-execution.mjs)) and fitting garbles
  it. **Both are correct for their source** — the rule keys off whether the far end can be told to
  resize.
- **Framework-free state helpers.** The connection ramp, geometry and socket-URL construction move into
  `.mjs` beside the component so `node:test` drives them headlessly. Today's helpers
  ([board/terminal/dock-state.mjs](../../../ui/src/board/terminal/dock-state.mjs),
  [board/terminal/resize.mjs](../../../ui/src/board/terminal/resize.mjs),
  [fleet/terminal-view/geometry.mjs](../../../ui/src/fleet/terminal-view/geometry.mjs),
  [fleet/terminal-view/stream.mjs](../../../ui/src/fleet/terminal-view/stream.mjs),
  [fleet/terminal-view/view-state.mjs](../../../ui/src/fleet/terminal-view/view-state.mjs)) are
  reconciled into one set — the house has no React test harness and this pattern is not optional.
- **Both call sites re-homed, and the duplicate deleted.** The board dock and the fleet card peek
  ([Fleet.tsx:759](../../../ui/src/fleet/Fleet.tsx#L759)) both render the one control;
  `ui/src/fleet/terminal-view/` is removed.
- **`FLEET_PORT` retired or made configuration** per spike 44. The control does not hard-code an origin.
- **The existing fitness locks stay green.**
  [acd-fleet-terminal-input-constrained.test.mjs](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)
  does source-analysis over named files and named surfaces; moving code across files will move what it
  inspects. Its **invariants** are the contract, not its file list — invariant 4 (the fleet page wires
  no input source) must still hold at the end of this milestone. Reversing invariant 4 is milestone 49's
  job, not this one's.
  [acd-terminal-server-only.test.mjs](../../../test/arch/acd-terminal-server-only.test.mjs) — node-pty
  never reaches `ui/src/` — must survive untouched.

Out of scope:

- **Making the fleet page's panes typeable.** Milestone 49. This milestone preserves invariant 4 exactly
  as it stands.
- **The terminals home grid.** Milestone 49 consumes this control; it is not built here.
- **Changing the mirror or relay wire protocol.** This is a client-side extraction. The terminal-view
  socket and its tuple-bound input seam are used as-is.
- **Scrollback persistence or session replay.** The mirror is ephemeral by design (ADR-014); a durable
  transcript store is a separate arc.

## Stories

<!-- Populated at the Break-down stage (refine). -->

Broken down 2026-08-08 (`aof:refine 46 --autonomous`). Six stories. **Four of them depend on nothing
and are parallel-eligible from day one** — the three server-side seams have no graph edge to any `ui/`
file, and the shared core is a leaf nothing imports yet. The partition is grounded in the codebase graph
(built fresh 2026-08-08T14:20:13.555Z — 8,759 nodes, 20,963 edges, egress `none`) and argued in
[ARCHITECTURE §Story-boundary guidance](ARCHITECTURE.md).

- [ ] `stories/00_story_pre-session-frame-queue/` — a resize sent the instant the socket opens reaches
      the PTY; the server queues pre-session frames and drains them in order (ADR-008; spike 44's
      measured defect). *depends: nothing*
- [x] `stories/01_story_dead-bridge-retired/` — `wireTerminalBridge` is deleted and detector #4 is
      re-aimed at the producer that actually runs (ADR-007). *depends: nothing*
- [x] `stories/02_story_terminal-origin-seam/` — the server half of retiring `FLEET_PORT`: the board is
      handed the fleet origin down the seam the fleet already owns; standalone resolves its own default
      in the command layer (ADR-004). *depends: nothing*
- [x] `stories/03_story_shared-terminal-core/` — one framework-free core: the frozen two-entry source
      table, the merged state ramp, the fit-or-scale rule, the origin-built URL, the input policy
      (ADR-001/002/003/004/005; DG-46-2). *depends: nothing*
- [ ] `stories/04_story_one-control-both-call-sites/` — **the headline.** Both call sites re-homed and
      the duplicate deleted in the same diff; every gate's file list moves with the code, and invariant 4
      is re-expressed rather than left to pass vacuously (ADR-006). *depends: 46/01, 46/02, 46/03*
- [ ] `stories/05_story_dock-shell-host/` — the dock becomes a shell overlay occupant with a published
      inset, and fullscreen adopts the live node (ADR-009; DG-46-1). *depends: 46/04*

**The cut that was deliberately NOT made:** re-homing the board first and leaving the fleet peek "for
now". That is the two-implementations state this milestone exists to end, held on purpose across a story
boundary — so both call sites and the deletion are one story.

**Two limits on the parallelism, found at the developer's feasibility pass and priced in rather than
discovered mid-build.** `46/04` gained a dependency on `46/01` that is a **file** dependency, not a
logical one: both rewrite `test/arch/acd-fleet-terminal-input-constrained.test.mjs`, and two agents
rewriting one 620-line arch test concurrently is a conflict in the most delicate file in the milestone.
And `scripts/test.mjs` takes registrations from four stories — mechanical, but real friction. So the
honest claim is **`46/00`, `46/01`, `46/02` and `46/03` start together**; `46/04` waits on three of
them.

**Where a gate lands is decided by which story turns it green, not by which story writes it.** `46/03`
authors `acd-terminal-origin-not-port` and `acd-terminal-control-boundary`, but each has a whole-tree
clause that stays red until the duplicate dies — those register in `46/04`. Registering a knowingly-red
gate while four stories are in flight makes every other story's "@executable suite green" criterion
unmeetable and leaves a parallel story unable to tell its own red from someone else's.

## Dependencies

- **44 · spike: terminal-origin-boundary** — the gate. This milestone cannot fix its
  session-source list or its socket-URL construction until the spike records whether a local board PTY
  is reached through the relay or by direct-dial, and whether `FLEET_PORT` is retired or becomes
  configuration. Building the control against a guess is the rewrite this spike exists to prevent.
- **45 · ui-app-shell-routing** — the control's resize, fullscreen and viewport-responsive behaviour sit
  inside the shell's layout primitives; extracting it before the shell exists means fitting it to a
  layout that is about to change.
