---
type: story
number: 11
slug: slash-commands
title: "Slash commands — `/status`, `/asks`, `/loop stop` and `/loop resume` from Discord, for allowlisted users, answered by the control node"
parent: 131
depends: [9, 10]
status: done
owner: product-owner
created: 2026-09-25
updated: 2026-09-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-008, ADR-009]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-004
  - src/discord/gateway.mjs
  - src/discord/replies.mjs
  - src/notify/discord.mjs
  - src/notify/form.mjs
  - src/notify/ask-messages.mjs
  - src/commands/list.mjs
  - src/loop/stop.mjs
  - src/loop-argv.mjs
  - src/mesh/presence.mjs
  - src/run-store.mjs
  - test/discord/discord-fixture.mjs
files:
  - src/discord/commands.mjs
  - src/discord/bot.mjs
  - src/commands/loop.mjs
  - src/loop/stop-request.mjs
  - src/mesh/declarations.mjs
  - src/work/loop.mjs
  - test/discord/discord-commands.test.mjs
  - test/discord/index.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs
  - wiki/architecture/discord-notifications.md
  - src/loop/stop.mjs
  - src/notify/ask-messages.mjs
  - src/mesh/launcher.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
---
# 11 · Slash commands

## User story

As **the operator driving loops from my phone**,
I want **the bot to answer `/status` (loops, lanes and who is waiting, for how long), `/asks` (every
open question with its ref, phase and wait), `/loop stop` (130's durable stop request, with its
level) and `/loop resume` (relaunch a halted or parked loop with `--resume`), refused for anyone not
on the allowlist**,
so that **I can see and steer the loop without a terminal, through the same verbs the CLI uses**.

## Tasks

- [x] `tasks/00_the-four-commands-are-registered-per-guild.feature` — `COMMANDS` bulk-overwritten per guild at READY and hourly; a failed channel lookup skips only that guild
- [x] `tasks/01_every-command-defers-then-reaches-an-allowed-workspace.feature` — the `type: 5` deferral before any dispatch; the channel → workspace → allowlist resolution; ambiguity, DMs, the 2,000 cap
- [x] `tasks/02_status-and-asks-read-work-list.feature` — `/status` and `/asks` over `work:list` with `mesh: true`, rendered through `form.mjs`, with a jump link to an indexed ask
- [x] `tasks/03_loop-stop-sends-the-durable-stop-request.feature` — `/loop stop` is 130's `work:loop` stop, in-channel, naming the level reached; starts nothing
- [x] `tasks/04_loop-resume-hands-the-loop-to-the-supervisor.feature` — `work:loop --hand-off` writes a resume request; the decider yields the row; `--resume` clears it; the supervisor starts the process
- [x] `tasks/05_the-register-holds-the-commands-to-registered-verbs.feature` — FF-13113 appended to 10's arch file; 130's stop-request control owns `loop-resumes` too; red probes
- [x] `tasks/06_the-guide-lists-the-commands.feature` — `@manual`: the guide's commands section — scope, options, who may run them, what `/loop resume` needs

## Notes

- **Operator decisions (2026-09-25):** the first command set is exactly `/status`, `/asks`,
  `/loop stop` and `/loop resume`. The allowlist is 10's. There is one bot, on the control node.
- **Discord facts, checked against the developer docs (2026-09-25):**
  - Slash commands are application commands, registered through the HTTP API (per guild for
    immediate availability). The invite needs the `applications.commands` scope.
  - A command arrives as an interaction over the same Gateway connection 10 holds, and needs no
    privileged intent. It must get an initial response within 3 seconds, or its token is invalidated.
    The response is sent over HTTP. Follow-ups are valid for 15 minutes, so a slow verb defers first.
- **For refine:**
  - Every command dispatches a registered `work:*` / `loop` command, never a CLI shell-out (the
    board's in-process rule).
  - Which workspace a command addresses when the control node serves several.
  - `/loop resume` starting a loop process is a process start. Refine rules who owns it: the
    supervisor or the loop verb, never a hand-spawned daemon.
  - The replies are ephemeral or in-channel.

## Refine (2026-09-25, `aof:refine 131/09-12 --solo`)

- **ADR-009** answers the "For refine" items above. Every command dispatches `work:list` or
  `work:loop` in-process (§5). A command addresses the workspaces whose channel it was run in,
  narrowed by the allowlist, and a `/loop` command that could reach several is refused unless
  `workspace:` names one (§3). `/loop resume` belongs to the SUPERVISOR: the bot writes a durable
  resume request through the new `work:loop --hand-off`, and the desktop app's next poll relaunches
  the loop with `--resume` (§6). `/status` and `/asks` are ephemeral, and `/loop` replies
  in-channel (§4).
- **Default decisions:** guild commands, not global ones; registration at READY plus an hourly
  pass that skips unchanged guilds; `/status` renders the in-progress rows, because no registered
  read lists unsupervised loops; an unsupervised loop is resumed from a terminal.
- **130's contract is extended, not edited.** The resume request lives in `stop-request.mjs`
  beside the stop it undoes, under its own `loop-resumes` segment. The stop record's ten keys and
  `STOP_LEVELS` are untouched.
