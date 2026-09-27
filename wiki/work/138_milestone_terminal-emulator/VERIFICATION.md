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
| FF-13802 | `test/arch/terminal/acd-screen-registry-is-recorded.test.mjs` | green, 8 cases (138/01, 2026-09-27) | Set `trust`'s `option` in the live `src/terminal/claude-screens.mjs` to `Always trust this folder` and ran the control alone: it went red with `+ [ { entry: 'trust', fixture: 'trust.json', message: 'trust.json · trust · option absent from its menu', rule: 'option absent from its menu' } ]`. The backup was restored and `cmp` matched it, and the control ran green again. |

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
| `trust.json` | the operator's configured claude in a never-trusted scratch cwd, no key | 7 | 745 ms | normal buffer, a solid rule on top: `Accessing workspace:`, the scratch path, `Quick safety check: …`, `❯ No, exit`, `  Yes, I trust this folder`, `Enter to confirm · Esc to cancel` |
| `mcp-approval.json` | a second scratch cwd whose `.mcp.json` names `probe-mcp` (`node -e process.exit(0)`), no key | 8 | 1,066 ms | normal buffer, a solid rule on top: `New MCP server found in this project: probe-mcp`, `Use this MCP server`, `Use this and all future MCP servers in this project`, `❯ Continue without using this MCP server` |

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
- **Three departures from the original contract, each forced by what claude 2.1.283 draws.** The
  operator decided them, and 01's contract was re-refined to match (STATE, 2026-09-27):
  1. `trust.json`'s highlighted row is `❯ No, exit`. `Yes, I trust this folder` is the second
     option and is unnumbered.
  2. A keyed Enter would have picked `No, exit`, so the MCP folder was trusted through aof's own
     pre-write, `ensureWorktreeTrusted`, the seam every lane launch uses. No key reached either
     launch.
  3. `login.json` holds the whole recording, not "the chunks from the Enter on". Replayed alone,
     the two chunks after the Enter render the menu without its item numbers or banner: Ink
     redraws only the cells that changed.
- **The arrow order, measured live (the re-refine, 2026-09-27; operator told first).**
  - A third never-trusted scratch cwd, with no Enter sent.
  - The frame had no application cursor keys (no `CSI ?1h` in any recording), so the arrows were
    `CSI B` and `CSI A`.
  - As printed:

    ```
    dialog up; highlighted: [ '15:❯ No, exit' ]
    Down (ESC [ B): highlighted ["16:❯ Yes, I trust this folder"]; redraw 81 bytes: "\u001b[m\u001b[16;2H \u001b[1CNo, exit\u001b[38;2;177;185;249m\u001b[17;2H❯\u001b[1CYes, I trust this folder\u001b[m"
    Up (ESC [ A): highlighted ["15:❯ No, exit"]; redraw 78 bytes: "\u001b[38;2;177;185;249m\u001b[16;2H❯\u001b[1CNo, exit\u001b[m\u001b[17;2H \u001b[1CYes, I trust this folder"
    Down again: highlighted ["16:❯ Yes, I trust this folder"]; redraw 78 bytes: "\u001b[16;2H \u001b[1CNo, exit\u001b[38;2;177;185;249m\u001b[17;2H❯\u001b[1CYes, I trust this folder\u001b[m"
    killed without Enter
    ```

  - Afterwards the `projects` keys were 53,038. The one new key is another live session's lane,
    `…/.aof/mesh/dispatch-02-01` in another workspace, not the probe's. No key under the scratch
    root was added, and the scratch cwd is deleted.

## 138/01 — the build's live check (PLAN.md, verification step)

Run on 2026-09-27 against `claude 2.1.283` from a scratch directory, with zero tokens and no real
config touched. The probe drove a real `claude` under an EMPTY `CLAUDE_CONFIG_DIR` through
`driveInteractiveClaudeSession`, over the real node-pty spawn, the real door, the real model and
the shipped registry. It used `observeReadiness`, `terminateTree`, `commandDelayMs` 5000 and
`readyCapMs` 60000, and an isolated `AOF_GLOBAL_HOME`. As printed:

```
result: {"outcome":"failed","failureReason":"blocked_screen","screen":{"id":"first-run"},"sessionId":null} after 1453 ms
writes to the PTY: []
breadcrumbs: 655ms stop-requested blocked_screen | 1378ms tree-terminated | 1390ms pty-released | 1453ms exit-confirmed
event: session-screen | 138/00-probe: failed/blocked_screen | screen normal rows=22 first="Welcome to Claude Code v2.1.283"
```

- The theme picker was named `first-run` 655 ms after the spawn, within seconds and not at the
  60 s cap. Under 00 alone the same launch stopped at the cap as `screen-not-ready`.
- Nothing was typed.
- The one screen event is the frame as drawn.

## 138/02 task 00 — the payload lands on both nodes, read at the source (`@manual`, 2026-09-27)

Run by the builder (`aof:continue 138 --solo`). Every path and host below is scrubbed, as in 01's
recordings: `Umair` became `Umami` and `umair` became `umami`.

**The Background.** The main checkout was at `83ac571` on `138-terminal-emulator`, with a clean
`git status` before the phase minted its runs. 01's tip, `f76fa74`, is an ancestor of it
(`merge-base --is-ancestor` exit 0), and 00's is too. 00 and 01 were `in-review`, not `done`: the
operator merged them into the feature branch while in review (STATE, 2026-09-27), and acceptance is
`aof:verify`'s. The main checkout's `package-lock.json` sha256 is
`3749338d87e3da0d37ab1433ebf9e6a3272cc3a061bc0c311395eb9f13a52407`.

**Finding, fixed in this story: the first install exited 0 over a WSL node that had not received
the emulator.** `node scripts/install-local.mjs --wsl --skip-ui`, 21.3 s, as printed (header lines
omitted):

```
=== payload install into C:\Users\Umami\.aof\bin ===
  synced src/
  synced bundle/ (91 files)
  synced ui/dist (3 files)
  synced node_modules/ (31/31 prod-closure entries)
  stamped BUILD_ID.json (83ac571+dirty.20260927T170119)

=== sync the WSL worker node (default distro:~/source/aof) ===
  synced src/ (360 modules)
  synced .aof/aof.config.json (workspaceId anchor)
  lockfile changed (or node-pty absent) — reinstalling natively
npm notice To update run: npm install -g npm@12.1.0
npm notice
npm error A complete log of this run can be found in: /home/umami/.npm/_logs/2026-09-27T16_01_23_333Z-debug-0.log
  node-pty : loads OK
  aof      : /home/umami/.nvm/versions/node/v22.23.1/bin/aof
  version  : 0.1.0 (source bbf86a4+dirty)
EXIT=0
```

- The distro's npm log said: `npm ci can only install packages when your package.json and
  package-lock.json … are in sync` and `Missing: @xterm/headless@6.0.0 from lock file`.
- `scripts/deploy-wsl.sh` copied `package.json` into the distro but never `package-lock.json`, so
  `npm ci` ran the new manifest against the distro clone's old lock.
- The script then wrote the NEW lock's sha into `.aof-wsl-deploy` although the install failed:
  `npm ci … | tail -3` was never checked, and `node-pty` was still present from before.
- Read back: the stamp held `3749338d…2407`, and `ls ~/source/aof/node_modules/@xterm` answered
  `No such file or directory`. Every later deploy would have printed `lockfile unchanged — native
  install kept` over a node with no emulator. That node would have logged
  `screen-model-unavailable` and run the byte gate, while every check read green.
- **The fix** (`scripts/deploy-wsl.sh`): the lock travels with the manifest, and a failed `npm ci`
  exits 1 and leaves the stamp as it was. The bad stamp was removed (`rm -v` printed `removed
  '/home/umami/source/aof/.aof-wsl-deploy'`) and the install re-run.

**The second install**, 17.2 s, as printed (header lines omitted):

```
=== payload install into C:\Users\Umami\.aof\bin ===
  synced src/
  synced bundle/ (91 files)
  synced ui/dist (3 files)
  synced node_modules/ (31/31 prod-closure entries)
  stamped BUILD_ID.json (83ac571+dirty.20260927T170253)

=== sync the WSL worker node (default distro:~/source/aof) ===
  synced src/ (360 modules)
  synced .aof/aof.config.json (workspaceId anchor)
  lockfile changed (or node-pty absent) — reinstalling natively
  npm audit fix

Run `npm audit` for details.
  building node-pty from source (no linux-x64 prebuild ships)
  COPY Release/pty.node
make: Leaving directory '/home/umami/source/aof/node_modules/node-pty/build'
gyp info ok
  node-pty : loads OK
  aof      : /home/umami/.nvm/versions/node/v22.23.1/bin/aof
  version  : 0.1.0 (source bbf86a4+dirty)

  NOTE: a running worker daemon keeps its in-memory module graph — restart it to pick this up.
EXIT=0
```

`+dirty` is the phase's own run records and the uncommitted `deploy-wsl.sh` fix. The payload's
`src/` is `83ac571`'s: `git hash-object` of the payload's `src/work/dispatch.mjs` is HEAD's blob,
`2690c9ad…`, although another session's uncommitted edit to that file sat in the checkout from
16:12Z, after this install.

**This node, read at the source:**

```
> ~/.aof/bin/aof.exe --version
0.1.0 (payload 83ac571+dirty.20260927T170253)
> ~/.aof/bin/BUILD_ID.json
{ "buildId": "83ac571+dirty.20260927T170253", "installedAt": "2026-09-27T16:02:53.122Z", "sourceRepo": "C:\\Source\\umami\\aof" }
> the @xterm/headless the payload resolves (createRequire from ~/.aof/bin/src/cli.mjs)
C:\Users\Umami\.aof\bin\node_modules\@xterm\headless\package.json 6.0.0
```

**The WSL node, read in the distro** (a scratch script run by its `/mnt/c/…` path):

```
stamp   : 3749338d87e3da0d37ab1433ebf9e6a3272cc3a061bc0c311395eb9f13a52407
package : 6.0.0
import  : function l
node    : /usr/local/bin/node v22.23.1
claude  : /usr/local/bin/claude 2.1.259 (Claude Code)
```

The stamp is the main checkout's lock sha. `require("@xterm/headless").Terminal` is a function
(its minified name is `l`). The distro's claude is 2.1.259, and this node's is 2.1.283.

**The builds the later legs ran on.** Task 01's first leg found the driver's `TERM` defect (below).
Its fix is `d8d2230` on `138-terminal-emulator`, together with the `deploy-wsl.sh` fix. The fix was
built and tested in a sibling worktree because live loops load the main checkout's `src/`. It was
then deployed twice:

1. **From the worktree, to both nodes** (`f75fa75`, the same tree as `d8d2230`), 8.4 s. The main
   checkout held another session's uncommitted `src/work/dispatch.mjs` at the time, and a deploy
   from it would have shipped that edit to both nodes.

   ```
   stamped BUILD_ID.json (f75fa75.20260927T172612)
   … lockfile unchanged — native install kept
   > ~/.aof/bin/aof.exe --version
   0.1.0 (payload f75fa75.20260927T172612)
   ```

   The payload's driver blob was `772ed3ae…`, HEAD's. The distro read back `stamp 3749338d…2407`,
   `package 6.0.0`, `import function l`, and its driver held the `TERM` line, sha256
   `081b8a96e91e40ce`, the worktree file's own.
2. **From the main checkout, this node only** (`d8d2230+dirty.20260927T173721`), 2 s. At 16:30:53Z
   another session had reinstalled the payload from the main checkout, which did not yet have the
   fix (below, task 02). This deploy put the fix back without taking that session's edit away. The
   `+dirty` is that session's `src/work/dispatch.mjs`, which it had itself deployed (the payload's
   and the checkout's blobs were both `dae081e0…`), plus this phase's records. The payload's driver
   blob is `772ed3ae…`, which is `d8d2230`'s.

The WSL node was not touched by the other session's reinstall. It stayed on the `f75fa75` tree.

## 138/02 task 01, first attempt — finding: the deployed driver missed the real first-run screen

The test-bed had no refined `not-started` pair, so the builder added fixture milestone `06`
(`screen-proof`: `00_story_capitalise`, `01_story_repeat`, `02_story_truncate`, one `@executable`
task each; `aof work validate 06` → `PASS — 06 is well-formed.`). It was committed on the test-bed's
branch as `8fa3046`, with only that folder staged.

**The direct drive stopped at the cap, not at the screen.** From the test-bed, in the builder's
PowerShell tool shell, with `CLAUDE_CONFIG_DIR` set to a fresh scratch directory (0 entries before)
for that one command only. `~/.claude.json`'s mtime before was `2026-09-27T16:03:38.0337119Z`. Launch
was at `2026-09-27T16:06:22.7545347Z`.

```
> ~/.aof/bin/aof.exe work drive continue 06/00 --json
{
  "ref": "06/00",
  "phase": "continue",
  "command": "/aof:continue 06/00",
  "outcome": "failed",
  "failureReason": "timeout",
  "sessionId": null,
  "settlementContext": {
    "projectsDir": "C:\\Users\\Umami\\AppData\\Local\\Temp\\claude\\…\\scratchpad\\cfg-drive-0600\\projects\\C--Source-umami-aof-test-repo",
    "transcriptBaseline": null,
    "spendBaselineAvailable": true
  }
}
Unknown command "C:\Users\Umami\.aof\bin\node_modules\node-pty\lib\conpty_console_list_agent".
EXIT=0
ELAPSED_MS=67080
```

(The usage text after each `Unknown command` line is omitted. It printed twice, on stderr.)

This node's degrade log gained one screen line for the drive:

```json
{"at":"2026-09-27T16:07:24.049Z","proc":"degrade","level":"degrade","code":"screen-not-ready","message":"06/00: failed/timeout — no ready frame within 60000ms; nothing was typed","screen":{"source":"screen","buffer":"normal","cursor":{"row":21,"col":52},"rows":["Welcome to Claude Code v2.1.283",""," Let's get started.",""," Choose the text style that looks best with your terminal"," To change this later, run /theme","","   1. Auto (match terminal)"," > 2. Dark mode √","   3. Light mode","   4. Dark mode (colorblind-friendly)","   5. Light mode (colorblind-friendly)","   6. Dark mode (ANSI colors only)","   7. Light mode (ANSI colors only)",""," ╌╌╌…╌╌╌","  1  function greet() {","  2 -  console.log(\"Hello, World!\");","  2 +  console.log(\"Hello, Claude!\");","  3  }"," ╌╌╌…╌╌╌","  Syntax theme: Monokai Extended (ctrl+t to disable)"]}}
```

- The environment variable reached the session (`projectsDir` is under the scratch directory), and
  nothing was typed.
- The screen is the theme picker, but its menu cursor is `>` and its tick is `√`. 01's recording
  and recogniser have `❯` and `✔`, so `first-run` never recognised it, and ruling 2 (QA) makes this
  a failure of the story.
- 06/00's failed run stays as evidence and is not retried (ruling 5, PO).

**Why: claude picks its glyphs from the launch environment.** A zero-token probe spawned
`claude.exe` 2.1.283 in node-pty at 80×24 under a headless xterm and snapshotted it. Nothing was
written to the PTY.

| probe | `TERM` | config | buffer | what it drew |
|---|---|---|---|---|
| A | unset | empty scratch | normal | ` > 2. Dark mode √` |
| B | `xterm-256color` | empty scratch | normal | ` ❯ 2. Dark mode ✔` |
| C | unset | the operator's | alternate | `> Try "write a test for <filepath>"` between `─` rules |
| D | `xterm-256color` | the operator's | normal | `❯ Try "how do I log an error?"` between `─` rules, under "Claude Code's fullscreen renderer didn't finish starting last time on this machine, so this launch is using the classic renderer." |

The fullscreen REPL was confirmed through the payload's own launch seams
(`resolveInteractiveDriverLaunch("claude")` and `defaultPtySpawn`), in the test-bed, under the
operator's config. Each probe booted for 18 s and then left through the local `/exit`, so no boot
strike was left (read afterwards: `fullscreenBootStrikes` `null`). The payload at that moment was a
build without the fix.

```
== P1 | parent TERM=(unset) WT_SESSION=(unset) | launch TERM=(unset) | buf=alternate cursorRow=21
   input row 21: [> Try "fix typecheck errors"]  first code points: U+003E U+00A0 U+0054
== P2 | parent TERM=xterm-256color WT_SESSION=(unset) | launch TERM=xterm-256color | buf=alternate cursorRow=21
   input row 21: [❯ Try "write a test for <filepath>"]  first code points: U+276F U+00A0 U+0054
== P3 | parent TERM=(unset) WT_SESSION=set | launch TERM=(unset) | buf=alternate cursorRow=21
   input row 21: [❯ Try "how do I log an error?"]  first code points: U+276F U+00A0 U+0054
```

- **Probe C is the whole milestone's failure mode.** With no `TERM`, the REPL's prompt is `>`, so
  ADR-002 §1's ready frame can never hold. Every drive launched that way runs to the 60 s cap and
  stops `failed / timeout` with nothing typed, and every retry does the same.
- **Which launches have no `TERM`.** node-pty sets `TERM` from the spawn's `name` off Windows only.
  On Windows the session inherits the launching shell's, and `resolveInteractiveDriverLaunch`
  already scrubs `TERM_PROGRAM` (the editor-attachment vector), which is another of claude's
  Unicode signals. So any Windows drive whose launching environment has no `TERM` or `WT_SESSION`
  draws ASCII: a loop started in VS Code's terminal, a PowerShell or cmd shell outside Windows
  Terminal, or a daemon the desktop app starts at login.
- **01's recordings did not see it.** They were captured with `WT_SESSION` removed, yet they drew
  `❯`, so the capture shell carried another Unicode signal. The Bash tool's Git Bash sets
  `TERM=xterm-256color`. The recordings are right for that environment, and the gap is that the
  launch never declared one.
- **Probe D's classic renderer is a second finding.** It is recorded below the fixed-build legs.

**The fix** (`d8d2230`) sets the driven session's `TERM` to the PTY's own terminal, `xterm-256color`,
the one the screen model emulates. It is set in `resolveInteractiveDriverLaunch` after the
editor-attachment scrub, the same way `ENABLE_PROMPT_CACHING_1H` is, and it replaces an inherited
value, as node-pty already does off Windows. The spawn's `name` and the env share one constant.

- `test/terminal/session-screen-ready.test.mjs` gained a case: from a parent env with
  `TERM=dumb` and `TERM_PROGRAM=vscode`, the spawn's `name` is `xterm-256color`, its `env.TERM`
  equals it, and `TERM_PROGRAM` is still scrubbed.
- 63/02's pinned attended env (`test/loop/unattended-launch-envelope.test.mjs`, `BEFORE_ENV`) gains
  `TERM`, as it gained `ENABLE_PROMPT_CACHING_1H` at 70/01. The unattended launch gains nothing.
- **Focused run.** Every suite that imports the driver, the launch seam or the worker execution,
  plus `test/terminal` and `test/arch/terminal`: 88 files, `node scripts/test.mjs --only …` under a
  fresh `AOF_GLOBAL_HOME` and a launch env with no `CLAUDE*` or `GIT_ASKPASS`. The result was **994
  ok, 0 not ok**, exit 0.
- **Red probe.** The `TERM` line was removed from the live driver and the two touched suites were
  run alone. Both cases went red: `not ok - 138/02 — the session is told the terminal the model
  emulates …` and `not ok - 63/02 task02 — every attended launch resolves exactly the program, argv
  and env it resolved before …`. The backup was restored and `cmp` matched it.

## 138/02 task 01 — a blocking screen is named in seconds on both nodes (`@manual`, 2026-09-27)

All on the `f75fa75` build (task 00). Each leg ran in the builder's PowerShell tool shell, which has
no `TERM` and no `WT_SESSION`: the environment the first attempt failed in.

**The direct drive (fixture `06/03`, added for the re-run; `06/00`'s run stays as evidence).**
`CLAUDE_CONFIG_DIR` was a fresh scratch directory (0 entries before), set for that one command
only. `~/.claude.json`'s mtime before was `2026-09-27T16:26:55.1792902Z`. Launch was at
`2026-09-27T16:26:55.4812008Z`.

```
> ~/.aof/bin/aof.exe work drive continue 06/03 --json
{
  "ref": "06/03",
  "phase": "continue",
  "command": "/aof:continue 06/03",
  "outcome": "failed",
  "failureReason": "blocked_screen",
  "screen": {
    "id": "first-run"
  },
  "sessionId": null,
  "settlementContext": {
    "projectsDir": "C:\\Users\\Umami\\AppData\\Local\\Temp\\claude\\…\\scratchpad\\cfg-drive-0603\\projects\\C--Source-umami-aof-test-repo",
    "transcriptBaseline": null,
    "spendBaselineAvailable": true
  }
}
EXIT=0
ELAPSED_MS=8663
```

```
> ~/.aof/bin/aof.exe work run-status 06/03 --json   (run fields)
"runId": "20260927T162656076Z-0000", "state": "failed", "attempt": 1, "outcome": "failed",
"sessionId": null, "failureReason": "blocked_screen"
```

This node's degrade log, lines after the launch: one `session-screen` line, 1.85 s after the
launch.

```json
{"at":"2026-09-27T16:26:57.334Z","proc":"degrade","level":"degrade","code":"session-screen","message":"06/03: failed/blocked_screen","screen":{"source":"screen","buffer":"normal","cursor":{"row":21,"col":52},"rows":["Welcome to Claude Code v2.1.283",""," Let's get started.",""," Choose the text style that looks best with your terminal"," To change this later, run /theme","","   1. Auto (match terminal)"," ❯ 2. Dark mode ✔","   3. Light mode","   4. Dark mode (colorblind-friendly)","   5. Light mode (colorblind-friendly)","   6. Dark mode (ANSI colors only)","   7. Light mode (ANSI colors only)",""," ╌╌╌…╌╌╌","  1  function greet() {","  2 -  console.log(\"Hello, World!\");","  2 +  console.log(\"Hello, Claude!\");","  3  }"," ╌╌╌…╌╌╌","  Syntax theme: Monokai Extended (ctrl+t to disable)"]}}
```

- **The window's codes:** `session-screen` ×1, `drive-spend-unavailable` ×1 and `run-store` ×1
  (both `no-session-id`, which is expected when nothing started), plus `work-read-cache-miss` ×1
  and `work-read-cache-unavailable` ×12. No `screen-model-unavailable`, `screen-not-ready` or
  `tui-ready-marker-absent`.
- **The config.**
  - The scratch directory afterwards held `backups, cache, sessions, .claude.json`: claude used it.
  - `~/.claude.json`'s mtime after was `16:27:00.9978875Z`, so it moved. The move is not this
    drive's. The only aof writer of that file on the path is the trust pre-write, and it returns
    without writing when the cwd is already trusted. It was: the test-bed key's
    `hasTrustDialogAccepted` is `true`.
  - The file is rewritten by every live claude on this machine. It changed 0.3 s before the launch,
    and again at `16:27:21.0775788Z`, 17 s after the drive exited, with no drive running. Loop 03
    and this builder's own session were live.
  - So the unchanged-mtime check of ruling 3 (QA) cannot hold on a machine with live claude
    sessions, and it is recorded as confounded rather than passed.

**The loop (fixture milestone `07`, one story).** `aof work loop` admits a milestone or a range,
never a story: `aof work loop 06/01` answered `scope matched neither admitted loop scope form`
(exit 1, 558 ms). Looping `06` would also have driven the story kept for task 02, so the builder
added milestone `07` (`loop-proof`) with the one story `00_story_double` and committed it
(`362b211`). The dry run read `07 — L2, cap 3: drive continue 07/00.` A second fresh scratch config
directory was used, launched at `2026-09-27T16:29:11.8792256Z`:

```
> ~/.aof/bin/aof.exe work loop 07        (stdout)
Refine phase complete — 0 stories refined.
Wave 1 — dispatching 07/00 (bound 4).
Lane 07/00 — open: C:\Source\umami\aof-test-repo\.aof\mesh\dispatch-worktrees\dispatch-07-00 at e26da25a09b7cea107ab9f154135dab51b5c76ca (branch aof/mesh/07-00, created).
Lane 07/00 — mint: run 20260927T162914561Z-0000 (cycle 1 of 3, attempt 1).
Lane 07/00 — drive: no session id (document).
Lane 07/00 — stderr: … (the aof usage text; see "node-pty's console-list agent" below)
Lane 07/00 — settle: failed (blocked_screen: first-run).
Lane 07/00 — commit: tip 0443df963c4f13d01e42d83828e900ef0b4e8f32.
Driven 07 — continue (failed).
Driven 07/00 — continue (failed).
07 — halted on run-not-retryable at 07/00 (producer run-store:not-retryable). Resume with: aof work loop 07 --resume Details: attempt=1; failureReason=blocked_screen; screen=first-run.
EXIT=0
ELAPSED_MS=11396
```

- The loop halted `run-not-retryable` in 11.4 s. Its halt line holds `failureReason=blocked_screen`
  and `screen=first-run`. The story was driven once (`cycle 1 of 3, attempt 1`), in a lane, and the
  narration holds `settle: failed (blocked_screen: first-run).`
- The degrade log held one `session-screen` line, `07/00: failed/blocked_screen` at
  `16:29:16Z`, on the normal buffer, with rows ` ❯ 2. Dark mode ✔` and ` Choose the text style that
  looks best with your terminal`. It held no fallback code.
- The lane's worktree was removed afterwards (`dispatch --cleanup 07/00` → `removed`,
  `branchRemoved: false`). Its commit stays on `aof/mesh/07-00`.

**The WSL node.** A scratch script outside every repository (run by its `/mnt/c/…` path) drove the
distro's deployed `~/source/aof/src/agent-session-driver.mjs` through
`driveInteractiveClaudeSession`. It ran in a `mktemp` cwd under an empty `mktemp` config directory,
with `commandDelayMs` 5000, `observeReadiness`, `terminateTree` and every PTY write recorded:

```
hostname : umamis-msi-wsl
claude   : /usr/local/bin/claude 2.1.259 (Claude Code)
driver   : 1 TERM line(s)
config   : 0 entries before
result: {"outcome":"failed","failureReason":"blocked_screen","screen":{"id":"first-run"},"sessionId":null} after 1060 ms
writes to the PTY: []
breadcrumbs: 825ms stop-requested | 826ms pty-released | 1060ms exit-confirmed
wall     : 1287 ms (launch to exit, measured around node)
config   : .claude.json backups cache sessions
--- degrade lines since the launch, for 138/02-wsl:
{"at":"2026-09-27T16:30:13.826Z","proc":"degrade","level":"degrade","code":"session-screen","message":"138/02-wsl: failed/blocked_screen","screen":{"source":"screen","buffer":"normal","cursor":{"row":8,"col":1},"rows":["Welcome to Claude Code v2.1.259",""," Let's get started.",""," Choose the text style that looks best with your terminal"," To change this later, run /theme","","   1. Auto (match terminal)"," ❯ 2. Dark mode ✔","   3. Light mode","   4. Dark mode (colorblind-friendly)","   5. Light mode (colorblind-friendly)","   6. Dark mode (ANSI colors only)","   7. Light mode (ANSI colors only)",""," ╌╌╌…╌╌╌","  1  function greet() {","  2 -  console.log(\"Hello, World!\");                                       ","  2 +  console.log(\"Hello, Claude!\");                                      ","  3  }"," ╌╌╌…╌╌╌","  Syntax theme: Monokai Extended (ctrl+t to disable)"]}}
--- fallback codes since the launch: 0
```

The Linux build (2.1.259) draws the same picker. Its cursor rests on row 8, where 2.1.283 on
Windows rests it on row 21, and its diff rows carry trailing cells. The recogniser keys on neither.
The scratch cwd and config were removed.

## 138/02 — finding, not fixed here: claude's classic renderer draws the REPL on the normal buffer

Probe D (above) launched the operator's claude right after probe C had been killed 12 s into its
fullscreen boot. claude said so, and drew the REPL on the **normal** buffer: `❯` at column 0
between two full-width `─` rules (the probe did not record the cursor). ADR-002 §1 requires the
**alternate** buffer, so this frame is never ready. A drive launched on it types nothing and stops
at the cap.

The state is `fullscreenBootStrikes` in `~/.claude.json`. It was read by that key alone, and nothing
else in the file was printed. A zero-token probe polled it every 3 s under the operator's config
with `TERM=xterm-256color`, then left through the local `/exit` command:

```
t=0 strikes={"count":1,"version":"2.1.283"} TERM=xterm-256color
t=3071ms buf=alternate … strikes={"count":1,"version":"2.1.283"}
t=12089ms buf=alternate … strikes={"count":1,"version":"2.1.283"}
t=15101ms buf=alternate … strikes=null
t=30151ms buf=alternate … strikes=null
t=33156ms buf=normal … strikes=null
after exit: exited={"exitCode":0} strikes=null
```

- **A strike is left** when a fullscreen claude under the operator's config ends within about
  12–15 s of launch.
- **The next launch pays for it** by drawing on the classic renderer once. The launch after that
  tries fullscreen again.
- **A driven session of minutes clears the strike itself**, so an ordinary drive neither leaves nor
  meets one.
- **Two things do meet one.** A drive stopped within seconds under the operator's config (an
  `mcp-approval` stop, a consent that fails) leaves a strike, and the next launch then costs one
  bounded, retryable `timeout`. An operator who chooses the classic renderer (`/tui default`) makes
  every drive time out.
- **The probes left it clean** (`null`) before any other launch.
- **Routing:** `story (operator)`. Accepting the input box on either buffer amends ADR-002 §1, so it
  is the operator's to ratify. The shape: "the input box is ready on either buffer when `❯` is at
  column 0 between full-width `─` rules with the cursor on it". The dialog tests stay unchanged,
  because each of them already needs an indented `❯` and fails `isInputBox`. A recording of the
  classic REPL frame is needed first (ADR-003 §2).

## 138/02 task 02 — a real drive types on the box, and its stop leaves the REPL (`@manual`, 2026-09-27)

The token cost was written in `STATE.md` before the leg ran. The launch env had no `TERM`, no
`GIT_ASKPASS` and no inherited `CLAUDE*` key. The drive ran from Git Bash with `env -u …`, so the
fix, not the shell, supplied the terminal.

**The first attempt (fixture `06/02`) ran on the wrong build and is void.** It is recorded, and it
was not counted.

- The lent run `20260927T163046850Z-0000` was minted at `16:30:46Z`. At `16:30:53Z` another session
  ran `install-local` from the main checkout, which did not yet hold the fix. The payload became
  `dc461e1+dirty.20260927T173053`, 4 s before the drive launched at `16:30:57.161Z`.
- The drive answered `failed / cancelled` with `"sessionId": null` after 50,989 ms. Its one
  `session-screen` line shows the fullscreen REPL with `> Try "fix lint errors"`, where `❯` should
  be: the same defect, on a build without the fix. Nothing was typed, so no turn ran.
- The lent run was settled afterwards: `run-complete 06/02 --outcome cancelled --run …` → `state`
  `cancelled`, with effects `rollback-status` and `publish-projection` both `done`.
- The payload was restored with the fix (task 00, the second deploy), and fixture `06/04` was
  added for the re-run.

**The leg (fixture `06/04`), on `d8d2230+dirty.20260927T173721`.** The build stamp was read before
the mint and after the drive, and it was the same.

```
build before: 0.1.0 (payload d8d2230+dirty.20260927T173721)
> ~/.aof/bin/aof.exe work run-start 06/04 --json
{ "runId": "20260927T163733813Z-0000", "itemRef": "06/04", "state": "running", "attempt": 1, "outcome": null, "sessionId": null, … }
launch: 2026-09-27T16:37:34.422Z
> (sleep 45) | ~/.aof/bin/aof.exe work drive continue 06/04 --run 20260927T163733813Z-0000 --json
{
  "ref": "06/04",
  "phase": "continue",
  "command": "/aof:continue 06/04",
  "outcome": "failed",
  "failureReason": "cancelled",
  "sessionId": "92d9d07e-db9d-4c06-95e9-b5475ed7087c",
  "settlementContext": {
    "projectsDir": "C:\\Users\\Umami\\.claude\\projects\\C--Source-umami-aof-test-repo",
    "transcriptBaseline": null,
    "spendBaselineAvailable": true
  }
}
EXIT=0 ELAPSED_MS=51035
build after: 0.1.0 (payload d8d2230+dirty.20260927T173721)
```

**The transcript that `sessionId` names** exists:
`~/.claude/projects/C--Source-umami-aof-test-repo/92d9d07e-db9d-4c06-95e9-b5475ed7087c.jsonl`,
374,353 bytes and 62 records.

- Its first `user` record, at `16:37:39.129Z` (4.7 s after the launch), is the directive. claude
  2.1.283 stores a bracketed paste inside a `<pasted_content>` wrapper, so the record begins
  `"\n\n<pasted_content id=\"3bcd\">\n/aof:continue 06/04\n\n## ITEM\nItem: 06/04\n…"`. Its first
  line inside the wrapper is `/aof:continue 06/04`, followed by the phase brief. That is what the
  ruling's "begins with `/aof:continue`" measures here, and the wrapper is recorded rather than
  explained away.
- The session acted on it. Its first action, at `16:37:44Z`, was
  `tool_use: Skill {"skill":"aof:continue","args":"06/04"}` (`Launching skill: aof:continue`), and
  its first shell command was the lane's own `aof work resume; …; aof work find "06/04" --json`.

**The stop left the REPL as drawn.** This node's degrade log, lines after the launch, held one
`session-screen` line. Its rows 0–19 are abridged here (the session's work above the box):

```json
{"at":"2026-09-27T16:38:19.552Z","proc":"degrade","level":"degrade","code":"session-screen","message":"06/04: failed/cancelled","screen":{"source":"screen","buffer":"alternate","cursor":{"row":21,"col":2},"rows":["…","● Skill(/aof:continue)","  ⎿  Successfully loaded skill","…","● Picking up story upper (06/04), which is already marked in-progress with no","  prior runs. I'll check the milestone status next, then spawn the developer to","  build it.","…","✻ Slithering… (40s · ↓ 2.3k tokens)","…","────────────────────────────────────────────────────────────────────────────────","❯ ","────────────────────────────────────────────────────────────────────────────────","  ⏵⏵ auto mode on (shift+tab to cycle) · esc to interrupt · ← for agents"]}}
```

`buffer` is `alternate`, and rows 20 and 22 are the input box's two full-width `─` rules around
`❯ ` on row 21, where the cursor is.

**Nothing on the way was a fallback or a guess.** The window's codes were `session-screen` ×1 and
`work-read-cache-unavailable` ×18. There was no `screen-model-unavailable`, `screen-not-ready`,
`tui-ready-marker-absent`, `directive-not-accepted` or `directive-resubmitted`.

**No run is left open.** The lent run was still `running` after the drive, as a lent run is, and was
settled:

```
> ~/.aof/bin/aof.exe work run-complete 06/04 --outcome cancelled --run 20260927T163733813Z-0000 --json
"state": "cancelled", "outcome": "cancelled", "sessionId": "92d9d07e-…", effects rollback-status done, publish-projection done
> ~/.aof/bin/aof.exe work run-status 06/04 --json
{ "ref": "06/04", "runs": [ { "runId": "20260927T163733813Z-0000", "state": "cancelled", "outcome": "cancelled",
  "sessionId": "92d9d07e-db9d-4c06-95e9-b5475ed7087c",
  "spend": { "model": "claude-opus-5-5", "tokens": { "input": 16, "output": 2529, "cacheRead": 410126, "cacheCreate": 64344 },
             "costUsd": 0.4023108, "turns": 8, "toolCalls": 5, "exitReason": "abort" } } ] }
```

The leg's measured cost is $0.40. The 45 s session left no fullscreen boot strike:
`fullscreenBootStrikes` read `null` afterwards.

## 138/02 — observations recorded on the way (not fixed here)

- **node-pty's console-list agent under the SEA launcher.**
  - Every PTY kill in a process started as `~/.aof/bin/aof.exe` printed
    `Unknown command "…\node-pty\lib\conpty_console_list_agent"` and the whole usage text to
    stderr, twice.
  - The cause: node-pty's Windows agent `fork()`s that script through `process.execPath`, which is
    the aof launcher, not node. Its 5 s timeout then falls back to killing the shell pid alone,
    and the driver's own `taskkill /T` still ends the tree.
  - A loop reads its child's document from stdout only, so no document was lost. The noise does
    fill the lane's `stderr:` narration (task 01's loop).
  - This predates 138. It belongs to the launcher (`scripts/sea-entry.mjs`) or to the kill path.
- **The directive arrives wrapped.** claude 2.1.283 records the bracketed paste as
  `<pasted_content id=…>`. The session still invoked `/aof:continue` as a skill (task 02), but
  claude's own harness treats pasted content as text the user did not write, so this is worth
  watching on claude releases.
- **The trust pre-write ignores `CLAUDE_CONFIG_DIR`.** `ensureWorktreeTrusted` always writes
  `os.homedir()/.claude.json`. Under an isolated config it therefore touches the operator's real
  file (for an untrusted cwd, such as a new lane path), while the isolated claude never reads that
  write.
- **A shared checkout's payload can change under a leg.** Task 02's first attempt was voided by
  another session's `install-local` from the main checkout, 4 s before launch. Read the build stamp
  before and after a live leg, as task 02's re-run did.
