# 204/00 · Every asset kind applies to its committed baseline — example map
<!--
Drafted 2026-11-21 by the PO at refine's discovery beat. Grounding, measured the same day on
81953d9b (ARCHITECTURE "Measured facts"): the every-kind fixture applies to 23 lock entries plus
the merged Claude settings; Codex takes no command and opencode no MCP; the Codex TOML merge into a
fresh file puts `model` inside the last server table, and the next apply refuses. No person was
asked, so every example is proposed.

Struck before asking: whether the TOML misplacement, and the files a single-runtime apply writes
outside its runtime, are fixed here or held. The operator decided at
refine that 204 fixes what damages a user's file or breaks a file, and holds the rest (milestone
STATE, 2026-11-21).
-->

## R1 · Every asset kind renders for every runtime that takes it, and the tree equals the committed baseline
- E1 · `every-kind`, `assets apply` on claude, codex and opencode: the tree equals the whole committed baseline, and the global home is empty [proposed]
- E2 · A command declared on claude and opencode renders `.claude/commands/my-command.md` and `.opencode/commands/my-command.md`, and no Codex file [proposed]
- E3 · The MCP servers `docs` and `remote` render to `.mcp.json` for claude and into `.codex/config.toml` for codex; opencode gets no MCP file [proposed]
- E4 · The rule scoped to `src` renders to `src/AGENTS.md` for codex, apart from the root `AGENTS.md` the project doc writes [proposed]

## R2 · Each runtime alone renders its own share, and the files it writes outside it are held
- E5 · `claude`, `assets apply --runtime claude`: its `removed.golden` names every `.agents/` and `.opencode/` path, `AGENTS.md`, `src/AGENTS.md` and every `.codex/` path but `.codex/config.toml`, and no `.claude/` path, `CLAUDE.md` or `.mcp.json` [proposed]
- E6 · `codex` alone removes every `.claude/` and `.opencode/` path but `.claude/settings.json`, and `CLAUDE.md` and `.mcp.json`; `opencode` alone removes every `.claude/`, `.codex/` and `.agents/` path but `.claude/settings.json` and `.codex/config.toml`, and `AGENTS.md`, `src/AGENTS.md`, `CLAUDE.md` and `.mcp.json` [proposed]
- E7 · Held, not fixed: each runtime alone keeps `.claude/settings.json`, and `claude` and `opencode` alone keep a `.codex/config.toml` holding only `model = "o3"` (ADR-006 §3) [proposed]

## R3 · The lock and the journal record exactly what apply wrote
- E8 · The lock holds one entry per output except `.claude/settings.json`, which is merged outside the lock; the Codex config's entry records `toml` ownership [proposed]
- E9 · The apply journal holds an entry for every Codex output, and (amended by 204/01, ADR-002 §3) for `CLAUDE.md` and `.mcp.json` [proposed]

## R4 · Applying twice changes nothing
- E10 · `re-apply`: the second step reports every action `skip`, and the tree equals `every-kind`'s [proposed]
- E11 · `every-kind`'s `.codex/config.toml` parses with `model = "o3"` at the top level and both servers under `mcp_servers`. Today it parses as `mcp_servers.docs.model`, and the second apply exits 1 [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · Is the fixture built by `assets add` steps or declared as data? (Data. MCP, hooks, docs, settings and workflows have no verb.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · Is every scenario crossed with every runtime? (No. The three-runtime render holds every runtime's files, and each runtime alone is a delta.)
