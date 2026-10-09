---
name: "aof-add-story"
description: "Create a story — a self-contained folder (STORY.md + empty tasks/), nested inside a LIVE milestone, or standalone on the project's intake."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <story description> [under milestone NN] [--in-stream]

Use the native skill $aof-add-story; $ARGUMENTS is the operator text after its name.

## Codex execution contract
Use only tools actually exposed by this session. File reading/editing, shell execution, search,
browser/image tools and native role tools are capability-dependent; Claude tool aliases are not
permissions. Instruction-level read-only boundaries do not claim enforced sandbox isolation.
In solo mode perform required roles inline and spawn nothing. Orchestrated independent work
requires a native launcher such as spawn_agent when exposed, independent context and support
for each selected model/effort; otherwise report native-role-capability-unavailable or
native-role-setting-unsupported before claiming independence. Stay within the resolved dispatch
bound and review/no-progress bounds. Read role settings from work.agents.runtimes.codex.
Never infer the primary assistant from the delegation toggle.
For questions, use an available native question tool, or ask explicitly in the conversation when
that tool is unavailable. Required answers remain pending until received. A driven business question
retains its map token and one-question-per-ask form. Permission approval uses the host approval flow,
not a question tool or elapsed time. AOF_NEEDS_INPUT is for an actually unanswered blocked turn,
never a fabricated native capability.

<objective>
Create a story: a `STORY.md` (the user story) + an empty `tasks/`. Either nested inside a milestone's
`stories/`, or standalone — in which case it is a top-level driver and follows the same intake rule
every other `$aof-add-*` does.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`; only the exact string `"backlog"` selects the backlog. Resolve the owner with
`aof work find "<ref>" --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
`--in-stream` may appear anywhere in the arguments and is removed from them before the slug and
title are derived; it decides only step 3.
1. **Under a milestone** (`under milestone NN`) — resolve it with `aof work find "<NN|slug>" --json`
   FIRST, and read the row you get back:
   - a LIVE milestone (it carries a number and is not archived) → create inside its `stories/` as
     `<SS>_story_<slug>/` (`SS` = next local index there). The nested index is the milestone's own
     local axis, not a stream number, and it is unchanged by the intake.
   - a row answering `number: null` → **STOP**: "promote first — `aof work promote <slug>`". A
     backlog driver has no `stories/` (ADR-005 §4); the milestone must enter the stream before it can
     own a story. Scaffold nothing.
   - an ARCHIVED milestone (`archived: true`) → **STOP**: archived is out. Archived work is closed;
     name a live milestone or promote a backlog one.
   **Standalone** (no `under`): a story is then a top-level DRIVER and follows the driver rule — the
   folder is `<work.dir>/backlog/[<group>/]story_<slug>/`, un-numbered, under EITHER setting.
2. Scaffold (template: `.aof/templates/work/story/STORY.md`): `STORY.md` frontmatter (`type: story`,
   `number` — the nested local index when nested, a bare `number:` with NO value when standalone —
   `slug`, `title`, `parent: <milestone NN if nested, else omitted entirely>`, `status: not-started`,
   `owner: product-owner`, `created`/`updated`: today, `reads: []`, `files: []`); `## User story`
   (real "so that"); `## Tasks` (empty); `## Notes`. Empty `tasks/`. The empty read/write sets are
   intentional at creation time; `$aof-refine <ref>` replaces them with the scoped contract before build.
3. **A standalone story's intake.** With `--in-stream`, run `aof work promote <slug> --json` straight
   after the scaffold, whatever `work.intake` says, and report the minted ref. That promote names no
   position, so the story lands at the tail. Without the switch, under `work.intake: "backlog"` it
   STAYS in the backlog, scheduled later by `$aof-promote <slug>`. Under `"stream"` (or an absent key)
   run `aof work promote <slug> --json` immediately and report the minted ref. A promote refusal after
   `--in-stream` is reported as a stop, and the story stays where it was scaffolded, in the backlog:
   never reach around the refusal by editing the tree. Never work a stream number out yourself
   (41/ADR-002). A NESTED story is not promoted — it has no stream number to mint.
4. If nested, add this story to the milestone's `SPEC.md` `## Stories` list.
5. If `work.agents.productOwner == "agent"`, spawn `aof-product-owner`; else inline.
6. No task features — `$aof-refine <ref>` authors them. Design the story **independent** of siblings.
</process>

<progress_tracking>
Story starts `status: not-started` in `STORY.md`. When nested, it appears as an unchecked box in the
milestone `SPEC.md` `## Stories`. Its own `## Tasks` list is what tracks its progress.
</progress_tracking>

<output>
Report the path + user story. Next: `$aof-refine <ref>` — for a standalone story left in the backlog,
`$aof-promote <slug>` first, and then refine at the minted number. With `--in-stream`, report the
minted ref, and next is `$aof-refine <NN>`.
</output>
