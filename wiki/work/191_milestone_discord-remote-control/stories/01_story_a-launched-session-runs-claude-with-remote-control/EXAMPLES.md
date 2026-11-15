---
doc: examples
---
# 191/01 · A launched session runs Claude with Remote Control on — example map
<!--
Drafted at refine's discovery beat, 2026-11-11. Struck because the record answers them: whether
Remote Control is on by default or by flag (STATE 2026-11-10: on by default, not as flags); whether a
Discord-started session may be a shell (SPEC Scope: never). Relabelled technical: the session's name,
the terminal width, and how the shell is closed when Claude ends.
-->

## R1 · A session started this way is Claude with Remote Control, never a shell
- E1 · Start session 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10 for project folder `aof` on macOS: the PTY receives `exec claude --remote-control aof-0b9e6c1e --session-id 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10` and a newline [proposed]
- E2 · The same start on Windows: the PTY receives `claude --remote-control aof-0b9e6c1e --session-id 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10 & exit` and CR LF [proposed]
- E3 · A frame arrives with `launch: "bash -i"`: it opens as a bare shell and nothing is typed into it [proposed]

## R2 · When Claude ends, the session ends
- E4 · The operator types `/exit` in the Claude app: the PTY exits, and the session leaves presence within one ticker cadence [proposed]

## R3 · The session's name can be read from its record
- E5 · Project folder `my project!` and session 0b9e6c1e-…: the name is `my-project--0b9e6c1e` [proposed]
- E6 · A 90-character folder name: the name is clipped to 64 characters, ending in the id's first 8 [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Does the name carry the item ref? (No: the record has no item.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002 · How wide is the PTY for a Claude launch? (200 columns, until task 03 measures it.)
