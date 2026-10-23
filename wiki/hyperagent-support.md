# Hyperagent in AOF — the planning integration

Hyperagent is an **opt-in planning integration** — an external service a project hands planning to,
not a runtime aof renders its whole asset model into (the runtimes stay claude, codex and opencode;
`--runtime hyperagent` is an unknown runtime). It takes an idea to a reviewed roadmap — a researched
planning PRD, framed backlog milestones and spikes, then stories and task contracts — and hands the
result to the execution runtimes (Claude Code, Codex) as an ordinary pull request. It never builds,
reviews or verifies, and it is never an `aof work loop` runtime.

## Turn it on

Add the block to `.aof/aof.config.json` — an empty object is enough — and re-render:

```json
{ "work": { "integrations": { "hyperagent": {} } } }
```

```text
aof work update            # or `aof work init` in a fresh project
```

That is the same switch Notion uses: **present ⇒ on, absent ⇒ off**. A project without the block
renders nothing of Hyperagent's, and removing the block removes `/aof:hyperplan` and `.hyperagent/`
as aof-managed files on the next `aof work update`. `aof work integrations hyperagent doctor` says so
when the block is missing.

## What renders

With the integration on, `aof work init|update` renders `/aof:hyperplan` for your runtimes (a Claude
and OpenCode command, a Codex skill) and, under `.hyperagent/`, the files Hyperagent imports. Every
source lives in `packages/integration-hyperagent/assets/`:

| File | Source | What it does |
|---|---|---|
| `skills/aof-prd/SKILL.md` | `skills/aof-prd/SKILL.md` | Research and write the planning PRD (`PRD-<slug>.md`) the shatter seam reads |
| `skills/aof-shatter/SKILL.md` | `skills/aof-shatter/SKILL.md` | PRD → un-numbered backlog milestones and spikes with backward-only `depends` |
| `skills/aof-refine/SKILL.md` | `skills/aof-refine/SKILL.md` | Numbered milestone → independent stories (ADRs / research only when open); story → task `.feature` contracts |
| `skills/aof-add-milestone/SKILL.md` · `aof-add-story` · `aof-add-task` | `skills/…` | One-off additions |
| `skills/aof-validate/SKILL.md` | `skills/aof-validate/SKILL.md` | Pre-flight of the `aof work validate` rules, without the CLI |
| `AGENT.md` | `AGENT.md` | Instructions for a Hyperagent named agent ("AOF Planner") |

Each skill source is the complete `SKILL.md`, frontmatter included, written to its target verbatim
(the bundle's `asset` kind). Nothing else of aof's renders under `.hyperagent/`: no build or verify
procedure and no role agent (one planner plays the roles in turn).

The six procedure skills are **full rewrites**, not prefixed copies of the Claude procedures: each carries a *Hyperagent execution contract* that
replaces every CLI step — the repository is reached through Hyperagent's GitHub integration, writes go
to an `aof/plan/<slug>` branch and end in a **draft** pull request, `aof work promote` is never
simulated (drivers are always written un-numbered in the backlog), memory recall becomes a repository
search, and `aof work validate` is replaced by an embedded checklist while remaining the authoritative
gate the operator runs on the branch.

## Set it up in Hyperagent

1. Turn the integration on and render (above), then push — this repository enables it and ships its
   own `.hyperagent/` for that reason.
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
  run from a connected assistant — is tracked in milestone 169
  (`wiki/work/169_milestone_hyperagent-planning-runtime/`).

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

Optional configuration (`.aof/aof.config.json`; every key defaults, so `{}` turns the integration on):

```json
{ "work": { "integrations": { "hyperagent": {
  "agent": "AOF Planner", "baseBranch": null, "branchPrefix": "aof/plan/", "pollSeconds": 20, "maxMinutes": 30
} } } }
```

## The package

`packages/integration-hyperagent` owns everything Hyperagent ships — its CLI verbs and its prompts —
and reaches core through ONE contribution (`@aof/integration-hyperagent/contribution`):

```js
{ id: "hyperagent",                                   // the work.integrations key that enables it
  name: "@aof/integration-hyperagent",
  assets: { package: "@aof/integration-hyperagent" }, // its assets/bundle.json fragment
  commands: (services) => [...] }                     // brief, result, check, doctor
```

Core names it in exactly one module, `packages/core/src/integrations.mjs` (FF-16901): the bundle
loader appends the package's `assets/bundle.json` members to core's descriptor and reads each one's
text from the package, the render gate drops them unless the project enables the integration, and the
command assembly registers the verbs. A packaged binary reads the same files from its sidecar
(`bundle/packages/integration-hyperagent/`), which `build-sea.mjs` and `install-local.mjs` copy.
The package imports nothing from core and spawns nothing — git and the work validator are injected —
and each verb loads its implementation only when it runs. A new integration is one package plus one
line in that registry.
