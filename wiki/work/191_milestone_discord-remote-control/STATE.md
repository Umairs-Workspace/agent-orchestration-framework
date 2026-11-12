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

## Feedback (for retro)

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
