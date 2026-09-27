---
type: milestone
number: 138
slug: terminal-emulator
title: "The session driver sees claude's screen — a server-side terminal emulator beside node-pty"
status: in-progress
owner: product-owner
created: 2026-09-25
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 138 · The session driver sees claude's screen — a server-side terminal emulator beside node-pty

## Objective

**The session driver knows what is on claude's screen.** Today `src/agent-session-driver.mjs`
spawns interactive `claude` in a node-pty ConPTY, types the directive after a readiness guess, and
learns everything else by inference: the session id and the outcome from transcript files, the
provider wait from a regex over raw bytes. Nothing renders the PTY's output, so a screen that writes
no transcript — a dialog, a prompt the typed directive missed, a login or usage-limit notice — is
invisible until a deadline fires. The driver gains a terminal emulator (`@xterm/headless`, the
server-side build of the xterm.js family the board UI already ships as `@xterm/xterm` 6) fed by the
same `term.onData` stream, and reads the rendered screen to decide when to type, what is blocking,
and what to record when a session fails.

Measured on 2026-09-24:

| fact | value | source |
|---|---|---|
| attempts lost to an unseen dialog | 9 (01/01, 01/06, 01/08 × 3), each idling to the 20-minute heartbeat deadline | a downstream repository's `loop-diag.01.2026-09-24T18-25-42-788Z.log` |
| the dialog | `.mcp.json` server approval: the lane lacked the git-ignored `.claude/settings.local.json` | fixed in `6c4d81a` (lanes inherit it) |
| attempts lost to a directive typed before the TUI listened | 3 (all three lanes launched together) | `loop-diag.01.2026-09-24T23-44-37-952Z.log`; attempt 2 in the same lanes ran |
| the mitigation | wait for `CSI ?2004h` (bracketed paste on), fail fast 90 s after submit with the ANSI-stripped byte tail | `cf10030` — reads raw bytes, cannot see the screen |
| what the fleet already renders | the same PTY bytes, client-side, in `@xterm/xterm` | `ui/package.json`, m38 story 06 |

**The outcome an outsider can verify:** a driven session types only once claude's input box is on
screen; a known blocking screen (trust, MCP approval, login, usage limit, update notice) is named
within seconds — handled where the answer is the operator's standing consent, otherwise failed with
that name — never discovered by a 20-minute deadline; and every timeout, death or unaccepted
directive leaves the rendered screen in the loop's diagnostics.

## Scope

In scope:

- **One screen model per driven session.** `@xterm/headless` beside node-pty, fed from `term.onData`,
  sized to the PTY; the only reader of "what is on screen".
- **Readiness from the screen.** Type when claude's input prompt is rendered, replacing the fixed
  delay and the `CSI ?2004h` byte check (`cf10030`) — kept as the fallback if the screen model fails.
- **Blocking screens, named.** A small registry of recognised screens (trust, `.mcp.json` approval,
  login / usage limit, update or release notes) with, per screen, either a standing-consent action or
  a named failure within seconds. The provider-wait regex (129/06 F-58) moves onto the screen model.
- **Screen evidence.** The rendered screen is written to loop-diag / the degrade log on every
  timeout, death, `directive-not-accepted` and needs-input stop.
- **One model, two readers.** The fleet terminal view (m38 story 06) can serialise the same model
  for a reconnecting viewer instead of replaying raw bytes — decided in ARCHITECTURE, not assumed.

Out of scope:

- `claude -p` and the Claude Agent SDK — operator ruling 2026-09-24: not yet. This milestone keeps the
  interactive PTY and makes it observable.
- Replacing node-pty — it is the only ConPTY binding for Node; its Windows kill path is handled by
  the child-process drive (`dee0c5f`) and stays as it is.
- Answering human questions — 131's subject. 131 parks the session and delivers the answer as the
  first typed input of a `--resume` re-drive (131/ADR-001, ADR-003); it never types into a live PTY,
  so it inherits this milestone's readiness and screen evidence with no change. Answering in place
  (the alternative 131/ADR-001 rejected) becomes possible once the screen is visible, and would be a
  later item of its own.

## Stories

Linear by construction: 01 consumes the verdict seam 00 lands, and 02 measures both (ADR-006).

- [x] `00_story_the-driver-reads-the-screen`: the dependency, the `src/terminal/` family (model,
  door, registry with `ready` and `usage-limit`), the driver typing on the input box, every
  verdict kind wired, and the screen recorded at every non-`done` stop.
- [x] `01_story_blocking-screens-are-named` (depends 00): `trust` answered by standing consent;
  `mcp-approval`, `first-run` and `login` failed as `blocked_screen`; the id carried to the lane
  narration and the halt line.
- [x] `02_story_a-live-session-proves-it` (depends 00, 01): the deployed driver measured against a
  real `claude` on this node and the WSL node.

## Dependencies

- None blocking. 131 (the human in the loop, stories in review) does not depend on it and needs no
  rework: its answer rides the re-drive's first typed input, the same path every directive takes.
- A new runtime dependency (`@xterm/headless`): explicit operator approval, a frozen install and
  `node scripts/supply-chain-audit.mjs` (AGENTS.md, Supply-Chain Safety).
