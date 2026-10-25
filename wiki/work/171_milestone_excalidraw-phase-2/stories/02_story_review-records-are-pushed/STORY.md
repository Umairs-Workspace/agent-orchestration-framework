---
type: story
number: 02
slug: review-records-are-pushed
title: "Review records are pushed — an answer, a proposal or a saved draft reaches the open editor without a reload"
parent: 171
status: in-review
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-003, wiki/work/171_milestone_excalidraw-phase-2/DESIGN.md, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-001, packages/work/src/discovery.mjs, packages/diagrams/src/layout.mjs, test/arch/diagrams/acd-diagrams-package-one-way.test.mjs, test/arch/run/acd-run-status-renders-the-record.test.mjs]
files: [packages/diagrams/src/commands/scene.mjs, packages/server/src/board-ui.mjs, packages/server/src/setup-ui.mjs, test/support/board-face-fixture.mjs, packages/diagrams-ui/src/review-stream.mjs, packages/diagrams-ui/src/review-stream.d.mts, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/package.json, packages/diagrams-ui/README.md, packages/diagrams-ui/test/review-stream.suite.mjs, packages/diagrams-ui/test/index.mjs, test/diagrams/diagram-scene-api.test.mjs, test/diagrams/diagram-scene-review.test.mjs, test/fixtures/application/command-inventory.json, test/arch/diagrams/acd-diagram-face-imports-nothing.test.mjs, test/arch/diagrams/index.mjs, test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs, test/arch/run/acd-run-status-renders-the-record.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs]
---
# 02 · Review records are pushed

## User story

As **an operator with a diagram open while the architect works on my notes**,
I want **its answers and proposals, and a draft saved elsewhere, to appear in the open editor as
they are written**,
so that **I review the architect's work the moment it exists instead of reloading the page to find
out whether anything happened (F-170-13).**

## Tasks

- [x] `tasks/00_the-face-streams-what-moved.feature` — the `stamp` action and the events route, its watch, tick and safety re-stamp
- [x] `tasks/01_the-editor-follows-the-stream.feature` — the panel refreshes, the canvas follows the saved draft, the poll is the fallback
- [ ] `tasks/02_seen-in-the-browser.feature` — an answer, a proposal and a second window's save, in the served editor

## Notes

- **A signal, not the data** (ADR-003): `GET /api/diagram/events` says what moved (`review` or
  `scene`); the editor re-reads through `proposals` and `read`, so the records keep one reader.
- **The face names no diagram path.** The new `stamp` action returns the stat identities and the
  directories to watch, built in `layout.mjs`; the face watches those, re-stamps, and falls back to a
  2 s tick when a watch cannot start (167/ADR-009's pattern). FF-17101 lands here.
- **The canvas follows the file.** A clean canvas is replaced in place when the saved draft changes
  elsewhere; one with unsaved edits is kept and offered a reload.
- **The poll is the fallback.** The five-second poll runs only while the stream is down.
- `board-ui.mjs` is digest-pinned (`acd-loop-state-rides-the-run-record`); the re-pin carries its
  reason.
