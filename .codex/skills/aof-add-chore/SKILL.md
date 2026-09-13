---
name: aof-add-chore
description: Capture a chore — a top-level housekeeping driver scaffolded on the project's intake as chore_slug/CHORE.md. Groups no stories, carries no .feature; its deliverable is a ticked checklist. Numbered by aof work promote, resolved later by aof:verify.
---

<!-- aof-generated: true; aof-runtime: codex -->

Use this skill when the user asks for `$aof-add-chore <the housekeeping to do> [in <group/path>] [depends NN[,NN…]]`, or asks to run the AOF `aof:add-chore` procedure in Codex.

Where this procedure mentions `$ARGUMENTS`, use the text the user supplied after the skill name.
Where it mentions Claude slash command `/aof:add-chore`, treat that as this Codex skill invocation.

<objective>
Frame a **chore**: a self-contained `chore_<slug>/CHORE.md` folder, born un-numbered on the project's
intake and given its number by one verb, `aof work promote`. A chore is a top-level DRIVER
(the `uat` shape, ADR-001) — it delivers no new behaviour and groups no stories; it exists to sequence
housekeeping (a migration, a config tidy-up, a cleanup discovered mid-build) *before* whatever depends
on it. It gates the stream: downstream work that `depends:` on it waits until it is `done`. A chore is
created **ad-hoc, in the moment the need is found** — it never falls out of `aof:shatter` (that's a
milestone/spike-only concern, ADR-004).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`; only the exact string `"backlog"` selects the backlog. Resolve refs with
`aof work find` / `aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **The folder — the backlog, under either setting.** Slug = kebab (e.g. `tidy-config`). An optional
   group comes from the arguments (`in <group/path>`) and is a PATH and nothing more. The folder is
   `<work.dir>/backlog/[<group>/]chore_<slug>/`: that is where a new chore is written whichever way
   `work.intake` is set. Do NOT work out a stream number — deciding one is `aof work promote`'s job
   (41/ADR-002).
2. **Scope (`depends:`).** Leave `depends: []` unless this chore itself needs a prior driver resolved
   first. If given explicitly (`depends NN,NN`), write those entries AS GIVEN — they are a planning
   note until promotion, which is where they are VALIDATED (a numeric ref must resolve; an entry
   naming another backlog slug is refused, so promote that one first or drop the entry).
3. **Scaffold** (template: `.aof/templates/work/chore/CHORE.md`): frontmatter (`type: chore`, a bare
   `number:` with NO value, `slug`, `title`, `status: not-started`, `owner`, `created`/`updated`:
   today, `depends: [...]`); the heading is `# <Title>` with no number prefix; `## Intent` (what
   housekeeping + why, one or two sentences); `## Definition of Done` (a checkbox list of concrete
   checkable items — the close criterion, always include `aof work validate` green); `## Notes`
   (optional).
4. **Then the intake decides whether it stays there.** Under `work.intake: "backlog"` it STAYS:
   `aof:promote <slug>` is what later schedules it, and the only way to name a position. Under
   `"stream"` (or an absent key) run `aof work promote <slug> --json` immediately and report the
   minted ref — appended at the tail, as `add-chore` has always landed it.
5. Ask only the framing questions you can't infer (the intent, the checklist items).
6. **Frame ONLY** — no boxes ticked yet (that's the chore running, then `aof:verify`). No `tasks/`, no
   `.feature`, no user story — a chore carries no behavioural contract.
</process>

<progress_tracking>
The chore starts at `status: not-started` in `CHORE.md` frontmatter. Doing the work (ticking
`## Definition of Done` boxes) and flipping it to `done` — which unblocks anything that `depends:` on
it — is `aof:verify <NN>`: confirms every box is ticked **and** `aof work validate` is green (no
regression). No `.feature`, no behavioural verify.
</progress_tracking>

<output>
Report the path + the intent, and — when `depends` was given — that the entries are validated at
promotion. Under `"backlog"`: next is `aof:promote <slug>`. Under `"stream"`: report the minted ref.
Then do the housekeeping, tick the checklist, and `aof:verify <NN>`.
</output>
