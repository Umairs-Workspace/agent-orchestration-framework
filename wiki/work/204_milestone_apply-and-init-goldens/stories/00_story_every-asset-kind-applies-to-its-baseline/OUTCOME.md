# 00 · Every asset kind applies to its committed baseline — Outcome

## Delivered

### `aof assets apply` over every asset kind is held to a baseline

The `assets-apply` lane holds a fixture `.aof/` carrying agents, commands, skills, rules, hooks and MCP servers, applied on Claude Code, Codex and opencode together (`every-kind`, held whole with its lock and apply journal) and on each runtime alone (`claude`, `codex`, `opencode`, held as deltas), in 51 committed baseline files.

### A second apply changes nothing

`re-apply` applies the fixture twice, and the second apply skips every file.

### The Codex TOML merge writes a top-level setting where Codex reads it

A top-level setting merged into `.codex/config.toml` lands before the first table header and keeps the render's order, so Codex reads `model` at the top level and the next apply no longer refuses with `codex-output-conflict` (ADR-003). The merge's own guard, `indexMergedToml`, refuses a misplaced result before any write.

## Assumptions

- **The fixture's shape is the measured one** — 23 outputs, each resource carrying a `description`, so the baselines hold the frontmatter a real project renders.
