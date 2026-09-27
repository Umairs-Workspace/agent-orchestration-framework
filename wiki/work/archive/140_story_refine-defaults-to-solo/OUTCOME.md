# 140 · Refine runs solo unless told otherwise — Outcome

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

### A hand-run refine plays its roles inline unless configured otherwise
With `work.agents.mode` unset, `/aof:refine` resolves to solo and `/aof:continue` to orchestrated. A set key governs both commands, and `--solo` / `--orchestrated` override it for one run.

### An orchestrated refine gives each story one QA agent
Under orchestrated mode, one `aof-qa` writes the Examples tables for all of a story's tasks. The prompt forbids splitting that pass into one agent per task.

### The loop composes a mode flag on every refine and continue it drives
`LOOP_AGENT_MODE_DEFAULTS` in `src/loop-bounds.mjs` is `{ refine: "solo", continue: "solo" }`. `aof work drive` composes `work.loop.agents.<phase>.mode` when it is set and `--solo` when it is unset, and never reads `work.agents.mode`. `verify` still carries no flag.

### The per-key loop resolvers still answer null for an unset key
The default is applied only at the phase level (`loopAgentModeFromConfig`), so the registry's range probe and the tuner see an unchanged `null`.

### This repository and the operator's ten others follow the defaults
None of the 11 `.aof/aof.config.json` files pins a mode key. Each one's rendered prompts state the new defaults, and a following `aof work update --dry-run` reads 0 updated and 0 drift-warning.

## Assumptions

- **Nobody re-pins a mode key** — a repository that sets `work.agents.mode` or `work.loop.agents.<phase>.mode` again opts out of these defaults, by design.
- **The mesh directive stays flagless** — a worker's story continue types `/aof:continue <ref>` with no flag, so it follows the prompt's own default (orchestrated), not the loop's.
