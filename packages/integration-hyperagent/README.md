# @aof/integration-hyperagent

Hyperagent as AOF's **planning** integration: everything it ships, reaching core through one
contribution and rendering only where `work.integrations.hyperagent` is present.

- `contribution.mjs` — the one object core's registry (`packages/core/src/integrations.mjs`) reads:
  the `work.integrations` id, the package whose `assets/` it ships, and the verbs.
- `assets/` — `bundle.json` (the fragment core appends to its descriptor), `commands/hyperplan.md`
  and its Codex variant, `AGENT.md` and the seven planner skills rendered under `.hyperagent/`.
- `brief.mjs` — composes the self-contained brief sent to the Hyperagent "AOF Planner" agent.
- `plan-result.mjs` — reads the planner's `AOF-PLAN-RESULT` block (or its PR URL and branch) back.
- `check.mjs` — validates a plan branch in a temporary worktree and flags files outside the planning lane.
- `doctor.mjs` — reports whether Claude Code / Codex have Hyperagent's MCP server and the skills are rendered.
- `commands.mjs` — `aof work integrations hyperagent brief | result | check | doctor`.

The package spawns nothing and imports nothing from core: git and the work validator are injected.
See `wiki/hyperagent-support.md`.
