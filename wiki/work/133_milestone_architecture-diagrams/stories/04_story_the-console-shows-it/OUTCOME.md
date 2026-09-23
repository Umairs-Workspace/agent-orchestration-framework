# 04 · The console shows it — Outcome

## Delivered

### Diagrams ride the artifact manifest
`DIAGRAMS` (`diagrams/*.svg`, one level) is the manifest's last entry. `aof work doc <ref> DIAGRAMS <member>` answers a diagram, the board's `/api/work/doc` forwards `member`, and a worker streams the SVG and never the source or the PNG (FF-13305).

### A milestone ARCHITECTURE tab
The board's milestone detail has an `ARCHITECTURE` tab, second after `SPEC`, that renders `ARCHITECTURE.md`. Each `diagrams/<stem>.svg` image appears inline where its ADR links it, as a loading, populated, missing or error figure. A diagram body reaches the page only as an encoded `data:image/svg+xml` image (FF-13304).

### A full-size diagram viewer
Clicking a populated figure opens a full-screen viewer over the same image. It opens fit to the screen, toggles to twice the viewBox width with scrolling, and closes on Esc, the backdrop or `×`.

### The block's links open the committed files
The pasted block's `Source · PNG` links, and the viewer's `Open in new tab`, open the committed `.html`, `.png` or `.svg` from this node's checkout through `aof diagram file` at `/api/diagram/file`. Every answer is served under `Content-Security-Policy: sandbox`.

## Assumptions

- **The file is on the serving node** — a row another node holds answers "not on this node". The worker stream carries the SVG alone.

## Gaps

### The installed board
- **Status:** open
- **Discharge condition:** `node scripts/install-local.mjs` has run and the operator has restarted the desktop app.
The tab, the viewer and the file route run in a board served from this checkout. The installed `aof.exe` payload does not carry them yet.
