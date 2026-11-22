# 204 · What aof apply, init and clean write is held to baselines — Outcome

## Delivered

### Every verb that writes into a user's project is part of the whole-tree suite

The golden index now runs seven lanes, so every whole-tree run compares `aof work init`, `aof work update`, `aof assets apply`, `aof assets clean` and `aof init` with their committed baselines. 204 adds four lanes, 18 scenarios and 156 baseline files (m204/00, m204/01, m204/02, m204/03).

### aof's ownership of a merged file runs from apply to clean

A file the user and aof both write is recognised by its path, merged with its ownership recorded in the lock, and handed back by clean holding only the user's content, through one retraction. FF-20401 and FF-20402 hold both ends (m204/01, m204/02).

### Adopting or removing aof costs a user none of their own files

Over a project holding the user's own `CLAUDE.md`, `.mcp.json`, `AGENTS.md`, Codex config and hooks, and `.aof/.gitignore`, apply, clean and init change only aof's entries. The four defects that replaced or deleted those files are fixed at their source (STATE, operator decision at refine).

## Assumptions

- **The baselines hold three behaviours as they are** — clean leaving aof's entries in `.claude/settings.json` (F-01), an `AGENTS.md` that two runtimes render refusing (F-02), and a single-runtime apply writing outside its runtime (F-03). A fix to any of them is a reviewed baseline diff (ADR-006).

## Gaps

### A user's own file at a whole-file aof path
- **Status:** open
- **Discharge condition:** apply and `work init` refuse or warn before replacing a file aof never wrote (F-06, m203/F-01).
`assets apply` replaces a user's `.claude/agents/<id>.md` whole and reports it as an update, and no lane holds that case.
