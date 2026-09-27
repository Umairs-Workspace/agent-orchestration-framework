---
type: story
number: 02
slug: home-core
title: "The home's pure core — the feed axis, the socket-cap arbiter and the layout filter as framework-free .mjs, exhaustively driven and imported by nothing yet"
parent: 49
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 02 · The home's pure core

## User story

As the operator who will trust this screen to tell me the truth about my fleet,
I want every decision the grid makes — *is this pane going to receive anything, may it be live right
now, is it one I asked to watch* — to be a **pure function I can drive without a browser**,
so that the rules are provable rather than inspectable, and a wrong answer is a failing test rather
than something I notice weeks later on a screen that looked fine.

This story builds the home's logic and **renders nothing**. That is deliberate and it is the shape this
codebase has used twice already — milestone 45's route table and milestone 46's shared terminal core
both landed as framework-free `.mjs`, exhaustively driven by `node:test`, imported by no component, and
both were the calmest stories in their milestones. This repo has **no React test harness**, so a rule
that can only be exercised through a component is a rule with no test.

It also creates `ui/src/home/` — the milestone's new directory — and therefore carries the ratchet that
watches the tree it starts.

## Tasks

- [ ] `tasks/00_the-feed-axis.feature`
- [ ] `tasks/01_the-socket-cap-arbiter.feature`
- [ ] `tasks/02_the-layout-filter.feature`
- [ ] `tasks/03_the-directory-budget-ratchet.feature`

## Notes

**Order.** Depends on nothing. **Stories 03, 04 and 05 all depend on this.** It is the milestone's
critical path, so it starts first alongside the three independent stories.

**Governing ADRs: [ADR-003](../../ARCHITECTURE.md) (the feed axis),
[ADR-006](../../ARCHITECTURE.md) (the cap), [ADR-009](../../ARCHITECTURE.md) (layout).**

**The feed axis exists because `waiting for output` forever is a lie.** Research measured that
`sendTerminalFrame` — the only feeder of the relay mirror — has exactly **two** call sites, both in the
worker branch of `src/mesh-launcher.mjs`. So a session that is addressable but is *not* a worker
execution opens a socket that will **never receive a byte**. ADR-003 derives that as a second axis
(`producer-known` / `no-producer` / `roster-gone`) from wire fields the fleet already polls — **never
from bytes**, which is a fitness-gated violation of the mirror lane's content-blind design. The m46
connection ramp **gains no word**: a second vocabulary is precisely the defect milestone 46 spent itself
deleting, and [DESIGN §The connection ramp is UNCHANGED](../../DESIGN.md) fixes how the two compose.

**Corrected 2026-08-13 — the ramp gains no WORD, but `state-ramp.mjs` IS edited, and ADR-003's original
"`state-ramp.mjs` is not edited" clause is explicitly superseded.** QA driving the seam found that
DG-49-2's state is otherwise **unreachable**: `waiting` is reachable only from `connecting` via
`SOCKET_OPEN`, and `terminalEntryState` derives `connecting` for anything bindable — so a bindable-but-
unfed pane would sit on `connecting…` forever. The architect's ruling is that such a pane is **`idle`**,
the ramp's own existing word for "no source bound", whose pane treatment already renders a box with one
centred line and no terminal. **Nothing binds, so no socket opens.** Three small shared-core edits
follow, and they belong to **story 05**, where the behaviour they enable is proven — not here:
the `reason` seam widens from `waiting`-only to `waiting`-or-`idle` (the two states that have observed
nothing), `idle` gains `opensSocket: false`, and `IDLE_PANE_LINE` stops hard-coding one host's
affordance on a control that now has four hosts. The default survives, so the dock and the board stay
byte-identical.

**This story is still pure-`.mjs`-in-`ui/src/home/` and still renders nothing** — the correction changes
which story owns a shared-core edit, not this story's shape.

**The cap is 16, and the number may NOT be justified by a browser limit.** Measured at this refine:
one Chromium page holds **255** concurrent WebSockets to one origin (256th refused, server-confirmed) —
the commonly-cited "6 per origin" is the HTTP/1.1 per-host cap and does not govern WebSocket upgrades.
ADR-006 argues 16 from three things that are real: the mirror's **synchronous replay burst** of up to
256 KiB per tuple on subscribe, its 64-tuple LRU tail budget, and DOM-renderer main-thread contention
(m46/ADR-003 forbids a canvas/webgl renderer for this control, so every pane is on the slower one).
A build that re-derives the number from a browser ceiling has got it wrong.

**The arbiter is ONE pure function over the WHOLE row set, and a pane beyond the cap is UNSUBSCRIBED,
NOT REFUSED.** Per-pane admission decided pane-by-pane is how the count becomes emergent again, which
is the thing SPEC forbids in terms. [DESIGN DG-49-4](../../DESIGN.md) gives the over-cap pane a form:
it is listed, it is at rest, it names the limit, and it does **not** read as an error. And **nothing
auto-demotes** — silently unsubscribing a live pane to make room takes the operator's scrollback away,
because the mirror's replay is bounded and a re-watch does not restore what was evicted.

**Layout is a FILTER over the live index, never a SOURCE of rows.** ADR-009: a persisted layout that
can *contribute* a row is a screen that shows sessions that no longer exist. It degrades to index order
when absent or corrupt, and it stores a **watched set** — never a hidden set
([DESIGN DG-49-9](../../DESIGN.md)) — so a session appearing for the first time is never
pre-suppressed by a preference the operator set weeks ago. Storage is an **argument** to the module, not
a global it reaches for: that is what keeps it drivable under `node:test`, and it is the same discipline
`fleetPageOrigins` and the socket-URL builder already follow.

**The directory ratchet lands HERE, with the diff that creates the directory** — ARCHITECTURE bad cut 4.
A ratchet authored after the growth it was meant to question is a ratchet that ratifies it.
`acd-ui-directory-budget` is TECH_DEBT items 28/33's own fix (b): six per-file ceilings cannot see a
tree that grows by **adding files**, which is exactly what the last three milestones did while every
per-file gate stayed green (`ui/src`: 54 → 71 → 91 → 99 files). This milestone will add ≈9 files and an
8th directory and **cannot pay for itself in file count** — ARCHITECTURE says so plainly rather than
repeating m46's broken shrink promise. The ratchet is what makes that visible next time.

**PO ruling — every one of these modules is driven EXHAUSTIVELY, not sampled.** The invariant-4 policy
gate is the precedent and the standard: it drives the whole frozen source table × both postures × every
malformed declaration, and ADR-006 of milestone 46 states why — *a pure function driven exhaustively is
a far stronger pin than an absence-of-string sweep.* Each of these three answers a question where a
wrong answer is silent on screen, so each gets the same treatment, including the malformed and
adversarial inputs that must fail closed.
