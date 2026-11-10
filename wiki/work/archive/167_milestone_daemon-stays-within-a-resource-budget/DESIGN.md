---
doc: design
---
# 167 · The daemon stays within a resource budget — Design

## Intent

The operator should learn that a daemon is burning their machine from the app that runs it, the
same day, in words they can act on: which daemon, how much against what budget, and what it is
spending its time on. It is a calm, standing signal, not an alarm. Nothing new is added to the
window. The desktop already has one place for "something needs your attention" (the footer's
notice line) and one tray state for "not healthy" (`degraded`). The overrun uses both.

The board and fleet changes in this milestone (167/02) are invisible by design: they change how
often a view asks, never what it shows.

## Conformance source of truth

- **Mocks directory:** `mocks/`. It is empty: the operator has no mock (167/05 Q2, answered
  2026-10-20).
- **No-mock rule:** the binding checklist below is the mandatory source of truth for the one
  surface this milestone changes.

## Render breakpoints

- The desktop window is a fixed-size Tauri webview, not a responsive page. It is rendered once,
  at the window's default size, from `apps/desktop/ui/index.html` with an IPC view-model fixture.

## Screens / surfaces

### Desktop window and tray, while a daemon is in overrun

- **Route:** none. The desktop window (`apps/desktop/ui/index.html`) is rendered with a view-model
  whose `notice` is the overrun text. The tray icon is the existing `degraded` asset.
- **Committed mock:** none (Q2).
- **Layout & interaction:** no layout change. The footer's text line carries the notice. The tray
  shows `degraded` while any daemon is in overrun. Nothing is clickable that was not before, and
  the operator's existing Stop and Quit are the only actions.
- **Component choices:** the footer's existing `#footer-text` line, because the window has one
  notice slot by design and a second banner would compete with exit notices. The existing
  `degraded` tray icon, because "a daemon is costing too much" is a degraded state, not an error
  and not offline.

#### Binding checklist (mandatory)

- **Layout regions (in order):** title bar · control bar · loop bar · fleet body · footer. Only the
  footer's text changes. The tray icon is outside the window.
- **The components each region holds:** the footer holds the status dot and `#footer-text`. During
  an overrun, `#footer-text` reads:
  `mesh serve is using 60% of a core (idle budget 2%) — mostly full-disk-read on 52294b307214c27d`.
  That is the daemon's label (`mesh serve` or `mesh ui`), its share rounded to a whole percent,
  the budget and the state it was judged in, then `— mostly <cause> on <workspace>` only when the
  snapshot names a top cause. The workspace is shown as the label the snapshot carries. A
  `not-reporting` daemon reads `mesh serve is using 100% of a core (viewer-open budget 10%) — it
  has stopped reporting what it is doing`.
- **The states (empty / loading / error / populated):**
  - *populated, no overrun:* the footer and tray are exactly as today.
  - *populated, overrun:* the footer shows the overrun text, and the tray shows `degraded`.
  - *overrun plus a standing exit notice:* the footer shows the exit notice (it outranks the
    overrun), and the tray shows `degraded`.
  - *loading / error:* unchanged. An overrun is never shown over the error footer, because without
    a status read there is no budget to judge against.
  - *overrun ends:* within one poll tick of the guard leaving overrun, the footer returns to its
    populated text and the tray to its fleet state.
- **The design ramp each uses:** the footer's existing type (12px, `var(--text-3)`) and colours,
  with no new colour, weight or icon. The tray uses the shipped `tray-degraded.png`.
