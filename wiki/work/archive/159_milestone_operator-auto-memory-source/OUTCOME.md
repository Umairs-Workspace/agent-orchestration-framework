# 159 · The operator's auto-memory is an opt-in memory source — Outcome

## Delivered

### Operator procedure recallable beside the work stream
On a node whose config sets `memory.sources: ["claude-auto-memory"]`, one recall answers from both the operator's Claude auto-memory and the repository's lessons, each record citing its own source; the capabilities are stated whole in m159/01's outcome (opt-in source, operator lessons, rebuild-faithful recall).

### Node-local by construction
Operator records exist only in the git-ignored local index of the node that holds the Claude home, never in graph extraction or mesh transport, and an unconfigured node's index is exactly the work stream (FF-15901..03).

## Assumptions

- **The source is the operator's own file** — aof reads `~/.claude/projects/<project>/memory/` read-only and never writes it; an entry an agent elsewhere needs must be promoted into the repository.

## Gaps

### Deduplication between operator and repository lessons
- **Status:** open-by-decision
- **Discharge condition:** a milestone that decides one fact recorded in both stores should recall as one result.
Stated whole in m159/01's outcome; a known duplicate recalls twice, by design.
