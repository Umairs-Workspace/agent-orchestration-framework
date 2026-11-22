# 204/02 · Clean removes exactly what aof wrote — example map
<!--
Drafted 2026-11-21 by the PO at refine's discovery beat. Grounding, measured the same day on
81953d9b (ARCHITECTURE "Measured facts"): after a plain apply, clean deletes every lock entry's file
and leaves the merged Claude settings and the journal; over the user's own files it deletes AGENTS.md,
src/AGENTS.md, .codex/config.toml and .codex/hooks.json whole, user lines included. No person was
asked, so every example is proposed.

Struck before asking: whether clean should keep the user's content in a merged file. The SPEC asks
that clean remove exactly what aof wrote and that the user's files survive it, and the operator
decided at refine that 204 fixes it (milestone STATE, 2026-11-21).
-->

## R1 · Clean removes every file aof wholly owns, and a second clean changes nothing
- E1 · `plain`, apply then clean over `EVERY_KIND`: every rendered file is deleted, including `AGENTS.md`, `src/AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.codex/config.toml` and `.codex/hooks.json`, which aof created and which hold nothing of a user's; the lock keeps no file entry [proposed]
- E2 · The second clean in `plain` reports no action and changes no file [proposed]
- E3 · Held, not fixed: `.claude/settings.json` keeps aof's entries, and `.aof/aof.apply-journal.json` stays (ADR-006 §1) [proposed]

## R2 · Clean hands every merged file back holding only the user's content
- E4 · `customised`: `AGENTS.md` is exactly "# Agents\nMine.\n", `src/AGENTS.md` exactly "# Src\nMine.\n" and `CLAUDE.md` exactly "# Claude\nMine.\n", each reported `retract`. Today the first two are deleted [proposed]
- E5 · `.codex/config.toml` parses to the user's `approval_policy` and server `mine` alone, `.codex/hooks.json` to the user's one `Stop` group, and `.mcp.json` to the server `mine` alone, each reported `retract`. Today the first two are deleted [proposed]
- E6 · The user's root `.gitignore` and `.claude/.gitignore` are untouched, and neither is in clean's report [proposed]

## R3 · A file the user edited survives clean
- E7 · `drifted`: a line appended to `.claude/agents/my-agent.md` after apply: the file is kept, reported `drift-warning`, and its lock entry stays [proposed]
- E8 · A line "# Mine" prepended to `CLAUDE.md` after apply: aof's block is removed, and the file is exactly "# Mine\n", reported `retract` [proposed]
- E9 · A line edited inside aof's managed block in `AGENTS.md`: the file is untouched, reported `drift-warning`, and its lock entry stays [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-004 · When nothing of the user's is left once aof's entries are removed, is the file deleted or left empty? (Deleted. Aof created it.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · Does an edit outside aof's block count as drift? (No. It is the user's, and the retraction keeps it.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · Is the leftover Claude settings entry fixed here? (No. It damages no user file, and it is held.)
