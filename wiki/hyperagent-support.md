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
- Live acceptance — an imported skill set driving a real plan end to end, and one `/aof:hyperplan`
  run from a connected assistant — is tracked in
  `wiki/work/backlog/milestone_hyperagent-planning-runtime/`.

## `/aof:hyperplan` — delegate planning from Claude Code or Codex

From inside a Claude Code (`/aof:hyperplan`), Codex (`$aof-hyperplan`) or OpenCode session:

```text
/aof:hyperplan Add a Slack notifier for loop questions          # plan: PRD, then shatter, one PR
/aof:hyperplan prd Replace the board's polling with SSE          # the PRD only
/aof:hyperplan shatter wiki/planning/PRD-sse.md                  # an existing PRD
/aof:hyperplan refine 164                                        # a numbered milestone or story
```

The procedure drives Hyperagent's MCP endpoint (`create_thread` → `get_thread` → `send_message`),
and the deterministic parts are `aof` verbs owned by `@aof/integration-hyperagent`:

| Step | Verb |
|---|---|
| Is the assistant connected, are the skills rendered, is the config valid? | `aof work integrations hyperagent doctor` |
| Compose the self-contained brief (repo from `origin`, base branch, work dir, tag vocabulary, delivery rules, result-block contract) | `aof work integrations hyperagent brief <plan\|prd\|shatter\|refine> [target] --request "…"` |
| Read the planner's `AOF-PLAN-RESULT` block (PR URL, branch, status) | `aof work integrations hyperagent result <file>` |
| Validate the plan branch without touching your checkout, and flag files outside the planning lane | `aof work integrations hyperagent check <branch>` |

Between those, the session polls the planner thread with a doubling wait bounded by
`maxMinutes`, relays every planner question to you (never answering it itself), and hands you the
thread id if it runs out of time. It never merges, checks out or promotes.

`check` fetches the branch and extracts its tip into a temporary directory through a private index
file — your index, HEAD, working tree and worktree list are untouched — then runs `aof work validate`
over it and lists any changed file that is not a work record or planning document.

**One-time setup:** `claude mcp add --transport http hyperagent https://hyperagent.com/api/mcp` and
`/mcp` to sign in (or `codex mcp add hyperagent --url https://hyperagent.com/api/mcp` and
`codex mcp login hyperagent`), then the Hyperagent setup above. No credential is stored by aof.

Optional configuration (`.aof/aof.config.json`):

```json
{ "work": { "integrations": { "hyperagent": {
  "agent": "AOF Planner", "baseBranch": null, "branchPrefix": "aof/plan/", "pollSeconds": 20, "maxMinutes": 30
} } } }
```

## The package

`packages/integration-hyperagent` owns everything Hyperagent-specific in code: the runtime
declaration and capability column core's model imports, the bundle command mapping, the brief,
result parser, branch check, setup doctor and the four CLI verbs. It imports nothing from core and
spawns nothing — git and the work validator are injected by core's command registry — and each verb
loads its implementation only when it runs. The prompt bodies (the planning variants, `aof-prd`,
`AGENT.md`, `hyperplan`) stay in `packages/core/assets/`, where the bundle loader and release
packaging already read every shipped prompt.
