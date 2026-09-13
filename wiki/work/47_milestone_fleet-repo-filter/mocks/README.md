# Fleet repo filter — the baseline frames

These are the conformance baseline `mocks/PROMPT.md` commissioned. They are locally-readable
artifacts, which is the point: the design reviewer that judges the built page against them is
read-only and cannot open a remote design-tool link.

**Provenance.** Drawn in Claude Design (project `AOF`, file `Fleet Repo Filter.dc.html`, imported
2026-08-11). That source is a design-tool template — `{{ }}` interpolation, `<sc-for>`, `<sc-if>`
and a `<dc-import>` of a shared `FleetBar` component — so it is **not** directly viewable. It was
expanded into `design-source.html`, a single self-contained page with every frame in it, and each
frame captured from that page. `design-source.html` references **no external asset** (verified: zero
`http(s)://`, `src=`, `@import`), so it opens offline in any browser and is the second half of this
baseline: the PNGs are what a reviewer compares against, the HTML is where a disputed pixel is
settled.

**The capture.** Headless Chromium out of the Playwright cache, driven directly (`npx playwright`
is policy-blocked on this machine), at `--force-device-scale-factor=2` with animations frozen at
their first frame so the loading skeletons capture deterministically. Each frame is measured, then
shot at exactly its laid-out size — no viewport padding, no scrollbar.

| File | Frame id | CSS size | What it shows |
|---|---|---|---|
| `filter-control.png` | `#filter-control` | 1280×1218 | Surface 1 at 1280 — the disclosure at rest (`All repos`), filtered (`lark-guard`), long-name truncated, unknown filter (dashed, monospace), empty roster (muted, inert), the picker open over the page, and the four "filtered by" chip-row conditions. |
| `filter-control-768.png` | `#filter-control-768` | 768×283 | Surface 1 at 768 — nav stays in the 48px bar, the surface slot drops into its own 40px second bar, controls unchanged in form. |
| `filter-control-390.png` | `#filter-control-390` | 390×274 | Surface 1 at 390 — `⟳` and `◷` give up their words (labels survive as tooltips); scope and repo filter stay in full on one line; nav collapses to `Fleet ▾`. |
| `filtered-fleet.png` | `#filtered-fleet` | 1280×884 | Surface 2 populated and filtered at 1280 — chip row, four regions with `n of N` summaries, Diagnostics' partial exemption, milestone footers with the repo name removed. |
| `filtered-empty.png` | `#filtered-empty` | 1280×502 | Empty (b) — the repo is on the mesh but has published nothing. |
| `filter-unknown.png` | `#filter-unknown` | 1280×502 | Empty (c) — the filter names a repo nothing publishes as; dashed tile and pill, raw value in monospace. |
| `filtered-loading.png` | `#filtered-loading` | 1280×849 | Loading — bar and chip row render immediately; four skeleton blocks reserve the region layouts. The chip row does not pulse. |
| `filtered-error.png` | `#filtered-error` | 1280×363 | Error — crimson pill, mesh store path in monospace, `⟳ Retry Global`. The filter is not cleared. |

Empty state (a) (the mesh really is empty, unfiltered) and the unfiltered/filtered milestone-footer
pair are drawn in `design-source.html` for comparison but are not separate frames — (a) is existing
behaviour, and the footer pair is the same fact `filtered-fleet.png` already shows.

## What a reviewer should hold these to

- The filter button occupies a **fixed 150px slot in every state**, so no state change moves the
  scope control, the nav, or the bar.
- The only solid teal blocks in the bar are the brand tile and the active scope segment.
- "Nothing matched" is dashed muted grey with a sentence — never red, never crimson, never `!`.
- A long repo name is truncated **in the control** and never in the chip.

## Two honest caveats

1. **Typography.** The design asks for Inter; this machine has no Inter installed, so the frames
   fall back to Segoe UI. Glyph widths differ slightly from a machine with Inter. Judge layout,
   spacing and treatment against these frames; do not judge sub-pixel text metrics.
2. **The frames are the DESIGN, not a render of the build.** They are drawn, not screenshotted from
   `:4181`. Comparing the built page against them is exactly the design-conformance step — a gap
   between the two is a finding, not a defect in the baseline.

## Re-rendering

Re-expand from the design source and re-capture if `Fleet Repo Filter.dc.html` changes upstream;
re-capture from the same frame ids so the table above stays true.
