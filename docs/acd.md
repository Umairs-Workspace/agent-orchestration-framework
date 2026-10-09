---
title: "ACD – Agent-Centric Delivery"
permalink: /acd/
---
<!--
  docs/acd.md – the ACD page (authored). Part of the committed shell; the first link on the landing
  page. Describes the delivery model aof implements, in prose, for a reader deciding whether to
  use it. Commands named here are real routes; keep them so.
-->

# ACD – Agent-Centric Delivery

ACD is the delivery model `aof work` implements: work is broken into items that an agent team can
take from an idea to an accepted, verified change without a human in every loop, and every claim
the process makes is written down where a check can read it. It runs entirely in the repository –
Markdown records under `wiki/work/`, `.feature` files as the contract, no service, no database.

## The model

**A milestone groups stories; a story groups tasks.** Each is a self-contained folder with a record
document and a frontmatter `status`. Three lighter item types sit beside them: a **chore**
(housekeeping with a ticked checklist as its deliverable), a **spike** (an investigation whose
deliverable is a recorded finding), and a **uat session** (a cross-milestone human acceptance gate).

```txt
wiki/work/125_story_the-loop-graph-gets-a-published-face/
  STORY.md            # the user story, the contract's reads:/files: declaration, status
  PLAN.md             # the build brief – advisory, never the contract
  tasks/00_….feature  # the acceptance criteria: Gherkin scenarios, one file per task
  VERIFICATION.md     # evidence, findings, sign-off, the accept decision
  RETROSPECTIVE.md    # what building it taught
  OUTCOME.md          # what the system now is, stated as product state
```

The **story is the unit of independence**: its boundary follows real coupling so stories build in
parallel, and a `depends:` graph orders what cannot. `aof work next` walks that graph.

## The contract is a `.feature`

A task's acceptance criteria are Gherkin scenarios. Every scenario carries exactly one
verification tag, and the tag decides who proves it:

| tag | proven by |
|---|---|
| `@executable` | an automated test, green in the suite |
| `@manual` | an agent running a procedure and recording the evidence |
| `@uat` | a human, at accept – the only point a person is pulled in |

The **litmus**: a scenario states observable behaviour, never implementation or visual fidelity.
A `Then` that reads like a design assertion is flagged; design is judged from a rendered
screenshot against `DESIGN.md`, not asserted in a feature. A delivered `.feature` is never edited
– a new rule lands in a new item's contract.

## The lifecycle

Three commands carry an item through, and each is a slash command in Claude Code
(`/aof:refine`, `/aof:continue`, `/aof:verify`) or a Codex skill:

1. **Refine** – a milestone is broken into independent stories; a story's tasks are authored by the
   **Three Amigos**: the product owner writes the scenarios, QA the example tables, the developer
   the feasibility check. Architecture decisions land as numbered ADRs with **fitness functions**
   (`FF-NN`) – tests that make a structural rule fail when it is broken. Design and research
   records appear only when the item needs them.
2. **Continue** – the developer builds each task to green against the locked contract, then a
   structural review (architect) and a behavioural review (QA) run and their findings are fixed in
   the same round. The item ends `in-review`. To write the code yourself, `/aof:continue <ref> --manual`
   hands the operator a guide instead – the scenarios still red, the contract, the files that matter
   and why, the tests to turn green and an order to take the tasks in – and builds nothing. Then
   `/aof:review <ref>` reviews the operator's build before `/aof:verify`: the same gate and review
   lanes, every finding handed back, no code touched.
3. **Verify** – the `@executable` suite and fitness functions run; `@manual` procedures are run and
   recorded; a human is brought in for `@uat` alone. Findings are triaged as blocker or not, the
   validate gate must pass, and `aof work status <ref> done` accepts. At the same moment the
   retrospective is written, `OUTCOME.md` states what is now true, and both are ingested into
   memory for the next item's refine.

Statuses move `not-started → in-progress → in-review → done` (or `blocked`), and only the status
verb moves them – the transition is checked against the lifecycle, stamped, and published to the
board.

## The team

The commands spawn a team of scoped subagents: `aof-product-owner`, `aof-architect`,
`aof-developer`, `aof-qa`, `aof-designer`, `aof-researcher`, and the conditional `aof-security` and
`aof-compliance`. Each can read and write only what its role owns; the record documents are
authored by the governing session, never by a subagent.

## The gates

- `aof work validate` – the stream is well-formed: every item's record, contract, tags and
  `depends:` edges resolve. Refuses to accept a red stream.
- `aof work doctor` – health: unresolved controls, over-budget documents, register duplicates,
  drift between a record and its folder.
- `aof work regression-gate <NN>` – a milestone is accepted only after the whole suite ran on a
  clean checkout and the run is recorded; story-scoped greens are never enough. The gate runs
  `work.test.gate` when the project declares one (this repository declares its sharded runner),
  else `work.test`. `--serial` runs `work.test` instead, and `--jobs N` sets the gate program's
  worker count; neither narrows what runs. Each row records how the run ran and its wall time, logs
  any case that failed under load but passed alone as `not isolated`, and notes an overrun of
  `budgetMinutes` without turning a green row red.
- The **drift checks** – a generated document (the loop graph, a changelog) is regenerated by a
  test and compared byte for byte, so it cannot outlive what it describes.

## The loops

Since milestone 53 the lifecycle runs as declared **control loops** – build-to-green, review → fix
→ re-review, verify → triage → accept, the autonomous cascade – each a registry record naming its
reference, measurement, actuator, cadence and ceiling. `aof work loop <ref|NN-MM>` drives an item or
a range through them in code, with the gates, retries and stop conditions enforced by the shell
rather than by prompt discipline. Pointed at a backlog slug, `aof work loop <backlog-slug>` promotes
the item first – through `aof work promote`, appended to the stream – and then loops at the number it
was given (a path to the item's folder, `wiki/work/backlog/milestone_x`, or its record doc names the
same item); a later `--resume` names that number, not the slug. `work.loop.refine` sets how it refines:
`per-story` (the default) drives one story's contract per refine session, and `whole-item` makes a
milestone's break-down drive `/aof:refine <ref> --autonomous`, which authors every contract in one
session; `--refine per-story|whole-item` overrides it for one run. Each phase's session runs on the
model and effort the operator names — `aof work loop <ref> --model sonnet:high --model refine=opus:xhigh
--model verify=fable:high` — where a value with no `PHASE=` applies to every phase and a phased one
overrides it; `--thinking [PHASE=]LEVEL` sets the effort alone. The run record says which model ran
which phase, and a `--resume` reruns on those choices unless new ones are given. A halt about the
loop's own bookkeeping – a lane that will not merge home or will not reopen (`lane-open-failed`,
`lane-merge-refused`, `lane-merge-conflict`) – is handed to a fresh session typed `/aof:repair`,
which diagnoses the cause from the hand-over the loop wrote and fixes only that; a repair that ends
done resumes the loop by itself, on the choices it started with, and one that does not stops the loop
for the operator with the repair run named. Each halt gets one repair. Every other stop still ends
the loop as before, and `--no-repair` (or `work.loop.repair: false`) turns the hand-over off. [The loop graph]({{ '/loops/' | relative_url }}) is that registry,
rendered.

## Starting

```sh
aof work init --runtime claude   # render the commands, agents and templates into the repo
aof work validate                # the stream is well-formed
aof work next                    # the next item the depends graph allows
```

Then `/aof:add-milestone`, `/aof:refine`, `/aof:continue`, `/aof:verify` – or `aof work loop` for
the whole run.
