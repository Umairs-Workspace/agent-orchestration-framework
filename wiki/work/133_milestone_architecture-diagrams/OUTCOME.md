# 133 · Architecture diagrams — Outcome

## Delivered

### An ADR's diagram runs end to end, from config to the console
In one repository, an opt-in in `work.diagrams` is enough for an architect to plan, draw, export, gate and show a diagram under its ADR. Each stage is a separate surface: m133/01 (config, layout, `plan`), m133/02 (`export`), m133/03 (the doctor lane), m133/04 (the ARCHITECTURE tab, viewer and file route) and m133/05 (the prose). m133/06 proves the chain on ADR-002.

### The generator is swappable at one seam
Replacing `diagram-design` means one new adapter file plus one config value. The architect prose, the file layout, the doctor lane and the console name no generator, and the adapter reserves a `readBack` direction for editing a diagram back into a superseding ADR.

## Assumptions

- **The plugin is installed somewhere on the drawing node** — `aof diagram plan` reports `available: false` with a fix when it is not, and aof installs nothing.

## Gaps

### Diagram read-back
- **Status:** open
- **Discharge condition:** a milestone implements the adapter's `readBack`, reading an edited diagram back as a proposed superseding ADR.
`readBack` is reserved as `null` on the one adapter. Nothing reads an edited diagram back.

### A second generator
- **Status:** open
- **Discharge condition:** a second adapter (Mermaid, D2, …) is registered and selectable in `work.diagrams.generator`.
The registry holds one adapter.
