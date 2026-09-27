---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 49 · The terminals home — Design

## Intent

This milestone inverts the product's centre of gravity: `/` stops being a placeholder
([Landing.tsx:37-40](../../../../ui/src/app/Landing.tsx#L37) — *"Live terminals will appear here."*) and
becomes **a grid of every live session in the fleet**, each one a pane you can focus, read and type
into.

**This is a new SURFACE built out of an EXISTING control.** Milestone 46 shipped one terminal control
with three hosts; this milestone gives it a **fourth host** and puts N of them on one page. Every
colour, type step, glyph, state word and copy string it paints already exists and was read at source —
[46/DESIGN](../46_milestone_terminal-control-unification/DESIGN.md) and its one palette home
([palette.mjs](../../../../ui/src/terminal/palette.mjs)) are **in force, not re-opened**. This document
adds **no colour, no radius, no font, no `@theme` token and no eighth state word.** Where it adds
copy, every string is listed in one table with its justification (§The copy this milestone adds).

**Six binding rails. Everything below is one of these applied somewhere.**

1. **m46's ONE state vocabulary survives intact.** `idle · connecting · waiting · streaming · ended ·
   error · unavailable` (+ `unknown`), [state-ramp.mjs:57-68](../../../../ui/src/terminal/state-ramp.mjs#L57).
   **A second vocabulary is the exact defect m46 deleted** and this milestone does not re-create one —
   not for agent state, not for the socket cap, not for a pane nothing feeds.
2. **A pane never lies about its far end.** Two new ways to lie appear at this scale and both are
   refused here: `waiting for output` **forever** on a pane nothing will ever feed (§DG-49-2), and a
   grid that says *"no live sessions"* when agents are demonstrably working (§DG-49-1).
3. **Colour is never the only signal**, and the four ranked signals are m46's: the **text label**, the
   **dot's fill and shape**, **motion on exactly two states**, and the **mandatory cause line**. At
   N panes, signal 3 is the one that breaks (§DG-49-6).
4. **Geometry is a property of the SOURCE; posture is a property of the HOST.** Unchanged
   ([geometry.mjs:71-74](../../../../ui/src/terminal/geometry.mjs#L71),
   [input-policy.mjs:84-95](../../../../ui/src/terminal/input-policy.mjs#L84)). The grid mounts exactly
   one source — `mirror`, scaled, pinned 80×24 — because that is the only row a session-index entry
   can resolve against (RESEARCH §Q1).
5. **The grid is a picture of the fleet; the expanded pane is where you read and type.** At every
   documented width a tile's glyphs are **smaller than the smallest type this design system asserts
   is readable**, measured below. That is not a defect to fix by shrinking the grid; it is the reason
   expand exists (§DG-49-5).
6. **The control invents no affordance of its own.** The fourth host declares from the SAME eight
   affordances [host-model.mjs:56-65](../../../../ui/src/terminal/host-model.mjs#L56) already names, and
   every one it does not declare carries **a reason**, in the same `notDeclared` discipline
   ([host-model.mjs:93-95](../../../../ui/src/terminal/host-model.mjs#L93)).

Three surfaces are in scope, and two of them are hosts of the one control:

- **S1 — the terminals home at `/`.** The page: its chrome, its grid, its empty and degraded states.
- **S2 — the grid pane.** The control's **fourth host** (`grid-pane`), beside `board-dock`,
  `fleet-card` and `fullscreen`.
- **S3 — expand.** The shell's **existing** fullscreen occupant (m46/ADR-009). **Not redesigned.**
  Only what differs when the opener is a grid pane is specified here.

---

## Conformance source of truth

> **There is NO committed mock for any surface in this milestone.** Asked per surface at refine
> (2026-08-13) the operator answered *"write the prompt for claude design, I'll generate them"*. That
> prompt is committed at [`mocks/PROMPT.md`](mocks/PROMPT.md).
>
> **Therefore the binding checklists in this document ARE the conformance baseline** — mandatory, and
> the thing a design-conformance review judges the built surface against, region by region. A review
> that runs before the mocks arrive **has a baseline and must not return `INCONCLUSIVE` for want of
> one**; it returns `CONFORMS` or `GAPS` against §Surfaces.
>
> **When a committed mock lands it supersedes this document's checklist FOR ITS SURFACE wherever the
> two differ.** The mock is the visual source of truth; the checklist is what makes it *checkable*.
> Where the mock is silent, the checklist still binds. Where they conflict, the mock wins and **this
> document is amended in the same change** — a checklist left contradicting a committed mock is a
> defect, not a nuance. (m46 did exactly this, in
> [46/mocks/CONFORMANCE.md](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md); the
> same delta list is expected here.)
>
> **A remote design-tool link is never an acceptable substitute for the committed file.** Not
> `claude.ai/design`, not Figma, not a screenshot in a chat. The design-conformance reviewer is
> **read-only** and cannot open one — a baseline it cannot `Read` is not a baseline (07/ADR-003;
> [36/mocks/README.md:3-5](../36_milestone_mesh-desktop-app/mocks/README.md#L3);
> [45/DESIGN §Conformance source of truth](../45_milestone_ui-app-shell-routing/DESIGN.md);
> [46/DESIGN §Conformance source of truth](../46_milestone_terminal-control-unification/DESIGN.md)).

| Surface | Committed mock | Status | Binding baseline |
|---|---|---|---|
| **S1 — the terminals home at `/`** | `mocks/s1-terminals-home.png` | **PENDING (operator-supplied)** | **§S1's binding checklist** |
| **S2 — the grid pane** | `mocks/s2-grid-pane.png` | **PENDING (operator-supplied)** | **§S2's binding checklist** |
| **S3 — the expanded pane** | `mocks/s3-expanded-pane.png` | **PENDING (operator-supplied)** | **§S3's binding checklist**, and [46/DESIGN §S3](../46_milestone_terminal-control-unification/DESIGN.md) unchanged beneath it |
| the app shell around S1 | [45/mocks/app-shell.png](../45_milestone_ui-app-shell-routing/mocks/app-shell.png) | as recorded there | [45/DESIGN §Surface 1](../45_milestone_ui-app-shell-routing/DESIGN.md) — **not re-baselined here** |
| the one terminal control | [46/mocks/Terminal Panel Spec.dc.html](../46_milestone_terminal-control-unification/mocks/Terminal%20Panel%20Spec.dc.html) | committed | [46/mocks/CONFORMANCE.md](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md) — **binds every region S2 inherits** |

**Do not create a placeholder PNG.** An empty or stand-in image is worse than an absent one: a
reviewer cannot tell it apart from a real baseline. `mocks/` holds `PROMPT.md` today and gains each
PNG when the real file arrives.

**The m46 mock binds this milestone wherever S2 inherits a region.** The grid pane is the same
control: its header lockup, identity line, `read-only` pill, state chip, byte area, non-live bar and
control cluster are the mock's, not this document's, and a reviewer judging those regions reads
`46/mocks/CONFORMANCE.md`. What this document adds is the **tile** around them and the **grid** around
that.

---

## Render breakpoints and render targets

Three widths and one height, inherited **unchanged** from
[45/DESIGN §Render breakpoints](../45_milestone_ui-app-shell-routing/DESIGN.md). This surface lives
inside that shell and **gets no breakpoint system of its own** — its only reflow rule is the grid's
own `auto-fill` track floor, which is the house's existing one
([Fleet.tsx:914](../../../../ui/src/fleet/Fleet.tsx#L914)).

- **1280** — the primary judgement width.
- **768** — the desktop-app proxy (the Rust window is **760×520**,
  [app/desktop/ui/styles.css:50](../../../../app/desktop/ui/styles.css#L50)).
- **390** — mobile.
- **520 tall (binding).** With the shell's 88px steady-state chrome the content box is **432px**
  ([shell-layout.mjs:163-165](../../../../ui/src/app/shell-layout.mjs#L163) — `CONTENT_FLOOR = 432`).

**What the grid does at each width — derived, not invented.** The page container is the fleet's own
(`px-4 py-7 sm:px-8` inside `max-w-[1240px]`, [Fleet.tsx:841-842](../../../../ui/src/fleet/Fleet.tsx#L841))
and the grid is `repeat(auto-fill, minmax(320px, 1fr))` with `gap-4`
([Fleet.tsx:914](../../../../ui/src/fleet/Fleet.tsx#L914)). Every number below follows by arithmetic from
those two and from the byte area's own 8px side gutters
([palette.mjs:74](../../../../ui/src/terminal/palette.mjs#L74) — `mx-2 mb-2`) and the mirror's intrinsic
**640×408** ([palette.mjs:67-69](../../../../ui/src/terminal/palette.mjs#L67) — 13px/17px over
[source-table.mjs:48-49](../../../../ui/src/terminal/source-table.mjs#L48)'s 80×24).

| Viewport | Available | Columns | Track | Byte area | Scale | Effective glyph |
|---|---|---|---|---|---|---|
| **1280** | 1216 | **3** | ≈394px | ≈376px | **0.588** | **7.6px** |
| **768** | 704 | **2** | ≈344px | ≈326px | **0.509** | 6.6px |
| **760×520** | 696 | **2** | ≈340px | ≈322px | 0.503 | 6.5px |
| **390** | 358 | **1** | 358px | 340px | 0.531 | 6.9px |
| the grid's **floor track** | — | — | **320px** | 302px | **0.472** | 6.1px |

**Read that last column and then read rail 5.** The smallest type this design system asserts anywhere
is **10px** (the pills, [palette.mjs:55-56](../../../../ui/src/terminal/palette.mjs#L55)). **At every
documented width a grid tile's glyphs are smaller than that.** This is arithmetic, not taste, and it
is the whole justification for §DG-49-5.

**Render targets** (the orchestration renders these and hands the reviewer the screenshots; **the
reviewer does not run the browser**):

| # | Surface | States to capture |
|---|---|---|
| R-A | **S1** at 1280 | populated (mixed tiles) · **E1 empty** · **E2 runs-but-no-sessions** · loading · payload error |
| R-B | **S1** at 760×520 | populated — the grid **scrolls**, the shell chrome does not |
| R-C | **S1** at 390 | populated — one column, tile header still **two rows**, nothing overprinted |
| R-D | **S2** at the 1280 track (≈394px) | `connecting` · `waiting` · `streaming` · `ended` · `error` · **`no live output` (never-fed)** · **held (slot free)** · **held (at the cap)** · **`needs input`** |
| R-E | **S2** at the **floor track (320px)** | `streaming` and `waiting` — the two widest headers, both rows intact |
| R-F | **S3** from a grid pane at 1280×800 | `streaming`, focus **inside** the terminal, exit control visible |
| R-G | the fleet node card (not this page) | the `(session)` line with **two sessions in one repo** — §The dedupe rule |

**Two of those frames have no production producer in this milestone and must be captured from a
fixture:** R-D's **`needs input`** (§DG-49-3 — the fact is dropped at one wire hop) and, if the
architect has not yet chosen the cap, R-D's **held** pair. A reviewer judges them like any other
state and **must not log their absence from a production render as a fresh finding.**

**There is no `unavailable` render target, and that is deliberate — §DG-49-10.**

---

## The constraint this design is written against

Everything in the right column bounds what this surface may do. Facts marked **(R)** were measured by
[RESEARCH.md](RESEARCH.md) at this refine; the rest were read at source for this document.

| Fact | Where it lives | Consequence for this design |
|---|---|---|
| **The grid is very often EMPTY, and that is ORDINARY.** All three live nodes report `sessions: []` while two of them report non-empty `activeRuns` **(R)** | RESEARCH §Q1; the bundle ships session hooks for **`runtimes: ["codex"]` only** ([bundle.json:12-14](../../../../src/bundle/bundle.json#L12); Claude's only hook member is `claude-artifact-sync`, [:15-16](../../../../src/bundle/bundle.json#L15)) | **§DG-49-1.** The empty state is the state an operator most likely sees FIRST. It gets two variants and it names the producer-side reason. |
| **A pane can be addressable and never receive a byte.** Only a worker's assignment execution feeds the relay — two call sites **(R)** | RESEARCH §Q1 (`src/mesh-launcher.mjs:1151`, `:1290`) | **§DG-49-2.** A free session (`workItem: null`) is honestly stuck at `waiting` forever. `waiting for output` forever is a lie. |
| **Agent state has ONE real producer and it is assignment-scoped**, and the wire drops it at exactly one hop **(R)** | `needs-input` at `src/mesh-worker-execution.mjs:90,1124,1186,1201`, carried on the assignment `code` column (`src/assignment-record.mjs:114-116`), **not copied by `projectAssignment`** (`src/global-mesh-query.mjs:132-148`) | **§DG-49-3.** One mark, one word, present only when asserted. A free session has no signal at all and gets no mark. |
| **Client-side content-sniffing to infer state is fitness-gated** **(R)** | RESEARCH §Q2; `source-table.mjs:126-137`; `test/arch/acd-fleet-terminal-input-constrained.test.mjs:214-218` | Agent state may only come from a producer-side fact on the wire. **Never from the bytes.** |
| **The mirror is fixed 80×24 and SCALED, never re-wrapped**; no canvas/webgl renderer | m46/ADR-003; [geometry.mjs:35-57](../../../../ui/src/terminal/geometry.mjs#L35), [source-table.mjs:40-49](../../../../ui/src/terminal/source-table.mjs#L40) | §Fit vs scale at tile size. At tile scale you read **shape**, never words. |
| **No socket cap exists anywhere today, and the browser is not the wall** — one Chromium page holds **255** concurrent WebSockets to one origin **(R)** | RESEARCH §Q3; `src/mesh-ui-serve.mjs:672-706` accepts every upgrade with no admission cap and no `bufferedAmount` gate (`:735`) | **§DG-49-4.** The cap is a **product policy**, client-enforced, and it must render as a *state of the grid*, never as an error. |
| **The mirror LRU-evicts scrollback past 64 tuples** **(R)** | `src/mesh-terminal-mirror.mjs:58-59` | A grid that subscribes to everything degrades another surface's data. Another reason the cap is a design fact, not an implementation detail. |
| **The session index can ONLY resolve against the `mirror` row** — `MeshSession` carries no `ref`, `provider` or board origin **(R)** | RESEARCH §Q1/§Q4; [api.ts:219-228](../../../../ui/src/fleet/api.ts#L219) | The grid mounts one source. **It therefore cannot produce `unavailable` either** — §DG-49-10. |
| **Posture is fixed at xterm construction; changing it costs the SESSION** | [host-model.mjs:287](../../../../ui/src/terminal/host-model.mjs#L287) — `SET_POSTURE` … *"UNREACHABLE in m46, named so m49 does not discover it"* | **A tile cannot be read-only inline and interactive expanded.** One posture, both hosts. This is what forces §DG-49-5's shape. |
| **Expand costs only LAYOUT** — the shell adopts the live node | [host-model.mjs:279-280](../../../../ui/src/terminal/host-model.mjs#L279); [shell-bus.mjs:147-157](../../../../ui/src/app/shell-bus.mjs#L147) | So "take the keyboard → expand" costs nothing: one xterm, one socket, through both transitions. |
| **An interactive occupant CLAIMS `Escape`** — it is a live keystroke for the far end's TUI | m46/[Build-2]; [host-model.mjs:128-131](../../../../ui/src/terminal/host-model.mjs#L128) | The exit control is **always visible**. On this surface that is now the ORDINARY case, not the exception. |
| **The state chip carries a per-pane `aria-live="polite"`** | [TerminalIdentity.tsx:117](../../../../ui/src/terminal/TerminalIdentity.tsx#L117) | One pane: good. **N panes: a screen reader narrating the whole fleet, unprompted, every poll.** §DG-49-7. |
| **The only `prefers-reduced-motion` rule in `ui/` names `.aof-pending` alone**, and `animate-pulse` is emitted bare and applied unconditionally | [index.css:112-116](../../../../ui/src/index.css#L112); [palette.mjs:189-192](../../../../ui/src/terminal/palette.mjs#L189); [TerminalIdentity.tsx:119](../../../../ui/src/terminal/TerminalIdentity.tsx#L119) | **The reduced-motion escape m46 claims does not exist** ([palette.mjs:186](../../../../ui/src/terminal/palette.mjs#L186) says it does). One pulse hid it; N pulses will not. §DG-49-6. |
| **A terminal with no visible owner is never rendered** (V1) | [pane-identity.mjs:45-47](../../../../ui/src/terminal/pane-identity.mjs#L45), [:80-107](../../../../ui/src/terminal/pane-identity.mjs#L80) | A free session has no work-item ref. **The owner is the repo** — a real field on `MeshSession`, never an invented one. |
| **The whole payload re-polls every 5s** | [assign-affordance.mjs:54](../../../../ui/src/fleet/assign-affordance.mjs#L54), consumed at [Fleet.tsx:462](../../../../ui/src/fleet/Fleet.tsx#L462) | **Focus must survive a re-render** and tiles must not move. §The focus model. |
| **A terminal-hosting surface is `content:fixed`** — and m45 already names this surface | [45/DESIGN](../45_milestone_ui-app-shell-routing/DESIGN.md): *"the board, and (m49) the terminals grid"*; today `landing` is `content:page` ([shell-layout.mjs:527](../../../../ui/src/app/shell-layout.mjs#L527)) | The page never scrolls; **the grid owns scroll**. Inherited, not invented. |

**This design asks for exactly one new field on the wire** — the assignment's `code`, through
`projectAssignment` — and it is additive, already produced, and named in RESEARCH §Q2 as a closed
gap. **Everything else it renders is on the payload today.**

---

## The design gaps — ten, each resolving as a rule here plus a `@uat` visual-review scenario

### DG-49-1 — the grid's ORDINARY state is empty, and "no live sessions" is a lie by omission

**Measured (R):** every node on the real three-node fleet reports `sessions: []` right now, while two
of them report a non-empty `activeRuns`. The cause is producer-side and structural: a presence session
record exists only where the workspace wires the assistant's session hooks, and the shipped bundle
wires them for **Codex only** ([bundle.json:12-14](../../../../src/bundle/bundle.json#L12)).

**So an operator opening `/` for the first time will very likely see nothing while agents are
demonstrably working.** A single `No live sessions.` would be true of the array and false about the
world — the exact species of lie rail 2 exists to refuse.

**The rule: TWO empty states, and the second one names why.**

- **E1 — nothing is running.** No sessions **and** no active runs anywhere.
  Line 1: **`Nothing is running.`** Line 2: **`Assign work from the fleet.`** Plus the one link.
- **E2 — runs in flight, no session reporting.** `sessions: []` **and** at least one node reports
  `activeRuns`. Line 1: **`<N> runs in flight · no session is reporting a terminal.`**, and at
  **N = 1** it reads **`1 run in flight · no session is reporting a terminal.`** (§The copy this
  milestone adds — the pluralisation rule).
  Line 2 (the why, verbatim): **`A session appears here only when its workspace reports one. The
  bundle wires session hooks for Codex; a Claude Code session is reported only where those hooks are
  configured.`** Plus the one link.

**Both carry exactly one route and NO command.** The link is **`Open the fleet →`** to `/fleet`,
because that page renders the runs this page cannot. **No recovery command is printed**, and that
restraint is m46/RULING 2's discipline applied: a refusal that names the wrong command is worse than
one that names none, and *which* command wires Claude's session hooks into a workspace is a
**producer-side decision the architect still owns** (RESEARCH §"What this decides for the break-down").
When that decision lands, E2 gains its command line here, in one change.

**Form:** the house's existing dashed empty card, verbatim —
`rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground` — and
**`max-w-[520px] mx-auto`**, so it is a card rather than a band.

<!-- WIDTH ADDED at the @uat conformance pass, 2026-08-13 (PO, on the designer's GAP-5). This clause
named the house card's classes and said nothing about width, so the build ran it to the full 1214px
content column — correctly, by this document. The result is E2's second line rendering as ONE ~1100px
line at roughly 150 characters, which is not a designed empty state, and the failed state landing in a
differently-anchored box beside it (GAP-4, fixed in the same change: all four page states top-anchor).
Adopted from `mocks/BASELINE.md` §S1, which specifies a 520px centred card. Its 13px MONO headline is
REJECTED — mono would fork the light shell's type ramp for one string, against this document's own "no
new value on this surface" rail. The designer reached the same split independently, which is the only
reason I am overriding half of the operator's own mock rather than all or none of it. -->

([Fleet.tsx:910](../../../../ui/src/fleet/Fleet.tsx#L910)). Never a spinner, never red, never a skeleton.

**Close condition.** A render at 1280 of both E1 and E2 (R-A), each naming what is true. **`@uat`: the
empty terminals home tells the truth.**

### DG-49-2 — `waiting for output` FOREVER is a lie, and the ramp has no word for it

**Measured (R):** a session with a real `(nodeId, sessionId)` but **no work item** opens a socket that
nothing will ever feed — the relay has exactly two feeders, both inside a worker's assignment
execution. The pane is not broken, not disconnected, not unavailable and not ended. It is honestly,
permanently silent, and `waiting for output` asserts *"bytes are plausibly next"* — which is precisely
the distinction m46 created `waiting` to carry.

**The rule, and it adds NO state word: this is the V10 seam, already built.**
[state-ramp.mjs:576-584](../../../../ui/src/terminal/state-ramp.mjs#L576) already accepts an injected
`reason` on `waiting` **only**, rewrites the chip to **`no live output`** and puts the injected
sentence in the pane. The fleet card already injects one
([terminal-mount.mjs:120-125](../../../../ui/src/fleet/terminal-mount.mjs#L120)). **The grid's mount
injects one for a free session.**

- **Chip:** `no live output` — existing string, [state-ramp.mjs:581](../../../../ui/src/terminal/state-ramp.mjs#L581).
- **Pane line (new copy):** **`no live output — no assignment is relaying this session`**, top-left in
  the byte area, `mono text-xs`, no motion, no dimming, nothing red — the empty-by-definition
  treatment, unchanged ([state-ramp.mjs:616-637](../../../../ui/src/terminal/state-ramp.mjs#L616)).
- **And it opens NO SOCKET.** Spending one of a scarce, capped set of live sockets to re-discover a
  fact already on the payload is waste, and the socket would prove nothing the wire has not said.
- **It therefore offers NO worded toggle and NO expand.** A pane with no subscription has nothing to
  release and nothing to present, and §DG-49-4's own precedent is that a control which cannot do its
  job is **absent, not disabled**. See §S3's "a held tile cannot be expanded" — the two cases are one
  rule: **expand is offered iff there is a pane to present, and the toggle iff there is a
  subscription to spend.**
  <!-- ADDED 2026-08-13 at the design-conformance re-judge (designer, closing GAP-1 and folding in
  rule R-1). The deployed build offered `Hide terminal` on the never-fed pane — a false affordance
  naming a subscription that was never opened. The clause above said "opens NO SOCKET" and left the
  consequence for the header unstated; a builder reading only the header rules had no reason to omit
  the control. Now stated where the header is specified. -->

**The premise this rests on, stated so the rule can expire honestly.** The rule keys on **one fact on
the wire** — `workItem === null` — because RESEARCH measured that only an assignment execution feeds
the relay. **If a producer for free sessions ever lands (milestone 50's spawn is the obvious
candidate), this rule is amended in the same change** — otherwise the grid would show `no live output`
over a session that is streaming, which is the same lie in the other direction and the worse one.

**Why not a new word.** `never-fed`, `orphaned`, `unrelayed` would each be an eighth connection state
describing a *producer* fact, and m46/ADR-005 froze the ramp precisely so a second vocabulary cannot
grow one word at a time. The V10 seam exists for exactly this shape: *the transport is fine and output
is not coming, and the reason comes from the call site's own domain.*

**Close condition.** R-D's `no live output` frame, with the line legible and the pane carrying no
motion. **`@uat`: a session nothing relays says so, and says it once.**

### DG-49-3 — agent state is a SECOND AXIS and must not become a second chip

**The trap:** SPEC asks for *"blocked / working / done, so the fleet is scannable"*. Painting three
agent words beside seven connection words in one header is two vocabularies in one chip cluster —
the defect m46 deleted, re-created at a new address.

**The rule, in four parts:**

1. **The connection ramp is untouched.** The state chip (dot + word) keeps its form, its position,
   its classes and its meaning. Agent state never wears the chip's form.
2. **Exactly ONE agent-state mark exists, and it is the only one the product can assert:
   `needs input`.** It renders when — and only when — the assignment behind this session asserts the
   `needs-input` code. There is **no `working` mark and no `done` mark**: `working` would restate what
   `streaming` already observes, and `done` is the assignment lifecycle chip's word on a surface that
   is not this one. Inventing either is inventing a fact.
3. **Absence asserts NOTHING.** No mark means *unknown*, which is the common case and will stay common
   (a free session has no assignment record to carry a code at all). **An "unknown" mark is forbidden**
   — a badge that says "we don't know" on most tiles is noise that trains the eye to ignore the badge
   that matters.
4. **Its form is a quiet pill carrying its WORD**, in the identity row, immediately after the
   `read-only` pill: the house's existing pill shape
   ([palette.mjs:55-56](../../../../ui/src/terminal/palette.mjs#L55)) at `text-[10px] font-semibold
   uppercase tracking-[0.08em]`, `shrink-0`, never truncated, never dropped. **It never pulses**
   (§DG-49-6 — motion is confined to two connection states and a grid may not add a third), and it
   never re-orders the grid (§The focus model — tiles that move under a cursor are worse than a mark
   that waits to be seen).

**Where its scannability actually comes from:** the surface-slot summary counts it —
`<K> needs input` at K = 1, `<K> need input` above 1 — so the number is visible without scanning, and
the mark on the tile is what locates it. One fact, two places, one of them a count.

<!-- CORRECTED at the @uat conformance pass, 2026-08-13 (PO, on the designer's GAP-3). This template
read `<K> need input` unconditionally, and the build implemented it faithfully — which is how the
deployed home came to render `1 need input`. THIS DOCUMENT WAS THE DEFECT, not the build: §DG-49-7's
live-region wording, four hundred lines below, already says "1 pane needs input". Two spellings of one
count in one document, and the build inherited the wrong one.
EVERY COUNT IN THE SUMMARY PLURALISES BY ITS OWN VALUE — `1 session · 0 live`, `6 sessions · 5 live ·
1 needs input`, `2 need input`. The deployed build also rendered `1 sessions`, from the same omission.
Tenth stale/wrong premise in this milestone, and the only one that reached a rendered pixel an
operator would read.

SUPERSEDED IN SCOPE 2026-08-13 at the design-conformance RE-JUDGE (designer, on GAP-6). The sentence
above was scoped to "THE SUMMARY", and so was the fix. K3 (`<N> runs in flight`) sat on the SAME
SCREEN, was never in the blast radius, and the live production home went on rendering
`1 runs in flight` — the first sentence an operator meets on this surface. The correction was right
and its SCOPE was the defect. THE BINDING STATEMENT NOW LIVES ABOVE THE COPY TABLE (§The copy this
milestone adds) and binds every interpolated count on this surface, with the sweep enumerated so it
is checkable rather than remembered. Do not restate it here; go there. -->


**It has NO PRODUCER on the wire in this milestone unless one hop is added.** `projectAssignment`
copies eight fields and `code` is not among them
(`src/global-mesh-query.mjs:132-148`, RESEARCH §Q2). **Named here in advance, for the reason m46 had
to name DG-46-3: a reviewer that cannot tell "not built" from "built and never triggered" costs a
full review round-trip.** The mark ships driven by a fixture; **its absence from a production render
is not a finding**.

**Close condition.** R-D's `needs input` frame beside a `streaming` frame — one chip, one mark, no
competition. **`@uat`: a blocked agent is visible without reading its output.**

### DG-49-4 — a bounded live-socket count needs a form, and it must not read as an error

SPEC requires the live-socket count to be *"an explicit, configured number, not an emergent one"*, and
RESEARCH proves the platform will not enforce it for us. So some tiles will exist, be listed, and not
be streaming. **That is a state of the GRID, not a failure of the session** — nothing is broken,
nothing is unavailable, and nothing is red.

**The rule: a tile beyond the cap is an UNSUBSCRIBED pane — the fleet card's rest state, in a grid.**
This adds no vocabulary at all: `subscribed` is already first-class
([host-model.mjs:211-229](../../../../ui/src/terminal/host-model.mjs#L211)), the fleet card's rest state
is already *"no state chip, no socket, no bytes"*
([46/DESIGN §S2](../46_milestone_terminal-control-unification/DESIGN.md)), and the control that
promotes it is already worded and already named — `Watch terminal →` / `Hide terminal`
([host-model.mjs:84-85](../../../../ui/src/terminal/host-model.mjs#L84)).

- **The tile keeps its box.** A header-only tile would leave a hole in a uniform grid. The byte area
  stays, at its normal size, and holds one centred line.
- **held, with a live slot free:** the line reads **`not streaming`**, and the header's worded toggle
  reads `Watch terminal →`.
- **held, with the grid AT its cap:** the line reads
  **`not streaming — <N> live panes already · hide one to watch this`**, and **the worded toggle is
  absent** — a control that cannot do its job is not offered, and the line above it names the exact
  recovery. (This is m46 open question 7's rule — *a control implies this surface can fix it* — applied
  in the one place where it can be honoured exactly.)
- **`<N>` is rendered from the configured number, never typed into the copy.** The number is the
  architect's; the design fixes only that it appears.
- **There is NO auto-demotion.** Watching one pane never silently closes another: `Hide` closes the
  socket and the mirror is ephemeral (ADR-014), so an automatic demotion would take away scrollback an
  operator may still be reading, in a tile that may be scrolled off screen, for a reason they never
  saw. **The exchange is the operator's to make, and the copy tells them how.**
- **No chip, no dot, no motion, nothing red, and never the `unavailable` dashed block** — that block
  means *the origin could not be resolved*, which is false here and would send the operator after the
  wrong fault (m46/RULING 2's whole lesson).

**Close condition.** R-D's two held frames. **`@uat`: a session past the live limit is listed, calm,
and promotable.**

### DG-49-5 — a grid tile is not a place to type; TAKING THE KEYBOARD IS THE EXPAND

**The measurement is the argument.** At every documented width the effective glyph is **6.1–7.6px**
(§Render breakpoints), against the design system's smallest asserted-readable type of **10px**. An
operator typing into an inline tile cannot read what they typed, into a live agent, on another
machine.

**And posture cannot be changed on expand.** Making a tile read-only inline and interactive expanded
would cost the SESSION, not the layout
([host-model.mjs:287](../../../../ui/src/terminal/host-model.mjs#L287)) — the xterm is rebuilt, the
socket reopens, and because the mirror is ephemeral the pane comes back **empty**. So the two hosts
must share one posture.

**The rule:**

1. **A grid tile declares `posture: interactive`** — SPEC's *"panes are typeable from the start"*,
   honoured, with one declaration flipped at one call site exactly as m46 promised
   ([terminal-mount.mjs:152-157](../../../../ui/src/fleet/terminal-mount.mjs#L152)).
2. **The inline tile's xterm is never a keyboard focus target** (`tabindex="-1"`). Focus lands on the
   **tile**; nothing is ever typed into a pane the operator cannot read.
3. **Any attempt to type takes you where you can read.** `Enter` on a focused tile, or a click into
   the byte area, **presents the pane fullscreen with focus inside the terminal**. This costs
   `COST_LAYOUT` only — one xterm, one socket, adopted through the transition — so nothing is lost and
   nothing is rebuilt.
4. **Therefore the blinking cursor on an inline tile is honest**: the pane *is* typeable, one
   deliberate act away, and every affordance that looks like "type here" performs that act.

**What a reviewer must NOT log:** tiny glyphs in a tile (that is the designed trade, m46 §Fit vs
scale), or the absence of an inline text caret focus ring inside the byte area.

**Close condition.** R-F: the expanded pane, opened from a tile, with focus inside the terminal and
the exit control visible. **`@uat`: typing into the fleet lands somewhere you can read it.**

### DG-49-6 — N pulsing dots, and the reduced-motion escape DOES NOT EXIST

**Measured at source, and it contradicts a claim m46 makes about itself.**
[palette.mjs:186-188](../../../../ui/src/terminal/palette.mjs#L186) states *"Both pulses honour
`prefers-reduced-motion` through the existing scoping convention in `ui/src/index.css`"*. The only
`prefers-reduced-motion` rule in `ui/` is [index.css:112-116](../../../../ui/src/index.css#L112) and it
names **`.aof-pending` alone**. `TERMINAL_MOTION_CLASS.pulse` emits a bare `animate-pulse`
([palette.mjs:189-192](../../../../ui/src/terminal/palette.mjs#L189)) and it is applied unconditionally
([TerminalIdentity.tsx:119](../../../../ui/src/terminal/TerminalIdentity.tsx#L119)). **There is no
`motion-reduce:` variant and no CSS rule that silences it.** One pulsing dot on one card hid this; a
grid of a dozen will not.

**The rule:**

1. **The pulse must actually honour `prefers-reduced-motion`.** Either the reduce block at
   [index.css:112-116](../../../../ui/src/index.css#L112) grows to silence `animate-pulse` on this
   control's dots, or `TERMINAL_MOTION_CLASS.pulse` emits the motion-safe variant. **Which is the
   architect's; that it holds is this document's.**
2. **With motion reduced, `connecting` and `streaming` remain distinguishable by their WORD and their
   dot colour** — m46's rule 12, unchanged. **The pulse is never the only difference between two
   states.**
3. **The grid adds NO motion of its own.** No tile enter/exit transition, no reflow animation, no
   skeleton shimmer on the grid (the page's loading state is not `.aof-pending` — see §S1's states),
   and **the `needs input` mark never pulses.** Motion stays on exactly the two connection states it
   has always been on.

**Close condition.** R-A captured twice, once with `prefers-reduced-motion: reduce` forced: **no dot
animates, and every state is still distinguishable.** **`@uat`: the terminals home at reduced motion.**

### DG-49-7 — N per-pane live regions is a screen reader narrating the whole fleet

**Measured:** the state chip's span carries `aria-live="polite"`
([TerminalIdentity.tsx:117](../../../../ui/src/terminal/TerminalIdentity.tsx#L117)). It was built for one
pane and it is right for one pane. On a grid, a 5s poll plus a dozen sockets means a queue of polite
announcements from panes the user is not looking at, with no way to tell which tile spoke.

**The rule:**

1. **In the grid host, per-pane `aria-live` is OFF.** The chip still renders its word (signal 1 is
   untouched); it simply does not announce from N places.
2. **The grid owns ONE `aria-live="polite"` region**, and it announces three things and nothing else:
   - a change to the **focused** tile's connection state, named with its identity —
     *"aof → aof-wsl: streaming"*;
   - a session **appearing or leaving** the grid — *"session ended: aof → aof-wsl"*;
   - the **`needs input`** count changing — *"1 pane needs input"* at K = 1, and
     ***"`<K>` panes need input"*** above 1. <!-- PLURAL FORM WRITTEN OUT 2026-08-13 at the
     design-conformance re-judge (designer, on GAP-6). This clause supplied the CORRECT singular that
     §DG-49-3's summary template got wrong, and then left its own plural unwritten — so the one place
     in this document that had the count right was only half-specified. Covered by the pluralisation
     rule above the copy table. -->
3. **`polite`, never `assertive`.** Nothing here is an emergency, and interrupting a user mid-sentence
   for a state change on a tile they are not reading is worse than late news.
4. The **expanded** pane keeps m46's own behaviour unchanged — it is one pane, in a dialog, and the
   chip announces there as it always did.

**Close condition.** Judged at the `@uat` accessibility pass with a screen reader, against R-A and
R-D. **`@uat`: the terminals home does not narrate the whole fleet.**

### DG-49-8 — the `(session)` line renders one repo twice (m48's routed gap, discharged here)

m48/ADR-010 R4 held the behaviour deliberately and routed the decision to this DESIGN
([48/ARCHITECTURE ADR-010 R4](../48_milestone_fleet-session-identity/ARCHITECTURE.md);
[48/OUTCOME.md:85-89](../48_milestone_fleet-session-identity/OUTCOME.md#L85)). **Ruled in
§The `(session)` line — the dedupe rule, below.** The rule, its wording, its ordering and its
implementation obligations are there; this entry exists so the gap list is complete.

**Close condition.** R-G: a fleet node card with two live sessions in one repo. **`@uat`: a node with
two sessions in one repo says so once, and says how many.**

### DG-49-9 — `close` on this surface can only honestly mean "stop watching"

SPEC scopes *"focus, expand, close — keyboard and mouse both"*. **On this surface there is no honest
third meaning for close.**

- It cannot mean **end the session**: that is another machine's process, this surface has no route to
  it, and SPEC's own out-of-scope forbids widening the fleet face's write surface.
- It cannot mean **remove this tile from my grid**: a persistent hidden set is how an operator loses
  track of an agent, on the one screen built so they do not.
- An **`✕` that merely unsubscribes** is a third form for the subscribe/unsubscribe operation, and it
  is the exact form↔cost lie `affordanceFormViolations` refuses
  ([host-model.mjs:184-189](../../../../ui/src/terminal/host-model.mjs#L184)) — *a worded toggle means
  subscribe/unsubscribe; a chevron means layout only*.

**The rule: `close` resolves as `Hide terminal` — the existing worded toggle, at its existing cost
(`COST_SUBSCRIPTION`), with its existing label. The grid pane declares NO `close` affordance**, and its
`notDeclared` reason says so in terms (§S2's affordance table). **Layout persistence (SPEC) therefore
persists the WATCHED SET, never a hidden set.**

**The PO may overturn this**, and if `close` is meant to end a remote session that is a new write
route and a new security question — neither of which is in this milestone's scope today.

**Close condition.** R-D: no `✕` on any tile, and `Hide terminal` present on every subscribed one.
**`@uat`: nothing on the terminals home can kill an agent by accident.**

### DG-49-10 — the `unavailable` pane STILL has no producer, and this surface cannot be it

m46 shipped `unavailable` with no production producer and named milestone 49 as the producer
([46/DESIGN §DG-46-3](../46_milestone_terminal-control-unification/DESIGN.md)). **Measured at this
refine, that expectation is wrong (R):** the session index carries no `ref`, `provider` or board
origin, so it can only ever resolve against `mirror`; every `mirror` on this page dials the **fleet
origin, which is this page's own origin**; therefore neither `board unreachable` nor `no fleet origin`
can arise here, and `not checked out on this machine` is a statement about a workspace this surface
never asks about. The `origin` field on `/api/mesh/board-url` that a `local-pty` pane would need is
**still unbuilt** (RESEARCH §Q4).

**The rule: the grid renders NO `unavailable` pane, and it must not invent one.** In particular a node
that is stale, offline, or simply not connected to the relay is **not** `unavailable`: its socket opens
and is never fed, which is `no live output` (§DG-49-2) or `waiting`, depending on whether the wire says
a feeder can exist. **A build that maps roster staleness onto `unavailable` is a GAP** — it would send
an operator after an origin fault that is not there.

**DG-46-3's `@uat` row travels again**, to the milestone that builds a `local-pty` pane from a board
origin. **It is not deleted, and a reviewer must not log the absence of an `unavailable` render here
as a finding.**

---

## The connection ramp is UNCHANGED — and the two facts it deliberately does not carry

Nothing in the merged ramp moves: not a word, not a dot class, not a label class, not a motion rule.
[state-ramp.mjs:372-440](../../../../ui/src/terminal/state-ramp.mjs#L372) and
[46/DESIGN §The merged ramp](../46_milestone_terminal-control-unification/DESIGN.md) are the
authority, including CORRECTION 1's `streaming` word at `hsl(174 58% 52%)`
([palette.mjs:176](../../../../ui/src/terminal/palette.mjs#L176)).

**Two facts this surface needs are NOT connection facts, and neither becomes a state word:**

| Fact | Why it is not a state word | What carries it |
|---|---|---|
| **nothing will ever feed this pane** | it is a statement about a *producer*, not about the transport — the socket is fine | the V10 seam: chip **`no live output`**, pane line `no live output — no assignment is relaying this session` (§DG-49-2) |
| **this pane is not streaming because the grid is at its cap** | it is a statement about the *grid*, not about the pane — there is no connection to describe because there is no socket | the **unsubscribed rest state**: no chip at all, one centred line, the worded toggle (§DG-49-4) |

**And one fact is a second AXIS entirely** — agent state — which gets its own section below.

**The ramp's own reading at tile scale, unchanged and worth restating** so a reviewer does not
re-litigate it: `waiting` carries **no motion**
([state-ramp.mjs:391-401](../../../../ui/src/terminal/state-ramp.mjs#L391)), so an honest cold start can
never render as a spinner-forever; `ended` and `error` dim the pane and pay for their bar **out of the
byte area** ([TerminalByteArea.tsx:102-110](../../../../ui/src/terminal/TerminalByteArea.tsx#L102)), so a
tile's total height never changes when a stream stops; and `unknown` labels itself.

---

## Agent state is a SECOND AXIS — how it coexists with the connection ramp in one header

**Two axes, two forms, two positions, and they never compete:**

| | **Connection state** | **Agent state** |
|---|---|---|
| what it asserts | what the *browser* can observe on a socket | what the *worker* asserts about its agent |
| vocabulary | m46's seven + `unknown`, frozen | **one value: `needs input`** — the only one the product produces |
| form | dot + word (the state **chip**) | a **quiet pill carrying a word** — the `read-only` pill's form |
| position | the tile header's **status row** (row 2), leading | the tile header's **identity row** (row 1), after the `read-only` pill |
| motion | pulse on `connecting` and `streaming` **only** | **never** |
| when unknown | impossible — the ramp is total | **renders nothing at all** |
| producer | the socket | the assignment's `code` column, **one wire hop away** (§DG-49-3) |

**Why two rows rather than two chips in one row.** The grid tile's header is the narrowest host this
control has ever had — 294px of usable width at the floor track, against a dock header whose intrinsic
width is 451px ([palette.mjs:93-95](../../../../ui/src/terminal/palette.mjs#L93)). Putting identity,
posture, agent state, connection state and two controls on one row at that width guarantees a yield
cascade that eats the identity — the measured defect m46's G4 ruling exists to prevent. **Two declared
rows is not a wrap and not a fallback: it is the tile's fixed anatomy at every width** (§S2's
checklist), which is also what keeps every tile in a grid row exactly the same height.

**Why the pill and not a coloured dot.** Signal 1 is the word. A second dot beside the state dot would
be two dots of different meanings, 7px apart, distinguished by hue —
colour travelling alone, which rail 3 forbids.

**Why `needs input` and not `blocked`.** `needs-input` is the product's own word for the fact
(`src/mesh-worker-execution.mjs:90`, the assignment `code`); `blocked` is a judgement the producer
never makes and would collide with the ramp's `READS_BLOCKED` reading, which already means something
else ([state-ramp.mjs:89](../../../../ui/src/terminal/state-ramp.mjs#L89)).

---

## Read-only is a posture — on a surface that finally types

m46's rule stands verbatim: **the `read-only` label is mandatory, is TEXT, never yields, and carries
its explanatory `title`** ([input-policy.mjs:40-42](../../../../ui/src/terminal/input-policy.mjs#L40);
[46/DESIGN §Read-only is a posture](../46_milestone_terminal-control-unification/DESIGN.md)). What
changes here is that it is no longer on *every* mirror — so its presence now means something specific.

**The two postures on this surface:**

| Case | Posture | What renders |
|---|---|---|
| the ordinary grid tile | **`interactive`** | no pill; blinking block cursor ([input-policy.mjs:129-132](../../../../ui/src/terminal/input-policy.mjs#L129)); typing is one `Enter` away (§DG-49-5) |
| **the far end has no input route** | **`read-only`** | the **`read-only` pill**, mandatory, plus the non-blinking underline cursor |

**The read-only fallback is SPEC's requirement and it is not decorative.** When the fleet cannot
deliver input to a node — no push route configured, or the worker holds no stream connection — the
pane must say so rather than swallow keystrokes. Its pill carries a **second `title` string**, distinct
from the mirror's generic one:

> **`The fleet has no input route to <nodeId>: keystrokes would not arrive, so this pane cannot type.`**

**Two rules that make this safe rather than cosmetic:**

1. **The posture is declared from a producer-side fact, at mount, once** — never toggled while a
   session lives, because a posture change costs the SESSION
   ([host-model.mjs:287](../../../../ui/src/terminal/host-model.mjs#L287)). A tile that learns mid-life
   that input is impossible **does not flip**; it is a new pane the next time it binds.
2. **Read-only means read-only in fact** — `disableStdin: true`, no keystroke sink registered at all,
   no send path named ([input-policy.mjs:20-30](../../../../ui/src/terminal/input-policy.mjs#L20)). A
   read-only tile's `Enter` still expands (reading is the point), and the expanded pane carries the
   same pill.

**A read-only pane rendered without its label remains the highest-severity gap in this family**, for
m46's reason: the failure it permits — an operator believing a keystroke reached a worker — is the
failure the posture exists to prevent.

---

## Fit vs scale at tile size — what an operator is meant to read

**Unchanged rule:** fit ⇔ the source declares a resize control frame; scale otherwise
([geometry.mjs:71-74](../../../../ui/src/terminal/geometry.mjs#L71)). The grid mounts only `mirror`, so
**every tile scales, pinned 80×24, aspect preserved, anchored top-left, never cropped, never
re-wrapped**.

**What the operator reads at 0.47–0.59×: SHAPE, never words.** A prompt block, a diff, a spinner
region, a screen that is moving versus one that is frozen. **A reviewer must not log unreadable glyphs
in a tile as a defect** — that is m46's ruling for S2 at the same scale range, and it is why expand
exists.

**The tile's byte area is ASPECT-LOCKED to the screen it holds — `aspect-[640/408]` — so the letterbox
band is ≈0 by construction.** This changes **no geometry rule**: the scale is still
`min(box/intrinsic)` ([geometry.mjs:139-143](../../../../ui/src/terminal/geometry.mjs#L139)) and the band
is still whatever that leaves. It is a **host box** decision, which is the host's to make, and in a
grid it matters: N tiles each paying a band is N wasted rectangles on the one screen built for
density. **A sub-pixel residual band is expected; a visible one at any documented width is a GAP** —
**except in a BARRED pane**, where the non-live bar necessarily takes the box out of 640:408 and the
clause is unfalsifiable. <!-- EXCEPTION ADDED 2026-08-13 at the design-conformance re-judge
(designer). The reviewer could not falsify the clause in a barred tile: band and unpainted cells are
both `#0b0f14`, and the bar has legitimately changed the box's aspect, so "is that band a defect" has
no answer from a PNG. An unfalsifiable rule is worse than none — it invites a reviewer to log or
excuse the same pixels at will. -->

**And the bar is still paid for out of the byte area.** When a tile ends, the bar appears *inside* the
aspect-locked box ([TerminalByteArea.tsx:102-110](../../../../ui/src/terminal/TerminalByteArea.tsx#L102)),
the pane re-scales into the smaller box, and **the tile's total height does not move** — V11, and the
same `0.47 → 0.40` pair m46's mock derived for the fleet card. **A grid row whose tiles change height
when one of them ends is a GAP.**

**The floor below which a pane stops being worth rendering as a terminal at all.** One character cell
is 8×17px intrinsic; below **scale 0.25** (byte area narrower than **160px**) a cell is under 2×2 CSS
px and even the shape is gone. **The grid can never reach it** — its track floor of 320px puts the
worst case at 0.472 — and that is the point of stating it: if any future host would put a byte area
below 160px wide, it renders the **held** treatment's line instead of a terminal, never a smear.

---

## The `(session)` line — the dedupe rule, RULED

**The subject.** `fleetCurrentWorkLines` maps every unsubsumed session to its repo, filters blanks,
sorts, **and does not deduplicate**
([runs.mjs:99-106](../../../../ui/src/fleet/runs.mjs#L99)), so two live sessions in one repo render
`working · demo, demo (session)`. m48 held that deliberately and routed the decision here.

**THE RULE:** *deduplicate the repo names and carry the count where a repo holds more than one
session.*

```
working · demo ×2 (session)
working · aof, demo ×2 (session)
working · aof, demo (session)          ← unchanged: one session each
```

**Precisely enough to implement:**

1. Filter exactly as today — `workspaceHasRun !== true`, strict
   ([runs.mjs:100](../../../../ui/src/fleet/runs.mjs#L100)). **Unchanged.**
2. Map to `repo`, drop non-strings and empties. **Unchanged.**
3. **Group by the exact repo string and count.** Grouping is on the raw string — no trim, no
   case-folding, no normalisation. Two repos differing by case are two repos.
4. Sort the **distinct** repos ascending by plain codepoint comparison — the same
   locale-independent comparison the line already uses
   ([runs.mjs:103](../../../../ui/src/fleet/runs.mjs#L103)), for the same reason (the Rust surface sorts
   byte-wise).
5. Render each part as **`<repo>`** when its count is 1 and **`<repo> ×<count>`** when the count is
   greater than 1. The separator is a space before `×`; the multiplication sign is **U+00D7**, not the
   letter `x` — the same species of typographic character as the `·` (U+00B7) the line already
   carries.
6. Join with `", "`, and the line's frame is unchanged: `working · <parts> (session)`.
7. **OVERFLOW — the line is ONE line, and what yields is NAMES.**
   *(Rule R-2, rewritten at the design-conformance re-judge, 2026-08-13.
   **OPEN — RULED BUT UNBUILT, deferred past milestone 49.**)*
   - The line **never wraps and never grows the card.** The *"not one line per session"* argument
     below rejects N lines because *N lines grows a card unboundedly with sessions, and cards in an
     `auto-fill` grid stretch their whole row when one grows* — **a wrapping line reproduces that
     exact failure by another route**, so the argument that forbids the one forbids the other.
   - When the parts do not fit, **whole repo names yield from the tail** into a trailing
     **`+<N> more`**: `working · aof ×2, aof-test-repo, demo +4 more (session)`.
   - **A `×<n>` count is NEVER yielded, and the `(session)` frame is never yielded.** Yielding a count
     silently re-creates the under-count m48 was fixed to remove — one surface over, and invisibly.
   - **No repo name is ever broken across a line or clipped mid-word.** A name split at its own hyphen
     (`lark-guard-` / `portal`) reads as two repos: the same over-count lie in typographic disguise.
   - **The full value stays in `title`**, unchanged.

<!-- R-2's FIRST version (design-conformance pass 1) guarded the OPPOSITE hazard — a TRUNCATING line
yielding the count before the names, because truncation order would eat `(session)` then the last
repo's `×N`. Pass 2 measured the line and that premise is FALSE: at 760×520 it does not truncate at
all (`scrollWidth === clientWidth`, `overflow: visible`, `text-overflow: clip`, `white-space: normal`)
— it WRAPS, to three lines at seven repos, growing the card 173 → 212px. The guarantee is unchanged
(names yield, counts never do); the mechanism it must be written against is the reverse of the one
first assumed.

WHY STEP 7 IS DEFERRED, and it is not a slip: steps 1-6 CONFORM on screen (both R-G renders, six of
six). Step 7 needs genuinely new yield behaviour on a surface this milestone does not own, and the
Rust half must move in the SAME COMMIT — `session_repos()`/`current_work()` are pinned byte-for-byte
against the JS by `crossSurfaceDriftViolations` (see the implementation obligations below). The next
author meets the rule here and MUST NOT read the shipped wrap as the design. -->

**Why `×2` and not each of the four alternatives m48 listed:**

- **not bare dedupe (`demo`)** — it asserts one session where there are two. m48's entire arc made
  sessions individually addressable; under-counting them on the summary line is the same class of
  lie, one surface over.
- **not one line per session** — the node card's current-work line is a one-line summary in a row
  whose width is already budgeted to a measured floor of **286px**
  ([assign-affordance.mjs:268](../../../../ui/src/fleet/assign-affordance.mjs#L268)); N lines grows a card
  unboundedly with sessions, and cards in an `auto-fill` grid stretch their whole row when one grows.
- **not repo + assistant (`demo (claude)`)** — it names a *tool* where the operator asked what work
  the machine is doing, and it still duplicates for two Claude sessions in one repo.
- **and enumeration now has a proper home** — this milestone's own grid. One fact, one home: the node
  card summarises, the terminals home enumerates.

**Implementation obligations, inherited from RESEARCH §Q5 and stated so nobody discovers them:** the
line has **two implementations** — `fleetCurrentWorkLines` and Rust `session_repos()`/`current_work()`
(`app/desktop/crates/core/src/status.rs:119-128`, `view_model.rs:200-210`) — pinned byte-for-byte by
`crossSurfaceDriftViolations` (`test/arch/acd-captured-producer-fixture.test.mjs:176-197`). They change
**in one commit**, with a **captured Rust fixture that actually exercises two-sessions-one-repo**
(none of the four existing fixtures does), and with the JS pin
`test/mesh-fleet-session-subsumption-render.test.mjs:115-127` row 6 and its rule assertion at
`:143-148` both updated **deliberately** — that assertion (`parts === sessions.length`) is *designed*
to fail on this change, which is how it forces the decision to be made here rather than by accident.
**The mechanism is the architect's; the wording above is this document's.**

---

## The focus model

The grid is **keyboard and mouse both**, N panes deep, re-rendered every 5s
([Fleet.tsx:462](../../../../ui/src/fleet/Fleet.tsx#L462)). Three properties have to hold at once: a
keyboard user must reach any pane without traversing hundreds of stops, focus must survive a poll, and
**an interactive pane claims `Escape`**.

**1 · One roving stop per TILE.** Exactly one tile is in the page tab order (`tabindex="0"`); every
other tile is `tabindex="-1"`. **A grid of 12 tiles is one tab stop, not forty.**

**2 · Arrows move between tiles, by grid geometry.** `←/→` previous/next in reading order; `↑/↓` by
column; `Home`/`End` first/last. Movement is by **rendered position**, so it matches what the operator
sees at that width.

**3 · `Enter` opens the pane** — the fullscreen occupant, focus **inside** the terminal (§DG-49-5).
The mouse equivalents are the `⤢` control and a click into the byte area.

**4 · `Tab` reaches the focused tile's own controls** (expand, then the worded toggle) in DOM order,
and `Tab` past the last one leaves the grid entirely. `Shift+Tab` is symmetric. **No tile's xterm is
ever a tab stop, inline.**

**5 · The focus indicator is the house ring** — `--color-ring`
([index.css:23](../../../../ui/src/index.css#L23)) — drawn on the **tile's frame**, unmistakable at a
glance across a grid, and never removed without replacement. The focused tile is additionally the only
tile whose state changes are announced (§DG-49-7).

**The ring's two offsets, and why they differ.** On the **tile** the ring is drawn OUTWARD
(`outline-offset: +2px`) — the tile has 16px of `gap-4` and ≥16px of container padding around it, so
nothing can clip it, and an outward ring reads as a frame around the whole pane. On the **expanded
pane's byte area** it is drawn INWARD (`outline-offset: -2px`), because the box meets the viewport
edge and an outward ring would be clipped to invisibility. **Same token, same 2px width, opposite
sign, for a stated geometric reason** — a reviewer must not log the sign as a divergence.
<!-- ADDED 2026-08-13 at the design-conformance re-judge (designer, closing GAP-2). The inward value
came from `mocks/BASELINE.md` §S3, which was this document's only source for the expanded pane's ring
and which DESIGN was silent on; the build matched it exactly. Recorded here so the mock's one
contribution to this region survives the mock. -->

**6 · Focus survives the poll, because it is stored as a PANE KEY and not an index.** The pane key is
the control's own — `terminalPaneKey(source, params)`
([pane-identity.mjs:55-67](../../../../ui/src/terminal/pane-identity.mjs#L55)) — which is also the tile's
render key. A poll that adds, removes or re-orders entries leaves focus **on the same session**.
Storing an index or a position is the defect this rule exists to prevent: a tile arriving above the
focused one would silently move focus to a different agent.

**7 · The grid NEVER re-sorts itself.** Order is deterministic and stable — **`nodeId`, then `repo`,
then `sessionId`, ascending, plain codepoint comparison** (the same comparison
[runs.mjs:103](../../../../ui/src/fleet/runs.mjs#L103) uses, for the same locale-independence reason).
**Order never keys on connection state, on agent state, or on recency** — those change every few
seconds, and a tile that moves under the cursor while an operator is reaching for it is a worse
failure than a mark that waits to be noticed. (This is also why `needs input` is a mark plus a count
rather than a promotion to the top.)

**8 · A tile that is holding output is never removed by a poll.** If a session leaves the index while
its pane holds bytes, the tile **stays**, transitions to `ended` (dimmed, with its bar), and is removed
only when the operator hides it or reloads. A pane the operator was reading must not vanish because a
5s refresh said so. If the focused tile is removed anyway (it held no bytes), focus moves to the
nearest surviving tile in grid order and the grid's live region says which session went.

**9 · `Escape` belongs to the far end, and the way out is always visible.** Inside the expanded pane
`Escape` is a live keystroke for the TUI (m46/[Build-2]), so the exit control is **always visible,
never hover-revealed, never fading** ([host-model.mjs:128-131](../../../../ui/src/terminal/host-model.mjs#L128)),
and dismissal returns focus **to the opener — the tile**, restoring the roving stop. On the grid
itself, `Escape` does nothing: no tile is a modal, and a key that sometimes closes a pane and sometimes
types into one is the ambiguity this clause removes.

---

## Surfaces

### S1 — the terminals home at `/`

- **Committed mock:** [`mocks/s1-terminals-home.png`](mocks/s1-terminals-home.png) — **PENDING,
  operator-supplied.** Until it lands, the checklist below **is** the baseline.
- **Host:** the shell's content region, **`content:fixed`** — inherited, not invented:
  [45/DESIGN](../45_milestone_ui-app-shell-routing/DESIGN.md) names *"the board, and (m49) the
  terminals grid"* and binds *"a surface that hosts a terminal must be `content:fixed`"*. Today
  `landing` is `content:page` ([shell-layout.mjs:527](../../../../ui/src/app/shell-layout.mjs#L527));
  **that one row changes and the shell does not.**
- **The page's own chrome is ONE contribution and no bar of its own.** The shell already owns the top
  bar, the surface bar and the overlay ([shell-layout.mjs:55-61](../../../../ui/src/app/shell-layout.mjs#L55)).
  The page contributes exactly one node to the **surface slot**, which the shell places in the top bar
  at ≥1024 and in the 40px surface bar at ≤1023
  ([shell-layout.mjs:114-127](../../../../ui/src/app/shell-layout.mjs#L114)). **A second bar is a GAP, not
  a variant.**

#### Binding checklist (mandatory — this IS the baseline until `mocks/s1-terminals-home.png` lands)

**Layout regions, in order, and who owns scroll in each:**

| # | Region | Height | Scroll owner |
|---|---|---|---|
| **G0** | **The surface-slot summary** — lives in the shell's chrome, not in this box | the shell's (48px top bar / 40px surface bar) | none |
| **G1** | **The page heading** — one `<h1>`, `Live terminals`, **`sr-only`** | 0 visible | none |
| **G2** | **The grid** — `repeat(auto-fill, minmax(320px,1fr))`, `gap-4`, inside the fleet's own container (`px-4 py-7 sm:px-8`, `max-w-[1240px]`) | `min-h-0 flex-1` | **the grid, and nothing else on the page** (`overflow-y-auto`) |
| **G3** | **The page state** — replaces G2 entirely: empty (E1/E2), loading, or failed | content | none |

**Components each region holds:**

- **G0** — one line, `text-[11px]`, muted: **`<N> sessions · <M> live`**, plus
  **`· <K> needs input`** at K = 1 / **`· <K> need input`** above 1, only when `K > 0`. **Every count
  pluralises by its own value** (§The copy this milestone adds — the pluralisation rule). No dot, no
  motion, no colour beyond the text ramp. It is a summary, never a control.
  <!-- PLURALISED HERE TOO 2026-08-13 at the design-conformance re-judge (designer). §DG-49-3's
  correction fixed ITS OWN template and left this one — the binding checklist's copy of the same
  string, which is the copy a builder actually implements from — still reading `<K> need input`
  unconditionally. One string, two homes in this document, and only one of them was corrected. -->

  **R-3 — G0 RENDERS COUNTS ONLY WHEN IT HOLDS A PAYLOAD.** Before the first fetch, and while the
  last fetch failed, the slot renders **nothing at all**: not `0`, not `—`, not a skeleton, not a
  stale count.
  - **This closes a SILENCE in this document, not a build that contradicted it.** Both this clause
    and `mocks/BASELINE.md` §S1's summary row described only the populated case, so the deployed
    build rendering `0 sessions · 0 live` above `Could not load the mesh` — and above
    `Loading sessions…` — followed the letter of a rule that had not been written. **The developer is
    owed that distinction** and it is recorded deliberately.
  - **E1 and E2 KEEP their counts — the fetch returned and zero is the true answer.** <!-- Clause added
    at aof:verify 49 by the verify session, in the designer's own words and at its request: it ruled
    this when asked whether R-3 should extend to E1/E2, and declined, but had no Edit tool to land the
    sentence in a 1338-line document without risking transcription drift. The four reasons are in
    DESIGN-CONFORMANCE-49.md §2b; the load-bearing one is that R-3's trigger is EPISTEMIC, not
    cosmetic — extend it and an empty slot stops meaning "no payload" and starts meaning "either no
    payload or zero", which is the exact ambiguity this milestone spent ten design gaps refusing. -->
  - **Why nothing, rather than a zero.** On THIS surface `0 sessions` is not a neutral placeholder —
    it is E1's entire message — so rendering it from an absence of data is §DG-49-1's lie one region
    up: true of the variable, false about the world. The slot is a summary and never a control, so an
    empty slot costs the operator nothing and a wrong count costs them a search.
  - **This is also the whole answer to the SILENT RE-POLL FAILURE** (story 04's routed gap). The grid
    keeps last-known content and surfaces nothing — that is ruled below under the loading state and
    it does not change. The one thing that genuinely goes stale is the **poll-derived count**, and it
    is suppressed *here*, by this rule, in one place — not by a staleness marker threaded through a
    fetch branch. **If a staleness treatment is ever wanted, this is the region that owns it.**
- **G1** — the one `<h1>` on the page, `sr-only`. It stays because m45 fixed *"the ONE `h1` on the
  page"* ([Landing.tsx:37](../../../../ui/src/app/Landing.tsx#L37)); it goes visually silent because the
  grid is its own title and a 432px content box cannot spend a row on saying so.
- **G2** — one **S2 tile per addressable session**, keyed and ordered by §The focus model rules 6–7.
  Nothing else: no per-tile wrapper card, no group headers, no node dividers. *(Grouping by node is
  §Open questions 3.)*
- **G3** — exactly one of the four page states below. Never two, never a state plus a partial grid.

**States (empty / loading / error / populated):**

- **empty ≡ TWO STATES, and both are ordinary** (§DG-49-1):
  - **E1** — no sessions and no runs: `Nothing is running.` / `Assign work from the fleet.` /
    `Open the fleet →`.
  - **E2** — runs in flight, nothing reporting: `<N> runs in flight · no session is reporting a
    terminal.` (singular at N = 1: `1 run in flight · …`) / the why-line / `Open the fleet →`.
  - Both in the house's dashed empty card ([Fleet.tsx:910](../../../../ui/src/fleet/Fleet.tsx#L910)).
    **Never red, never a spinner, never a skeleton.**
- **loading ≡ the FIRST fetch only.** A muted centred line, `Loading sessions…`, in the same card.
  **A subsequent poll never re-enters this state** — the grid keeps rendering what it has, because
  blanking a screen of live terminals every 5s is a worse failure than a 5s-old count. **No shimmer**
  (§DG-49-6 clause 3). **A poll that FAILS is the same fact arriving by another route and is treated
  identically: keep last-known, surface nothing on the grid** (see R-3 at G0 for the count).
- **error ≡ the payload failed.** The fleet page's own failed-state treatment, reused, naming the
  fault. **A payload error never turns tiles into `error` panes** — the sockets are independent of
  the poll, and a pane that is streaming keeps streaming while the metadata fetch is broken. That
  distinction is the honest one and a build that conflates them is a GAP.
  **R-4 — the cause segment names the fault in the OPERATOR's domain.** The frame is
  `Could not load the mesh: <cause>` plus exactly one recovery control. The `<cause>` names what was
  unreachable, refused or busy, and preserves any diagnostic code in parentheses — as the shipped
  `the mesh store is unreachable (EBUSY)` branch already does. **A raw platform or browser exception
  message is never surfaced as the cause:** `fetch failed` is the browser's word for its own
  operation, it restates the frame (*"could not load … because loading failed"*), and it points at no
  fault an operator can act on. A refused connection reads as the daemon not answering.
  <!-- RULED 2026-08-13 at the design-conformance re-judge (designer), closing routed finding
  F-49-04-a, which asked whether `Could not load the mesh: fetch failed` names the fault well enough.
  The FRAME does and is kept; the cause segment does not. The bar is set by this same frame's own
  EBUSY branch, which is already shipping — so this is a copy-mapping gap in the branches that fall
  short, not a new treatment to design. -->
- **populated ≡ the grid.** Tiles at their declared reflow (§Render breakpoints). The page itself
  never scrolls; **G2 does**.
- **ALL FOUR STATES SHARE ONE TOP ANCHOR.** G3 is one region and its occupants replace each other in
  it: every page state's box begins at the content container's own padding edge (the 48px bar plus
  the container's `py-7`). **The state an operator meets under stress does not sit lower on the page
  than the three they meet calm.** The failed state may keep the fleet treatment's own **width**; it
  does not get its own **anchor**.
  **OPEN — RULED BUT UNBUILT, deferred past milestone 49** (design-conformance re-judge, GAP-4r). The
  deployed build top-anchors all four, so the original gap — the failed state *centred* against three
  top-anchored siblings — is closed; it still starts that state ~42px below the other three. Ruled
  here so the next author does not read the offset as intentional.

**Design ramp:** the **light** shell ramp for G0–G3 (the page is not dark — §Open questions 6), and
the terminal ramp inside each tile. **No token, colour, size or glyph on this surface is new.**

---

### S2 — the grid pane (the control's FOURTH host)

- **Committed mock:** [`mocks/s2-grid-pane.png`](mocks/s2-grid-pane.png) — **PENDING,
  operator-supplied.** Until it lands, the checklist below **is** the baseline, **on top of**
  [46/mocks/CONFORMANCE.md](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md), which
  binds every region this host inherits.
- **Host name:** `grid-pane`, a fourth member of
  [host-model.mjs:38-41](../../../../ui/src/terminal/host-model.mjs#L38)'s frozen list.
- **Declares:** `posture: interactive` · `source: mirror` (only) · fullscreen **on** · Watch/Hide
  **on**. Everything else **off, with a reason**.

#### The affordance table — and every absence carries its reason

Written in the `notDeclared("…")` discipline
([host-model.mjs:93-95](../../../../ui/src/terminal/host-model.mjs#L93)) so a reviewer can tell a design
decision from an omission.

| Affordance | Declared | Form · cost | Reason (verbatim intent for the table) |
|---|---|---|---|
| `watch-hide` | **yes** | worded toggle · `subscription` | the grid's live-socket budget is a subscription budget, and this is the product's existing word for spending it — `Watch terminal →` / `Hide terminal`, unchanged |
| `fullscreen` | **yes** | icon control · `layout` | the tile is a picture at 0.47–0.59×; **expand is where the words are**, and it is also how the keyboard enters a pane |
| `collapse` | no | — | *"a tile's box belongs to the grid track — a collapsed tile leaves a hole in a uniform grid, and the affordance for wanting more of one pane is EXPAND"* |
| `close` | no | — | *"this host cannot end another machine's session, and an `✕` that merely unsubscribes is a second form for the worded toggle's job — SPEC's `close` resolves as Hide"* (§DG-49-9) |
| `drag-resize` | no | — | *"the tile's width is the grid track's; resizing one tile reflows every sibling in its row"* — the fleet card's reason, one grid over |
| `restart` | no | — | *"this host cannot re-spawn another machine's PTY"* — verbatim from the fleet card, and doubly true for a session it never started |
| `provider-picker` | no | — | *"there is nothing to pick — the session already exists, on another machine"* — verbatim |
| `exit-fullscreen` | no | — | *"only the fullscreen host offers its own exit"* — verbatim |

**Eight of eight named. No ninth affordance is invented.**

**AND TWO OF THEM ARE WITHHELD PER-PANE, not just per-host.** A declared affordance is still absent on
a pane that cannot honour it, and both cases are already ruled elsewhere in this document:

| pane | `watch-hide` | `fullscreen` | ruled at |
|---|---|---|---|
| **held, at the cap** | **absent** — there is no slot to spend | **absent** — there is no pane to present | §DG-49-4, §S3 |
| **never-fed (`no live output`)** | **absent** — no socket was opened, so there is no subscription to release | **absent** — there is nothing to present | §DG-49-2 |

**The generalisation, stated once: a worded toggle is offered iff there is a subscription to spend or
release, and expand iff there is a pane to present.** A control that cannot do its job is **absent,
not disabled** — offering it names a capability this surface does not have, which is the same species
of lie as a pane misreporting its far end.
<!-- ADDED 2026-08-13 at the design-conformance re-judge (designer), folding in rule R-1 and closing
GAP-1 — the highest-severity gap of the first pass. The build offered `Hide terminal` on the
never-fed pane because this table declared `watch-hide` for the HOST and no clause said a pane could
withhold it; §DG-49-4 stated the withholding for the held tile only, four sections away. Two cases,
one rule, now stated where the affordances are declared. -->

#### Binding checklist (mandatory — this IS the baseline until `mocks/s2-grid-pane.png` lands)

**Layout regions, in order, and who owns scroll in each:**

| # | Region | Height | Scroll owner |
|---|---|---|---|
| **T0** | **The tile frame** — `rounded-md border border-[#1e2a44] bg-[#0f1629] text-zinc-200`, the control's own non-dock frame ([TerminalControl.tsx:760](../../../../ui/src/terminal/TerminalControl.tsx#L760)), plus the focus ring on the frame | header + byte box | none |
| **C1a** | **Identity row** — `px-3 py-1.5`, **one line, never wraps, never merges with C1b** | content | none |
| **C1b** | **Status row** — `px-3 pb-1.5`, one line, never wraps | content | none |
| **C2** | **Byte area** — the aspect-locked box, `aspect-[640/408]`, framed `mx-2 mb-2 rounded` ([palette.mjs:74](../../../../ui/src/terminal/palette.mjs#L74)) | derived from the track width | **xterm's own scrollback, and nothing else** |
| **C3** | **Non-live bar** — inside C2's box, **paid for out of it** | content (≈29px) | none |
| **C4** | **The input region: THERE IS NONE**, in either posture | 0 | — |

**Components each region holds:**

- **C1a**, left → right: **`▣`** (the lockup glyph; the word `TERMINAL` is already dropped at this
  width by the existing container query, [palette.mjs:97](../../../../ui/src/terminal/palette.mjs#L97)) ·
  **identity** `<owner> → <nodeId>`, `mono text-[11px] text-zinc-400`, `min-w-0 truncate`, full value
  in `title` · **`read-only` pill** when the posture is read-only, `shrink-0`, with its `title` ·
  **`needs input` pill** when asserted, `shrink-0`. **No controls in this row.**
- **C1b**, left → right: **the state chip** (dot + word, [palette.mjs:154](../../../../ui/src/terminal/palette.mjs#L154)'s
  7px dot, `text-[11px]`) — **absent entirely when the tile is unsubscribed** · **`·`** · **the repo**,
  `mono text-[11px] text-zinc-500`, **only when the repo is not already the owner** · `ml-auto`
  **expand `⤢`** (28×28, [TerminalControl.tsx:144](../../../../ui/src/terminal/TerminalControl.tsx#L144)) ·
  **the worded toggle** (`Watch terminal →` / `Hide terminal`). **Both controls are withheld on a pane
  that cannot honour them** — see the affordance table's per-pane rows.
- **C2** — exactly one xterm host at 80×24, **scaled**, anchored top-left, `tabindex="-1"`. Or, for a
  pane with no terminal, exactly one of: the **`no live output`** top-left line (§DG-49-2), or the
  **held** centred line (§DG-49-4). **Never a dashed `unavailable` block** (§DG-49-10).
- **C3** — zero or one bar, `role="status"`, never two.

**THE IDENTITY LINE, source-shaped and fixed here** (V1 is satisfied without inventing an owner):

| Session | owner | far end | tail (`detail`) | repo shown in C1b |
|---|---|---|---|---|
| has a work item | **the work-item `ref`** | `nodeId` | `session <id>` | **yes** |
| free (no work item) | **the `repo`** | `nodeId` | `session <id>` | **no — it is already the owner** |

The tail is the **first thing to yield**, dropped whole with its separator, by the existing rule
([palette.mjs:96](../../../../ui/src/terminal/palette.mjs#L96)); at every grid width it is already
dropped. **The owner ref, both pills, the state chip and the controls never yield.** When the identity
still cannot fit, **the identity truncates** — authorised here for the same reason m46's G4 ruling
authorised it for a far-end identity: it is long, variable, and carries its whole value in `title`.

**Reading order, binding, and it is m46's with two insertions:**
**identity > `read-only` > `needs input` > state > repo > expand > toggle.** Nothing in either header
row carries weight above the identity line except the `▣` lockup and the two pills, which are
`font-semibold` as they ship.

**States (empty / loading / error / populated):**

- **empty ≡ HELD — the tile is listed and not streaming, and it is NOT an error** (§DG-49-4).
  No state chip. C2 holds one centred `mono text-xs text-zinc-400` line: **`not streaming`** (a live
  slot is free — the toggle reads `Watch terminal →`), or
  **`not streaming — <N> live panes already · hide one to watch this`** (at the cap — **no toggle**).
- **loading ≡ TWO SUB-CASES, and they must look different** (m46, unchanged):
  - `connecting` — pulsing `bg-secondary` dot, `connecting…`, C2 empty, **no line**;
  - `waiting` — `bg-muted-foreground`, **no motion**, chip `waiting for output`, C2's top-left line
    `connected · waiting for first output` ([state-ramp.mjs:129](../../../../ui/src/terminal/state-ramp.mjs#L129)).
- **error ≡ `error`** — `bg-destructive` dot, chip `error`, **the cause line is mandatory** in the C3
  bar, pane dimmed `opacity-60`. Plus **`ended` with a non-zero exit code** (`exited (N)`), on the same
  failure ramp. **`unavailable` is not in this bucket and does not occur here** (§DG-49-10).
- **populated ≡ `streaming`** — pulsing `bg-primary` dot, the word in `hsl(174 58% 52%)`, C2 full and
  undimmed, no bar. Plus **`ended`** — C2 dimmed with the bar reading `stream ended` / `exited (0)`,
  **at unchanged tile height**.
- **plus `no live output`** — the never-fed pane (§DG-49-2): chip `no live output`, C2's top-left line,
  no socket, no motion, nothing red, **and neither header control**.

**Design ramp:** §The design ramp. **No token, colour, size or glyph on this surface is new.**

---

### S3 — expand: the shell's existing fullscreen occupant, opened from a tile

- **Committed mock:** [`mocks/s3-expanded-pane.png`](mocks/s3-expanded-pane.png) — **PENDING,
  operator-supplied.** Until it lands, **[46/DESIGN §S3](../46_milestone_terminal-control-unification/DESIGN.md)
  and [46/mocks/CONFORMANCE.md §2·S3](../46_milestone_terminal-control-unification/mocks/CONFORMANCE.md)
  are the baseline**, plus the three deltas below.
- **Host:** unchanged — the shell's `shell:fullscreen` slot, rung `z-50`, its only occupant, reached
  through `requestFullscreen({ id, label, node, home, opener, claimsEscape, onLayout })`
  ([shell-bus.mjs:147-157](../../../../ui/src/app/shell-bus.mjs#L147)).

**THIS SURFACE IS NOT REDESIGNED.** Its regions, its header composition, its geometry, its in-flow
bar, its `role="dialog"` + `aria-modal`, its always-visible exit control and its focus return are
m46's, verbatim. **Exactly three things differ when the opener is a grid pane**, and each follows from
one fact:

| # | Delta | Why |
|---|---|---|
| **1** | **The occupant is INTERACTIVE, so it CLAIMS `Escape`** — and on this surface that is the ordinary case rather than the exception | the tile's posture is `interactive` (§DG-49-5), and posture is the opener's. Consequence, binding and inherited: **the visible exit control is the ONLY exit and is therefore always visible** ([host-model.mjs:128-131](../../../../ui/src/terminal/host-model.mjs#L128)) |
| **2** | **Focus presents INSIDE the terminal**, not on the exit control — and it carries the house ring at `outline-offset: -2px` (§The focus model 5) | the operator opened it *to type* (§DG-49-5 rule 3). A read-only opener (the fleet card, or a read-only tile) still presents focus on the exit control — there is nothing to type into |
| **3** | **Dismissal returns focus to the TILE**, restoring the grid's roving stop — not to a button inside the tile | the opener on this surface is the tile itself (§The focus model rules 1 and 9), and returning focus to a control the operator never pressed loses their place in the grid |

**And two things a reviewer must confirm are UNCHANGED**, because they are what makes expand feel like
the same pane: **one xterm, one socket, through both transitions** (the shell adopts the live node —
presenting must not re-subscribe, and an empty pane on present is the visible tell that this broke),
and **the letterbox band returns** here (the tile had none by construction; the overlay's aspect is the
viewport's). **Its magnitude is a review-time measurement, never a pinned number** — m46's FLAG-2
lesson.

#### Binding checklist

Identical to [46/DESIGN §S3's checklist](../46_milestone_terminal-control-unification/DESIGN.md) —
regions C0/C1/C2/C3, the same identity fragment, the same always-visible `Minimize2` at `ml-auto`,
scroll owned by xterm alone — **with the three deltas above**, and with the tile's own additions
carried into the header: **the `needs input` pill travels with the identity** (it is a fact about this
session, not about the host), and **the `read-only` pill travels as it always did**.

**States:** identical to the tile that opened it — the overlay renders the **same** descriptor from
the **same** instance. **A pane that has nothing to present cannot be expanded**, so its expand
control is absent: a **held** tile while it is unsubscribed, and a **never-fed** tile, which opens no
socket at all (§DG-49-2, and the per-pane rows in §S2's affordance table).

---

## The design ramp — every value read at source, none invented

| Element | Value | Read at |
|---|---|---|
| **Byte viewport** | `#0b0f14` | [palette.mjs:23](../../../../ui/src/terminal/palette.mjs#L23), [:41](../../../../ui/src/terminal/palette.mjs#L41) |
| **Chrome (tile header + non-live bar)** | `#0f1629` | [palette.mjs:25](../../../../ui/src/terminal/palette.mjs#L25), [:42](../../../../ui/src/terminal/palette.mjs#L42) |
| **Tile border / dividers / pill outlines** | `#1e2a44` | [palette.mjs:27](../../../../ui/src/terminal/palette.mjs#L27), [:43](../../../../ui/src/terminal/palette.mjs#L43) |
| **Terminal foreground** | `#d7dde3` | [palette.mjs:31](../../../../ui/src/terminal/palette.mjs#L31) |
| **Text steps** | `text-zinc-200` body · `text-zinc-300` lockup/resolved · `text-zinc-400` quiet, controls, muted states, **and every cause/recovery line** · `text-zinc-500` field labels **only** · `text-zinc-100` hover only | [palette.mjs:51](../../../../ui/src/terminal/palette.mjs#L51), [:61](../../../../ui/src/terminal/palette.mjs#L61), [:156](../../../../ui/src/terminal/palette.mjs#L156); [TerminalByteArea.tsx:74-77](../../../../ui/src/terminal/TerminalByteArea.tsx#L74) |
| **State dots** | `bg-muted-foreground` · `bg-secondary` · `bg-primary` · `bg-destructive`, at **7px** | [palette.mjs:140-143](../../../../ui/src/terminal/palette.mjs#L140), [:154](../../../../ui/src/terminal/palette.mjs#L154) |
| **State words** | `text-zinc-400` · `text-red-400` · `streaming` at **`text-[hsl(174_58%_52%)]`** (m46 CORRECTION 1, a measured AA fix — 9.06:1 on `#0f1629`) | [palette.mjs:156-177](../../../../ui/src/terminal/palette.mjs#L156) |
| **Pills** (`read-only` **and** `needs input`) | `rounded border border-[#1e2a44] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400` | [palette.mjs:55-56](../../../../ui/src/terminal/palette.mjs#L55) |
| **Lockup** | `text-[11px] font-semibold tracking-[0.1em] text-zinc-300` | [palette.mjs:61](../../../../ui/src/terminal/palette.mjs#L61) |
| **Terminal type** | `var(--font-mono, …)` at **13px / 17px line height** → an 8×17px cell → an **exactly 640×408** screen at 80×24 | [palette.mjs:67-70](../../../../ui/src/terminal/palette.mjs#L67); [source-table.mjs:48-49](../../../../ui/src/terminal/source-table.mjs#L48) |
| **Byte-area frame** | `mx-2 mb-2 rounded` (an 8px gutter, 4px radius) | [palette.mjs:74](../../../../ui/src/terminal/palette.mjs#L74) |
| **Header yield thresholds** | container queries on the header: tail `@xl` (≥576) · lockup word `@lg` (≥512) · field labels `@md` (≥448) — **all three already engaged at every grid width** | [palette.mjs:96-106](../../../../ui/src/terminal/palette.mjs#L96) |
| **Control hit target** | `h-7 w-7` = **28px**, ≥24px by padding | [TerminalControl.tsx:144](../../../../ui/src/terminal/TerminalControl.tsx#L144) |
| **Motion** | `animate-pulse` on `connecting` and `streaming` **only**; every other state emits the **empty string** | [palette.mjs:189-192](../../../../ui/src/terminal/palette.mjs#L189) |
| **Grid track / gap** | `repeat(auto-fill, minmax(320px, 1fr))`, `gap-4` | [Fleet.tsx:914](../../../../ui/src/fleet/Fleet.tsx#L914) |
| **Page container** | `px-4 py-7 sm:px-8` inside `mx-auto max-w-[1240px]` | [Fleet.tsx:841-842](../../../../ui/src/fleet/Fleet.tsx#L841) |
| **Empty-state card** | `rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground` | [Fleet.tsx:910](../../../../ui/src/fleet/Fleet.tsx#L910) |
| **Focus ring** | `--color-ring` = `hsl(174 72% 27%)` = **`rgb(19,118,109)`** = `#13766d`. **2px solid**, `outline-offset: +2px` on a tile frame and **`-2px`** on the expanded byte area (§The focus model 5) | [index.css:23](../../../../ui/src/index.css#L23) |
| **Radius** | `--radius: 0.5rem` | [index.css:24](../../../../ui/src/index.css#L24) |
| **Z rungs** | fullscreen `z-50`, alone | [shell-layout.mjs:792-797](../../../../ui/src/app/shell-layout.mjs#L792) |
| **Chrome height / content floor** | 48 + 40 = 88px; content floor **432px** at 760×520 | [shell-layout.mjs:66-67](../../../../ui/src/app/shell-layout.mjs#L66), [:163-165](../../../../ui/src/app/shell-layout.mjs#L163) |
| **Poll cadence** | **5000ms**, whole payload | [assign-affordance.mjs:54](../../../../ui/src/fleet/assign-affordance.mjs#L54); [Fleet.tsx:462](../../../../ui/src/fleet/Fleet.tsx#L462) |
| **Mono advance at 11px** | **6.048px/char** (measured 2026-08-12 against the shipped stylesheet) | [assign-affordance.mjs:272](../../../../ui/src/fleet/assign-affordance.mjs#L272) |

**Not one value in this table is new.** The only additions this milestone makes are **copy strings**,
listed and justified next.

### The copy this milestone adds — every new string, in one table

**BINDING ON EVERY STRING BELOW, AND ON EVERY INTERPOLATED COUNT ANYWHERE ON THIS SURFACE: a count
pluralises by its own value.** `1 session`, `2 sessions`; `1 run in flight`, `3 runs in flight`;
`1 needs input`, `2 need input`. **Stated here, once, above the table — because the last attempt to
state it failed by being stated somewhere else.**

<!-- RESTATED AND RE-SCOPED 2026-08-13 at the design-conformance RE-JUDGE (designer, on GAP-6). The
rule was first written into §DG-49-3's own correction as "EVERY COUNT IN THE SUMMARY pluralises by
its own value" — scoped to one component. The build fixed that one component, correctly, and went on
rendering `1 runs in flight` from K3 ON THE SAME SCREEN, because K3 was never in the correction's
blast radius. THE DEFECT IS A PROPERTY OF EVERY INTERPOLATED COUNT AND WAS RULED AS A PROPERTY OF ONE
LINE. It now lives above the copy table, where the next author of a count string is already working,
and the sweep below makes it checkable instead of remembered. -->

**The sweep — every interpolated count this milestone renders, with its singular case.**

| # | string | singular case | status |
|---|---|---|---|
| **K3** | `<N> runs in flight · …` | **`1 run in flight · …`** | **amended below** |
| **G0** | `<N> sessions · <M> live · <K> needs input` | `1 session · 1 live · 1 needs input` | shipped |
| **K8** | `not streaming — <N> live panes already · …` | `1 live pane already` | **covered by the rule; NO code change owed today** — unreachable while `MAX_LIVE_PANES` = 16, since the line renders only *at* the cap. Reachable only if the cap is ever configured to 1, and the rule is written so that day is uneventful |
| **§DG-49-7** live region | `1 pane needs input` / `<K> panes need input` | `1 pane needs input` | plural form now written out at §DG-49-7; it was previously unwritten |
| **K12** | `working · <repo> ×<n> (session)` | — | **immune by construction** — `×<n>` renders only at n > 1. **This is the shape the others should copy: where a count can be omitted at 1, omit it** |

**A new count string is not done until its singular case is written down.**

| # | Where | String | Why it is not an existing string |
|---|---|---|---|
| K1 | S1 · E1 line 1 | **`Nothing is running.`** | the honest whole-fleet fact when there are no sessions *and* no runs |
| K2 | S1 · E1 line 2 | **`Assign work from the fleet.`** | names the one place the operator can act; no command is claimed |
| K3 | S1 · E2 line 1 | **`<N> runs in flight · no session is reporting a terminal.`**, and at **N = 1** **`1 run in flight · no session is reporting a terminal.`** <!-- PLURALISED 2026-08-13 at the design-conformance RE-JUDGE (designer, on GAP-6). This template read `<N> runs` unconditionally and the build implemented it faithfully, so the LIVE PRODUCTION home rendered `1 runs in flight` — the first sentence an operator meets on this milestone's own surface, and the same defect as GAP-3 one string over. THIS DOCUMENT WAS THE DEFECT, not the build, for the second time on the same species. See the pluralisation rule above this table. --> | the measured live case (R). `No live sessions.` would be true of the array and false about the world |
| K4 | S1 · E2 line 2 | **`A session appears here only when its workspace reports one — the bundle wires the session hooks that report it. A run in a workspace whose bundle has not been updated will not appear here.`** <!-- REPLACED 2026-08-13 at the @uat pass (PO). The previous copy named Codex as the only wired runtime; STORY 07 SHIPPED IN THIS MILESTONE and the live production render shows a Claude session reported, so that sentence became FALSE rather than merely divergent. The replacement keeps this document's no-command restraint (the wiring command is still the architect's to name) while stating the producer-side reason that is now true: it is bundle FRESHNESS, not runtime, that decides. --> | the producer-side reason, stated once, so the operator stops looking for a fault that is not theirs |
| K5 | S1 · E1+E2 link | **`Open the fleet →`** | the arrow-suffixed link form the product already uses (`Watch terminal →`) |
| K6 | S2 · never-fed pane line | **`no live output — no assignment is relaying this session`** | rides the V10 seam; parallel in form to the shipped `no live output — assignment failed · reclaimed` |
| K7 | S2 · held (slot free) | **`not streaming`** | states the fact, nothing more — the toggle beside it is the action |
| K8 | S2 · held (at the cap) | **`not streaming — <N> live panes already · hide one to watch this`** | names the limit *and* the exact recovery, because at the cap there is no control to press |
| K9 | S2 · agent-state mark | **`needs input`** | the product's own word for the fact it already produces (`needs-input`) |
| K10 | S2 · read-only fallback `title` | **`The fleet has no input route to <nodeId>: keystrokes would not arrive, so this pane cannot type.`** | the shipped title says *"this view mirrors the worker's terminal"* — true of the fleet card, wrong here, where the pane would otherwise be typeable |
| K11 | S1 · loading | **`Loading sessions…`** | first fetch only; a poll never re-enters it |
| K12 | fleet node card | **`working · <repo> ×<n> (session)`** | §The dedupe rule |

---

## Accessibility requirements (expected to be honoured)

The automated lane is opt-in per 07/ADR-004 and currently off
([acd-a11y-config-schema.test.mjs:1-8](../../../../test/arch/acd-a11y-config-schema.test.mjs#L1)), so
these bind the **design-conformance review and a `@uat` visual review** regardless. **A grid of live
terminals raises three questions one terminal did not, and they are numbers 3, 4 and 5.**

1. **Every state carries its text label.** A dot with no word is a GAP. Unchanged from m46, and it is
   what makes the two dots that miss SC 1.4.11's 3:1 (`bg-muted-foreground` 2.79:1,
   `bg-destructive` 2.91:1 — measured in m46) tolerable: no meaning ever rests on a dot alone.
2. **The `read-only` label is mandatory, is TEXT, and never yields** — and on this surface it now
   *distinguishes* rather than decorates, because most tiles are interactive. Highest severity in the
   milestone.
3. **Focus order and focus survival** (§The focus model). One roving stop per tile; arrows between
   tiles; `Tab` into the focused tile's controls; **no xterm is a tab stop inline**; the ring is
   `--color-ring` on the tile frame; **focus is keyed to the pane key so a 5s poll cannot move it**.
   A grid that puts 40 stops in the tab order, or that loses focus on a poll, is a GAP.
4. **ONE live region for the grid, not N** (§DG-49-7). `polite`, never `assertive`; it announces the
   focused tile's state changes, sessions arriving/leaving, and the `needs input` count. Per-pane
   `aria-live` is off in this host.
5. **Reduced motion must actually work** (§DG-49-6). With `prefers-reduced-motion: reduce`, **no dot
   animates**, and `connecting` versus `streaming` is still legible from the word and the dot colour.
   The grid adds no motion of its own and the `needs input` mark never pulses.
6. **Each tile's accessible name names the SESSION, not the widget class** — m46's rule
   `<posture> terminal for <identity>`, applied per tile, so a screen-reader user can tell twelve
   panes apart. `aria-label="Terminal"` on twelve tiles is a GAP.
7. **The expanded pane keeps m46's dialog contract**: focus trap, `role="dialog"`, `aria-modal="true"`,
   an `aria-label` naming the session, **an always-visible exit control** (the occupant claims
   `Escape`), and focus returned to the opener.
8. **Target size ≥24×24 CSS px** (SC 2.5.8) for every control, achieved by padding — the shipped
   `h-7 w-7` (28px) already passes
   ([TerminalControl.tsx:144](../../../../ui/src/terminal/TerminalControl.tsx#L144)). The worded toggle's
   `px-2 py-1` around an 11px line must be checked at the tile's width, not the card's.
9. **The non-live bar is `role="status"`, never `role="alert"`** — a stream ending is information.
   Never clipped, never truncated; it wraps if it must
   ([TerminalByteArea.tsx:107](../../../../ui/src/terminal/TerminalByteArea.tsx#L107)).
10. **Contrast on the dark chrome, measured in m46 and unchanged here**: `text-zinc-300` 12.18:1,
    `text-zinc-400` 7.02:1, `text-red-400` 6.51:1, `streaming` 9.06:1 — all pass AA on `#0f1629`.
    **`text-zinc-500` (3.72:1) stays confined to field labels** — the repo in C1b is a field-label-class
    value; **it is never used for a state word, a cause, a pill or either new pane line**, all of which
    are `text-zinc-400`.
11. **The grid's empty and error states are reachable and readable at 390 and at 760×520** — they are
    the states most likely to be the first thing an operator ever sees.
12. **Nothing on this page is announced by colour alone**, including the `needs input` mark, which is a
    word first and has no colour of its own.

---

## Documented defaults (decided here, not blocking)

The PO can override any of these — and the operator's committed mocks supersede any of them on sight.
They exist so the build has no open question.

1. **m46's ramp is frozen and this milestone adds no state word.** Two non-connection facts ride
   existing seams: the never-fed pane on V10's injected reason, the capped pane on `subscribed:false`.
2. **Agent state is one optional mark — `needs input` — word-first, motionless, absent when unknown.**
   No `working`, no `done`, no invented value.
3. **The grid pane is `interactive`, its xterm is not a tab stop inline, and taking the keyboard
   expands the pane.** One posture in both hosts, because a posture change costs the session.
4. **`read-only` appears only where input genuinely cannot be delivered, and carries its own `title`.**
5. **The grid is `repeat(auto-fill, minmax(320px,1fr))`, `gap-4`, inside the fleet's own container** —
   the house's existing reflow primitive, no new breakpoints.
6. **A tile's byte area is aspect-locked to 640/408**, so the letterbox band is ≈0 in a tile; the
   non-live bar is still paid for out of it and tile height never changes.
7. **Order is `nodeId`, `repo`, `sessionId`, ascending codepoint — stable, and never keyed on state.**
8. **Focus is stored as a pane key, one roving stop per tile, ring on the tile frame.**
9. **A tile holding output is never removed by a poll**; it ends in place.
10. **Two empty states, and the second names the producer-side reason.** No command is printed that
    this document cannot vouch for.
11. **One grid-level `aria-live="polite"` region; per-pane live regions off in this host.**
12. **Motion stays on exactly two connection states, and reduced motion must genuinely silence it.**
13. **The live-socket cap renders as an unsubscribed tile with a named limit and no auto-demotion.**
14. **`close` resolves as Hide. There is no per-tile dismissal and no hidden set.**
15. **`unavailable` does not occur on this surface, and roster staleness must never be mapped onto it.**
16. **The `(session)` line deduplicates and counts: `working · demo ×2 (session)`.**
17. **The page is `content:fixed`; the grid owns the only scroll; the shell chrome is untouched.**
18. **The page contributes exactly one node to the surface slot and declares no bar of its own.**
19. **Every interpolated count pluralises by its own value** (§The copy this milestone adds), and
    **a control that cannot do its job is absent, not disabled** (§S2's affordance table).

---

## Ruled but UNBUILT — deferred past milestone 49

Recorded here as one list so the next author does not have to find them in prose. **This document
records what is CORRECT, not what has shipped**; each of these is ruled, and each is unimplemented at
the close of m49. Both come from the design-conformance re-judge
([`DESIGN-CONFORMANCE-49.md`](DESIGN-CONFORMANCE-49.md), the verdict of record).

| # | Rule | Where it is written | Why deferred |
|---|---|---|---|
| **R-2 step 7** | the node card's work line is **one line**; whole repo names yield from the tail into `+<N> more`; a `×<n>` is never yielded, `(session)` is never yielded, no name is broken across a line; the full value stays in `title` | §The `(session)` line, step 7 | needs genuinely new yield behaviour on a surface m49 does not own, and the **Rust half must move in the same commit** (`session_repos()`/`current_work()`, pinned byte-for-byte). Steps 1-6 conform on screen; the line **wraps to three lines** today and grows the card 173 → 212px |
| **GAP-4r** | the four S1 page states **share one top anchor** | §S1's states | cosmetic residue of a closed gap — the failed state is top-anchored now (the original defect, centring, is fixed) but starts ~42px below its three siblings |

**Neither is a licence to read the shipped behaviour as the design.** A reviewer judging a later
build logs both against these rules, not against what m49 left on screen.

---

## Open questions the operator's mocks will settle

Listed so the review knows which rulings are provisional and what it costs if a mock differs.

1. **Whether the tile header is two rows or one.** Ruled: **two**, fixed at every width, because the
   arithmetic at the 320 floor track leaves no room for identity + two pills + chip + two controls on
   one line. A mock drawing one row must also say what yields, and the answer cannot be the identity.
2. **Whether `needs input` is a pill or a glyph + word.** Ruled: the existing pill form. Its
   **presence** is not negotiable; its form is.
3. **Whether the grid groups by node.** Ruled: **no** — one flat grid, ordered by `nodeId` first, so
   a node's tiles are already adjacent without spending a header row per node in a 432px content box.
   A mock with node headers reopens this and costs the grid its uniform reflow.
4. **Whether a held tile shows a dimmed last frame instead of a line.** Ruled: **a line** — there is no
   last frame to show (the mirror is ephemeral, so an unsubscribed pane has no bytes) and inventing one
   would be the worst possible lie on this surface.
5. **Whether tiles carry the assignment lifecycle chip as well.** Ruled: **no** — one chip per tile.
   The work-item ref in the identity is the link to that story, and the fleet page owns the chip.
6. **A dark shell.** These tiles are dark and the page around them is light. If a mock shows the shell
   going dark, **that is a theme decision beyond this milestone's ramp** and comes back as its own
   design gap with its own token work
   ([45/DESIGN open question 6](../45_milestone_ui-app-shell-routing/DESIGN.md)). This milestone adds
   no token.
7. **Whether the grid gains a scope/repo filter.** Ruled: **not here** — m47 shipped one for `/fleet`
   and duplicating it is a second home for one concept. If the mock shows one, it is a design gap for a
   later milestone, not a silence.
8. **Whether the surface-slot summary is text or chips.** Ruled: one muted text line. Chips there would
   compete with the shell's own identity chip.

---

## Behavioural outcomes (cross-reference)

The user-visible BEHAVIOUR belongs in the task features, **not here**. This document fixes the look and
feel; the features fix what happens.

**This milestone has not been broken down yet** ([STATE.md:14-16](STATE.md#L14)), so **no story or task
path below is real yet.** They are named as **subjects** for `aof:refine 49` to author, and this
section is repointed at the authored files in the same change that creates them.

**Subjects the features must own, and which this document deliberately does not specify:**

- **The grid's population rule** — which sessions reach the grid, keyed on a **non-empty-string**
  `sessionId` test (m48's inherited fitness obligation forbids `!= null` / truthiness), and what
  happens to an entry that disappears mid-view.
- **The live-socket cap as an executable contract** — the configured number, which tiles hold sockets,
  what `Watch` does at the cap, and that **nothing is ever demoted automatically**.
- **The input path extension and the arch-test invariant 4 amendment** — one declaration flipped at one
  call site ([terminal-mount.mjs:152-157](../../../../ui/src/fleet/terminal-mount.mjs#L152)), with
  invariant 4 **rewritten, never deleted and never quietly broken**.
- **Focus as scenarios** — a poll does not move focus; arrows traverse the rendered order; `Enter`
  expands with focus inside the terminal; dismissal returns focus to the tile; no xterm is a tab stop
  inline.
- **The `code`/`needs-input` wire hop** — one field through `projectAssignment` and the
  `WorkAssignment` type, additive, with the mark rendered from a fixture until it lands.
- **The dedupe rule in BOTH implementations in ONE commit**, with a paired captured Rust fixture that
  actually exercises two-sessions-one-repo, and the two JS pins updated deliberately.
- **`@uat` visual review — the terminals home**, judged region by region against §Surfaces' binding
  checklists (and against each mock once it lands). It must carry **one row per design gap**:
  DG-49-1 (both empty states) · DG-49-2 (the never-fed pane) · DG-49-3 (`needs input`, fixture-driven) ·
  DG-49-4 (the cap's two held frames) · DG-49-5 (typing lands where you can read) · DG-49-6 (reduced
  motion) · DG-49-7 (one live region) · DG-49-8 (the `(session)` line) · DG-49-9 (nothing kills an
  agent by accident). **DG-49-10 carries no row of its own: m46's DG-46-3 row travels onward, and it is
  not deleted.**
