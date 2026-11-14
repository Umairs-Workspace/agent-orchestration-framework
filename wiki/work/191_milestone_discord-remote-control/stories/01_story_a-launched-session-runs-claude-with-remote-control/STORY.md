---
type: story
number: 01
slug: a-launched-session-runs-claude-with-remote-control
title: "A launched session runs Claude with Remote Control on — the node types `claude --remote-control` from a closed launch value, and the session ends when Claude ends"
parent: 191
depends: [00]
status: in-review
owner: product-owner
created: 2026-11-11
updated: 2026-11-14
adrs: [ADR-002]
schema: 1
aofVersion: 0.1.0
reads:
  - packages/mesh/src/terminal-input.mjs
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-002
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q1
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q2
  - wiki/work/archive/50_milestone_session-launcher/ARCHITECTURE.md#ADR-007
  - packages/mesh/src/worker-stream-client.mjs
  - packages/mesh/src/commands/terminal-resume.mjs
  - packages/mesh/src/session.mjs
  - packages/execution/src/pty.mjs
files:
  - packages/mesh/src/session-spawn-directive.mjs
  - packages/mesh/src/session-spawn-handler.mjs
  - packages/mesh/src/terminal-input.mjs
  - packages/mesh/test/mesh-session-spawn-directive.suite.mjs
  - test/mesh/session/mesh-session-spawn-handler.test.mjs
  - test/arch/session/acd-launched-session-from-discord.test.mjs
  - packages/mesh/src/commands/session.mjs
  - packages/work-loop/src/loop-session-stream.mjs
  - packages/core/src/application/bindings/commands/drive.mjs
---
# 191/01 · A launched session runs Claude with Remote Control on

## User story

As **an operator starting a session from a phone**,
I want **the session to come up as Claude with Remote Control already on, under a name I can find
in the Claude app**,
so that **I can drive it from the phone at once, and nothing reachable from Discord is ever a bare
shell**.

What lands (ADR-002): the optional `launch` field on the `session-spawn` frame, from the closed set
`SESSION_LAUNCHES`. `launchCommandLine` builds the one line the handler types. The session name is
derived from the record. The control-minted id goes to `claude` as `--session-id`, so the grid
shows one slot. FF-19102 is the second leg of `acd-launched-session-from-discord`.

## Tasks

- [x] 00 [the launch field is a closed set on the wire](tasks/00_the-launch-field-is-a-closed-set-on-the-wire.feature)
- [x] 01 [the node types one command line it builds itself](tasks/01_the-node-types-one-command-line-it-builds-itself.feature)
- [x] 02 [one session, one record, ended with Claude](tasks/02_one-session-one-record-ended-with-claude.feature)
- [ ] 03 [a real launch shows up in the Claude app](tasks/03_a-real-launch-shows-up-in-the-claude-app.feature)
- [x] 04 [a Claude launch keeps one record under Claude's own label](tasks/04_a-claude-launch-keeps-one-record-under-claudes-own-label.feature) — `@bug`, F-05

## Notes

- **F-05 (2026-11-14).** ADR-002 §4 is superseded: a Claude launch registers under `claude-code`,
  from `CLAUDE_HOOK_ASSISTANT` in `session-spawn-directive.mjs`. Task 04 is the `@bug` task, and
  task 02's first scenario now names that label. `files:` gains the label's three readers. 08 also
  writes `session-spawn-handler.mjs`, so build the two one after the other.
- **Task 03 (F-06, ruled 2026-11-14).** Its first scenario is carried to the milestone's outsider
  check, which observes the Claude app listing and the fleet tile from the phone.

- The fleet route never sets `launch`, so `New session ▾` still opens a bare shell (50/ADR-007).
  `mesh-ui-session-route.test.mjs` is not touched.
- Task 03 is the RESEARCH Q1/Q2 measurement. It decides whether ADR-002 §6's 200 columns stand.
  Record the bytes seen and the trust-dialog outcome in VERIFICATION.md.
- Task 02's first scenario rests on the hook path resolving the session-worktree cwd to the same
  workspace id the launcher registered. If it resolves differently, that is a contract gap: report
  it, and do not widen `files:` silently to reach `packages/mesh/src/session.mjs`.
