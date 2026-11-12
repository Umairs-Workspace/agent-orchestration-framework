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
