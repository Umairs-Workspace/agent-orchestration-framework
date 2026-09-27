---
type: story
number: 01
slug: blocking-screens-are-named
title: "Blocking screens are named — trust answered by standing consent, navigated on the screen, MCP approval, first-run and login failed by name within seconds, and the name carried to the loop's own output"
parent: 138
depends: ["00"]
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
adrs: [ADR-003]
reads:
  - wiki/work/138_milestone_terminal-emulator/SPEC.md
  - wiki/work/138_milestone_terminal-emulator/RESEARCH.md
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-002
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-003
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-006
  - src/terminal/claude-screens.mjs
  - src/terminal/session-screen.mjs
  - src/terminal/screen.mjs
  - src/claude-trust.mjs
  - src/loop-bounds.mjs
  - src/run-store.mjs
  - src/commands/drive.mjs
  - src/commands/loop.mjs
  - src/loop/child-drive.mjs
  - src/loop/wave.mjs
  - src/loop/cycle.mjs
  - test/terminal/index.mjs
  - test/terminal/session-screen-verdicts.test.mjs
  - test/terminal/session-screen-ready.test.mjs
  - test/terminal/screen-model.test.mjs
  - test/arch/terminal/index.mjs
  - test/fixtures/claude-screens/first-run.json
  - test/fixtures/claude-screens/ready.json
  - test/fixtures/claude-screens/usage-limit.json
  - src/agent-session-driver.mjs
  - test/support/mesh-worker-terminal-fixture.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/support/loop/lane-fixture.mjs
  - test/arch/loop/acd-loop-family-boundary.test.mjs
files:
  - src/terminal/claude-screens.mjs
  - src/terminal/session-screen.mjs
  - src/terminal/screen.mjs
  - src/loop/child-drive.mjs
  - src/loop/wave.mjs
  - src/loop/cycle.mjs
  - test/terminal/index.mjs
  - test/terminal/claude-screens-registry.test.mjs
  - test/fixtures/claude-screens/trust.json
  - test/fixtures/claude-screens/mcp-approval.json
  - test/fixtures/claude-screens/login.json
  - test/arch/terminal/index.mjs
  - test/arch/terminal/acd-screen-registry-is-recorded.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-stops.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · Blocking screens are named

## User story

As **the operator reading a loop that stopped**,
I want **each screen claude can block on to be recognised from a recording, answered only where my
standing consent already answers it, and otherwise failed with its name within seconds, that
name printed by the loop itself**,
so that **an unseen dialog never again idles a lane to the heartbeat deadline, and I can tell from
the halt line which screen stopped it without opening a log**.

What lands (ADR-003):

- **The registry's four remaining v1 entries.**
  - `trust`, a consent. claude 2.1.283 opens it on `No, exit`, so the door reads the menu's order
    from the frame and walks to `Yes, I trust this folder` one arrow at a time, each confirmed on
    the next frame, then presses Enter, and only while the directive is untyped (ADR-003 §4 as
    amended 2026-09-27).
  - `mcp-approval`, `first-run` and `login`, each a fail as `blocked_screen`.
- **Their fixtures.** `trust`, `mcp-approval` and `login` are recorded from a real claude. The
  `first-run` recording already landed with 00.
- **The name, carried to the loop.** `childDriveOutcome` passes the driver's `screen` through.
  The lane settle narration reads `settle: failed (blocked_screen: <id>)`. The halt details carry
  `screen=<id>` in both the lane path (`wave.mjs`) and the sequential path (`cycle.mjs`).
- **Control.** FF-13802.

## Tasks

- [x] `tasks/00_three-screens-are-recorded-from-a-real-claude.feature` — `login` isolated; `trust` and `mcp-approval` operator-told, never approved, the projects entries removed; the arrow order measured live (`@manual`)
- [x] `tasks/01_the-registry-holds-the-six-v1-screens.feature` — the six in ADR-003's order; each recording claimed by its own entry; a quoted dialog above a live box is not a dialog
- [x] `tasks/02_trust-is-answered-and-the-rest-stop-by-name.feature` — arrows toward the option, each confirmed, then one Enter; unconfirmable navigation and returns fail; the other three stop within a frame, nothing typed
- [x] `tasks/03_the-screen-s-name-reaches-the-loop-s-own-output.feature` — `childDriveOutcome` checks the shape; the settle line; `screen=<id>` on both halt paths
- [x] `tasks/04_ff-13802-every-registered-screen-is-recorded.feature` — the control, its plants, its red probe, and `pending` retired

## Notes

- **No driver edit.** 00 lands every verdict kind (ADR-006), and the driver writes a consent's keys
  as they come. The navigation is the door's, and the cursor-key mode is the model's snapshot. That
  is why 01 writes `session-screen.mjs` and `screen.mjs`. This supersedes 00/04's ruling that a
  consent is one Enter and never an arrow. Operator's decision, 2026-09-27; 00's cases still hold,
  because an option absent from the menu is still a failure with no write.
- **Two captures are operator-told.** `trust` and `mcp-approval` need a configured claude in a
  scratch cwd, and that writes a projects entry into the operator's real `~/.claude.json`. The
  developer says so before capturing, and removes the entry afterwards. Both captures are
  zero-token: the probe types nothing but the keys a capture needs, and never a prompt.
- **Login is zero-token too.** `login` uses the isolated `CLAUDE_CONFIG_DIR`, one Enter past the
  theme picker.
- **`blocked_screen` is non-retryable with no edit.** `RETRYABLE_REASONS` stays as it is: the
  classifier fails closed (ADR-003 §5).
- **No command edits.** `commands/drive.mjs` and `commands/loop.mjs` are read, not written. The
  `--json` document spreads the driver's result, and `reportFacts` prints every non-null detail.
