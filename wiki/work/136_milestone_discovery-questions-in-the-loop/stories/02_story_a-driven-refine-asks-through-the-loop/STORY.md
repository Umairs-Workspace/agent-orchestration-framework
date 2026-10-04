---
type: story
number: 02
slug: a-driven-refine-asks-through-the-loop
title: "A driven refine asks through the loop — one tokened discovery question per ask, carrying its rule and example, and never a default"
parent: 136
status: done
owner: product-owner
created: 2026-10-03
updated: 2026-10-04
adrs: [ADR-002]
reads:
  - wiki/work/136_milestone_discovery-questions-in-the-loop/SPEC.md
  - wiki/work/136_milestone_discovery-questions-in-the-loop/ARCHITECTURE.md#ADR-002
  - packages/specification-by-example/src/map.mjs
files:
  - packages/core/assets/commands/refine.md
  - packages/core/assets/manifest.json
  - test/examples/refine-discovery-beat.test.mjs
  - .claude/commands/aof/refine.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/commands/aof/refine.md
schema: 1
aofVersion: 0.1.0
---
# 02 · A driven refine asks through the loop

## User story

As **the operator running a loop over stories that have business rules**,
I want **a refine the loop drives to ask me each business question as its own message, saying it
is a discovery question, which rule it bears on and which example it would settle**,
so that **I can answer from wherever I am without opening the story, and no agent decides a
business rule for me because nobody was at the terminal**.

What lands (ADR-002): `refine.md`'s discovery bullets gain the driven-session paragraph (a session
whose environment carries `AOF_RUN_ID`): one question per `AskUserQuestion` call, its token first,
then the discovery marker, the rule and the example, then 131's four lines; never a default and
never the NEEDS_INPUT sentinel; the answer written into the map on resume. The `--autonomous` block
gains the sentence that a driven cascade asks one question per call. The interactive path is
unchanged.

## Tasks

- [x] 00 [the discovery beat asks one tokened question per ask in a driven session](tasks/00_the-discovery-beat-asks-one-tokened-question-per-ask-in-a-driven-session.feature)
- [x] 01 [a driven cascade asks its questions one after another, and the copies match](tasks/01_a-driven-cascade-asks-its-questions-one-after-another-and-the-copies-match.feature)

## Notes
