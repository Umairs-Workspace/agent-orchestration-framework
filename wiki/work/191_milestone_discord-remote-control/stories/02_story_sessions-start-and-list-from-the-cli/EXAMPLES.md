---
doc: examples
---
# 191/02 · Sessions start and list from the CLI — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: which node
a start lands on when none is named (RESEARCH Q4: the control, which holds every served project);
whether a start without a link has failed (SPEC Scope: "the start still succeeds", and the reply
says where to find it); what a session is called (191/01). Relabelled technical: how long to wait for
the link, and what `item` must resolve to.
-->

## R1 · A start names the node and the project, and either the link or where to look
- E1 · `aof mesh session start aof --wait 45000`, and the link appears after 6 s: it answers outcome `started`, node `node-6eb3`, project `aof` and the link [proposed]
- E2 · The same start, and no link within 45 s: it answers outcome `no-link` with the name `aof-0b9e6c1e`, and the session is still running [proposed]
- E3 · `aof mesh session start aof` with no wait: it answers at once, with the session id and name and no link [proposed]

## R2 · A start that cannot land says why, in the route's words
- E4 · `--node wsl-2` while `wsl-2` is offline: refused `session-target-not-connected`, the same code the fleet button gets [proposed]
- E5 · The worker refuses because the project is not checked out there: outcome `refused` with `session-repo-unavailable`, within the wait [proposed]
- E6 · `--item 19l` (a typo): refused `session-item-unknown`, and no worktree is made [proposed]

## R3 · The list shows only live sessions of the projects asked about
- E7 · Two sessions in `aof` and one in `notes`: `aof mesh session list aof` shows the two, each with node, start time and name [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · How long does a start wait for the link? (45 s from Discord; 0 by default on the CLI.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · Must `item` exist in the project? (Yes, through `work:find`.)
