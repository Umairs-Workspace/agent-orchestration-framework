---
doc: examples
---
# 191/05 · The project is picked, not typed — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: the word
(`project`: SPEC Scope says refine decides, and the operator's agreed shape is `project:<p>`, STATE
2026-11-10); who may address a project (the existing per-channel allowlist, SPEC Scope). Relabelled
technical: how many suggestions are shown, and how they are matched.
-->

## R1 · Every command names the project the same way
- E1 · `/loop stop scope:191 project:aof` stops the loop on 191 in `aof`, as `workspace:aof` used to [proposed]
- E2 · After the bot's next READY, no command in the guild offers a `workspace` option [proposed]

## R2 · The list offers only projects the user may address
- E3 · The channel serves `aof` and `notes`; the user is on `aof`'s allowlist only: typing `a` offers `aof`, and typing nothing offers only `aof` [proposed]
- E4 · A user on no allowlist types `a`: the list is empty, and no refusal is posted [proposed]
- E5 · Typing `NO` offers `notes` (case is ignored) [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · How many suggestions? (Discord's 25, by prefix, then by containment.)
