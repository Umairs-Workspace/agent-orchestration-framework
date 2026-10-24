---
type: story
number: 02
slug: the-opt-out-seam
title: "The opt-out seam — one capability read says whether this project offers the editor, and the editor follows the generator switch"
parent: 170
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-002, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams/src/commands/capability.mjs, packages/diagrams/src/contribution.mjs, packages/server/src/board-ui.mjs, apps/ui/src/board/api.ts, apps/ui/src/board/Markdown.tsx, apps/ui/src/board/DetailPanel.tsx, test/surfaces/board-api.test.mjs, test/arch/ui/acd-board-write-isolation.test.mjs]
---
# 02 · The opt-out seam

## User story

As **the operator of a project that has not turned diagrams on**,
I want **the board to ask once whether this project offers the editor, and to show no Edit draft
and fetch none of the editor when it does not**,
so that **turning diagrams off also turns the editor off, and a build without the package gives
the same answer without a second code path.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **One read** (ADR-002). `diagram:capability` (`aof diagram capability`) answers
  `{ absent, enabled, editor, generator }` through `work.diagrams`' one reader. `editor` equals
  `enabled`.
- **The board face** serves it as `GET /api/diagram/capability`. When the registry has no such
  command, the face answers the same shape with `absent: true`.
- **The ARCHITECTURE tab** asks once per mount through an injected asker and shows Edit draft only
  when `editor` is true. Any failure means "not editable", never a retry.
- **Tier two** (the package missing from a build) is answered correctly but cannot occur yet,
  because core imports the package statically. That follow-up is out of scope in the SPEC.
