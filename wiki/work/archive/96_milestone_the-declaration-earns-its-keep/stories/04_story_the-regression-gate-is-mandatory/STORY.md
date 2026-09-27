---
type: story
number: 04
slug: the-regression-gate-is-mandatory
title: "The regression gate is mandatory — the whole-tree run at the milestone door, on a clean checkout"
parent: 96
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
depends: [03]
reads:
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-008
  - src/acceptance-horizon.mjs
  - src/commands/test.mjs
  - src/commands/loop-record.mjs
  - src/work.mjs
  - src/effects/item-transitions.mjs
  - src/commands/resolve.mjs
files:
  - src/regression-record.mjs
  - src/commands/regression-gate.mjs
  - src/commands/item-status.mjs
  - src/command-core.mjs
  - src/bundle/commands/verify.md
  - test/regression-gate.test.mjs
  - test/arch/acd-gate-door-lives-in-the-command-layer.test.mjs
  - test/arch/acd-gate-result-is-evidence.test.mjs
  - scripts/test.mjs
  - src/bundle/manifest.json
  - .claude/commands/aof/verify.md
  - .codex/skills/aof-verify/SKILL.md
  - .opencode/commands/aof/verify.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 04 · The regression gate is mandatory

## User story

As the operator accepting a milestone whose stories each ran a narrowed test suite,
I want the full suite to have actually run, on a clean checkout, before the milestone can be accepted,
so that the thing story 03 traded away is bought back at the door rather than assumed.

## Why

Story 03 narrows what a story lane runs. That trade is sound and this stream has already paid its
price once, at full size, and written down the lesson:

> **63/R7 — A story-scoped suite cannot see a control that lives in another milestone.** *"63/06's
> positive-control import put a file outside milestone 53's closed driver allowlist and moved its
> census split. The story's own lane was green; the failure appeared only at the full-suite gate
> (F-63-H). **Lesson.** The scoping trade is sound and should stay — but it makes the milestone gate
> load-bearing, not ceremonial. Never accept a milestone on story-scoped greens alone."*

That was written when narrowing was informal. Story 03 makes it systematic, which makes the gate the
only thing standing between a narrowed lane and a false accept.

**A gate an agent can report as passed is not a gate.** Today the full-suite run at verify is prose in
a phase prompt, executed by the same agent that reports the result. This stream's own thesis, from
milestone 59, is that *"ACD's `@manual` evidence is written by the same agents that did the work"*.
The lifecycle door that story 73 built — `aof work status <ref> done`, checked against
`ITEM_STATUS_EDGES` — is the one place a claim becomes a refusal.

**And it must run somewhere nothing else is writing.** A downstream retro records two agents
red-probing on one checkout and getting silently unreliable results, and another records worktrees
isolating source but not derived artefacts, the database, or the git index. A gate that runs inside
whichever lane happens to be holding the tree measures that lane, not the milestone.

## Tasks

- [x] `tasks/00_the-gate-run-is-recorded-as-evidence.feature` — `aof work regression-gate <ref>` runs the whole tree on a clean checkout, refuses a dirty one, and appends a row to `REGRESSION.md` carrying the commit, the instant, the scope and what failed; a rerun appends rather than overwrites, and a half-written row is unreadable rather than green
- [x] `tasks/01_the-accept-door-refuses-without-a-green-gate.feature` — a milestone moving to `done` with no record, a red record, or a record whose run was narrowed or widened is refused in the command layer; a story's `done` is untouched, and the acceptance horizon still imports nothing
- [x] `tasks/02_the-override-is-data-and-it-is-recorded.feature` — `--gate-override "<reason>"` permits the move and writes the reason as its own row; an override with no reason is refused, and an agent reporting the gate as passed is not a form the door admits

## Notes

**The open question is decided: the door refuses, and the override is a recorded row** (ADR-008 §4).
Milestone 66 declined the same move for the observability report, and 63/R12 records a milestone
blocked by an environment that could not host two rows — so the refusal ships with the escape those
two argue for, in `--if-applicable`'s own idiom (74/00: an expected refusal rendered as data rather
than a 409). What is not admitted is an override with no reason, because a silent override is
indistinguishable from no gate at all within two milestones.

**Two seams already exist and this story must not rebuild either.** `aof test --scope all` already
computes `gate: scope === "all" && widened.length === 0` (`src/commands/test.mjs:262`) and then
discards it — so the gate is durability and a door over a result the command already produces. And
`src/acceptance-horizon.mjs` **cannot hold the door**: it is a zero-import leaf by 66/ARCHITECTURE
ROUND 3/3, and 66/02's FF-6605 forbids the controls lane reaching `node:fs`. The refusal lands in
`src/commands/item-status.mjs`; the story's declared write of the horizon is deleted from the
partition.

**The gate's result is evidence, not a sentence.** Whatever shape refine picks, it carries what ran,
when, against which commit, and what failed — so it can be read at accept and diffed at the next
milestone. A boolean is not evidence.

**Clean checkout, not a lane's worktree.** See above. `aof work dispatch` already knows how to make a
tree; refine should decide whether the gate reuses that machinery or asks for one.

**The whole-tree controls belong here.** Story 03 explicitly cannot narrow them — a control asserting a
property of the tree has no story-scoped form. Moving them out of the story lane is most of the
saving story 03 claims for the downstream repos, and this is where they land.

**Deliberately not in scope.** Changing what the suite contains, any control's budget, and CI
topology. This story decides when the existing suite must have run and who is allowed to say it did.
