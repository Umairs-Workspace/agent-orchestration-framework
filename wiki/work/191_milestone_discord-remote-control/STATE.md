---
doc: state
---
# 191 · Discord drives the work from a phone — State

## Progress

- Captured in the backlog 2026-11-10.
- 2026-11-11 — Promoted to 191 (appended). Refined (`aof:refine 191 --autonomous`, solo, run
  20261111T013212793Z-0000, no session id: the live store did not answer): RESEARCH Q1–Q4,
  ARCHITECTURE ADR-001–008, FF-19101–19107 declared `pending`, eight stories with example maps.
  Contracts and build briefs authored for every story once the two business questions below were
  answered.

## Notes & decisions

- 2026-11-10 — Framed from the operator's conversation about using AOF while away from the desk.
  These options were weighed and rejected:
  - A native mobile app. It would show the same data as the web UI, and adds a second client to
    keep in sync, app-store signing and a new authentication surface.
  - Hermes. It is a second agent with its own memory and its own picture of the projects, and it
    would drive `aof` through the shell, outside the loop's gates.
  - Relying on Remote Control alone. A session has to be opened before leaving, so it cannot cover
    an unplanned debug or a quick fix.
  The command shape the operator agreed: `/session start project:<p>`, with Claude and Remote
  Control on by default, not as flags.

## Verification
- 2026-11-11 — Default decisions taken at refine (technical, documented):
  - **The control node hosts its own launched sessions** (ADR-001). This reverses 50's stated
    assumption, because every project a channel serves is checked out on the control, and on this
    laptop's single-node mesh no other node exists.
  - **A Discord session is `exec claude --remote-control <name> --session-id <id>`, typed by the
    node from a closed `launch` value** (ADR-002). No free text crosses the wire. The session ends
    when Claude ends. Passing the minted id closes 50/ADR-007's two-records consequence.
  - **The session name is `<project folder>-<first 8 of the id>`**, with no item, because the record
    carries none (ADR-002 §3).
  - **A Claude launch opens 200 columns wide** until 191/01 task 03 measures the link's bytes
    (ADR-002 §6, RESEARCH Q1).
  - **The link is read off the loopback relay for 45 s from Discord.** No link is not a failure:
    the reply carries the name and where to find it (ADR-003).
  - **`/loop start` writes a start request**, refused toward `/loop resume` for a halted supervised
    scope (ADR-005).
  - **The option is `project` everywhere**, autocompleted, with `workspace` removed (ADR-006).
  - **Buttons appear for 2–5 choices of at most 80 characters.** A choice answers with one tap
    (ADR-007).
- 2026-11-11 — Not diagrammed: ADR-001 and ADR-003 are short flows the text states step by step,
  and the other ADRs have no moving parts. No `aof diagram plan` was run.
- 2026-11-11 — Left to measure at build, never guessed: whether the Remote Control link appears in a
  launched PTY's bytes at the launch width, and whether a session worktree of a trusted project
  stops at the trust dialog (RESEARCH Q1, Q2; 191/01 task 03).
- 2026-11-12 — Answered at refine (operator): **191/03 Q1, no idle limit.** A session started from
  Discord runs until `/session end`, its own `claude` exiting, Quit or a restart (ADR-004 §5).
  **191/06 Q1, the `/session start` reply is ephemeral.** Only the person who ran it sees the link
  (ADR-006 §4). The contracts for 03 and 06 were authored in the same stop.
- 2026-11-12 — Two runs for this refine. The first, 20261111T013212793Z-0000, minted with no session
  id because the live store did not answer, so the doctor could not anchor the two answers to it.
  It was completed, and 20261112T103644390Z-0001 was minted with `--session` naming this session.
  The doctor then anchored 191/03 Q1 and 191/06 Q1 to their recorded answers.

## Feedback (for retro)

- 2026-11-12 — 191/05 (continue, solo). Found while reviewing the build:
  - **Recorded finding: ADR-006 §2 and the 05 contract disagree slightly.** The ADR says the offer
    is "filtered by the typed prefix". The locked contract and PLAN also rank containment matches
    after prefix matches (`aof` before `taof`), and the build follows the contract. The ADR text is
    narrower than what shipped and wants a one-line amendment at `aof:verify`.
  - **The declared `reads:` set was incomplete.** E1 asserts the stop request's `workspaceId`,
    which `packages/work-loop/src/stop.mjs` writes from `config.mesh.workspaceId`, and the choices'
    `value` comes from `packages/mesh/src/workspace-identity.mjs` (`resolveWorkspaceId`). Both were
    read and neither is declared.
  - **`aof test --scope impacted --story 191/05` widened to all 1,273 suites (`no-graph`).** This
    checkout has no code graph, and building one needs `aof project provision graphify`, a tool
    install this lane did not make. A full-suite run is ruled out on this machine (it binds
    `:4182`), so the evidence is the six suites that import the module, run by file and green:
    `test/discord/discord-commands.test.mjs`, `test/discord/discord-bot.test.mjs`,
    `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs`,
    `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`,
    `test/arch/testing/acd-source-directory-budget.test.mjs` and the node:test
    `packages/messaging/test/services.test.mjs`. The milestone regression gate is still owed.
  - **@manual 02 (the guide) was checked by reading it.** The command table names `project` on all
    four rows and never `workspace`. The "Several projects in one channel" paragraph says to pick
    from the list, and that the list offers only projects whose channel `allow` list holds the
    user. That paragraph also now states 131/14's rule, that `/loop` takes the one project with a
    loop on the scope. The old text predated it.
  - **By hand, still owed:** after a daemon restart, typing `/loop stop project:` in the channel
    should offer the projects (PLAN Verification). Not run: this lane does not restart daemons.
- 2026-11-12 — 191/00 built (solo, run 20261112T112500688Z-0000, attempt 1, so there is no prior
  attempt to recall). The near-miss recall returned an empty block. The launcher grew two
  options-gated test seams beside its existing `startTerminalIngress` one:
  `createTerminalRelayPushTransport` and `startTerminalInputSubscriber`. With them, the task-00
  suite starts a real control launcher without binding a broker. Red probes: with the control
  handler disabled, 4 of the 5 task-00 scenarios fail (the fifth is the unchanged no-relay path).
  FF-19101 trips on the pre-191 launcher, and on every hand-written plant.
- 2026-11-12 — **191/00 review (solo), Important, routed as an amendment to ADR-001 §1/§3, for the
  operator and architect to ratify. No item was created.** ADR-001 §1 hands the control's handler
  the worker's own `workerHasRepo` and `meshCheckoutPath`. Read at source
  (`packages/mesh/src/worker-repo-admission.mjs` `workerHasRepo`, `session-spawn-handler.mjs`'s
  foreign-workspace branch), those answer "available" only for a workspace with a local
  `mesh.repo.published` marker or a managed checkout under `checkouts/<id>`. They then open a
  foreign workspace's shell at `meshCheckoutPath(id)`. On the control, a project the channel serves
  is checked out at its registered descriptor `projectRoot`. That is the same fact the fleet route's
  `workspace-not-local` probe reads (RESEARCH Q4), and neither seam reads it. So a start for any
  such project refuses with `session-repo-unavailable`, a stated refusal rather than a session.
  The only exception is the daemon's own launch workspace with a published marker, and the
  supervisor launches the daemon cwd-less. Measured read-only on this laptop: the global
  `~/.aof/aof.config.json` has no `mesh.repo` and no `mesh.relay.url`. With no relay URL, §3 builds
  no local handler at all, so a start refuses exactly as before. 191/00's locked contract is met:
  its fixture seeds the marker and the membership row the worker's guard reads. But the
  milestone's outsider check on this laptop needs, before 191/06 is accepted, (a) the control to
  resolve a served workspace's checkout from its descriptor `projectRoot`, which also needs
  `session-spawn-handler.mjs`, outside 00's write set, and (b) an adoption path for `mesh.relay.url`
  on a single-node control.
- 2026-11-12 — 191/04 build (solo). **Declared read/write set incomplete.** `files:` omitted five
  modules the build had to touch: the four core adapters that hand the new exports across
  (`packages/core/src/application/bindings/{loop/stop-request,loop/stop,commands/loop,mesh/declarations}.mjs`)
  and `packages/work-loop/src/engine.mjs`, where the compute-budget gate lives. The PLAN's "add start
  rows before the gate" can only be honoured inside `decideSupervisedDeclarations`, so the start
  requests enter it as an additive `startRequested` list and come back as `starts`, beside `rows`
  (whose six keys are a declaration's, and stay so).
- 2026-11-12 — 191/04: **the clear sits at the walk's head, the resume clear's own point** (ADR-005 §4
  reads "once its declaration is written, at the same point where `--resume` clears"). Those two
  phrases disagree for a fresh loop, whose declaration is first persisted at its first drive. The
  build took the stated point: clearing later would leave a window, from spawn to first drive, in
  which the request stands and no run is live, so a poll could start the scope twice.
- 2026-11-12 — 191/04: **a start the loop refuses at its door is spent too.** An L3 start whose
  computed gate fails throws in `resolveInvocation`, before the walk, and would leave its request
  standing, so the supervisor would respawn the refusal every poll. The launch now clears the request
  on a door refusal and narrates why. Not in the contract; covered by its own case in
  `loop-command-resume.test.mjs`.
- 2026-11-12 — 191/04: **two refusal codes beyond ADR-005 §2's three**, both before any write:
  `loop-start-level` (a level the loop would refuse) and `loop-start-no-workspace` (no
  `mesh.workspaceId` to name the request by). "The compute budget allows no further loop" is
  exercised as a ceiling that admits no launch: a fresh start has spent nothing, so elapsed is 0 and
  only an unresolved ceiling bars it.
- 2026-11-12 — 191/04 (recorded finding): a scope whose halted supervised declaration last ran on
  ANOTHER node is not refused `loop-start-resumable` (the hand-off would refuse it `not-local`, so
  per §2 nothing would relaunch it here), so a fresh start on this node is allowed. Whether that
  should be refused toward the other node is open for 06's `/loop start`.
- 2026-11-12 — 191/04: **`loop.mjs` grew 2223 → 2250**, and the bound in `loop-command-wave.test.mjs`
  ("the shell is measured smaller") was raised with its reason. Most of the first pass (+65) was
  extracted at build: the companion-flag refusals moved into `handOffStart` (`stop.mjs`), and the
  clear's guard moved into `spendStartRequest` (`stop-request.mjs`). What stays is the flag's three
  homes, the dispatch, the render line, the face and the two clear sites. The shell split is
  TECH_DEBT item 92. Three schema pins counted `work:loop`'s properties and flags and moved with it
  (`loop-command-probe`, `acd-loop-narrates-in-flight`, `acd-loop-level-l3-gated`).
- 2026-11-12 — 191/04 (recorded finding, pre-existing): `lane-is-local-slot.test.mjs` "69/04 task 02"
  fails the same way on an untouched HEAD checkout of this worktree: the dispatch child dies on
  `process.cwd` ENOENT and the case times out on `.first-lane-opened`. It is not this story's.
  `autonomous-shell-out-prompt` failed once under the sharded load and passed alone on a deliberate
  `--fresh` repeat run to chase that flake.
- 2026-11-12 — 191/04 review close (solo: structural, behavioural and craft lenses inline; no UI):
  no Blockers. Routed:
  - **fixed:** `loop-start-no-workspace` was mapped to 400; it is a state conflict, so now 409.
  - **story (operator):** a fresh start on a scope whose halted supervised loop last ran on another
    node is allowed today. Should it be refused toward that node? That needs a criterion, which
    belongs to 06's `/loop start`.
  - **recorded:** the declared `files:` set was incomplete (five modules, above); the FF-19105 row in
    ARCHITECTURE.md still reads `pending`, for verify to flip; and the by-hand check in the PLAN
    (`--hand-off-start`, then `mesh status --declarations` lists the row, then the desktop app
    starts it) is left to `aof:verify`. It writes to the real `~/.aof` and starts a real loop.
- 2026-11-12 — **191/00 continue, cycle 2 (solo, run 20261112T124150064Z-0001).** The first run
  closed `done`, but the story stayed `in-progress` with its task boxes unticked, so the loop sent it
  back. The lane's merge home also left this section headed twice; the two are now one. The code was
  not rebuilt. Re-verified instead:
  - **Tests, by file.** `aof test --scope impacted --story 191/00` widened to all 1,274 suites
    (`no-graph`), and a full run is ruled out on this machine. The evidence is 14 suites run by
    file and green (166 cases): the five declared suites, the fleet route suite, the relay bridge,
    and the session/loop/mesh arch controls that import the two changed modules. The node:test
    `packages/mesh/test/relay.test.mjs` passed 5/5 under `node --test`. The milestone regression
    gate is still owed.
  - **Fixed at this close:** `session-spawn-handler/00` (the live assignment worktree case, from
    2026-09-13 and not this story's code) failed on macOS. `git worktree list` answers
    `/private/var/...` where the fixture holds the `/var/...` symlink. It now compares
    `realpathSync` on both sides. The file is in 00's `files:`.
  - **Typecheck and lint:** the repo has no tsconfig or linter. `node --check` is clean on every
    changed module and suite. The one grade-baseline failure (`arch/m42-item-3`) is
    `packages/execution/src/pty.mjs`, outside this story, and unchanged.
  - **Gate:** validate PASS; doctor exit 0, advisory warnings only.
  - **Review (solo, every lens inline):** structural PASS (FF-19101 green, so one factory serves both
    branches and `stop()` reaches the control's handler); behavioural PASS (all 10 task scenarios,
    the 4 Examples rows and the budget row green); craft: one Nit, recorded. No Blockers, one round.
  - **Recorded finding (Nit):** a local spawn that throws synchronously makes `apply()` answer
    `false`, but a local spawn whose promise rejects answers `true`. Both report the degrade and
    the refusal, and nothing reads that boolean for the spawn lane. A `terminal-resume` for the
    control's own node still goes to `dispatchDirective` and is refused as not-connected. ADR-001
    §2 does not route resume, so this is out of scope, but 03's `session-end` lane should decide
    whether resume joins it.
  - The near-miss recall returned an empty block again (recorded, 0 verdicts). The run's `attempt`
    is 1, so no episodic recall was due.
- 2026-11-12 — 191/01 built (continue, solo, run 20261112T130412738Z-0000, attempt 1, so no
  episodic recall was due). The near-miss recall returned an empty block (recorded, 0 verdicts).
  - **Contract gap, measured (Important → amendment to ADR-002 §4, for the operator).** §4 says
    Claude's own hooks register under the key the launcher registered, `(node, ws, "claude", id)`.
    They do not: the hook path labels Claude `claude-code` (`packages/mesh/src/commands/session.mjs:230`,
    the default when a hook payload arrives). Measured in task 02's scenario, through the real
    `aof session ping --json` from the session's cwd: the store then holds TWO leaves for one id,
    `claude` (relaying true, launcher) and `claude-code` (relaying false, hook). The session index
    still holds exactly one entry for `(wsl-2, id)`, so the scenario is green and the grid shows one
    slot. But the index's winner is the latest ping, so after `SessionStart` and every prompt the
    hook's `relaying:false` record wins, and the launched pane reads as not relayed until the
    launcher's next 30s ping. The fix is one label: register a Claude launch under the hook's
    `claude-code`, read from ONE exported home in `commands/session.mjs`. That file is outside
    `files:`, and the story note forbids widening it silently, so this lane built to the contract
    as written and hands it back. The workspace id half of the note holds where `mesh.workspaceId`
    is pinned (every published workspace; this repo pins it), so a session worktree's hook resolves
    the same id. In an UNPINNED workspace a session worktree's cwd hashes to a different id (path
    derivation), which is a second leaf for item sessions there.
  - **Recorded finding (Nit → one-line ADR-002 §2/§3 amendment at verify).** `launchCommandLine`
    also refuses a name that starts with `-`, and `launchSessionName` drops leading dashes from the
    folder part. `--remote-control [name]` takes an optional value, so a folder such as `-rf` would
    otherwise be read by `claude` as a flag. ADR-002 states only the character class.
  - **Fixed at the close:** the closed-set test had two private spellings (directive and handler).
    It is now one export, `knownSessionLaunch`, in `session-spawn-directive.mjs`.
  - **A Claude launch forces the record's `assistant` to `claude`** whatever the frame said (§4,
    "the launched record's assistant label is now the truth").
  - **`aof test --scope impacted --story 191/01` widened to the full suite (`no-graph`), as 191/05
    recorded.** It was stopped after 12 minutes: a full run is ruled out on this machine because the
    live daemon holds `:4182`. The evidence is the 19 suites that import the three changed modules,
    run by file with `--only` and an isolated `AOF_GLOBAL_HOME`. All 191/01 cases are green. The
    remaining failures don't touch this change: `relay.test.mjs` and `runtime.test.mjs` are
    node:test files the `--only` harness cannot run (their 10 node:test cases pass), and four cases
    (`yarn-installation` ×3, FF-5301's two-hop plant) fail on macOS's `/var` → `/private/var` tmpdir
    realpath in their own temp fixtures. After the close fix, the six core suites ran 130 cases, 0
    failures. The milestone regression gate is still owed.
  - **Task 03 (@manual) not run here.** It needs the desktop app's daemons on this build: an
    install-local and a restart, which this lane does not do. It goes to `aof:verify`, along with
    RESEARCH Q1/Q2's measurements (footer bytes at 200 columns, the trust dialog in a session
    worktree). ADR-002 §6's 200 columns stays the default until then.
  - **Gate:** validate PASS; doctor exit 0, advisory warnings only. **Review (solo, inline):**
    structural PASS after the fix above; behavioural PASS (all 15 task 00–02 scenarios and rows
    green; FF-19102's leg and its four plants green); craft PASS. No Blockers, one round.
- 2026-11-12 — 191/02 built and reviewed (continue, solo, run 20261112T135900559Z-0000, attempt 1,
  so there is no prior attempt to recall). The near-miss recall returned an empty block.
  `planSessionStart` (`packages/mesh/src/session-start.mjs`) holds the route's five checks, with the
  same order, codes, statuses and messages. It also mints the id and builds the spawn envelope, so
  neither face names a frame builder (FF-19103 leg, with four hand-written plants). The route's 21
  locked scenarios are green and unedited, and two scenarios were added that prove each refusal is
  the plan's own.
  - **Amendment for the operator and architect to ratify, not fixable in this write set: E7's "its
    start time".** The list reads `queryGlobalMeshStatus`, whose `sessions[]` entry is the presence
    projection frozen by 48/ADR-005 (`acd-session-entry-frozen-wire`): it carries `lastPingAt` and no
    `startedAt`. The verb answers `startedAt` when an entry states one, else `null`, plus
    `lastPingAt`, and never invents one. In production every entry therefore lists `startedAt: null`.
    To honour E7 literally, the presence entry and the index entry must gain `startedAt`. That is an
    additive amendment to 48/ADR-005's frozen wire, and it touches `presence.mjs`, `global-query.mjs`,
    `apps/ui/src/fleet/api.ts` and the frozen-wire arch-test. Alternatively, E7 is relaxed to "its
    last ping". The Discord `/session list` reply (191/06) inherits whichever is chosen.
  - **The declared write set was incomplete: eight suites outside `files:` were amended.** Each change
    states its reason in place:
    - The `packages/mesh/src` budget row, 53 → 54 for `session-start.mjs`. It lives in the declared
      budget file, but the row itself was not named.
    - The registry count, 138 → 140, in `test/command/application-assembly.test.mjs` (twice) and
      `packages/core/test/application.test.mjs`.
    - The mesh contribution list, 17 → 19, in `packages/mesh/test/commands.test.mjs`.
    - Two structural tests pinned the session route to `resolveLocalWorkspaceRow`:
      `test/arch/ui/acd-fleet-board-link-resolved.test.mjs` and
      `test/mesh/ui/mesh-ui-serve.test.mjs` (loop-stop-route/02). Each now follows the route into
      `planSessionStart`, and the first holds the core to the same probe-before-use rule (409
      `workspace-not-local`).
    - `acd-session-attribution-single-authority`'s `itemRef` leg is scoped to the hook seam's
      factory. The verbs carry `itemRef` onto the spawn frame, never onto a record. The
      table-read and store-import legs still sweep the whole file.
    - The `acd-session-driver-mesh-blind` facade closure, 182 → 185. It gains three pure leaves, each
      asserted by name. The start core is a deferred import and is asserted absent.
    - The mesh allow-list in `test/bundle/yarn-installation.test.mjs`, for the new imports.
  - **Grade gate (work:grade), fixed: FF-16004's module ceiling.** `aof work find 160` evaluated 753
    modules against its pinned 752. The one module more was `session-start.mjs`: both faces imported
    it statically, and every CLI verb loads `ui-serve.mjs` and `commands/session.mjs` through the
    registry. Both faces now import it deferred, inside the branch that starts a session
    (`const { planSessionStart } = await import(…)`). The count is back at 752 and the ceiling is
    unraised. FF-19103's import leg accepts the deferred form and gains two plants (the deferred core
    passes, a deferred lookalike trips). The attribution and mesh-blind amendments, and the
    module-placement finding below, still stand: `launchSessionName` and the face vocabulary are
    static imports of the module.
  - **Recorded finding (Important, routed as a story shape for the operator): the verbs share a
    module with the session hook seam.** ADR-003 places them in `commands/session.mjs`, which is the
    `aof session start|ping|end` hook seam. FF-7205 keeps that module light, because it runs on every
    prompt. Following the ADR pulled three leaves into the hook's static import closure, and it forced the
    attribution and mesh-blind amendments above. Moving the verbs to
    `commands/session-verbs.mjs` would undo all three, but it means amending ADR-003 §2 and FF-19103's
    named file, and the `commands` budget row moves 22 → 23. The operator decides at `aof:verify`.
  - **`aof test --scope impacted --story 191/02` widened to all 1,275 suites (`no-graph`)**, exactly
    as 191/05 found, and it started the full suite. The full suite is ruled out on this machine
    because the live daemon holds `:4182`, so the run was stopped before it got there. The evidence
    is instead the 137 suites that reach the changed modules, run by file with an isolated
    `AOF_GLOBAL_HOME` and `global-work-propagation` left out: 1,391 cases. After the amendments
    above, 21 still fail, and every one is environmental. On macOS `os.tmpdir()` is a symlinked
    `/var`, so `/private/var` realpaths don't match (yarn-installation production ×3,
    distribution-workspaces ×2, work-memory/00 and the FF-5301 laundering self-check).
    `GIT_ASKPASS` is inherited from this VS Code shell (clone-credential ×3). This worktree has no
    `apps/ui/dist` and no `apps/ui/node_modules`. Two workspace-boundaries cases fail on audit drift
    in `work-loop/src/commands/loop.mjs`, a file this story does not touch. The milestone
    regression gate is still owed.
  - **Recorded finding (Nit): scaled waits.** E1's "after 6 s" and E2's "45 s pass" run against the
    real relay with a 0.5 s delay and a 1.5 s `--wait`. The bound's length is not what is under test.
    The 64 KiB scan bound is proved over fakes, in both directions.
  - **Recorded finding (Nit): the route now reads the control's identity before the workspace
    check.** `controlNodeId()` is memoised and loads the daemon's own launch workspace. A fault
    loading it would now answer an unknown workspace with `session-route-failed` rather than 404.
    The order of the codes is unchanged.
  - **By hand, still owed (PLAN Verification):** `aof mesh session start
    agent-orchestration-framework --wait 45000 --json` on this laptop. Not run: the global config
    here has no `mesh.relay.url` (191/00's review), so it refuses `session-dispatch-unavailable`
    until that adoption path lands.
- 2026-11-12 — 191/07 built and reviewed (continue, solo, run 20261112T145751080Z-0000, attempt 1, so
  no episodic recall was due). The near-miss recall returned an empty block (recorded, 0 verdicts).
  - **Declared write set incomplete (for refine).** The build had to touch six files outside `files:`.
    `test/notify/notify-channels.test.mjs` pins the envelope's keys and the `packages/messaging/src`
    ceiling. `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` (FF-13107) pins the eleven
    envelope keys, and ADR-007 §2's `choices` makes twelve.
    `packages/core/src/application/bindings/notify/ask-messages.mjs` exposes the new
    `readIndexedMessage`. `packages/messaging/README.md` gets the new export's row. Two read-only
    reads were also outside `reads:`: `replies.mjs`'s allowlist and actor rule, and
    `discord-commands.mjs`'s deferral shape.
  - **Semantic tightening, stated.** `readAskMessage` now answers only an ask's record. The index
    also holds halts now, so a reply to a halt's message answers nothing, and `/asks` never links a
    halt. A tap reads any record through `readIndexedMessage`.
  - **Recorded (Nit, duplication).** `discord-buttons.mjs` re-states `channelOf` and `firstAnswer`
    from `replies.mjs` (about 15 lines), and its `settle` mirrors `discord-commands.mjs`'s
    `dispatchLoop`. A shared helper would touch both of those modules. A candidate for a
    `pay-debt` pass, not a driver.
  - **Handed to the operator as a story shape (needs new acceptance criteria).** A multi-select
    `AskUserQuestion` (`multiSelect: true`) with one question still gets one button per option
    under ADR-007 §2's codex rule, so one tap answers with a single label. The shape: "a
    multi-select question is answered by reply". Either drop `choices` when `multiSelect` is
    true, or render buttons that accumulate picks.
  - **Test-run scope (environment).** `aof test --scope impacted --story 191/07` widens to the whole
    tree: `packages/messaging/package.json` has no registered dependent, the guide is not in the
    graph, and a dispatch worktree carries no `graphify-out/` until `aof graph build . --offline`.
    The full suite is not runnable on this control node, because the live serve daemon holds
    `:4182`. So the build ran a named focused set of 25 files (the Discord, notify and ask-face
    suites; the budget and registration controls; `loop-command-stops`;
    `run-session-limit-resume`; and the core, work-loop, work and messaging package suites).
    Every case passed except two in `codex-ownership.suite.mjs`: `156 — retained ancestor lane …`
    and `156 — retained diverged lane …`. Those fail identically at the base commit `e94eea59` on
    this Mac, together with `154/04 ownership` (Codex CLI 0.159.0, below the 0.160.0 required).
    `phases.suite.mjs`'s `156 — real resumed loop …` failed once and passed on re-run (a flake).
    The milestone regression gate must still run the whole tree, on a node without a live daemon.
- 2026-11-12 — 191/07 fix round (run 20261112T160014643Z-0001). `work:grade` failed FF-16004:
  `aof work find 160` loaded 754 modules against its pinned ceiling of 752. The build had put two
  modules on every verb's synchronous path: `@aof/messaging/discord-buttons` and a core binding of
  its own (`bindings/discord/buttons.mjs`). **Fixed.** The press handler is now composed in the
  bot's existing binding (`bindings/discord/bot.mjs`), and the separate binding is deleted (−1).
  The remaining module is the grammar's leaf. `discord.mjs` must import it to name a message's
  buttons synchronously, and ADR-007 §4 makes it the one home. So the ceiling rose to 753, with
  its reason named in the row. `files:` now drops the deleted binding and names
  `test/arch/command/acd-cli-entry-executes.test.mjs`.
  - **Lesson.** A story that adds a module to a package the application assembles eagerly
    should check FF-16004's ceiling in its own run. Refine could name
    `test/arch/command/acd-cli-entry-executes.test.mjs` in `files:` whenever a story adds a core
    binding or a messaging export.
- 2026-11-12 — 191/07 fix round 2 (run 20261112T162359478Z-0002). `work:grade` failed two FF-7706
  cases in `test/arch/audit/acd-audit-travels-two-roots.test.mjs` ("…gets an audit of its own
  instruments" and "the census decides registration…"). Both failed on a child probe's deadline:
  `timed-out` and `deadline-expired`, under `DEFAULT_DEADLINE_MS` = 60 s. Neither returned a
  wrong answer. **Not reproduced, so no code change.** The suite passed 3 of 3 times in isolation,
  each run about 4 s, with the machine at a load average of about 21–25. It reads nothing this
  story changed (messaging, notify, the ask composer or `observe.mjs`).
  - **Recorded (environment, for retro).** FF-7706's two probe cases are deadline-sensitive under
    host contention. A grade run on a loaded control node can push a 4 s probe past 60 s. If this
    recurs, it is a candidate for the grade's own scheduling (run the probe-spawning controls
    alone), not for the story under grade.
- 2026-11-12 — 191/03 built and reviewed (continue, solo, run 20261112T151148339Z-0000, attempt 1,
  so there is no prior attempt to recall). The near-miss recall returned an empty block.
  `SESSION_END_KIND`, `buildSessionEndFrame` and `buildSessionEndEnvelope` join
  `session-spawn-directive.mjs`. The worker client gains `onSessionEnd`, and the router an end lane
  routed by node as 191/00 routes a spawn. `handler.end(sessionId)` halts one owned session through
  the shutdown's own steps (`haltEntries`, which `stopAll` now also calls). Both launcher branches
  hand a received end to it. `mesh:session-end` (`aof mesh session end <session> [--node]`) takes
  the id or the ADR-002 name, refuses `session-not-found` before any relay is opened, pushes, and
  reads presence once a second for up to 15 s.
  - **How the end is confirmed (ADR-004 §3–§4, a choice the ADR left open).** The verb reads the
    node's own presence record (`nodes[].presence.sessions[]`), not the payload's `sessions[]`
    index. The index drops every session of a node that is no longer `live`, so a node that died
    mid-wait would read there as "the row is gone" and be answered as an end. A frozen presence
    record still carries the session, and the answer is `ended: false`. A presence that cannot be
    read at all is also `ended: false`, with `listed: false`.
  - **The answer's shape, for 191/06 to read.** `{ ok, ended, sessionId, nodeId, name }`. An
    unconfirmed end adds `code: "session-end-unconfirmed"` and `listed`, has `ok: false`, and the
    CLI exits 1 on it, as `session start` does for a refusal. Two refusals are added to the ADR's
    one: `session-ambiguous` (409, a name two live sessions share) and the start core's own
    `session-dispatch-unavailable` and `session-dispatch-failed` (503) for the relay. `--node`
    narrows the rows to that node. It never sends an end to a node whose presence does not carry
    the session.
  - **An end during a spawn is not queued** (PLAN's trap): the id is reserved but not yet owned, so
    it is logged `session-end-not-launched`, and the session then opens. Covered by a test.
  - **Fixed here, a red 191/02 left: FF-B's reader pin for `SESSION_SPAWN_ACK_KIND`.**
    `acd-wire-kind-has-both-ends` pins that kind's reading ends to exactly two files. 191/02's
    watch in `commands/session.mjs` is a third, so the case was red on this branch before this
    story started. The pin now names all three, and its red-at-head reconstruction removes the
    third. `wireKindProblems` is unedited. Neither 191/02's story-scoped run nor the loop's grade
    baseline had it.
  - **The declared write set was incomplete: three suites outside `files:` were amended**, the
    same three counts 191/02 moved. The registry count, 140 → 141, in
    `test/command/application-assembly.test.mjs` (twice) and `packages/core/test/application.test.mjs`.
    The mesh contribution list, 19 → 20, in `packages/mesh/test/commands.test.mjs`.
  - **The declared read set was incomplete: two modules outside `reads:` were needed.**
    `packages/mesh/src/global-query.mjs` (`buildSessionIndex`), because what the index drops decides
    how the end is confirmed. `packages/mesh/src/session-start.mjs`, for the relay refusal's code
    and words.
  - **`aof test --scope impacted --story 191/03` widened to all 1,275 suites (`no-graph`)**, as
    191/05 and 191/02 found, and started the full suite, which is ruled out on this machine
    (`:4182`). It was stopped. A second `aof test` waits on the first one's lock, so the by-file
    runs went through `scripts/test-shard.mjs` with an isolated `AOF_GLOBAL_HOME`. The evidence, on
    the final tree: the seven suites this story touched or is held by, 159 cases, green. Every
    fitness function (544 files, 2,400 cases), 3 red. The 106 suites outside `test/arch` that name
    a changed module (`global-work-propagation` left out), 1,725 cases, 10 red. None of the 13 is
    in this story's diff:
    - `arch/m42-item-3`: `packages/execution/src/pty.mjs` has 2 silent catches against a baseline of
      0. It is the one failure in this run's own grade baseline.
    - `arch/126/00 FF-12602 leg 2`: 15 in-flight lines in `work-loop/src/commands/loop.mjs` against
      a pinned 14. Both files were last changed by 191/04's lane commit.
    - Environmental, and green when re-run with a real-path `TMPDIR` and no inherited `GIT_ASKPASS`
      (their five files, 123 cases, 0 red): the FF-5301 laundering self-check, yarn-installation
      production ×3, loops-commands/00 and /03, work/archive-is-a-move/00 and clone-credential ×3.
    - `application/closing an application stops its owned HTTP server`: this worktree has no
      `apps/ui/dist`.
    The milestone regression gate is still owed.
  - **PLAN's by-hand check was not run here** (start with 191/02's verb, then end it by name). It
    needs the desktop app's daemons on this build: an install-local and a restart, which this lane
    does not do. It goes to `aof:verify`.
  - **Gate:** validate PASS; doctor healthy, exit 0, three advisory warnings (`numbering-gap`,
    `rubric-join-unchecked`, `depends-edges-unchecked`). **Review (solo, inline):** structural PASS
    against ADR-004 §1–§5 and ADR-001 §2; behavioural PASS (all 13 scenarios and rows of tasks
    00–02 green, FF-19104 green with its red-without-readers plant); craft PASS after two fixes in
    the tests (a duplicated degrade-capture helper hoisted, a clock wrapper removed). No Blockers,
    one round.
  - **Recorded finding (Important, added to 191/02's story shape for the operator): the hook seam's
    module now holds three verbs.** `mesh:session-end` joins `commands/session.mjs` as ADR-004 §3
    places it, about 180 more lines in the module `aof session ping` loads on every prompt. It adds
    no static import. Moving the verbs to `commands/session-verbs.mjs` now moves three.
  - **Recorded finding (Nit): the 15 s answer is proved over a fake clock, not a spawned CLI.** E1,
    E2 and the by-name scenario assert the bound on the clock the verb waits on. The spawned-CLI
    lanes cover the by-name end (the row leaves when the test republishes presence) and E3. A
    spawned E2 would add 15 s of wall time to the suite.
  - **Recorded finding (Nit, 191/02's suite): `mesh-session-verbs/02 E5` times out under load.**
    Its 15 s wait for the spawn envelope expired twice while another test run held the machine, and
    never on a quiet one.
