---
type: story
number: 04
slug: a-note-reaches-the-open-session
title: "A note reaches the open session — with the architect's session open, a new note is typed into it as it is written"
parent: 171
status: done
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-005, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-003, packages/diagrams-ui/src/editor-state.mjs, apps/ui/src/terminal/source-table.mjs, apps/ui/src/terminal/host-model.mjs, test/arch/session/acd-terminal-control-boundary.test.mjs, test/arch/ui/acd-fleet-terminal-input-constrained.test.mjs]
files: [apps/ui/src/terminal/TerminalControl.tsx, apps/ui/src/terminal/input-policy.mjs, apps/ui/src/terminal/input-policy.d.mts, apps/ui/src/diagram/DiagramSurface.tsx, apps/ui/src/diagram/dock-mount.mjs, apps/ui/src/diagram/dock-mount.d.mts, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, apps/ui/test/terminal-core-input-policy.suite.mjs, apps/ui/test/terminal-control-opens-its-socket.suite.mjs, apps/ui/test/diagram-address.suite.mjs, apps/ui/test/terminal-harness-drives-a-grid.suite.mjs, apps/ui/test/terminals-home-route.suite.mjs, test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs, test/smoke/diagram-editor.smoke.mjs, packages/contracts/src/tui-ready.mjs, packages/contracts/package.json, packages/execution/src/terminal/session-screen.mjs, apps/ui/package.json, yarn.lock, test/arch/terminal/acd-screen-has-one-reader.test.mjs, test/arch/session/acd-session-driver-mesh-blind.test.mjs, test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/command/acd-cli-entry-executes.test.mjs]
---
# 04 · A note reaches the open session

## User story

As **an operator talking to the architect from the diagram editor**,
I want **a note I add while its session is open to go straight into that session**,
so that **the architect takes my next thought while it is still in the conversation, instead of it
waiting for a batch review I have to remember to start.**

## Tasks

- [x] `tasks/00_the-terminal-types-a-later-input-once.feature` — the one TerminalControl seam: a later input typed once per sequence on the raw path
- [x] `tasks/01_the-surface-delivers-to-the-open-session.feature` — the surface's one delivery function; a new session also takes the waiting notes
- [ ] `tasks/02_a-live-session-takes-a-note-as-it-is-written.feature` — the operator's run with a real architect session

## Notes

- **The surface delivers** (ADR-005): one function in the diagram surface — dock open with its socket
  open, the note's invocation is typed into the session; otherwise the note waits, as in 170.
- **One terminal seam.** `TerminalControl` types a later input once per sequence number on the raw
  path, only while input is enabled; the once-per-sequence rule lives in `input-policy.mjs`.
- **Waiting notes go too** (171/04 Q1, 2026-10-24): a session started from the editor is typed the
  question's invocation, then the batch invocation when other notes are open.
- **Fixes a silent miss.** A second Ask architect on an open dock is typed into it; today it is never
  typed, because the session's identity does not include the command.
- `apps/ui/src` is digest-frozen (FF-5307, in `acd-loop-state-rides-the-run-record`); the re-pin
  carries the measured diff.
- **Not unattended.** A live `claude` session is a paid session; the browser check stands the session
  in with the PTY's echo, and the operator runs the real one at verify (170 RETROSPECTIVE R3).
