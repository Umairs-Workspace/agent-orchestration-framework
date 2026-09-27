---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# The session driver sees claude's screen — State

## Progress

- [ ] Framed 2026-09-25 on the backlog (un-numbered). Next: `aof:promote terminal-emulator`, then
  `aof:refine <NN>`.

## Notes & decisions in flight

- **Why now.** Two mitigations landed on 2026-09-24 read raw PTY bytes: lanes inherit
  `.claude/settings.local.json` (`6c4d81a`), and the driver waits for `CSI ?2004h` and fails fast
  after submit with the byte tail (`cf10030`). Both treat symptoms the driver cannot see; this
  milestone gives it the screen.
- **Library choice, as discussed with the operator.** `@xterm/headless` (the VT emulator with no DOM,
  used server-side the way VS Code's pty host does). Considered and not taken: terminal-kit (builds a
  TUI in the current terminal; does not emulate a child's screen), the expect family
  (pexpect/wexpect, expectrl, nexpect: byte-stream regex, brittle against a repainting TUI), a
  multiplexer (WezTerm `cli send-text/get-text`: heavier, external). `@microsoft/tui-test` is the
  reference design (node-pty + headless xterm) but a test runner, not a runtime.
- **Open for the refine's ARCHITECTURE:** what "input box visible" is on screen (and how it survives
  claude releases); which screens get a standing-consent action versus a named failure; whether the
  fleet view reuses the model; the screen model's memory bound for multi-hour sessions.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
