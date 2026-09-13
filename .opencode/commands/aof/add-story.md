---
description: Create a story — a self-contained folder (STORY.md + empty tasks/), nested inside a LIVE milestone, or standalone on the project's intake.
---

<objective>
Create a story: a `STORY.md` (the user story) + an empty `tasks/`. Either nested inside a milestone's
`stories/`, or standalone — in which case it is a top-level driver and follows the same intake rule
every other `aof:add-*` does.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`; only the exact string `"backlog"` selects the backlog. Resolve the owner with
`aof work find "<ref>" --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
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
   intentional at creation time; `aof:refine <ref>` replaces them with the scoped contract before build.
3. **A standalone story's intake.** Under `work.intake: "backlog"` it STAYS in the backlog, scheduled
   later by `aof:promote <slug>`. Under `"stream"` (or an absent key) run
   `aof work promote <slug> --json` immediately and report the minted ref. Never work a stream number
   out yourself (41/ADR-002). A NESTED story is not promoted — it has no stream number to mint.
4. If nested, add this story to the milestone's `SPEC.md` `## Stories` list.
5. If `work.agents.productOwner == "agent"`, spawn `aof-product-owner`; else inline.
6. No task features — `aof:refine <ref>` authors them. Design the story **independent** of siblings.
</process>

<progress_tracking>
Story starts `status: not-started` in `STORY.md`. When nested, it appears as an unchecked box in the
milestone `SPEC.md` `## Stories`. Its own `## Tasks` list is what tracks its progress.
</progress_tracking>

<output>
Report the path + user story. Next: `aof:refine <ref>` — for a standalone story left in the backlog,
`aof:promote <slug>` first, and then refine at the minted number.
</output>
