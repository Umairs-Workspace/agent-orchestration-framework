---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 127 · Backlog and archive — Design

## Intent

The board's overview (VIEW 1, [03/DESIGN.md](../03_milestone_work-board-ui/DESIGN.md) §VIEW 1) answers
"where does the whole project stand?". This milestone changes what the answer is *made of*: the root of
`<work.dir>` now holds only what is live, un-numbered ideas sit in `backlog/`, and accepted work moves to
`archive/`. The board makes **exactly two additions** and nothing else on it changes:

1. **A Backlog section on the overview** — the un-numbered drivers, shown as quiet rows grouped by their
   folder path. Read-only: the board *shows* the backlog, it does not promote from it.
2. **Archived items hidden by default, revealed by ONE toggle** — when shown, an archived milestone is
   visibly marked wherever its identity row is painted, and its lane board opens exactly as a done
   milestone's does today.

The feeling to keep is the one 03 set — a calm workbench whose overview reads as "what is happening".
So the backlog is present but subordinate (it gates nothing, is never "next") and the archive is absent
until asked for. Both of 03's rails hold: **status is derived, never user-set**, and **no new design
system** — every token below is already in [ui/src/index.css:3-25](../../../ui/src/index.css#L3).

## Conformance source of truth

> **NO MOCK WAS ELICITED** — no `mocks/` directory exists for milestone 127 and no human was available to
> supply one. Per **07/ADR-003** ([07/ARCHITECTURE.md:163](../07_milestone_design-conformance/ARCHITECTURE.md#L163))
> the **binding checklist under each surface below is the mandatory conformance source of truth** the
> design-conformance review judges the built surface against. A mock produced later lands under this
> milestone's `mocks/` (committed, locally readable) and becomes the visual source of truth, with these
> checklists as the region-by-region rubric.

- **Render route:** `/?mode=board` on the board's ephemeral port (supplied at capture time, never
  hard-coded — [Board.tsx:92-97](../../../ui/src/board/Board.tsx#L92)). Surface 1 is judged on the overview;
  surface 2 **twice** — toggle OFF and ON — on the overview, then on an archived milestone's lane board.
- **Breakpoints:** **1280** (primary — a desktop workbench with a fixed 382px detail column); **768**;
  **390** for the top-bar toggle and the backlog rows only (the 3-column grid is fixed at every width today,
  [Overview.tsx:54](../../../ui/src/board/Overview.tsx#L54), and is not this milestone's to change).

## What the surfaces receive

| Fact | Where | Consequence |
|---|---|---|
| The list envelope is `{ items, stalenessSeconds, nodeId }` over the 7-field row + provenance keys | [board-ui.mjs:86-90](../../../src/board-ui.mjs#L86), [api.ts:6-66](../../../ui/src/board/api.ts#L6) | Two row fields are new: `number: null` + `backlog: <group path>` on a backlog row (its `ref` is its slug); `archived: true` on an archived row (number, ref, stories unchanged). |
| Archived rows are **excluded by default** and included only on the include-archived parameter | SPEC §Scope "Archived is not invisible" | With the toggle OFF the board **cannot know** how many archived items exist — so the toggle carries no count and the header asserts none. |
| `deriveBoard` sweeps every `type:milestone, parent:null` row into a card, every `uat` into a gate bar, every `spike`/`chore` into `otherDrivers` | [model.ts:63-65](../../../ui/src/board/model.ts#L63) | A backlog row must be **partitioned out first** (`number === null`), or a backlog milestone would be painted as a card with its slug in the ref slot. |
| `deriveBoard` counts `doneMilestones` / `activeMilestones` / `blockedGates` from what it was handed | [model.ts:89-91](../../../ui/src/board/model.ts#L89) | The chips count what is **rendered**; the archived subset is stated by its own chip (§Surface 2). |
| Freshness is judged per record by the ONE ramp module, off the 1s tick | [Board.tsx:159-163](../../../ui/src/board/Board.tsx#L159) | Milestone 43's badge and provenance line apply to backlog and archived rows **unchanged**. |

## The archived mark — the ONE new vocabulary

The product's five read-only ramps (item-status, run-state, node-presence, assignment-lifecycle,
cache-freshness — 43/DESIGN §"The freshness ramp") answer questions "archived" does not: *has this
accepted item been put away?* It gets its own primitive, never merged with the status chip (not a sixth
status — the wire status stays `done`) or the stale badge (not degraded).

```
▤ archived
```

- **Classes (pinned):** `inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground`.
- **Why a solid muted pill, not dashed.** Dashed is the house's "degraded / not-yet / absent" primitive
  (the `not-started` ring, [status.tsx:121](../../../ui/src/board/status.tsx#L121); the stale badge,
  [StaleBadge.tsx:31-32](../../../ui/src/board/StaleBadge.tsx#L31)); an archived item is the opposite —
  complete and deliberately shelved. Never `destructive` (blocked/failed own it), never `primary`/`accent`
  (the chip already says `✓ done` in teal; a second teal would double-count acceptance).
- **Why `text-[11px]`.** Strictly below the `text-xs` status chip ([status.tsx:206](../../../ui/src/board/status.tsx#L206)):
  what the item *is* outranks where it *lives*. Same tier as the stale badge and the type chip.
- **Why `▤` (U+25A4).** Unclaimed in the product's glyph set (`○ ◐ ◔ ! ✓ ✦ ◷ ♥ ▸ → ↻ ⟳ ✕ ◌`); a filled box
  reads as "boxed up". Decorative (`aria-hidden`); the **word `archived` carries the meaning**; if the font
  cannot paint it the pill degrades to the word alone.
- **One form, one pill per item context**, in the `ml-auto` cluster **immediately left of the status
  chip**, right of any stale badge: `[◌ stale · 12m ago] [▤ archived] [✓ done]`. The chip keeps its
  right-edge anchor (43 documented-default 3), so nothing moves when the toggle reveals a row. Where
  there is no chip (the lane card) it takes the meta line's right end beside the stale badge. No motion.
- **The legend documents it.** The board's `◷ status legend` ([Board.tsx:643-665](../../../ui/src/board/Board.tsx#L643))
  gains one row after the Freshness block, painting the **real pill**: `▤ archived — done and moved to
  archive/; shown only with "Show archived"`. A vocabulary not in the legend is one the operator must guess.

---

## Surfaces

### 1 — Backlog on the overview (VIEW 1)

A fourth region on the overview, **after** Acceptance gates: the overview reads top-down as *what is
happening* (cards) → *what accepts it* (gates) → *what is waiting to be admitted* (backlog) — least
live, last. It is a list of **rows, not cards**: the milestone card is mostly progress bar, story dots
and footer counts ([Overview.tsx:139-174](../../../ui/src/board/Overview.tsx#L139)), a backlog item has
none of those, and a two-thirds-empty card would read as a milestone in flight.

**The row (anatomy, left→right).** `TYPE · slug · title · [◌ stale]`:

- **No status ring, chip or number.** The status ramp answers "where in the lifecycle"; a backlog item
  is not in it yet, and a dashed `not-started` ring would assert a stream status it does not have.
- **Type label** — the uppercase idiom (`text-[10px] font-semibold uppercase tracking-wider
  text-muted-foreground`, [Overview.tsx:128](../../../ui/src/board/Overview.tsx#L128)) in a **fixed-width
  column sized to `milestone`** so slugs align down the list (the m38 DG-13 constant-width rule).
- **Slug** in the mono ref slot (`mono text-sm text-muted-foreground`, [Overview.tsx:127](../../../ui/src/board/Overview.tsx#L127))
  — the slug IS the ref. **Title** `min-w-0 flex-1 truncate text-sm font-medium` (the gate bar's idiom,
  [Overview.tsx:236](../../../ui/src/board/Overview.tsx#L236)), falling back to the humanised slug.
- **Right end (`ml-auto`)** — the stale badge, `short` form, when the cache says so (43 §1a's no-chip
  rule); else nothing. Absent, not "fresh".
- **Non-interactive.** A `<li>`, not a `<button>`: no "Open →", no selection, no drill-in. A backlog
  milestone has no stories and no board, and the detail panel is out of this milestone's board scope
  (§Documented defaults 1).

**Grouping.** A group is a folder and nothing else, so it renders as **its relative path, verbatim, as a
flat mono sub-heading** (`mono text-[11px] text-muted-foreground`, `mt-3 mb-1`) above its rows —
`platform/mesh`, never an indented tree (a tree would suggest the hierarchy semantics the SPEC rules out).
Root rows (`backlog: ""`) come first with no heading; groups follow in lexical path order (what the
operator sees on disk); rows keep wire order within a group.

**Section heading.** `Backlog` in the gates heading idiom (`mb-3 text-sm font-semibold uppercase
tracking-wide text-muted-foreground`, [Overview.tsx:67](../../../ui/src/board/Overview.tsx#L67)) followed
on the same line by a normal-case `text-xs` subline: `N items · un-numbered, not scheduled · promote with`
`aof work promote <slug>` (mono). The subline is where the operator learns the door; no row repeats it.
The count lives here and **not** in the header chips ([Overview.tsx:43-51](../../../ui/src/board/Overview.tsx#L43)),
which count the *stream* — "not yet admitted" is not a lifecycle bucket beside "done"/"active".

#### Binding checklist (mandatory — this IS the baseline)

- **Layout regions (in order):** overview header (unchanged) → milestone grid (unchanged) → Acceptance
  gates (unchanged) → **Backlog section**: heading row → [root rows] → per group: mono path sub-heading → rows.
- **Components:** heading (`h2`, gates idiom) + subline; group sub-heading (mono path); row = fixed-width
  type label · mono slug · truncating title · `ml-auto` stale badge (short form). No ring, chip, number,
  progress, dots, footer, or button.
- **States:** *loading* / *error* / *empty stream* — the page-level branches
  ([Board.tsx:512-528](../../../ui/src/board/Board.tsx#L512)); the section has none of its own. *Empty*
  (no backlog rows on the wire) — the **section is absent**, as the gates strip is
  ([Overview.tsx:65](../../../ui/src/board/Overview.tsx#L65)); the wire carries no "folder exists" fact,
  so none is asserted. *Populated* — as above; root-only = no sub-headings; grouped-only = no un-headed rows.
- **Ramp:** row `rounded-lg border border-border bg-card px-3 py-2 text-sm gap-3` (the gate bar's border
  and radius, [Overview.tsx:222](../../../ui/src/board/Overview.tsx#L222), one step tighter — a row carries
  less); `space-y-2` between rows; `muted-foreground` for label/slug/path, `foreground` for the title; **no
  `primary`, `accent` or `destructive` anywhere in the section**; freshness per 43. The title truncates at
  narrow widths; type label and slug never do.

### 2 — Archived items, hidden by default (the toggle + the mark)

**The toggle — ONE, in the top bar.** It lives in the board's surface slot
([Board.tsx:500-510](../../../ui/src/board/Board.tsx#L500)), **left of `◷ status legend`**, legend and
`⟳ sync` untouched. There and not in the overview header because it is a **fetch-scope control** — it
changes what the list request asks for, the thing `⟳ sync` re-runs — and it must be visible in **both
views**: an archived milestone's lane board can only exist while the toggle is ON, and the board must
say why the row is there.

- **Component:** a single `<button type="button" aria-pressed={on}>` with the **constant** label
  `Show archived` — the fleet's `aria-pressed` toggle atom ([Fleet.tsx:775-787](../../../ui/src/fleet/Fleet.tsx#L775)),
  singular because this is one boolean, not an exclusive pair. **No count**: while OFF the archived
  count is unknown to the board (the rows are not on the wire) and is never guessed.
- **Ramp:** `inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition`;
  OFF = `border-border bg-transparent text-muted-foreground hover:text-foreground`; ON =
  `border-primary/40 bg-primary/10 text-primary` (the board's own Resync at-rest tint, [ProvenanceLine.tsx:169](../../../ui/src/board/ProvenanceLine.tsx#L169)).
  **Not** teal-filled — teal fill is the single headline action (03 default 6). Same padding both
  states, so flipping it moves nothing in the bar.
- **States:** *off* (default, every load) · *on* · *in-flight* (`disabled` + `aria-busy="true"` while its
  own refetch runs) · *error* (the toggle **reverts** to its prior state and the existing dispatch toast
  ([Board.tsx:593-609](../../../ui/src/board/Board.tsx#L593)) reports it — a toggle left ON over a list
  that silently lacks the rows would be a lie by shape).

**The overview with the toggle ON.** Archived milestones appear **in the grid, in list order** — an
archived `52` sits where its number puts it. The number is the identity; the mark, not the position,
says archived. The card gains exactly two things: the **pill** in the row-1 cluster and the surface
**`bg-muted/40` instead of `bg-card`** (the provenance box's quiet surface,
[DetailPanel.tsx:221](../../../ui/src/board/DetailPanel.tsx#L221)). No opacity (`disabled:opacity-50`
would say "cannot open", and it can), no dashed border (degraded/absent — it is neither); footer, dots
and `Open board →` intact. An archived `uat` gate bar takes the pill in its `ml-auto` cluster
([Overview.tsx:243-245](../../../ui/src/board/Overview.tsx#L243)).

**The summary chips — what they count, under each toggle state.**

| Chip | OFF | ON |
|---|---|---|
| `✓ N done` | live done milestones (all the wire carries) | **every rendered done milestone, archived included** — an archived card's own chip reads `✓ done`, so a chip that excluded it would contradict the cards beneath it |
| `◐ N active` | unchanged | unchanged (an archived item is never active) |
| `! N blocked gate` | unchanged | unchanged (archived is done) |
| `▤ N archived` (new; `SummaryChip` in `bg-muted text-muted-foreground`, glyph decorative) | **absent** — the count is unknown | **present even at 0** — it is the toggle's receipt that the include-archived fetch happened; `0` is a fact, absence would be a shrug |

The header sentence `N milestones · derived from project state` keeps counting rendered milestones.
VIEW 2's `N milestones · full stream` count label ([BoardLanes.tsx:63-66](../../../ui/src/board/BoardLanes.tsx#L63))
follows the same rule: it counts what is rendered.

**VIEW 2 for an archived milestone — exactly a done milestone's board.** Lanes, bucketing, selection,
the detail panel, its primary action (`done` → the quiet ad-hoc **Run agent**,
[action.mjs:69-73](../../../ui/src/board/action.mjs#L69)) and the actions strip are **unchanged**. The
only addition is the mark wherever the milestone's identity row is painted: the **switcher button**
(pill after the mono label, [BoardLanes.tsx:352-368](../../../ui/src/board/BoardLanes.tsx#L352)), each
**switcher row** (`done · archived` in the trailing short-status text, [BoardLanes.tsx:389](../../../ui/src/board/BoardLanes.tsx#L389)),
the **lane card** meta line under `all` focus (pill left of the stale badge,
[BoardLanes.tsx:267-280](../../../ui/src/board/BoardLanes.tsx#L267)) and the **detail-panel header**
cluster ([DetailPanel.tsx:206-209](../../../ui/src/board/DetailPanel.tsx#L206)). **Stories of an archived
milestone carry no mark** — one pill per context, and the context is the milestone.

#### Binding checklist (mandatory — this IS the baseline)

- **Layout regions (in order):** top bar surface slot — **`Show archived` toggle** → `◷ status legend`
  (+ new Archived legend row) → `⟳ sync`. Overview — header chips (**`▤ N archived` last, ON only**) →
  grid (archived cards in list order) → gates → backlog. VIEW 2 — breadcrumb/switcher (marked) → lanes
  (marked lane cards under `all`) → detail header (marked cluster) → the rest unchanged.
- **Components:** toggle (`aria-pressed` button, constant label); archived pill (one primitive, §above);
  archived summary chip; legend row painting the real pill. Nothing else new.
- **States — toggle OFF (default):** no `archived: true` row anywhere — not as a card, gate bar, lane
  card, switcher row or detail item; no archived chip; toggle at rest. **ON:** archived rows rendered and
  marked in every context above; chip present (even `0`); toggle tinted. **In-flight:** toggle disabled
  + busy, list unchanged until the response lands in place (never the loading branch,
  [Board.tsx:100-126](../../../ui/src/board/Board.tsx#L100), so the dock survives). **Error:** toggle
  reverts; toast. **Loading / error / empty stream:** the page-level branches, unchanged; the toggle is
  still painted (a property of the surface, not the data). **Freshness:** 43's badge and provenance
  line on an archived row exactly as on any other.
- **Ramp:** pill `bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold`;
  archived card `bg-muted/40` (border, radius, shadow, hover unchanged); toggle per above; chip
  `bg-muted text-muted-foreground`; cluster `gap-1.5`, order `[stale][archived][chip]`, chip
  right-anchored. `primary` appears only on the ON toggle tint. No new token, no hex, no motion.

---

## Accessibility (expected to be honoured)

1. **Never colour-only.** The words `archived` (pill, chip) and `Show archived` (toggle) carry the meaning;
   `bg-muted/40` and `▤` are emphasis only. `muted-foreground` on `muted` / `muted/40`-over-`card` clears 4.5:1.
2. **The toggle is a real toggle:** `aria-pressed` reflects the state; in flight = `aria-busy="true"` **and**
   `disabled`; visible focus on `--color-ring` ([index.css:23](../../../ui/src/index.css#L23)); hit target
   ≥ 24×24 CSS px via `min-h-6` (no change to visual weight); `aria-label="Show archived items"`.
3. **Backlog rows are not buttons** — not in the tab order, announced as list items: "nothing to open here".

---

## Documented defaults (decided here, not blocking)

1. **The board is read-only on the backlog: it shows, it does not promote.** The one strong reason was
   found and set aside: the detail panel's state-aware action already offers **Refine** for a
   `not-started` item with no breakdown ([action.mjs:62-66](../../../ui/src/board/action.mjs#L62)), and
   the SPEC makes `promote` step 0 of `aof:refine` — a *selectable* row would have its door with no new
   button. But that door is the detail panel, which this milestone does not open for backlog items.
   Rows are non-interactive; the subline names the CLI door. Reversible later with no new affordance.
2. **Backlog is the last overview region; rows show no ring, chip, number, progress or dots; a group is
   its path as a flat mono sub-heading; the section is absent when empty; no backlog summary chip.**
3. **One toggle, in the top bar left of the legend, constant label `Show archived`, no count; default
   OFF on every page load; session state only** — not `localStorage`, not the URL. A sticky ON would
   re-fill the overview with every done milestone on every load, the exact state this milestone ends.
   A hash deep-link to an archived ref with the toggle OFF lands on the overview, toggle OFF — no
   auto-flip (the board cannot tell "archived" from "unknown" without the parameter).
4. **Archived cards stay in list order**; the pill (solid muted — never dashed, destructive or teal) and
   the `bg-muted/40` surface are the mark. One pill per item context; stories of an archived milestone
   carry none.
5. **`✓ N done` counts what is rendered; `▤ N archived` states the subset — ON only, present even at 0.**
6. **VIEW 2 for an archived milestone is a done milestone's board, unchanged** — Run agent, feedback,
   validate, next still offered; the mark is the only addition.
7. **A failed toggle refetch reverts the toggle** and reports through the existing toast.

---

## Behavioural outcomes (cross-reference)

BEHAVIOUR belongs in task scenarios on this milestone's stories, NOT here. Outcomes a `.feature` can assert:

- **A backlog row (`number: null`) renders under the Backlog section grouped by its `backlog` path, root
  rows first — and never as a milestone card, gate bar, lane card or switcher row.**
- **A backlog row shows type, slug and title only — no ring, chip, number, progress bar or story dots;
  it is not focusable and opens nothing. With no backlog rows the section is not rendered.**
- **With the toggle OFF (the default on load) the list is requested without the include-archived
  parameter and no `archived: true` row is rendered anywhere on the board.**
- **Toggling ON re-requests the list with the parameter, in place (the dock is not unmounted); archived
  milestones render in the grid in list order with the pill and `bg-muted/40`; `▤ N archived` appears
  (including `0`); `✓ N done` includes them.**
- **An archived milestone's board shows the mark in the switcher and detail header; lanes, stories and
  actions behave exactly as a done milestone's.**
- **The toggle's state does not survive a page reload; a failed refetch reverts it and surfaces the error.**
- **The stale badge and provenance line on an archived or backlog row are unchanged from 43.**
- **`@uat` visual review — the backlog reads as "waiting, not in flight", the archived mark as "put away,
  not broken"; neither is colour-only** (a person judges at 1280/768).
