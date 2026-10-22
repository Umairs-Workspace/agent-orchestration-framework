# 165 · Planning runs in Cowork — Outcome

## Delivered

### Planning in Cowork on the same work tree
A repo's planning can be done in Claude Cowork: the operator writes a PRD with the pinned pm-skills planner and runs `/aof:shatter`, which writes framed milestone SPECs and spikes, with their `origin` and slug `depends` edges, into the repo's `wiki/work/backlog/`, and `aof work validate` and `aof work promote` from Claude Code or Codex then accept and schedule them (165/03 E5).

### Three planning runtimes, one lock
`aof planning init` installs planning for claude, codex and cowork side by side, each recorded as its own entry with its own pinned sha, so adding one never disturbs another (m165/00, m165/03).

### One planner commit everywhere
The planner Cowork runs is packaged from the same 40-hex pm-skills commit Claude Code installs, never from a floating ref (m165/02).

## Assumptions

- **Building stays out of Cowork** — continue, review, verify and the loop still need Claude Code or Codex; Cowork plans only.

## Gaps

### Cowork packages are not pruned or versioned
- **Status:** open-by-decision
- **Discharge condition:** two aof versions must coexist on one machine, and the aof home's `cowork/` is keyed by version and sha with a pruner (ADR-006, alternatives).
The aof home holds one set of packages, rewritten on every cowork run.
