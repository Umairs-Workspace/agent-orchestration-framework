---
type: story
number: 02
slug: export-writes-the-svg-and-the-png
title: "Export writes the SVG and the PNG — the adapter's SVG, a browser ladder that downloads nothing, and `aof diagram export`"
parent: 133
depends: [01]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-005, ADR-004]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-004
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-005
  - src/diagrams/layout.mjs
  - src/diagrams/generators.mjs
  - src/diagrams/generator-diagram-design.mjs
  - src/commands/diagram/plan.mjs
  - src/config-inspect.mjs
  - src/command-core.mjs
  - src/fs.mjs
  - test/diagrams/index.mjs
  - test/diagrams/diagram-plan-command.test.mjs
  - test/arch/diagrams/index.mjs
files:
  - src/diagrams/rasterize.mjs
  - src/commands/diagram/export.mjs
  - src/command-core.mjs
  - test/diagrams/index.mjs
  - test/diagrams/diagram-rasterize.test.mjs
  - test/diagrams/diagram-export-command.test.mjs
  - test/arch/diagrams/index.mjs
  - test/arch/diagrams/acd-diagram-export-no-playwright.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · Export writes the SVG and the PNG

## User story

As **the architect who has just drawn a diagram's source**,
I want **`aof diagram export <ref> <ADR-NNN>` to write the SVG through the adapter and then the PNG
through a headless browser that aof finds rather than installs, and to hand me the link block to
paste**,
so that **the exports are committed next to the source on any node that has a Chromium-family
browser, and a node without one keeps its SVG and says exactly what is missing**.

What lands (ADR-005): `rasterizeSvg` in `src/diagrams/rasterize.mjs`. It renders the committed SVG
at viewBox × 2 in an isolated, removed profile, and is done only when the process has exited and the
file exists and is non-empty. The browser ladder: config, env, cached headless shell, Chrome, Edge,
`PATH`. `diagram:export` with its refusals (`diagram-disabled`, `diagram-source-missing`,
`diagram-source-ambiguous`, `diagram-source-no-svg`, `diagram-svg-no-viewbox`,
`diagram-png-renderer-missing`, `diagram-png-render-timeout`, `diagram-item-delivered`). FF-13303.

## Tasks

- [x] `tasks/00_the-browser-ladder-picks-the-first-rung-and-downloads-nothing.feature` — `findBrowser` over injected facts: config → env → newest cached headless shell (numeric) → Chrome → Edge → `PATH`; per-OS cache roots; a pinned-but-missing browser is heard; lookups only
- [x] `tasks/01_the-rasterizer-waits-for-the-file-and-times-out.feature` — `browserArgv` + `rasterizeSvg`: window = viewBox, done = exited AND non-empty file (the Edge launcher case), stale output cleared, profile always removed, timeout and non-zero-exit codes
- [x] `tasks/02_aof-diagram-export-writes-the-svg-then-the-png-and-returns-the-block.feature` — `aof diagram export`: SVG first then PNG, the block from the layout, a PNG miss keeps the SVG and exits non-zero, coded refusals write nothing, re-export overwrites an open item
- [x] `tasks/03_a-real-render-on-this-machine.feature` — `@manual`: the shipped command renders a real 2000×960 PNG through the cached shell and through Edge, with no Playwright, Python or npx

## Notes

- The ladder and the spawn are injected (`exists`, `spawn`, `now`), so the suites drive every rung
  and the detached-launcher case (exit before write) without a real browser. One `@manual` scenario
  renders for real on this machine. That is the measurement ARCHITECTURE records (0.85 s, 2000×960).
- Transparency is not a requirement: the measured PNG is RGB and the diagram draws its own paper.
