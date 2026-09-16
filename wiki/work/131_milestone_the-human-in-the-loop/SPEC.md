---
type: milestone
number: 131
slug: the-human-in-the-loop
title: "The human in the loop — a session that needs you asks where you are, waits in place, and the loop keeps going"
status: not-started
owner: product-owner
created: 2026-09-16
updated: 2026-09-16
depends: [129]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 131 · NN · The human in the loop — a session that needs you asks where you are, waits in place, and the loop keeps going

## Objective

**A driven session that needs a human gets its question to the human where they are, waits for
the answer in place, and the rest of the loop carries on.** Today (69/05, measured on 2026-09-16
at 127/02) the opposite happens: the session prints `NEEDS_INPUT`, the driver kills it, the run is
parked, and the loop halts with `session-needs-input … sessionId=d9a98681…` — the QUESTION never
reaches the operator (it sits in the transcript as the session's last message), the only way to
answer is `claude --resume <sessionId>` by hand, and every other lane stops for one lane's
question. A halt that needs a human must be a notification with the question in it and an answer
path that works from a terminal, from the board, and from outside the machine.

Measured on 2026-09-16 (loop 127, `--resume`, run `20260916T104822644Z-0003`):

| fact | value | source |
|---|---|---|
| what the operator saw | `127 — halted on session-needs-input at 127/02 (producer driver:needs-input) … Details: sessionId=d9a98681-…` | the terminal, `loop-diag.127.2026-09-16T08-26-55-824Z.log` |
| where the question was | the session's last assistant message — 27 `duplicate-driver-number` doctor findings and a shell loop to move git-ignored residue — 1,400 characters nothing surfaced | transcript `d9a98681…`, read by hand |
| how it was answered | the residue moved by hand outside the session; `aof work loop 127 --resume` re-drove the SAME session, which saw its own history and finished `done` in 4 min | `loop-diag.127.2026-09-16T13-48-10-184Z.log` |
| what the sentinel's producer says | `print the exact line NEEDS_INPUT on its own line … then stop` (`NEEDS_INPUT_INSTRUCTION`, appended to every driven session's system prompt) | `src/agent-session-driver.mjs` |
| what parking does | terminates the process, preserves the conversation and worktree, marks the run `needs-input`, releases the slot; "not a failure, mints no second attempt" | 69/05, `test/assignment/blocked-run-parking.test.mjs` |
| what the fleet can already do | mirror a live driven session's PTY (`/ws/terminal`, m38) and TYPE into the captured session (`terminal-input`, worker path) | `src/terminal-ws.mjs`, `test/mesh/terminal/mesh-terminal-input-path.test.mjs` |
| what the board already shows | `WAITING ON A HUMAN (code: needs-input)`, amber, on the item's detail panel — no question text, no reply | `ui/src/board/DetailPanel.tsx:238` |
| outbound notifications today | none — no `work.notify` key, no channel, no message shape; the only "notify" in the tree is the mesh withdraw's internal one | `grep -ri notify src` |

**The outcome an outsider can verify:** with `work.notify` configured, a loop whose session
asks a question posts the question to the Discord channel within seconds, names the same
question on the terminal halt line and on the board card, keeps the other lanes building, and
accepts the answer from `aof work answer <ref> "<text>"` or from the board's reply box; the
session continues from where it stopped, and the loop's account records the wait, the answer and
who gave it.

## Scope

In scope:

- **Ask and wait, not park and halt.** On `NEEDS_INPUT` (or a live `AskUserQuestion`) the driver
  keeps the PTY alive; the run flips to `needs-input` carrying the QUESTION (the session's last
  message, read from the transcript — one reader, the transcript's own words); the heartbeat rule
  is suspended for the wait exactly as it is for a provider wait (129/06 `F-58`); `scheduleToClose`
  stays the outer bound. Parking (69/05) is the FALLBACK when the bound is reached or the loop
  itself must stop — the conversation preserved as today — never the first response.
- **The answer reaches the session.** One verb, `aof work answer <ref> "<text>"`, writes the
  answer into the waiting session through the terminal-input path the fleet already has; the
  board's amber card gains the question and a reply box that calls the same verb; a parked
  session is resumed with the answer typed in (the loop's `--resume` re-drive, extended, never a
  second driver). Who answered and when lands on the run record.
- **A waiting lane does not halt the loop.** Under `refine_first` the other lanes keep building;
  the waiting lane is one row in the account — `127/02 — waiting on you: <question>` — and the
  wave's heartbeat keeps the declaration alive. A primary drive (REFINE, VERIFY) waits the same way.
- **External messaging: the notifier.** A `work.notify` config surface with a channel registry and
  ONE event envelope (`{ event, ref, at, node, question | stop | outcome, answerPath, link }`) that
  every channel renders; **Discord webhook first** (a POST, no bot), the registry shaped so a
  second channel (Slack webhook, email, a generic webhook) is a renderer and a config block, not a
  second pipeline. Fired on: `session-needs-input` (with the question and the answer command),
  every loop halt (stop id, ref, remedy), a loop death or supervisor relaunch, a milestone
  accepted. Delivery is best-effort and never blocks or fails a run; failures degrade by name.
- **The live run.** One real loop that asks a question, the Discord message received, the answer
  given once from the CLI and once from the board, the loop finishing; read at the source.

Out of scope:

- **Answering FROM Discord** (a bot listening in the channel and routing replies to `aof work
  answer`). The envelope and the verb make it additive; the inbound path is its own item once the
  outbound one has run live.
- **Changing what a session decides to ask.** `NEEDS_INPUT_INSTRUCTION`'s "genuine judgment call"
  contract stands; this milestone changes what happens after the line is printed, not before.
- **The loop's own survival** — the supervisor race (129 `F-61`) and the console-kill deaths
  (129 `F-63`, deaths #4–#6) are 129/06's and the loop-death instrumentation's; a notification of
  a death is in scope here, its prevention is not.
- **Rewriting 69/05's delivered `.feature`s.** Parking's contract stands as the fallback; the new
  behaviour is new scenarios on new stories.

## Stories

To be broken down at refine. The proposed cut, write-disjoint by design:

- [ ] `01_story_the-session-asks-and-waits` — the driver keeps the PTY alive on the sentinel, the run carries the question, the heartbeat is suspended for the wait, parking is the bounded fallback
- [ ] `02_story_the-answer-reaches-the-session` — `aof work answer <ref> "<text>"` through the terminal-input path; a parked session resumed with the answer; who/when on the record
- [ ] `03_story_a-waiting-lane-does-not-halt-the-loop` — the wave carries a waiting lane, the account names it, the primary drives wait the same way
- [ ] `04_story_the-notifier-and-its-channels` — `work.notify`, the event envelope, the channel registry, the Discord webhook renderer, the four firing points, best-effort delivery
- [ ] `05_story_the-board-shows-the-question-and-takes-the-answer` — the amber card carries the question and a reply box onto the verb; the fleet mirror beneath it
- [ ] `06_story_the-live-run` — `@manual`: a real question, a real Discord message, both answer paths, the loop finishing

## Dependencies

- **69/05 (done)** — blocked-run parking: the conversation-preserving fallback this milestone
  extends; its `.feature`s are the base contract.
- **38 (done)** — the terminal bridge: the PTY mirror and the terminal-input path the answer
  verb and the board reply box write through.
- **129 (in progress)** — worktree lanes and the wave: "a waiting lane does not halt the loop"
  is a wave property; 129/06's `F-58` (provider wait) is the heartbeat-suspension shape reused.
- **130 (in progress)** — stop a running loop: the durable-request pattern its verb established
  is the shape `aof work answer` follows (a request the loop reads, never a signal).
- **A Discord webhook URL** the operator provides in `work.notify` — the one external secret;
  read from config or env, never committed.
