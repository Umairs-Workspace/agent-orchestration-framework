# 141 · Subagents and loops think at a chosen effort — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### One effort vocabulary
`normalizeEffort()` in `src/session-model.mjs` is the only reader of an effort level. It accepts `low`, `medium`, `high`, `xhigh`, `max`, reads `extra-high` as `xhigh`, and refuses anything else. Every door that takes a level calls it.

### A driven session thinks at high unless told otherwise
`resolveSessionLaunch` answers `effort` + `effortSource` from `--thinking`, then `work.agents.session.effort.<phase>`, then `high`. Every spawned `claude` carries `--effort <level>` and none of the inherited effort variables. `aof work drive <phase> --dry-run --json` shows the `effort` it would launch at.

### aof work loop --thinking reaches every drive
`--thinking <level>` on the loop overrides every phase for that run. It reaches sequential child drives, wave lanes and in-process drives, is narrated before the first drive, and is stored as the declaration's tenth key, so `--resume` and a supervisor relaunch inherit it. An unknown level is refused as `thinking-unknown-level` before anything is written.

### A role can pin its own effort
`work.agents.effort` (role → level) renders `effort:` after `model:` in `.claude/agents/aof-*.md`, for pinned roles only. An unpinned role carries no line and inherits its session's effort. `aof project validate` checks the map the way it checks the model map.

### An operator's session in an aof project defaults to high
`aof work update` fills `effortLevel: "high"` into `.claude/settings.json` when the document has none. It never overwrites an existing value, and `settings.claude.effortLevel` in the project config still wins.

### A phase command's --thinking stops and names /effort
`/aof:refine`, `/aof:continue` and `/aof:verify` given `--thinking <level>` stop before any run or role. They print the `/effort` command to run and state that the session's effort was not changed.

### The run record shows the effort a session ran at
The spend ingest reads the record-level `effort` Claude Code writes on each assistant turn, so `spend.effort` names the level instead of `"unknown"`.

## Assumptions

- **Claude Code keeps reading an agent's `effort:` as an override, and inherits the session's effort when it is absent** — the pinned/unpinned split rests on the documented behaviour (read 2026-09-28).
- **The transcript keeps `effort` on the record, beside `message`** — the spend ingest reads that one location.

## Gaps

### Mesh-worker sessions are launched without the effort resolution
**Status:** open
**Discharge condition:** a mesh worker's spawned `claude` carries the `--effort` its phase resolves to (flag, then config, then `high`), as a local drive's does.

### Codex and opencode agents carry no effort
**Status:** open
**Discharge condition:** `work.agents.effort` renders an equivalent setting into those runtimes' agent files, or the map is documented as Claude-only in the schema.
