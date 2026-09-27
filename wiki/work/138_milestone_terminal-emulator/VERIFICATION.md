---
doc: verification
---
# 138 · The session driver sees claude's screen — Verification

## Fitness functions

Run each probe at the source: mutate one file, run the control and read its failure, then restore
the file and run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13801 | `test/arch/terminal/acd-screen-has-one-reader.test.mjs` | green, 6 cases (138/00, 2026-09-27) | Appended `const hasVisibleText = 0;` to the live `src/agent-session-driver.mjs` and ran the control alone: it went red with `no module but the model imports the emulator, the driver reads no screen, and only the door spells the markers` and `+ [ { file: 'src/agent-session-driver.mjs', spelling: 'hasVisibleText' } ] - []`. The backup was restored and `cmp` matched it, and the control ran green again. |
| FF-13802 | `test/arch/terminal/acd-screen-registry-is-recorded.test.mjs` | pending (138/01) | — |

## 138/00 task 00 — the dependency lands approved, pinned, frozen and audited (`@manual`)

Run by the builder on 2026-09-27 (`aof:continue 138 --solo`). Each command ran at the root of the
story's build checkout, `C:\Source\umami\aof-138` (branch `138-terminal-emulator-00`). That is a
worktree of this repository with its own `node_modules`: two live `aof work loop` runs held the main
checkout's `node_modules`, so it could not be reinstalled under them.

**The approval came first.** The operator's words and their date are quoted in `STATE.md` (Notes,
2026-09-27). They were recorded before `package.json` changed. The approval is the operator's
answer, not a refine review.

**`package.json`** — `dependencies["@xterm/headless"]` is `"6.0.0"`, and `devDependencies` does not
name it (read back: `{"dep":"6.0.0","dev":null}`).

**`package-lock.json`** — `packages["node_modules/@xterm/headless"]`, as written:

```json
{
  "version": "6.0.0",
  "resolved": "https://registry.npmjs.org/@xterm/headless/-/headless-6.0.0.tgz",
  "integrity": "sha512-5Yj1QINYCyzrZtf8OFIHi47iQtI+0qYFPHmouEfG8dHNxbZ9Tb9YGSuLcsEwj9Z+OL75GJqPyJbyoFer80a2Hw==",
  "license": "MIT",
  "workspaces": [
    "addons/*"
  ]
}
```

The entry has no `dependencies` field. `workspaces` is the package's own manifest field, carried
into the lock. No other `packages` key ends in `@xterm/headless`.

**The pin** — `npm install @xterm/headless@6.0.0 --save-exact --ignore-scripts` (`.npmrc` already
sets `ignore-scripts=true` and `save-exact=true`):

```
added 1 package, and audited 153 packages in 2s

7 vulnerabilities (1 low, 1 moderate, 5 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

**`npm ci --ignore-scripts`** — exit 0:

```
added 151 packages, and audited 153 packages in 15s

7 vulnerabilities (1 low, 1 moderate, 5 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

npm's own summary names none of this package. `npm audit --json` lists the seven as `@babel/core`
(low), `baseline-browser-mapping` (moderate), `browserslist`, `fast-uri`, `nanoid`, `postcss` and
`vite` (high). All seven are in the board's build toolchain and in `ajv`'s dependency tree, and none
is `@xterm/headless`.

**`npm ls @xterm/headless --omit=dev`** — one copy, with no child below it:

```
aof@0.1.0 C:\Source\umami\aof-138
`-- @xterm/headless@6.0.0
```

**`node scripts/supply-chain-audit.mjs`** — exit 0:

```
supply-chain audit passed: 0 warning(s)
```

## 138/00 — the build's live probe (PLAN.md, verification step)

Run on 2026-09-27 against `claude 2.1.283` from a scratch directory, with zero tokens and no real
config touched. The probe drove a real `claude` under an EMPTY `CLAUDE_CONFIG_DIR` through
`driveInteractiveClaudeSession`, over the real node-pty spawn, the real door and the real model. It
used `observeReadiness`, `terminateTree`, `commandDelayMs` 5000 and `readyCapMs` 15000, and an
isolated `AOF_GLOBAL_HOME`, so the degrade log was the probe's own. As printed:

```
result: {"outcome":"failed","failureReason":"timeout","sessionId":null} after 16184 ms
writes to the PTY: []
breadcrumbs: 15345ms stop-requested timeout | 16100ms tree-terminated | 16112ms pty-released | 16184ms exit-confirmed
degrade.log codes: screen-not-ready
screen-not-ready message: 138/00-probe: failed/timeout — no ready frame within 15000ms; nothing was typed
screen: screen normal {"row":21,"col":52}
 0 |Welcome to Claude Code v2.1.283
 2 | Let's get started.
 4 | Choose the text style that looks best with your terminal
 8 | ❯ 2. Dark mode ✔
15 | ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
21 |  Syntax theme: Monokai Extended (ctrl+t to disable)
```

(The screen rows are abridged to the ones that identify the picker. All 22 were recorded.)

- Nothing was typed into the picker.
- The stop came at the cap and went through the whole bracket.
- The one screen event is the live model's rendering of the frame that was up.

node-pty's forked console-list agent also printed `AttachConsole failed` twice after the tree
kill. That is the known Windows kill path running against a tree `taskkill /T` had already ended
(the 2026-09-12 bracket), not the driver.

## 138/01 task 00 — three screens recorded from a real claude (`@manual`, 2026-09-27)

`claude --version` printed `2.1.283 (Claude Code)`. Each capture ran from the builder's scratch
directory through the driver's own seams (80×24, `WT_SESSION` removed), with zero tokens: no prompt
was typed.

| fixture | how it was reached | chunks | duration | rendered frame |
|---|---|---|---|---|
| `login.json` | empty `CLAUDE_CONFIG_DIR`, one Enter on the theme picker | 9 | 573 ms | normal buffer: `Select login method:`, `❯ 1. Claude account with subscription · Pro, Max, Team, or Enterprise`, then the Console and 3rd-party rows |
| `trust.json` | the operator's configured claude in a never-trusted scratch cwd, no key | 7 | 745 ms | normal buffer, between rules: `Accessing workspace:`, the scratch path, `Quick safety check: …`, `❯ No, exit`, `  Yes, I trust this folder`, `Enter to confirm · Esc to cancel` |
| `mcp-approval.json` | a second scratch cwd whose `.mcp.json` names `probe-mcp` (`node -e process.exit(0)`), no key | 8 | 1,066 ms | normal buffer, dashed rules: `New MCP server found in this project: probe-mcp`, `Use this MCP server`, `Use this and all future MCP servers in this project`, `❯ Continue without using this MCP server` |

- **Scrubbed.** `trust.json` draws the scratch path. `Umair` became `Umami` and `umair` became
  `umami`, both same-length, so the frame renders the same. The private-terms check over every
  fixture found 0 hits.
- **The operator was told before their config was touched, and it is as it was.**
  - The `projects` keys were read by key and never printed: they name private projects, so the
    lists are pasted as a count and a hash.
  - Before the captures: 53,037 keys, sha256 `655a1b75a6c81ae3ed1338324bfe9105054d0003b2869e6c6f4b3c7b5fe1f29e`.
  - The captures added one key, the MCP folder's pre-trust. The trust capture ended on the
    unanswered dialog, so claude wrote nothing for it.
  - The cleanup removed that one key in one temp-then-rename write, as `src/claude-trust.mjs`
    writes.
  - After the cleanup: 53,037 keys, the same sha256. No prior key was missing and no scratch key
    was left. The scratch folders are deleted.
- **Three departures from the contract, each forced by what claude 2.1.283 draws.** They are routed
  to the operator in `STATE.md`.
  1. `trust.json`'s highlighted row is `❯ No, exit`. `Yes, I trust this folder` is the second
     option and is unnumbered, so the scenario's `❯ 1. Yes, I trust this folder` row does not
     exist.
  2. ADR-003 §4 admits one Enter and no arrow key, so no key can answer Yes. The MCP folder was
     therefore trusted through aof's own pre-write, `ensureWorktreeTrusted`, the seam every lane
     launch uses. No key reached either launch.
  3. `login.json` holds the whole recording, not "the chunks from the Enter on". Replayed alone,
     the two chunks after the Enter render the menu without its item numbers or banner: Ink
     redraws only the cells that changed.
