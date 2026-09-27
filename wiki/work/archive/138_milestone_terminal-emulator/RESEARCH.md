---
doc: research
---
# 138 · The session driver sees claude's screen — Research

Measured 2026-09-27 at refine, on this machine (Windows 11, ConPTY), against `claude 2.1.283`.
Every fact below was measured or read at the source; nothing is recalled.

## Q1 · What is `@xterm/headless`, as published?

| fact | value | source |
|---|---|---|
| latest | `6.0.0` (dist-tag `latest`); `6.1.0-beta.*` on `beta` | `npm view @xterm/headless dist-tags` |
| licence | MIT | `npm view … license` |
| runtime dependencies | none (no `dependencies` field) | `npm view … dependencies` |
| unpacked size | 1,957,834 bytes | `npm view … dist.unpackedSize` |
| entry | `lib-headless/xterm-headless.js` | `npm view … main` |
| family match | the board already ships `@xterm/xterm` `6.0.0` (`ui/package.json`, root `node_modules/@xterm/xterm`) | `package.json` |
| serialise addon | `@xterm/addon-serialize` `0.14.0` exists; not needed (ADR-005) | `npm view` |

Nothing was installed. A pure-JS package with no dependencies rides both deploy shapes as they
stand: `scripts/install-local.mjs` copies the production closure (`npm ls`) beside the payload, and
the SEA fallback bundle inlines pure-JS dependencies. The WSL node reinstalls when
`package-lock.json`'s sha changes (`scripts/deploy-wsl.sh`). The Mac worker is an `npm link`ed clone,
so it needs `npm ci` after the pull. Until then the model is unavailable there, and ADR-001 §4 makes
that a fallback rather than a failure.

## Q2 · What does claude draw, and when? (the zero-token PTY probe)

The recipe: a scratch script spawns `claude` through the driver's own seams
(`resolveInteractiveDriverLaunch("claude")` + `defaultPtySpawn`, 80×24, `WT_SESSION` removed), types
nothing, records every `onData` chunk with its offset, and kills the tree after 9 s (`taskkill /T /F`,
then `term.kill()`). No input means no turn and no tokens. The frames were rendered by feeding the
chunks into the browser build `@xterm/xterm` 6.0.0 under Node with a three-line DOM shim. That was
enough for a probe. The runtime uses the headless build (ADR-001).

**A trusted, configured checkout (this repo):**

| t (ms) | what arrived |
|---|---|
| 76 | `CSI ?9001h CSI ?1004h` (win32-input and focus modes) |
| 315 | clear screen, title `claude` |
| 444–460 | three yellow `Permission deny rule …` warnings, on the **normal** buffer |
| 945 | `CSI ?2004h` (paste ON, the pre-REPL probe) |
| 1043 | `CSI >0q`, `CSI ?u` (capability queries) |
| 1339 | `CSI ?2004l` (paste OFF) |
| 1837 | `CSI ?2004h` (paste ON again, the REPL) |
| 1861 | title `✳ Claude Code` |
| 1911 | `CSI ?1049h` (**alternate** screen) and the whole REPL frame in one chunk |
| 2576, 3709 | incremental repaints (an `agents-md` notice, a PR link in the footer) |

The rendered REPL frame at 80×24 (alternate buffer, cursor at row 22, column 3):

```
 2| ▐▛███▛█   Claude Code v2.1.283
 3|▝▜██████▀  Opus 5.5 with xhigh effort · Claude Max
 4| ▝▝   ▝▝   C:\Source\umami\aof
 7|● agents-md: no CLAUDE.md found; AGENTS.md loaded:
20|                                                             ◉ xhigh · /effort
21|────────────────────────────────────────────────────────────────────────────────
22|❯ Try "create a util logging.py that..."
23|────────────────────────────────────────────────────────────────────────────────
24|  ⏵⏵ auto mode on (shift+tab to cycle) · PR #2 · ← for agents
```

**An isolated, never-configured claude** (`CLAUDE_CONFIG_DIR=<scratch>/cfg`, cwd `<scratch>/cwd`). No
real config was read or written. This is the screen a worker with no claude setup gets:

```
 1|Welcome to Claude Code v2.1.283
 3| Let's get started.
 5| Choose the text style that looks best with your terminal
 8|   1. Auto (match terminal)
 9| ❯ 2. Dark mode ✔
10|   3. Light mode
16| ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
22|  Syntax theme: Monokai Extended (ctrl+t to disable)
```

This frame is on the **normal** buffer, with the cursor at row 22, column 53.

### Findings that shape the ADRs

1. **`❯` is not the prompt.** claude uses the same glyph as the cursor of every select menu
   (`❯ 2. Dark mode ✔`). The trust and MCP-approval dialogs are select menus too (F24,
   `6c4d81a`). A "`❯` is visible" test would call a dialog ready and type the directive into it.
   The directive's Enter would then accept the highlighted default, which for the MCP dialog is
   "Use this server". Readiness has to be structural (ADR-002).
2. **The REPL lives on the alternate buffer; startup noise and the first-run menu live on the
   normal one.** The buffer kind is a free, strong discriminator.
3. **The input box is a row between two full-width `─` rules, with the cursor on it.** Menus use
   dashed `╌` rules and indent their `❯` by one column.
4. **The REPL frame arrives whole.** At 1911 ms the banner, rules, prompt and footer came in one
   chunk, 74 ms after the second paste-ON. A recogniser run on the settled frame sees it at once.
   There is no half-drawn prompt to guard against.
5. **What the driver reads today is a byte stream.** `buffer += text` is never trimmed
   (`src/agent-session-driver.mjs`, the `onData` handler). `containsNeedsInputSentinel` splits the
   whole accumulated buffer on every chunk. The readiness marker, the provider-wait regex, the
   parked-paste regex and `screenTail()` all read that string with escapes stripped, not the
   screen. This was read from code, not measured at runtime. It is the memory question the SPEC
   leaves open (ADR-001 §3).

## Q3 · Which screens can be captured without spending tokens or touching real config?

| screen | how it is reached | capturable at build without the operator? |
|---|---|---|
| ready (REPL prompt) | any configured, trusted cwd | yes (this probe) |
| first-run (theme picker) | `CLAUDE_CONFIG_DIR` pointing at an empty dir | yes (this probe) |
| login | the same isolated dir, past the theme picker with one Enter | yes (keys go only to the isolated claude) |
| trust | a configured claude in a never-trusted cwd | no: claude records the cwd in the operator's real `~/.claude.json` |
| MCP approval | a configured claude in a cwd with an un-approved `.mcp.json` | no, for the same reason |
| usage limit | cannot be induced | the text is measured (129/06 F-58, loop 127, 2026-09-15); `PROVIDER_WAIT_RE` holds it |
| update / release notes | not observed blocking on 2.1.283 | no capture, so no entry (ADR-003 §2) |

## Q4 · Where can screen evidence be written from?

- **Every drive is a child process** (`src/loop/child-drive.mjs`, 2026-09-24): lanes and the
  sequential drive alike. The loop's `installLoopDiagnostics` lives in the parent, and its
  `onSessionStop` wiring (`src/commands/loop.mjs`, the launch seam) never reaches a driver in
  another process. So loop-diag cannot receive screen evidence from the driver.
- `reportDegrade` (`src/degrade.mjs`) is reachable from every process that hosts a driver: a lane
  child, the sequential child and the mesh worker daemon. It already carries
  `directive-not-accepted` with an escape-stripped byte tail. It throttles **per code, per
  process, for 5 s**, so the worker daemon, which hosts several sessions in one process, can drop
  the second session's evidence.
- A drive child's `--json` document already carries `outcome`, `failureReason` and `sessionId`
  to the parent (`childDriveOutcome`), and the parent narrates `settle: failed (<reason>)`, which
  loop-diag tees.
- The retry classifier is closed and fails closed (`src/run-store.mjs`,
  `RETRYABLE_REASONS = runtime_offline | timeout | session_limit`). A new failure reason is
  non-retryable with no edit there.

## Q5 · How does claude 2.1.283 draw the trust and MCP dialogs, and does an arrow key move them?

Measured 2026-09-27 at 01's capture and at 01's re-refine, with zero tokens. No prompt was typed,
and no Enter was sent where it would answer anything. The recordings are in
`test/fixtures/claude-screens/`.

| fact | value |
|---|---|
| trust dialog | normal buffer, a solid rule on top, `Accessing workspace:`, the path, `Quick safety check: …`, then the menu, then `Enter to confirm · Esc to cancel` |
| trust menu | ` ❯ No, exit` (highlighted, the DEFAULT) above `   Yes, I trust this folder`, both unnumbered |
| MCP dialog | normal buffer, a solid rule on top, `New MCP server found in this project: <name>`, three unnumbered options; the highlighted DEFAULT is `❯ Continue without using this MCP server` |
| login screen | normal buffer, `Select login method:`, `❯ 1. Claude account with subscription …` highlighted |
| cursor-key mode | no recording enables DECCKM (`CSI ?1h`), so an arrow is `CSI B` / `CSI A` |
| one Down on the trust menu | highlights `❯ Yes, I trust this folder`, in a 78–81 byte redraw that moves `❯` from row 16 to row 17 (`CSI 16;2H` space, `CSI 17;2H ❯`) |
| Up, then Down again | back to `❯ No, exit`, then to `❯ Yes, …` again: each arrow moves the highlight one item, in order |
| with no Enter | nothing is written to `~/.claude.json` (its `projects` keys were unchanged by the probe) |

**Findings that shape ADR-003 §4 (amended).**

1. A one-Enter consent on the highlighted option can never answer trust on 2.1.283. Its Enter
   would pick `No, exit`.
2. The order of the options is readable from the frame, and each arrow's effect is visible in the
   next frame. So a consent can navigate by the screen and confirm every step before it answers.
3. The MCP dialog's default is not "Use this server", as the 2026-09-27 driver comment assumed. It
   stays a `fail` either way.
