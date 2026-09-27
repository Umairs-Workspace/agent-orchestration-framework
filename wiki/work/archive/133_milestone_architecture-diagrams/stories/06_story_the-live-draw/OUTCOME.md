# 06 · The live draw — Outcome

## Delivered

### This repository draws diagrams, in the console's style
`.aof/aof.config.json` sets `work.diagrams = { generator: "diagram-design", formats: ["svg","png"], style: ".aof/diagrams/style.md" }`. The style file maps `ui/src/index.css`'s tokens and fonts into the plugin's style-guide structure, so a driven session never pauses for onboarding.

### ADR-002 carries its own diagram
133's ADR-002 links `diagrams/ADR-002-generator-seam.{html,svg,png}`, drawn and exported through the seam it describes. The operator accepted the drawing against its brief, its style and its PNG.

## Gaps

### The GitHub inline render
- **Status:** open
- **Discharge condition:** the branch is pushed and ADR-002's figure is seen rendering inline in `ARCHITECTURE.md` on GitHub (VERIFICATION F-133-06).
The SVG's inline render on GitHub has not been observed.
