# 155 · One agent-mode setting governs every session — Outcome

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

### The agent-mode chain and its default have one home
`@aof/contracts/agent-mode` (`packages/contracts/src/agent-mode.mjs`) exports `AGENT_MODE_DEFAULT = "solo"`, `agentModeFromConfig` (`work.agents.mode` if valid, else solo) and `sessionAgentMode` (loop key, else `work.agents.mode`, else solo; `null` for verify).

### The loop's drive follows work.agents.mode when no loop key is set
`aof work drive refine|continue` composes `--solo` or `--orchestrated` from `sessionAgentMode`. `loop-bounds.mjs` no longer carries `LOOP_AGENT_MODE_DEFAULTS`, and `loopAgentModeFromConfig` answers the loop key alone (or `null`).

### Every role-spawning prompt defaults to solo
Refine, continue, review, assimilate-code, migrate and autonomous state that an unset `work.agents.mode` resolves to solo. `--solo` and `--orchestrated` still override for one run. Verify reads no mode.

### The schema and renders state the one default and the chain
`schemas/aof.schema.json`, the manifest, the lock and the Claude, Codex and OpenCode renders agree with the source prompts.

### A per-role map is reported inert under the effective solo mode
`aof project validate` emits `model-map-inert-under-solo` / `effort-map-inert-under-solo` whenever the effective mode is solo, including an unset `work.agents.mode`.

## Assumptions

- **The mesh directive stays flagless** — a worker's continue follows its own config's `work.agents.mode`, else solo, through the prompt.

## Gaps

### Task 02's contract names a removed CLI verb
**Status:** open
**Discharge condition:** task 02's `When` steps (and `STORY.md` / `EXAMPLES.md`) name `aof project validate --json` instead of `aof config inspect --json` (VERIFICATION F-01).
