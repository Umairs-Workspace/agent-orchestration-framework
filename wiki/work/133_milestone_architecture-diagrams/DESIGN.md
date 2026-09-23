---
doc: design
---
<!--
  Milestone DESIGN.md — how should it look and feel, and why.
  Owner: designer. Layout / component / visual intent only.
  UI BEHAVIOUR (what happens when you click) lives in task .feature files — cross-referenced below,
  not specified here.
-->
# 133 · Architecture diagrams — Design

## Intent

A milestone's decisions are in its `ARCHITECTURE.md`, and today the board cannot show them. The
detail panel's milestone tabs are `SPEC, VERIFICATION, RETROSPECTIVE, RUNS, FINDINGS`
([DetailPanel.tsx:42-47](../../../ui/src/board/DetailPanel.tsx#L42)). This milestone adds **one tab,
ARCHITECTURE**. It renders the document the way every other doc tab does, and shows each ADR's
diagram **inline, where the ADR links it**, as a figure the reader can take in at a glance. The
page gets no new panel, viewer or chrome. A diagram is part of the reading flow of its ADR, not a
gallery.

The feeling to keep is the doc tabs' own: quiet, typographic, and the document first. The diagram
brings its own palette (drawn in the console's style, ADR-009), so the frame around it stays
neutral: a hairline border, the card surface, and nothing that competes with it.

## Conformance source of truth

> **NO MOCK WAS ELICITED.** The operator was asked at refine (2026-09-22) and chose "no mock — use a
> checklist". Per **07/ADR-003** the **binding checklist below is the mandatory conformance source of
> truth** that the design-conformance review judges the built surface against. A mock produced later
> lands under this milestone's `mocks/`, is committed and locally readable, and becomes the visual
> source of truth, with this checklist as the region-by-region rubric.

- **Render route.** The board (`aof work ui`, an ephemeral per-workspace port; never hand one out),
  with this milestone selected and its ARCHITECTURE tab active, at **390, 768 and 1280**. Judge it
  over two fixtures: this milestone after story 06 (one ADR with a diagram, nine without), and a
  milestone whose ADR links a diagram that is not in the tree.
- **Not judged by screenshot:** the SVG's own drawing. That is the generator's output, judged at
  story 06 against ADR-002's brief. The console judges only the frame, the placement and the states.

## What the surface receives

| Fact | Where | Consequence |
|---|---|---|
| The doc tabs render `cleanDoc(body)` through `Markdown` (`marked`, GFM), with the provenance line as the region's first child | [DetailPanel.tsx:466-484](../../../ui/src/board/DetailPanel.tsx#L466), [DetailPanel.tsx:525-571](../../../ui/src/board/DetailPanel.tsx#L525) | ARCHITECTURE uses the SAME region, provenance line and `DocMarkdown`. It gets no bespoke layout. |
| Absent is not an error: dashed `border-border` box, muted text | [DetailPanel.tsx:552-566](../../../ui/src/board/DetailPanel.tsx#L552) | An item with no `ARCHITECTURE.md` says `No ARCHITECTURE yet` in that box, like every other absent doc. |
| The Records summary on a milestone's SPEC tab probes `SPEC, VERIFICATION, RETROSPECTIVE` | [DetailPanel.tsx:150-170](../../../ui/src/board/DetailPanel.tsx#L150), [DetailPanel.tsx:490-520](../../../ui/src/board/DetailPanel.tsx#L490) | The probe and the list gain `Architecture`, after `Spec / objective`, in the tab order. |
| A diagram arrives as an SVG body through `work:doc <ref> DIAGRAMS <member>` and is shown only as an `<img>` data URI | ARCHITECTURE ADR-007 §4 | The figure is an image: it scales as a whole, runs nothing, and uses local fallback fonts. |
| Tokens | [index.css:3-25](../../../ui/src/index.css#L3) | Every colour below is an existing token. None is added. |

## Surface — the ARCHITECTURE tab

### Binding checklist

**Regions, in order (top → bottom) inside the tab body:**

1. **Provenance line**: the existing `ProvenanceLabel`, present only when the doc is a cached or
   worker copy. Unchanged.
2. **The document**: the cleaned `ARCHITECTURE.md` rendered by `Markdown` (`.md`), headings, tables
   and code exactly as the other doc tabs render them.
3. **Diagram figures, inline**: each image whose `src` is `diagrams/<stem>.svg` renders as a
   **figure in place of that image**, at the point in the ADR where the block is pasted. The rest of
   the block (the `Source · PNG` line) renders as an ordinary markdown paragraph beneath the figure.

**The figure's components:**

- a block `<figure>` at full width of the doc column, `margin` matching `.md p`'s vertical rhythm;
- a frame: `rounded-md`, `1px border-border`, `bg-card`, with `p-3` inner padding (`p-2` under 640 px);
- the image: `display:block; width:100%; height:auto; max-height:70vh; object-fit:contain`. It is
  never upscaled past its intrinsic viewBox width (`max-width` is the viewBox width in CSS px);
- `alt` is the markdown alt text (`ADR-002 — the generator seam`), which is the accessible name;
- a `<figcaption>` under the frame in `text-xs text-muted-foreground`, carrying the alt text. It is
  the reader's anchor when the image is wide and short.

**States (per figure):**

| state | shows |
|---|---|
| loading | the frame at a fixed `aspect-ratio: 16 / 9` holding one muted line, `Loading diagram…` (`text-sm text-muted-foreground`), with no spinner. The document is readable around it. |
| populated | the image in the frame, plus the caption |
| missing | the frame drawn DASHED (`border-dashed border-border`) holding `Diagram not found — <stem>.svg is not in this item` in `text-sm text-muted-foreground`. On a row another node reported: `Diagram not synced from <node> yet` (the `CachedDocAbsent` wording). It is never `text-accent`. |
| error | the dashed frame holding `Could not load diagram: <message>` in `text-sm text-accent`, the one tone the doc region already uses for a fault |

**States (the tab):** loading, absent, error and populated are exactly the other doc tabs' four
states ([DetailPanel.tsx:535-571](../../../ui/src/board/DetailPanel.tsx#L535)). A document with
zero diagrams is simply populated, with no empty-diagram notice. Most ADRs have no diagram, and
saying so would be noise.

**Design ramp:** `bg-card` frame on the `background` page, `border-border` hairline,
`text-muted-foreground` for caption and placeholder copy, `text-accent` only for a load fault. No
`primary` tint anywhere on the figure: the diagram's own focal colour is the focal colour.

**Responsive:** at 390 the figure keeps its full column width and scales down. It never scrolls
sideways and is never cropped. A diagram too dense to read at 390 is a finding against the diagram
(the generator's §7 complexity budget). **Amended at `aof:verify 133`:** the figure opens a full-size
viewer on click (see "Amended at verify" below). There is still no pan or zoom control inside the panel.

**Tab strip:** `ARCHITECTURE` sits second, after `SPEC`, with the existing tab idiom and label
casing. It is shown for milestones only, because stories carry no `ARCHITECTURE.md` of their own.

### Decisions and rejected alternatives

- **Inline at the link, not a diagram gallery at the top.** An ADR's diagram explains that ADR. It
  belongs where its brief is, and a gallery would separate picture from decision.
- **Image, not inline SVG.** Rejected inline for the trust reason in ADR-007 §4. The cost, local
  fallback fonts inside the image, is accepted.
- **No link to the HTML source in the figure.** The pasted block already carries the
  `Source · PNG` line, so the figure adds none. (The viewer carries one "Open in new tab" for the SVG.)

## Amended at verify (2026-09-23, operator ruling)

The operator read ADR-002's figure in the real board and ruled it "too small to be of any use":
the detail panel is about 350 px wide at every viewport, so a 1000-wide diagram shows at a third of
its size. The block's `Source · PNG` links were also dead. Both were blockers (VERIFICATION F-133-01,
F-133-02), fixed by story 04 task 03, and the operator accepted the fix in the browser ("Yes this
works").

- **The populated figure is a button.** Its frame keeps the card classes, gains `cursor-zoom-in`, a
  `hover:border-primary` hairline and a small `Enlarge` badge top-right in muted uppercase. Loading,
  missing and error figures are not buttons.
- **The viewer.** A full-screen overlay on a `foreground/80` backdrop, with a card-surface top bar
  holding the alt text, an `Actual size` / `Fit to screen` toggle, `Open in new tab` (the SVG) and a
  close `×`. It opens fit to the screen. Actual size is twice the viewBox width, scrolling on both
  axes. Esc, the backdrop and `×` close it. The image is the same data-URI `<img>` the figure holds.
- **The block's links open the committed files** in a new tab, served by the board under a sandbox
  CSP. A file another node holds answers "not on this node".

