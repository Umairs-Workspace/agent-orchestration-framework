# 204/01 · Apply's merges keep the user's entries — example map
<!--
Drafted 2026-11-21 by the PO at refine's discovery beat. Grounding, measured the same day on
81953d9b (ARCHITECTURE "Measured facts"): over the user's own files, apply keeps the settings, the
Codex config and hooks, the root and nested AGENTS.md and both ignore files, and replaces CLAUDE.md
and .mcp.json whole; re-apply skips every file; a doc on Codex and opencode refuses. No person was
asked, so every example is proposed.

Struck before asking: whether apply should merge into a user's CLAUDE.md and .mcp.json, or keep
replacing them. The operator decided at refine that 204 fixes it (milestone STATE, 2026-11-21).
-->

## R1 · Over the user's own files, apply moves only aof's entries
- E1 · `customised`, the user's file at every merge point, then `assets apply`: the tree equals the committed baseline [proposed]
- E2 · The user's `.claude/settings.json` allowing `Bash(npm test)` with a `Stop` hook running `say done`: both kept, and aof's `lint-on-stop` hook added beside it [proposed]
- E3 · The user's `.codex/config.toml` holding `approval_policy = "never"` and `[mcp_servers.mine]`: both kept byte for byte, and `model` and the servers `docs` and `remote` added [proposed]
- E4 · The user's `AGENTS.md` holding "# Agents\nMine.\n" and `src/AGENTS.md` holding "# Src\nMine.\n": each starts with the user's lines byte for byte, then aof's managed block [proposed]
- E5 · The user's root `.gitignore` is untouched, and the user's `.claude/.gitignore` is kept and reported `drift-warning` [proposed]

## R2 · `CLAUDE.md`, `.mcp.json` and opencode's `AGENTS.md` are merged, not replaced
- E6 · The user's `CLAUDE.md` holding "# Claude\nMine.\n": it starts with those lines, then aof's managed block holding the project doc `guide`; the lock records `guidance` ownership. Today it is replaced whole [proposed]
- E7 · The user's `.mcp.json` declaring server `mine`: `mine` is kept as written, and `docs` and `remote` follow it; the lock records `mcp-servers` ownership of `docs` and `remote`. Today it is replaced whole [proposed]
- E8 · `opencode-agents`, the doc on opencode only, over the user's `AGENTS.md`: the user's lines, then aof's block [proposed]
- E9 · A `CLAUDE.md` written whole by an apply from before this fix, unedited, with a lock entry and no ownership: the next apply adopts it as aof's and does not refuse [proposed]

## R3 · Applying twice over the user's files changes nothing
- E10 · `customised-re-apply`: the second apply reports every file aof owns as `skip` and `.claude/.gitignore` as `drift-warning` again, and the tree equals `customised`'s [proposed]

## R4 · When two writers claim one file or entry, apply refuses before any write
- E11 · `mcp-collision`, the user's `.mcp.json` declaring a server named `docs`: apply exits 1 with `co-authored-output-conflict`, and the tree is the starting files alone [proposed]
- E12 · `doc-conflict`, held: the doc also on opencode makes apply exit 1 with "Generated output conflict at AGENTS.md", and the tree is the starting files alone [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · A user server with the same id as aof's: adopt it, or refuse? (Refuse before any write, as the Codex TOML merge already does for an unowned MCP entry.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002 · Where does aof's guidance go in a user's `CLAUDE.md`? (After the user's content, in the managed block `AGENTS.md` already uses.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · Is the `AGENTS.md` conflict fixed here? (No. It damages no user file, and it is held.)
