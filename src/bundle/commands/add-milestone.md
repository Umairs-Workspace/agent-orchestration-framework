---
description: Capture a new ACD milestone — scaffold its self-contained folder (SPEC + STATE, spine only) on the project's intake. Un-numbered in the backlog, or appended to the stream through `aof work promote`.
argument-hint: "<short milestone description> [in <group/path>]"
allowed-tools: [Read, Grep, Glob, Bash, Write, Task, AskUserQuestion]
---
<objective>
Frame a new milestone: a self-contained folder with its SPEC + STATE. Its stories are added later by
`aof:refine`. The item is BORN UN-NUMBERED on the project's intake — a number is minted by one verb,
`aof work promote`, and by nothing else (ADR-003 §1, ADR-005 §3).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`, so an existing project is unchanged without a migration; only the exact string
`"backlog"` selects the backlog. Resolve refs with `aof work find` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **The folder — the backlog, under either setting.** Slug = kebab. An optional group comes from the
   arguments (`in <group/path>`) and is a PATH and nothing more. The folder is
   `<work.dir>/backlog/[<group>/]milestone_<slug>/`: that is where a new milestone is written
   whichever way `work.intake` is set. Do NOT work out a stream number — there is none yet, and
   deciding one is `aof work promote`'s job (41/ADR-002).
2. Scaffold (templates: `.aof/templates/work/milestone/`):
   - `SPEC.md` — frontmatter (`type: milestone`, a bare `number:` with NO value, `slug`, `title`,
     `status: not-started`, `owner: product-owner`, `created`/`updated`: today); the heading is
     `# <Title>` with no number prefix; `## Objective`; `## Scope` (in/out); `## Stories` (empty —
     "to be broken down"); `## Dependencies`.
   - `STATE.md` — frontmatter `doc: state`; `## Progress`; `## Notes & decisions`; `## Verification`.
3. **Then the intake decides whether it stays there.** Under `work.intake: "backlog"` it STAYS: the
   item is captured, and `aof:promote <slug>` is what later schedules it (and the only way to name a
   position). Under `"stream"` (or an absent key) run `aof work promote <slug> --json` immediately and
   report the minted ref — the item lands appended at the tail, which is where `add-milestone` has
   always put it.
4. Ask only the framing questions you can't infer (the objective, the scope boundary).
5. If `work.agents.productOwner == "agent"`, spawn `aof-product-owner` to author SPEC; else inline.
6. Frame ONLY — no stories, no conditional docs, no code (absence is information).
</process>

<progress_tracking>
The milestone starts at `status: not-started` in `SPEC.md` frontmatter. Its `## Stories` list is the
checklist that drives it to done — populated by `aof:refine`, ticked off as stories accept.
</progress_tracking>

<output>
Report the path + objective. Under `"backlog"`: next is `aof:promote <slug>` to schedule it (then
`aof:refine <NN>`). Under `"stream"`: report the minted ref, and next is `aof:refine <NN>` to break it
into stories.
</output>
