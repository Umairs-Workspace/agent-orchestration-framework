---
type: story
number: 07
slug: the-live-run
title: "The live run — a real loop on this machine asks three questions, the bot posts each within seconds, they are answered from the CLI, the board and a Discord reply, the other lanes keep building, the loop finishes, and a supervised loop is stopped and handed back from Discord, read at the source"
parent: 131
depends: [6, 8, 9, 10, 11, 12, 13]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-26
adrs: [ADR-001, ADR-005, ADR-007, ADR-008, ADR-009]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-007
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - .claude/rules/build-deploy-restart.md
  - scripts/install-local.mjs
  - src/commands/messaging/messaging.mjs
  - src/notify/secret.mjs
  - src/discord/replies.mjs
  - src/discord/commands.mjs
  - src/mesh/park-resume.mjs
files:
  - wiki/work/131_milestone_the-human-in-the-loop/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 07 · The live run

## User story

As **the operator who framed this milestone after a loop died on one lane's question**,
I want **one real `refine_first` loop, after `node scripts/install-local.mjs`, the bot token stored with `aof messaging init discord`, the bot invited and allowed on a channel, and the desktop app restarted, to ask three real questions, have the bot post each within seconds, take one answer from `aof work answer`, one from the board and one as a Discord reply, keep its other lanes building and finish — and a supervised loop stopped with `/loop stop` and handed back with `/loop resume` — with the run records' `asks` read at the source**,
so that **the milestone's outcome is measured on the running system, not asserted from green fixtures**.

`@manual` (ADR-001, ADR-005, ADR-007–009): the procedure and the paste slots land in STATE.md; the agent does the install-and-measure half and the operator stores the token, invites and allows the bot, makes the restart, starts the loops and gives every answer.

## Tasks

- [x] `tasks/00_the-stage-is-set-and-handed-to-the-operator.feature` — `@manual`, the agent's half: the payload installed from the main checkout and read at the source; the test-bed fixture `03_milestone_ask-target` (four refined stories with disjoint `files:`, three reserving a choice to the operator) and `04_milestone_resume-target` (one story, for the supervised stop and resume); four lanes; the procedure and paste slots in STATE.md, then `NEEDS_INPUT`
- [x] `tasks/01_the-live-ask-read-at-the-source.feature` — `@manual`, operator-gated: the bot stored, invited and allowed, and the desktop restart, as the precondition; the ask on T1 and from the bot within 10 s (by message id); the other lane driving while it waits, with `/status` and `/asks`; one answer each from `aof work answer`, the board card and a Discord reply, each resuming the SAME session; the loop `done`; `/loop stop` and `/loop resume` on a supervised loop; the records' `asks` read at the source

## Notes

- **Re-refined for the bot at `aof:verify 131` (2026-09-25), after 09–12 were accepted.** 07 proves the
  BOT, not the webhook: the bot posts every ask, an answer is given by a Discord reply as well as from
  the CLI and the board, and the four slash commands are exercised (`/loop stop` and `/loop resume` on
  the test-bed's `04`, run `--supervised`). A worker's ask (12) is not exercised: this is a loop on this
  machine, and 12's live proof stays its OUTCOME gap. Task 00 was redone against this contract.

- Follows the operator-gated `@manual` pattern: install from the MAIN checkout, measure at the source, write the procedure and paste slots into STATE.md, then NEEDS_INPUT — never in-review on paraphrased evidence.
- The fixture lives on the standing test-bed (scopes `03` and `04`, never `00`), never in this repository. Its three asking stories reserve a choice in their own task, because WHEN a session asks is out of 131's scope. The stories arrive refined, so the asks land at build in lanes: under `refine_first` a refine-time ask runs in the primary and holds the whole loop (ADR-004 §3), where leg 2 cannot be shown.
- Observed before this refine (2026-09-25, a source build, not the payload): a real lane on another repository printed `waiting on you (build, 1m)` and then `parked, unanswered (build, 12m)` when a sibling lane's merge conflict halted the loop, and the halt's `Details` carried `parked=[…]`. That is ADR-001 §5 working live, but it is not this story's evidence.
