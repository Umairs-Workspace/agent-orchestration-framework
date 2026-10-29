---
doc: design
---
# 175 · aof on macOS — Design

## Intent

This is the same ambient ops tool m36 designed, on a Mac. The operator glances at the menu bar,
sees the fleet's health in the icon, and moves on. Nothing about what the app shows changes: the
window and the menu render the same `mesh status` data, read-only. What changes is where the app
sits on a Mac and how it is reached. The Mac surfaces should feel like a macOS menu-bar utility,
much as the Windows ones feel like a Windows 11 utility.

## Conformance source of truth

- **The window and the menu's contents:** the m36 mocks, which stay the visual source of truth.
  They are `wiki/work/archive/36_milestone_mesh-desktop-app/mocks/node-work-window.png` and
  `wiki/work/archive/36_milestone_mesh-desktop-app/mocks/tray-menu.png`, with m36 DESIGN's
  checklists for Surfaces 1 and 2. A Mac render is judged against them on regions, components
  and states. Where Windows chrome (Segoe, acrylic) differs from macOS chrome, the Mac render
  follows the macOS chrome. The window's font stack already falls back to `system-ui` (SF), and
  no CSS changes.
- **The macOS deltas:** no mock exists, so the binding checklist below is the source of truth.
  It covers the menu-bar icon, the app's Dock presence and how the icon is clicked.

## Render breakpoints

- None. This is a fixed-size native window (760 × 520) and a native menu, as in m36.

## Screens / surfaces

### Surface M1 — the menu-bar icon and its menu (binding checklist)

**Layout regions, in order**
1. **The status item** in the right-hand area of the macOS menu bar. It shows one of the three
   state glyphs m36 designed (healthy, degraded, stopped). It sits at the menu bar's height, about
   18 pt, with no text beside it.
2. **The menu**, opened from the status item. It holds m36 Surface 2's regions in their order:
   the header, the process controls, Open web UI, Show / Hide window, a separator, then Quit.

**Components**
- The three embedded PNG glyphs, scaled to the menu bar. They stay full-colour, not macOS
  template images, because the badge colour is part of the signal (m36: shape and badge, not
  colour alone, so the shape still reads in a monochrome bar).
- Native `NSMenu` items, from the same `tray_menu()` model. Leading glyphs are omitted where macOS
  menus show none.

**States**
- *Empty / loading / error / populated:* exactly m36 Surface 2's header words (`no nodes yet`,
  `checking…`, `mesh unreachable`, `N online · M stale`).
- *Light and dark menu bars:* the glyph stays legible on both. A glyph that disappears on
  either bar is a gap.

**Design ramp**
- macOS menu-bar conventions: system menu font and native highlight. There is no custom skin.

### Surface M2 — Dock and app presence (binding checklist)

- **The app is menu-bar only** (`LSUIElement`). It has no Dock tile and no app menu, and it does
  not appear in the app switcher. That is the macOS form of an ambient tray app. The operator
  chose this on 2026-10-28 (`175/01 Q1`).
- **The window keeps m36's custom title bar.** It has no macOS traffic lights (`decorations:
  false`). Its `✕` hides the window to the menu bar, as on Windows.
- **A left-click on the status item opens the menu,** following the Mac convention. The window is
  reached through the menu's Show / Hide window item. The operator chose this on 2026-10-28
  (`175/00 Q2`). Windows keeps its left-click-shows-window behaviour.
- **No macOS mock was supplied** (asked at refine, 2026-10-28). This checklist and the m36 mocks
  are the baseline.

## Review notes

- A Mac render that matches the m36 regions but uses Windows chrome (Segoe glyphs, acrylic) is
  **not** a gap. A missing region or state is.
- The menu-bar glyphs are 32 × 32 PNGs today. If they read as blurry at menu-bar size on a Retina
  display, that is a gap the build may fix by adding @2x assets. No new glyph design is called for.
