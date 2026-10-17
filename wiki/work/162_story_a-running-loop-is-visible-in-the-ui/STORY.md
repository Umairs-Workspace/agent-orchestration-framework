---
type: story
number: 162
slug: a-running-loop-is-visible-in-the-ui
title: "A running loop is visible in the UI — its Claude session streams live to its session card, and the loop shows its progress"
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-10-17
schema: 1
aofVersion: 0.1.0
tags: [bug, loop, ui]
reads: ["wiki/work/162_story_a-running-loop-is-visible-in-the-ui/ARCHITECTURE.md#adr-001-a-drive-child-relays-its-pty-output-through-its-own-nodes-daemon-over-a-loopback-ingress","wiki/work/162_story_a-running-loop-is-visible-in-the-ui/ARCHITECTURE.md#adr-002-a-loop-driven-session-states-that-it-is-relayed-and-driven-and-its-pane-is-read-only","wiki/work/162_story_a-running-loop-is-visible-in-the-ui/ARCHITECTURE.md#adr-003-the-loop-entry-carries-its-drives-timing-and-one-ui-module-composes-the-progress","wiki/work/162_story_a-running-loop-is-visible-in-the-ui/ARCHITECTURE.md#adr-004-the-loop-prints-a-drive-status-line-every-five-minutes-from-the-spawn-seam","wiki/work/162_story_a-running-loop-is-visible-in-the-ui/ARCHITECTURE.md#adr-005-the-homes-empty-state-names-the-running-loop","wiki/work/162_story_a-running-loop-is-visible-in-the-ui/EXAMPLES.md","packages/mesh/src/worker-stream-client.mjs","packages/mesh/src/relay.mjs","packages/mesh/src/control-stream-server.mjs","packages/mesh/src/session-spawn-handler.mjs","packages/execution/src/runs.mjs","packages/work/src/observe.mjs","apps/ui/src/home/feed-axis.mjs","apps/ui/src/terminal/input-policy.mjs"]
files: ["packages/mesh/src/terminal-relay-bridge.mjs","packages/core/src/application/bindings/mesh/terminal-relay-bridge.mjs","packages/core/src/application/bindings/mesh/launcher.mjs","packages/core/src/application/bindings/commands/loop.mjs","packages/core/src/application/assemble.mjs","packages/mesh/src/launcher.mjs","packages/mesh/src/session.mjs","packages/mesh/src/presence.mjs","packages/mesh/src/global-query.mjs","packages/work-loop/src/commands/drive.mjs","packages/core/src/application/bindings/commands/drive.mjs","packages/work-loop/src/child-drive.mjs","packages/work-loop/src/drive-status.mjs","packages/core/src/application/bindings/loop/child-drive.mjs","packages/work-loop/src/commands/loop.mjs","packages/work-loop/src/wave.mjs","apps/ui/src/components/loop-line.mjs","apps/ui/src/components/loop-line.d.mts","apps/ui/src/fleet/runs.mjs","apps/ui/src/fleet/runs.d.mts","apps/ui/src/fleet/scope.mjs","apps/ui/src/fleet/api.ts","apps/ui/src/fleet/Fleet.tsx","apps/ui/src/home/page-state.mjs","apps/ui/src/home/page-state.d.mts","apps/ui/src/home/session-mount.mjs","apps/ui/src/home/session-mount.d.mts","apps/ui/src/home/feed-axis.d.mts","apps/ui/src/home/Home.tsx","test/mesh/terminal/mesh-terminal-relay-bridge.test.mjs","packages/mesh/test/mesh-terminal-stream-relay-transport-wired.suite.mjs","test/mesh/session/mesh-session-per-session-record.test.mjs","test/mesh/presence/mesh-presence-record.test.mjs","packages/mesh/test/mesh-presence-session-wire.suite.mjs","packages/mesh/test/mesh-session-index-projection.suite.mjs","test/loop/drive-command-phase-drivers.test.mjs","test/loop/loop-command-narration.test.mjs","test/loop/loop-command-wave.test.mjs","apps/ui/test/home-session-mount.suite.mjs","apps/ui/test/terminals-home-page-states.suite.mjs","test/surfaces/fleet-scope.test.mjs","test/mesh/ui/mesh-ui-serve.test.mjs","test/arch/session/acd-loop-terminal-ingress.test.mjs","test/arch/session/index.mjs","test/arch/ui/acd-loop-pane-read-only.test.mjs","test/arch/ui/index.mjs","test/arch/session/acd-terminal-output-signal-source.test.mjs","test/arch/session/acd-session-record-frozen.test.mjs","test/arch/session/acd-session-entry-frozen-wire.test.mjs","test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs","test/arch/ui/acd-home-pane-truth.test.mjs","test/arch/testing/acd-ui-directory-budget.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","packages/mesh/src/store.mjs","packages/core/src/application/bindings/mesh/store.mjs","apps/desktop/crates/core/src/view_model.rs","scripts/workspace-runtime-audit.json","packages/mesh/test/mesh-presence-additive-sessions.suite.mjs","packages/mesh/test/mesh-presence-session-entry.suite.mjs","test/arch/run/acd-active-runs-frozen-string-array.test.mjs","test/arch/session/acd-captured-producer-fixture.test.mjs","test/arch/session/acd-session-attribution-single-authority.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","test/arch/session/acd-session-index-derived-not-stored.test.mjs","test/arch/session/acd-session-producer-fact-survives-the-wire.test.mjs","test/arch/session/acd-session-run-reconciliation.test.mjs","test/bundle/bundle-claude-session-hooks.test.mjs","test/bundle/yarn-installation.test.mjs","test/mesh/session/mesh-session-cli-record.test.mjs","test/mesh/session/mesh-session-index-attribution.test.mjs","test/mesh/session/mesh-session-spawn-handler.test.mjs","test/session/session-spawn-outcome-lane.test.mjs"]
---
# 162 · A running loop is visible in the UI

## User story

As **the operator who runs `aof work loop` and walks away**,
I want **to open the web UI (or the desktop app) and watch what the loop's Claude session is
doing right now, live, and to see at a glance how far the loop has got and whether it is working
or stalled**,
so that **I can tell a loop that is quietly working from one that is stuck, without reading
transcript files by hand, and stop it or leave it alone on evidence. Today every refine drive
runs for 60–80 minutes behind a frozen `Driving 03/07` line, the UI's session card for that
session says "no live output — no assignment is relaying this session", and on 2026-09-27 the
operator stopped and restarted a healthy loop twice because it looked dead.**

## Tasks

- [x] [00 · A loop-driven session streams to its card, read-only](tasks/00_loop-session-streams-to-its-card.feature)
- [x] [01 · The loop's progress on the home page and the fleet](tasks/01_loop-progress-in-the-ui.feature)
- [x] [02 · The loop's progress in the terminal](tasks/02_loop-progress-in-the-terminal.feature)
- [x] [03 · The home's empty state names the running loop](tasks/03_home-empty-state-names-the-loop.feature)

## Notes

- **The defect, measured.** Every terminal-frame producer lives inside a mesh daemon. A loop
  drive is a separate `aof work drive` child whose Claude driver is given no `onOutputChunk`, so
  its session (measured: `89b1d500`, language-tutor 03/07) registers and works but never streams.
  ARCHITECTURE.md carries the `file:line` trace and the five decisions.
- **Decided at refine (EXAMPLES Q1–Q4, 2026-10-17).** Loops on every machine stream, through each
  node's own daemon. The terminal status line prints every five minutes. The UI flags a drive
  quiet for ten minutes or more. The transcript fallback (what `~/.aof/watch-session.mjs` shows)
  is **out of scope** and belongs in a backlog item of its own.
- **Out of scope.** Codex native drives (they have no PTY to relay). Lane workspace
  registrations flooding mesh-serve.log with `workspace-workdir-unresolvable`. A
  `projection.sqlite` node row with no prune path. The stale `identity.json` and ghost `loop 02`
  line fixed on 2026-09-27.
- **The stream stays read-only.** The loop's session is unattended, and typing into it would race
  the driver's own directive and nudge. Operator interaction stays with `aof work answer` and the
  loop's `--stop`.
- **Landing it needs both daemons restarted.** The control node's desktop app and the WSL worker
  must restart to load the ingress, so the `@uat` in task 00 is operator-gated.
