---
type: story
number: 01
slug: diagramming-is-a-package-pair
title: "Diagramming is a package pair the build can leave out — @aof/diagrams and @aof/diagrams-ui, depended on one way"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-001, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams/package.json, packages/diagrams/README.md, packages/diagrams/src/contribution.mjs, packages/diagrams/src/doctor-lane.mjs, packages/diagrams/src/generators.mjs, packages/diagrams/src/generator-diagram-design.mjs, packages/diagrams/src/layout.mjs, packages/diagrams/src/commands/export.mjs, packages/diagrams/src/commands/file.mjs, packages/diagrams/src/commands/plan.mjs, packages/diagrams/test/index.mjs, packages/diagrams/test/package-seams.suite.mjs, packages/diagrams/test/diagram-layout.suite.mjs, packages/diagrams/test/diagram-generator.suite.mjs, packages/diagrams-ui/package.json, packages/diagrams-ui/README.md, packages/diagrams-ui/src/fonts.mjs, packages/work/package.json, packages/work/src/commands.mjs, packages/work/src/doctor/index.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/bindings/work/doctor-diagrams.mjs, apps/ui/vite.config.ts, test/arch/diagrams/acd-diagrams-package-one-way.test.mjs]
---
# 01 · Diagramming is a package pair the build can leave out

## User story

As **the maintainer, who ships aof to clients that will not all want diagramming**,
I want **diagramming to live in two packages of its own, `@aof/diagrams` (node) and
`@aof/diagrams-ui` (browser), that depend on `@aof/work` and never the other way round**,
so that **a build can leave the Excalidraw SDK out. It added 188 packages (106 MB) and took the UI
dist from about 1 MB to 22 MB, and before this it was spread over four homes, none of which a build
could omit.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **The node half** holds the layout, the generator registry and its one adapter, the `diagram:*`
  verbs and the doctor lane, behind ONE `{ name, commands }` contribution core registers.
- **The browser half** holds the editor, its pure state and the pinned SDK, with React as a peer.
  It exports `./editor`, `./editor-state` and `./fonts`, so the app never names the SDK.
- **One way.** The work doctor takes the lane and the listing probe by injection (`diagramsGroup`,
  `diagramListing`, null by default). The board reaches the editor through one dynamic import.
  FF-13304 (`acd-diagrams-package-one-way`) pins the direction.
