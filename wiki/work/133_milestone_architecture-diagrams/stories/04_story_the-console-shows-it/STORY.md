---
type: story
number: 04
slug: the-console-shows-it
title: "The console shows it — DIAGRAMS rides the artifact manifest, the doc route forwards a member, and a milestone's new ARCHITECTURE tab renders each diagram as an image where its ADR links it"
parent: 133
depends: []
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-007]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/DESIGN.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-007
  - src/work/artifacts.mjs
  - src/commands/doc.mjs
  - src/board-ui.mjs
  - src/cache-read.mjs
  - src/artifact-sync.mjs
  - src/work/content-read.mjs
  - ui/src/board/DetailPanel.tsx
  - ui/src/board/Markdown.tsx
  - ui/src/board/api.ts
  - ui/src/board/freshness.mjs
  - ui/src/board/freshness.d.mts
  - ui/src/index.css
  - test/arch/work/acd-work-artifact-set-single-home.test.mjs
  - test/bundle/artifact-sync-manifest.test.mjs
  - test/work/delivered-story-records-reported.test.mjs
  - test/ui/board-api.test.mjs
  - test/ui/work-ui-board-serves-unchanged.test.mjs
  - test/ui/index.mjs
  - test/arch/ui/index.mjs
  - test/arch/ui/acd-board-write-isolation.test.mjs
  - test/arch/testing/acd-ui-directory-budget.test.mjs
  - test/arch/testing/acd-ui-surface-file-budget.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
files:
  - src/work/artifacts.mjs
  - src/board-ui.mjs
  - ui/src/board/api.ts
  - ui/src/board/DetailPanel.tsx
  - ui/src/board/Markdown.tsx
  - ui/src/board/diagrams.mjs
  - ui/src/board/diagrams.d.mts
  - test/arch/work/acd-work-artifact-set-single-home.test.mjs
  - test/bundle/artifact-sync-manifest.test.mjs
  - test/work/delivered-story-records-reported.test.mjs
  - test/ui/board-api.test.mjs
  - test/ui/board-diagrams.test.mjs
  - test/ui/index.mjs
  - test/arch/ui/acd-diagram-rendered-as-image.test.mjs
  - test/arch/ui/index.mjs
  - test/arch/testing/acd-ui-directory-budget.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - src/commands/diagram/file.mjs
  - src/diagrams/layout.mjs
  - src/command-core.mjs
  - src/cli.mjs
  - src/setup-ui.mjs
  - test/diagrams/diagram-layout.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/run/acd-run-status-renders-the-record.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 04 · The console shows it

## User story

As **anyone reading a milestone in the web console**,
I want **an ARCHITECTURE tab that renders the milestone's ADRs like every other doc tab, with each
ADR's diagram shown as a figure where the ADR links it (loading, shown, missing or failed), fetched
through the same document route and cache the other records ride**,
so that **I see the picture beside the decision, including a diagram a worker drew on another
machine, and the generator's markup never runs in the page**.

What lands (ADR-007, DESIGN): `{ name: "DIAGRAMS", dir: "diagrams", ext: ".svg" }` in
`WORK_ITEM_ARTIFACTS`, and `/api/work/doc` forwarding `member`. `DocName` gains `ARCHITECTURE` and
`api.doc` takes a member. The ARCHITECTURE tab goes second for milestones, and the Records row joins
it. `ui/src/board/diagrams.mjs` holds the pure collection, data-URI and figure-state logic, and
`Markdown` gains an `images` map used by its image renderer. FF-13304, FF-13305's leg, the `board`
row 22 → 24, and FF-5307's re-pin.

## Tasks

- [x] `tasks/00_diagrams-ride-the-manifest-and-the-doc-route-forwards-a-member.feature` — `DIAGRAMS` as the manifest's last entry (`.svg` only, one level), `work:doc` answers a member or an absent doc, `/api/work/doc` forwards `member` only when present, streamed by the sync, answered from the cache with provenance
- [x] `tasks/01_the-architecture-tab-renders-each-diagram-as-an-image-figure.feature` — `ui/src/board/diagrams.mjs`: members from `diagrams/<member>.svg` srcs, the data URI, response → figure state, escaped figure markup per state, the image renderer `Markdown` uses; a doc with no diagrams renders as today
- [x] `tasks/02_the-tab-conforms-to-the-design-checklist-in-the-real-board.feature` — `@manual`: the real board at 390/768/1280 judged against DESIGN's binding checklist — tab order, inline populated and missing figures, no sideways scroll, the Records row, no tab on a story
- [x] `tasks/03_the-figure-expands-and-the-block-links-open.feature` — `@bug` (F-133-01/02, raised at `aof:verify 133`): a populated figure opens a full-size viewer over the same data URI, and the block's `Source · PNG` links open the committed files through `diagram:file` at `/api/diagram/file`, served under `CSP: sandbox`

## Notes

- Independent of the spine. It needs no `src/diagrams` code, because the UI recognises a diagram
  only by its `diagrams/<member>.svg` image src.
- `DetailPanel.tsx` is at 993 of 1,000 lines, so it gains the tab, the Records row and one call.
  Everything else goes in `diagrams.mjs`.
- The design-conformance render follows DESIGN's render route. The fixture is a milestone with one
  linked diagram and one missing diagram, served by the real board.
