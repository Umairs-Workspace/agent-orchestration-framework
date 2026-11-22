# 01 · Apply's merges keep the user's entries — Outcome

## Delivered

### A co-authored file is decided by its path, whatever the runtime

`coAuthoredOutput` names `AGENTS.md` at any depth, `CLAUDE.md`, `.mcp.json`, `.codex/config.toml` and `.codex/hooks.json` as co-authored for every runtime, and each is merged with its ownership recorded in the lock and its intent in the apply journal. FF-20401 holds it (ADR-002).

### `CLAUDE.md`, `.mcp.json` and opencode's `AGENTS.md` are merged, not replaced

Over a user's own `CLAUDE.md`, `.mcp.json` or opencode `AGENTS.md`, apply adds aof's managed block or `mcpServers` entries beside the user's content and records `guidance` or `mcp-servers` ownership.

### Apply's merges are held to baselines over the user's files

The `assets-merge` lane holds apply over the user's own file at every merge point (`customised`), a second apply over it that skips every file (`customised-re-apply`), opencode's `AGENTS.md` (`opencode-agents`), and two refusals that write nothing: a user's MCP server named as aof's (`mcp-collision`, `co-authored-output-conflict`) and an `AGENTS.md` rendered by two runtimes (`doc-conflict`, held as F-02).

### The doctor sees an edit inside aof's merged entries

`generated-output-drift` counts a co-authored file whose recorded fragment was edited, now planned as a `conflict`, as drift.

### A refusal carries its prefix once

An apply refusal reads `code: path: reason`, for Codex conflicts too.

## Assumptions

- **`assets apply --global` refuses** — `checkCodexTarget`'s `global` root is Codex's, which is correct only because a global render writes no co-authored file (F-05).
