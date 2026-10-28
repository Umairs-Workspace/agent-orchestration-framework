---
type: story
number: 03
slug: the-diagram-surface-has-no-terminal
title: "The diagram surface has no terminal — the dock's posture author and the terminal's later-input seam leave with the dock"
parent: 172
status: done
owner: product-owner
created: 2026-10-27
updated: 2026-10-28
depends: [02]
reads: [wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-003, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-005, apps/ui/src/diagram/DiagramSurface.tsx, apps/ui/src/terminal/source-table.mjs, apps/ui/src/board/dock-mount.mjs, packages/contracts/src/tui-ready.mjs]
files: [apps/ui/src/diagram/dock-mount.mjs, apps/ui/src/diagram/dock-mount.d.mts, apps/ui/src/terminal/TerminalControl.tsx, apps/ui/src/terminal/input-policy.mjs, apps/ui/src/terminal/input-policy.d.mts, apps/ui/test/terminal-core-input-policy.suite.mjs, apps/ui/test/terminal-control-opens-its-socket.suite.mjs, apps/ui/test/diagram-address.suite.mjs, test/arch/ui/acd-fleet-terminal-input-constrained.test.mjs, test/arch/session/acd-terminal-control-boundary.test.mjs, test/loop/invariant-4-amended.test.mjs, test/surfaces/fleet-terminal-view-surface.test.mjs, test/arch/testing/acd-ui-directory-budget.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs]
schema: 1
aofVersion: 0.1.0
---
# 03 · The diagram surface has no terminal

## User story

As **a maintainer of the board's terminal**,
I want **the code that existed only to type into the diagram editor's dock removed once the dock is
gone**,
so that **the terminal control carries no seam nothing calls, and the surface table no longer lists a
dock that no surface renders.**

## Tasks

- [x] `tasks/00_the-dock-modules-leave-the-diagram-surface.feature` — the diagram's posture author and the later-input seam are removed, and every control that listed them says so

## Notes

- **After story 02.** Story 02 stops the surface rendering a dock and passing `onDeliver`; this story
  removes what then has no caller (ADR-003 §4, superseding m171/ADR-005): `apps/ui/src/diagram/
  dock-mount.mjs` + `.d.mts`, and from the terminal control the `laterInputs` /
  `onLaterInput` / `onSessionReady` props with `flushLaterInputs` and the `LaterInput` types in
  `input-policy.mjs`. The mount command's own readiness typing (`typeCommand`,
  `COMMAND_READY_CAP_MS`, the outbox from F-171-01) stays: the board's dock uses it.
- **Every control that names them moves with them:** the fourth surface row of
  `acd-fleet-terminal-input-constrained`, the posture-home sweep in `invariant-4-amended`, the
  `diagram/` member lists in both directory budgets (a ceiling that shrinks with the tree), the
  boundary test, and the FF-5307 digest re-pin with the measured diff.
- Measure the blast radius before deleting: every importer of the removed names, by grep, is in
  `files:`; one found outside it is a contract gap to report.
