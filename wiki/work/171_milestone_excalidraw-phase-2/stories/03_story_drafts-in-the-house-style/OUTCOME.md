# 03 · Drafts in the house style — Outcome

## Delivered

### The palette from the style guide
`house-style.mjs` reads the semantic-roles table of the guide `work.diagrams.style` names (its light column, hex or rgba) into a palette, and there is none without `paper` and `ink`; `diagram:scene` `read` and `context` carry it.

### Proposals and hand-drawn shapes start in the house style
`propose` fills `fill:paper, stroke:ink, color:ink` into every added node that has no style and is not a library item, before the diff, so the record and the preview say it; the editor seeds the SDK's current-item defaults from the palette, so a shape drawn by hand starts in it and a stored shape keeps its own colours.

## Assumptions

- **A project names a style guide with the roles table** — with no `work.diagrams.style`, or a guide lacking `paper` or `ink`, proposals are stored as written and the canvas keeps Excalidraw's defaults.
