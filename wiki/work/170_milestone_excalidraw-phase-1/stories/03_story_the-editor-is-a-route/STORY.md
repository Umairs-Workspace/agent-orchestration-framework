---
type: story
number: 03
slug: the-editor-is-a-route
title: "The editor is a route — /diagram?ref=&file=, addressed by query, listed under no nav item, with the architect's session docked beside the canvas"
parent: 170
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-003, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [apps/ui/src/app/routes.mjs, apps/ui/src/app/routes.d.mts, apps/ui/src/app/shell-nav.mjs, apps/ui/src/app/shell-nav.d.mts, apps/ui/src/app/shell-layout.mjs, apps/ui/src/diagram/DiagramSurface.tsx, apps/ui/src/diagram/diagram-address.mjs, apps/ui/src/diagram/diagram-address.d.mts, apps/ui/src/diagram/dock-mount.mjs, apps/ui/src/diagram/dock-mount.d.mts, apps/ui/src/main.tsx, apps/ui/src/index.css, apps/ui/test/app-routes.suite.mjs, apps/ui/test/diagram-address.suite.mjs, apps/ui/test/terminals-home-route.suite.mjs, apps/ui/test/shell-entry-plan.suite.mjs, apps/ui/test/support/react-app-harness.mjs, test/arch/ui/acd-no-surface-mode-url-literal.test.mjs, test/arch/testing/acd-ui-directory-budget.test.mjs]
---
# 03 · The editor is a route

## User story

As **the operator, working in the editor with the architect's session open**,
I want **the editor at its own address, `/diagram?ref=&file=`, with the dock beside the canvas**,
so that **I can deep-link to it from the architect's hand-back and reload back into it, and opening
it no longer replaces the board, which dismissed unsaved work and hid the dock.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **A fifth route row** (ADR-003), `{ id: "diagram", path: "/diagram" }`, rendered
  `content:fixed`. The nav lists it under no item through its own exported unlisted set.
- **The address vocabulary** (`?ref=&file=`) is the surface's own module, `diagram-address.mjs`.
  The route table still knows no query key but `mode`.
- **The dock** is the surface's own posture author (`dock-mount.mjs`), a `local-pty` typed with the
  review invocation, contributed to the shell's overlay slot.
- **Owed.** The local-PTY mount builder is now spelled twice (board and diagram). Lifting it into
  `apps/ui/src/terminal/` is out of scope in the SPEC.
