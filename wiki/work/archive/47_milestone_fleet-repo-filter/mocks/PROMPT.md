# UI-generation prompt — milestone 47, the fleet repo filter

Paste **everything below the rule** into a UI/design agent (claude.ai design, Figma AI, or any
HTML-artifact tool). It is written to stand alone — the design tool cannot read this repo — and it is
grounded in [`../DESIGN.md`](../DESIGN.md), whose **binding checklist is the conformance baseline
until these frames land**.

Export the frames as PNGs (or one self-contained local HTML export) and **commit them into this
folder** under the exact filenames the deliverable section names. `../DESIGN.md`'s conformance table
already expects them by those names.

> **Amended 2026-08-10.** This brief previously asked for a **BOARDS** region on the fleet page.
> `../ARCHITECTURE.md` ADR-006 **deletes** that region in this milestone (it has been unreachable in
> production since m34), so the page now has **four** regions, not five. A frame drawn to the old
> brief would have become a committed baseline that contradicts the record — which is why the
> correction is made here, before the frames are generated. The Diagnostics summary line is corrected
> in the same pass: ADR-004 rules Diagnostics a **compound**, only partly exempt from the filter.

---

**You are designing two surfaces of an existing internal operator console.** This is not a new
product and not a marketing page: it is one dense, quiet, information-first web page that a developer
leaves open on a second monitor all day. Everything you draw must look like it has always been there.

## Who this is for, and what the page IS

`aof` is a command-line tool that orchestrates AI coding agents across a developer's own machines —
a laptop, a Mac mini, a Linux VM. Together those machines are a **mesh**. Each machine runs work for
one or more **repos** (called *workspaces* in the data: each has a short **name**, an opaque
**workspace id**, and an absolute **project root path** on disk).

**The FLEET page is the machine-wide read-only overview**: every repo the mesh knows, every unit of
work (a *milestone*, which contains *stories*), every machine (*node*), and a health summary. The
operator is a single developer, technical, reading it to answer "what is running, where, and is
anything stuck". They are not a manager and there is no dashboard-for-executives energy anywhere in
this. **The page is read-only** apart from one small "assign this milestone to a machine" control on
each card, which already exists and which you should draw but not redesign.

**The problem this milestone fixes:** the page shows *everything*, and an operator working in one
repo has no way to say so. We are adding a **repo filter**.

## The visual vocabulary that already exists — match it, do not invent

Describe-in-words of the shipped design system. **Use these; add no new colour, no new component
type, no gradient, no illustration, no shadow beyond a whisper.**

- **Light theme, cool greys.** Page background is a very light cool grey; cards are pure white with a
  1px hairline grey-blue border, a 8px radius and the faintest shadow. Chrome is restrained: thin
  rules, generous but not airy spacing, nothing rounded more than ~10px.
- **One brand colour: a deep teal.** It means *primary action, "you are here", live/running, and
  progress*. Use it sparingly. There is at most **one** solid teal-filled block in the top bar and
  it is already taken (see below) — a new control that fills itself teal would be a design gap.
- **A crimson accent** is reserved for *needs attention / in review / page-level error pills*, and a
  **saturated red** strictly for *failed / blocked*. **Never use either for "nothing matched a
  filter"** — a filter that matches nothing is a normal, calm answer, not an error.
- **Dashed, muted grey is the house "absent / not-yet / unavailable / unknown" mark.** A dashed ring,
  a dashed pill, a dashed card border. This is the treatment for anything that does not exist yet or
  cannot be found. It is already used for empty placeholders and for offline machines.
- **Type:** Inter (or any neutral grotesque). Body 13–14px, small labels 11–12px, region headers are
  **11px bold uppercase with wide letter-spacing** in muted grey. **Every identifier, workspace id,
  node id, file path and command renders in a monospace face** — this is load-bearing; machine data
  must look like machine data.
- **Status is shown by small marks, never by colour alone.** 8px dots and 18px rings: solid teal =
  live/running, hollow grey ring = stale, **dashed** grey ring = no presence/not started, crimson
  ring = in review, teal ring with a tick = done. A tiny dashed grey pill marks "the data is stale".
  Every mark pairs with a word or a shape so it reads in monochrome.
- **Motion: essentially none.** A gentle pulse on a loading skeleton and on a "running" marker.
  Nothing fades, slides or animates when a filter changes.

## The page's structure — draw this exactly

**A 48px top bar** spans the window. Left to right: a **24px teal-filled rounded tile with a `✦`
glyph** · the wordmark **`aof`** · a small monospace **identity chip** in a grey pill · a thin
vertical divider · a **navigation row of four underline tabs** — `Terminals`, `Fleet`, `Board`,
`Config` — with the active one (`Fleet`) marked by a 2px teal underline, teal text and semibold
weight · then, pushed hard to the **right edge**, the page's own controls (the "surface slot").

**The surface slot on this page holds, left to right:**

1. a **`Global | Local` segmented control** — a small grey rounded track holding two pills; the
   active one is **filled teal with white text**. *(This is the one teal-filled block. Do not make a
   second.)*
2. **← the NEW repo filter goes here** (surface 1 below)
3. **`◷ legend`** — a quiet text affordance that reveals a key on hover
4. **`⟳ refreshed 4s ago`** — monospace, a button that re-polls

**Below the bar, the page body** is a single centred column, max ~1240px wide, with ~28px padding, of
stacked regions separated by ~32px. Each region is an uppercase header + a muted summary, then a
grid of cards. **There are exactly FOUR regions:**

1. **WORKSPACES** — `7 workspaces`. A grid of small white cards (min 240px): repo **name** in bold ·
   the **project root path** in muted monospace, truncating · a tiny dot + `mesh enabled` + a
   relative time.
2. **MILESTONES** — `41 milestones`. A grid of larger cards (min 320px). Each card, top to bottom:
   *(row 1)* a status ring · the ref `47` in monospace · the word `milestone` in tiny caps · pushed
   right, a dashed grey "stale" pill and a status chip. *(row 2)* the milestone title, bold, 16px,
   one line, truncating. *(row 3)* `stories done` with `3 / 9` in monospace, over a thin progress
   bar — teal for done, a subtle striped grey for in-flight. *(row 4)* a row of 8px story dots and
   `9 stories`. *(row 5 — the footer)* a thin top rule, then: the **repo name in muted monospace**,
   then an assignment chip like `assigned → umamis-mac-mini`, then, right-aligned, a teal
   **`Open board →`** link. *(below the card's main body)* a compact "assign to node" row: a small
   select and a small `Assign` button.
3. **NODES** — `5 nodes`. A grid of small white cards: a liveness dot · the node id in bold
   monospace · a tiny outlined `control`/`worker` badge pushed right · the host in muted monospace ·
   `last seen 2m ago` · a single current-work line (`idle`, or `working · lark-guard (session)` in
   teal semibold) · `fabric addr: 100.x.x.x` in tiny monospace · a hairline rule · a comma-joined
   capability list.
4. **DIAGNOSTICS** — a single wide, quiet, low-contrast strip: `Projection: updated 12s ago · 0
   disabled/skipped workspaces · 0 descriptor errors`.

**There is NO "BOARDS" region — do not draw one.** An earlier version of this brief asked for one;
the region was deleted from the product in this milestone. A frame containing it would contradict the
record it is meant to be the baseline for.

Use **realistic sample data** so it reads true: repos `aof`, `lark-guard`, `vista-app-web`,
`aof-test-repo`; nodes `umami-msi` (control), `umamis-mac-mini` (worker), `aof-wsl` (worker); paths
like `C:\Source\umami\aof` and `/home/umami/source/lark-guard`; milestone refs `45`, `46`, `47`.
**Include at least one deliberately long repo name (`vista-app-web-notion-sync`) and one long path**
— width behaviour under long names is the thing this design has been bitten by before.

---

## SURFACE 1 — the repo-filter control and the "filtered by" chip

### The control, in the top bar

A **disclosure button**, sitting immediately to the right of the `Global | Local` segmented control:
a small **white/near-white button with a 1px grey border, 6px radius, ~10px horizontal padding**,
12px text, ending in a muted **`▾`**. **It must not be filled teal and must not look like a second
segmented control** — the whole point is that "pick one of exactly two" and "pick one of many, or
none" are visibly different questions.

Draw it in **four conditions**:

- **at rest, nothing filtered** — reads **`All repos ▾`**. Always present, never blank, never hidden.
- **filtered** — reads **`lark-guard ▾`**, the repo name in semibold. Same box, same border, no fill.
- **filtered by a long name** — reads `vista-app-web-noti… ▾`, truncated with an ellipsis. **The
  button has a hard maximum width and must never grow the bar or push the navigation.**
- **the filter names a repo that does not exist on this mesh** — the button's border becomes
  **dashed muted grey** and its text muted, showing the raw value in **monospace**. Not red, not
  crimson. This is "not found", which is a calm fact.

### The picker, open

A **popover panel anchored to the button's right edge**, ~288px wide, white, 1px border, 8px radius,
a soft shadow, 4px inner padding, drawn **over** the page content. Contents:

1. **First row, always: `✦ All repos`** in medium weight, with a muted right-aligned hint
   `full fleet`.
2. A thin **separator rule**.
3. **One row per repo**, each two lines: a tiny mesh-enabled dot + the **repo name**, and under it
   the **project root path** in 11px muted monospace, truncating inside the panel (the panel never
   widens for a path).
4. The **currently selected row** is marked by **three** signals together: a **`✓` tick**, **semibold
   text**, and a very light teal wash. The tick and the weight must carry it on their own — colour is
   last.
5. Rows are ≥28px tall so they are comfortable click targets.

Also draw the panel in its **empty-roster** condition: no repos have published, so the button is
visibly disabled/muted and the panel is not offered.

### The "filtered by" chip — in the PAGE, not in the bar

Directly under the top bar, above the first region, at the same left margin as the page column, a
single quiet row:

> `Filtered by`  `[ repo · lark-guard  ✕ ]`

- `Filtered by` is 12px muted grey.
- The chip is the **same grey pill as the identity chip in the bar**: light grey fill, 1px border,
  6px radius, small monospace text — with the **repo name in semibold near-black** so the
  load-bearing word is the darkest thing in the pill. **The name is never truncated here.**
- A small **`✕`** at the pill's right edge in teal — a real button that clears the filter.
- When the page is also scoped, draw **two chips in this order**: `[ scope · Local ]` then
  `[ repo · lark-guard ✕ ]`. **The scope chip has no `✕`.**
- When the filter names an unknown repo, the pill takes the **dashed muted border** and shows the raw
  value in monospace, keeping its `✕`.

### Responsive behaviour — three widths, and this part matters

- **1280px wide** — as described: one 48px bar, nav and the four-then-five controls all in it.
- **768px wide** — the nav stays in the 48px top bar, and **the surface slot drops into its own
  second 40px bar directly beneath it**, same white background, same hairline bottom rule. The
  controls are unchanged in form — they have simply moved down a row.
- **390px wide (mobile)** — the slot is still in that 40px second bar and **must fit on one line**.
  To make it fit, two controls give up their words entirely (their labels survive as tooltips):
  - `⟳ refreshed 4s ago` becomes just **`⟳`**
  - `◷ legend` becomes just **`◷`**
  - **the `Global | Local` control and the repo filter both stay in full — they are never
    abbreviated, never truncated, never hidden.**
  - The bar must **not** wrap to two lines, must **not** scroll sideways, and the page must not grow
    a horizontal scrollbar. At 390 the nav collapses to a single `Fleet ▾` disclosure in the top bar.

---

## SURFACE 2 — the filtered fleet page

The same page, narrowed to one repo. Draw the full page, not a fragment.

- The **"filtered by" chip row** sits above everything (surface 1).
- **Every region is narrowed by the same repo**, and **each region header's summary says so**, in the
  form `n of N`:
  - `WORKSPACES  1 of 7 workspaces` (exactly one card — keep it; it is where the full path lives)
  - `MILESTONES  3 of 41 milestones`
  - `NODES  2 of 5 nodes carrying this repo`
  - `DIAGNOSTICS  projection health is mesh-wide · skipped workspaces narrowed` ← **the one PARTIAL
    exemption, and it must be visible.** Diagnostics is a mixture: the projection's own health
    (`Projection: updated 12s ago`, `0 descriptor errors`) is about the whole mesh and does **not**
    narrow, while the count that is about repos (`disabled/skipped workspaces`) **does** and takes
    the `n of N` form — draw the strip as `Projection: updated 12s ago · 1 of 3 disabled/skipped
    workspaces · 0 descriptor errors`. The header says which half is which out loud rather than
    leaving the operator to wonder.
- **The milestone card's footer changes, and only the footer.** Because every card now belongs to the
  same repo, **the muted monospace repo name is removed from the footer row**. What remains, on one
  line: the assignment chip and its `→ node-id` on the **left**, and the teal `Open board →` on the
  **right**. Nothing else about the card changes. Draw both versions side by side if it helps:
  unfiltered (with the repo name) and filtered (without it).

### The four states — draw all four

1. **Populated** — as above, filtered, with realistic data.
2. **Loading** — the top bar and the filter chip row render **fully and immediately** (the filter is
   known from the address before any data arrives), and beneath them four grey pulsing skeleton
   blocks reserve the four region layouts so nothing jumps when data lands. **The chip row itself
   never pulses.**
3. **Error** — the filter chip row stays, and beneath it, centred: a **crimson-accent pill** with a
   filled `!` mark reading `Could not load the mesh: <reason>`, a small monospace line naming the
   mesh store path, and a teal outlined **`⟳ Retry Global`** button. The filter is not cleared by an
   error.
4. **Empty — and there are THREE different empty answers.** All three use the same centred card
   (max ~28rem wide, **dashed** grey border, very light card fill, generous padding, a large dashed
   `✦` tile at the top, a bold 15px heading, a muted body line). **None of them is red, crimson, or
   marked with a `!`.** The wording is the whole point:

   | | heading | body | button |
   |---|---|---|---|
   | **a** the mesh really is empty *(no filter — existing state, for comparison)* | `No mesh-enabled workspaces yet` | `No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.` | *(none — a monospace command chip instead)* |
   | **b** filtered, but that repo has published nothing | `Nothing published for this repo yet` | `lark-guard is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.` | **`Show all repos`** |
   | **c** the filter names a repo nothing on this mesh publishes as | `No repo matches this filter` | `Nothing on this mesh publishes as ws_7f2c9a. It may not have published yet, or the id may belong to another mesh.` | **`Show all repos`** |

   In **(c)** the card's `✦` tile and the chip in the row above both take the **dashed muted**
   treatment, and the raw value renders in monospace. The `Show all repos` button is a **teal
   outlined button on a very light teal wash** — the same shape as `⟳ Retry`.

   **The filter chip row is present above all three.** An empty page must always say why it is empty.

---

## Rules a reviewer will judge you against (a violation is a design gap)

- **The repo filter and the `Global | Local` control never look alike.** One is a bordered disclosure
  with a `▾`; the other is a filled segmented pill.
- **Only one solid teal block in the top bar** — the active scope segment. (The brand tile is teal
  too and is the exception that already exists; do not add a third.)
- **Nothing disappears because a filter is on.** No control dims, hides or changes shape because the
  page is filtered.
- **"Nothing matched" is never red, never crimson, never an error pill.** Dashed and muted, with a
  sentence.
- **No control's label is ever truncated.** Controls give up whole words (and keep them in a tooltip)
  rather than shrinking into ellipses.
- **A long repo name or a long path never widens anything** — not the bar, not a card, not the
  popover, not the page.
- **Colour is never the only signal** — every state pairs colour with a shape, a mark or a word.
- **Four regions, and no boards region.** Do not invent a fifth.
- **This is one dense operator console, not a marketing page.** No hero, no illustration, no empty
  state with a cartoon, no gradient, no oversized type.

---

## Deliverable — the exact files to commit

Export each frame as a **PNG** (or one **self-contained local HTML export** with inline CSS and no
external assets, from which each frame is screenshotted) and **commit it into this `mocks/` folder
under the exact filename below**:

| File | What it shows |
|---|---|
| **`filter-control.png`** | Surface 1 at **1280**: the top bar with the filter at rest, filtered, long-name-truncated and unknown-filter, **plus the picker open**. |
| **`filter-control-768.png`** | Surface 1 at **768**: the slot in its own 40px second bar, controls unchanged in form. |
| **`filter-control-390.png`** | Surface 1 at **390**: the two whole drops (`⟳`, `◷`), scope + filter in full, one line, no wrap and no sideways scroll. |
| **`filtered-fleet.png`** | Surface 2, **populated and filtered** at 1280: the chip row, all **four** regions with `n of N` summaries, the Diagnostics partial exemption, and the milestone card's footer with the repo name removed. |
| **`filtered-empty.png`** | Surface 2, **empty state (b)** — filtered, that repo has published nothing — with the chip row above it. |
| **`filter-unknown.png`** | Surface 2, **empty state (c)** — the filter names an unknown repo — dashed treatment, raw value in monospace, chip row above it. |
| *(optional)* `filtered-loading.png`, `filtered-error.png` | Surface 2's loading and error states with the chip row above them. Welcome, not required. |

**A remote design-tool link is not a usable baseline** — the design reviewer that judges the built
page against these frames is **read-only** and cannot open one. The files must be committed here, in
this folder, under these names, as locally-readable artifacts.
