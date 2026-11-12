---
doc: architecture
---
# 191 · Discord drives the work from a phone — Architecture

Decided at refine, 2026-11-11, solo (the main session played the architect). Inputs: SPEC Objective
and Scope, RESEARCH Q1–Q4, 50's ADR-002/003/004/007/008 (the session-spawn lane), 131's
ADR-007/008/009 (the bot, the gateway, the slash commands), 126/ADR-005 (the declarations
producer and its argv leaf), and 175/ADR-005 (a laptop that is its own single-node mesh).

**Graph.** `aof graph build .` built 21,453 nodes and 47,159 edges (egress none, built
2026-11-11T01:39:54Z). `aof graph impact` over the boundary modules gives two clusters that touch
nowhere:

- **The session-spawn lane.** `packages/mesh/src/session-spawn-directive.mjs` has six source
  dependents: `control-stream-server`, `launcher`, `session-spawn-outcome`, `terminal-input`,
  `ui-serve` and `worker-stream-client`. `session-spawn-handler.mjs`'s only source dependent is its
  core binding.
- **The messaging family.** `packages/messaging/src/discord.mjs` is depended on by `bot`, `gateway`
  and `notify`. `discord-commands.mjs`'s only source dependent is its core binding.

The partition (ADR-008) follows that cut: mesh stories, messaging stories, and the loop's start
request (`packages/work-loop/`) on its own.

## Memory recall: what was surfaced, and what it changed

- **Architect** (recall `071e9122-8aad-4b7d-9f55-1bbec16d7116`): `aof memory recall "control node
  spawns its own launched session; Discord slash commands start sessions; remote control link"
  --area architecture --block` returned five records.
  - **m175/ADR-005** (a laptop is a single-node mesh, its own control node): **honoured**, and it is
    why ADR-001 exists. On that mesh no node but the control exists, so a start that can only
    target a worker could never land.
  - **m131/10 R1** (a new module in a swept family names the sweep's control in `files:`):
    **honoured**. Every story below that adds a module under `packages/messaging/src/` lists
    `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` with the leg it amends. Every story
    that adds a session arch file lists the directory budget row.
  - **m172/00 R3** (a new module that spawns a process reddened four census controls the lane never
    ran): **honoured**. Each story that registers a verb lists
    `test/fixtures/application/command-inventory.json` and the mesh CLI bijection control. ADR-002
    adds no process-spawning module: the PTY factory already exists.
  - **m34/ADR-007** (workers hold a persistent stream to the control) and **m126/ADR-007** (the
    Windows autostart entry) are **irrelevant** to these decisions.
- **PO** (recall `c2f61598-b43d-4f5a-8758-9072cf05d6a2`): the item-scoped recall returned an empty
  block.

---

## ADR-001 — The control node hosts its own launched sessions

**Supersedes 50's stated assumption that "the control node is never its own dispatch target"
(50 OUTCOME, Assumptions). A `session-spawn` frame addressed to the control's own node id is handled
in the control's serve process by the same handler a worker runs, built from the same factory. It is
never handed to `dispatchDirective`, which has no entry for the control itself.**

### Context

Every project a channel serves is checked out on the control node (RESEARCH Q4), so the control is
the default target of `/session start`. Today the router in `packages/mesh/src/terminal-input.mjs:218`
hands every spawn frame to `dispatchDirective`, which answers `sent: false` for the control's own id,
and the start is refused (`session-spawn-target-not-connected`, `:238`). The handler is only built in
the launcher's worker branch (`packages/mesh/src/launcher.mjs:1585`). On this MacBook, a single-node
mesh (175/ADR-005), no start could ever land.

### Decision

1. **The control branch builds a session-spawn handler** (`launcher.mjs:1108`), from the same
   `createMeshWorkerSessionSpawnHandler` factory and with the same literal keys as the worker branch
   (`loadWs`, `nodeId`, `workerHasRepo`, `meshCheckoutPath`). Its three outbound legs are the
   control's own:
   - `sendTerminalFrame` and `sendTerminalEnd` go to `ingressForward.frame` and `.end` (`:1171`),
     the loopback push a loop's local drive child already uses (162/ADR-001 §2). The fleet view
     needs no new branch.
   - `sendSessionSpawnAck` pushes `buildSessionSpawnAckEnvelope(nodeId, …)` into the same loopback
     push, where the fleet face's outcome registry already reads a worker's ack.
2. **The router routes by node.** In `terminal-input.mjs`, a `session-spawn` frame whose `nodeId` is
   the control's own goes to the local handler, and every other node's still goes to
   `dispatchDirective`. The same rule applies to the `terminal-input` lane, so keys typed into a
   control-local session reach its PTY, and to ADR-004's `session-end` lane. The router takes the
   local handler as an injected port. Without one (a worker, or a test), behaviour is unchanged.
3. **No relay, no local session.** With no `mesh.relay.url`, `ingressForward` is null. The control
   then builds no local handler, and a frame for its own node still refuses as today. A local
   session whose bytes reach no viewer is not offered.
4. **stop() halts it.** The launcher's `stop()` already reaches `sessionSpawnHandler`, and the
   control's handler is assigned to that same variable. A control daemon with a launched session
   still exits on SIGTERM.
5. **The fleet route is unchanged.** It already accepts the control's node id when presence reads it
   `live`. Its frame now lands, so the fleet's `New session ▾` also works on the control, which 50
   left as a stated refusal.

### Alternatives considered

- **Spawn `claude` from the bot directly.** Rejected: the bot imports no `child_process` (FF-13113),
  and a session the bot spawned would be a second class of session, with no record, no fleet tile
  and no `stop()` reach (50/ADR-004 §4).
- **Run a worker stream client on the control, connected to itself.** Rejected: a second identity on
  its own stream, and an admission path that exists only to talk to itself.
- **Keep the refusal and require `node:`.** Rejected: on a single-node mesh there is no other node,
  so the milestone's outsider check could not pass.

### Invariant

One handler factory serves both roles. A frame for the control's own node never reaches
`dispatchDirective`, and a frame for any other node never reaches the local handler.

---

## ADR-002 — A session started from Discord is `claude --remote-control`, typed by the node

**The `session-spawn` frame gains one optional field, `launch`, from a closed set holding exactly
one value, `"claude-remote-control"`. When it is present, the handler types a command line it builds
itself into the shell it opened. No other text from the frame ever reaches the PTY.**

### Decision

1. **The wire.** `buildSessionSpawnFrame` (`packages/mesh/src/session-spawn-directive.mjs`) accepts
   `launch`. The builder drops any value outside `SESSION_LAUNCHES = ["claude-remote-control"]`
   rather than forwarding it, and absent means a bare shell, exactly as now. The worker's receive
   branch and the router's rebuild (`terminal-input.mjs:218`) carry it through the builder. The
   fleet route never sets it, so `New session ▾` still opens a bare shell (50/ADR-007).
2. **The command line has one builder.** `launchCommandLine(launch, { sessionId, name, platform })`
   is a pure function in the handler's module. It answers the bytes to type, or null.
   - **POSIX:** `exec claude --remote-control <name> --session-id <sessionId>\n`. `exec` replaces the
     shell, so when `claude` ends the PTY ends, `endSession` runs, and no bare shell is left behind.
   - **win32:** `claude --remote-control <name> --session-id <sessionId> & exit\r\n`. `ComSpec` is
     `cmd.exe`, which has no `exec`; `& exit` closes the shell when `claude` returns.
   - It refuses (null) unless `sessionId` is a canonical UUID and `name` matches
     `^[A-Za-z0-9._-]{1,64}$`. Neither value then needs quoting in any shell.
3. **The name.** `<project folder>-<first 8 of the session id>`, with every character outside the
   class mapped to `-`, clipped to 64. It is computed by the handler from the workspace it already
   loaded, never sent on the wire, and is derivable from a session record alone, so `/session list`
   can show it (ADR-003 §5). DEFAULT DECISION: the item is not in the name. A session record carries
   no item, and the name must be readable from the record.
4. **`--session-id` is the control-minted id.** `claude`'s own hooks then register under the key
   the launcher already registered, `(nodeId, workspaceId, "claude", sessionId)`, so the grid shows
   one slot, not the two that 50/ADR-007's consequence recorded. The launched record's `assistant`
   label is now the truth.
5. **Typed after the spawn, once.** The handler writes the line straight after `pty.spawn` succeeds
   and before it acks `ok`. A failed write is `session-spawn-failed`, which tears down the PTY and
   leaves no record.
6. **The terminal is opened at 200 columns for a `claude-remote-control` launch.** DEFAULT
   DECISION, pending RESEARCH Q1's build measurement: the `/rc active` link sits in a footer that is
   hidden on a narrow terminal. The bare-shell launch keeps 80×24.

### Alternatives considered

- **A free-text `command` field on the frame.** Rejected: that would be a remote shell reachable
  from Discord, which the SPEC rules out by name.
- **Spawn `claude` as the PTY's program instead of a shell.** Rejected: 50/ADR-007 chose the shell
  idiom on the operator's ruling, and `mesh:terminal-resume` already types `claude --resume` the
  same way. `exec` gets the one property a direct spawn had: no leftover shell.
- **Turn Remote Control on through `remoteControlAtStartup`.** Rejected: that is a user-level
  setting aof would have to write into `~/.claude/settings.json`, and it would turn Remote Control
  on for every session on the machine (RESEARCH Q1).

### Invariant

The bytes a spawn writes into a PTY come only from `launchCommandLine`, which accepts one closed
`launch` value, a UUID and a name from a closed character class.

---

## ADR-003 — One start core, three verbs, and the link read off the relay

**The fleet route's checks move into `packages/mesh/src/session-start.mjs`, which both the route and
three new registered verbs use: `mesh:session-start`, `mesh:session-list` and `mesh:session-end`
(CLI `aof mesh session start|list|end`). `mesh:session-start` can wait, bounded, for the session's
link or its refusal, read from the loopback relay the serve process already brokers.**

### Decision

1. **The core.** `planSessionStart({ status, workspaceId, nodeId, issuer, relayAvailable })` is pure
   and answers either a refusal, `{ code, message, status }`, or `{ sessionId, nodeId, workspaceId }`.
   It holds the checks `ui-serve.mjs:618–760` spells today, in the same order, with the same codes
   and HTTP numbers: `workspace-not-found`, `workspace-not-local`, `control-identity-unknown`,
   `session-target-not-connected` and `session-dispatch-unavailable`. The route keeps its admission,
   body parsing and response writing, and calls the core for the rest. Its locked scenarios stay
   green unchanged.
2. **`mesh:session-start`** (`packages/mesh/src/commands/session.mjs`, the
   `mesh:terminal-resume` precedent, `packages/mesh/src/commands/terminal-resume.mjs:38`).
   - Input: `{ project, node?, item?, waitMs? }`.
   - `project` resolves by workspace id or project folder name among the control's local
     workspaces. Several matches refuse `session-project-ambiguous`, naming them.
   - `node` defaults to the control's own id (RESEARCH Q4).
   - `item`, when given, must resolve with `work:find` in that project, else
     `session-item-unknown`. A typo never mints a stray worktree.
   - It always sends `launch: "claude-remote-control"`, and pushes through
     `createTerminalRelayPushTransport`, as `terminal-resume` does.
   - It answers `{ sessionId, nodeId, workspaceId, project, item, name, link, outcome }`. `outcome`
     is one of `started`, `refused` (with the worker's code) or `no-link`.
3. **The watch.** Before it pushes, the verb subscribes to the loopback relay for the one
   `(nodeId, sessionId)` tuple. It reads the terminal-frame signals for the first match of
   `https://claude\.ai/code/[A-Za-z0-9_-]+`, and the `session-spawn-ack` envelope for a refusal.
   - The subscription is the mirror's discipline: in memory, no durable write, at most 64 KiB
     scanned, closed at the first answer or at `waitMs`.
   - DEFAULT DECISION: `waitMs` is 45,000 from Discord. The CLI default is 0, meaning start and
     return without waiting.
   - It subscribes before the push, so a fast session's first bytes are never missed.
4. **No link is not a failure.** When the bound passes with no link and no refusal, `outcome` is
   `no-link`. The session is still started, and its `name` is the one the Claude app's list shows
   under **Code** (RESEARCH Q1). Every reply that carries no link carries the name and that path.
5. **`mesh:session-list`** answers the live sessions in the given projects (all local projects when
   none is given). It reads `queryGlobalMeshStatus` and lists each session's `sessionId`, `nodeId`,
   project, start time and the ADR-002 §3 name. It reads only, and names no item, because a session
   record carries none.
6. **`mesh:session-end`** is ADR-004's.

### Alternatives considered

- **A `mesh:session-watch` verb beside `start`.** Rejected: two calls with a race between them. The
  watch must open before the push.
- **Read the link from the session record.** Rejected: `claude`'s hooks carry no Remote Control URL,
  and the record's keys are 48's.
- **Have the worker scrape the link and send it up a new frame kind.** Rejected: the bytes already
  reach the control's relay for the fleet view, and a new kind would be a third return lane.

### Invariant

The fleet route and `mesh:session-start` reach the dispatch only through `planSessionStart`, and
neither spells a refusal code the other does not.

---

## ADR-004 — Ending a launched session

**A new down-frame, `session-end { nodeId, sessionId }`, asks the node holding a launched session to
halt it through the handler's existing shutdown path. A node refuses an id its handler does not own.
`mesh:session-end` confirms the end from presence, as `terminal-resume` confirms a resume from a row
the worker writes. There is no idle limit (§5, operator, 191/03 Q1).**

### Decision

1. **The wire.** `SESSION_END_KIND = "session-end"` and `buildSessionEndFrame` join the lane's one
   home, `session-spawn-directive.mjs`. The worker stream client gains `onSessionEnd`. The router
   routes the kind exactly as ADR-001 §2 routes a spawn: the control's own id goes to its local
   handler, every other id to `dispatchDirective`. `acd-wire-kind-has-both-ends` sweeps the new
   kind with no edit to its predicate.
2. **The handler.** `handler.end(sessionId)` halts the one session it owns: it kills the PTY, clears
   the ping interval, sends the terminal end and calls `endSession`, the same steps as its `halt()`
   for shutdown. An id it does not own is logged once (`session-end-not-launched`) and nothing else
   happens. A session `claude` started in someone's terminal has no PTY here, and ending it from
   Discord is out of reach by construction.
3. **The verb.** `mesh:session-end { session, node? }`: `node` defaults to the node the session's
   presence row names. An id no live presence row carries refuses `session-not-found`. It pushes,
   then reads presence until the row is gone or 15 s pass, and answers
   `{ ended: true|false, sessionId, nodeId }`. `ended: false` says that the request was sent and
   that the session is still listed. It is never a fabricated success.
4. **No new ack kind.** The end is confirmed by the record leaving presence. The record is the
   worker's own fact (50/ADR-004 §5), so the control does not hold a second copy.
5. **No idle limit** (operator, 2026-11-12, 191/03 Q1). Nothing ends a launched session but
   `/session end`, the session's own `claude` exiting (ADR-002 §2), Quit or a restart.
   `/session list` is how a forgotten session is found. No config key is added.

### Alternatives considered

- **Type `/exit` into the session.** Rejected: it depends on `claude`'s state (a dialog open, a tool
  running), and a keystroke is not an end.
- **`session-end-ack` for the reply.** Rejected for now: presence already carries the answer within
  one ticker cadence, about 5 s.

---

## ADR-005 — `/loop start` is a start request the supervisor honours

**`work:loop` gains `startHandOff` (CLI `--hand-off-start`): "ask the supervisor to start this scope
as a new supervised loop; start nothing here". It writes a start request beside the resume request.
The declarations producer turns each request into a row whose argv starts a fresh supervised loop,
and the launched loop clears the request.**

### Context

`/loop resume` (131/ADR-009 §6) works only for a scope that already has a declaration, because the
supervisor's rows come from run records (`decideSupervisedDeclarations`,
`packages/work-loop/src/engine.mjs:1631`). Every row's argv carries `--resume`
(`packages/mesh/src/declarations.mjs:166`). A scope that has never run has no declaration, so
nothing in the supervisor can start it today.

### Decision

1. **The request.** `requestLoopStart(dir, { scope, workspaceId, by, now })` and its reader and
   clearer live in `packages/work-loop/src/stop-request.mjs`, beside `requestLoopResume`.
   - The file is `<meshRoot>/loop-starts/<workspaceId>--<scope>.json`. Both parts are checked by
     the module's own `segmentOf` (`stop-request.mjs:68`) before the path is joined.
   - It holds the five keys `{ scope, workspaceId, by, requestedAt, level }`. `level` is null unless
     given.
   - A second request for the same scope overwrites the first, and is idempotent.
2. **The verb's refusals**, each a value as the hand-off's are:
   - `loop-start-running`: the scope's latest run is live.
   - `loop-start-resumable`: the scope has a supervised declaration that `--hand-off` would
     relaunch. The message names `/loop resume <scope>`. A fresh start would reset a halted loop's
     total budget, which `declarations.mjs:164` refuses by name.
   - `loop-start-scope`: `decideLoopScope` refuses the scope.
   - Otherwise the request is written and the verb answers `{ ok: true, requested: true, scope, path }`.
   - `--hand-off-start` is refused with `--stop`, `--resume`, `--hand-off` and `--dry-run`.
3. **The row.** `supervisedDeclarations` reads the start requests and adds one row per request whose
   scope is not running.
   - The row is `{ id: "start:<workspaceId>:<scope>", label: "loop <scope>", argv, cwd: projectRoot, scope, level, cap: null }`.
   - Its argv is `argvFor(route, { scope, level }, { supervised: true })`. The leaf gains
     `SUPERVISED_FLAG = "--supervised"`, and the row never carries `--resume`. The compute budget
     gate applies as it does to every row.
4. **The clear.** A `--supervised` launch without `--resume` deletes its scope's start request once
   its declaration is written, at the same point where `--resume` clears a resume request. Until
   then, the scope's own running run keeps a second poll from relaunching it.
5. **The supervisor is unchanged.** The desktop app spawns whatever argv a row carries (126/ADR-005).
   No Rust change.

### Alternatives considered

- **Let `--hand-off` start a scope with no declaration.** Rejected: one flag would mean "resume" for
  one scope and "start fresh" for another, and an operator could not tell from the reply which one
  happened.
- **The bot runs `aof work loop <scope> --supervised`.** Rejected by 131/ADR-009's invariant: the
  supervisor starts loops, never the bot.

### Invariant

The supervisor is the only thing that starts a loop for `/loop start`. A start row never carries
`--resume`, and a resume row always does.

---

## ADR-006 — The commands: one word, `project`, picked rather than typed

**Every command's project option is named `project` (the old `workspace` option goes). It is
autocompleted from the projects the channel serves that the user may address. `/session start`,
`/session list`, `/session end` and `/loop start` join the table. The allowlist is unchanged and
covers them all. FF-13113's verb set grows by exactly the three session verbs.**

### Decision

1. **The word.** `project`, on every command, old and new. The operator agreed the shape
   `/session start project:<p>` (STATE 2026-11-10), and "project" is what every reply already prints
   (`**<folder>**`). The table is bulk-overwritten per guild at READY (131/ADR-009 §1), so the rename
   leaves nothing stale.
2. **Autocomplete.** The `project` option carries `autocomplete: true`.
   - An autocomplete interaction (type 4) is answered with callback type 8, `{ choices }`. It is not
     deferred, since Discord allows no deferral for type 4.
   - It offers at most 25 choices, `{ name: <folder>, value: <workspaceId> }`, from the KEPT
     workspaces (131/ADR-009 §3), filtered by the typed prefix, case-insensitively.
   - A user not on any allowlist gets an empty list, never a refusal text.
   - `node` autocompletes the live nodes from `mesh:status`.
   - `item` autocompletes the project's `in-progress` rows from `work:list`.
   - Typed values are still validated when the command runs: autocomplete suggests, it does not
     gate.
3. **The new table entries.**
   - `/session start project [node] [item]`
   - `/session list [project]`
   - `/session end session`, where `session` autocompletes the live sessions of the kept projects
     and shows the ADR-002 name.
   - `/loop start scope [project]`, beside `stop` and `resume`.
4. **The answers.**
   - `/session start` defers, invokes `mesh:session-start` with `waitMs: 45000`, then edits the
     original reply. On `started`, the reply carries the node, the project and the link. On
     `no-link`, it carries the name and the path in the Claude app. On `refused`, it carries the
     code's sentence. Its reply is ephemeral: only the person who ran it sees the link (operator, 2026-11-12, 191/06 Q1).
   - `/session list` and `/session end` defer ephemerally and in-channel respectively, on 131's rule:
     a view is private, and an action is attributed.
   - `/loop start` defers in-channel and invokes `work:loop` with `{ scope, startHandOff: true }`.
5. **FF-13113 grows, on purpose.** `ALLOWED_VERBS` becomes `work:list`, `work:loop`,
   `mesh:session-start`, `mesh:session-list`, `mesh:session-end` and `mesh:status`. The
   `child_process` leg is unchanged. Starting a session is a directive, never a process the bot
   owns.

### Alternatives considered

- **Keep `workspace`.** Rejected: the SPEC's agreed command reads `project:`, and an operator typing
  on a phone should meet one word.
- **Choices instead of autocomplete.** Rejected: static choices are frozen at registration, and a
  project enabled after READY would be missing for up to an hour.

---

## ADR-007 — Buttons on the notifications

**A halt or death notice carries `Resume` and `Open a session here`. A question with between two and
five fixed choices carries one button per choice. A button press is an interaction routed to one new
module, `packages/messaging/src/discord-buttons.mjs`. That module checks the same allowlist and
dispatches the same verbs a reply or a command would.**

### Decision

1. **Which messages get buttons.** Buttons are rendered only when the channel's `allow` is non-empty,
   the same `replyable` rule as 131/ADR-008 §7.
   - **`loop-halted` and `loop-died`**: `Resume` and `Open a session here`.
   - **`session-needs-input` and `session-parked-unanswered`**: one button per choice, when the ask
     carries 2–5 choices and every label fits Discord's 80 characters. Otherwise there are no
     buttons, and the answer is by reply as today.
2. **Choices for a Claude ask.** When the human-input call holds exactly one question with options,
   `askQuestionFromTurn`'s caller also answers `choices`, the option labels. This is the codex rule
   (`packages/execution/src/codex-protocol-profile.mjs:106`). The ask record carries them as the
   codex ask already does (`shapeRecord` keeps extra keys), and `session-needs-input`'s envelope
   gains `choices`. A worker's ask carries choices only when its park fact does (131/ADR-010). Where
   it does not, the ask is reply-only.
3. **The index.** `ask-messages.mjs` records every message it posts with buttons, keyed by message id
   as now.
   - It records the halt and death events too, which adds `scope` and `nodeId`.
   - An ask's record adds the `choices` it rendered.
   - The new keys are additive, and the 30-day prune is unchanged.
4. **One grammar for `custom_id`.** `buttonId(action, index?)` and `parseButtonId(text)` are the only
   code that spells it: `aof:answer:<n>`, `aof:resume` or `aof:session`. The context comes from the
   index by `interaction.message.id`, never from the id, so no project or ref is ever trusted from
   the client.
5. **The press.** `INTERACTION_CREATE` with type 3 is routed by `bot.mjs` to `handleButton`.
   - It defers ephemerally (type 5, `flags: 64`).
   - It finds the index record. With none, it refuses `discord-button-expired`.
   - It checks the user against the record's project's channel `allow`, as a reply is checked. A
     user not on it is refused `discord-button-not-allowed`.
   - It then dispatches the action:
     - `answer`: `work:answer { ref, text: <the label>, as: "@<username>", via: "discord" }`.
     - `resume`: `work:loop { scope, handOff: true }`.
     - `session`: `mesh:session-start { project: workspaceId, item: ref, node: nodeId, waitMs: 45000 }`.
   - After an answer, or after the refusal `ask-already-answered`, it edits the original message so
     its buttons are disabled.
6. **One tap answers.** A choice button answers at once, with no confirmation step. That is the
   SPEC's "act on a notification with one tap". First-answer-wins (131/04) makes a stale or second
   tap a stated refusal, never a second answer.

### Invariant

`discord-buttons.mjs` imports no `child_process` and invokes only `work:answer`, `work:loop` and
`mesh:session-start`. It never reads a project, ref or scope from a `custom_id`.

---

## ADR-008 — Eight stories, cut along the graph

Cut where `graph impact` says the coupling is: the session-spawn lane, the messaging family and the
loop's start request. Within the lane the stories go in sequence, because they share the hub module
and `terminal-input.mjs`. The rest run beside them.

| Story | Lands | Depends |
|---|---|---|
| 00 · the control node hosts a launched session | ADR-001 | — |
| 01 · a launched session runs Claude with Remote Control on | ADR-002 | 00 |
| 02 · sessions start and list from the CLI | ADR-003 | 01 |
| 03 · a launched session can be ended | ADR-004 | 02 |
| 04 · a loop starts through the supervisor | ADR-005 | — |
| 05 · the project is picked, not typed | ADR-006 §1–§2 | — |
| 06 · Discord starts sessions and loops | ADR-006 §3–§5 | 02, 03, 04, 05 |
| 07 · buttons on the notifications | ADR-007 | 02 |

Stage 1 is 00, 04 and 05. The registry files a new verb touches (`assemble.mjs`, the mesh
contribution, the command-inventory golden) are declared by every story that touches them, so
`aof work next` serialises 02, 03 and 04 on them rather than letting two lanes edit them at once.

---

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-19101 | **One handler serves both roles.** The launcher's control branch builds its session-spawn handler from `createMeshWorkerSessionSpawnHandler`, the factory the worker branch uses. A `session-spawn`, `terminal-input` or `session-end` frame for the control's own node id never reaches `dispatchDirective`, and one for any other node never reaches the local handler. | `test/arch/session/acd-launched-session-from-discord.test.mjs` — pending (191/00) | ADR-001 §1–§2 |
| FF-19102 | **Discord never types a shell.** `SESSION_LAUNCHES` is exactly `["claude-remote-control"]`. The builder drops any other `launch`. The only bytes the handler writes into a PTY at spawn come from `launchCommandLine`, which answers null unless the id is a canonical UUID and the name matches `^[A-Za-z0-9._-]{1,64}$`. | `test/arch/session/acd-launched-session-from-discord.test.mjs` (second leg) — pending (191/01) | ADR-002 §1–§2 |
| FF-19103 | **One start core.** `packages/mesh/src/ui-serve.mjs` and `packages/mesh/src/commands/session.mjs` both reach the dispatch through `planSessionStart`, and neither calls `buildSessionSpawnFrame` itself. | `test/arch/session/acd-launched-session-from-discord.test.mjs` (third leg) — pending (191/02) | ADR-003 §1 |
| FF-19104 | **The end lane has both ends.** `SESSION_END_KIND` is declared in `session-spawn-directive.mjs`, built there, and read by `worker-stream-client.mjs` and `terminal-input.mjs`. | `test/arch/mesh/acd-wire-kind-has-both-ends.test.mjs` (the sweep's expected set gains the kind) — pending (191/03) | ADR-004 §1 |
| FF-19105 | **The start request has one home, and a start row never resumes.** The `loop-starts` segment is spelled only in `stop-request.mjs`. A start row's argv carries `--supervised` and never `--resume`. | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` (a leg beside FF-13001) — pending (191/04) | ADR-005 §1, §3 |
| FF-19106 | **The commands still start no process.** FF-13113 as amended: every `invoke(` in `discord-commands.mjs` names one of the six verbs in ADR-006 §5, and the family imports no `child_process`. | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` (FF-13113's `ALLOWED_VERBS`) — pending (191/06) | ADR-006 §5 |
| FF-19107 | **A button reaches only what a reply or a command reaches.** `discord-buttons.mjs` invokes only `work:answer`, `work:loop` and `mesh:session-start`. `custom_id` is spelled only by `buttonId` and `parseButtonId`, and nothing the press dispatches is read from it. | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` (a leg beside FF-13113) — pending (191/07) | ADR-007 §4–§5 |

FF-19101–19103 share one new file in `test/arch/session`, so that directory's budget row in
`test/arch/testing/acd-source-directory-budget.test.mjs` moves by one, once, in 00, with its reason.
FF-19104–19107 are legs in existing files, so no other row moves. Every control owes a red probe in
`VERIFICATION.md` when it lands.
