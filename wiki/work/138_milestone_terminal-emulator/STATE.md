---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 138 · The session driver sees claude's screen — State

## Progress

- [x] Framed 2026-09-25 on the backlog (un-numbered); promoted to 138.
- [x] Refined 2026-09-27 (solo, at the operator's choice): RESEARCH (two zero-token PTY probes of
  `claude 2.1.283`), ARCHITECTURE (ADR-001–006, FF-13801/13802, one diagram), and three stories.
  Next: `aof:refine 138/00` (its contract), after the operator approves the dependency.
- [x] Contracts authored 2026-09-27 (`aof:refine 138/00-02 --solo`): 00 has seven tasks, 01 five
  and 02 three, each with a `PLAN.md`. All three validate. The dependency approval is still
  00's first task, not this refine's.

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
- **Answered at refine** (was open): input box = ADR-002; consent vs failure = ADR-003; fleet
  reuse = ADR-005 (no); memory bound = ADR-001 §3.
- **Default decisions taken at refine** (DEFAULT DECISION in ARCHITECTURE):
  - No ready frame at the cap fails as a retryable `timeout`, and nothing is typed (ADR-002 §5).
  - MCP approval is a named failure, not a consent (ADR-003 §4).
  - Screen evidence goes to `degrade.log`, not loop-diag, because every drive is a child process
    (ADR-004 §4).
- **Near-miss found at refine.** claude's select menus use the same `❯` glyph as the prompt
  (RESEARCH Q2), so a "prompt visible" test by glyph would type into dialogs. ADR-002 §1 is
  structural for that reason.
- **Found by reading, not measured.** The driver's raw output buffer is never trimmed, and the
  sentinel scan re-splits all of it on every chunk. 00 bounds both (ADR-001 §3).
- **Decided while authoring the contracts** (each is ratified in the task that states it):
  - The driver reaches the door through `options.openSessionScreen`, and tests force the byte
    path by injecting a `load` that throws. The load outcome is remembered per loader function
    (00/02, 00/03).
  - A synthetic fixture says so in its `claude` field (`synthetic: <source>`) and keeps the
    `<id>.json` name. This settles ADR-003 §7's name-versus-file wording (00/02).
  - A consent "returns" only after a frame on which its entry did not recognise. A repaint before
    claude takes the Enter is not a return (00/04).
  - The degrade event gains a `screen` field. `key` only throttles and is not written. The message
    no longer embeds the byte tail (00/05).
  - FF-13802's "no other entry" is scoped to the frame-deciding entries. `usage-limit` is drawn on
    a REPL frame, so `ready` also claims it (01/01).
  - 01 also writes `test/loop/loop-command-stops.test.mjs`, which holds `childDriveOutcome`'s
    cases and the sequential halt line (01/03).
  - 02 restarts nothing, because every leg is a CLI verb or a script and loads the payload on each
    call. Its WSL leg drives the distro's deployed tree from a scratch script (02/00, 02/01).
  - RESEARCH Q2's banner row is scrubbed for the private-terms guard, and recordings are scrubbed
    with same-length substitutions (00/02).
- **Open, for the operator:**
  - approval of `@xterm/headless@6.0.0` as a runtime dependency (00's first task);
  - committing the 2026-09-27 driver fix, uncommitted on main, before any lane branches;
  - `npm ci` on the Mac worker after it pulls.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
