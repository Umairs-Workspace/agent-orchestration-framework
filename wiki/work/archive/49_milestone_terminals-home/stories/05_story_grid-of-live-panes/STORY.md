---
type: story
number: 05
slug: grid-of-live-panes
title: "The grid of live panes — every addressable session in the fleet as a tile that opens a real socket, says honestly whether anything will ever arrive on it, and can be typed into"
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
# 05 · The grid of live panes

## User story

As the operator running agents across three machines,
I want one screen that shows me **every live session at once** — which machine, which repo, which work
item, what state — and lets me get into any of them and type,
so that the question *"what is my fleet doing right now, and where do I need to step in?"* is answered
by looking, not by opening four pages and remembering what I saw.

This is the milestone's heart, and the whole arc's: milestones 44, 46 and 48 exist to make it
buildable. It is also the story where the honesty this screen promises is either kept or quietly lost,
because it is where a pane that will never receive a byte either says so or sits on
`waiting for output` forever.

## Tasks

- [ ] `tasks/00_rows-from-the-session-index.feature`
- [ ] `tasks/01_a-pane-opens-its-socket.feature`
- [ ] `tasks/02_the-honest-feed-states.feature`
- [ ] `tasks/03_the-cap-holds-the-rest.feature`
- [ ] `tasks/04_focus-and-expand.feature`
- [ ] `tasks/05_one-live-region-not-n.feature`
- [ ] `tasks/06_design-conformance.feature`

## Notes

**Order.** Depends on **02**, **03**, **04** and **08** — the milestone's one convergence point. Nothing
depends on it except the ordering constraint that story **07 lands after it**. It also **consumes**
story 00's `code` field; that dependency is soft (the mark renders from a fixture either way) but it is
real and was undeclared at break-down.

**This story was sized XL with LOW confidence at the feasibility pass, and story 08 exists because of
it.** The developer's verdict was *"not buildable as written — the harness is the story"*: six of eight
blockers were harness capability, not grid logic. Story 08 now carries those (N controls, a real shell
so the fullscreen door is open at all, a real `activeElement` and key dispatch, refs that bind). What
remains here is grid logic and the shared-core edits above — still the milestone's largest story, but
its unknowns are now the ones the contracts actually pin. **Do not schedule this before 08 lands**; the
`@executable` socket, focus, expand and live-region scenarios are literally unobservable until it does.

**Two more blockers the feasibility pass found that are THIS story's, not the harness's:** the tile's
byte box is hard-coded `h-48` (which yields a visible letterbox band at the 1280 track — DESIGN calls a
visible band in a *tile* a gap, while the band in S3 is expected), and DESIGN's two declared header rows
are a restructure of both `TerminalControl.tsx` and `TerminalIdentity.tsx`, whose header is today one
`flex-wrap` row with the chip inside a flat fragment. Neither is hard; both are uncosted if discovered
mid-build. Note `TerminalControl.tsx` has 21 lines of budget headroom against an ADR-001 expectation of
**zero** growth.

**Governing ADR: [ADR-002](../../ARCHITECTURE.md); DESIGN §S1, §S2, §S3 and DG-49-2/4/5/7/9/10.**

### The rows come from the session index ALONE

ADR-002: **an assignment is not a session and is never enumerated as one.** The grid's rows are
`sessions[]` — milestone 48's index, which has been served and typed since that milestone and has, in
its own OUTCOME's words, *"no reader"*. This story is the reader. A row that appears because an
assignment exists would put a second authority on "what is live", which is the shape milestone 48
removed.

Consequence, stated so nobody discovers it mid-build: **an anonymous session (`sessionId: null`) is not
in the index at all** — it stays visible in the raw presence array and is deliberately not a tile,
because there is no tuple to open a socket with. No tuple, no socket; that is ADR-014's rule, unchanged
since m38.

### A tile MUST open a real socket in this story — this is TECH_DEBT 29's lesson, verbatim

ARCHITECTURE bad cut 3, and it is the one to take most seriously. Milestone 46 shipped a control that
**opened no socket at all** past 537 green tests, a 71-mutant battery and five reviews, because every
harness stubbed `TerminalControl` by module path. The remedy already exists:
`test/support/terminal-control-harness.mjs` was built for exactly this, with opt-in host refs. **The
task that mounts the pane must prove a socket is constructed to the composed URL** — not that a
component rendered.

### The honest states are the point, not the polish

- **`no live output` — the feed axis made visible** ([DESIGN DG-49-2](../../DESIGN.md)). A session with a
  real tuple but no producer relaying it opens **no socket** and says so, reusing the **existing V10
  seam** (`describeTerminalState`'s injected `reason`, honoured on `waiting` only) rather than adding a
  ramp word. DESIGN also requires the *premise* be stated beside the rule, so that when a producer for
  free sessions does exist, the rule can expire honestly instead of lingering as a lie in the other
  direction.
- **The cap holds the rest** ([DESIGN DG-49-4](../../DESIGN.md)). Over-cap panes are **listed, at rest,
  naming the limit** — no chip, not an error, and **no auto-demotion**, because silently unsubscribing a
  live pane takes scrollback the bounded replay cannot give back.
- **`unavailable` STILL has no producer after this milestone**
  ([DESIGN DG-49-10](../../ARCHITECTURE.md) / ARCHITECTURE finding 4). The index resolves only against
  `mirror` on this page's own origin, so milestone 46's DG-46-3 **travels again**. Its state is
  fixture-rendered here, and — this is the trap — **roster staleness must never be mapped onto it**. A
  stale node is a different fact with different words.

### Typing, focus, and why the tile is not where you type

[DESIGN DG-49-5](../../DESIGN.md): the tile declares `posture: interactive` (story 03's one flipped
literal), but at every documented tile width the effective glyph is **6.1–7.6px** against the design
system's smallest asserted-readable type of 10px. So the inline xterm is **never a keyboard focus
target**; focus lands on the tile, and any gesture that means "type" — `Enter` on a focused tile, a
click into the byte area — **presents the pane fullscreen with focus inside the terminal**. That costs
`COST_LAYOUT` only: one xterm, one socket, adopted through the transition, nothing rebuilt. The blinking
cursor on a tile is therefore honest — the pane *is* typeable, one deliberate act away.

Expand itself is **not redesigned** (DESIGN §S3). Three deltas only when the opener is a tile: the
occupant is interactive so it **claims `Escape`** (the always-visible exit becomes the ordinary case,
not an edge), focus presents inside the terminal, and dismissal returns focus **to the tile**, restoring
its roving stop.

### One live region, not N

[DESIGN DG-49-7](../../DESIGN.md), confirmed at source: `aria-live="polite"` is on the **per-pane**
state chip ([TerminalIdentity.tsx:117](../../../../../../ui/src/terminal/TerminalIdentity.tsx#L117)). One
pane on one card was fine; a dozen panes is a screen reader narrating the entire fleet, continuously.
This story replaces that with **one grid-level polite region**. Note this is an edit to the *shared*
control, so it must not regress the board dock or the fleet card — both still need their announcement.

### PO rulings, 2026-08-13 (from QA's contract pass)

**The `needs input` mark keys on the EXACT WORD, never on truthiness.** `code` is a multi-valued column
— production also writes `"resumed"` and a family of settled codes — and story 00's projection copies it
**verbatim** rather than filtering (a whitelist there would make the wire a second authority over the
worker's vocabulary). So `code` will arrive carrying words that are not `needs-input`, and a
`code != null` test renders "needs input" for a resumed session: a false claim that a human is being
waited on, which is the one failure this mark exists to prevent.

**The cap NEVER evicts — DESIGN wins over ADR-006's original wording, and ARCHITECTURE is being amended
to match.** QA found ADR-006 saying *"watching one over the cap evicts the lowest-priority subscribed
pane"* while DG-49-4 says the toggle is **absent** at cap and there is **no auto-demotion**. **Ruling:
no eviction.** Unsubscribing an incumbent destroys scrollback the mirror's bounded replay cannot give
back — an irreversible, invisible loss caused by an action the operator took on a *different* pane.
Freeing a slot explicitly is one extra, fully legible click. The rule is **priority allocates free
slots; it never evicts**, and QA measured that the arbiter needs the **currently-subscribed set as a
fourth argument** to honour it — a pure function of only (rows, cap, intents) ships the silent-demotion
defect with every other scenario green.

**The sort key is RULED: `(nodeId, repo, sessionId)` — DESIGN wins.** ADR-006 originally said the
index's own `(nodeId, sessionId)` order; the architect has superseded that on m46/ADR-005's precedent
that DESIGN owns what the operator reads. Four constraints ride with it and this story owns all four:
**one** sort site, plain codepoint comparison (never `localeCompare`), an unstated `repo` sorts last,
and **the server's order does not change** — it is a wire contract with a second consumer, so the
re-sort is the browser's and is safe only because the index hands down a *total* order.

**This story owns THREE shared-core edits, and ADR-003's original "`state-ramp.mjs` is not edited" is
superseded.** QA driving the seam found DG-49-2's state unreachable as specified: `waiting` is reachable
only from `connecting` via `SOCKET_OPEN`, and anything bindable enters at `connecting`, so an unfed pane
would sit on `connecting…` forever. **Ruling: that pane is `idle`** — the ramp's own existing word for
"no source bound", whose treatment already renders a box with one centred line and no terminal, which is
also exactly what the held over-cap tile needs. Nothing binds, so **no socket opens**. The three edits:
the `reason` seam widens from `waiting`-only to `waiting`-or-`idle`; `idle` gains `opensSocket: false`;
and `IDLE_PANE_LINE` stops hard-coding one host's affordance ("Press Run agent on an item") on a control
that now has four hosts — a latent m46 defect this milestone is the first to expose.

**These are edits to the SHARED control, so the regression bar is the whole of m46.** The default line
survives so the board dock and the fleet card render byte-identically; prove that rather than assume it.
The same bar applies to task 05's live-region change.

**The held tile's box is a HOST declaration, not an unconditional byte area.** The architect refused the
obvious fix because it would regress the fleet card's deliberately header-only rest state: today's
`{subscribed ? … : null}` guard conflates *is a socket open* with *does this host show a box when
nothing is bound*. The second becomes a value in `host-model.mjs`'s table (story 03 declares it; this
story observes it), so the module boundary is — line: the home's, treatment: the ramp's, box: the byte
area's, presence: the host table's — and **nothing new is authored in the `.tsx`**.

**Presentation from a tile is a FORM, not a new prop.** ADR-007 forbids a prop, and a host may not be
handed presentation at all — the request carries the live DOM node the shell adopts, and a host holding
it is what m46/ADR-009 forbids. So the grid pane declares `AFFORDANCE_FULLSCREEN` with a
**pane-activation form**, a new value in the existing closed `form` vocabulary that `changeForAffordance`
already maps and `affordanceFormViolations` already polices. It is per-host for a measured reason: on
the **dock** a byte-area click must focus xterm *to type*, and turning that into a present would take
typing away from the surface m42 deliberately made typeable.

**`opener` keeps its name; the control's lie is the bug.** It hard-codes `openerRef.current` regardless
of what opened it. The rule is that the return target is **the element carrying the presenting
affordance's form** — the button for an icon control, the tile for pane-activation — plus one new
request field for present-time focus, derived beside `claimsEscape` from the same `model.inputEnabled`
so the two cannot disagree.

### Agent state is a mark, not a chip

[DESIGN §Agent state is a SECOND AXIS](../../DESIGN.md): exactly one value exists — `needs input`, the
only thing the product produces (story 00 puts it on the wire) — rendered as a quiet pill on the
**identity row** while the connection chip stays on the **status row**. Two axes, two forms, two
positions, no competition. **Unknown renders nothing**, because an "unknown" badge on most tiles trains
the eye to ignore the one that matters. It never pulses and never re-orders the grid. **It is
fixture-rendered, and its absence from a live render is not a finding** — the producer needs a worker
genuinely blocked on a human at the moment of observation.
