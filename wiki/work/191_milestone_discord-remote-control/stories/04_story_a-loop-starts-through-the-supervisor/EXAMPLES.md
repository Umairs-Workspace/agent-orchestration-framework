---
doc: examples
---
# 191/04 · A loop starts through the supervisor — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: whether the
bot may start the loop itself (131/ADR-009 invariant: never); what a start does to a halted
supervised loop (`declarations.mjs:164`: a fresh start would reset a bounded loop's budget, so it is
refused toward `/loop resume`). Relabelled technical: the request's file name, and whether a start
takes a level.
-->

## R1 · A start is a request the supervisor honours, never a process started here
- E1 · `aof work loop 191 --hand-off-start` with no run ever on 191: a start request is written, and nothing is spawned [proposed]
- E2 · The supervisor's next poll lists `loop 191` with argv `work loop 191 --supervised`, and no `--resume` [proposed]

## R2 · A start never resumes, and never runs twice
- E3 · Scope 131 has a halted supervised loop: refused `loop-start-resumable`, naming `/loop resume 131` [proposed]
- E4 · Scope 191's loop is running: refused `loop-start-running` [proposed]
- E5 · Two start requests for 191 one second apart: one request on disk, and one loop starts [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-005 · Does a start take a level? (Optional `level`, else the loop's default L2.)
