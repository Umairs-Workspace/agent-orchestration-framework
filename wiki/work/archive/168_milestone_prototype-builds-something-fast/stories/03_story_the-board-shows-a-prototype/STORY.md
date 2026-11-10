---
type: story
number: 03
slug: the-board-shows-a-prototype
title: "The board shows a prototype — in the existing status lanes, badged `prototype · <status>`, never counted in the milestone tallies"
parent: 168
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-003, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-007, packages/work/src/lifecycle.mjs, apps/ui/src/board/api.ts, apps/ui/src/board/model.ts, apps/ui/src/board/BoardLanes.tsx, apps/ui/src/board/status.tsx, apps/ui/src/board/Overview.tsx, apps/ui/src/fleet/Fleet.tsx, apps/ui/src/board/DetailPanel.tsx, apps/ui/test/support/board-app-harness.mjs, packages/work/src/artifacts.mjs, packages/work/src/commands/doc.mjs, test/arch/work/acd-work-artifact-set-single-home.test.mjs, test/bundle/artifact-sync-manifest.test.mjs, test/surfaces/board-api.test.mjs, test/surfaces/board-backlog-and-archive.test.mjs]
files: [apps/ui/src/board/api.ts, apps/ui/src/board/model.ts, apps/ui/src/board/BoardLanes.tsx, apps/ui/src/board/DetailPanel.tsx, packages/work/src/artifacts.mjs, test/surfaces/board-api.test.mjs, test/surfaces/board-backlog-and-archive.test.mjs, apps/ui/src/board/status.tsx, test/bundle/artifact-sync-manifest.test.mjs]
---
# 03 · The board shows a prototype

## User story

As **the operator looking at the board**,
I want **my prototypes on it next to the governed work, with their own status in plain sight**,
so that **an active prototype does not quietly disappear from the board because its status is
not one of the five the lanes are keyed on.**

## Tasks

- [x] [00 · A prototype card sits in an existing lane, badged with its type and its own status word](tasks/00_a-prototype-card-sits-in-an-existing-lane.feature)
- [x] [01 · Opening a prototype card shows its own two documents](tasks/01_the-detail-panel-shows-its-two-documents.feature)

## Notes

- **The measured gap** (ADR-007). `place` in `BoardLanes.tsx` drops an item whose status has no
  lane. Adding prototypes to `otherDrivers` without the lane mapping would hide every `active` and
  `paused` one.
- **The mapping** is one function in `model.ts`: `active` to `in-progress`, `paused` to
  `not-started`, and `done` and `abandoned` to `done`. The card tag is `prototype · <status>`.
- The milestone tallies, `activeMilestones` and `blockedGates` never count a prototype.
- **The detail panel** (EXAMPLES Q1, answered 2026-10-22, ratified in this contract): a prototype
  card opens on `PROTOTYPE.md` with a `STATE.md` tab. `PROTOTYPE` joins the one artifact set
  (`artifacts.mjs`, held to one home by `acd-work-artifact-set-single-home`), so `work:doc` serves it and a worker streams it; `STATE`
  is already there. This widens ADR-007 past UI-only by that one entry; still no new component
  and no DESIGN.md. `yarn ui:build` is part of this story's check.
