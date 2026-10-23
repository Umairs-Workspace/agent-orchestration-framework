# 169/00 · Hyperagent plans the work — Outcome

## Delivered

### `/aof:hyperplan` delegates a planning step to Hyperagent
From Claude Code, OpenCode (`/aof:hyperplan`) or Codex (`$aof-hyperplan`), a planning request is composed into a deterministic brief, sent to the configured Hyperagent agent over its MCP endpoint, followed to a result block, and its plan branch checked. Questions are relayed and never answered for the operator.
- **The project enables `work.integrations.hyperagent`** and has Hyperagent's MCP server registered (the doctor names both).

### The four deterministic verbs
`aof work integrations hyperagent brief | result | check | doctor` compose the brief (refusing an unknown mode or a missing request), read the `AOF-PLAN-RESULT` block back, validate a plan branch in a temporary checkout using the repository's rename history (your index, HEAD and worktree list are left untouched), and report the setup. A long request's plan branch is cut at a whole word.

### Planning skills written for an agent with no checkout
`aof-prd` and full rewrites of shatter, refine, add-milestone, add-story, add-task and validate each carry the Hyperagent execution contract: reach the repository through GitHub, write only an `aof/plan/<slug>` branch, end in a draft pull request, never simulate `aof`.

### A live plan run delivers a validating draft pull request
Measured on 2026-10-23: one `plan` request delivered draft PR #18 (a PRD, its research, three backlog milestones and two spikes, all inside the planning lane), and `check` reports `aof work validate: PASS` over its branch.
- **The agent's GitHub integration has write access** to the repository. Read-only access ends the run with `status: blocked`.
