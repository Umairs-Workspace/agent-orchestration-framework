# 02 · Export writes the SVG and the PNG — Outcome

## Delivered

### `aof diagram export`
`aof diagram export <ref> <ADR-NNN>` writes the adapter's SVG, then a PNG, beside the drawn source, and returns the link block ready to paste. A PNG miss keeps the SVG, exits non-zero and names what is missing.

### A browser ladder that downloads nothing
The PNG comes from the first browser the ladder finds: the configured `browser`, then the cached ms-playwright headless shell or Chromium (both cache layouts), then an installed Chrome or Edge. The browser argv is formed in one function, and no Playwright, Python or `npx` is involved (FF-13303).

### Export waits for the file
The rasterizer counts a render as done only when the process has exited AND a fresh, size-stable PNG exists. A launcher that returns before writing (Edge) is waited on, not trusted.

## Assumptions

- **A Chromium-family browser is on the node** — there is at least one ladder rung. Without one the PNG is a coded miss and the SVG still ships.
