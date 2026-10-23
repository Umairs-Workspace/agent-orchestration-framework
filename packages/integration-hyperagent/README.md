# @aof/integration-hyperagent

Hyperagent as AOF's **planning** integration: everything it ships, reaching core through one
contribution. `/aof:hyperplan` renders only where `work.integrations.hyperagent` is present; the
planner files are written to the aof home for upload (169/ADR-007).

- `contribution.mjs` — the one object core's registry (`packages/core/src/integrations.mjs`) reads:
  the `work.integrations` id, the package whose `assets/` it ships, and the verbs.
- `assets/` — `bundle.json` (the fragment core appends to its descriptor: `hyperplan` alone),
  `commands/hyperplan.md` and its Codex variant, and the planner files `AGENT.md` and the seven
  `skills/aof-*/SKILL.md`.
- `package.mjs` — writes the planner files to `<aof home>/hyperagent/` and compares them for the doctor.
- `brief.mjs` — composes the self-contained brief sent to the Hyperagent "AOF Planner" agent.
- `plan-result.mjs` — reads the planner's `AOF-PLAN-RESULT` block (or its PR URL and branch) back.
- `check.mjs` — validates a plan branch in a temporary worktree and flags files outside the planning lane.
- `doctor.mjs` — reports whether Claude Code / Codex have Hyperagent's MCP server and the planner package is current.
- `commands.mjs` — `aof work integrations hyperagent brief | result | check | doctor | package`.

The package spawns nothing and imports nothing from core: git and the work validator are injected.
See `wiki/hyperagent-support.md`.
