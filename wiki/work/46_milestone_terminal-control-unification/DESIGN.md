---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 46 · One terminal control — Design

## Intent

This milestone has **no new visual surface**. It has **one new component** that replaces two, and the
whole design brief is the SPEC's own success condition: *the operator should not be able to tell what
changed except that the two terminals now agree.*

**This is an extraction, not a re-skin.** Every colour, every hex, every type step and every glyph in
this document was read out of the two shipping implementations
([TerminalDock.tsx](../../../ui/src/board/TerminalDock.tsx),
[FleetTerminalView.tsx](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx)). **Not one token is
invented.** Where the two disagree, this document rules which one wins and says why; where they agree,
nothing moves. *(One value has since been added on purpose and on a measurement — the `streaming`
word's teal, §The merged ramp CORRECTION 1. It is dated, argued and counted; it is not a re-skin.)*

Three surfaces are in scope, and they are three **hosts of one control**, never three components:

- **S1 — the board dock.** Inline at the bottom of the board, drag-resizable, provider picker,
  interactive, `content:fixed` per [45/DESIGN §The shell's layout primitives
  2](../45_milestone_ui-app-shell-routing/DESIGN.md).
- **S2 — the fleet card peek.** Inline inside an assignment card, a read-only mirror, rendered at the
  worker's fixed 80×24 and scaled **down**.
- **S3 — the expand-to-fullscreen overlay.** The **same** xterm instance, re-parented into the shell's
  `fullscreen` z rung — one instance, one socket, through both transitions.

**Five binding rails. Everything below is one of these five applied somewhere:**

1. **ONE state vocabulary.** Two ramps ship today
   ([dock-state.mjs](../../../ui/src/board/terminal/dock-state.mjs) `idle → connecting → running →
   exited/error`; [view-state.mjs](../../../ui/src/fleet/terminal-view/view-state.mjs)
   `waiting → streaming → ended → disconnected`). After this milestone there is **one**, and every state
   in it carries its **text label** — colour is the last signal, never the only one.
2. **Geometry is a property of the SOURCE. Posture is a property of the HOST.** Fit-vs-scale keys off
   whether the far end can be told to resize (spike 44 sub-question 4). Read-only-vs-interactive keys off
   the call site. **These are two independent axes and collapsing them into one `isRemote` boolean is
   the bug this milestone exists to delete** — the same `mirror` source is interactive in the dock today
   ([TerminalDock.tsx:150-155](../../../ui/src/board/TerminalDock.tsx#L150)) and read-only on the fleet
   card ([FleetTerminalView.tsx:170-173](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L170)).
3. **A pane never lies about its far end.** It never shows a liveness the source no longer asserts (V9),
   never promises output that cannot come (V10), never renders blank when it cannot resolve its origin
   (spike 44 sub-question 5), and never overprints the last line it was asked to annotate (V11).
4. **Chrome never destroys content.** A non-live message on a FULL pane is an **opaque, in-flow bar**
   paid for out of the byte area — never an overlay, never extra height on the host.
5. **The control invents no vocabulary of its own.** Everything it paints already exists on one of the
   two surfaces or in the shell's ladder. A mark the control needs and the product does not have is a
   GAP whose fix is decided *here* first.

---

## Conformance source of truth

> **AMENDMENT, 2026-08-08 — THE MOCK LANDED, AND IT IS NOT THREE PNGs.** The operator supplied
> [`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html): one committed, locally
> readable spec carrying **all three surfaces × their state fixtures**, with every value legible at
> source (its `renderVals()` block) rather than measured off a picture. It is **the committed mock for
> S1, S2 and S3**, and the clause below fires exactly as written — **it supersedes this document's
> checklists wherever the two differ, and this document is amended in the same change.** The delta list
> (18 confirmations, 11 overrides, and two flags where the mock contradicts a locked `.feature`) is
> [`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md), and **that file, region by region, is what a render is
> judged against.**
>
> **What this AMENDMENT supersedes:** the three `Committed mock` / `Status` rows in the table below and
> the identical `PENDING, operator-supplied` line at the head of each of the three surface checklists.
> The three PNG names survive **only as render-target names** (§Render breakpoints and render targets).
> **What it does not touch:** everything else in this section, and the no-remote-link rule in particular
> — which is *honoured*, not waived: the mock is a committed local file, not the design-tool link it
> arrived through.

> **The committed mocks are `mocks/s1-board-dock.png`, `mocks/s2-fleet-card-peek.png` and
> `mocks/s3-fullscreen-overlay.png` — status: PENDING, operator-supplied.** The operator stated at refine
> that mocks will be supplied and asked for a generation prompt; that prompt is committed at
> [`mocks/PROMPT.md`](mocks/PROMPT.md). The PNGs have **not landed yet**. When they land they go at those
> three paths, relative to this document, as **committed, locally-readable artifacts**.
>
> **Until they land, the binding checklists in this document are the conformance baseline** — mandatory,
> and the thing a design-conformance review judges the built surface against, so a review that runs
> before the mocks arrive has a baseline to judge and does not have to return `INCONCLUSIVE`.
>
> **When a committed mock lands, it supersedes this document's checklist for ITS surface wherever the two
> differ.** The mock is the visual source of truth; the checklist is what makes it *checkable* region by
> region. Where the mock is silent, the checklist still binds. Where they conflict, the mock wins and
> **this document is amended in the same change** — a checklist left contradicting a committed mock is a
> defect, not a nuance.
>
> **A remote design-tool link is never an acceptable substitute for the committed file.** Not
> `claude.ai/design`, not Figma, not a screenshot in a chat. The design-conformance reviewer is
> **read-only** and cannot open one — a baseline it cannot `Read` is not a baseline (07/ADR-003; the m03
> lesson; the same rule stated at
> [36/mocks/README.md:3-5](../36_milestone_mesh-desktop-app/mocks/README.md#L3) and at
> [45/DESIGN §Conformance source of truth](../45_milestone_ui-app-shell-routing/DESIGN.md)).

| Surface | Committed mock | Status | Interim baseline |
|---|---|---|---|
| **S1 — the board dock** | `mocks/s1-board-dock.png` † | **PENDING (operator-supplied)** † | §S1's binding checklist |
| **S2 — the fleet card peek** | `mocks/s2-fleet-card-peek.png` † | **PENDING (operator-supplied)** † | §S2's binding checklist |
| **S3 — the fullscreen overlay** | `mocks/s3-fullscreen-overlay.png` † | **PENDING (operator-supplied)** † | §S3's binding checklist |
| the app shell around S1/S2 | [45/mocks/app-shell.png](../45_milestone_ui-app-shell-routing/mocks/app-shell.png) | PENDING there | [45/DESIGN §Surface 1](../45_milestone_ui-app-shell-routing/DESIGN.md) — **not re-baselined here** |
| the fleet card the peek sits in | [25/mocks/](../25_milestone_mesh-ui/mocks/) + [38/DESIGN §Surface 2](../38_milestone_cross-machine-worker-execution/DESIGN.md) — unchanged | committed | not re-baselined here |

**†** superseded by the AMENDMENT above: the committed mock is
[`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html) and the delta list is
[`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md).

**Do not create a placeholder PNG.** An empty or stand-in image is worse than an absent one: a reviewer
cannot tell it apart from a real baseline. `mocks/` holds `PROMPT.md` today and gains each PNG when the
real file arrives.

---

## Render breakpoints and render targets

Three widths and one height, inherited **unchanged** from
[45/DESIGN §Render breakpoints](../45_milestone_ui-app-shell-routing/DESIGN.md) — this control lives
inside that shell and does not get its own breakpoint system.

- **1280** — the primary judgement width.
- **768** — the desktop-app proxy (the Rust window is **760×520**,
  [app/desktop/ui/styles.css:50](../../../app/desktop/ui/styles.css#L50)).
- **390** — mobile; the page root's `overflow-x: clip` backstop
  ([index.css:27-45](../../../ui/src/index.css#L27)) must not be needed to save this control.
- **520 tall (binding, and it decides a number below).** With the shell's 88px steady-state chrome, the
  content box at the desktop window is **432px**. §S1's height rule is derived from exactly that.

**Render targets** (the orchestration renders these and hands the reviewer the screenshots; the reviewer
does not run the browser):

| # | Surface | Origin | States to capture |
|---|---|---|---|
| R-A | **S1** at 1280 | board origin — **ephemeral**, supplied at capture time, never hard-coded ([Board.tsx:47-51](../../../ui/src/board/Board.tsx#L47)) | no session · connecting · waiting · streaming · exited (0) · exited (1) · error · **unavailable** · collapsed |
| R-B | **S1** at 760×520 | board origin | streaming, at the **clamped default height** (§S1's height rule) |
| R-C | **S1** at 390 | board origin | streaming — the header must not wrap into two rows |
| R-D | **S2** at 1280 | fleet origin `http://127.0.0.1:4181/fleet` | collapsed (at rest) · waiting · streaming · stream ended · error · `no live output` (terminal assignment) · **unavailable** |
| R-E | **S2** at 390 | fleet origin | collapsed · streaming |
| R-F | **S3** from S2 (a `mirror` source, scaled **up**) | fleet origin | streaming · stream ended |
| R-G | **S3** from S1 (a `local-pty` source, **fitted**) | board origin | streaming |

R-A's **unavailable** frame and R-D's **unavailable** frame have **no production producer in this
milestone** — see §DG-46-3. They must be captured from a forced fixture, and the review judges them like
any other state. **They capture two of the three named causes** (R-A: `not checked out on this machine`;
R-D: `board unreachable`); the third is unrendered in m46 by design — §The unavailable pane, RULING 2.

---

## The constraint this design is written against

Read before specifying anything. Everything in the right column was measured at source on 2026-08-08 and
bounds what this control may do.

| Fact | Where it lives today | Consequence for this design |
|---|---|---|
| **Two state ramps, five words vs four, for one concept** | [dock-state.mjs:11-17](../../../ui/src/board/terminal/dock-state.mjs#L11) vs [view-state.mjs:24-29](../../../ui/src/fleet/terminal-view/view-state.mjs#L24) | §The one state vocabulary. This is the milestone's highest-value decision. |
| The fleet ramp **already declares it mirrors the dock's tone map** "byte-for-byte … so the two terminals speak ONE state vocabulary" | [FleetTerminalView.tsx:92-99](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L92) | The *tones* already agree. Only the **words** and the **state set** diverge — so the merge is a vocabulary decision, not a palette one. |
| **The same `mirror` source is interactive in the dock and read-only on the card** | `disableStdin: false` + `term.onData` → `socket.send` on **both** lanes ([TerminalDock.tsx:150-155](../../../ui/src/board/TerminalDock.tsx#L150), [:261-263](../../../ui/src/board/TerminalDock.tsx#L261)) vs `disableStdin: true`, no `onData` ([FleetTerminalView.tsx:170-173](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L170)) | **Posture is NOT a property of the source.** Proven, not argued. §Read-only is a posture. |
| **A `mirror` in the DOCK is pinned 80×24 but never scaled** — the dock resizes the terminal and then paints it at natural size into `absolute inset-0 p-2` | [TerminalDock.tsx:165-168](../../../ui/src/board/TerminalDock.tsx#L165), [:414](../../../ui/src/board/TerminalDock.tsx#L414) | A 80×24 screen at `fontSize: 13` is ≈640×408px; the dock's default height is **280px** ([:56](../../../ui/src/board/TerminalDock.tsx#L56)). **The mirror is cropped in the dock today.** §Fit vs scale fixes it. |
| The fleet peek **does** scale, aspect-preserved, off ONE instance and ONE socket, anchored top-left | [geometry.mjs:37-41](../../../ui/src/fleet/terminal-view/geometry.mjs#L37) (`Math.min`, not `max`), [FleetTerminalView.tsx:158-163](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L158) | This is the correct implementation and it is the one that survives. |
| **The dock's error message OVERPRINTS the bytes** — `pointer-events-none absolute inset-x-0 top-0 p-3` | [TerminalDock.tsx:420-424](../../../ui/src/board/TerminalDock.tsx#L420) | Straight violation of [38/DESIGN §Surface 3 **V11**](../38_milestone_cross-machine-worker-execution/DESIGN.md). §What visibly changes, change 6. |
| **The fullscreen overlay's message bar also overprints** — `absolute inset-x-0 bottom-0`, and the file says so | [FleetTerminalView.tsx:434-438](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L434); the admission at [:406-408](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L406) ("the V11 … bar the fitness reads is the inline one") | A fitness function pointed at the compliant twin. One rule, all three surfaces. |
| Two sizes for one `▣ TERMINAL` lockup: `text-xs` vs `text-[11px]` | [TerminalDock.tsx:307](../../../ui/src/board/TerminalDock.tsx#L307) vs [FleetTerminalView.tsx:305](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L305) | One control, one chrome ramp. §Type ramp. |
| Two identity forms: `item <ref>` + a `remote · <nodeId>` badge, vs `<ref> → <nodeId> · session <id>` | [TerminalDock.tsx:314-318](../../../ui/src/board/TerminalDock.tsx#L314), [:363-371](../../../ui/src/board/TerminalDock.tsx#L363) vs [stream.mjs:102-103](../../../ui/src/fleet/terminal-view/stream.mjs#L102) | One identity line, source-shaped. §S-common region C1. |
| The dark surface is **four hex literals**, in two files, with no named home | `#0b0f14` / `#0f1629` / `#1e2a44` / `#0b1120` — [TerminalDock.tsx:158](../../../ui/src/board/TerminalDock.tsx#L158), [:287](../../../ui/src/board/TerminalDock.tsx#L287), [:330](../../../ui/src/board/TerminalDock.tsx#L330); [FleetTerminalView.tsx:176](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L176), [:332](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L332) | **DG-46-2.** One home, no new `@theme` token (a dark theme is [45/DESIGN open question 6](../45_milestone_ui-app-shell-routing/DESIGN.md)). |
| The dock clamps drag-resize to `Math.round(window.innerHeight / 2)` — the **viewport**, not the shell box | [TerminalDock.tsx:120](../../../ui/src/board/TerminalDock.tsx#L120) | Wrong by exactly the chrome height under a shell. ADR-005 point 7 promoted `--aof-shell-chrome-height` for this ([45/ARCHITECTURE](../45_milestone_ui-app-shell-routing/ARCHITECTURE.md)). §S1's height rule. |
| The dock's region home is **`overlay`, out of flow**, `z-30`, decided in m45 and with **no caller yet** | [45/ARCHITECTURE ADR-005 [Build-3]](../45_milestone_ui-app-shell-routing/ARCHITECTURE.md); [shell-layout.mjs:616-617](../../../ui/src/app/shell-layout.mjs#L616) | m46 is the first caller. **DG-46-1** — an out-of-flow dock that covers the board's own controls is not an acceptable extraction. |
| The fullscreen door already exists, unused, with its shape fixed **for this milestone** — live-node adoption, `claimsEscape`, `onLayout` | [shell-bus.mjs:94-151](../../../ui/src/app/shell-bus.mjs#L94) ("m46 is the caller this door is built for") | S3 stops portalling to `document.body` and asks the shell. §S3. |
| Collapse (dock) and Hide (card) look alike and cost differently: collapse keeps the session ALIVE; Hide **closes the socket** | [TerminalDock.tsx:137-141](../../../ui/src/board/TerminalDock.tsx#L137), [:409-412](../../../ui/src/board/TerminalDock.tsx#L409) vs [FleetTerminalView.tsx:145](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L145), [:235](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L235) | §Collapse is not Hide. Two operations, two forms, no shared name. |
| Header controls are under the 24px target size on the card: `px-1.5 py-0.5` around an `h-3.5 w-3.5` icon (~18px tall) | [FleetTerminalView.tsx:347](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L347), [:359](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L359) | WCAG 2.2 SC 2.5.8. §Accessibility 7, and a knowing +6px on the card header. |
| The peek panel's total height is a fixed **192px** and V11 pins it as constant (163 bytes + 29 bar) | [FleetTerminalView.tsx:369](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L369) (`h-48`); [38/DESIGN:1059](../38_milestone_cross-machine-worker-execution/DESIGN.md) | The non-live bar is **paid for out of the byte area** on every surface. Never extra height. |
| The first `resize` frame on `open` is silently dropped by the server | spike 44 §Investigation; [TerminalDock.tsx:214-215](../../../ui/src/board/TerminalDock.tsx#L214) | Not a visual rule, but it is what makes a *fitted* pane briefly wrong. Cross-referenced to the task features, not specified here. |

**This design asks for no new data.** Everything the control renders — the ref, the node, the session, the
exit code, the error message, the assignment chip — is already on the wire or already in a helper.

---

## The design gaps — three, and each resolves as a rule here plus a `@uat` visual-review scenario

### DG-46-1 — an out-of-flow dock must not cover the controls the operator still needs

[45/ARCHITECTURE ADR-005 [Build-3]](../45_milestone_ui-app-shell-routing/ARCHITECTURE.md) ruled the dock's
region home: **`overlay`, out of flow, a sibling of `content`** — because a `content`-parented dock is
unmounted by every route change and the PTY dies with it. That ruling is right and this milestone does not
reopen it. But m45 also recorded its visible consequence — *"an open dock overlays the bottom of the
content region rather than shrinking it"* — and named the escape hatch in the same breath: *"If m46 finds
it needs the content region to shrink by the dock's height, that is a new named primitive of the same
shape as `--aof-shell-chrome-height` — a published dock inset — and it comes back here and to ADR-005 as
an amendment, never as a CSS decision taken inside a story."*

**m46 finds it needs exactly that, and the reason is this milestone's own success condition.** Today the
dock is an in-flow flex child of the board's `h-dvh overflow-hidden` column
([Board.tsx:561-563](../../../ui/src/board/Board.tsx#L561)), so opening it *shrinks* the lanes and the
detail panel and everything stays reachable. An overlaying dock at the default 280px covers the bottom
280px of the detail panel — which is where the detail panel's action strip lives. An extraction that
takes the operator's buttons away is not an extraction.

**The rule: an open dock costs the content region its height, exactly as it does today. It never covers
content the operator can still act on.** How that is achieved is the architect's — DOM parentage is
ADR-005's decision, not this document's — but the design constraint admits only one shape given
[Build-3]: **the shell publishes a dock inset (a named custom property of the same species as
`--aof-shell-chrome-height`) and the content region pads its bottom against it.** A `content:fixed`
surface then sizes itself `calc(100dvh - var(--aof-shell-chrome-height) - <dock inset>)`.

**Consequence, recorded so a reviewer does not log it as a regression: nothing visible changes on the
board when the dock opens.** That is the point. **A render in which an open dock overlaps the detail
panel's actions is a GAP**, not a designed change.

**Close condition.** DG-46-1 closes when the dock is in the `overlay` region, the inset primitive is
named and published, and a render at 1280 and at 760×520 shows an open dock with the detail panel's
action strip fully visible above it. It amends [45/DESIGN DG-45-2](../45_milestone_ui-app-shell-routing/DESIGN.md)
and ADR-005 in the same change, as m45's clause requires.

### DG-46-2 — the terminal surface palette is four hex literals with no home

`#0b0f14` (the viewport), `#0f1629` (the chrome), `#1e2a44` (the borders) and `#0b1120` (the picker well)
are typed as literals in two files. They are the one legitimate divergence from the light theme
([03/DESIGN documented default 4](../03_milestone_work-board-ui/DESIGN.md): *"the xterm viewport is dark
— terminals read best dark; this is a deliberate, scoped divergence"*), and after this milestone they
are painted by **one** component, so a second copy is a second product.

**The fix shape, fixed here so whoever closes it is not re-deciding it:** the four values live as named
constants in the control's own framework-free `.mjs`, and **both** consumers read them — the xterm
`theme: { background, foreground }` object and the documented class list. **They do NOT become
`@theme` tokens**: a dark theme is beyond this milestone's ramp and is
[45/DESIGN open question 6](../45_milestone_ui-app-shell-routing/DESIGN.md)'s to settle. And the Tailwind
class strings **stay literals the scanner can see** — that is m45's GAP-4 lesson
(`IDENTITY_CHIP_WIDTH_CLASS`: one constant both consumers read, and it stays a literal), not an
invitation to build class names at runtime.

`#d7dde3` (the xterm foreground, [TerminalDock.tsx:158](../../../ui/src/board/TerminalDock.tsx#L158) and
[FleetTerminalView.tsx:176](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L176)) is the fifth
and it travels with them.

*(2026-08-08: this home now also holds the sixth value — the `streaming` word's teal, §The merged ramp
CORRECTION 1. One home, one constant, still no `@theme` token. That is DG-46-2 working, not DG-46-2
widening.)*

### DG-46-3 — the `unavailable` state is BUILT IN m46 AND HAS NO PRODUCER IN m46

*(Named here, in advance, for the reason m45's DG-45-5 had to be named in arrears: a reviewer that cannot
tell "not built" from "built and never triggered" costs a full review round-trip.)*

Spike 44 sub-question 5 binds the state: *"a pane whose origin cannot be resolved renders a labelled
unavailable state that names its cause — `not checked out on this machine` / `board unreachable` — never
a blank pane, never a silently dead one."* §The unavailable pane specifies it and **m46 must ship it**.

**But m46 has no caller that produces it.** The board dock is always same-origin with its own PTY; and a
fleet card whose tuple does not resolve renders **no panel at all**, not an unavailable one (ADR-014
invariant 4 / V1, enforced structurally at
[stream.mjs:91-94](../../../ui/src/fleet/terminal-view/stream.mjs#L91) and
[FleetTerminalView.tsx:282](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L282) — and that
rule is **not** relaxed here). The producer is **milestone 49**, which dials a per-pane origin and must
first copy `assign`'s `workspace-not-local` guard onto `/api/mesh/board-url`
([mesh-ui-serve.mjs:439-440](../../../src/mesh-ui-serve.mjs#L439), spike 44 §Outcome).

**So: the state is built, unit-driven and rendered from a fixture in m46; a conformance reviewer must NOT
log its absence from a production render as a fresh finding, and must judge the fixture render.**

**Close condition.** DG-46-3 closes in milestone 49, when a real unresolvable origin produces the pane and
a render shows the named cause. The `@uat` row travels to 49's gate; it is not deleted.

---

## THE ONE STATE VOCABULARY

This is the single highest-value decision in the milestone, so it gets its own section, its own table and
its own reasoning per word.

### The two ramps, side by side, and the verdict on each word

| Today (dock) | Today (fleet) | Verdict |
|---|---|---|
| `idle` | *(collapsed — no chip at all)* | **`idle` survives.** Distinct: nothing is bound and no socket exists. |
| `connecting` | — | **`connecting` survives, and the mirror lane GAINS it.** |
| — | `waiting` | **`waiting` survives, and the local lane GAINS it.** |
| `running` | `streaming` | **The same state under two names.** `streaming` wins. |
| `exited (N)` | `ended` | **The same state, differently informed.** One state `ended`; the label carries the exit code when the source asserted one. |
| `error` (+ message) | `disconnected` | **`error` survives; `disconnected` is retired as a state word** and becomes a mandatory cause line. |
| — | — | **`unavailable` is new** — spike 44 sub-question 5. |
| *(unchanged on an unknown control type)* | `unknown` | **`unknown` survives** as the forward-compatible fallback. |

### The merged ramp

**Seven states plus one fallback.** Every row's classes were read out of
[TerminalDock.tsx:449-466](../../../ui/src/board/TerminalDock.tsx#L449),
[FleetTerminalView.tsx:95-99](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L95),
[view-state.mjs:60-112](../../../ui/src/fleet/terminal-view/view-state.mjs#L60) and
[Fleet.tsx:1177-1181](../../../ui/src/fleet/Fleet.tsx#L1177). **No value below is new.**

> **CORRECTION 1, 2026-08-08 — the `streaming` WORD takes the mock's lighter teal; the DOT does not.**
>
> Recorded as a **dated correction that supersedes**, not as a silent rewrite, for the reason ADR-004 and
> ADR-005 have each been corrected this milestone: a document that quietly changes its own value teaches
> the next reader nothing about *why*, and the next reader is the one who has to decide whether to change
> it back.
>
> **What it supersedes — exactly three things, and nothing else in this document moves:**
>
> 1. **this table's `streaming` row, the `Label class (dark chrome)` cell.** `text-primary` →
>    **`hsl(174 58% 52%)`**.
> 2. **§The design ramp's `State tokens` row**, insofar as it offers `text-primary` for a state **word**.
>    `bg-primary` is untouched there and here.
> 3. **the sentence "No value below is new" directly above.** This value **is** new: it is the sixth on
>    the dark surface, it is in neither shipping implementation and it is not in `@theme`. Saying so is
>    the whole point of writing a correction instead of an edit.
>
> **Why — and it is a measurement, not a preference.** `text-primary` resolves to `hsl(174 72% 27%)`
> (≈ `#13766D`). On the terminal chrome `#0f1629` that measures **3.29:1** and **fails WCAG 2.1 AA
> (4.5:1) for an 11px state word.** The mock's `hsl(174 58% 52%)` (≈ `#3ECCBD`) on the same chrome
> measures **9.06:1**. So the one state that means *this is alive right now* — the word this document
> ranks **first** of its four non-colour signals — was the only word in the ramp that could not be read.
> The full measurement, and every other row of the table, is below.
>
> **What is NOT superseded: the DOT does not move.** It stays `bg-primary` / `hsl(174 72% 27%)`, because
> a non-text indicator is governed by SC 1.4.11's **3:1**, which it clears at 3.29:1. **One hue, two
> values, two different rules** — and the dot staying on-token is what keeps this a contrast fix rather
> than a re-tint. Motion, the word `streaming` itself, the four ranked signals and every other row's
> label class are all untouched.
>
> **Provenance, because a value outside the five source-read hexes must have one.** The value is the
> committed mock's (`renderVals()` → `S.streaming` → `color`); it was **raised before it was painted**,
> which is what [`04/tasks/04_the-two-terminals-agree.feature`](stories/04_story_one-control-both-call-sites/tasks/04_the-two-terminals-agree.feature)
> requires of any new terminal colour; it was raised at [`mocks/CONFORMANCE.md` §3a / PO-1](mocks/CONFORMANCE.md)
> and **adopted by PO ruling** ([STATE §PO rulings on the mock reconciliation](STATE.md)). It is painted
> as a **named constant in DG-46-2's one home** (`ui/src/terminal/palette.mjs`,
> `TERMINAL_LABEL_CLASS_PRIMARY`) carrying the measurement in its comment, as an arbitrary-value Tailwind
> literal the scanner can see — **and it adds no `@theme` token**, because a dark theme is still
> [45/DESIGN open question 6](../45_milestone_ui-app-shell-routing/DESIGN.md)'s to settle.

| State | Chip label (always rendered) | Dot | Dot class | Label class (dark chrome) | Motion | Reads | Pane |
|---|---|---|---|---|---|---|---|
| **`idle`** | `idle` | filled | `bg-muted-foreground` | `text-zinc-400` | none | normal | the empty-host line (S1: *"No session. Press Run agent on an item."*) |
| **`connecting`** | `connecting…` | filled | `bg-secondary` | `text-zinc-400` | `animate-pulse` | normal | empty |
| **`waiting`** | `waiting for output` — or `no live output` (V10) | filled | `bg-muted-foreground` | `text-zinc-400` | **none** | normal | empty; message **top-left, inside** the byte area |
| **`streaming`** | `streaming` | filled | `bg-primary` | **`hsl(174 58% 52%)`** — *supersedes `text-primary`; CORRECTION 1* | `animate-pulse` | normal | full, undimmed, no bar |
| **`ended`** | `stream ended` · `exited (0)` · `exited (N)` | filled | `bg-muted-foreground`, or `bg-destructive` when `N ≠ 0` | `text-zinc-400`, or `text-red-400` when `N ≠ 0` | none | clean / failure | full, `opacity-60`, **opaque in-flow bar** |
| **`error`** | `error` | filled | `bg-destructive` | `text-red-400` | none | failure | full → `opacity-60` + bar; empty → top-left line. **The cause is MANDATORY.** |
| **`unavailable`** | `unavailable` | **dashed, hollow** — `border border-dashed border-muted-foreground/40 bg-transparent` | | `text-zinc-400` | none | blocked (**never** failure) | a centred dashed block naming the cause. **No socket is opened.** |
| **`unknown`** | `unknown` | filled | `bg-muted-foreground` | `text-zinc-400` | none | normal | unchanged |

#### The measurement CORRECTION 1 rests on — and every other row of that table, measured

**Measured, not assumed**, on 2026-08-08 by the WCAG 2.1 relative-luminance formula over sRGB, against
the chrome **`#0f1629`** (§The design ramp) — the background every state **word** is painted on, on all
three surfaces. `hsl()` values carry their sRGB equivalent so a reviewer can re-measure without a
colour picker.

| Label class | Value | States that wear it | On `#0f1629` | AA (4.5:1) at 11px |
|---|---|---|---|---|
| `text-zinc-400` | `#a1a1aa` | `idle` · `connecting` · `waiting` · `ended` (no code / code 0) · `unavailable` · `unknown` | **7.02:1** | **passes** |
| `text-red-400` | `#f87171` | `error` · `ended` with `N ≠ 0` | **6.51:1** | **passes** |
| `text-primary` *(superseded)* | `hsl(174 72% 27%)` ≈ `#13766D` | `streaming`, as inherited | **3.29:1** | **FAILS** |
| **`hsl(174 58% 52%)`** *(ruled)* | ≈ `#3ECCBD` | `streaming` | **9.06:1** | **passes** |
| `text-zinc-300` *(not a state word — the lockup and resolved values)* | `#d4d4d8` | — | **12.18:1** | passes |

**The answer to "does anything else in the ramp fail": no.** Every other label class in the merged ramp
clears AA on the chrome, two of them by a wide margin. **`streaming` was the only failing word**, which
is the sharp part of the finding rather than an incidental one.

**The dots, measured on the same background** — SC 1.4.11 asks **3:1** of a non-text indicator, not
4.5:1:

| Dot class | Value | On `#0f1629` | 3:1 |
|---|---|---|---|
| `bg-secondary` (`connecting`) | `hsl(214 18% 88%)` ≈ `#dbe0e6` | **13.56:1** | passes |
| `bg-primary` (`streaming`) | `hsl(174 72% 27%)` ≈ `#13766d` | **3.29:1** | passes — *this is why the dot does not move* |
| `bg-destructive` (`error`, `exited (N≠0)`) | `hsl(0 73% 43%)` ≈ `#be1e1e` | **2.91:1** | **fails** — raised below |
| `bg-muted-foreground` (`idle`, `waiting`, `ended`, and the `unavailable` outline) | `hsl(218 9% 38%)` ≈ `#585f6a` | **2.79:1** | **fails** — already standing |

**Neither dot failure is ruled here, and neither is new to this correction.** The muted dot is already
carried as a standing risk for the `@uat` accessibility pass
([`mocks/CONFORMANCE.md` §3c](mocks/CONFORMANCE.md)) — DESIGN, the shipped core and the mock all agree on
the value, so there is nothing to supersede. `bg-destructive` is measured here for the first time and
joins it. **Both are defensible only for the reason this document already gives: the WORD always renders,
and colour is the fifth signal** — `error` carries `text-red-400` at 6.51:1 and `unavailable` carries
`text-zinc-400` at 7.02:1, so no meaning rests on a dot alone.

#### Two TEXT findings outside that table — raised and measured here, NOT ruled here

Both fail AA for text; neither is a state word; both change a value this milestone otherwise inherits
untouched, and one of them would override the committed mock. **They are the PO's to rule.** Recorded so
the next contrast question starts from a number instead of an argument.

| # | Where | Value on which background | Measured | Why it is not ruled here |
|---|---|---|---|---|
| **RAISED-1** | the C1 field labels `provider:` and `item` — `text-zinc-500`, which §Accessibility 13 permits **only** for exactly these | `#71717a` on `#0f1629` | **3.72:1** | Fails AA (4.5:1) for normal text. WCAG's *incidental* exemption covers decoration and inactive components, **not** a visible field label — so "non-essential" is this document's judgement, not an exemption. Raising it to `text-zinc-400` (7.02:1) would flatten the label/value hierarchy the mock draws. A real trade. |
| **RAISED-2** | **the `unavailable` pane's recovery line** — `mono text-[11px] text-zinc-500` on the byte area (§The unavailable pane), and the mock draws it `#71717a` | `#71717a` on `#0b0f14` | **3.98:1** | Fails AA. **This is the load-bearing one:** the recovery line *is the command the operator must type*, so a refusal that names its cause and then whispers the fix is half a refusal. The cheapest in-ramp fix is `text-zinc-400` (**7.50:1** on `#0b0f14`, measured) — but that **overrides a committed mock value**, which is a PO decision by this document's own conformance clause. |

### Why each ruling, in one paragraph each

**`connecting` and `waiting` are genuinely distinct, and each lane gains the one it lacks.**
`connecting` = the transport is not yet established. `waiting` = it **is** established and nothing has
been said. Collapsing them breaks honesty in both directions, and both breaks exist today: a mirror whose
upgrade hangs sits on `waiting for output` — asserting "bytes are plausibly next" when there is no socket
to carry them — because [view-state.mjs:115-117](../../../ui/src/fleet/terminal-view/view-state.mjs#L115)
starts at `waiting` before the socket opens; and a local PTY that spawns and prints nothing sits on
`connecting…` forever, because [TerminalDock.tsx:230-233](../../../ui/src/board/TerminalDock.tsx#L230)
only leaves `connecting` on the first byte. Two words, honestly applied, fix both.

**`streaming` beats `running`, on the discipline this codebase repeats everywhere: a label may only
assert what the client can know.** The browser observes exactly one thing on both lanes — bytes arrived on
an open socket. `running` asserts a far-end *process* state that the mirror lane never observes at all
(the worker's `claude` could have hung mid-paint) and that the local lane only infers. `streaming` names
the observable. It is also the word the surface with the weaker claim already uses, and the descriptor's
internal boolean is already called `live`
([view-state.mjs:67](../../../ui/src/fleet/terminal-view/view-state.mjs#L67)) — so the concept keeps its
name and the *word* becomes the one that is true on both lanes.

**`exited` and `ended` are one state with two amounts of information, so they become one state and two
labels.** `ended` = the session is over, normally. When the source asserted an exit code via
`{type:'exit'}` ([dock-state.mjs:37-41](../../../ui/src/board/terminal/dock-state.mjs#L37)) the label is
`exited (N)` and `N ≠ 0` puts it on the failure ramp; when the source only closed the stream the label is
`stream ended` on the quiet ramp. **Neither surface's rendered words change** — this merge is free, and
saying so matters: the cheapest reconciliations are the ones a reviewer should be able to confirm cost
nothing.

**`disconnected` cannot be the failure word, because it cannot cover the dock's failures.** The dock's
`error` already carries *two* different things: a named server refusal (`{type:'error', message}` — a
missing provider, a failed spawn, [dock-state.mjs:45-52](../../../ui/src/board/terminal/dock-state.mjs#L45))
and a transport failure (`socket.onerror` → `"connection failed"`,
[TerminalDock.tsx:247-253](../../../ui/src/board/TerminalDock.tsx#L247)). A refused spawn on a perfectly
healthy socket is not a disconnection; calling it one is a lie. `error` is the superset, so `error` is the
word — **and it is only safe because the cause line is mandatory.** The transport case reads
`error` in the chip and **`disconnected — the stream dropped`** in the pane, so the fleet's word survives
where it was always doing its real work: naming the cause, not classing the state. This is the
chip/bar split V11 already fixed (*"the header state chip carries the STATE in the ramp's short
vocabulary; the BAR carries the reason"*), applied to one more pair of words.

**`unavailable` is not a failure and is never red.** See §The unavailable pane.

**`unknown` survives verbatim, and so does its reasoning.** An unrecognised state labels *itself*
([view-state.mjs:95-112](../../../ui/src/fleet/terminal-view/view-state.mjs#L95)) rather than impersonating
one it does recognise, and it is quiet, never a red error. Both existing modules already degrade this way
([dock-state.mjs:57-62](../../../ui/src/board/terminal/dock-state.mjs#L57) leaves the state unchanged on an
unknown control type); the merged ramp keeps both halves — an unknown *control frame* changes nothing, an
unknown *state* renders the word `unknown`.

### The transitions — the honest-state axis, unchanged and generalised

1. **Any byte → `streaming`**, from any state including `ended` and `error`. The source is asserting
   liveness again, and V9's rule is about never showing a liveness the source no longer asserts, not the
   reverse ([view-state.mjs:119-125](../../../ui/src/fleet/terminal-view/view-state.mjs#L119)).
2. **A clean close after `error` stays `error`.** The close that follows a transport failure is that
   failure's own tail; relabelling it `ended` would launder a failure into a clean finish
   ([view-state.mjs:127-134](../../../ui/src/fleet/terminal-view/view-state.mjs#L127)).
3. **An `{type:'exit'}` frame outranks a later close** — the exit code is the more specific fact.
4. **`unavailable` is entered before any socket exists and is never entered from a live state.** A pane
   that was live and then died is `error`, not `unavailable`. Unavailability is a statement about the
   *origin*, not about a session.
5. **`waiting` degrades to the V10 copy, never to a new state.** When a `mirror` pane has received zero
   bytes **and** its assignment settles through `assignmentChip` to `done`/`failed`, the chip reads
   `no live output` and the pane reads `no live output — assignment failed · reclaimed`
   ([view-state.mjs:141-173](../../../ui/src/fleet/terminal-view/view-state.mjs#L141)). Terminal-ness and
   the wording both come from the m35 chip, never from a hand-maintained list — the leak that rule was
   written to close. **This applies to `mirror` sources only**; a `local-pty` pane has no assignment.

### Colour is never the only signal — the four signals, ranked

1. **The text label.** Every state renders its word, always, in full, never behind a hover, never
   truncated, never abbreviated to fit. **A state with no visible word is a GAP.**
2. **The dot's fill and shape.** Filled for every state whose origin resolved; **dashed and hollow** for
   `unavailable` — the product's existing absent/not-yet primitive
   ([Fleet.tsx:1180](../../../ui/src/fleet/Fleet.tsx#L1180), [status.tsx:121](../../../ui/src/board/status.tsx#L121),
   and m45's unavailable nav item).
3. **Motion, on the two states that mean "expect this to change".** `connecting` and `streaming` pulse;
   **nothing else ever does.** In particular `waiting` carries no motion at all — that is
   [view-state.mjs:56-59](../../../ui/src/fleet/terminal-view/view-state.mjs#L56)'s explicit rule, so the
   honest cold-start can never render as a spinner-forever. Both pulses honour `prefers-reduced-motion`
   under the existing scoping conventions ([index.css:101-105](../../../ui/src/index.css#L101)).
4. **The mandatory cause line**, on `error` and on `unavailable`. A failure that does not name itself is
   half a signal.

Colour is the **fifth** thing, and it adds emphasis to four signals that already carry the meaning.
**And that ranking is what makes CORRECTION 1 a fix rather than a re-tint** — the two dots that miss 3:1
cost nothing precisely because signal 1 always renders.

---

## Read-only is a posture — declared by the HOST, and it must survive m46

**The ruling: the control takes two independent declarations, and neither derives from the other.**

| Axis | Declared by | Values | Decides |
|---|---|---|---|
| **`source`** | the session being opened | `local-pty` · `mirror` | the socket, whether a resize control frame exists, and therefore **fit vs scale** |
| **`posture`** | the **call site** (the host surface) | `interactive` · `read-only` | whether an input path exists **at all** |

**Why they are two axes and not one.** The same `mirror` source is interactive in the board dock and
read-only on the fleet card, today, in shipped code (the constraint table, row 3). An `isRemote` boolean
therefore cannot express what the product already does, and a control that derives posture from source
would either make the fleet page typeable — reversing arch-test invariant 4, which is **milestone 49's**
job and not this one's ([46/SPEC.md:86-89](SPEC.md#L86)) — or take typing away from the board dock, which
m42 deliberately added.

**What `read-only` looks like, and it is exactly four things:**

1. **No input path exists.** `disableStdin: true`, no `onData` registration, no `socket.send` — read-only
   **in fact**, not by our not wiring it up
   ([FleetTerminalView.tsx:31-46](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L31)).
2. **No type-into cursor.** `cursorBlink: false`, `cursorStyle: "underline"`
   ([:172-173](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L172)) against the interactive
   posture's `cursorBlink: true` ([TerminalDock.tsx:154](../../../ui/src/board/TerminalDock.tsx#L154)).
   **A blinking cursor is the universal "you can type here"; its absence is the second non-colour signal.**
3. **The `read-only` LABEL, on BOTH the inline and the expanded header**
   ([stream.mjs:105-107](../../../ui/src/fleet/terminal-view/stream.mjs#L105) names it so the component
   cannot ship the posture as styling only; the shared `identity` fragment at
   [FleetTerminalView.tsx:302-327](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L302) puts it
   in both). It renders as the existing quiet pill —
   `rounded border border-[#1e2a44] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400`
   — carrying its `title`: *"This view mirrors the worker's terminal. It cannot type: keystrokes never
   reach the worker."*
4. **No interactive-only chrome**: no provider picker, no restart control. Their absence is a
   consequence, never the signal.

> **The label is now LOAD-BEARING in a way it was not before, and this is the one place unification
> raises the stakes rather than lowering them.** V2's original wording rests on an absence — *"the row a
> read-write terminal would spend on an input box is ABSENT, not disabled."* Under one control **neither
> posture has an input row**: xterm takes keystrokes directly, and the interactive dock has no input box
> either ([TerminalDock.tsx:412-425](../../../ui/src/board/TerminalDock.tsx#L412)). So the absence no
> longer distinguishes anything, and **the `read-only` label plus the non-blinking cursor are the ONLY
> two signals of the posture.**
>
> Therefore: **the `read-only` label is mandatory and may never be dropped, truncated, abbreviated or
> hidden for space** — not at 390, not on a narrow card, not in fullscreen. It is `shrink-0`. If the
> header cannot fit at some width, something else yields (§S2's yield order). **A read-only pane rendered
> without its label is a GAP of the highest severity in this milestone**, because the failure it
> permits — an operator believing a keystroke reached a worker — is the failure the whole posture exists
> to prevent (T14; [38/DESIGN V2/V5 RATIONALE](../38_milestone_cross-machine-worker-execution/DESIGN.md):
> *"a worker terminal that LOOKS interactive but silently swallows keystrokes is a worse lie than no
> terminal"*).

**m46 ships S2 as `read-only` and that is not a placeholder.** Milestone 49 flips one declaration at one
call site; **the control does not change** and this document does not need amending when it does.

---

## Fit vs scale — a property of the SOURCE, and what the operator actually sees

Spike 44 sub-question 4, confirmed at source and adopted verbatim:

| `source` | far end | control frames | geometry |
|---|---|---|---|
| **`local-pty`** | a PTY the board server owns | `{type:'resize', cols, rows}` → `term.resize` | **FIT** |
| **`mirror`** | a worker's `claude` TUI, absolutely cursor-addressed | none | **SCALE**, pinned **80×24** |

**The rule the control encodes: fit ⇔ the source declares a resize control frame; scale otherwise.**
Keyed on the source's own declared capability — **never on transport, never on an `isRemote` boolean, and
never on which host it is rendered in.** A `local-pty` in fullscreen still fits (it gets *more columns*);
a `mirror` in the board dock still scales (it gets a *bigger picture of the same 80 columns*). That the
same source behaves identically in all three hosts is the clearest single demonstration that the
extraction worked.

### What the operator sees at each surface

- **S1, `local-pty` (fit).** The terminal *reflows*: dragging the dock taller adds rows, wider adds
  columns, and the far end is told exactly once per fit
  ([resize.mjs:23-30](../../../ui/src/board/terminal/resize.mjs#L23) — a no-change fit does not re-emit).
  Glyphs never change size. This is the ordinary terminal an operator expects.
- **S1, `mirror` (scale).** The 80×24 screen is scaled to the dock's box, aspect preserved, anchored
  top-left. Glyphs change size; the line count does not. **This is a change from today** — see §What
  visibly changes, change 5.
- **S2, `mirror` (scale down).** Into a 192px-tall panel a ≈640×408px screen lands at roughly
  **0.3–0.45×**. **Say plainly what that is for:** the peek answers *"is it moving, and what shape is it
  in"* — you read the TUI's **layout** (a prompt, a diff, a spinner block), not its words. The pane that
  answers *"what does it say"* is S3. A reviewer must **not** log unreadable glyphs in S2 as a defect;
  that is the designed trade, and it is why the expand control exists.
- **S3, `mirror` (scale up).** The same 80×24 screen, same instance, same socket, scaled to a comfortable
  reading size. This is where an operator reads the worker's output.
- **S3, `local-pty` (fit).** A full-viewport fitted terminal — the most useful terminal in the product,
  and it costs nothing because the rule already covers it.

### "Never cropped, aspect preserved" — and the letterbox band is EXPECTED, not a gap

The scale is `Math.min(boxWidth/intrinsicWidth, boxHeight/intrinsicHeight)`
([geometry.mjs:37-41](../../../ui/src/fleet/terminal-view/geometry.mjs#L37)) — the **min**, not the max,
so the whole screen always fits and **no column and no row is ever cut off.** The consequence is
arithmetic and must be stated so a reviewer does not report it: **at any host whose aspect ratio differs
from 80×24's, the leftover space is empty terminal background (`#0b0f14`) at the right and/or bottom
edge.** In a 1280-wide fullscreen overlay that band is roughly 250–300px on the right. **That band is
correct.** The alternatives are cropping (loses output), stretching (illegible glyphs) and re-fitting
(the unreadable scatter this geometry was built to fix,
[geometry.mjs:6-17](../../../ui/src/fleet/terminal-view/geometry.mjs#L6)). Paying with empty space is the
cheapest of the four. *(The **magnitude** in that sentence is wrong against the committed mock — the band
is ≈93px there. The rule is untouched; the number must be derived at review time. See
[`mocks/CONFORMANCE.md` §1c FLAG-2](mocks/CONFORMANCE.md).)*

**Anchoring: top-left, on every surface** — as it ships
([FleetTerminalView.tsx:158-163](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L158)). A
terminal's origin is its top-left and that is where a reader starts; a screen centred in one host and
anchored in another would be a second geometry rule for one control. *(Centring the fullscreen occupant
is a documented default the operator's mock may overrule — §Open questions.)*

### The zero-box guard is a designed state, not an edge case

A box measured before layout returns scale **1** — render at natural size, scale nothing
([geometry.mjs:38-39](../../../ui/src/fleet/terminal-view/geometry.mjs#L38)) — and the next tick re-fits.
The shell's post-present `onLayout` tick ([shell-bus.mjs:128-129](../../../ui/src/app/shell-bus.mjs#L128))
and the existing `requestAnimationFrame(fit)` exist for exactly this. **A render caught mid-tick showing
an unscaled screen is a capture artifact, not a finding** — the reviewer should ask for a re-capture
rather than log a gap.

---

## The unavailable pane — spike 44 sub-question 5, specified

**When.** The pane's **origin cannot be resolved**. **Three named causes** — two fixed by the spike, and
a third ruled here on 2026-08-08 (RULING 2, below) — and the wording of each is fixed in this table:

| Cause | Line 1 (verbatim) | Line 2 (recovery) |
|---|---|---|
| the workspace is not checked out on this machine | **`not checked out on this machine`** | the workspace path, mono, muted — the operator's own answer to *"where is it, then"* |
| the board's origin was asked for and did not answer | **`board unreachable`** | the command that opens it, mono: `aof work ui` — the same command m45's unavailable nav item carries in its `title` |
| **the surface was handed no fleet origin at all** *(ruled 2026-08-08)* | **`no fleet origin`** | the command that produces the missing server, mono: `aof mesh ui` |

> **RULING 2, 2026-08-08 — the third cause. A NEW COPY PAIR, not a mapping onto either existing one.**
>
> **The gap, and who raised it.**
> [`04/tasks/03_the-unavailable-pane-names-its-cause.feature`](stories/04_story_one-control-both-call-sites/tasks/03_the-unavailable-pane-names-its-cause.feature)
> row 3 — *"no fleet origin was ever handed"* — is the case ADR-004's origin seam creates and for which
> this section fixed no line. The build **invented no copy** and degraded to the `board unreachable` pair
> (STATE §Task 03 row 3). That was the right conservative move and the row's own comment routes it here:
> *"if this row cannot be satisfied with wording DESIGN fixes, it is a design gap raised against DESIGN
> §The unavailable pane and settled there."* **Settled here.**
>
> **Why a third cause and not a mapping — three reasons, each fatal on its own.**
>
> 1. **`board unreachable` names the wrong server, and its recovery is the wrong command.** The missing
>    server here is the **fleet**; the board is fine — it is the surface doing the rendering. A pane
>    carrying `board unreachable` / `aof work ui` tells the operator to start a server that is already
>    running and would not produce the missing one either way. **A refusal that names the wrong cause is
>    worse than a refusal that names none**, and it breaks rail 3 (*a pane never lies about its far end*)
>    in the one state that exists to keep that rail.
> 2. **`not checked out on this machine` says nothing that is known.** Nothing here is a statement about
>    the workspace; the workspace may be checked out right here.
> 3. **A generalised single "origin unresolved" pair cannot be written**, because **the recovery line is
>    half the copy pair** and the recovery differs per origin kind — `aof work ui` produces a board,
>    `aof mesh ui` produces the fleet. Collapsing the two would either drop the recovery (leaving a
>    refusal that names no way forward) or make it wrong for one of the two cases.
>
> **Why the word is `no fleet origin` and NOT `fleet unreachable` — the same discipline that made
> `streaming` beat `running`.** A label may only assert what the client can know. The client here asked
> the fleet nothing and observed nothing about it; it was simply **handed no origin**. The fleet may be
> running perfectly on this machine at this moment. `fleet unreachable` would assert a far-end state
> never observed — the exact lie §THE ONE STATE VOCABULARY rejects `running` for. `no fleet origin`
> asserts only the one fact that is true: **there is no origin.** *(`fleet origin unknown` is rejected
> for a second reason: `unknown` is already a state word in this ramp, and rail 5 forbids the control
> minting a second meaning for a word it already speaks.)*
>
> **Why it is `unavailable` and not `error`.** Nothing was ever connected. **An origin we do not HAVE is
> `unavailable`; an origin we have and cannot CONNECT to is `error`** — §The transitions, rule 4, and the
> boundary the feature's second scenario protects. No socket, no motion, nothing red.
>
> **THE EXACT STRINGS A BUILDER TYPES.** Nothing else about the pane changes — same centred dashed
> block, same two lines, same classes, same ramp row, same `opensSocket: false`:
>
> ```
> line 1 (cause)     no fleet origin
> line 2 (recovery)  aof mesh ui
> ```
>
> Line 1 on `mono text-xs text-zinc-400`; line 2 on `mono text-[11px] text-zinc-500` — **byte-identical
> in form to the other two causes**, per §What it looks like below. *(RAISED-2 in §The merged ramp
> applies to this line as it does to the other two; it is raised there, not ruled.)*
>
> **`aof mesh ui` is a product fact, not an invention.** It is the registered command that serves the
> fleet face (`src/commands/mesh-ui.mjs`, `aof mesh ui [--port 4181] …`), the exact parallel of
> `aof work ui` for the board, and it is the name [46/ARCHITECTURE ADR-004](ARCHITECTURE.md) already uses
> for this server (*"…which exist whether or not `aof mesh ui` is up"*). Starting it is also the real
> repair: ADR-004 threads the fleet origin into every board **that the fleet itself launches**.
>
> **Which surface can produce it.** The board dock hosting a **`mirror`** — ADR-004's one open case
> (*board page · `mirror` · needs the fleet's origin*) — when the board it renders on was handed
> `fleetOrigin: null` with `source: "none"`. **The fleet peek can never produce it**: S2 is same-origin
> with the fleet by construction. And the affordance that leads here exists whether or not a fleet is
> running, because it is fed by the board's own work rows — which is exactly why the pane must say
> something true rather than nothing.
>
> **This is COPY, not behaviour.** No new state, no new transition, no new control, no new visual form,
> no new token. The only thing the build gains is a third cause key beside the two it already has; **the
> key's name is the developer's, the two strings and which cause they attach to are fixed here.**
>
> **THREE IS THE TOTAL SET for m46, and a fourth is not silently mapped.** There is no
> `fleet origin handed but the fleet did not answer` cause — that is a **resolved** origin, so a failure
> to connect on it is `error` / `connection failed`. **A cause outside these three must never borrow one
> of these three pairs**; it is raised here exactly as row 3 was. *(Consequence a builder must act on:
> the conservative default that falls back to the `board unreachable` pair now has a wrong answer to fall
> back to, and defaulting is what produced this gap in the first place.)*
>
> **What this does NOT change, stated so a reviewer does not go looking.** DG-46-3 stands: **still no
> production producer in m46**, and this cause has none either. The locked `@manual` fixture-render
> scenario carries **two** Examples rows (board dock · fleet card) and gains none; §Render targets R-A
> and R-D capture two of the three causes. **A reviewer must not log the third cause's absence from any
> render as a finding** — it is unrendered by contract, and its `@uat` home travels to milestone 49 with
> the rest of DG-46-3. The committed mock draws the first two causes and is **silent** on this one, so
> this document governs it in full ([`mocks/CONFORMANCE.md` §6](mocks/CONFORMANCE.md)).

**What it looks like.**

- **The header renders in full** — `▣ TERMINAL`, the identity line, the posture pill, the state chip.
  An unavailable pane still **has an owner**, and in a grid of panes (m49) the operator must be able to
  tell *which* one is unavailable. **A pane that goes blank including its header is the failure mode this
  state exists to prevent.**
- **The state chip reads `unavailable`** with the **dashed hollow dot**, on `text-zinc-400`.
- **The byte area holds a centred dashed block** — the house's absent/not-yet primitive
  (`rounded-md border border-dashed`, [Board.tsx:458](../../../ui/src/board/Board.tsx#L458);
  [Fleet.tsx:1211](../../../ui/src/fleet/Fleet.tsx#L1211)) re-homed onto the dark chrome:
  `rounded-md border border-dashed border-[#1e2a44] px-4 py-3 text-center`, holding the cause on
  `mono text-xs text-zinc-400` and the recovery line beneath it on `mono text-[11px] text-zinc-500`.
  **Byte-identical for all three causes** — only the two strings differ.
- **No socket is opened**, and the structural half of that is the same one `stream.mjs` already keeps:
  an unresolved source yields no URL, so there is nothing to open
  ([stream.mjs:75-80](../../../ui/src/fleet/terminal-view/stream.mjs#L75)).

**What it is NOT.**

- **Never red.** `destructive` says *something broke*. A workspace that is not checked out on this
  machine is not broken; it is elsewhere. This is m25's stale-is-never-red rule and m45's honest-locality
  pattern, at a new address.
- **Never a spinner**, never `waiting for output`, never `connecting…`. Nothing is coming.
- **Never blank, never silently dead** — the spike's own words.
- **Never a disabled-looking live pane.** There is no dimmed terminal underneath; there is no terminal.

**And it has no producer in m46** — DG-46-3. It is rendered from a fixture for the conformance review.

---

## Collapse is not Hide — two operations that must never share a form

They look alike and they cost differently, so the **form** must differ and the **label** must say which:

| | S1 — collapse | S2 — Hide |
|---|---|---|
| what it does | hides the byte area with CSS | **closes the socket** |
| what survives | the WebSocket, the PTY, the running agent, the scrollback ([TerminalDock.tsx:137-141](../../../ui/src/board/TerminalDock.tsx#L137), [:409-412](../../../ui/src/board/TerminalDock.tsx#L409)) | nothing — the mirror is ephemeral (ADR-014), so re-watching starts an **empty** pane |
| form | a **chevron** icon (`ChevronDown` / `ChevronUp`) | a **worded** toggle: `Watch terminal →` / `Hide terminal` |
| ends the session | **no.** Only `✕` does | n/a — there is no session to end, only a subscription |

**The rule: a chevron means layout-only; a worded toggle means subscribe/unsubscribe.** The control must
never offer a chevron that performs S2's unsubscribe, nor a worded toggle that performs S1's free
collapse. This costs nothing — it is what both surfaces already do — and it is written down because one
control is exactly the circumstance under which two operations quietly acquire one button.

**Corollary, kept verbatim from today:** collapsing S1 must **not** tear the session down. The byte area
stays mounted and is hidden with `hidden`; `collapsed` is deliberately not a dependency of the session
effect. A build in which collapse kills the agent is a GAP, not an implementation detail.

---

## What visibly changes, and what must not

This is an extraction. Everything below is a **knowing** change, recorded so a conformance reviewer can
tell a designed change from a regression — exactly as m45 did for its three. Each row says what forces it.

| # | Change | Where | Forced by | Kind |
|---|---|---|---|---|
| **1** | The state word **`running` becomes `streaming`** | S1 | one vocabulary (§THE ONE STATE VOCABULARY) | reconciliation-forced |
| **2** | The **`streaming` dot pulses** on the board dock (it did not) | S1 | one ramp — motion is a non-colour signal and the mirror already carries it | reconciliation-forced |
| **3** | A connected-but-silent local session reads **`waiting for output`** instead of sitting on `connecting…` | S1 | `connecting` ≠ `waiting`; today's dock has no honest word for it | reconciliation-forced (**and it fixes a lie**) |
| **4** | A dropped mirror stream reads **`error`** in the chip with **`disconnected — the stream dropped`** as its cause line, instead of `disconnected` in the chip | S2, S3 | `disconnected` cannot cover a named far-end refusal | reconciliation-forced |
| **5** | A **`mirror` opened in the board dock is scaled** (aspect preserved, never cropped) instead of painting at natural 80×24 and being cropped by the dock's height | S1 | geometry is a property of the source, applied in **every** host | reconciliation-forced (**and it fixes a crop**) |
| **6** | The dock's **error message stops overprinting the top of the viewport** and becomes the opaque in-flow bar at the bottom of the byte area | S1 | V11, applied to the surface that never had it | reconciliation-forced (**and it fixes an overprint**) |
| **7** | The fullscreen overlay's message bar becomes **in-flow** instead of `absolute … bottom-0` | S3 | V11, one rule on all three surfaces | reconciliation-forced |
| **8** | The **`remote · <nodeId>` badge is retired**; the identity line already says `→ <nodeId>` | S1 | a badge that repeats the identity says it twice (m45's wordmark reasoning) | **ruled** — mock may overrule |
| **9** | The dock's header type steps **`text-xs` → `text-[11px]`** | S1 | one control, one chrome ramp; 11px is the size that survives the narrowest host | **ruled** — mock may overrule |
| **10** | Every header control reaches a **≥24×24 hit target** by padding; the fleet card's panel header grows by **~6px** | S2, S3 | WCAG 2.2 SC 2.5.8 | a11y-forced |
| **11** | The board dock **gains an expand-to-fullscreen control** | S1 | SPEC scopes fullscreen into the control; the affordance is per-host and S1 declares it on | **ruled** — PO may decline (declare it off; nothing else moves) |
| **12** | The dock's drag-resize **max and default clamp against the shell's content box**, not the viewport | S1 | ADR-005 point 7; a viewport clamp is wrong by exactly the chrome height | shell-forced |
| **13** *(added 2026-08-08)* | The **`streaming` WORD** renders in the lighter teal **`hsl(174 58% 52%)`**; the **dot does not move** | S1, S2, S3 | the inherited `text-primary` measures **3.29:1** on `#0f1629` and fails AA for an 11px word — §The merged ramp CORRECTION 1 | **a11y-forced** (**and it fixes a measured contrast failure**) |

**And this is the list of things that must NOT change:**

- **No colour, hex, radius or font changes.** `#0b0f14`, `#0f1629`, `#1e2a44`, `#0b1120`, `#d7dde3`, the
  `var(--font-mono, …)` stack at `fontSize: 13`, `.mono`, `rounded`/`rounded-md` — all identical.
  *(Amended 2026-08-08 by CORRECTION 1: **exactly one** value joins the palette — the `streaming` word's
  `hsl(174 58% 52%)`, which is change 13 and a measured a11y fix. The five hexes, the radius and the type
  stack are untouched, and the count is stated so the next reader can check it.)*
- **The board's layout with the dock open is identical to today** (DG-46-1).
- **The fleet card's panel is still 192px total, still collapsed by default, still opens no socket until
  Watch** (V12), and its **total height is still constant** when a stream ends (V11). *(The mock puts the
  192 on the byte-area **column**, header above — total ≈232px. What a reviewer measures is the
  **constancy**, not the 192; [`mocks/CONFORMANCE.md` §1c FLAG-1](mocks/CONFORMANCE.md).)*
- **A card with no resolvable (nodeId, sessionId) tuple still renders NO panel at all** — not an empty
  frame, not a disabled toggle, and **not** an `unavailable` pane (ADR-014 invariant 4 / V1).
- **The fleet page still wires no input source** — arch-test invariant 4 holds through this milestone
  ([46/SPEC.md:77-84](SPEC.md#L77)).
- **The provider picker keeps radio semantics** — `role="radiogroup"`, `role="radio"`, exactly one
  selected, a teal dot on the selected segment, and the segments locked while a session is live
  ([TerminalDock.tsx:327-361](../../../ui/src/board/TerminalDock.tsx#L327)). *(Its lock tooltip's copy
  follows the ramp: "Stop the session to switch provider" — the word `running` is no longer a state.)*
- **The `▣ TERMINAL` lockup, the `read-only` pill, the dot+label state indicator and the `Watch terminal
  →` copy are unchanged** in form, glyph and wording.

---

## Surfaces

All three are hosts of one control, so the control's anatomy is specified **once** and each surface's
checklist declares which regions it holds and how.

### The control's anatomy — regions in order (all three surfaces)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ═════ drag handle (S1 only) — role="separator", h-1.5, top edge ═════        │  C0
├──────────────────────────────────────────────────────────────────────────────┤
│ ▣ TERMINAL │ 46/02 → aof-wsl · session 7f3a │ read-only │ ◉ streaming │ ⤢ ⌄ ✕ │  C1
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  the byte area — xterm on #0b0f14. FIT (local-pty) or SCALE (mirror, 80×24). │  C2
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ stream ended — opaque, in-flow, paid for OUT OF C2. Non-live + full pane only.│  C3
└──────────────────────────────────────────────────────────────────────────────┘
   C4 — the input region: STRUCTURALLY ABSENT, in BOTH postures, on all three.
```

**C0 — the host frame.** Per surface. S1: `flex flex-col border-t border-[#1e2a44] bg-[#0f1629]
text-zinc-200`, full content width, with the drag handle
(`h-1.5 w-full shrink-0 cursor-row-resize bg-transparent hover:bg-primary/40`, `role="separator"`,
`aria-orientation="horizontal"`, `aria-label="Resize terminal dock"` —
[TerminalDock.tsx:293-303](../../../ui/src/board/TerminalDock.tsx#L293)). S2:
`mt-3 flex flex-col rounded-md border border-[#1e2a44] bg-[#0f1629] text-zinc-200`
([FleetTerminalView.tsx:332](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L332)). S3:
`fixed inset-0 z-50 flex flex-col bg-[#0b0f14] text-zinc-200`.

**C1 — the header.** One row, `flex min-w-0 flex-wrap items-center`, left → right, in this exact order:

1. **The lockup** — `▣` (`aria-hidden`) + `TERMINAL`, `text-[11px] font-semibold tracking-wide
   text-zinc-300`, `shrink-0`.
2. **The identity line** — `mono min-w-0 truncate text-[11px] text-zinc-400`, with the full value in
   `title`. **One rule, source-shaped filling:** it names the **owner ref** always, plus the **far end**
   (`→ <nodeId>`) and the **session** (`session <id>`) when the source has them. A `mirror` therefore
   reads `46/02 → aof-wsl · session 7f3a`
   ([stream.mjs:102-103](../../../ui/src/fleet/terminal-view/stream.mjs#L102)); a `local-pty` reads
   `item 46/02` ([TerminalDock.tsx:363-371](../../../ui/src/board/TerminalDock.tsx#L363)). **A terminal
   with no nameable owner is never rendered** (V1, enforced at
   [stream.mjs:91-94](../../../ui/src/fleet/terminal-view/stream.mjs#L91)).
3. **The posture pill** — `read-only`, `shrink-0`, on read-only hosts only. Mandatory, never yields.
4. **The provider picker** — interactive `local-pty` hosts only. Radio semantics, exactly one selected,
   locked while live.
5. **The state chip** — `flex shrink-0 items-center gap-1.5 text-[11px]`: the dot, then the word.
6. **`ml-auto` control cluster**, in this order: **restart** (`RotateCw`, on `ended`/`error` only) ·
   **expand / exit fullscreen** (`Maximize2` / `Minimize2`) · **collapse chevron** (S1) or **worded
   toggle** (S2) · **close `✕`** (S1). Every control ≥24×24, quiet: `text-zinc-400`,
   `hover:bg-[#1e2a44] hover:text-zinc-100`, no weight above the identity line (V12's hierarchy clause).

**Reading order is binding: identity > posture > state > expand > toggle.** A control that outweighs the
stream's own name inverts a monitor into a control (V12; the measured regression at
[index.css:57-77](../../../ui/src/index.css#L57) is what that costs).

**C2 — the byte area.** `relative min-h-0 flex-1 bg-[#0b0f14]`, the xterm host inset
(`absolute inset-0 overflow-hidden`, `p-2` inline / `p-3` fullscreen). Fit or scale per source.
Dimmed `opacity-60` in every non-live state whose pane is full — **and the dimming never travels alone**
(V6): the label always carries the meaning.

**C3 — the non-live bar.** `shrink-0 border-t border-[#1e2a44] bg-[#0f1629] px-3 py-1.5` holding
`mono text-xs` in the state's own text class. **Opaque, in flow, at the bottom of the byte area, paid for
out of C2** — so xterm re-fits into the smaller box and **no glyph is ever covered**, and the host's total
height does not change ([FleetTerminalView.tsx:389-397](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L389);
V11). **Two treatments, and the split is by whether the pane can be overprinted at all:**

| Pane | States | Treatment |
|---|---|---|
| **empty by definition** — nothing has ever been painted | `waiting`, `no live output` with zero bytes | the message sits **top-left inside C2**, where the first line will appear ([:380-387](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L380)) |
| **full** — the operator's last output line is on screen | `ended`, `error` | the **opaque in-flow bar** |
| **no pane** | `unavailable` | the centred dashed block (§The unavailable pane) |

**C4 — the input region: there is none, in either posture, on any surface.** xterm takes keystrokes
directly. Stated explicitly because its absence is no longer a posture signal — see §Read-only is a
posture. **A build that adds an input row, in either posture, is a GAP.**

---

### S1 — the board dock

- **Committed mock:** [`mocks/s1-board-dock.png`](mocks/s1-board-dock.png) — **PENDING,
  operator-supplied.** Until it lands, the checklist below is the baseline. *(Superseded 2026-08-08: the
  committed mock is [`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html) and the
  binding value table for this surface is [`mocks/CONFORMANCE.md` §2·S1](mocks/CONFORMANCE.md). The
  checklist below still binds wherever the mock is silent — enumerated at that file's §6.)*
- **Host:** the board, `content:fixed` ([45/DESIGN](../45_milestone_ui-app-shell-routing/DESIGN.md): *"a
  surface that hosts a terminal must be `content:fixed`"*). Region home **`overlay`**, rung **`z-30`**
  (ADR-005 [Build-3]; [shell-layout.mjs:616-617](../../../ui/src/app/shell-layout.mjs#L616)), with the
  published dock inset of **DG-46-1** so nothing is covered.
- **Declares:** `posture: interactive` · `source: local-pty | mirror` · drag-resize **on** · fullscreen
  **on** (change 11) · collapse **chevron** · close `✕`.

#### The height rule (derived from the binding 520-tall constraint)

Let `box = 100dvh − var(--aof-shell-chrome-height)` — the shell's content height, in `dvh`, never `vh`.

| | Value | Source |
|---|---|---|
| min | **48px** | `DOCK_MIN_HEIGHT` ([TerminalDock.tsx:55](../../../ui/src/board/TerminalDock.tsx#L55)) |
| max | **`floor(box / 2)`** | today's `window.innerHeight / 2` ([:120](../../../ui/src/board/TerminalDock.tsx#L120)), re-based off the viewport onto the shell box |
| default | **`min(280, floor(box / 2))`** | `DOCK_DEFAULT_HEIGHT` ([:56](../../../ui/src/board/TerminalDock.tsx#L56)), **clamped by the same rule as the drag** |

**Why the default needs the clamp too, and it is not defensive extra.** At the desktop window (760×520)
the box is **432px**, so max is **216px** — and the shipped default of 280 exceeds it. An unclamped
default opens, on the operator's most common window, at a height the operator is not allowed to drag it
to. One rule for both is the fix.

#### Binding checklist (mandatory — this IS the baseline until `mocks/s1-board-dock.png` lands)

**Layout regions, in order, and who owns scroll in each:**

| # | Region | Height | Scroll owner |
|---|---|---|---|
| **C0a** | Drag handle, top edge | `h-1.5` (6px), absent while collapsed | none |
| **C0b** | The dock frame | the height rule above; `h-auto` while collapsed | none |
| **C1** | Header | content (`px-4 py-2`), one row at every documented width | none — **never scrolls, never wraps to two rows** |
| **C2** | Byte area | `min-h-0 flex-1`; `hidden` (not unmounted) while collapsed | **xterm's own scrollback**, and nothing else |
| **C3** | Non-live bar | content (`px-3 py-1.5`), **paid for out of C2** | none |

**Components each region holds:**

- **C0a** — one `role="separator"` strip, `aria-orientation="horizontal"`,
  `aria-label="Resize terminal dock"`, `cursor-row-resize`, `hover:bg-primary/40`. Absent while collapsed.
- **C1**, left → right: `▣ TERMINAL` · **identity** (`item <ref>` for `local-pty`, `<ref> → <nodeId> ·
  session <id>` for `mirror`) · **provider picker** (`local-pty` only; `role="radiogroup"`, one
  `role="radio"` per provider, `aria-checked`, teal dot on the selected one, `disabled` while
  `streaming` with the `title` naming why) · **state chip** · `ml-auto` **restart** (`ended`/`error`
  only) · **expand** · **collapse chevron** · **close `✕`**. **No `remote ·` badge** (change 8).
- **C2** — exactly one xterm host. Fitted for `local-pty`; scaled top-left for `mirror`. When no session
  is bound, the empty line instead: `mono text-xs text-zinc-400`, centred —
  *"No session. Press Run agent on an item."*
  ([TerminalDock.tsx:416-418](../../../ui/src/board/TerminalDock.tsx#L416)).
- **C3** — zero or one bar. Never two.

**States (empty / loading / error / populated), mapped onto the merged ramp:**

- **empty ≡ NO SESSION BOUND** — state `idle`, chip `idle`, C2 holds the centred empty line, no socket,
  no provider lock. **Not** an error and **not** a loading state.
- **loading ≡ TWO DISTINCT SUB-CASES, and they must look different.**
  - `connecting` — pulsing `bg-secondary` dot, `connecting…`, C2 empty. The socket is not yet open.
  - `waiting` — still `bg-muted-foreground`, **no motion**, `waiting for output`, message top-left in C2.
    The socket **is** open and the PTY has said nothing.
- **error ≡ `error`** — `bg-destructive` dot, chip `error`, and **the cause line is mandatory** in C3
  (full pane) or top-left in C2 (empty pane). Plus **`ended` with a non-zero exit code**, which reads
  `exited (N)` on the same failure ramp. **`unavailable` is NOT in this bucket** — it is quiet and
  dashed, never red.
- **populated ≡ `streaming`** — pulsing `bg-primary` dot, `streaming`, C2 full and undimmed, no bar.
  Also **`ended`**: C2 full at `opacity-60` with the bar reading `stream ended` / `exited (0)` /
  `exited (N)`, and the **restart** control appearing in C1.
- **plus `collapsed`** — a steady state, not a variant: C1 only, C2 hidden but **mounted**, the session
  **alive**, the chevron flipped to `ChevronUp`.
- **plus `unavailable`** — the centred dashed block. On this surface the cause is
  `not checked out on this machine` (fixture-rendered, R-A) or, for a board-hosted `mirror` handed no
  fleet origin, **`no fleet origin`** (§The unavailable pane RULING 2 — unrendered in m46 by contract).

**Design ramp:** §The design ramp, below. **No token, colour, size or glyph on this surface is new**
except the one CORRECTION 1 names and counts.

---

### S2 — the fleet card peek

- **Committed mock:** [`mocks/s2-fleet-card-peek.png`](mocks/s2-fleet-card-peek.png) — **PENDING,
  operator-supplied.** Until it lands, the checklist below is the baseline. *(Superseded 2026-08-08: the
  committed mock is [`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html) and the
  binding value table for this surface is [`mocks/CONFORMANCE.md` §2·S2](mocks/CONFORMANCE.md).)*
- **Host:** an assignment card inside `<Fleet>`, a sibling below the affordance row
  ([Fleet.tsx:759](../../../ui/src/fleet/Fleet.tsx#L759)) — never nested inside the drill-in button.
- **Declares:** `posture: **read-only**` · `source: mirror` · drag-resize **off** · fullscreen **on** ·
  worded **Watch/Hide** toggle · no close.

**Why drag-resize is off here and it is not an omission.** A card that grows reflows every sibling in its
stretched grid row (DG-9). The panel's **total height is a constant 192px** and V11 pins it. The
affordance for "I want more of this" is **expand**, not drag.

#### Binding checklist (mandatory — this IS the baseline until `mocks/s2-fleet-card-peek.png` lands)

**Layout regions, in order, and who owns scroll in each:**

| # | Region | Height | Scroll owner |
|---|---|---|---|
| **C0** | The panel frame | header + (192px when open, 0 when collapsed) | none |
| **C1** | Header | content (`px-3 py-1.5`), **may wrap** (`flex-wrap gap-x-2 gap-y-1`) — this is the one host where wrapping is permitted | none |
| **C2** | Byte area | `min-h-0 flex-1` inside the fixed `h-48` (192px) column | xterm's own scrollback |
| **C3** | Non-live bar | content, **paid for out of C2** — 163 + 29 = 192, constant | none |

**Components each region holds:**

- **C1**, left → right: `▣ TERMINAL` · **identity** (`<ref> → <nodeId> · session <id>`, truncating, full
  value in `title`) · **`read-only` pill** (mandatory, `shrink-0`, `title`-carrying) · **state chip**
  (only while open) · `ml-auto` **expand** (only while open) · **worded toggle**
  (`Watch terminal →` / `Hide terminal`). **No provider picker** (there is nothing to pick — the session
  already exists, on another machine). **No restart** (this host cannot restart another machine's
  session). **No close.**
- **C2** — one xterm host at 80×24, scaled **down**, anchored top-left.
- **C3** — zero or one bar.

**The yield order when C1 cannot fit** (390, or a long node id). Discrete drops, never a shrink factor —
the m38 DG-13/DG-16 lesson: *no two elements may occupy the same pixels, and a lower-priority element
gives up space rather than being overprinted.*

1. the **`session <id>`** tail of the identity — dropped **whole**, with its separator (the ref and the
   node still identify the pane);
2. the **`▣ TERMINAL`** lockup word — the glyph stays;
3. the header **wraps** to a second line (`flex-wrap`, already declared).

**Never dropped, at any width:** the **`read-only` pill**, the **state chip**, the **owner ref**, the
**toggle**.

**States (empty / loading / error / populated):**

- **empty ≡ COLLAPSED (at rest) — and it is the default.** C1 only: identity + `read-only` + `Watch
  terminal →`. **No state chip, no socket, no bytes.** The posture is legible **before** the operator
  opens anything (V12). *(And a card with no resolvable tuple renders **no panel at all** — not this
  state.)*
- **loading** — `connecting` then `waiting for output` (top-left in C2), exactly as S1. Plus the V10
  variant: zero bytes on a **terminal** assignment reads chip `no live output` and pane
  `no live output — assignment failed · reclaimed`.
- **error ≡ `error`** — chip `error`, bar `disconnected — the stream dropped`, pane at `opacity-60`.
- **populated ≡ `streaming`** — pulsing teal dot, `streaming`, C2 full and undimmed. Plus **`ended`** —
  `opacity-60` + the bar reading `stream ended`, at **constant total height**.
- **plus `unavailable`** — the centred dashed block, cause `board unreachable`. **DG-46-3: no producer in
  m46; judged from a fixture.** *(This surface can never carry `no fleet origin`: it is same-origin with
  the fleet by construction — §The unavailable pane RULING 2.)*

**Design ramp:** §The design ramp, below. **`read-only` is the load-bearing mark on this surface.**

---

### S3 — the expand-to-fullscreen overlay

- **Committed mock:** [`mocks/s3-fullscreen-overlay.png`](mocks/s3-fullscreen-overlay.png) — **PENDING,
  operator-supplied.** Until it lands, the checklist below is the baseline. *(Superseded 2026-08-08: the
  committed mock is [`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html) and the
  binding value table for this surface is [`mocks/CONFORMANCE.md` §2·S3](mocks/CONFORMANCE.md).)*
- **Host:** the shell's **`shell:fullscreen`** slot, rung **`z-50` — the top rung, and the occupant is its
  ONLY occupant** ([45/DESIGN DG-45-2 and §`shell:fullscreen`](../45_milestone_ui-app-shell-routing/DESIGN.md)).
  It is reached through `requestFullscreen({ id, label, node, home, opener, claimsEscape, onLayout })`
  ([shell-bus.mjs:115-135](../../../ui/src/app/shell-bus.mjs#L115)) — **not** a component-owned
  `createPortal(document.body)`.

**The five inherited clauses, restated because they are what make S3 look like nothing new:**

1. **The occupant is the existing idiom, verbatim** — `fixed inset-0 flex flex-col`, `role="dialog"`,
   `aria-modal="true"`, an `aria-label` naming the session, and the exit control at `ml-auto` in its own
   header ([FleetTerminalView.tsx:409-428](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L409)).
   m46 inherits it; it does not invent one.
2. **The chrome is hidden, not overlaid.** The shell's bars are gone — a translucent overlay would put a
   light-theme bar behind a dark terminal.
3. **One xterm, one socket, through both transitions.** The shell **adopts the live node** and returns
   the **same** node to `home` on dismiss ([Build-1]). **Presenting must not re-subscribe** — the mirror
   is ephemeral, so a re-subscribe shows an **empty pane**, which is the visible tell that this clause
   was broken.
4. **`Esc` AND a visible control, always both** — and **an interactive occupant may claim `Escape`**
   ([Build-2]), because `Esc` is a live keystroke for the `claude` TUI on the far end. **Consequence,
   binding: the visible exit control is ALWAYS visible.** Never hover-revealed, never auto-hiding, never
   fading with inactivity — for a claiming occupant it is the *only* exit.
5. **Fullscreen is NOT a route.** No path, no query param, no history entry; Back is never the way out.

#### Binding checklist (mandatory — this IS the baseline until `mocks/s3-fullscreen-overlay.png` lands)

**Layout regions, in order, and who owns scroll in each:**

| # | Region | Height | Scroll owner |
|---|---|---|---|
| **C0** | The overlay | `fixed inset-0`, `z-50`, `bg-[#0b0f14]` | none — the overlay itself never scrolls |
| **C1** | Header | content (`px-4 py-2`), `bg-[#0f1629] border-b border-[#1e2a44]` | none |
| **C2** | Byte area | `min-h-0 flex-1`, `p-3` | xterm's own scrollback |
| **C3** | Non-live bar | content, **in flow**, paid for out of C2 (change 7) | none |

**Components each region holds:**

- **C1** — **the same `identity` fragment as the inline header, verbatim**: `▣ TERMINAL` · identity ·
  `read-only` pill (read-only sources) · state chip. Then `ml-auto` **exit fullscreen** (`Minimize2`),
  always visible, ≥24×24. **The two surfaces speak one identity and the posture rides both headers** —
  that is V1 and V2/V6, and it is what makes fullscreen feel like the same pane rather than a new one.
- **C2** — the **adopted** xterm host. `local-pty` **fits** the overlay (more rows and columns, one
  resize frame per fit); `mirror` **scales up** the fixed 80×24, aspect preserved, anchored top-left,
  with the letterbox band at the right and/or bottom (§Fit vs scale).
- **C3** — zero or one bar, in flow.

**States:** identical to the host that opened it — the overlay renders the **same** descriptor, from the
**same** instance. There is no fullscreen-only state and no fullscreen-only copy. Its four states are
therefore: **empty ≡** *unreachable* (fullscreen cannot be entered from a collapsed/idle pane);
**loading ≡** `connecting` / `waiting`; **error ≡** `error` (cause mandatory, in the in-flow bar);
**populated ≡** `streaming` and `ended`.

**Design ramp:** identical to the inline surfaces. **Fullscreen is a bigger box, not a different look.**

---

## The design ramp — every value read at source, none invented

| Element | Value | Read at |
|---|---|---|
| **Byte viewport** | `#0b0f14` — also the xterm `theme.background` | [TerminalDock.tsx:158](../../../ui/src/board/TerminalDock.tsx#L158), [:412](../../../ui/src/board/TerminalDock.tsx#L412); [FleetTerminalView.tsx:176](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L176), [:369](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L369) |
| **Chrome (header + non-live bar)** | `#0f1629` | [TerminalDock.tsx:287](../../../ui/src/board/TerminalDock.tsx#L287); [FleetTerminalView.tsx:332](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L332), [:394](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L394) |
| **Borders / dividers / pill outlines** | `#1e2a44` | [TerminalDock.tsx:287](../../../ui/src/board/TerminalDock.tsx#L287), [:306](../../../ui/src/board/TerminalDock.tsx#L306); [FleetTerminalView.tsx:312](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L312) |
| **Picker well** | `#0b1120` | [TerminalDock.tsx:330](../../../ui/src/board/TerminalDock.tsx#L330) |
| **Terminal foreground** | `#d7dde3` | both xterm `theme.foreground` |
| **Text steps** | `text-zinc-200` (body) · `text-zinc-300` (lockup, resolved values) · `text-zinc-400` (quiet, controls, muted states) · `text-zinc-500` (field labels: `provider:`, `item` — **and see RAISED-1/RAISED-2**) · `text-zinc-100` (hover only) | [TerminalDock.tsx:287](../../../ui/src/board/TerminalDock.tsx#L287), [:307](../../../ui/src/board/TerminalDock.tsx#L307), [:326](../../../ui/src/board/TerminalDock.tsx#L326), [:363](../../../ui/src/board/TerminalDock.tsx#L363), [:385](../../../ui/src/board/TerminalDock.tsx#L385) |
| **State tokens** | **dots:** `bg-primary` (teal `hsl(174 72% 27%)`) · `bg-secondary` (`hsl(214 18% 88%)`) · `bg-muted-foreground` (`hsl(218 9% 38%)`) · `bg-destructive` (`hsl(0 73% 43%)`). **words:** `text-zinc-400` · `text-red-400` on dark · and the `streaming` word **`hsl(174 58% 52%)`** — **CORRECTION 1, 2026-08-08, superseding `text-primary` here and in §The merged ramp** | [TerminalDock.tsx:449-466](../../../ui/src/board/TerminalDock.tsx#L449); [index.css:10-19](../../../ui/src/index.css#L10); the `streaming` word from the committed mock, adopted by PO ruling |
| **Absent / unavailable** | `border-dashed` + `border-muted-foreground/40` (dot) and `border-[#1e2a44]` (block), `bg-transparent` | [Fleet.tsx:1180](../../../ui/src/fleet/Fleet.tsx#L1180); [status.tsx:121](../../../ui/src/board/status.tsx#L121); [TerminalDock.tsx:353](../../../ui/src/board/TerminalDock.tsx#L353) |
| **Terminal type** | `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)` at `fontSize: 13` | both `new Terminal({ … })` |
| **Chrome type** | header + identity + state `text-[11px]` · pills `text-[10px] font-semibold uppercase tracking-wide` · messages `mono text-xs` · ids/refs/messages carry `.mono` (`ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace`) | [FleetTerminalView.tsx:305](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L305), [:312](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L312), [:385](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L385); [index.css:79-83](../../../ui/src/index.css#L79) |
| **Radius** | `rounded` / `rounded-md` (`--radius: 0.5rem`) | [index.css:24](../../../ui/src/index.css#L24) |
| **Motion** | `animate-pulse` on `connecting` and `streaming` **only** | [TerminalDock.tsx:453](../../../ui/src/board/TerminalDock.tsx#L453); [FleetTerminalView.tsx:320](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L320) |
| **Z rungs** | dock `z-30` · fullscreen `z-50` (alone) | [shell-layout.mjs:613-638](../../../ui/src/app/shell-layout.mjs#L613) |

**Hierarchy, binding:** identity > `read-only` > state > expand > toggle. **Nothing in C1 carries weight
above the identity line** except the `▣ TERMINAL` lockup and the `read-only` pill, both of which are
`font-semibold` today and stay so.

---

## Accessibility requirements (expected to be honoured)

The automated lane is **opt-in per 07/ADR-004 and currently off**
([acd-a11y-config-schema.test.mjs:1-8](../../../test/arch/acd-a11y-config-schema.test.mjs#L1)). These
therefore bind the **design-conformance review and a `@uat` visual review** regardless; if the lane is
switched on, axe-core-via-Playwright (QA-owned) checks them at **WCAG 2.1 AA** plus SC 2.5.8 (2.2).

1. **Every state carries its text label** — the first of four non-colour signals (§Colour is never the
   only signal). A dot with no word is a GAP.
2. **The `read-only` label is mandatory, is TEXT, and never yields.** It carries its explanatory `title`.
   This is the highest-severity a11y-and-safety rule in the milestone (§Read-only is a posture).
3. **State changes are announced.** The state chip's region is `aria-live="polite"`, so a screen-reader
   user learns that a session connected, ended or failed. **This has no precedent in either
   implementation and must be built, not inherited.** `polite`, not `assertive`: the transitions are
   discrete and few (four or five per session), and interrupting a user mid-sentence for `streaming` would
   be worse than late news.
4. **The pane's accessible name names the SESSION, not the widget class.** `aria-label="Terminal dock"`
   ([TerminalDock.tsx:288](../../../ui/src/board/TerminalDock.tsx#L288)) is a widget class and does not
   distinguish two open panes; the fleet's `Read-only terminal view for <label>`
   ([FleetTerminalView.tsx:334](../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L334)) is the
   pattern. One rule: **`<posture> terminal for <identity>`**, on the inline region and the fullscreen
   dialog alike.
5. **The provider picker keeps real radio semantics** — `role="radiogroup"` with an `aria-label`,
   `role="radio"` + `aria-checked` per segment, exactly one checked, and the lock carries a `title`
   naming why. The selected dot is decoration (`aria-hidden`); `aria-checked` is the programmatic signal.
6. **The fullscreen occupant** traps focus, declares `role="dialog"` + `aria-modal="true"` + an
   `aria-label` naming the session, and **returns focus to the opener** — never the document body
   ([shell-bus.mjs:126](../../../ui/src/app/shell-bus.mjs#L126)). `Esc` **and** a visible control; when
   the occupant claims `Esc` ([Build-2]) the visible control is the only exit and is therefore
   **always visible**.
7. **Target size ≥24×24 CSS px** (SC 2.5.8) for every header control — **achieved by padding, never by
   weight or fill**, so V12's hierarchy survives. The dock's `h-7 w-7` (28px) already passes; the fleet
   card's `px-1.5 py-0.5` / `px-2 py-0.5` around an 11px line does not (~18–19px tall) and grows
   (change 10).
8. **The drag handle is keyboard-operable.** It is already `role="separator"` with
   `aria-orientation="horizontal"` and an `aria-label`; a separator that only a pointer can move is a
   control a keyboard user cannot reach. It must be focusable, and **↑/↓ resize it** within the clamp.
   **No precedent today — this must be built.**
9. **Focus order follows visual order:** drag handle → header controls in C1's declared order → the
   terminal. The visible focus indicator uses `--color-ring` ([index.css:23](../../../ui/src/index.css#L23));
   do not remove the UA outline without replacing it.
10. **The non-live bar is `role="status"`, not `role="alert"`** — a stream ending is information, not an
    emergency. It is **never clipped and never truncated**; if it cannot fit, it wraps.
11. **The unavailable block names its cause in text**, plus the recovery command. `aria-disabled` is not
    used — there is no control to disable; there is a labelled absence. **Three named causes**
    (§The unavailable pane); a fourth is raised, never mapped onto one of the three.
12. **Motion is confined to two states** and honours `prefers-reduced-motion` under the existing scoping
    conventions ([index.css:101-105](../../../ui/src/index.css#L101)). With motion reduced, the label and
    the dot's colour still carry `connecting` and `streaming` — **the pulse is never the only difference
    between two states.**
13. **Contrast on the dark chrome.** `text-zinc-300` and `text-zinc-400` on `#0f1629` carry the header;
    `text-red-400` is the dark-surface variant of `destructive` for exactly this reason
    ([TerminalDock.tsx:458](../../../ui/src/board/TerminalDock.tsx#L458)). `text-zinc-500` is used **only**
    for non-essential field labels (`provider:`, `item`) and **never** for a state word, a cause, or the
    `read-only` label.
    **MEASURED 2026-08-08 — this clause asked for numbers for a whole milestone and did not get them; it
    has them now, in §The merged ramp.** `text-zinc-300` **12.18:1**, `text-zinc-400` **7.02:1** and
    `text-red-400` **6.51:1** all pass AA; the inherited `streaming` word measured **3.29:1** and did
    not — **CORRECTION 1 rules it**. Four findings are **raised there and deliberately not ruled**:
    `text-zinc-500` at **3.72:1** on the chrome (RAISED-1), the `unavailable` **recovery command** at
    **3.98:1** on the byte area (RAISED-2), and two dots under SC 1.4.11's 3:1 —
    `bg-muted-foreground` **2.79:1** and `bg-destructive` **2.91:1**. **Named, not assumed.**

---

## Documented defaults (decided here, not blocking)

The PO can override any of these — and the operator's committed mocks supersede any of them on sight.
They exist so the build has no open question.

1. **One state vocabulary of seven states plus `unknown`**: `idle · connecting · waiting · streaming ·
   ended · error · unavailable`. `running` → `streaming`; `disconnected` → a mandatory cause line on
   `error`; `exited (N)` → a label on `ended`.
2. **Colour is the fifth signal.** Label, dot fill/shape, motion-on-two-states and a mandatory cause line
   come first.
3. **Geometry is a property of the SOURCE; posture is a property of the HOST.** Two axes, never one
   boolean.
4. **Fit ⇔ the source declares a resize control frame; scale otherwise** — 80×24 pinned for `mirror`,
   aspect preserved, never cropped, anchored top-left, letterbox band expected.
5. **`read-only` is a mandatory text label on both the inline and the expanded header, and never yields.**
   The non-blinking underline cursor is its second signal.
6. **There is no input region in either posture** — it is not a gap to fill.
7. **The non-live message is an opaque in-flow bar on a full pane, paid for out of the byte area**, and a
   top-left line only on a pane that is empty by definition. **All three surfaces, one rule.**
8. **`unavailable` names its cause and is never red** — dashed, muted, with the recovery command where one
   exists. **Three named causes** (workspace not local · board origin asked-and-silent · **no fleet
   origin handed**), and a cause outside those three is raised here rather than mapped onto one of them.
9. **A chevron means layout-only; a worded toggle means subscribe/unsubscribe.** Collapse never tears a
   session down; Hide always closes the socket.
10. **One identity line**, source-shaped: owner ref always, `→ <nodeId>` and `session <id>` where the
    source has them. The `remote ·` badge is retired.
11. **One chrome type ramp**: header `text-[11px]`, pills `text-[10px]`, messages `mono text-xs`, bytes
    `fontSize: 13`.
12. **Hierarchy: identity > `read-only` > state > expand > toggle**, on every host.
13. **S1 declares drag-resize on and fullscreen on; S2 declares both off and expand on.** Capability lives
    in the control; the declaration lives at the call site.
14. **The dock's height clamps against the shell's content box, and the DEFAULT clamps by the same rule**
    — `min(280, floor(box/2))`, min 48.
15. **An open dock costs the content region its height and covers nothing** (DG-46-1).
16. **Fullscreen is one shell-owned slot, one occupant, chrome hidden not overlaid, the live node adopted,
    `Esc` + an always-visible control, and NOT a route.**
17. **The four dark hexes get one named home, and no new `@theme` token** (DG-46-2) — **and that home now
    holds the `streaming` word's teal as its sixth value** (CORRECTION 1), still with no `@theme` token.
18. **The `unavailable` state ships in m46 with no production producer, and is judged from a fixture**
    (DG-46-3).

---

## Open questions the operator's mocks will settle

Listed so the review knows which rulings above are provisional and what it costs if a mock differs.
*(The mock landed 2026-08-08; where it answered one of these, the answer is in
[`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md) and the question is closed there rather than re-litigated
here.)*

1. **`streaming` vs `running` as the live word.** Ruled `streaming`, on the "assert only what the client
   knows" discipline. The cheapest thing in this document to change — it is one word in one ramp — and the
   most likely to attract an opinion.
2. **Whether the board dock's `streaming` dot pulses.** Ruled yes (change 2). If the mock shows a still
   dot, motion is dropped from **both** surfaces, not one — the rule is one ramp.
3. **Whether the fullscreen occupant is anchored top-left or centred.** Ruled top-left (what ships).
   Centring costs nothing structurally and changes only where the letterbox band sits; a mock settles it.
4. **The chrome type step — `text-[11px]` everywhere (ruled) vs a per-host density.** A mock that draws
   the dock header at 12px reverses change 9 and reopens whether one control may have two densities.
5. **Whether the board dock offers expand-to-fullscreen** (ruled: yes, change 11). Declining it is one
   declaration and no other change.
6. **Whether `read-only` renders as a pill or as plain text.** Ruled: the existing outlined `text-[10px]`
   uppercase pill. Its **presence** is not negotiable; its form is.
7. **Whether the `unavailable` block also offers a control** (a Retry, an "open on its own origin" link).
   Ruled: **text only** in m46 — a control implies this surface can fix it, and in m46 nothing can. m49,
   which produces the state for real, may add one; that is a design gap for 49, not a silence here.
   **This holds for the third cause too**: `no fleet origin` names `aof mesh ui` as text, and offers no
   button that would start it.
8. **A dark shell.** These surfaces are already dark and m49 makes terminals the home screen. If a mock
   shows the shell going dark around them, **that is a theme decision beyond this milestone's ramp** and
   comes back as its own design gap with its own token work
   ([45/DESIGN open question 6](../45_milestone_ui-app-shell-routing/DESIGN.md)). This milestone adds no
   token. *(CORRECTION 1 adds a named constant, not a token — the distinction is the whole of DG-46-2.)*

---

## Behavioural outcomes (cross-reference)

The user-visible BEHAVIOUR belongs in the task features, **not here**. This document fixes the look and
feel; the features fix what happens.

**This milestone has not been broken down yet** ([STATE.md:14-16](STATE.md#L14) — *"Framed 2026-08-02.
Not broken down."*), so **no story or task path below is real yet**. They are named as **subjects** for
`aof:refine 46` to author, and this section is repointed at the authored files in the same change that
creates them. *(Naming a path that does not exist is the defect m45's own cross-reference section had to
be repointed to fix — it is not repeated here.)* **STALE as of 2026-08-08 — the milestone HAS been broken
down; the stories and tasks exist under [`stories/`](stories/) and this section's repointing is still
owed.**

**Subjects the features must own, and which this document deliberately does not specify:**

- **The merged ramp's transitions as executable scenarios** — bytes revive a dead pane; a close after an
  error stays an error; an exit frame outranks a later close; an unknown state labels itself. Framework-free
  over the reconciled `.mjs`, `node:test`-driven, per the house pattern
  ([46/SPEC.md:66-72](SPEC.md#L66)).
- **Fit emits exactly one resize per fit, and scale emits none** — and the spike's **dropped first frame**
  (`socket.onopen → sendResize()` discarded before `wireSession`, spike 44 §Investigation) is fixed so a
  pane that never resizes again is not left with the wrong geometry.
- **The socket URL is built from an ORIGIN, never a port literal** — `FLEET_PORT = 4181` retired
  ([TerminalDock.tsx:78](../../../ui/src/board/TerminalDock.tsx#L78)), per spike 44 §Outcome consequence 1.
- **Posture is structural**: the read-only call site wires no input source, and arch-test invariant 4
  still holds at the end of this milestone
  ([acd-fleet-terminal-input-constrained.test.mjs](../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)) —
  **update its file list, never its invariants** ([STATE.md:25-29](STATE.md#L25)).
- **Collapse keeps the session alive; Hide closes the socket** — the two costs, asserted separately.
- **Fullscreen adopts the live node**: present and dismiss do not re-create the xterm, do not reopen the
  socket, and return the same node home with focus on the opener.
- **`@uat` visual review — the two terminals now agree**, judged region by region against the committed
  mock — **as amended 2026-08-08: that is
  [`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html), through its delta list
  [`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md)** — and against this document's binding checklists
  everywhere the mock is silent (that file's §6 enumerates the silences). It must carry a row per design
  gap: **DG-46-1** (an open dock covers nothing), **DG-46-2** (one palette home), **DG-46-3** (the
  unavailable pane, judged from a fixture and **re-pointed to milestone 49's gate**, not deleted).
