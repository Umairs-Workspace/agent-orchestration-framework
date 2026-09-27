---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature.
-->
# 138 · The session driver sees claude's screen — Architecture

The SPEC fixed the thesis: a terminal emulator beside node-pty, fed by the same bytes, becomes the
driver's only reader of what is on screen. STATE left four questions for refine, and each is
answered here:

- What "input box visible" is, and how it survives claude releases: ADR-002.
- Which screens get a standing-consent action and which get a named failure: ADR-003.
- Whether the fleet view reuses the model: ADR-005.
- The model's memory bound for multi-hour sessions: ADR-001 §3.

Every decision reasons from RESEARCH.md, which was measured at this refine. Where a value is a
default it is marked DEFAULT DECISION with its reason. Contracts are authored after this document
and are never re-opened for it.

## Memory recall — what was surfaced, and what it changed

`aof work memory recall "headless terminal emulator screen model beside node-pty" --area
architecture --block` and the PO's `… --item 138 --block` returned one block of five records.

- **`28/ADR-002`** (*node-pty ships as an on-disk sidecar; the graceful-degrade-on-absent-addon
  guard becomes load-bearing*) → **HONOURED.** The emulator is loaded lazily, and an absent
  package degrades to today's byte gate. It never fails a session (ADR-001 §4).
- **`03/ADR-003`** (*the terminal transport is node-pty + ws; the provider seam is one resolver*)
  and **`38/ADR-013`** (*one long-lived interactive `claude` PTY per run, typed into*) →
  **HONOURED, unchanged.** The spawn seam, the provider and the one-session shape do not move. The
  model is a reader beside the PTY, not a transport.
- **`38/ADR-014`** (*the fleet mirror is a read-only, in-memory ephemeral tail; no input path from
  the fleet back to the worker PTY*) → **HONOURED.** It is the main reason for ADR-005: reusing
  the worker's model in the fleet would need the control→worker path this ADR excludes.
- **`68/ADR-004`** (*cost stamped once at settle*) → not relevant to this milestone.

## Measured facts this document reasons from

- **Base:** `28bbce2` plus the uncommitted 2026-09-27 driver fix (paste-ready only with something
  visible drawn since paste-ON, the parked-paste resubmit, and the cap degrade).
  `src/agent-session-driver.mjs` is 1,682 lines, and its `driveInteractiveClaudeSession` promise
  body is about 750 of them.
- **Graph:** `aof graph build .` gave 18,326 nodes and 45,740 edges, built
  `2026-09-27T11:23:53.953Z`, egress none, `unchanged: false`. `aof graph impact`:
  - `src/agent-session-driver.mjs` has three `src/` dependents (`commands/drive.mjs`,
    `mesh/worker-execution.mjs`, `work-examples/answers.mjs`) and 27 test dependents.
  - `src/loop-bounds.mjs` imports nothing and has 17 `src/` dependents.
  - `src/loop/child-drive.mjs` has three `src/` dependents (`commands/loop.mjs`, `loop/cycle.mjs`,
    `loop/wave.mjs`).
  - `src/mesh/terminal-mirror.mjs` has three `src/` dependents (`commands/mesh/ui.mjs`,
    `mesh/launcher.mjs`, `mesh/ui-serve.mjs`) and **no edge to the driver**.
  - `src/loop-diag.mjs` has one dependent, `commands/loop.mjs`.
- **Controls:**
  - FF-5301 (`test/arch/session/acd-session-driver-mesh-blind.test.mjs`) freezes the driver's
    direct `src/` imports at eight and its root-inclusive reach at 25: "raising it requires an ADR".
  - FF-5302 freezes the driver's export set at seventeen.
  - `acd-source-directory-budget` holds `src` at 92 of 92 root modules, allowance 0: "the next
    growth here is a FAMILY".
  - `test/session` stands at 37 of 37 and `test/arch/session` at 32 of 32.

## ADR-001 — One screen model per driven session, in a `src/terminal/` family, behind one door

### Context

The driver learns what claude shows by reading a byte string: `buffer += text`, never trimmed.
Four readers regex over it with escapes stripped: the readiness marker, `PROVIDER_WAIT_RE`, the
parked-paste regex and `screenTail()`. `containsNeedsInputSentinel` re-splits the whole buffer on
every chunk (RESEARCH Q2, finding 5). None of them sees the screen. A dialog that writes no
transcript is invisible until a deadline.

### Decision

1. **The model.** `src/terminal/screen.mjs` wraps `@xterm/headless`:
   `createScreen({ cols, rows })`. It answers `write(chunk)`, a promise that settles once xterm
   has parsed the chunk; `snapshot()`, which returns `{ buffer: "normal" | "alternate",
   cursor: { row, col }, rows: string[] }` with each viewport row as `translateToString(true)`;
   and `dispose()`. It is the only module in `src/` that imports `@xterm/headless` (FF-13801).
2. **One feed, one geometry.** The driver's `term.onData` handler passes every chunk to the model:
   the same chunk `onOutputChunk` already receives. The model takes its size from the same
   constant pair the spawn uses (80×24), so there is one geometry, not two. The driver never
   resizes (the resize jiggle was retired 2026-08-01). A future resize passes through both.
3. **The memory bound.** The model has `scrollback: 0`, so it holds two buffers of cols×rows cells
   (normal and alternate) whatever the session's length. xterm's own write queue bounds the parse
   backlog. The driver's raw `buffer` stops being a screen: once its four readers move to the
   model, its one remaining reader is the NEEDS_INPUT sentinel scan on fresh sessions. That scan
   keeps only the unterminated tail line and reads each newly completed line once. Memory is then
   constant in both, where today the buffer grows with the session and is re-scanned whole.
4. **Lazy and degradable.** `screen.mjs` loads `@xterm/headless` with a dynamic `import()` on
   first use. A load failure answers "no model" with one `screen-model-unavailable` degrade, and
   the session runs on today's byte gate (ADR-002 §4). The case is real: the Mac worker is an
   `npm link`ed clone, and between `git pull` and `npm ci` the package is absent.
5. **The door.** `src/terminal/session-screen.mjs` is the driver's one new import. It owns:
   - the model;
   - the registry (`claude-screens.mjs`, ADR-003);
   - the byte-gate fallback, moved out of the driver verbatim (`TUI_READY_MARKER`,
     `TUI_PASTE_OFF_MARKER`, `hasVisibleText`, `ANSI_ESCAPE_RE`, `PARTIAL_ESCAPE_RE`, the
     screen-tail);
   - the evidence renderer (ADR-004).

   It hands the driver **verdicts**: ready, consent (with the keys to send), blocked (with an id),
   provider wait on and off, and evidence on request. The driver keeps what it already owns: the
   PTY, its timers, the stop bracket and the transcript watches. It reads no screen content
   itself (FF-13801).
6. **The family.** `src/terminal/` is founded as a budget EXEMPTION naming its three members
   (`screen.mjs`, `session-screen.mjs`, `claude-screens.mjs`), on 133's precedent. The test
   directories `test/terminal/` and `test/arch/terminal/` are founded the same way and registered
   once in `scripts/test.mjs`. The fixture directory `test/fixtures/claude-screens/` is founded
   as an exemption beside `test/fixtures/graph`. The three root `terminal-*.mjs` modules are the
   family's natural later members. Moving them re-points their dependents, so it is an item of its
   own and not smuggled into this one.
7. **FF-5301's admission.** `EXPECTED_DIRECT` gains `terminal/session-screen.mjs`. The
   root-inclusive reach ceiling rises from **25 to 28**: `session-screen.mjs`, `screen.mjs` and
   `claude-screens.mjs`. The last one's only import, `loop-bounds.mjs`, is already in the
   closure. No denied subtree is entered, and no export joins the frozen seventeen (FF-5302
   untouched). `@xterm/headless` is a bare specifier, outside the walk.
8. **The dependency.** `"@xterm/headless": "6.0.0"` goes in runtime `dependencies`, pinned
   exactly: MIT, no dependencies of its own, the same 6.0.0 as the board's `@xterm/xterm`. It is
   installed frozen with lifecycle scripts off, and `node scripts/supply-chain-audit.mjs` must
   come back clean. Explicit operator approval is story 00's first gate (AGENTS.md, Supply-Chain
   Safety).

### Alternatives considered

- **The model inside the driver.** Rejected. The driver is 1,682 lines, and screen-reading is a
  concern it absorbed a patch at a time. Housing the model there still raises FF-5301 by one. The
  extraction takes ~120 lines of byte-reading out of the driver instead.
- **More byte regexes.** Rejected by the SPEC, and by RESEARCH finding 1: a byte test cannot tell
  a select menu's `❯` from the prompt's.
- **`scrollback` above 0.** Rejected. Nothing reads history. Evidence is the visible screen
  (ADR-004), and claude's REPL runs on the alternate buffer, which has no scrollback anyway.

### Consequences

- Every host of a driver gains the model with no call-site change: a lane child, the sequential
  child (both through `commands/drive.mjs`) and the mesh worker daemon
  (`mesh/worker-execution.mjs`). `work-examples/answers.mjs` imports only
  `HUMAN_INPUT_TOOL_NAMES` and is untouched.
- A node without the package runs exactly as today, and says so once in the degrade log.

### Diagram

A picture helps here because four parties exchange five kinds of message, and the reader has to
see which of them reads the screen. The view is a component and flow view.

- **Components:** the node-pty PTY, the driver (`driveInteractiveClaudeSession`), the door
  (`session-screen.mjs`), the model (`screen.mjs` over `@xterm/headless`), the registry
  (`claude-screens.mjs`), `degrade.log`, and the drive child's `--json` document.
- **Flows:**
  1. PTY `onData` goes to the driver, which passes it to the door and the door to the model.
  2. The model's settled frame goes to the registry.
  3. The registry's verdicts (ready, consent, blocked, wait) go to the driver, which acts: it
     pastes, answers the dialog, stops, or suspends the heartbeat.
  4. At a stop, the driver asks the door for evidence, and the door writes it to `degrade.log`.
  5. A blocked id rides the result into the `--json` document.
  6. On a node without the package, a fallback path runs from the door to the byte gate.

![ADR-001 — One screen model per driven session, in a `src/terminal/` family, behind one door](diagrams/ADR-001-screen-seam.svg)

Source: [ADR-001-screen-seam.html](diagrams/ADR-001-screen-seam.html) · PNG: [ADR-001-screen-seam.png](diagrams/ADR-001-screen-seam.png)

## ADR-002 — Readiness is the input box on screen

### Context

The driver types when bracketed paste is ON and something visible has been drawn since. That is
a byte-level proxy, fixed on 2026-09-27 after the first paste-ON proved to be a pre-REPL probe.
RESEARCH Q2 measured the real ready frame. It also measured that the first-run menu uses the same
`❯` glyph as the prompt, and so do the trust and MCP-approval menus.

### Decision

1. **Ready means all four of these hold.**
   - The **alternate** buffer is active.
   - A row R's text begins with `❯` (U+276F) at column 0.
   - Rows R−1 and R+1 each consist entirely of `─` (U+2500) across the full width.
   - The cursor is on row R.

   The test is structural, not textual. The placeholder (`Try "…"`) is never read. A menu fails
   it three ways: normal buffer, indented `❯`, dashed `╌` rules.
2. **The paste is typed on the first ready frame.** Typing no longer waits on the fixed floor on
   this path. `commandDelayMs` still marks a real launch and is still the fallback's floor.
   The Enter stays its own write (70/06).
3. **Recognition runs on settled frames**, after the model's `write` has settled. A burst of
   chunks is coalesced into one pass.
4. **The fallback is today's gate, unchanged.** With no model (ADR-001 §4), readiness is the floor
   plus paste-ON-with-something-visible-since, byte for byte as it stands.
5. **At the cap, nothing is typed.** Suppose the model is live and no ready frame arrives within
   `INTERACTIVE_READY_CAP_MS` (60 s), and no registered screen claimed the session first. The
   session then stops `failed / timeout`, with the screen recorded under `screen-not-ready`.
   Today's behaviour at the cap is to type anyway, and that behaviour is withdrawn.
   - **DEFAULT DECISION: retryable `timeout`,** because a slow start and an unknown screen look
     the same from the screen alone.
   - A claude release that changes the prompt therefore fails on its first run, with the new
     screen in hand. It never types into whatever is up.
6. **A parked paste is read from the input box.** The resubmit looks for claude's `[Pasted text #N`
   placeholder in the rows between the two rules, where it used to read the byte echo since the
   paste.
7. **Resumed sessions use the same gate.** A `--resume` launch draws the same REPL frame. The
   earlier conversation above it never satisfies §1, because the cursor is not on those rows.

### Alternatives considered

- **Match the placeholder text.** Rejected. It changes with every release and with config, while
  the structure has not changed.
- **Keep typing at the cap.** Rejected. That is the blind keystroke this milestone exists to
  remove: the directive's Enter would accept a dialog's default.

### Consequences

- The measured 3-lanes-at-once loss (a paste before the TUI listened) cannot recur. The paste
  waits for the frame that contains the box.
- A recogniser miss costs one bounded, recorded `timeout`. It never costs a dialog answered by
  accident.

## ADR-003 — Blocking screens are a recorded registry, and each entry has one action

### Context

Nine attempts idled to the 20-minute heartbeat behind an MCP-approval dialog (SPEC). The Mac
worker's unauthenticated `claude` burned runs the same way. Each is a screen that is recognisable
in seconds.

### Decision

1. **The registry.** `src/terminal/claude-screens.mjs` is an ordered, frozen array of
   `{ id, recognise(snapshot), action, option? }`. `ready` (ADR-002 §1) is entry zero. The
   module is pure over a snapshot. Its one import is `loop-bounds.mjs`, for `PROVIDER_WAIT_RE`.
2. **No entry without a recording.** Every entry names at least one committed fixture recorded
   from a real claude, with the version in its name. An unobserved screen is not guessed at:
   `update-notice` has no recording and is **not registered**.
3. **The v1 entries:**

   | id | recorded from | action | why this action |
   |---|---|---|---|
   | `ready` | the REPL frame, 2.1.283 (RESEARCH Q2) | type the directive | ADR-002 |
   | `trust` | captured at build (operator-told) | **consent**: `Yes, I trust this folder` | The loop being pointed at this checkout is the consent. `ensureWorktreeTrusted` pre-writes the same answer, and the dialog means the pre-write lost (F24). |
   | `mcp-approval` | captured at build (operator-told) | **fail** | Approving runs the server's code. The operator's consent lives in their settings, which lanes inherit (`6c4d81a`), so the dialog means the inheritance failed, and that should be named, not papered over. |
   | `first-run` | the theme picker, 2.1.283 (RESEARCH Q2) | **fail** | A claude nobody has set up. A retry cannot help. |
   | `login` | captured at build (isolated config, zero-token) | **fail** | Unauthenticated, the Mac-over-SSH class. A retry cannot help. |
   | `usage-limit` | the measured text (129/06 F-58) | **wait** | Provider wait, semantics unchanged (§6). |

4. **A consent is only an answer the operator already gave.** v1 has one: trust.

   **AMENDED 2026-09-27, at the operator's decision.** Their words: "Allow down then enter. And make
   it robust enough where we can detect the order."

   The amendment follows a measurement at 01's capture (RESEARCH Q5). claude 2.1.283 opens the trust
   dialog on `❯ No, exit`, with `Yes, I trust this folder` as the second, unnumbered option. So the
   original one-Enter-on-the-highlighted-option rule could never answer it, and its Enter would
   exit claude.

   The door now NAVIGATES by the screen, one key per settled frame, and never blind:
   - **The menu is read from the frame.**
     - The highlighted item is the row under the menu's `❯`.
     - The option item is the item row whose text is the entry's named option, with any `N. `
       number ignored.
     - If either is not on screen, the consent fails with the entry's id, and nothing is written.
   - **The order is detected, not assumed.**
     - An option below the highlighted item is reached with Down, and one above it with Up.
     - Each arrow is spelled for the terminal's cursor-key mode, which the model reports: `ESC [ B`
       and `ESC [ A`, or `ESC O B` and `ESC O A` under DECCKM.
     - An option further than `CONSENT_MAX_KEYS` items away fails by id before any key is sent.
   - **Every key is confirmed on the screen before the next.**
     - A settled frame whose highlight moved toward the option admits the next step.
     - A frame on which the highlight has not moved yet is waited through.
     - A highlight that moved away from the option fails by id. So does one that has not moved
       within `CONSENT_STEP_MS` of the key.
   - **Enter only on the named option.** The door sends one Enter only when the highlighted item is
     the named option, and only while the directive is untyped.
   - **Once per entry per session.** After the Enter, a repaint before claude takes it is not a
     return. The entry recognising again after a frame on which it did not is a return, and it fails
     with the entry's id.

   The driver writes each consent verdict's keys as one write of their own and is not edited
   (ADR-006). What changed is only the door's reading of the menu.
5. **A fail is `failed / blocked_screen`, named and not retried.**
   - It is non-retryable by the closed classifier's fail-closed rule, so `RETRYABLE_REASONS` is
     not edited.
   - The entry's id rides the driver's result as `screen: { id }`, through `aof work drive`'s
     `--json` document and `childDriveOutcome`, into the lane settle narration
     (`settle: failed (blocked_screen: mcp-approval)`) and the loop's halt details
     (`screen=mcp-approval`). The mesh worker's result carries it the same way.
   - Recognition runs on every settled frame from spawn to settle, so the name arrives within
     seconds of the frame, not at a deadline.
6. **A wait is the provider wait, read from the screen.** 129/06 F-58's rule holds unchanged: the
   heartbeat deadline is suspended while the wait is on screen and no heartbeat is newer, and
   start-to-close still bounds the attempt. What changes is the input: `PROVIDER_WAIT_RE` over the
   snapshot's rows, where it used to read the escape-stripped byte window. The pattern keeps its
   home in `loop-bounds.mjs`.
7. **The fixtures.**
   - **Path:** `test/fixtures/claude-screens/<id>.json`, holding
     `{ claude: "<version>", cols, rows, chunks: [{ t, d }] }`: the raw chunks as the probe
     records them (RESEARCH Q2 recipe) and the version they were recorded from. The version lives
     in the file, not the name, so a re-capture keeps its path.
   - **Tests:** the suites render each fixture through `screen.mjs`, so a fixture proves both that
     the model renders it and that the registry recognises it.
   - **Capture:** `ready`, `first-run` and `login` are captured by the developer (isolated
     `CLAUDE_CONFIG_DIR`, no tokens). `trust` and `mcp-approval` need a configured claude in a
     scratch cwd, which writes a projects entry into the operator's real `~/.claude.json`. That
     capture is operator-told, and the entry is removed afterwards. `usage-limit` is a synthetic
     fixture built from the measured text, and says so in its name.
   - **Upkeep:** a new claude version is a re-capture.

### Alternatives considered

- **Consent for MCP approval from the checkout's settings.** Rejected for v1. It means parsing
  claude's settings format, and the inheritance that should have answered the dialog already
  exists. A named failure points at the real defect.
- **One failure reason per screen** (`blocked_login`, …). Rejected. It grows the closed
  vocabulary per screen. One reason plus the id carries the same information.

### Consequences

- The measured 9 lost attempts become one non-retryable halt, named within seconds of the frame.
- Registering a screen is a fixture plus an entry, never a driver change.

## ADR-004 — Screen evidence at every stop that is not `done`

### Context

`directive-not-accepted` already records a 600-char escape-stripped byte tail. Every other stop
records nothing of the screen. Loop-diag cannot receive anything from the driver, because every
drive is a child process (RESEARCH Q4).

### Decision

1. **One producer.** The door's `evidence()` returns `{ buffer, cursor, rows }`, with trailing
   blank rows dropped. With no model it returns the byte tail, marked as such.
2. **Taken at the moment of decision**, before the tree is killed:
   - in `stopForOutcome` for every outcome other than `done`: timeouts (heartbeat,
     start-to-close, not-ready, not-accepted), `needs-input`, `blocked_screen` and `cancelled`;
   - in the settle for `agent_died` and a non-zero exit.
3. **One sink, one event per stop.** The event goes to `degrade.log`.
   - Its code is the stop's existing code where one exists (`directive-not-accepted`,
     `tui-ready-marker-absent`), which now carries rendered rows in place of the byte tail.
     Otherwise it is `session-screen`.
   - The event carries the item ref, the outcome and reason, and the rows.
   - `reportDegrade` gains an optional `extra.key`, and throttles per (code, key). The driver keys
     by session, so one daemon hosting several sessions cannot drop a second session's evidence
     behind the first's. Existing callers pass no key and are unchanged.
4. **Loop-diag receives nothing new.** No driver runs in the loop's process (RESEARCH Q4). The
   loop's narration names `blocked_screen`'s id (ADR-003 §5), and the rows stay in the degrade
   log.
5. **Bounded.** The event holds the visible rows only (about 2 KB at 80×24), never scrollback and
   never the raw stream. That is the same exposure the byte tail had, in the same local log.

### Consequences

- Every timeout, death, unaccepted directive and needs-input stop leaves the screen as drawn: the
  SPEC's third outcome.

## ADR-005 — The fleet mirror keeps its byte tail

### Context

The SPEC asks whether the fleet terminal view can serialise the same model for a reconnecting
viewer instead of replaying raw bytes.

### Decision

**Not in this milestone.** Three reasons:

1. **The model lives in the wrong process.** It lives in the driver's process on the worker. The
   mirror (`src/mesh/terminal-mirror.mjs`) lives on the control node, fed by relayed frames, and
   the graph shows no edge between them. "One model, two readers" would need the worker to serve
   snapshots to the control node, a control→worker request path that 38/ADR-014 excludes.
2. **The alternative is a second model, not the same one.** An emulator per tuple on the control
   node would mean up to 64 per daemon, and that is not reuse.
3. **Nothing is broken.** No defect in the bounded byte-tail replay has been measured since
   F-38.06g fixed blank-on-refresh.

The revisit trigger is a measured reconnect defect, such as a tail cut mid-sequence garbling the
view. Such an item would reuse `src/terminal/screen.mjs`.

## ADR-006 — Three stories: the spine, the registry, the live proof

The coupling decides the cuts. Every behaviour lands in the driver's one promise body. The only
way to keep later stories off that body is for the spine to land the verdict seam whole: all four
verdict kinds wired in the driver, exercised in 00 through an injected test registry. The
registry story then adds entries and plumbing, and never touches the driver.

| story | writes | depends | stage |
|---|---|---|---|
| 00 the driver reads the screen | the dependency; `src/terminal/{screen,session-screen,claude-screens}.mjs` with the `ready` and `usage-limit` entries; the driver's rewire (the feed, all four verdict kinds, the byte gate moved out, the bounded sentinel carry, evidence at every stop, `screen: { id }` on a blocked result); `src/degrade.mjs` (`extra.key`); the `ready`, `first-run` (ready's negative case) and `usage-limit` fixtures; the family exemptions and runner registration; FF-5301's admission; FF-13801 | none | 1 |
| 01 blocking screens are named | the `trust`, `mcp-approval`, `first-run` and `login` entries and the three fixtures still missing; `screen` passed through `childDriveOutcome` (`loop/child-drive.mjs`) and into the lane settle narration and the halt details (`loop/wave.mjs`, `loop/cycle.mjs`); FF-13802 | 00 | 2 |
| 02 a live session proves it | no source file; `@manual` evidence in VERIFICATION | 00, 01 | 3 |

The work is linear by construction, because 01 consumes 00's seam, so no two stories share a
wave. Three things need no edit:

- `commands/drive.mjs`: its `--json` document already spreads the driver's result, so `screen`
  rides it as it stands.
- The halt line: `reportFacts` in `commands/loop.mjs` prints every non-null detail key, so
  `screen=mcp-approval` appears there with no renderer change.
- The worker path (`mesh/worker-execution.mjs`): it calls the same driver.

## Fitness functions

HARNESS SHAPE (`119/ADR-010`): each arch-test exports `archTests`, registered by one import and
one spread in its directory's `index.mjs`. Every control below is `pending` until its story lands
it, and each landed control owes a red probe in `VERIFICATION.md`.

The standing controls this milestone must keep green are cited, not redeclared:

- FF-5301, re-pinned by story 00 under ADR-001 §7;
- FF-5302;
- `acd-source-directory-budget`;
- `acd-no-new-silent-catch`;
- `acd-worker-driver-no-headless-print`;
- `acd-loop-family-boundary`.

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-13801 | **The screen has one reader.** `@xterm/headless` is imported by `src/terminal/screen.mjs` and by no other `src/**` module. The comment-stripped `src/agent-session-driver.mjs` spells none of `ANSI_ESCAPE_RE`, `TUI_READY_MARKER`, `2004h`, `PARKED_PASTE_RE`, `PROVIDER_WAIT_RE`, `hasVisibleText` or `screenTail`. The byte-gate fallback's markers appear only in `src/terminal/session-screen.mjs`. Landed by 138/00; its red probe is in `VERIFICATION.md`. | `test/arch/terminal/acd-screen-has-one-reader.test.mjs` | ADR-001 §1 §5, ADR-002 §4 §6 |
| FF-13802 | **Every registered screen is recorded.** Every `claude-screens.mjs` entry names at least one fixture under `test/fixtures/claude-screens/`, and every fixture records the claude version it was captured from (a synthetic one says so). Rendered through `screen.mjs`, each fixture is recognised as its own entry and as no other. The `ready` recogniser matches no dialog or menu fixture (the `❯` hazard). Every `consent` entry names the option text it selects. Landed by 138/01; its red probe is in `VERIFICATION.md`. | `test/arch/terminal/acd-screen-registry-is-recorded.test.mjs` | ADR-002 §1, ADR-003 §1 §2 §4 §7 |
