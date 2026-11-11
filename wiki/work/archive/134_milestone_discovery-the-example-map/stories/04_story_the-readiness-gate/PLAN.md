# 134/04 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

Three seams on one pure function.

**The judgement** is `examplesFindings({ ref, status, dir, text, answers })` in the new lane
module. Parse the text with 02's `parseExampleMap`, then ask 02's queries: each open business
question, each malformed line and each claim whose token no answer carries is an error at
`severityFor(status)`. Each rule with no example is a warn, and more than four rules is one warn.
Build the anchored-token set once from `answers`. Every map pattern and label is read through
02's module (FF-13402 forbids spelling one here). `examplesGroup(snapshot, ctx)` asks
`examplesEnabledFromConfig(ctx.config)` first and returns nothing when it is off, then walks the
story rows that carry `examplesMap`. Append it after `diagramsGroup`, and add the lane to
FF-5905's roster. Export the codes as `EXAMPLE_LANE_CODES`, never with the `_FINDING_CODES`
suffix, which FF-12402 reads as advisory.

**The probe** sits in `buildSnapshot`, directly under the `PLAN.md` probe, inside the same
`item.type === "story"` branch. The gate reaches `buildSnapshot` as data, `examplesEnabled`, beside
`projectRoot`. Two builders pass it: `doctorWork`, and the doctor command, which builds its own
snapshot and hands it in. When it is on and the file is present, read
the text, put its line count in `docSizes`, and call 03's `collectAnswers` for the item's ref.
Every other row gets `examplesMap: null`. Name the file with 02's `EXAMPLES_DOC`, and add it to
`BUDGET_KEY` as `examples`. `DEFAULT_BUDGETS` and `budgetsFromConfig` gain `examples: 50`, next
to `plan`. The transcript directory is a `projectsDir` option on `doctorWork` and `buildSnapshot`,
default null, passed to `collectAnswers` with no workspace, so the engine never reads the
environment. The doctor command resolves it through `claudeProjectsDir`, as 03's settle seam does.

**The door** is in `createPhaseDoorCommand`, guarded by `phase === "continue"`. It goes after
the backlog refusal and before the overlay read, so a refusal moves nothing and dispatches
nothing. The exact row is already resolved there. Read the gate from `ctx.workspace.config`. A story row
with a `dir` and an `EXAMPLES.md` is read, `collectAnswers(row, { workspace })` collects its
answers, and `examplesFindings` judges it at the row's status. Any `error` finding throws
`commandError(…, "examples-question-open", 409)` with `detail = { ref, findings }`, the status
door's precedent, and the message names each finding's id and line. Milestones, cache-only rows and the other two phases never
reach the check.

**The row.** `src/work` is at 45/45: story 137's `digest-template.mjs` took the 44 → 45 raise at
milestone 130's gate. This story is 45 → 46. Append the reason to the row's `why`, in the
diagrams lane's own words.

## The verification step

With `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` each set to a fresh temp directory, run through the
test runner's `--only`: the two new example suites, FF-13403, FF-9603 (this plan is under it), `doctor-context-budget`, `story-plan-document`,
FF-5905's `acd-controls-never-execute`, FF-12402's `acd-advisory-lane-never-gates`, the
doctor-engine determinism control and the source-directory budget. Never run the full suite.
Then, from the repository root, run `aof work doctor --json`. This repo's config does not set
`work.examples`, so no `example-*` finding and no new `doc-over-budget` may appear. Last, turn
the gate on in a scratch copy of a fixture stream and read the refusal of
`aof work continue <story>` for yourself.

## Out of scope

- Writing any map, and refine's discovery block, the template and the prose that stops the
  Contract stage (ADR-005 §5). Those belong to 05.
- The reader, the stamp and `collectAnswers` itself. Those belong to 03, and this story calls
  them.
- The schema's `work.doctor.budgets` block, which already omits `feature` and `plan`.
- Loop-driven refine stopping at the gate. That follows from loop-ready counting error findings,
  and it is 136's.
