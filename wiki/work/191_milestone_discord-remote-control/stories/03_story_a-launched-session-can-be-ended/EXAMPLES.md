---
doc: examples
---
# 191/03 · A launched session can be ended — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: whether
`/session end` exists at all (SPEC Scope: "so a session started from Discord does not run forever");
whether it can end a session aof did not launch (ADR-004 §2: nothing to end it with). Relabelled
technical: how the end is confirmed, and how long to wait for it.
-->

## R1 · Only a session aof launched can be ended, and the answer is the truth
- E1 · `aof mesh session end 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10`, and its record leaves presence after 4 s: it answers `ended: true` [proposed]
- E2 · The same end while the node is unreachable: after 15 s it answers `ended: false`, saying the request was sent and the session is still listed [proposed]
- E3 · An id no live session carries: refused `session-not-found`, and nothing is sent [proposed]
- E4 · The id of a `claude` the operator started in a terminal: the node logs `session-end-not-launched`, and the answer is `ended: false` [proposed]

## R2 · A session started from Discord does not run forever
- E5 · A session started at 09:00 is not touched again: it is still running and listed the next morning, until `/session end`, Quit or a restart [stated Q1]

## Questions
- Q1 · business · answered · Should a session started from Discord end on its own after a period with no activity, and if so after how long? (Operator, 2026-11-12: no limit.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · How is an end confirmed? (The record leaving presence within 15 s, with no new ack frame.)
