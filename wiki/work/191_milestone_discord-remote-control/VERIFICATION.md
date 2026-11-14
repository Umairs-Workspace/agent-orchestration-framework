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
| FF-19103 | `test/arch/session/acd-launched-session-from-discord.test.mjs` | pending (191/02) | not yet run |
| FF-19104 | `test/arch/mesh/acd-wire-kind-has-both-ends.test.mjs` | pending (191/03) | not yet run |
| FF-19105 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | pending (191/04) | not yet run |
| FF-19106 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | pending (191/06) | not yet run |
| FF-19107 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | pending (191/07) | not yet run |
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

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `arch/53 FF-5301 … reach ceilings stay exact` is red on the branch: the worker facade's static closure holds 186 modules and the ceiling says 185. The 186th is `packages/messaging/src/discord-buttons.mjs`, imported by `packages/messaging/src/discord.mjs`. It was added by 191/07's lane commit (`ff2c0719`), after 191/02 moved the ceiling 182 → 185 with its reason. 191/00 added no module to the closure. Recall returned m130/F-16 (the same ceiling raised 24 → 25 by an operator ruling after a deferred import went red; honoured as the precedent for the two repairs) and m188/F-11 (the same control red for 184–186's additions; a different incident, departed). | regression | blocker for 191/07; non-blocker for 191/00 | 191/07 either moves the ceiling 185 → 186 with its reason beside 191/02's, or defers the import. The architect rules which. | `aof:verify 191/07` | discharged 2026-11-14 by `2792403a` (the reach ceiling moved 185 → 186 with its reason: `discord-buttons.mjs` is a zero-import leaf). The suite is green on this Mac. |
| F-02 | `arch/53 FF-5301 … a two-hop laundering module is detected with its complete chain` fails on this Mac with `Cannot read properties of undefined (reading 'length')`. The plant lives under `os.tmpdir()` (`/var/folders/…`), and `createRequire(…).resolve` answers its `/private/var/…` realpath, so the lookup by the unresolved path finds nothing. The case predates 191. Recurrence of m172/F-172-11, same cause and evidence (also m190/F-03 and m178/F-02, whose gate rows name this case). | environment | medium | non-blocker for 191/00. Reds the whole-tree gate on this Mac. | m172/F-172-11 (its owner) | discharged 2026-11-14 by `2792403a` (the self-check resolves its temp dir). The suite is green on this Mac. |
| F-03 | On this laptop a start for the control's own node cannot open a session, although 191/00's contract is green. Two causes, both read at source at 00's review (STATE, 2026-11-12). (a) The control's handler is given the worker's `workerHasRepo` and `meshCheckoutPath`, which answer only for a workspace with a `mesh.repo.published` marker or a managed checkout. A project the channel serves is checked out at its registered descriptor `projectRoot`, which neither reads, so the start refuses `session-repo-unavailable`. 00's fixture seeds the marker. (b) `~/.aof/aof.config.json` here has no `mesh.relay.url`, so ADR-001 §3 builds no local handler, and nothing tells a single-node control to set one. Distinct: recall returned m63/F-63-M, F-63-L and F-63-Q, m131/F-131-18 and m32/F-3203, each a different cause (irrelevant). | spec-gap | blocker for the milestone's outsider check; non-blocker for 191/00, whose locked contract is met | The architect amends ADR-001 §1 and §3: the control resolves a served workspace's checkout from its descriptor `projectRoot`, and a single-node control has a stated way to get a relay URL, with a doctor check that names its absence. The change reaches `session-spawn-handler.mjs`, outside 00's write set, so it lands as its own story or `@bug` task in 191. | milestone 191, before `aof:verify 191/06`; the operator ratifies the amendment | open. The operator ratified the ADR-001 §1/§3 amendment on 2026-11-14. It lands as story 191/08. The relay was measured at source on 2026-11-14: it binds `127.0.0.1:<port>` (`relay.mjs:626`), and the stream server takes the same port from the same URL (`launcher.mjs:830`). With `mesh.address: 127.0.0.1` the two collide, so the amendment must decide the port, not only the key. |
| F-04 | Two edges of the local lane, from 00's review. A local spawn that throws synchronously makes `apply()` answer `false`, and one whose promise rejects answers `true`. Both report the degrade and announce the refusal, and nothing reads the boolean for the spawn lane. A `terminal-resume` frame for the control's own node still goes to `dispatchDirective` and is refused as not-connected, because ADR-001 §2 routes spawn, input and end only. Related to m50/F-50-J (50's control was never a dispatch target; a different defect, departed). The other four recalled findings are irrelevant. | defect | low | non-blocker. The resume lane wants a decision when a control-local session is first resumed from the fleet view. | backlog | open |
| F-05 | ADR-002 §4 does not hold as written. Claude's own hooks label the session `claude-code` (the hook path's default), and the launcher registers it as `claude`. Measured at verify against a real `claude`, in both launches: one session id has two records on disk and two presence entries, `claude` (relaying true, the launcher's) and `claude-code` (relaying false, the hook's). The session index still holds one entry per id, so there is one slot. But the index keeps the latest ping. 15 s after the spawn the entry was the hook's, with `relaying: false`, and it was the launcher's again at 40 s, after its 30 s ping. So after `SessionStart` and after every prompt, the fleet's feed axis reads the launched pane as having no producer for up to 30 s. Session names, `/session list` and `/session end` do not read that flag. The builder measured the same through the hook path alone (STATE, 2026-11-12). In a workspace that does not pin `mesh.workspaceId`, a session worktree's hook also resolves a different workspace id, which is a second slot there. Distinct: recall returned m126/F-42, m126/F-31, m69/F-69-V17, m136/F-136-02 and m63/F-63-J, each a different cause (irrelevant). | spec-gap | medium | non-blocker for 191/01, whose locked scenario (one index record) is green. The repair is one label: a Claude launch registers under the hook's `claude-code`, read from one exported home in `commands/session.mjs`. That amends ADR-002 §4 and task 02's first scenario, and reaches a file outside 01's write set, so it lands as a `@bug` task in 191 once ratified. | milestone 191; the operator ratifies the ADR-002 §4 amendment | open. The operator ratified the ADR-002 §4 amendment on 2026-11-14. It lands as a `@bug` task in 191/01. |
| F-06 | Task 03's first scenario is not signed off. Its Given, the desktop app running this build, is not true: the daemons run a 31 October payload, a restart is the operator's, and F-03 means a start for this node would refuse on this build as well. Its first Then needs someone to look at the Claude app. Three browsers answer this account and none can be chosen without the operator, so the list was not opened. What a stand-in process could measure is in the evidence above. Not observed: the session listed as `<folder>-<first 8 of the id>` with a green dot within 60 seconds, and one tile for it in the fleet grid served by the daemon. Recall: m49/F-49-04-c is a prior occurrence of the same cause (an `@manual` that could not be signed off against the deployed build, blocked on `install-local` and an operator restart, where a sign-off from a substitute was refused), and m63/F-63-B kept a partly observed `@manual` lane open against its story. Both are honoured. m167/F-08 carried an unrun live check as a gap, but every scenario there was `@executable`, so it is departed from. | gap | blocker for 191/01's acceptance until the operator rules | Two ways to close it. Run the scenario once F-03 is discharged and the app is restarted on this build. Or the operator rules that the launch through the daemons and the Claude app listing are carried to the milestone's outsider check, which already needs both. | the operator (asked at `aof:verify 191/01`) | ruled 2026-11-14 by the operator: carried to the milestone's outsider check, which observes the Claude app listing and the fleet tile from the phone. |
| F-07 | `launchCommandLine` refuses a name that starts with `-`, and `launchSessionName` drops leading dashes from the folder part, because `--remote-control [name]` takes an optional value and `claude` would read such a name as a flag. ADR-002 §2 and §3 state only the character class, so the ADR is narrower than what shipped. Both behaviours are covered by `191/01 task01` cases. Distinct: recall returned m162/F-03, m96/F-96-B, m66/F-21, m129/F-24 and m47/F-47-V-18 (irrelevant; m129/F-24 is an optional flag value in a different parser). | spec-gap | nit | non-blocker. One line each in ADR-002 §2 and §3, written when 191/01 is accepted. | architect, at 191/01's acceptance | open |
| F-08 | 191/00 task 00's fourth scenario, "a control with no relay hosts nothing locally", contradicts the ADR-001 amendment of 2026-11-14: a nominated control with no `mesh.relay.url` now derives a relay on 4183. Found while building 191/08. Its test now passes `relay: false`. Distinct: no recalled finding concerns this scenario. | spec-gap | low | non-blocker. Amended the scenario to "its relay switched off (as amended)", with a dated comment. | product owner, at `aof:verify 191` | discharged 2026-11-14 |
| F-09 | The amendment made every launcher test that starts a nominated control without `relay: false` start a real broker on the fixed port 4183. Six suites did, and none of them failed. On this laptop they would bind a live port, and under sharding they would collide with each other. The 191/08 build's port guard refused 60 such binds. The six now pass `relay: false`, the isolation option the launcher already had. Recall: m129/F-72 and m96/F-96-D are the same class (a suite binding a port a live daemon holds), in a different test and a different cause. Departed. | defect | medium | non-blocker. Fixed in 191/08's build. | 191/08 | discharged 2026-11-14 |
| F-10 | The control's checkout seam (`createControlCheckoutSeams`) answers "has the repo" when the workspace's registered `project_root` exists on disk. Unlike the worker's seam, it does not read `global_node_workspaces` for this node's membership. This is as ADR-001's amendment §1 specifies, but a workspace registered from another node whose path happens to exist here would open. Distinct: recall returned m34/F-3401, m126/F-28, m126/F-41, m96/F-96-D and m127/F-12, each a different cause (irrelevant). | spec-gap | low | non-blocker. A single-node mesh has no other node. Defer to the backlog, for when a control serves workers' projects. | backlog | open |
| F-11 | `desktop-preflight.mjs`'s new `meshConfigFn` seam defaults to reading the machine-wide `~/.aof/aof.config.json`, as the existing node-id read does. The autostart, run and dispatch desktop suites do not inject it, so under an isolated `AOF_GLOBAL_HOME` they still read the real file. They only read it. Recall: m138/F-06 is the same class (an isolated run reaching the real home), in a different module. Departed. The other four candidates are irrelevant. | defect | low | non-blocker. Defer to the backlog: inject the seam in those suites, or resolve the path through `AOF_GLOBAL_HOME`. | backlog | open |
| F-12 | `mesh-ui-cli-face.test.mjs:192` binds 4181 itself to test whether the port is free. That collides with the live `mesh ui` daemon on any control node. It predates 191, and the 191/08 build's port guard refused it. Recall: m129/F-72 and m96/F-96-D are the same class (a suite binding a live daemon's port, there `:4182`), with a different file and cause. Departed. m70/F-16 is related to the full-suite blocker, and m127/F-25 and m126/F-33 are irrelevant. | defect | low | non-blocker. The whole-tree gate on this laptop is the place it bites. Defer to the backlog. | backlog | open |

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
