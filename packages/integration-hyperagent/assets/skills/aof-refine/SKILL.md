---
aof-generated: true
name: aof-refine
description: Refine a numbered AOF work item — break a milestone into independent stories with researched ADRs, or author a story's task .feature contracts (Three Amigos) — delivered as a draft pull request. AOF planning on Hyperagent.
---

Arguments: <item ref - NN or slug> [--autonomous] [--solo | --orchestrated] [--thinking <level>]

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
