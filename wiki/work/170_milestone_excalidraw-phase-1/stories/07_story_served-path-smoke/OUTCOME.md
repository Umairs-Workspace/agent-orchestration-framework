# 07 · The served-path smoke — Outcome

## Delivered

### A real-browser check of the served editor
`test/smoke/diagram-editor.smoke.mjs` serves two throwaway projects (diagrams on, diagrams off) with the real `aof work ui`. In installed Chrome it drives the board link, first draft, library insertion, freehand, notes, batch review, accept and publish, with the real CLI standing in for the architect.

## Assumptions

- **A browser and playwright-core on hand** — the smoke takes `--playwright <dir>` and a Chrome channel. It is not part of the registered suite, and it starts no paid session.
