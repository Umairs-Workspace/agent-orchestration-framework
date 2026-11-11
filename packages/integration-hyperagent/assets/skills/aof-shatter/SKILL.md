---
aof-generated: true
name: aof-shatter
description: Shatter a planning PRD into un-numbered backlog drivers — a milestone SPEC per deliverable chunk, a spike per gating unknown — with backward-only depends edges, delivered as a draft pull request. AOF planning on Hyperagent.
---

Arguments: [PRD path - omit to auto-discover PRD-*.md] [in <group/path>]

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
  - `aof memory recall` → search the repository (code search scoped to `<work.dir>`) for the
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
  (`.claude/`, `.codex/`, `.agents/`, `.opencode/`), and never edit an item another
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
