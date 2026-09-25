---
type: milestone
number: 131
slug: the-human-in-the-loop
title: "The human in the loop — a session that needs you asks where you are, waits in place, and the loop keeps going"
status: in-progress
owner: product-owner
created: 2026-09-16
updated: 2026-09-25
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
# 131 · The human in the loop — a session that needs you asks where you are, waits in place, and the loop keeps going

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
asks a question posts the ask to the Discord channel within seconds — the decision needed, the
options the session weighed, its own pick, and the phase it asked from — names the same
question on the terminal halt line and on the board card, keeps the other lanes building, and
accepts the answer from `aof work answer <ref> "<text>"` or from the board's reply box; the
session continues from where it stopped, and the loop's account records the wait, the answer
verbatim and who gave it. A lane nobody answers parks at the bound and says so on the same
channel.

## Scope

In scope:

- **Ask and wait, not park and halt.** On `NEEDS_INPUT` (or a live `AskUserQuestion`) the driver
  keeps the PTY alive; the run flips to `needs-input` carrying the QUESTION (the session's last
  message, read from the transcript — one reader, the transcript's own words); the heartbeat rule
  is suspended for the wait exactly as it is for a provider wait (129/06 `F-58`); `scheduleToClose`
  stays the outer bound. Parking (69/05) is the FALLBACK when the bound is reached or the loop
  itself must stop — the conversation preserved as today, and the park itself notified (the
  notifier, below) — never the first response.
- **The form of the ask.** The producer instruction gains one paragraph: before the sentinel the
  session states the decision it needs, the options it weighed, the one it would take and why,
  and what the answer changes (which tasks, files or downstream steps). The threshold for asking
  is untouched (out of scope, below); the SHAPE of what is printed is this milestone's, because
  the envelope's `question` is whatever that last message happens to be, and the measured one —
  findings first, question buried — is what a reviewer gets when nothing asks for more. The
  first way a human checkpoint fails is the reviewer receiving the output without the rationale
  (Gothelf, *The last cheap moment*; STATE 2026-09-23); the paragraph IS the rationale, in the
  transcript's own words, so the one-reader rule (the last assistant message) holds unchanged.
  It is also what fits under a channel's cap (Discord: 2,000 characters of content) — the
  paragraph is the message, the `link` carries the rest.
- **The answer reaches the session.** One verb, `aof work answer <ref> "<text>"`, writes the
  answer into the waiting session through the terminal-input path the fleet already has; the
  board's amber card gains the question and a reply box that calls the same verb; a parked
  session is resumed with the answer typed in (the loop's `--resume` re-drive, extended, never a
  second driver). The answer verbatim, who gave it and when land on the run record, readable
  later as retrospective input (STATE 2026-09-23).
- **A waiting lane does not halt the loop.** Under `refine_first` the other lanes keep building;
  the waiting lane is one row in the account — `127/02 — waiting on you (<phase>, <elapsed>):
  <question>` — and the
  wave's heartbeat keeps the declaration alive. A primary drive (REFINE, VERIFY) waits the same way.
- **External messaging: the notifier.** A `work.notify` config surface with a channel registry and
  ONE event envelope (`{ event, ref, at, node, phase, elapsedMs, question | stop | outcome,
  answerPath, link }`) that every channel renders; **Discord webhook first** (a POST, no bot), the
  registry shaped so a second channel (Slack webhook, email, a generic webhook) is a renderer and
  a config block, not a second pipeline. `phase` (refine / build / verify) and `elapsedMs` are the
  COST of the ask: the last cheap moment is the contract stage — a question asked there costs a
  re-plan, the same question asked at build costs a lane's worth of work — and the operator
  triages by it. Both are already in hand at every halt site (`cycle.mjs` and `wave.mjs` hold the
  phase run; `attemptElapsedMs` reads the duration off the run record); tokens would need the
  observe reader and stay optional. Fired on: `session-needs-input` (with the ask and the answer
  command), `session-answered` (who, when), `session-parked-unanswered` (asked at, parked at, the
  resume path — under `refine_first` a lane that parks is not a loop halt, so nothing else would
  say so), every loop halt (stop id, ref, remedy), a loop death or supervisor relaunch, a
  milestone accepted. Delivery is best-effort and never blocks or fails a run; failures degrade
  by name.
- **The live run.** One real loop that asks a question, the Discord message received, the answer
  given once from the CLI and once from the board, the loop finishing; read at the source.

Out of scope:

- **Answering FROM Discord** (a bot listening in the channel and routing replies to `aof work
  answer`). The envelope and the verb make it additive; the inbound path is its own item once the
  outbound one has run live.
- **Changing WHEN a session decides to ask.** `NEEDS_INPUT_INSTRUCTION`'s "genuine judgment call"
  threshold stands; this milestone changes the form of the ask (above) and what happens after the
  line is printed, never the bar for printing it.
- **The loop's own survival** — the supervisor race (129 `F-61`) and the console-kill deaths
  (129 `F-63`, deaths #4–#6) are 129/06's and the loop-death instrumentation's; a notification of
  a death is in scope here, its prevention is not.
- **Rewriting 69/05's delivered `.feature`s.** Parking's contract stands as the fallback; the new
  behaviour is new scenarios on new stories.

## Stories

<!-- The stories that compose this milestone. Each is its own NN_story_<slug> item with parent: NN.
     Broken down at refine (2026-09-23) from the SPEC's proposed six into seven: the proposed 01
     split into read-and-record (01) and wait (03, which absorbs the proposed 03), and a register
     story added as in 130 (ARCHITECTURE "Proposed partition"). The milestone is accepted when all
     its stories are. -->

- [x] `01_story_the-question-is-read-and-recorded` — one transcript reader in `observe.mjs`, the four-line form of the ask, `src/loop/ask-request.mjs`'s one ask file per run, the run record's `asks` key, no reclaim and no charge while waiting (ADR-002, ADR-003)
- [x] `02_story_the-notifier-and-its-channels` — `work.notify`, the `src/notify/` family: one envelope, the channel registry, the Discord renderer, the shared headline formatter, best-effort delivery, the secret in env only (ADR-005, ADR-006 §1)
- [x] `03_story_the-session-waits-and-the-loop-keeps-going` — `awaitAnswer` at every needs-input site: the waiting lane holds its slot, the answer resumes the same session, the bound parks and says so, the loop halts only when nothing else can run (ADR-001, ADR-004) — depends 01, 02
- [x] `04_story_the-answer-reaches-the-session` — `aof work answer <ref> "<text>"` for a local lane, a primary drive and a mesh worker; who and when on the record; `POST /api/work/answer` behind the loopback-guarded admission (ADR-003, ADR-006 §3) — depends 01, 02
- [x] `05_story_the-board-shows-the-question-and-takes-the-answer` — the `ask` fact on list rows (local lanes too), `AskCard.tsx` with the verbatim ask and a free-text reply box, no fast path (ADR-006, DESIGN) — depends 01, 02, 04
- [x] `06_story_the-register` — FF-13101–FF-13109 in three files under `test/arch/loop/`, the row 62 → 65, the red probes in VERIFICATION (all ADRs) — depends 03, 04, 05
- [ ] `07_story_the-live-run` — `@manual`: a real question, a real Discord message, both answer paths, the other lanes building, the loop finishing (ADR-001, ADR-005) — depends 06, 08
- [x] `08_story_the-messaging-cli` — `aof messaging init discord` stores the webhook machine-wide under `~/.aof`, `enable`/`disable discord` switch it per project in `work.notify`, `status` reports presence never the value; amends ADR-005 §1 — depends 02

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
