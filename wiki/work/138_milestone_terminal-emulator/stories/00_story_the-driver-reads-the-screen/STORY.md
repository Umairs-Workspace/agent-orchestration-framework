---
type: story
number: 00
slug: the-driver-reads-the-screen
title: "The driver reads the screen — one headless model per session behind one door, typing on the input box, and the screen recorded at every stop"
parent: 138
depends: []
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/138_milestone_terminal-emulator/SPEC.md
  - wiki/work/138_milestone_terminal-emulator/RESEARCH.md
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-001
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-002
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-003
  - wiki/work/138_milestone_terminal-emulator/ARCHITECTURE.md#adr-004
  - src/agent-session-driver.mjs
  - src/degrade.mjs
  - src/mesh/log.mjs
  - src/loop-bounds.mjs
  - src/run-store.mjs
  - src/work/observe.mjs
  - src/commands/drive.mjs
  - src/mesh/worker-execution.mjs
  - scripts/install-local.mjs
  - scripts/test.mjs
  - ui/package.json
  - package.json
  - test/session/agent-session-driver-drives.test.mjs
  - test/session/agent-session-driver-transcript.test.mjs
  - test/support/mesh-worker-terminal-fixture.mjs
  - test/work/four-deadlines.test.mjs
  - test/mesh/worker/mesh-worker-liveness.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/arch/session/acd-session-driver-single-home.test.mjs
  - test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs
  - test/arch/audit/acd-no-new-silent-catch.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/diagrams/index.mjs
  - test/diagrams/index.mjs
  - test/support/source-slice.mjs
files:
  - package.json
  - package-lock.json
  - src/terminal/screen.mjs
  - src/terminal/session-screen.mjs
  - src/terminal/claude-screens.mjs
  - src/agent-session-driver.mjs
  - src/degrade.mjs
  - scripts/test.mjs
  - test/terminal/index.mjs
  - test/terminal/screen-model.test.mjs
  - test/terminal/session-screen-ready.test.mjs
  - test/terminal/session-screen-verdicts.test.mjs
  - test/terminal/session-screen-evidence.test.mjs
  - test/fixtures/claude-screens/ready.json
  - test/fixtures/claude-screens/first-run.json
  - test/fixtures/claude-screens/usage-limit.json
  - test/fixtures/claude-screens/ready.classic.json
  - test/arch/terminal/index.mjs
  - test/arch/terminal/acd-screen-has-one-reader.test.mjs
  - test/session/agent-session-driver-drives.test.mjs
  - test/session/agent-session-driver-door.test.mjs
  - test/work/four-deadlines.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/arch/session/acd-terminal-mirror-geometry-pinned.test.mjs
  - test/arch/session/acd-terminal-view-live-observable.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 00 · The driver reads the screen

## User story

As **the operator whose loops drive interactive `claude` sessions unattended**,
I want **every driven session to carry a terminal emulator fed by its own PTY output, the directive
typed only once claude's input box is on screen, and the rendered screen written down whenever a
session stops for any reason other than `done`**,
so that **a directive is never pasted into a TUI that is not listening, never typed into a dialog,
and every failure leaves the screen that explains it**.

What lands (ADR-001, ADR-002, ADR-004, and ADR-003 §1 and §6):

- **The dependency.** `@xterm/headless` `6.0.0`, exact, after operator approval, with a frozen
  install and a clean supply-chain audit.
- **The family.** `src/terminal/`, founded with three members:
  - `screen.mjs`: the model, lazily loaded, `scrollback: 0`.
  - `session-screen.mjs`: the door. It owns the model, the recognisers, the byte-gate fallback
    moved out of the driver verbatim, and the evidence renderer.
  - `claude-screens.mjs`: the registry, with its `ready` and `usage-limit` entries.
- **The driver's rewire.**
  - It feeds every chunk to the door.
  - It acts on all four verdict kinds: type, consent, blocked (`failed / blocked_screen` with
    `screen: { id }` on the result) and wait.
  - The directive is typed on the first ready frame, and nothing is typed at the cap.
  - The parked paste is read from the input box.
  - The provider wait is read from the screen.
  - The sentinel scan keeps a bounded line carry.
  - Evidence is taken at every non-`done` stop.
- **`degrade.mjs`.** `reportDegrade` gains an optional `extra.key`, and throttles per
  (code, key).
- **Fixtures.** `ready`, `first-run` (the menu the `ready` recogniser must reject) and a synthetic
  `usage-limit`. `ready.classic`, the classic renderer's box on the normal buffer, joined at
  138's verify, when the operator struck the alternate-buffer clause (m138/F-03).
- **Controls.** FF-13801, and FF-5301 re-pinned (direct imports plus
  `terminal/session-screen.mjs`, reach 25 → 28).

## Tasks

- [x] `tasks/00_the-dependency-lands-approved-pinned-and-audited.feature` — operator approval first; `6.0.0` exact; frozen, scripts off; audit clean (`@manual`)
- [x] `tasks/01_the-terminal-family-is-founded-and-registered.feature` — four exemptions naming 01's members too; two indexes; FF-5301 at 28, FF-5302 unmoved
- [x] `tasks/02_one-screen-model-renders-what-claude-drew.feature` — `createScreen`, `scrollback: 0`, the lazy load memoised per loader; the three fixtures
- [x] `tasks/03_the-directive-is-typed-on-the-input-box.feature` — the four-part `ready` test; paste on the first ready frame; nothing typed at the cap; the byte path verbatim; parked paste from the box
- [x] `tasks/04_every-verdict-the-screen-can-give-is-acted-on.feature` — consent once, blocked by name within a frame, the wait from the screen, via an injected registry
- [x] `tasks/05_every-stop-but-done-leaves-the-screen.feature` — one event per non-`done` stop, before the kill; `reportDegrade` per (code, key)
- [x] `tasks/06_the-driver-reads-no-screen-of-its-own.feature` — FF-13801 with plants and a red probe; the sentinel scan keeps one line

## Notes

- **The base must be committed first.** The uncommitted 2026-09-27 driver fix (paste-ready only
  with something drawn since paste-ON, the parked-paste resubmit, and the cap degrade) is this
  story's starting point. A dispatch lane branches from a commit, so that work must land on the
  milestone branch before `aof:continue 138`.
- **Approval first.** The dependency is the first task and is operator-gated (AGENTS.md). Nothing
  else in this story can go green without the package present.
- **The verdict seam is landed whole.** Consent and blocked verdicts are exercised here through an
  injected test registry. Story 01 adds the real entries and never edits the driver (ADR-006).
- **Scripted PTYs keep their timing.** A scripted `ptySpawn` never draws a REPL frame, so
  `realLaunch` stays keyed as it is today, and existing suites keep their fixed write. The new
  suites feed recorded fixtures through a real model.
- **Fixture capture** follows RESEARCH Q2's recipe. `first-run` uses an isolated
  `CLAUDE_CONFIG_DIR`. Both are zero-token and touch no real config.
- `test/session` is at 37 of 37 and `test/arch/session` at 32 of 32. The new suites go in the new
  subject directories, which are budget exemptions naming their members, so no row is raised.
- **The four exemptions name story 01's members too** (`src/terminal`, `test/terminal`,
  `test/arch/terminal`, `test/fixtures/claude-screens`). That way 01 edits no budget line, on
  133's precedent.
