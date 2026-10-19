# Hyperagent planning variants

The planning subset of the ACD bundle, rewritten for the Hyperagent runtime (`aof work init --runtime
hyperagent`). Each section is a full replacement of its command's procedure for an agent that reaches
the repository through the GitHub integration and delivers a draft pull request instead of running
the `aof` CLI in a checkout. Only commands with a section here are rendered for Hyperagent; the
build / review / verify procedures stay with the execution runtimes (Claude Code, Codex).
See wiki/hyperagent-support.md.

<!-- variant:shatter -->
# aof-shatter (Hyperagent)

Turn a planning PRD into the roadmap of framed **drivers** in the backlog: a **milestone** per
deliverable-behaviour chunk (a framed `SPEC.md`) and a **spike** per blocking unknown that must be
resolved before a milestone can be committed (a framed `SPIKE.md`). This is the one batch session
that sees every driver at once, so it is where cross-driver `depends` edges are authored. It frames;
it never breaks a milestone into stories and never writes product strategy. PRD → drivers, never back.

$ARGUMENTS is the PRD path (optional) and an optional `in <group/path>`.

## Procedure

1. **Resolve the PRD.** An explicit path in $ARGUMENTS wins. Otherwise look for exactly one
   `PRD-*.md` at the repository root, then in `wiki/planning/`. Zero or several candidates → ask
   which one (or offer to write one first with the `aof-prd` skill). Never guess among other `*.md`.
   A plan that is only one milestone needs no shatter: use `aof-add-milestone` instead.
2. **Read the seam, not the whole PRD:** the objective, the in/out scope, and enough structure
   (its `## Milestones` / features) to cut milestone-sized chunks. Before cutting, search the
   repository's `RETROSPECTIVE.md` / `ARCHITECTURE.md` files once for the PRD's objective and scope
   keywords; a surfaced lesson that moves a boundary is acknowledged in the `## Scope` or
   `## Dependencies` prose of the driver it changed.
3. **Partition and type the drivers, in PRD order.**
   - Deliverable behaviour → **milestone**.
   - An unknown big enough to *gate a milestone* → **spike**, placed before the milestone it gates.
     An unknown resolvable inside one milestone is not a spike — that milestone's refine settles it.
   - Never a `chore`: housekeeping has no PRD representation.
   Read the existing backlog and stream first so no new slug collides and no driver duplicates an
   item that already exists (depend on it instead). Ask the person only about a genuine boundary or
   milestone-vs-spike ambiguity — and when the PRD leaves a real unknown, research it before framing,
   citing sources in the driver's prose.
4. **Frame each driver from its template, un-numbered in the backlog.**
   - Milestone → `<work.dir>/backlog/[<group>/]milestone_<slug>/SPEC.md`: frontmatter (`type:
     milestone`, bare `number:`, `slug`, `title`, `status: not-started`, `owner: product-owner`,
     `created`, `updated`, `schema`, `aofVersion`, `origin:` → the PRD path, `depends:` when it has
     edges); heading `# <Title>`; `## Objective`, `## Scope` (In scope / Out of scope), an empty
     `## Stories` ("to be broken down"), `## Dependencies`. Add `STATE.md` (frontmatter `doc: state`;
     `## Progress`, `## Notes & decisions`, `## Verification`) with one progress line saying it was
     framed by Hyperagent from the PRD.
   - Spike → `<work.dir>/backlog/[<group>/]spike_<slug>/SPIKE.md`: `type: spike`, bare `number:`,
     `timebox:`, `origin:` → the PRD; `## Question` (an answerable question, not a task),
     `## Timebox`, and empty `## Investigation` / `## Finding` / `## Outcome / Next`. A spike has no
     `stories/` and no `.feature`.
5. **Author `depends` now — backward-only in PRD order.** To another driver of this shatter: its
   slug. To an item already in the stream: its number. The edge goes in frontmatter; the *why* goes
   in `## Dependencies` prose (for a spike gate, name the finding the milestone waits on). Omit
   `depends` for an independent driver — absence means parallel-eligible. Check the graph resolves
   and is acyclic.
6. **Validate and deliver.** Apply the validate checklist to every driver, push them to the plan
   branch in one commit, and open or update the draft pull request.

## Guardrails

- Frame, don't break down: a milestone's stories are `aof-refine` after the operator promotes it.
- Consume, don't plan: never edit the PRD to match the drivers — it is a historical upstream.
- `depends` is authored here and never inferred later.

## Output

Report the PRD consumed, each driver in PRD order (slug, title, **milestone** or **spike**), the
`depends` graph with its rationale, the checklist result, and the pull request. Next for the
operator, on the branch: `aof work validate`, then `aof:promote <slug>` for each driver in PRD order
as they schedule it; once a milestone has a number, `aof-refine <NN>` (here) or `/aof:refine <NN>`
breaks it into stories.

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.

<!-- variant:refine -->
# aof-refine (Hyperagent)

Deepen a **numbered** work item: break a milestone into **independent** stories (producing
`ARCHITECTURE.md` / `RESEARCH.md` / `DESIGN.md` only for genuine open questions), or author a story's
task `.feature` contracts by playing the Three Amigos in turn. Refine produces decisions and locked
contracts; it builds nothing.

$ARGUMENTS is the item ref: `NN` (a milestone), `NN/SS` (a story of milestone NN), or a slug.

## Procedure

1. **Resolve the ref** by reading `<work.dir>`: `NN_milestone_<slug>/` or
   `NN_milestone_<slug>/stories/SS_story_<slug>/`.
   - **A backlog ref is a stop.** An item under `<work.dir>/backlog/` has no number, and every story
     and contract is keyed by one. Tell the operator to run `aof:promote <slug>` (or
     `aof work promote <slug>`) and come back with the minted number. Do not refine it un-numbered.
   - **A spike or chore is declined**: neither groups stories nor carries a task contract. Point at
     its own record doc (`## Finding`, or `## Definition of Done`) and write nothing.
   - **A `done` item is declined**: never re-author a delivered contract.
2. **Milestone — Decide, then Break down.**
   - *Recall first:* search the repository's `RETROSPECTIVE.md` / `ARCHITECTURE.md` files for the
     milestone's objective keywords and acknowledge any lesson that bears on a decision.
   - *Decide only what is genuinely open.* A blocking unknown → research it and write `RESEARCH.md`
     (each finding with its source URL, and the decision it unblocks). A non-trivial design choice →
     an ADR in `ARCHITECTURE.md` (numbered `ADR-NNN`, context / decision / consequences, immutable
     once accepted) plus any fitness function it implies, declared in the `## Fitness functions`
     register with its id alone in the first cell, its invariant, its intended test path in the
     runnable test tree and the token `pending` (the file lands with its subject, never under
     `<work.dir>`). A UI surface → `DESIGN.md` with, per surface, either a committed mock path or the
     binding checklist (regions in order, components per region, empty/loading/error/populated
     states). Skip whatever the milestone does not need — absence is information.
   - *Break down* into stories that minimise cross-story coupling. Read the source the milestone
     touches and draw boundaries along real import / call coupling — a boundary that cuts a file away
     from the modules that import it is a bad cut — and cite that coupling in the breakdown rationale.
     For each story create `stories/SS_story_<slug>/STORY.md` (`type: story`, `number: SS`, `parent:
     NN`, `status: not-started`, `owner: product-owner`, dates, `schema`, `aofVersion`) with a real
     user story ("so that" is a challengeable benefit, not a reworded want), an empty `## Tasks`, and
     `## Notes`. Declare `reads:` (the exact files the build needs; an ADR as
     `<path>/ARCHITECTURE.md#<adr-anchor>`) and `files:` (every file the story may write, including
     the test file that owns each source file). Derive both from the code you read; never leave them
     to be inferred from prose later. List every story in the milestone's `## Stories`.
3. **Story — Contract (Three Amigos, played in turn).**
   - If `.aof/aof.config.json` has `work.examples.enabled: true` (the boolean only), first write the
     story's `EXAMPLES.md` example map from `.aof/templates/work/story/EXAMPLES.md`: rules, two or
     three key examples per rule with real values including the awkward edge, and the questions the
     record cannot answer. Strike every question the record already answers, label engineering
     choices `technical`, and ask the person each remaining `business` question, opening with its
     token (`NN/SS Q1 · …`). An example is `proposed` until the person's answer makes it `confirmed`
     or `stated`; an unanswered business question leaves the story at the contract gate with no
     `tasks/` written.
   - As **product owner**, write each task's headline Scenarios; as **QA**, push the case matrix into
     `Scenario Outline` Examples tables (status codes, boundaries, malformed input); as **developer**,
     check each is feasible against the code you read. One `tasks/SS_<slug>.feature` per coherent
     unit of work, from the task template. With an applicable example map, one `Rule:` per map rule
     and one headline Scenario per confirmed or stated example, titled with its id.
   - **Litmus every line:** could a black-box tester confirm it without reading the source? If not,
     it is a decision — move it to an ADR or a fitness function. Keep each feature well under 150
     lines and cite ADRs by id, never by quotation.
   - Tick nothing; list each task in the story's `## Tasks`.
4. **Validate and deliver.** Apply the validate checklist, push to the plan branch, and update the
   draft pull request with the stories / contracts written and every open question.

## Output

Report what was decided (ADRs, research findings with sources), the stories with their boundaries
and read/write sets, or the contracts written per story, plus the checklist result and the pull
request. Next for the operator, on the branch: `aof work validate` and `aof work doctor <ref>`, then
`/aof:continue <ref>` in Claude Code or `$aof-continue <ref>` in Codex to build it.

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.

<!-- variant:add-milestone -->
# aof-add-milestone (Hyperagent)

Frame one new milestone — a self-contained folder with its `SPEC.md` and `STATE.md` — un-numbered in
the backlog. Its stories come later from `aof-refine`, after the operator promotes it.

$ARGUMENTS is a short milestone description and an optional `in <group/path>`.

## Procedure

1. Derive a kebab slug and a title. Read `<work.dir>/backlog` and the stream so the slug collides
   with nothing and the milestone does not duplicate an existing item.
2. Ask only the framing questions you cannot infer — the objective, and where the scope boundary
   falls. When the description rests on an unknown worth researching, research it and cite sources.
3. Write `<work.dir>/backlog/[<group>/]milestone_<slug>/`:
   - `SPEC.md` — frontmatter `type: milestone`, a bare `number:`, `slug`, `title`, `status:
     not-started`, `owner: product-owner`, `created`/`updated` today, `schema`, `aofVersion`
     (`depends:` only for a real edge — a backlog slug or a stream number); heading `# <Title>`;
     `## Objective` (intent an outsider could verify was met), `## Scope` (In scope / Out of scope,
     each out-of-scope line with its reason), `## Stories` ("to be broken down"), `## Dependencies`.
   - `STATE.md` — frontmatter `doc: state`; `## Progress`, `## Notes & decisions`, `## Verification`.
4. Frame only: no stories, no conditional docs, no code. Apply the validate checklist, push to the
   plan branch, open or update the draft pull request.

## Output

The path and objective, and the pull request. Next for the operator: `aof work validate`, then
`aof:promote <slug>` to schedule it, then `aof-refine <NN>`.

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.

<!-- variant:add-story -->
# aof-add-story (Hyperagent)

Add one story — inside a **numbered** milestone (`stories/SS_story_<slug>/`), or standalone and
un-numbered in the backlog (`<work.dir>/backlog/story_<slug>/`).

$ARGUMENTS is a short story description and, optionally, the parent milestone (`in NN` or `in
<milestone slug>`).

## Procedure

1. **Place it.** With a numbered parent, the story is `NN_milestone_<slug>/stories/SS_story_<slug>/`
   where `SS` is the next two-digit number after the milestone's existing stories, and `parent: NN`.
   A parent that is still in the backlog is a stop: ask the operator to promote it first. Without a
   parent, the story is standalone in the backlog: bare `number:` and no `parent`.
2. **Write `STORY.md`** from the story template: `type: story`, `slug`, `title`, `status:
   not-started`, `owner: product-owner`, dates, `schema`, `aofVersion`, `reads: []`, `files: []`
   (refine fills these); `## User story` (As a… I want… so that… — a real, challengeable benefit),
   an empty `## Tasks`, `## Notes`. A milestone-bound story is also listed in its milestone's
   `## Stories`.
3. Ask only for what you cannot infer (the beneficiary, the benefit). Frame only — no tasks yet.
   Apply the validate checklist, push to the plan branch, open or update the draft pull request.

## Output

The story path and its user story, and the pull request. Next: `aof-refine NN/SS` to author its
contracts (once the story is numbered).

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.

<!-- variant:add-task -->
# aof-add-task (Hyperagent)

Add one task contract — a `tasks/SS_<slug>.feature` inside a **numbered** story — whose Scenarios
are its acceptance criteria.

$ARGUMENTS is a short task description and the story (`in NN/SS`).

## Procedure

1. Resolve the story folder `NN_milestone_<slug>/stories/SS_story_<slug>/` (or a numbered standalone
   story). A backlog story is a stop: ask the operator to promote it first. A `done` story is
   declined.
2. Read the story's user story, its milestone `SPEC.md`, and any ADRs it `reads:`; read the code it
   will touch so the contract is feasible.
3. Write `tasks/TT_<slug>.feature` from the task template (`TT` = next two-digit task number):
   the layer / refinement / domain tags from `work.tags`, exactly one of `@executable` / `@manual` /
   `@uat` per Scenario, an optional "In order to …" goal line (never a user story), headline
   Scenarios, and a `Scenario Outline` with an Examples table for the case matrix. Every `Then` must
   be black-box confirmable; anything else is a decision for an ADR. Keep it well under 150 lines.
4. List the task in the story's `## Tasks`. Apply the validate checklist, push to the plan branch,
   open or update the draft pull request.

## Output

The feature path and its scenarios, and the pull request.

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.

<!-- variant:validate -->
# aof-validate (Hyperagent)

Check that the work items in the repository — or the ones on the current plan branch — are
well-formed, without the `aof` CLI. Read-only: modify nothing.

$ARGUMENTS is an item ref, a branch name, or nothing (the whole backlog plus the stream's open items).

## Procedure

1. Read `.aof/aof.config.json` for `work.dir` and `work.tags`, then read the in-scope folders from
   the named branch (default: the plan branch if one exists in this conversation, else the default
   branch).
2. Apply every rule of the validate checklist and report each finding as
   `<path> — <what is wrong> — <the fix>`.
3. Add the agent-only layer the CLI also leaves to agents: flag `Then` steps that read like design or
   implementation assertions (litmus), a feature longer than 150 lines, and a user story inside a
   feature.

## Output

Findings grouped as **structure** (checklist), **depends graph**, and **litmus**, then a verdict:
**PASS (checklist)** or the list of fixes. Always add that the authoritative gate is
`aof work validate` (and the advisory `aof work doctor`) run on the branch — this check is a
pre-flight, not a substitute.

## Hyperagent execution contract

You are running in **Hyperagent**, not in a terminal beside a checkout. These rules replace every
place the AOF procedure assumes a local shell:

- **The repository is reached through the connected GitHub integration only** — read a file or
  directory, search code, create a branch, push files in one commit, open a pull request. There is no
  checkout and no `aof` binary: never claim to have run an `aof …` command. Ask the user which
  `owner/repo` (and which connected account) when the conversation has not already named one.
- **Never write to the default branch.** All writes land on one branch, `aof/plan/<slug>` (create it
  from the default branch if it does not exist; reuse it when the user continues the same plan), as
  few commits as the work allows — one `push_files` per logical step, every file of that step in it.
  Read back what you pushed when a file is large. Finish by opening (or updating) a **draft** pull
  request whose body lists every file written, the open questions, and the operator's next commands.
- **Configuration and templates come from the repository.** Read `.aof/aof.config.json`: `work.dir`
  (default `./wiki/work`), `work.intake`, and `work.tags` (the closed tag vocabulary — `layers`,
  `refinements`, `domains`). Read the templates from `.aof/templates/work/<type>/` when present; when a
  template is missing, use the shape this skill states and say so in the pull request.
- **CLI steps are replaced, never simulated.**
  - `aof work find` / `aof work list` → read `<work.dir>` and `<work.dir>/backlog` as directories.
    Folder names are `NN_<type>_<slug>` in the stream and `<type>_<slug>` in the backlog.
  - `aof work promote` → **never**. A number is minted by the operator's `aof work promote` and by
    nothing else; every driver you create is written **un-numbered in the backlog**, whatever
    `work.intake` says, and the pull request tells the operator to promote it.
  - `aof work memory recall` → search the repository (code search scoped to `<work.dir>`) for the
    keywords in `RETROSPECTIVE.md`, `ARCHITECTURE.md` and `TECH_DEBT.md`; acknowledge a lesson that
    bears on the framing in prose, citing its path. There is no recall ledger to write.
  - `aof graph build` / `aof graph impact` → read the source and its imports directly; say the
    coupling was read, not graphed.
  - `aof work validate` / `aof work doctor` → apply the **validate checklist** below to every file
    you wrote, and state in the pull request that `aof work validate` on the branch is the
    authoritative gate the operator (or CI) still runs.
  - `aof work run-start` / `run-complete` → nothing; Hyperagent records its own thread.
- **Questions go to the person.** Ask genuine boundary, type and business-rule questions in the
  conversation (with a structured question tool when one is available). Never invent a business
  answer, and never treat silence as approval.
- **Research is your strength — cite it.** Use web research for unknowns, and put every external
  claim behind a URL in the document that relies on it.
- **Stay in the planning lane.** Write record documents (PRD, SPEC, SPIKE, STATE, ARCHITECTURE,
  RESEARCH, STORY, task `.feature`). Never write source code, tests, or rendered runtime folders
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`, `.hyperagent/`), and never edit an item another
  phase owns (`VERIFICATION.md`, `RETROSPECTIVE.md`, a `done` item).

### Validate checklist (apply before every push)

1. **Folder ↔ frontmatter.** Stream folder `NN_<type>_<slug>` has `type`, `number: NN`, `slug`
   equal to its parts; backlog folder `<type>_<slug>` has `type`, `slug`, and a bare `number:` with
   **no value**. `slug` is lower-case kebab (`[a-z0-9-]+`).
2. **Required frontmatter.** `title` (quoted), `status: not-started` for anything new, `owner`,
   `created` and `updated` (today, `YYYY-MM-DD`), `schema: 1` unless the template states another,
   `aofVersion` copied from a sibling record doc (or the template).
3. **Headings.** A backlog driver's heading is `# <Title>` with no number; a stream item's is
   `# NN · <Title>`.
4. **`depends`.** On a backlog driver, an edge to another backlog driver is that driver's **slug**,
   an edge to a stream item is its **number**; backward-only in the order you framed them; no cycle;
   every target exists. Omit `depends` when a driver is independent.
5. **Stories** (inside a numbered milestone only): folder `stories/SS_story_<slug>/`, `parent:` the
   milestone number, `reads:` and `files:` as inline lists of project-root-relative paths.
6. **Tasks.** `tasks/SS_<slug>.feature`; every Scenario carries exactly one of `@executable`,
   `@manual` or `@uat`; every other tag is in `work.tags`; never a `@milestone-NN` tag; no user story
   inside a feature.
7. **No slug collisions** across the whole backlog tree.
