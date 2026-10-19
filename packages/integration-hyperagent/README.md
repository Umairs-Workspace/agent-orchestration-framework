# @aof/integration-hyperagent

Hyperagent as AOF's **planning** runtime, and the deterministic half of `/aof:hyperplan`.

- `runtime.mjs` — the opt-in `hyperagent` runtime, its capability column and the ACD command → skill
  mapping that renders only the planning procedures (core's model and bundle import these).
- `brief.mjs` — composes the self-contained brief sent to the Hyperagent "AOF Planner" agent.
- `plan-result.mjs` — reads the planner's `AOF-PLAN-RESULT` block (or its PR URL and branch) back.
- `check.mjs` — validates a plan branch in a temporary worktree and flags files outside the planning lane.
- `doctor.mjs` — reports whether Claude Code / Codex have Hyperagent's MCP server and the skills are rendered.
- `commands.mjs` — `aof work integrations hyperagent brief | result | check | doctor`.

The package spawns nothing and imports nothing from core: git and the work validator are injected.
See `wiki/hyperagent-support.md`.
