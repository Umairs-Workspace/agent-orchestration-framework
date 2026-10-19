---
name: aof-prd
description: Research and write an AOF planning PRD (PRD-<slug>.md) that aof-shatter can consume — objective, context and constraints, in/out scope, milestone-sized chunks, open questions, and cited research — then open a draft pull request with it. Hyperagent planning runtime only.
---
# aof-prd (Hyperagent)

Write the **planning PRD** — the seam document AOF's shatter step consumes to lay out a milestone
roadmap. This is the one AOF procedure that *does* write product intent: it turns an idea, a problem
statement or a pile of notes into a researched, scoped PRD. It never frames milestones itself — that
is `aof-shatter`, run next.

The user's request is the idea or problem to plan, plus (optionally) the target repository.

## Where it goes

- In a repository that keeps planning documents in `wiki/planning/`, write
  `wiki/planning/PRD-<slug>.md` (and, when research is substantial, `wiki/planning/RESEARCH-<slug>.md`).
  Otherwise write `PRD-<slug>.md` at the repository root — the location shatter auto-discovers.
- All writes follow the same rules as every AOF Hyperagent skill: the connected GitHub integration
  only, a branch `aof/plan/<slug>` (never the default branch), one commit per logical step, and a
  **draft** pull request at the end. Never claim to have run an `aof` command.

## Procedure

1. **Understand the ask.** Restate the problem in one paragraph and ask the person the two or three
   questions that most change the plan (who it is for, what "done" looks like, hard constraints).
   Do not interrogate — infer what the conversation already answers.
2. **Ground it in the repository.** Read the `README`, `AGENTS.md` / `CLAUDE.md`, the existing PRDs
   under `wiki/planning/`, `<work.dir>/ROADMAP.md`, and the backlog, so the PRD builds on what exists,
   names the items it depends on by their stream numbers or backlog slugs, and duplicates nothing.
   Read the code the initiative will touch enough to state real constraints, citing paths.
3. **Research the unknowns.** Use web research for prior art, standards, vendor capabilities and
   risks. Every external claim carries its URL. Separate *facts found* from *your recommendation*.
   An unknown that would gate a milestone and cannot be settled now is recorded as an open question
   (shatter turns it into a spike).
4. **Write the PRD** in this shape — the headings are the contract shatter reads:

   ```markdown
   # PRD — <Initiative title>

   > One-paragraph summary: what, for whom, and why now.

   ## Objective

   **Objective.** <the outcome an outsider could verify was met — one paragraph>

   ## Context & Constraints

   - <what exists today, with repository paths> · <constraints: technical, regulatory, budget>

   ## Scope

   ### In scope
   - <capability> — <why it is in>

   ### Out of scope
   - <excluded thing> — <reason / where it is deferred>

   ## Milestones

   1. **<Milestone-sized chunk>** — <the deliverable behaviour, one or two lines>
   2. **<…>** — <…> (depends on 1 because …)

   ## Open questions

   - <a question with a real answer> — <what it blocks; a spike candidate if it gates a milestone>

   ## Research

   - <finding> — <source URL>

   ## Success measures

   - <observable measure>
   ```

   Keep each milestone a *deliverable behaviour*, independently shippable where possible, in the
   order it should be delivered; write dependencies in prose ("depends on 1 because …").
5. **Deliver.** Push the PRD (and research doc) to the plan branch and open a draft pull request
   whose body summarises the objective, lists the milestones and open questions, and links the
   sources. Offer to run `aof-shatter` on it next, in this same conversation and on the same branch.

## Guardrails

- A PRD is upstream and historical: once shattered, the milestone SPECs are the source of truth and
  the PRD is never edited to match them.
- Recommend, don't decide, on anything the person owns (pricing, policy, priorities) — put the
  options and their costs in `## Open questions`.
- No code, no tests, no work-item folders from this skill.
