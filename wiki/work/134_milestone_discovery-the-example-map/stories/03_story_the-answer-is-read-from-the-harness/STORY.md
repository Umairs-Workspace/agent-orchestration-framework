---
type: story
number: 03
slug: the-answer-is-read-from-the-harness
title: "The answer is read from the harness — one reader of AskUserQuestion answers, stamped once onto the run record at settle, from the real transcript store"
parent: 134
depends: [02]
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-24
adrs: [ADR-003]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-003
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - wiki/work/134_milestone_discovery-the-example-map/stories/02_story_the-map-is-a-document/tasks/01_the-queries-and-the-token-have-one-home.feature
  - src/work-examples/map.mjs
  - src/run-store.mjs
  - src/run-spend-ingest.mjs
  - src/effects/run-transitions.mjs
  - src/loop/cycle.mjs
  - src/commands/drive.mjs
  - src/work/observe.mjs
  - src/agent-session-driver.mjs
  - src/commands/run-complete.mjs
  - src/commands/run-start.mjs
  - src/work.mjs
  - src/degrade.mjs
  - test/support/source-slice.mjs
  - test/run/run-spend-ingest.test.mjs
  - test/run/run-store-spend.test.mjs
  - test/arch/run/acd-no-lease-store-run-record-untouched.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/examples/index.mjs
  - test/examples/index.mjs
files:
  - src/work-examples/answers.mjs
  - src/run-store.mjs
  - src/effects/run-transitions.mjs
  - src/loop/cycle.mjs
  - src/commands/drive.mjs
  - test/examples/index.mjs
  - test/examples/example-answers.test.mjs
  - test/run/run-spend-ingest.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-example-answer-one-reader.test.mjs
  - test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - wiki/work/134_milestone_discovery-the-example-map/VERIFICATION.md
  - wiki/work/134_milestone_discovery-the-example-map/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 03 · The answer is read from the harness

## User story

As **the reviewer who has to trust that an example marked `confirmed` or `stated` was agreed by a
person**,
I want **the person's `AskUserQuestion` answer read from the harness-written transcript by one
reader, filtered to discovery tokens, and stamped once onto the run record at settle, from the
transcript store that actually exists**,
so that **a provenance label is checked against a record the agent did not write, and survives
transcript pruning and a change of machine, and an agent's plausible default can no longer pass
as a person's answer**.

What lands (ADR-003): `src/work-examples/answers.mjs`. It holds the reader (answered results
become records, refused ones none, the tool name taken from `HUMAN_INPUT_TOOL_NAMES`, the tree
walked through `readTranscriptTree`) and `collectAnswers(story)`: stamped answers from settled
runs of the story and its parent, and live answers from a running run through the same reader.
`recordAnswers` in `src/run-store.mjs` is the one writer, validated and stamped once, and
`completeRun` calls it beside spend. `transitionRunComplete` resolves the transcript directory
through `claudeProjectsDir` instead of the repository root. That fixes RESEARCH R5 for spend too,
and the spend suite gains the case that proves a hand-run settle now stamps. FF-13401 and
FF-13404.

## Tasks

- [ ] 00 [one reader turns a person's answer into a record](tasks/00_one-reader-turns-a-persons-answer-into-a-record.feature)
- [ ] 01 [the answer is stamped once at settle and collected for a story](tasks/01_the-answer-is-stamped-once-at-settle-and-collected-for-a-story.feature)
- [ ] 02 [settle reads the transcript store that exists](tasks/02_settle-reads-the-transcript-store-that-exists.feature)
- [ ] 03 [the anchor is measured at the source](tasks/03_the-anchor-is-measured-at-the-source.feature)

## Notes

- **R6's measured check is owed here** (SPEC, near-miss m62): a fixture transcript with the real
  line shapes (RESEARCH R1: answered, free-text "Other", multi-question, refused), *and* a
  measurement at the source. After a real `aof work run-complete` on this story (task 03), the committed
  run record carries the answer and its `sessionId` and `entrypoint`. Green unit tests alone do not
  discharge it; the R5 gap is exactly how they would pass while nothing is stamped.
- **Rulings taken at this refine** (developer feasibility, each in its task's RULINGS block):
  the stamp rides `brief.answers`, not a seventeenth top-level key, because FF-6908 freezes the
  sixteen and says later claims ride `brief`; `carriedBrief` drops `answers` so a retry
  stamps its own. A read with no tokened answer writes nothing, so off stays byte-for-byte today.
- **The withheld-spend hazard** is why `src/loop/cycle.mjs` and `src/commands/drive.mjs` are in
  `files:`. They settle spend against a resume baseline and withhold it when the baseline is
  unusable. A resolved default directory would make `completeRun` stamp the whole transcript
  tree over them. They pass `spendSettled: true` and their own directory, and they are the only
  place the loop's path stamps answers (`run-complete` writes nothing inside a driven session).
- **FF-5307 pins `src/run-store.mjs` by sha256** (`acd-loop-state-rides-the-run-record`). Re-pin
  it in the open, with a comment naming 134/03, as 126/02 and 130/06 did.
- FF-13404 is narrowed in the contract: the default applies only when the caller names a
  workspace (the mesh callers keep today's no-read), and the control also reads the two driven
  settles.
- The milestone `VERIFICATION.md` takes the red probes of FF-13401 and FF-13404 and task 03's
  evidence. `STATE.md` takes task 03's operator procedure and paste slots.
