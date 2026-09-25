---
type: story
number: 07
slug: the-live-run
title: "The live run — a real loop on this machine asks a question, the Discord message arrives, the answer is given once from the CLI and once from the board, the other lanes keep building, and the loop finishes, read at the source"
parent: 131
depends: [6, 8]
status: in-progress
owner: product-owner
created: 2026-09-23
updated: 2026-09-25
adrs: [ADR-001, ADR-005]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - .claude/rules/build-deploy-restart.md
  - scripts/install-local.mjs
files:
  - wiki/work/131_milestone_the-human-in-the-loop/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 07 · The live run

## User story

As **the operator who framed this milestone after a loop died on one lane's question**,
I want **one real `refine_first` loop, after `node scripts/install-local.mjs`, `AOF_DISCORD_WEBHOOK_URL` set as a user env var and the desktop app restarted, to ask a real question, post it to the Discord channel within seconds, take one answer from `aof work answer` and one from the board, keep its other lanes building, and finish — with the run records' `asks` read at the source**,
so that **the milestone's outcome is measured on the running system, not asserted from green fixtures**.

`@manual` (ADR-001, ADR-005): the procedure and the paste slots land in STATE.md; the agent does the install-and-measure half and the operator supplies the webhook, the restart and the Discord observation.

## Tasks

- [ ] `tasks/00_the-stage-is-set-and-handed-to-the-operator.feature` — `@manual`, the agent's half: the payload installed from the main checkout and read at the source; the test-bed fixture `03_milestone_ask-target` (three refined stories with disjoint `files:`; two tasks reserve a choice to the operator, so the asks land at build in lanes, and one reserves none), `refine_first` and a Discord channel naming only the env var; no URL anywhere; the procedure and paste slots in STATE.md, then `NEEDS_INPUT`
- [ ] `tasks/01_the-live-ask-read-at-the-source.feature` — `@manual`, operator-gated: the env var and the desktop restart as the precondition; the ask on T1 and on Discord within 10 s (by message id); the other lane driving while it waits; one answer from `aof work answer`, one from the board card, each resuming the SAME session; the loop `done`; the records' `asks` read at the source

## Notes

- Follows the operator-gated `@manual` pattern: install from the MAIN checkout, measure at the source, write the procedure and paste slots into STATE.md, then NEEDS_INPUT — never in-review on paraphrased evidence.
- The fixture lives on the standing test-bed (scope `03`, never `00`), never in this repository. Its two asking stories reserve a choice in their own task, because WHEN a session asks is out of 131's scope. The stories arrive refined, so the asks land at build in lanes: under `refine_first` a refine-time ask runs in the primary and holds the whole loop (ADR-004 §3), where leg 2 cannot be shown.
- Observed before this refine (2026-09-25, a source build, not the payload): a real lane on another repository printed `waiting on you (build, 1m)` and then `parked, unanswered (build, 12m)` when a sibling lane's merge conflict halted the loop, and the halt's `Details` carried `parked=[…]`. That is ADR-001 §5 working live, but it is not this story's evidence.
