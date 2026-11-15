---
doc: examples
---
# 191/06 · Discord starts sessions and loops — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: who may run
the new commands (SPEC Scope: the existing per-channel allowlist, extended); whether Remote Control
is a flag (STATE 2026-11-10: on by default, not as flags); where `/session start` lands with no
`node:` (RESEARCH Q4); what a start with no link says (ADR-003 §4); whether `/session list` is
private (131/ADR-009 §4: a view is ephemeral); whether `/loop start` is attributed (131's rule: an
action is in-channel). Relabelled technical: the wait for the link.
-->

## R1 · A session start answers with where to open it
- E1 · `/session start project:aof` by an allowed user: within 45 s the reply reads that Claude started on `node-6eb3` in `aof`, with the link to tap, and only that user sees it [stated Q1]
- E2 · The same start with no link seen: the reply names the session `aof-0b9e6c1e` and says to open the Claude app → Code and find it there [proposed]
- E3 · `/session start project:aof node:wsl-2` while `wsl-2` is offline: the reply says the node has no live connection (`session-target-not-connected`) [proposed]
- E4 · A user not on `aof`'s allowlist: refused `discord-command-not-allowed`, and nothing starts [proposed]

## R2 · A session can be seen and ended from the channel
- E5 · `/session list`: only the caller sees the list of live sessions in the channel's projects, each with its node, age and name [proposed]
- E6 · `/session end session:aof-0b9e6c1e`: the channel sees "@sam ended aof-0b9e6c1e on node-6eb3" once presence confirms it [proposed]

## R3 · A loop starts through the supervisor
- E7 · `/loop start scope:191 project:aof`: the channel sees "@sam asked the supervisor to start 191 — it starts on its next poll" [proposed]
- E8 · `/loop start scope:131` where 131 is halted and supervised: refused `loop-start-resumable`, naming `/loop resume scope:131` [proposed]

## Questions
- Q1 · business · answered · Who should see the reply to `/session start`, which carries the tap-to-open link: only the person who ran it, or everyone in the channel? (Operator, 2026-11-12: only the person who ran it.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · How long does Discord wait for the link? (45 s, inside the interaction token's 15 minutes.)
