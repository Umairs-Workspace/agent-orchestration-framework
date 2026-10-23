---
aof-generated: true
name: aof-add-task
description: Add one AOF task .feature contract to a numbered story, delivered as a draft pull request. AOF planning on Hyperagent.
---

Arguments: <task description> [under story <ref>]

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
