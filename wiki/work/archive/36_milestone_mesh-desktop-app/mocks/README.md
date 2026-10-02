# Mocks — milestone 36 (Mesh Desktop App)

Commit the generated design exports here as **locally-readable artifacts** (the read-only
designer must be able to `Read` them at review — a remote `claude.ai/design` link is not a
baseline, per m03's lesson / ADR-003).

Expected surfaces (referenced from `../DESIGN.md` as the conformance source of truth):

- `node-work-window.png` — the main native window: status/control bar + the fleet node/work list
  (design all four states: empty / loading / error / populated).
- `tray-menu.png` — the Windows taskbar tray menu + the tray icon states (healthy / degraded / stopped).

Until a surface's PNG lands, `DESIGN.md`'s **mandatory binding checklist** is that surface's
baseline. Once committed, the PNG becomes the pixel source of truth.

To generate the mocks, paste [`PROMPT.md`](PROMPT.md) into a UI/design agent (claude.ai design,
Figma AI, or any HTML-artifact tool) — it is grounded in `../DESIGN.md` so the output conforms to the
binding checklist the `@uat` design gate judges against.

`AOF Mesh - standalone.html.txt` is the approved claude.ai design export, kept as the token/structure source the desktop UI was built from. It is a self-unpacking bundle that parses its own embedded template as HTML and runs it, so it is stored inert (`.txt`) rather than as executable code in the repository; copy it to a `.html` file to view it in a browser. The PNGs above are the pixel baselines.
