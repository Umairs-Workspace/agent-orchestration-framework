---
type: story
number: 02
slug: a-live-session-proves-it
title: "A live session proves it — the deployed driver types on the input box, names a blocking screen in seconds, and leaves the screen in the degrade log, on this node and the WSL node"
parent: 138
depends: ["00", "01"]
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
adrs: [ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/138_milestone_terminal-emulator/SPEC.md
  - wiki/work/138_milestone_terminal-emulator/RESEARCH.md
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-001
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-002
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-003
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-004
  - .claude/rules/build-deploy-restart.md
  - scripts/install-local.mjs
  - scripts/deploy-wsl.sh
  - src/commands/drive.mjs
  - src/agent-session-driver.mjs
  - src/terminal/claude-screens.mjs
files:
  - src/agent-session-driver.mjs
  - scripts/deploy-wsl.sh
  - test/terminal/session-screen-ready.test.mjs
  - test/loop/unattended-launch-envelope.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · A live session proves it

## User story

As **the operator**,
I want **the deployed driver shown working against a real `claude` on this machine and on the WSL
node**,
so that **the milestone's three outcomes are measured at the source, not inferred from suites that
feed recordings**.

What is measured (no source file; evidence goes in `VERIFICATION.md`):

- **Typed on the input box.** A real drive's directive is typed on the first ready frame and
  accepted. The session id is captured, and no `tui-ready-marker-absent` or `screen-not-ready`
  line appears.
- **A blocking screen named in seconds, zero-token.** A drive under an isolated
  `CLAUDE_CONFIG_DIR` stops `failed / blocked_screen` with `screen=first-run` in the halt line,
  within seconds of spawn. The degrade log holds the rendered theme picker.
- **The screen at a stop.** A cancelled drive leaves a `session-screen` event whose rows are the
  REPL as drawn.
- **The WSL node.** The same first-run check on the WSL worker, after the `--wsl` deploy
  reinstalls the dependency.

## Tasks

- [x] `tasks/00_the-payload-lands-on-both-nodes-read-at-the-source.feature` — install `--wsl` from the main checkout; version and `@xterm/headless` 6.0.0 read on both nodes; nothing restarted
- [x] `tasks/01_a-blocking-screen-is-named-in-seconds-on-both-nodes.feature` — empty config: drive and loop stop `first-run` in seconds, picker in the degrade log; the WSL node the same (zero-token)
- [x] `tasks/02_a-real-drive-types-on-the-box-and-its-stop-leaves-the-repl.feature` — one small turn: accepted, cancelled at 45 s, the REPL in the degrade log, no fallback line

## Notes

- **The order of acts.** Install from the main checkout after 00 and 01 merge. The restart is
  the operator's act (the desktop app, never a hand-spawned daemon). The agent then measures at
  the source: `aof --version` carries the payload build id, and the daemons print it at startup.
- **The Mac worker is out of this story's measurement.** It needs `npm ci` after its pull, and it
  is operator-only. Until then it runs the byte-gate fallback and logs `screen-model-unavailable`
  once, which is ADR-001 §4 working as designed, not a failure of this story.
- **Tokens.** The typed-directive check spends one small real turn. Every other check is
  zero-token.
- **Built 2026-09-27.** The legs found two defects, both fixed in `d8d2230`, and their failed
  attempts stay in `VERIFICATION.md` as evidence:
  - `deploy-wsl.sh` synced `package.json` without its lock, and stamped a failed `npm ci`.
  - On Windows, a launch with no `TERM` made claude draw `>` for `❯`, so the driver recognised no
    screen. The launch env now declares the PTY's terminal.
