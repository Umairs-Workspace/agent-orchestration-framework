---
type: story
number: 03
slug: shared-terminal-core
title: "One terminal core, framework-free and in one home — the frozen two-entry session-source table, the merged state ramp, the fit-or-scale rule, the origin-built URL, the input policy and the drag clamp, all driven by node:test before anything renders them"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The shared terminal core — every decision this milestone makes, as values

## User story

As the engineer who has to fix a terminal bug once instead of twice,
I want every rule the two terminals disagree about — what a session source is, what its geometry is,
what its states are called, how its URL is built, whether it accepts input — to live in one
framework-free module set that plain `node` can drive,
so that the rules are provable before a single pixel renders, and the component that consumes them has
nothing left to decide.

This story writes **no component**. It lands the leaf: five reconciled `.mjs` modules with exhaustive
`node:test` coverage, imported by nothing. That is the same shape milestone 45 used for its route table,
and the architect names it as the good cut — the graph confirms these helpers are leaves with no outward
edges (with the one exception below, which is the point).

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-session-source-table.feature`
- [ ] `tasks/01_the-merged-state-ramp.feature`
- [ ] `tasks/02_fit-or-scale-is-derived-from-the-source.feature`
- [ ] `tasks/03_the-socket-url-is-built-from-an-origin.feature`
- [ ] `tasks/04_input-is-capability-times-posture.feature`

## Notes

**Order.** Depends on nothing. **`46/04` depends on this.** Everything in `ui/` waits on this set;
nothing in `src/` waits on anything.

**Governing ADRs: [001](../../ARCHITECTURE.md) (the home and the `.mjs`/`.tsx` split as an *invariant*,
not a preference), [002](../../ARCHITECTURE.md) (the frozen two-entry source table; capability × posture),
[003](../../ARCHITECTURE.md) (fit ⇔ the source declares a resize control frame),
[004](../../ARCHITECTURE.md) (the URL builder takes origins as an argument and reads no `window`),
[005](../../ARCHITECTURE.md) (one state vocabulary).** DESIGN's
[§THE ONE STATE VOCABULARY](../../DESIGN.md) is binding on task 01 and is the highest-value decision in
the milestone — read it before writing a word of the ramp.

**The one outward edge, and why it does not come with us.** `view-state.mjs` → `ui/src/fleet/assignments.mjs`
is the **only** outward dependency any of the five helpers has (graph-measured). It is the
`assignmentChip`-derived copy — *"no live output — assignment failed · reclaimed"*. That is
**fleet-domain wording**, and ADR-005 rules it stays out: the shared describer takes an optional
`reason` string and the fleet call site injects it. A shared control importing
`ui/src/fleet/assignments.mjs` would re-couple the two surfaces this milestone exists to decouple, and
`acd-terminal-control-boundary` will fail the build if anyone tries.

**This story closes a coverage hole that was believed closed** ([ARCHITECTURE §Codebase health finding 1](../../ARCHITECTURE.md)).
[geometry.mjs:20-23](../../../../../../ui/src/fleet/terminal-view/geometry.mjs#L20-L23) states in terms that
`test/fleet-terminal-view-geometry.test.mjs` holds the 80×24 tie to `mesh-worker-execution.mjs`. **That
file has never existed.** The mirror's entire scale math and the cross-build constant whose drift
produces an unreadable screen are untested — which is worse than untested, because the comment stopped
anyone looking. Task 02 lands the unit coverage and `acd-terminal-mirror-geometry-pinned` lands the tie;
the false comment dies with the file it is written on.

**DG-46-2 lands here too** ([DESIGN](../../DESIGN.md)): the five dark hex literals (`#0b0f14`, `#0f1629`,
`#1e2a44`, `#0b1120`, `#d7dde3`) get one home as named constants in this set, read by **both** consumers
— the xterm `theme` object and the documented class list. They do **not** become `@theme` tokens (a dark
theme is milestone 45's open question 6), and the Tailwind class strings **stay literals the scanner can
see** — m45's GAP-4 lesson, not an invitation to build class names at runtime.

**Invariants that belong to a fitness function and must NOT be written as Gherkin here**
([ARCHITECTURE §Fitness functions](../../ARCHITECTURE.md)): *no port literal on a terminal surface*;
*exactly one xterm construction site*; *the shared set imports no React and nothing from either surface
folder*; *one state vocabulary*; *the descriptor's geometry equals the worker's*. This story **writes** `acd-terminal-origin-not-port`,
`acd-terminal-control-boundary` and `acd-terminal-mirror-geometry-pinned`.

**Each gate is SPLIT by what this story can turn green, and the whole-tree half registers in `46/04`**
(PO ruling from the developer's feasibility pass). Register **here**, green on arrival: no module in
`ui/src/terminal/` names a port; the shared set imports no React, touches no DOM global and imports
nothing from `ui/src/fleet/` or `ui/src/board/`; the descriptor's geometry equals the worker's. Register
in **`46/04`**, red until the duplicate dies: *no* `ws://`/`wss://` URL anywhere in `ui/src` carries a
port literal, and `DOCK_STATES`/`TERMINAL_VIEW_STATES` are defined *nowhere* in `ui/src`. The reason is
operational — with four stories in flight, a knowingly-red gate registered here makes every other
story's "@executable suite green" criterion unmeetable and gives a parallel story no way to tell its own
red from someone else's. A gate lands in the story that turns it green.

### PO rulings, 2026-08-08 (from QA's contract pass)

**DESIGN owns the state vocabulary; ADR-005 owns the structure.** The two docs were authored in parallel
and disagreed on the word list — ADR-005 drafted six states naming `live`/`failed`, DESIGN ruled seven
plus `unknown` naming `streaming`/`error`/`unavailable`. **Settled in favour of DESIGN**, and ADR-005
now carries the reconciliation note in-place so nothing has to remember this. Read ADR-005's table as
the *structural mapping* (which old state becomes which new one, what data rides it) and take the
*spelling* from DESIGN.

**Two transition cells no ADR ruled, now ruled with their evidence.** `ended` + transport failure →
`error` (preserves [view-state.mjs:127-134](../../../../../../ui/src/fleet/terminal-view/view-state.mjs#L127-L134)'s
rule that a close following an error is that error's own tail, and DESIGN's honest-state axis is
one-directional). `error` + **exit frame** → `ended` — an *asserted* exit carries more information than
a transport guess and outranks it; a bare close on an errored view still stays `error`.

**The `wss` clause is keyed to the DIALLED origin, not the page — and today's code has this wrong.**
ADR-004 says "`wss:` iff the page is `https:`", which is identical to the dialled origin for
`local-pty` but **not** for a cross-origin `mirror`. Today
[mirrorWsUrl](../../../../../../ui/src/board/TerminalDock.tsx#L440-L445) takes the *page's* protocol with
the *fleet's* hostname — which is exactly how an `http` fleet gets dialled at `wss://` and fails. The
builder keys off the origin it is actually dialling. Treat the corrected rows as a `@bug` fix, not a
new behaviour.

**A fit whose dimensions normalise to zero is not emitted.** `resize.mjs`'s `toDim` normalisation is
preserved as-is (a non-positive dim becomes `0`, never NaN or a string), but ADR-008 makes the on-open
fit genuinely land, so a 0×0 "fit" would now reach a real PTY where before it was discarded by accident.
A zero-dimension box is an **unmeasured** box, not a fit — the same species as the geometry helper's
zero-box guard, and ruled the same way here and in `46/05`.

**Two more gates this story writes (QA's two gap findings).** DG-46-2's "one palette home **read by both
consumers**" is a source-read claim with no fitness function on disk — half of it could be a value
assertion and QA correctly refused to smuggle the other half into Gherkin. And **ADR-003's "no
canvas/webgl addon may ever load on this surface"** is invisible in code and would break the mirror
*silently* — the 80×24 scale relies on xterm's DOM renderer, and a `@xterm/addon-webgl` import added in
good faith three milestones from now would garble the render with nothing to catch it. Add a row to
`acd-terminal-server-only`, which already owns the "browser terminal imports only `@xterm/*`" rule.

**Register every new suite in [scripts/test.mjs](../../../../../../scripts/test.mjs)** — m43/ADR-014 E7,
`acd-test-suite-registration`. TECH_DEBT 17 is what an unregistered suite costs.
