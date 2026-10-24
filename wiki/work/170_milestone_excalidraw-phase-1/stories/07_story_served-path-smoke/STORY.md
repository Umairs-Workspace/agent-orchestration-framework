---
type: story
number: 07
slug: served-path-smoke
title: "The served-path smoke — a real browser drives the served editor through a first draft, libraries, a note, a batch review, accept and publish, and its screenshots are read"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [03, 04, 05, 06, 08, 09]
reads: [wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md, wiki/work/170_milestone_excalidraw-phase-1/RETROSPECTIVE.md]
files: [test/smoke/diagram-editor.smoke.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 07 · The served-path smoke

## User story

As **the maintainer accepting the editor**,
I want **a real browser to drive the editor that `aof work ui` serves, with diagrams on and with
diagrams off, through every path the milestone delivers**,
so that **a green result means the served page works, not only the files behind it.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md (24/24 checks), and acceptance goes through `aof:verify 170`.

## Notes

- **Run:** `node test/smoke/diagram-editor.smoke.mjs --playwright <dir> --channel chrome`. It is
  hand-run, not a registered suite, because it needs a Chromium and playwright-core, and neither is
  a dependency.
- **It stands in for the architect** with the real CLI calls `/aof:diagram-review` makes
  (`context`, `respond`, `propose`), so no paid session runs unattended.
- **Screenshots are read**, not only taken. They caught defects that every check passed over three
  times (RETROSPECTIVE R1, R6, R8).
