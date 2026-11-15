---
doc: verification
---
# 191 · Discord drives the work from a phone — Verification

Written at `aof:verify 191`. Opened at refine (2026-11-11) to carry the red-probe register for the
controls `ARCHITECTURE.md` declares. A row reads `not yet run` until its story is verified.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19101 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | green at verify, 2026-11-12 (191/00): its three legs and its self-check | at verify, two changes to the shipped source, one at a time, each restored with `git checkout` (clean before and after). **(A)** in `packages/mesh/src/launcher.mjs`'s control branch, the factory alias was rewritten to `options?.createControlSessionHandler ?? createControlSessionHandler`: `not ok - arch/191 FF-19101 … in BOTH its control and its worker branch` with `the launcher's control branch does not build its session-spawn handler from createMeshWorkerSessionSpawnHandler`. **(B)** in `packages/mesh/src/terminal-input.mjs`'s spawn lane, `if (isLocal(nodeId))` became `if (false && isLocal(nodeId))`: `not ok - arch/191 FF-19101 … the shipped router's two destinations are exclusive` with `a session-spawn frame for the local node reached the local handler 0 time(s) and dispatchDirective 1 time(s); expected 1 and 0` |
| FF-19102 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | green at verify, 2026-11-12 (191/01): its two legs and its self-check | at verify, two changes to the shipped source, one at a time, each restored with `git checkout` (clean before and after, and the file green again after the second). **(A)** in `packages/mesh/src/session-spawn-handler.mjs`, the spawn's `term.write(launchLine)` became `term.write(String(frame?.launch ?? launchLine))`: `not ok - arch/191 FF-19102 … session-spawn-handler.mjs writes into a PTY at spawn only launchCommandLine's answer` with ``spawnSession writes `String(frame?.launch ?? launchLine)` into a PTY — the only spawn-time bytes are launchCommandLine's answer (FF-19102)``. **(B)** in `packages/mesh/src/session-spawn-directive.mjs`, `SESSION_LAUNCHES` gained a second value, `"shell"`: `not ok - arch/191 FF-19102 … SESSION_LAUNCHES is frozen and holds exactly "claude-remote-control"` with `a launch is a name from a closed set of one, never text the node runs` |
| FF-19103 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | green at verify, 2026-11-15 (191/02): its leg (each face imports `planSessionStart` from `session-start.mjs`, and names no frame builder) and its self-check | at verify, two changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after, `git diff` empty). **(A)** in `packages/mesh/src/commands/session.mjs`, the `session-spawn-directive.mjs` import gained `buildSessionSpawnFrame`: `not ok - arch/191 FF-19103 … ui-serve.mjs and commands/session.mjs both import planSessionStart from session-start.mjs, and neither builds the session-spawn frame or envelope itself` with `packages/mesh/src/commands/session.mjs names buildSessionSpawnFrame — a face pushes the envelope planSessionStart answers and never builds the frame itself (FF-19103)`. **(B)** in `packages/mesh/src/ui-serve.mjs`, the route's deferred `await import("./session-start.mjs")` became `await import("./session-start-legacy.mjs")`: the same case, with `packages/mesh/src/ui-serve.mjs does not import planSessionStart from session-start.mjs — every start face reaches the dispatch through the one core (FF-19103)`. Reverted; green (14/14). |
| FF-19104 | `test/arch/mesh/acd-wire-kind-has-both-ends.test.mjs` | green at verify, 2026-11-15 (191/03): its leg (`SESSION_END_KIND` declared once in `session-spawn-directive.mjs`, built only there, read with the constant by `worker-stream-client.mjs` and `terminal-input.mjs`, never re-spelt) and its in-case self-check (the tree with both readers removed reds the unedited `wireKindProblems` with `NO reading end anywhere`) | at verify, three changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after, `git diff` empty). **(A)** in `packages/mesh/src/worker-stream-client.mjs`, the end lane's `frame?.kind === SESSION_END_KIND` became `frame?.kind === "session-end"`: `not ok - arch/191 FF-19104 (acd-wire-kind-has-both-ends): SESSION_END_KIND is in the swept set …` with `packages/mesh/src/worker-stream-client.mjs reads SESSION_END_KIND with the constant. Reading ends: packages/mesh/src/terminal-input.mjs` (the general ADR-008 FF-B sweep stays green, since one reader remains: only this pin catches the lost end). **(B)** in `packages/mesh/src/session-spawn-directive.mjs`, `buildSessionEndFrame`'s `kind: SESSION_END_KIND` became `kind: "session-end"`: the same case, with `no end re-spells the literal` (`producing: ['packages/mesh/src/session-spawn-directive.mjs']`, expected `[]`). **(C)** in `packages/mesh/src/terminal-input.mjs`, `SESSION_END_KIND` was dropped from the import and declared locally, `export const SESSION_END_KIND = "session-end";`: the same case, with `the sweep reaches SESSION_END_KIND, declared once, in the session lane's one home` (a second declaration, home `packages/mesh/src/terminal-input.mjs`). Reverted; green (4/4). |
| FF-19105 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | green at verify, 2026-11-15 (191/04): its leg (`"loop-starts"` spelled only in `stop-request.mjs`; the start row's `argvFor(` options in `declarations.mjs` name `supervised: true` and never `resume`; the composer never emits both flags) and its in-case self-check (the planted `{ resume: true }` option is seen) | at verify, four changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after, `git diff` empty). **(A)** in `packages/mesh/src/declarations.mjs`, `const dir = loopStartsDir();` became `const dir = path.join(meshRoot(), "loop-starts");`: `not ok - arch/191 FF-19105 (acd-loop-stop-request-single-home): the start request has ONE home …` with `the literal "loop-starts" appears only in packages/work-loop/src/stop-request.mjs — spelled by: packages/mesh/src/declarations.mjs, packages/work-loop/src/stop-request.mjs` (FF-13001's reader leg reds too: `contains no path.join( whose arguments name meshRoot beside a loop literal — found: path.join(meshRoot(), "loop-starts")`). **(B)** in the same file, the start row's `argvFor(…, { supervised: true })` became `{ supervised: true, resume: true }`: the same case, with `a start row's argv never asks for --resume: argvFor(route, { scope: start.scope, level: start.level }, { supervised: true, resume: true })`. **(C)** the start row's options became `{}`: the same case, with `a start row's argv asks for --supervised: argvFor(route, { scope: start.scope, level: start.level }, {})`. **(D)** in `packages/work-loop/src/argv.mjs`, the `--supervised` guard `options?.supervised === true && options?.resume !== true` lost its `resume` clause: the same case, with `never both` (`true !== false`). Reverted; green (7/7). |
| FF-19106 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | green at verify, 2026-11-15 (191/06): its structural leg (shared with FF-13113: no `child_process` in the family, every `invoke(` in `discord-commands.mjs` names one of the six verbs and each of the six is named), with its in-case self-check (the shipped `verbCensus` over the module's own code reds a seventh verb, an unreached verb and a non-literal verb), and its fixture leg (every registered command deferred before any dispatch) | at verify, three changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after, `git diff` empty). **(A)** in `packages/messaging/src/discord-commands.mjs`, `listOf`'s `context.invoke("work:list", …)` became `context.invoke("work:drive", …)`: `not ok - arch/131 FF-13113 + arch/191 FF-19106 (acd-loop-ask-answered-from-discord): structural …` with `every invoke( in packages/messaging/src/discord-commands.mjs names one of work:list, work:loop, mesh:session-start, mesh:session-list, mesh:session-end, mesh:status — it also names work:drive`. **(B)** `choicesOf`'s `context.invoke("mesh:status", …)` became `context.invoke("work:list", …)` (both allowed): the same case, with `each of the six verbs is named by at least one invoke( in packages/messaging/src/discord-commands.mjs — none names mesh:status`. **(C)** the module gained `import { spawn } from "node:child_process";`: the same case, with `packages/core/src/discord/** imports no node:child_process — found in packages/messaging/src/discord-commands.mjs`. The fixture leg stayed green under all three (its fakes accept any verb; the structural leg is what holds the set). Reverted; green (9/9). |
| FF-19107 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | green at verify, 2026-11-15 (191/07): its structural leg (`discord-buttons.mjs` invokes only `work:answer`, `work:loop`, `mesh:session-start`, each reached, imports no `child_process`, and is the only `packages/messaging/src/` module spelling a `custom_id` prefix), with its in-case self-check (the shipped detectors red a planted `child_process` import, a fourth verb and a second spelling in `discord.mjs`), and its fixture leg (a `custom_id` with extra segments naming another project dispatches into the index record's workspace) | at verify, four changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after, `git diff` empty). **(A)** in `packages/messaging/src/discord-buttons.mjs`, the resume press's `invoke("work:loop", …)` became `invoke("work:drive", …)`: `not ok - arch/191 FF-19107 … structural` with `every invoke( in packages/messaging/src/discord-buttons.mjs names work:answer, work:loop, mesh:session-start — it also names work:drive`, and the fixture leg reds too (`id: 'work:drive'`, expected `'work:loop'`). **(B)** the module gained `import { spawn } from "node:child_process";` as its first line: the structural case, with `packages/messaging/src/discord-buttons.mjs imports no child_process` (FF-13113/FF-19106's family leg reds as well: `found in packages/messaging/src/discord-buttons.mjs`). **(C)** in `packages/messaging/src/bot.mjs`, the `INTERACTION_CREATE` route became `d?.type === MESSAGE_COMPONENT && String(d?.data?.custom_id ?? "").startsWith("aof:resume") ? handleButton(…) : …`: the structural case, with `a custom_id prefix (aof:answer:, aof:resume, aof:session) is spelled only in packages/messaging/src/discord-buttons.mjs — spelled in packages/messaging/src/bot.mjs, packages/messaging/src/discord-buttons.mjs`. **(D)** in `discord-buttons.mjs`, `context.loadWorkspace(record.projectRoot)` became `context.loadWorkspace(String(interaction.data?.custom_id).split(":")[2] ?? record.projectRoot)`: `not ok - arch/191 FF-19107 … fixture — a custom_id carrying extra segments naming another project dispatches into the index record's workspace, never the id's` with `the scope, item, node, project and workspace are the index record's — nothing from the id's extra segments` (the resume dispatched at `…/beta`, expected `…/alpha`, and the session press reached nothing). Reverted; green (9/9). |
| FF-19108 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | green at `aof:continue`, 2026-11-14 (191/08): its leg and its self-check | at build, one change to the shipped source, restored from a byte copy (`cmp` identical after). In `packages/mesh/src/launcher.mjs`'s control branch, `meshCheckoutPath: controlCheckout.meshCheckoutPath,` became `meshCheckoutPath,` (the worker's): `not ok - arch/191 FF-19108 … binds workerHasRepo and meshCheckoutPath to the seams createControlCheckoutSeams returns` with ``FF-19108: the launcher's control branch binds `meshCheckoutPath` to `meshCheckoutPath`, not to the seam createControlCheckoutSeams returns — the control would open a served project at a worker's managed checkout (F-03)``. The same change reds `191/08 task00`'s first scenario (the PTY opened at the absent managed checkout) and its item scenario (`session-worktree-failed`). |
| FF-19109 | `test/arch/session/acd-terminal-stream-transport-wired.test.mjs` | green at `aof:continue`, 2026-11-14 (191/08): its leg and its self-check | at build, two changes to the shipped source, one at a time, each restored from a byte copy (`cmp` identical after). **(A)** `packages/mesh/src/launcher.mjs` gained `const DEFAULT_LOOPBACK_RELAY_PORT = 4183;` under `DEFAULT_CONTROL_SERVICE_PORT`: `not ok - arch/191 FF-19109 (acd-terminal-stream-transport-wired): DEFAULT_LOOPBACK_RELAY_PORT is declared only in terminal-relay-bridge.mjs …` with `FF-19109: launcher.mjs declares DEFAULT_LOOPBACK_RELAY_PORT — the relay's loopback port is declared only in terminal-relay-bridge.mjs` and `FF-19109: launcher.mjs spells the relay port 4183 (1×) — a second derivation of the relay's loopback endpoint; read loopbackRelayUrl(config) instead`. **(B)** the relay gate became `options?.relay !== false && configuredRelayUrl(config) != null`: ``FF-19109: launcher.mjs: the relay gate does not read loopbackRelayUrl — `const relayEnabled = …configuredRelayUrl(config) != null;` `` and `…reads configuredRelayUrl or the raw mesh.relay.url key`; behaviourally every `191/08 task00` spawn reds with `the control subscribed ONE input router to its own broker` (`0 !== 1`) and `191/08 task01`'s port scenario with `one relay is started` (`0 !== 1`). |
| FF-19110 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | green at `aof:continue`, 2026-11-14 (191/01 task 04): its leg and its self-check | at build, one change to the shipped source, restored from a byte copy (`cmp` identical after). In `packages/mesh/src/session-spawn-handler.mjs`, `launch === "claude-remote-control" ? CLAUDE_HOOK_ASSISTANT :` became `? "claude-code" :`: `not ok - arch/191 FF-19110 (acd-launched-session-from-discord): the string "claude-code" is spelled in the code of packages/mesh/src and packages/work-loop/src only in session-spawn-directive.mjs, as CLAUDE_HOOK_ASSISTANT` with `packages/mesh/src/session-spawn-handler.mjs spells "claude-code" in code (1×) — read CLAUDE_HOOK_ASSISTANT from session-spawn-directive.mjs instead, or one session gets two records (FF-19110)`. |

## Verification evidence (aof:verify 191/00, 2026-11-12)

### The scoped suites (`@executable` + fitness functions)

Story-scoped, per the gate's rule. `aof test --scope impacted --story 191/00` plans all 1,276 suites
here (one widening, `packages/mesh/test/relay.test.mjs`, `no-registered-dependent`), and a whole-tree
run is the milestone gate's, so the suites were run by file. Every run had an isolated
`AOF_GLOBAL_HOME`. 191/00 has no `@manual` and no `@uat` scenario, and no UI surface.

- **The story's suites, 6 files, 137 cases, 0 red** (`--fresh`, tree `ea48c6c`):
  `mesh-session-spawn-handler`, `mesh-terminal-input-path`, `mesh-launcher-session-wire-complete`,
  `acd-launched-session-from-discord`, `acd-source-directory-budget` and the fleet route suite
  `mesh-ui-session-route` (in `reads:`, its locked scenarios unchanged).
  - verifies → task 00: the five `191/00 task00` cases, one per scenario (spawn and record and ok
    ack; output and exit through the loopback push; typed keys; no relay refuses as before;
    `stop()` halts the session).
  - verifies → task 01: `191/00 task01 — each lane routes by the frame's node id` (the four
    Examples rows), `a router with no local handler port behaves exactly as before` and
    `a local handler that throws on spawn is a degrade`.
  - verifies → task 02: the three `arch/191 FF-19101` legs, its self-check, and
    `the test/arch/session budget row moved once, to 40`.
- **The neighbouring controls, 12 more files.** Every suite under `test/arch/session`,
  `test/arch/mesh` and `test/arch/loop` that reads the two changed modules, plus
  `mesh-terminal-relay-bridge`, `session-spawn-outcome-lane` and `mesh-coordination-launcher`.
  Two cases are red, both in `acd-session-driver-mesh-blind` (FF-5301) and neither 191/00's:
  F-01 and F-02 below. Summary: `18/1276 suites · scope file · … · recorded (tree ea48c6c)`.
- **`packages/mesh/test/relay.test.mjs`** under `node --test`: 5 of 5 pass.

## Verification evidence (aof:verify 191/01, 2026-11-12)

### The scoped suites (`@executable` + fitness functions)

Story-scoped and run by file, each run with an isolated `AOF_GLOBAL_HOME`. 191/01 has no `@uat`
scenario and no UI surface.

- **The story's suites, 4 files, 120 cases, 0 red** (`--fresh`, tree `210595e`):
  `mesh-session-spawn-directive`, `mesh-session-spawn-handler`, `acd-launched-session-from-discord`
  and `mesh-terminal-input-path`.
  - verifies → task 00: the four `191/01 task00` cases (the frozen set of one; the envelope and the
    router's rebuild; E3's bare shell with nothing typed; the builder's four Examples rows).
  - verifies → task 01: the nine `191/01 task01` cases (typed once, before the ok ack, at 200
    columns; the bare shell at 80×24; the refusal that leaves nothing behind; E1, E2 and the Linux
    line; the four refusal rows and the leading-dash name; E5, E6 and the plain name) and the two
    `arch/191 FF-19102` legs with their self-check.
  - verifies → task 02: the two `191/01 task02` cases (the real `aof session ping` hook path lands
    one index record; E4, the exit that ends the PTY and the record).
- **The neighbouring controls, 13 more files, 140 cases.** Every suite that reads the three changed
  modules, plus `acd-source-directory-budget`. Two cases are red, both in
  `acd-session-driver-mesh-blind` (FF-5301) and neither 191/01's: F-01 and F-02 below, unchanged.
- **`packages/mesh/test/relay.test.mjs` and `runtime.test.mjs`** under `node --test`: 10 of 10 pass.

### Task 03 (`@manual`): a real launch, measured outside the daemons

**Where it ran, and what that leaves out.** The feature asks for a launch through the desktop app's
own daemons on this build. That could not be done here. The daemons run payload
`0abf307f.20261031T183956` (31 October). A restart is the operator's act, and two loops of another
project are running on this laptop. F-03 is still open, so a start for this node would refuse even
on this build. The measurements below were made in a stand-in process instead: the shipped handler
(the application's configured `createMeshWorkerSessionSpawnHandler`), the real node-pty, the real
`claude` 2.1.322 and the repository's real `aof session` hooks. The PTY's environment was the ten
keys read off the running `mesh serve` process (`SHELL=/bin/zsh`, the LaunchAgent's `PATH`), plus
an isolated `AOF_GLOBAL_HOME` seeded with this node's identity. The repo guard was answered `true`
(F-03's seam). `claude auth status` in that environment answered `loggedIn: true`.

- **The footer's link bytes at the launch width.** verifies → task 03, scenario 2.
  A launch at the repository root, PTY 200×24, session name `aof-4b0fcc86`. First output after
  2.8 s. A `https://claude.ai/code/` URL was in the bytes 12 s after the spawn, at byte 1,970 of
  the 2,137 emitted before the session was ended. It appears once, as plain text in one notice
  line: `/remote-control is active · Continue here, on your phone, or at
  https://claude.ai/code/session_<id>`, coloured with `ESC[38;5;241m`. The footer reads
  `/rc connecting…`, then `/rc active`. The bytes hold no OSC 8 sequence at all, so RESEARCH Q1's
  "an OSC-8 hyperlink in the footer" is not what this version emits. 191/02's
  `SESSION_LINK_PATTERN` matches the plain form. **ADR-002 §6's 200 columns stand**, and no other
  width was needed.
- **The trust dialog in a session worktree.** verifies → task 03, scenario 3.
  A launch naming item `191`. The handler created `.aof/mesh/session-worktrees/session-191`
  (detached at `8c62e7aa`; the folder is `session-191`, not the scenario's `191`), which took 9 s.
  **No trust dialog appeared.** Claude Code opened straight into the session, and the URL was in
  the bytes 4 s after the PTY opened, at byte 2,290. `~/.claude.json` holds
  `hasTrustDialogAccepted: true` for the repository root and no entry for the worktree path, so a
  child folder of a trusted root is not asked again. The worktree was removed after the run.
- **A launched session, its name and its one slot.** Scenario 1, in part.
  Both launches came up as Claude with Remote Control active under the name the handler typed
  (`aof-<first 8 of the id>`), and Claude Code issued a `claude.ai/code` session URL for each. The
  session index held exactly one entry per session id at every reading (15 s, 40 s, 75 s). Typing
  `/exit` ended the PTY 1.4 s later: one terminal end was sent and no session record was left,
  which is E4 against a real `claude`. Two things in scenario 1 were **not observed**: the session
  listed by name with a green dot in the Claude app's Code list, and one tile in the real fleet
  grid. See F-06. The reading of the session records is F-05.

## Verification evidence (aof:continue 191/01 task 04, 2026-11-14)

The `@bug` task for F-05 (ADR-002 amendment 2026-11-14 §4). Every run by file, each with an
isolated `AOF_GLOBAL_HOME`, under a preload that refuses any bind or dial of 4181–4183 and logs the
attempt (none was logged in any run below). No `@manual` and no `@uat` scenario.

**What landed.** `CLAUDE_HOOK_ASSISTANT = "claude-code"` in `session-spawn-directive.mjs`, read by
its three readers: the hook default (`commands/session.mjs`), the handler for a
`claude-remote-control` launch (`session-spawn-handler.mjs`), and the loop drive's stream, which now
takes the label from its `loopSession` port (`loop-session-stream.mjs`), handed in by the drive
binding (`packages/core/src/application/bindings/commands/drive.mjs`). A bare shell keeps the
frame's label.

- **Before the fix, measured.** With the handler's label put back to `"claude"`, the new task-04
  tests reproduce F-05 exactly: two records for one id (`claude-code`, `relaying: false`, the hook's;
  `claude`, `relaying: true`, the launcher's), the launched record not found under the hook's key,
  and `mesh session end` answering `session-end-unconfirmed` because the hook's record stays listed.
  Log: `/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/probe-f05-behaviour.log`.
- **The story's suites.** `mesh-session-spawn-handler` and `acd-launched-session-from-discord`:
  2 files, 75 cases, 0 red (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/t04-a.log`). Folded into the final consolidated run below.
  - verifies → task 04, scenario 1: `191/01 task04 — the launch and the hook upsert one record`
    (the real SessionStart and prompt hooks from the launched cwd; every record on disk for the id
    is `(wsl-2, ws-a, claude-code, id)`, and one presence entry).
  - verifies → task 04, scenario 2: `191/01 task04 — a hook ping never demotes the launched pane`
    (the real hook path, then a ping stating `relaying: false` under the hook's key; still one record,
    `relaying: true`).
  - verifies → task 04, scenario 3: `191/01 task04 — the session is still found by id and by name`
    (`mesh:session-list` lists it once as `ws-a-0b9e6c1e`; `mesh:session-end ws-a-0b9e6c1e` reaches
    the handler's end lane and is confirmed from presence, and no record is left).
  - verifies → task 04, the Rule's row 1: `191/01 task04 — Rule: the other launches keep their
    labels (… a bare-shell launch from the fleet registers its record as "claude")`.
  - verifies → task 04, the Rule's row 2: `loop-session-streams-to-its-card/00 E1` in
    `test/loop/drive-command-phase-drivers.test.mjs` (unchanged), which drives the application's
    composed `continueDriverCommand` and asserts the child's statement keys the record
    `claude-code`. The label now reaches it only through the binding's port.
  - verifies → task 02, scenario 1 (now naming `claude-code`): `191/01 task02 — Claude's hook ping
    lands on the launcher's record … (wsl-2, ws-a, claude-code, id)`, which also asserts the hook
    answered under `claude-code`. Task 02's E4 and the 191/03 end-lane cases now key the launched
    record `claude-code` and stay green.
  - verifies → FF-19110: `arch/191 FF-19110 …` and its self-check. Red probe in the register above
    (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/probe-19110.log`).

## Verification evidence (aof:continue 191/08, 2026-11-14)

ADR-001 amendment 2026-11-14 §1–§7 (F-03). Every run by file, with an isolated `AOF_GLOBAL_HOME` and
the same port guard. No test binds or dials 4181, 4182 or 4183: the scenarios read the ports the
launcher ASKS of its injected `startControlStreamServer` and `relayMode`. No `@manual`, no `@uat`.

**What landed.** `createControlCheckoutSeams` in `launcher.mjs` (the control's `workerHasRepo` and
`meshCheckoutPath`, from the descriptor `project_root`, root on disk), bound in the control branch
only; the handler awaits `meshCheckoutPath` and refuses a seam with no root. `loopbackRelayUrl`
derives `ws://127.0.0.1:4183/ws/relay` for a nominated control with no `mesh.relay.url`
(`DEFAULT_LOOPBACK_RELAY_PORT` in `terminal-relay-bridge.mjs`, `isControlNode` injected by its
binding); the launcher's relay gate and broker port and `meshUiProbe`'s `relayConfigured` read it.
The desktop preflight gains `control-relay-loopback` (fifth in `PREFLIGHT_CHECKS`, every platform,
through a new `meshConfigFn` seam that reads `~/.aof/aof.config.json`). The three refusal
sentences name `mesh.relay.controlNode` before `mesh.relay.url`. `.claude/rules/build-deploy-restart.md`'s
"This MacBook" section says no `mesh.relay.url` is set, that the relay listens on 4183, and what the
preflight row should read.

- **The story's suites.** 16 new cases in `mesh-session-spawn-handler`, the two FF legs with their
  self-checks. Final consolidated run of both stories' suites and the controls they move:
  **13 files, 360 cases, 0 red** (`--fresh`): `mesh-session-spawn-handler`,
  `acd-launched-session-from-discord`, `acd-terminal-stream-transport-wired`,
  `drive-command-phase-drivers`, `mesh-session-spawn-directive`, `mesh-session-verbs`,
  `mesh-desktop-install`, `mesh-desktop-preflight-heartbeat`, `acd-autostart-is-one-injected-runner`,
  `mesh-terminal-relay-bridge`, `acd-session-driver-mesh-blind`, `acd-control-derives-its-census`,
  `acd-source-directory-budget` (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/final-story-suites.log`).
  - verifies → task 00, scenario 1: `191/08 task00 — a spawn for the control's own node opens the
    PTY in the registered folder` (the control launched from its own workspace `ctl-home`; ws-a a
    separate checkout with no marker and no managed checkout, registered by descriptor only).
  - verifies → task 00, scenario 2: `191/08 task00 — an item start opens in that item's worktree
    under the registered folder`.
  - verifies → task 00, the Rule's two rows: `191/08 task00 — Rule: … (Examples: ws-b is not
    registered on ctl-1)` and `(… ws-c is registered on ctl-1 with a folder that is gone)`.
  - verifies → task 00, a worker is unchanged: `191/08 task00 — Rule: a worker is unchanged` (a
    worker launcher `wsl-2` opens ws-a in its managed checkout, a real clone pinning its id).
  - verifies → task 01, the derivation's four rows: `191/08 task01 — Rule: the derivation`
    (the application's own `loopbackRelayUrl`, plus: a blank URL is unset, and the derived path is
    the broker's `RELAY_PATH`).
  - verifies → task 01, `a loopback control with no relay URL asks for 4182 and 4183`.
  - verifies → task 01, `every reader on the control dials the derived relay`: the derivation answers
    the 4183 URL, the shipped push and subscriber factories are built (null for a non-control), and
    `meshUiProbe` reports `relayConfigured: true`. The URL each transport dials is not read at
    runtime (neither exposes it, and dialling 4183 here is forbidden); that they dial exactly
    `loopbackRelayUrl(config)` is F-38.06b FIX 2's source leg, beside FF-19109.
  - verifies → task 01, `a control with a relay URL and a LAN address binds as before` (192.168.1.20:4182,
    relay 4182, push transport configured for `ws://127.0.0.1:4182/ws/relay`).
  - verifies → task 01, `invite and join still read the configured key` (`mesh:invite` on the
    URL-less nominated control answers `relayUrl: null`). `mesh:join`'s read is unchanged code, not
    exercised here.
  - verifies → task 01, the refusals' two rows: `191/08 task01 — Rule: the refusals name the
    nomination first (… session start …)` and `(… session end …)`.
  - verifies → task 02, the four rows: `191/08 task02 — control-relay-loopback reports the relay
    (Examples: …)`, each through `mesh:desktop-install --dry-run`, its `--json` row and the line it
    renders.
  - verifies → task 03: `arch/191 FF-19108 …` and `arch/191 FF-19109 …` with their self-checks; the
    Outline's two red-probe rows are the probes in the register above (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/probe-19108.log`,
    `/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/probe-19109.log`, `/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/probe-19109b.log`).
- **The suites that start a launcher** (26 files, `global-work-propagation` excluded: it binds
  :4182). First run: green, but the port guard refused **60 binds of 127.0.0.1:4183**. Six suites
  start a nominated control with no `mesh.relay.url` and no `relay: false`, so under the amendment
  each now starts a real broker on 4183. Each was given `relay: false`, the existing isolation seam
  (`mesh-launcher-stream-role.test.mjs`'s own precedent). Re-run: 26 files, 299 cases, 0 red, no
  guarded attempt (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/sweep-launchers-2.log`).
- **The neighbouring suites.** Every test file that names a changed module, every `test/arch` suite
  that sweeps source, and the workspace-boundaries suite: 273 files, 2,526 ok, 13 red
  (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/sweep-neighbours.log`). Nine were this change's and were fixed: FF-11902 (two count
  assertions over a directory read, restated over every member), FF-5301's reach ceiling (186 → 188,
  the registry binding and module, with its reason), workspace-boundaries' stale source digest for
  `desktop-preflight.mjs` (re-stamped: the audited `spawn` is byte-identical), and three 126/04
  preflight pins (the fifth code, and `meshConfigFn` injected into the probes). Re-run of the red and
  edited files: 14 files, 248 ok, 4 red (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/recheck.log`), all `/var` against `/private/var`:
  `distribution-workspaces` ×2 (known), `workspace-boundaries/planted …` and
  `work-ui-fleet-origin/01`, whose temp-dir comparisons touch no changed module. They were not run at
  HEAD to confirm.
- **Package suites.** 27 `packages/*/test` suites that name a changed module, 283 cases, 0 red
  (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/pkg-suites.log`); `node --test` over `packages/mesh/test`, `packages/core/test` and
  `packages/work-loop/test`, 61 of 61 (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/node-test.log`); `advertised-paths` and
  `mesh-ui-session-route`, 30 of 30 (`/private/tmp/claude-501/-Users-umairbutt-Source-umair-agent-orchestration-framework/963969ee-815e-4275-9a71-8745db7bd9af/scratchpad/adv.log`). The integration lane's `command-spine`
  feature (`relayConfigured` false for a non-control fixture) was not run.
- **Still owed.** The start through the real daemons is the milestone's outsider check, after
  `install-local` and the operator's restart.

## Verification evidence (aof:continue 191/04 task 03, 2026-11-15)

F-14, ADR-005 §1-§3. Every run by file with an isolated `AOF_GLOBAL_HOME`; nothing binds 4181-4183.
No `@manual`, no `@uat`.

**What landed.** `handOffStart` resolves its `workspaceId` through `resolveWorkspaceId` (pinned
`mesh.workspaceId`, then the project root's derivation), injected by its core binding as
`placement.resolveWorkspaceId` beside `meshNodeIdOf` (no new work-loop to mesh import). The refusal
that remains names pinning `mesh.workspaceId` in the project's `.aof/aof.config.json`, not
`aof mesh identity`. Two more reads of the raw key were on the same request's path and were changed
the same way:

- the fresh `--supervised` launch's spend (`spendStart`, `packages/work-loop/src/commands/loop.mjs`):
  it cleared `config.mesh.workspaceId`'s request, so an unpinned project's request, now written
  under the derived id, was never spent, and the supervisor would start the scope again once the
  loop settled;
- the declarations producer's standalone fallback (`packages/mesh/src/declarations.mjs`, a node with
  no registered member): it read the raw key, so an unpinned standalone workspace had no id and its
  start request was never read. A registered member already carried the store's id, which the
  publish wrote through `resolveWorkspaceId`, so that path needed no change.

The stop and resume requests (`stopLoop`, `handOffLoop`) still write the raw key. Both are keyed
and read by `loopRunId` only, so their `workspaceId` field decides nothing, and they were left alone.

Files: `packages/work-loop/src/stop.mjs`, `packages/work-loop/src/commands/loop.mjs`,
`packages/mesh/src/declarations.mjs`, `packages/core/src/application/bindings/loop/stop.mjs`,
`packages/core/src/application/bindings/commands/loop.mjs`,
`packages/core/src/application/bindings/mesh/declarations.mjs`,
`scripts/workspace-runtime-audit.json` (`loop.mjs` source digest re-stamped; the audited git call is
byte-identical), `test/loop/work-loop-declarations.test.mjs`, `test/loop/loop-command-resume.test.mjs`.

- verifies → task 03, R1 scenarios 1 and 2: `191/04 task03 R1 — an unpinned, published project gets
  a start request under its derived id, and the supervisor is handed its start row` (the real CLI,
  the workspace registered on node-1 through `publishGlobalRegistryDescriptorsToStore`; the request
  names the derived id under `loop-starts/`, and `mesh status --declarations` offers exactly one
  `--supervised` row for 22 at the project root). Beside it, `… a standalone node (no registered
  member) is handed the same start row` covers the producer's fallback.
- verifies → task 03, R1 scenario 3: `191/04 task03 R1 — a pinned id still wins`
  (`a7fc47eec5f91bc0`).
- verifies → task 03, R2: `191/04 task03 R2 — no workspace id resolves at all …`, through
  `work:loop`'s command face with `{ scope: "22", startHandOff: true }` (the CLI always loads a
  rooted workspace, so a rootless one cannot be reached by argv), plus the core's value answer and
  no request written.
- The spend: `191/04 task03 — a fresh supervised launch in a workspace with no pinned id spends the
  start request written under its derived id` (`loop-command-resume`).
- Red probes: with the start hand-off reverted to the raw read, both R1 unpinned cases go red; with
  the producer fallback and the spend reverted, the standalone case and the spend case go red.
  Restored, all green.

Suites (`--fresh`): `work-loop-declarations` 31/31, `loop-command-resume` 31/31,
`loop-command-probe` 20/20, `discord-commands` 45/45, `mesh-status-declarations` 6/6,
`packages/work-loop/test/services.test.mjs` 6/6 (`node --test`). Arch, 12 files 78/78:
`acd-loop-stop-request-single-home`, `acd-session-driver-mesh-blind` (FF-5301, no ceiling moved),
`acd-workspace-identity-single-home`, `acd-loop-family-boundary`, `acd-loop-narrates-in-flight`,
`acd-mesh-ui-no-core-import`, `acd-declarations-ride-the-one-data-command`,
`acd-loop-stop-settles-the-run`, `acd-trigger-is-a-caller-not-a-coordinator`,
`acd-source-directory-budget`, `acd-purity-is-external`, `acd-loop-ask-waits-in-place`. Arch, 7 more
files 74/74: `acd-loop-level-l3-gated`, `acd-loop-ask-reaches-every-face`,
`acd-loop-ask-answered-from-discord`, `acd-fact-projection-split`, `acd-loop-cap-single-home`,
`acd-assignment-resolves-to-a-loop-call`, `acd-launched-session-from-discord`.
`test/bundle/core-workspace.test.mjs`: 8/11. Its stale `loop.mjs` digest was this change's and is
re-stamped. The 3 still red are the ones the 191/08 evidence names: `distribution-workspaces` x2
(`/var` against `/private/var`) and `workspace-boundaries/planted …`. They were not re-run at HEAD.

- **Still owed.** The start through the real daemons for the published, unpinned
  `voice-vox-company-portal`: the outsider re-check, after `install-local` and the operator's restart.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `arch/53 FF-5301 … reach ceilings stay exact` is red on the branch: the worker facade's static closure holds 186 modules and the ceiling says 185. The 186th is `packages/messaging/src/discord-buttons.mjs`, imported by `packages/messaging/src/discord.mjs`. It was added by 191/07's lane commit (`ff2c0719`), after 191/02 moved the ceiling 182 → 185 with its reason. 191/00 added no module to the closure. Recall returned m130/F-16 (the same ceiling raised 24 → 25 by an operator ruling after a deferred import went red; honoured as the precedent for the two repairs) and m188/F-11 (the same control red for 184–186's additions; a different incident, departed). | regression | blocker for 191/07; non-blocker for 191/00 | 191/07 either moves the ceiling 185 → 186 with its reason beside 191/02's, or defers the import. The architect rules which. | `aof:verify 191/07` | discharged 2026-11-14 by `2792403a` (the reach ceiling moved 185 → 186 with its reason: `discord-buttons.mjs` is a zero-import leaf). The suite is green on this Mac. |
| F-02 | `arch/53 FF-5301 … a two-hop laundering module is detected with its complete chain` fails on this Mac with `Cannot read properties of undefined (reading 'length')`. The plant lives under `os.tmpdir()` (`/var/folders/…`), and `createRequire(…).resolve` answers its `/private/var/…` realpath, so the lookup by the unresolved path finds nothing. The case predates 191. Recurrence of m172/F-172-11, same cause and evidence (also m190/F-03 and m178/F-02, whose gate rows name this case). | environment | medium | non-blocker for 191/00. Reds the whole-tree gate on this Mac. | m172/F-172-11 (its owner) | discharged 2026-11-14 by `2792403a` (the self-check resolves its temp dir). The suite is green on this Mac. |
| F-03 | On this laptop a start for the control's own node cannot open a session, although 191/00's contract is green. Two causes, both read at source at 00's review (STATE, 2026-11-12). (a) The control's handler is given the worker's `workerHasRepo` and `meshCheckoutPath`, which answer only for a workspace with a `mesh.repo.published` marker or a managed checkout. A project the channel serves is checked out at its registered descriptor `projectRoot`, which neither reads, so the start refuses `session-repo-unavailable`. 00's fixture seeds the marker. (b) `~/.aof/aof.config.json` here has no `mesh.relay.url`, so ADR-001 §3 builds no local handler, and nothing tells a single-node control to set one. Distinct: recall returned m63/F-63-M, F-63-L and F-63-Q, m131/F-131-18 and m32/F-3203, each a different cause (irrelevant). | spec-gap | blocker for the milestone's outsider check; non-blocker for 191/00, whose locked contract is met | The architect amends ADR-001 §1 and §3: the control resolves a served workspace's checkout from its descriptor `projectRoot`, and a single-node control has a stated way to get a relay URL, with a doctor check that names its absence. The change reaches `session-spawn-handler.mjs`, outside 00's write set, so it lands as its own story or `@bug` task in 191. | milestone 191, before `aof:verify 191/06`; the operator ratifies the amendment | discharged 2026-11-14 by `5ee44d8a` (story 191/08). The operator ratified the ADR-001 §1/§3 amendment that day. Observed at the outsider check: the relay listens on `127.0.0.1:4183`, and a `/session start` from the phone opened in this repo's registered folder (User sign-off below). |
| F-04 | Two edges of the local lane, from 00's review. A local spawn that throws synchronously makes `apply()` answer `false`, and one whose promise rejects answers `true`. Both report the degrade and announce the refusal, and nothing reads the boolean for the spawn lane. A `terminal-resume` frame for the control's own node still goes to `dispatchDirective` and is refused as not-connected, because ADR-001 §2 routes spawn, input and end only. Related to m50/F-50-J (50's control was never a dispatch target; a different defect, departed). The other four recalled findings are irrelevant. | defect | low | non-blocker. The resume lane wants a decision when a control-local session is first resumed from the fleet view. | backlog | open |
| F-05 | ADR-002 §4 does not hold as written. Claude's own hooks label the session `claude-code` (the hook path's default), and the launcher registers it as `claude`. Measured at verify against a real `claude`, in both launches: one session id has two records on disk and two presence entries, `claude` (relaying true, the launcher's) and `claude-code` (relaying false, the hook's). The session index still holds one entry per id, so there is one slot. But the index keeps the latest ping. 15 s after the spawn the entry was the hook's, with `relaying: false`, and it was the launcher's again at 40 s, after its 30 s ping. So after `SessionStart` and after every prompt, the fleet's feed axis reads the launched pane as having no producer for up to 30 s. Session names, `/session list` and `/session end` do not read that flag. The builder measured the same through the hook path alone (STATE, 2026-11-12). In a workspace that does not pin `mesh.workspaceId`, a session worktree's hook also resolves a different workspace id, which is a second slot there. Distinct: recall returned m126/F-42, m126/F-31, m69/F-69-V17, m136/F-136-02 and m63/F-63-J, each a different cause (irrelevant). | spec-gap | medium | non-blocker for 191/01, whose locked scenario (one index record) is green. The repair is one label: a Claude launch registers under the hook's `claude-code`, read from one exported home in `commands/session.mjs`. That amends ADR-002 §4 and task 02's first scenario, and reaches a file outside 01's write set, so it lands as a `@bug` task in 191 once ratified. | milestone 191; the operator ratifies the ADR-002 §4 amendment | discharged 2026-11-14 by `5ee44d8a` (191/01 task 04). The operator ratified the ADR-002 §4 amendment that day. Observed at the outsider check: the daemon labelled the launch `claude-code`, and `/session list` showed the session once (User sign-off below). |
| F-06 | Task 03's first scenario is not signed off. Its Given, the desktop app running this build, is not true: the daemons run a 31 October payload, a restart is the operator's, and F-03 means a start for this node would refuse on this build as well. Its first Then needs someone to look at the Claude app. Three browsers answer this account and none can be chosen without the operator, so the list was not opened. What a stand-in process could measure is in the evidence above. Not observed: the session listed as `<folder>-<first 8 of the id>` with a green dot within 60 seconds, and one tile for it in the fleet grid served by the daemon. Recall: m49/F-49-04-c is a prior occurrence of the same cause (an `@manual` that could not be signed off against the deployed build, blocked on `install-local` and an operator restart, where a sign-off from a substitute was refused), and m63/F-63-B kept a partly observed `@manual` lane open against its story. Both are honoured. m167/F-08 carried an unrun live check as a gap, but every scenario there was `@executable`, so it is departed from. | gap | blocker for 191/01's acceptance until the operator rules | Two ways to close it. Run the scenario once F-03 is discharged and the app is restarted on this build. Or the operator rules that the launch through the daemons and the Claude app listing are carried to the milestone's outsider check, which already needs both. | the operator (asked at `aof:verify 191/01`) | discharged 2026-11-15 at the outsider check: the operator saw the session in the Claude app (step 1), and the fleet held one entry for a launched session (step 9). |
| F-07 | `launchCommandLine` refuses a name that starts with `-`, and `launchSessionName` drops leading dashes from the folder part, because `--remote-control [name]` takes an optional value and `claude` would read such a name as a flag. ADR-002 §2 and §3 state only the character class, so the ADR is narrower than what shipped. Both behaviours are covered by `191/01 task01` cases. Distinct: recall returned m162/F-03, m96/F-96-B, m66/F-21, m129/F-24 and m47/F-47-V-18 (irrelevant; m129/F-24 is an optional flag value in a different parser). | spec-gap | nit | non-blocker. One line each in ADR-002 §2 and §3, written when 191/01 is accepted. | architect, at 191/01's acceptance | discharged 2026-11-14 by the ADR-002 amendment (§2 and §3, F-07), written at the F-05 ruling |
| F-08 | 191/00 task 00's fourth scenario, "a control with no relay hosts nothing locally", contradicts the ADR-001 amendment of 2026-11-14: a nominated control with no `mesh.relay.url` now derives a relay on 4183. Found while building 191/08. Its test now passes `relay: false`. Distinct: no recalled finding concerns this scenario. | spec-gap | low | non-blocker. Amended the scenario to "its relay switched off (as amended)", with a dated comment. | product owner, at `aof:verify 191` | discharged 2026-11-14 |
| F-09 | The amendment made every launcher test that starts a nominated control without `relay: false` start a real broker on the fixed port 4183. Six suites did, and none of them failed. On this laptop they would bind a live port, and under sharding they would collide with each other. The 191/08 build's port guard refused 60 such binds. The six now pass `relay: false`, the isolation option the launcher already had. Recall: m129/F-72 and m96/F-96-D are the same class (a suite binding a port a live daemon holds), in a different test and a different cause. Departed. | defect | medium | non-blocker. Fixed in 191/08's build. | 191/08 | discharged 2026-11-14 |
| F-10 | The control's checkout seam (`createControlCheckoutSeams`) answers "has the repo" when the workspace's registered `project_root` exists on disk. Unlike the worker's seam, it does not read `global_node_workspaces` for this node's membership. This is as ADR-001's amendment §1 specifies, but a workspace registered from another node whose path happens to exist here would open. Distinct: recall returned m34/F-3401, m126/F-28, m126/F-41, m96/F-96-D and m127/F-12, each a different cause (irrelevant). | spec-gap | low | non-blocker. A single-node mesh has no other node. Defer to the backlog, for when a control serves workers' projects. | backlog | open |
| F-11 | `desktop-preflight.mjs`'s new `meshConfigFn` seam defaults to reading the machine-wide `~/.aof/aof.config.json`, as the existing node-id read does. The autostart, run and dispatch desktop suites do not inject it, so under an isolated `AOF_GLOBAL_HOME` they still read the real file. They only read it. Recall: m138/F-06 is the same class (an isolated run reaching the real home), in a different module. Departed. The other four candidates are irrelevant. | defect | low | non-blocker. Defer to the backlog: inject the seam in those suites, or resolve the path through `AOF_GLOBAL_HOME`. | backlog | open |
| F-12 | `mesh-ui-cli-face.test.mjs:192` binds 4181 itself to test whether the port is free. That collides with the live `mesh ui` daemon on any control node. It predates 191, and the 191/08 build's port guard refused it. Recall: m129/F-72 and m96/F-96-D are the same class (a suite binding a live daemon's port, there `:4182`), with a different file and cause. Departed. m70/F-16 is related to the full-suite blocker, and m127/F-25 and m126/F-33 are irrelevant. | defect | low | non-blocker. The whole-tree gate on this laptop is the place it bites. Defer to the backlog. | backlog | open |
| F-13 | At the outsider check, `/loop start` for 194 reached the supervisor, and the loop ran on this build (`loop-diag.194…log`: "started by the supervisor"). It then answered "194 — loop done" within 8 s and built nothing, although 194 is `in-progress` with three unbuilt tasks. `aof work next 194` and `aof work loop 194 --dry-run` answer the same from the CLI. Cause: 194 is a parentless story, and the readiness walk keeps only `isDriver` rows (milestone, uat, spike, chore; `dependencies.mjs:8`), so it offers nothing and the loop reads that as done. Recall: m65/F-65-C is a prior occurrence with the same cause and evidence ("`aof work next` never offers a standalone story"), still open. Honoured, and cited as its prior occurrence. The other four candidates (m79/F-79-B, m78/F-78-I, m81/F-81-F, m72/F-72-AM) are doctor lanes, irrelevant. | defect | medium | non-blocker for 191: the Discord start did what 191 owns, and the cause predates it. The operator-facing harm is a `/loop start` that reports done over unbuilt work. | m65/F-65-C's owner (backlog) | open |
| F-14 | At the outsider check, `/loop start` for voice-vox-company-portal's `22` was refused `loop-start-no-workspace`, although the operator had just run `aof mesh repo publish` there (workspace `a7fc47eec5f91bc0`, registered with the node). `handOffStart` (`stop.mjs:255`, 191/04's lane commit `0f77ff52`) reads the raw `config.mesh.workspaceId` key. Every other mesh reader asks `resolveWorkspaceId` (`workspace-identity.mjs`, TECH_DEBT item 4's one precedence), which answers the path-derived id, here the published id. The refusal then says to run `aof mesh identity`, which publishes the node record and never writes `mesh.workspaceId`; no verb does. The operator was sent to a command that cannot help. Worked around for the check by pinning `mesh.workspaceId: "a7fc47eec5f91bc0"` in the portal's config, the same id. Distinct: recall returned m191/F-03, m63/F-63-Q, m175/F-10, m175/F-14 and m164/F-06, each a different cause (irrelevant). | defect | medium | blocker for 191/04's acceptance (operator's standing ruling, 2026-11-14: fix what blocks sign-off). A `@bug` task in 191/04: the start resolves the id through `resolveWorkspaceId`, and a refusal that remains names what does fix it. The developer confirms the declarations producer keys a start request by the same resolved id. | 191/04 (`@bug @finding-F-14`) | discharged 2026-11-15 by `43bf9e88` (191/04 task 03): the start, the spend and the supervisor's standalone fallback ask `resolveWorkspaceId`. Its suites are green, and task 03 runs the real CLI against a workspace registered the way `aof mesh repo publish` registers it. A live start through the daemons, after the operator's restart, confirms it but does not gate. The developer flagged that the preflight's `workspace-identity-pinned` check still fails an unpinned workspace. That stays as it is: a pin is still what keeps the id stable across machines (TECH_DEBT item 4), and F-14 only stops a single machine from depending on it. |
| F-15 | At the outsider check, 30 s after `/loop start` launched `aof work loop 22 --supervised` (pid 41844, 14:38:52Z), the supervisor launched a second `aof work loop 22 --level L2 --resume` (pid 42699, 14:39:22Z) while the first was live. Its first run record had been minted at 14:38:53Z and had heartbeated at 14:39:21Z. The duplicate exited 1 on "a non-terminal run already exists for this item" (`loop-diag.22.2026-11-15T14-39-22-774Z.log`), so nothing ran twice. The run-mint guard held, but the supervisor's liveness read did not. Recall: m129/F-61 is a prior occurrence of the same cause and evidence (the desktop supervisor relaunched loop 127 32 s after it started), still open. Honoured, and cited as its prior occurrence. m130/F-02 (a foreground `--supervised` row, fixed by `874eef6`) is a different path. Departed. m131/F-131-19, m191/F-13 and m162/F-05 are irrelevant. | defect | low | non-blocker for 191: the start and the resume both did what 191 owns, and the cause predates it. | m129/F-61's owner (backlog) | open |
| F-16 | `wiki/architecture/discord-notifications.md` said the project list offers the projects whose channel `allow` list holds the user. It never said a project must first be registered with the machine's mesh. At the outsider check, property-intelligence-platform and voice-vox-company-portal were missing until the operator ran `aof mesh repo publish` in each. No `@manual` scenario reads for it. Distinct: the recalls at F-14 and F-15 returned no docs finding. | docs | low | non-blocker. One sentence added under "Several projects in one channel": a missing project is published with `aof mesh repo publish`, and is offered from the next command with no restart. | product owner, at `aof:verify 191` | discharged 2026-11-15 |

## Accept decision (aof:verify 191/00, 2026-11-12)

`aof work validate 191/00` passes. `aof work doctor 191/00` exits 0 with advisory warnings only
(`numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked`) and no `control-unresolved` at
either severity. FF-19101 resolves, is green, and has its red probe.

- **191/00: accepted** (`in-review` → `done`). All ten scenarios, the four Examples rows and the
  budget row are green, and no blocker routes to it.
- **Open, and not 191/00's to close:** F-01 blocks 191/07. F-03 blocks the milestone: until it is
  discharged, `/session start` refuses on this single-node laptop, so the outsider check cannot
  pass. F-02 and F-04 are non-blockers.
- **Still owed at the milestone:** the regression gate (`aof work regression-gate 191`).

## Accept decision (aof:verify 191/01, 2026-11-12)

`aof work validate 191/01` passes. `aof work doctor 191/01` exits 0 with advisory warnings only
(`numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked`) and no `control-unresolved` at
either severity. FF-19102 resolves, is green, and has its red probe.

- **191/01: not accepted yet. It stays `in-review`.** Tasks 00 to 02 are green (15 scenarios and
  rows), and task 03's two measurements are recorded: the link is in the bytes at 200 columns, and a
  session worktree of a trusted project does not stop at the trust dialog. Task 03's first scenario
  is unsigned (F-06). This is not developer rework, so the story was not handed back to
  `in-progress`. The operator was asked whether the scenario is carried to the milestone's outsider
  check or the story waits for a launch through the daemons.
- **Open and routed:** F-05 (the ADR-002 §4 amendment, for the operator to ratify) and F-07 (two ADR
  lines, written at acceptance). F-01 to F-04 are unchanged.
- **Still owed at the milestone:** the regression gate (`aof work regression-gate 191`).

## User sign-off (the outsider check, 2026-11-14)

Run by the operator from the phone, in the private channel `discord-2`, against payload
`5ee44d8a+dirty.20261114T174049` (`daemon-started` at 18:05:29Z). Before the run:
`lsof -nP -iTCP:4183 -sTCP:LISTEN` names the serve daemon on `127.0.0.1:4183`, and the
preflight's `control-relay-loopback` reads `ok … derived: no mesh.relay.url is set`.

| step | procedure | result | evidence |
|---|---|---|---|
| 1 | `/session start` for `agent-orchestration-framework`; tap the link | pass (operator): the reply had a link, and the session opened in the Claude app | `mesh-serve.log` 19:03:30Z: `session-spawn-local`, then `/bin/zsh opened in …/agent-orchestration-framework … assistant label "claude-code", launched as claude-remote-control` |
| 2 | `/session list` | pass (operator): the session was listed once | the operator's observation |
| 3 | `/session end` on that session | pass (operator) | `mesh-serve.log` 19:04:29Z: `ended on request`, `session-end-local`, then the record was removed and the end marker sent |
| 4 | `/loop start` for 194 | the start reached the supervisor, but the loop built nothing (F-13) | `loop-diag.194.2026-11-14T19-06-31-379Z.log` |
| 5 | `/loop resume` for property-intelligence-platform's `08`, halted on `cap-exhausted` and launched from a terminal without `--supervised` | pass, refusal path (operator): refused `loop-hand-off-not-supervised`, as 131/ADR-009 §6 rules, naming the terminal resume. The bot placed the project and read its loop declaration | `stop.mjs` `handOffLoop`; `loop-diag.08.2026-11-14T15-05-54-934Z.log` (argv `work loop 08 --resume`, no `--supervised`) |
| 6 | `/loop start` for voice-vox-company-portal's `22` (first refused `loop-start-no-workspace`, F-14; started once `mesh.workspaceId` was pinned) | pass (operator) | `loop-diag.22.2026-11-15T14-38-52-588Z.log`: argv `work loop 22 --supervised`, "Cleared the start request for 22 — started by the supervisor", then "Driving 22 — refine, cycle 1 of 3". pid 41844 is a child of AOF Desktop (37511) |
| 7 | `/loop stop` for `22` while 22/03's refine session was in flight | pass (operator): a level-1 drain, honoured when the session ended | `loop-stops/1841c615-….json`: requested 15:11:41Z by the serve daemon (pid 37653), honoured 15:14:21Z. The loop logged "22 — halted on operator-interrupt at 22/03 (producer stop-request)" and exited 0 |
| 8 | Resume button on the stop notice for `22` | pass (operator): the button's request reached the supervisor, which relaunched the loop | `loop-diag.22.2026-11-15T15-15-22-823Z.log`: argv `work loop 22 --level L2 --resume`, "Cleared stop request for 1841c615-… (honoured, level 1) — resumed", "Cleared the resume request … — relaunched by the supervisor", then "Driving 22/04 — refine". pid 80474 is a child of AOF Desktop (37511) |
| 9 | `/session start` for this repo, left running; the fleet read twice, 40 s apart | pass: one session record on disk (`…~claude-code~83c8a218-….json`, no `claude` twin). `GET :4181/api/mesh/status` lists it once in `sessions` and once in the node's `presence.sessions`, as `claude-code` with `relaying: true` both times, including after its 15:20:29Z ping | `mesh-serve.log` 15:19:29Z: `session-spawn-local`, opened in this repo's folder. `verifies →` F-06, F-05 |

After step 4 (2026-11-15) the channel moved to the global config, with 194 (`cfed0a69`) built.
`aof messaging disable discord` removed this project's `work.notify`, then `aof messaging enable
discord --channel 1571198918107078736 --allow 1119197349521137757 --global`. `aof messaging status`
reads "from the global config", and `aof messaging test discord` posted message
`1571445722400952341`. The remaining steps run on payload `cfed0a69+dirty.20261115T084426`.

`verifies →` F-03, F-05, 191/00 and 191/08 through the real daemons, and 191/04–07's loop start, stop,
resume hand-off and Resume button through the supervisor.

**Sign-off: accepted by the operator, 2026-11-15 ("UAT is complete").** Two things were not
observed, and the operator accepted them on the evidence above:
- `/loop resume` accepted from the command. Its refusal path passed (step 5), and the button's
  accepted resume (step 8) writes the same hand-off request through the same `handOffLoop`.
- The choice buttons on a question notice. No loop asked a question during the check, and the
  choice press is covered by 191/07's `@executable` scenarios.

## Verification evidence (aof:verify 191/01–08, 2026-11-15)

- **The stories' own scenarios and 191's fitness functions, as one run.** `AOF_GLOBAL_HOME=$(mktemp -d)
  aof test --scope file --fresh --json` over the 19 test files that stories 01–08 declare, plus every
  `FF-191xx` enforcing file. Verdict `passed`, 467 cases, at `43bf9e88` with only the UAT config and
  this record dirty. No port 4181–4183 is bound, and the full suite is not run here; that is the
  regression gate's job. `verifies →` 191/01–08's `@executable` tasks, FF-19101–FF-19110.
- **Red probes, FF-19103 to FF-19107.** Recorded per row under ## Fitness functions: each control
  failed on a change to the shipped source, and went green again after the revert.
  `git diff --stat -- packages/ test/` was empty afterwards.
- **`@manual` 05/02, 06/05, 07/04: the guide.** I read `wiki/architecture/discord-notifications.md`.
  - 05/02: the command table names `project` on every command that takes a project, and no option
    called `workspace`. "Several projects in one channel" says to pick the project from the list,
    and that the list offers only the projects whose `allow` list holds you.
  - 06/05: the table lists `/session start`, `/session list`, `/session end` and `/loop start`, each
    with its options and who sees the reply. `/session start` replies only to you, with the link or
    the name. "What a start needs" says Claude with Remote Control, the machine's own `claude`, never
    a shell, and no idle limit.
  - 07/04: "Buttons on the notifications" names `Resume` and `Open a session here` on a halt, and the
    per-choice buttons on a question. It says the `allow` list gates whether buttons appear and who
    can tap. It also lists the reply-only cases: more than five choices, and free text.

  Pass. `verifies →` 05/02, 06/05, 07/04.
- **`@manual` 01/03, a real launch.** Carried to the outsider check (F-06) and observed there:
  User sign-off, steps 1 and 9. Pass.

## Accept decision (aof:verify 191/01–08, 2026-11-15)

`aof work validate 191` passes. `aof work doctor 191` reports no `control-unresolved` at either
severity, only advisory warnings (`mtime-ahead-of-updated`, `rubric-join-unchecked`,
`control-runner-unchecked`, `depends-edge-unwitnessed`, `numbering-gap`). FF-19101–FF-19110 resolve,
are green, and each has a recorded red probe. The operator signed off the outsider check on
2026-11-15 (User sign-off).

- **Accepted** (`in-review` → `done`): 191/01, 02, 03, 04, 05, 06, 07 and 08. Every `@executable`
  scenario is green in the one run above, every `@manual` has its evidence, and no blocker finding is
  open. F-14, the last blocker, was discharged by `43bf9e88`.
- **Retrospectives:** 01 (F-05, F-06), 04 (F-14) and 08 (F-03, F-09) carry lessons. 02, 03, 05, 06
  and 07 surfaced nothing worth a lesson, so they write no doc. F-01 on 07 was a ceiling moved with
  its reason, and F-16 on 05 was one sentence in the guide.
- **Open, non-blocking, routed:** F-04, F-10, F-11 and F-12 to the backlog. F-13 to m65/F-65-C's owner,
  and F-15 to m129/F-61's owner.
- **Still owed at the milestone:** the regression gate (`aof work regression-gate 191`).

## Milestone accept decision (aof:verify 191, 2026-11-15)

- **Regression gate:** green at `e4ad00fe`, scope all, sharded, 15.4 min, on a runner through
  `gate.yml` (run 43738846534). `REGRESSION.md` holds three rows:
  - `e10c8f5f`, red, run on the MacBook. Its failures are this machine's: they all passed on the
    runner.
  - `49fc1e41`, red on the runner for one case. F-14's fix had taken the loop shell past its
    2250-line bound, and `e4ad00fe` brought it back.
  - `e4ad00fe`, green.
- **Stories:** 00–08 are done, and every box in SPEC is ticked.
- **Findings:** no blocker is open. Open and routed:
  - F-04, F-10, F-11 and F-12 to the backlog.
  - F-13 to m65/F-65-C's owner.
  - F-15 to m129/F-61's owner.

  These are also the gaps in OUTCOME.
- **Records:** `OUTCOME.md` and `RETROSPECTIVE.md` (R1–R4) are written, STATE is compacted, and
  the lessons are ingested into memory.
- **191: accepted.**
