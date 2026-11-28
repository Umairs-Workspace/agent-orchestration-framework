# 198/01 · A Claude project extracts its design system and names it in config — Outcome

## Delivered

### Extraction from the code and the project's canvases
`/aof:design-system extract` (Claude only) builds a Design System artifact from the code's CSS tokens and the boards of any number of canvases the operator names, standardising each colour only a board paints onto the code's tokens (map, accept into the code, or drop) before anything is published, and checks the published system against the code.

### The token verbs
`aof design-system tokens` prints the code's tokens in the Design System type's shape, with every value it cannot place and every mock-only colour's nearest code token; `check` exits non-zero on drift; `use` writes the block.

- **Tokens are placed by value as well as by name** — a project outside Tailwind's namespaces is read (F-03), and `type.families` keeps the type's map shape (F-02).

### `work.ui.designSystem`
The block names one system (by `name` or `artifact`), its `mode` (`owned` with `source`, or `reference`) and the project's one Design canvas, and the validator reports each defect under its own `design-system-*` code.

## Gaps

### Extract paths not yet run live
**Status:** open
**Discharge condition:** the first live run of a title collision, a declined inventory, a mock-only value accepted into code, and a loop-driven extract, each recorded in 198's VERIFICATION.md (F-08).
