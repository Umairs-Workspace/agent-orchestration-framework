---
type: story
number: 07
slug: the-live-run
title: "The live run — a real loop on this machine asks a question, the Discord message arrives, the answer is given once from the CLI and once from the board, the other lanes keep building, and the loop finishes, read at the source"
parent: 131
depends: [6]
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-001, ADR-005]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - .claude/rules/build-deploy-restart.md
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

<!-- Authored at the story's own refine (Three Amigos): tasks/NN_<slug>.feature. -->

## Notes

- Follows the operator-gated `@manual` pattern: install from the MAIN checkout, measure at the source, write the procedure and paste slots into STATE.md, then NEEDS_INPUT — never in-review on paraphrased evidence.
