# Hyperagent in AOF — the planning runtime

Hyperagent is an **opt-in planning runtime**. It takes an idea to a reviewed roadmap — a researched
planning PRD, framed backlog milestones and spikes, then stories and task contracts — and hands the
result to the execution runtimes (Claude Code, Codex) as an ordinary pull request. It never builds,
reviews or verifies, and it is never an `aof work loop` runtime.

## What renders

`aof work init --runtime hyperagent` (or add it to an existing install with
`aof work init --force --runtime claude,codex,hyperagent`) renders, under `.hyperagent/`:

| File | Source | What it does |
|---|---|---|
| `skills/aof-prd/SKILL.md` | `packages/core/assets/skills/aof-prd/` | Research and write the planning PRD (`PRD-<slug>.md`) the shatter seam reads |
| `skills/aof-shatter/SKILL.md` | `shatter` + the `hyperagent` variant | PRD → un-numbered backlog milestones and spikes with backward-only `depends` |
| `skills/aof-refine/SKILL.md` | `refine` + variant | Numbered milestone → independent stories (ADRs / research only when open); story → task `.feature` contracts |
| `skills/aof-add-milestone/SKILL.md` · `aof-add-story` · `aof-add-task` | variants | One-off additions |
| `skills/aof-validate/SKILL.md` | variant | Pre-flight of the `aof work validate` rules, without the CLI |
| `AGENT.md` | `packages/core/assets/hyperagent/AGENT.md` | Instructions for a Hyperagent named agent ("AOF Planner") |

Every other command reports `outside-runtime-subset` and is not written; the role agents report
`unsupported-warning` (Hyperagent has no subagent file format — one planner plays the roles in turn).

The six command skills are **full rewrites** (`packages/core/assets/variants/hyperagent/planning.md`),
not prefixed copies of the Claude procedures: each carries a *Hyperagent execution contract* that
replaces every CLI step — the repository is reached through Hyperagent's GitHub integration, writes go
to an `aof/plan/<slug>` branch and end in a **draft** pull request, `aof work promote` is never
simulated (drivers are always written un-numbered in the backlog), memory recall becomes a repository
search, and `aof work validate` is replaced by an embedded checklist while remaining the authoritative
gate the operator runs on the branch.

## Opt-in, by construction

`RUNTIMES.hyperagent.optIn` keeps it out of `defaultRuntimes()`, which every "no runtime named"
default uses (`aof assets apply`, `aof assets add`, the runtime flags, packages, scaffold). Validation
still uses `supportedRuntimes()`, so the runtime is **accepted when named and never assumed**. A
project that never names it renders exactly what it rendered before.

## Set it up in Hyperagent

1. Render the skills into the repository (above) and push them — this repository ships its own
   `.hyperagent/` for that reason.
2. In Hyperagent: **Skills → Create skill → Import from GitHub**, and give it the repository URL.
   It imports every `SKILL.md` it finds (the seven `aof-*` skills).
3. Create a named agent from `.hyperagent/AGENT.md`, give it the imported skills, and connect the
   GitHub integration for the repositories it should plan.
4. Ask it for a plan. Each step ends in a draft pull request; on the branch the operator runs
   `aof work validate`, then `aof:promote <slug>`, then `/aof:continue <NN>` (or `$aof-continue`).

**Updating.** Hyperagent's GitHub import always creates new skills (a name clash gets an "imported"
suffix); it does not refresh existing ones. After `aof work update` changes a rendered skill, update
the existing Hyperagent skill from the new file (or ask the planner to do it) rather than re-importing.

## Limits

- Hyperagent cannot run the `aof` binary, so it cannot mint numbers, record recall observations, build
  the code graph, or run `aof work validate`. Those remain the operator's (or CI's) steps on the branch.
- `aof-refine` works on **numbered** items only: a backlog milestone must be promoted first, because
  stories are keyed by their milestone's number.
- Live acceptance — an imported skill set driving a real plan end to end — is tracked in
  `wiki/work/backlog/milestone_hyperagent-planning-runtime/`.

## Later: delegating planning from Claude Code or Codex

Hyperagent also serves an MCP endpoint (`https://hyperagent.com/api/mcp`: `create_thread`,
`get_thread`, `send_message`). A follow-up `aof:hyperplan` command could hand a planning request to
the AOF Planner from inside a Claude Code or Codex session and fetch the resulting branch. It is out of
scope for this change.
