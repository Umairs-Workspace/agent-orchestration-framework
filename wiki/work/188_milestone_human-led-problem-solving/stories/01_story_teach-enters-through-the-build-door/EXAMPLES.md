---
doc: examples
---
# 188/01 · `--teach` enters through the build door — example map
<!--
Drafted at refine's discovery beat, 2026-10-28, revised 2026-10-31. Struck because the record
answers them: the command is `aof:teach` (operator, 2026-10-31, agreeing the command design);
teaching enters through the door and inherits manual's refusals (spike 178 Finding item 1); the
modes are exclusive (SPEC Objective); the loop never composes an operator flag (149/01).
-->

## R1 · A teaching continue is one story or task, started here
- E1 · `aof work continue 188/01 --teach` on a story nothing has run: answers `Continue "188/01" here — run: /aof:teach 188/01`, and the story moves to `in-progress` [proposed]
- E2 · `aof work continue 179 --teach` on a milestone: refused `continue-teach-not-a-story`, nothing moves [proposed]
- E3 · `aof work continue 188/01 --teach --node node-2976`: refused `continue-teach-remote`, no assignment is minted [proposed]

## R2 · Teaching and manual never run together
- E4 · `aof work continue 188/01 --manual --teach`: refused `continue-modes-exclusive`, the story stays `not-started` [proposed]
- E5 · `aof work refine 188/01 --teach`: refused as an unknown flag [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Is the mode injected into the door or hard-coded beside `manual`?
