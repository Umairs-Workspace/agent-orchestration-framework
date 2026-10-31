# 00 · Quit reaps the whole tree on macOS — Outcome

## Delivered

### Quit reaps the whole tree
On macOS every supervised daemon leads its own process group, and Quit, SIGTERM and a quit Apple Event each TERM every group, wait 5 s and KILL what is left, so no `aof` process outlives the app (FF-17501).

### The menu-bar menu
A left-click on the menu-bar icon opens the menu, which stays open: it is replaced only when its items change, and the icon only when its glyph does. Windows still shows the window on a left-click.

### The window on a Mac
The window keeps the native traffic lights over its own title bar, and the red light hides it to the menu bar. The node row shows the hostname whole where it fits, with the role badge and `this node` chip in one centred group (DESIGN M3, M4).

## Assumptions

- **macOS has no parent-death signal** — an app killed with SIGKILL, or one that crashes, leaves its daemons running, and the runbook gives the recovery.

## Gaps

### Crash containment on macOS
- **Status:** open-by-decision
- **Discharge condition:** the ROADMAP item "Crash containment for the desktop app on macOS" is delivered.
If the app dies without a Quit, its daemons survive it and hold `:4181`/`:4182` until reaped by hand (ADR-001 §5).

### The window's restyle on Windows
- **Status:** open
- **Discharge condition:** the operator sees the window on the Windows control node after the next `--desktop` deploy there.
The F-13 badge group, flexible name column and 26 px control height apply to Windows too, and were rendered headless but not seen there.
