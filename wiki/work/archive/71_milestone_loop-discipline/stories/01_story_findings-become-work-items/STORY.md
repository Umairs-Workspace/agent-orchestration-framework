---
type: story
number: 01
slug: findings-become-work-items
title: "A finding the cap stops chasing becomes a named work item, or a named question for a human"
parent: 71
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-003, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-004, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-008, wiki/work/39_milestone_delivery-memory-outcome/ARCHITECTURE.md#ADR-001, src/commands/promote-gap-to-chore.mjs, src/commands/insert-shared.mjs, src/work-loop.mjs, src/command-core.mjs, src/cli.mjs, src/bundle/commands/continue.md, src/bundle/commands/verify.md, src/bundle/templates/chore/CHORE.md, test/promote-gap-to-chore.test.mjs, scripts/test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, src/commands/next.mjs]
files: [src/work-promote/chore-seed.mjs, src/work-promote/promotion.mjs, src/commands/promote-gap-to-chore.mjs, src/commands/promote-finding-to-chore.mjs, src/command-core.mjs, src/bundle/commands/continue.md, src/bundle/manifest.json, test/promote-finding-to-chore.test.mjs, test/arch/acd-promotion-creates-one-type.test.mjs, test/arch/acd-one-promotion-engine.test.mjs, scripts/test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, .claude/commands/aof/continue.md, .codex/skills/aof-continue/SKILL.md, .opencode/commands/aof/continue.md, src/work-loop.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · A finding the cap stops chasing becomes a named work item, or a named question for a human

## User story

As the operator of a review loop that stops after one round,
I want each surviving finding the loop declines to chase to be routed by one ordered rule — into a
scheduled chore, into an amendment, or into a question put to me with the story shape named —
so that capping the rounds schedules the remaining work instead of dropping it, and the queue that
results cannot grow faster than the reporting bar allows.

## Why

This is the milestone's load-bearing half, and the answer to the one open question `STATE.md`
carried into refine: *"'findings become work items' needs a home… getting it wrong turns a bounded
loop into an unbounded backlog."*

The cap on rounds is already enforced — 83 landed it, and `src/work-loop.mjs`'s
`reviewFindingDisposition` already answers `disposition: "work-item"` for every non-Blocker finding.
**Nothing consumes that answer.** There is no path from a review finding to a scheduled item, so
today the cap's cost is paid entirely by whatever the operator happens to remember. The existing
promotion seam (`aof work promote-gap`) promotes a declared *gap*, not a *finding*, and it is the
right engine to extend rather than the wrong one to duplicate.

The unbounded-backlog risk is real and is answered structurally rather than with a number
(ADR-003): the loop's creation authority is exactly one type — `chore` — in exactly one place —
top level, where the walk that created it cannot see it. It never creates a story, because
authoring acceptance criteria is a refine act and a story born without criteria *is* the backlog;
it never creates a milestone, because that is the operator's call. And the eligible population is
already throttled by 83's reporting bar, so the promotion rate cannot exceed the Important-finding
rate.

## Tasks

- [x] `tasks/00_the-triage-rule-routes-every-finding.feature` — the review close puts each surviving
      non-Blocker finding to the four ordered questions and reports the routing it chose.
- [x] `tasks/01_promote-a-finding-to-a-chore.feature` — the promotion verb creates a top-level chore
      seeded from the finding's remedy, back-referenced, appended, and idempotent per finding.
- [x] `tasks/02_the-loop-creates-nothing-else.feature` — a finding needing new acceptance criteria
      stops the loop and names the story shape; no milestone and no story is ever created.

## Notes

- **The promotion engine is shared, not copied.** `src/work-promote/` holds the DoD seeding, the
  `## Notes` back-reference author, the append-position resolver and the idempotence scan;
  `promote-gap-to-chore.mjs` delegates to it with its behaviour unchanged (39's existing suite is the
  control on that), and `promote-finding-to-chore.mjs` is the second face.
- **No `/aof:` command wrapper for the finding promoter**, by decision (ADR-004): a door is a second
  entry point that bypasses the triage rule. `work:promote-gap` shipping without one is the
  precedent. This is the one decision the operator can cheaply reverse — it costs this story nothing
  it does not already write.
- **The loop cannot allocate a finding id** (`66/ADR-006`): the only findings register is the
  milestone `VERIFICATION.md`, authored by the PO at `aof:verify`. The back-reference therefore uses
  39's promote-by-title idiom, and `routed-to` closes the trace in the other direction at verify.
- **The triage rule lands as CODE, not prose** (ADR-009 §B): `routeFinding()` is an additive pure
  decider in `src/work-loop.mjs`, beside `reviewFindingDisposition` — triage is a *review* decision
  about whether to promote, not a promotion mechanic. That is what makes this story's ordered-question
  and severity matrices genuinely executable rather than grep-shaped. `src/work-loop.mjs` has 26
  dependents but only **one** production dependent, and nothing existing reads the new export.
- **A new `work:promote-finding` reds two guards until they are updated** — `argsFor` throws
  `unmapped subcommand` (`acd-work-command-cli-bijection.test.mjs:302`; needs a `case`) and
  `BOARD_DEFERRED` needs an entry (`acd-work-command-route-coverage.test.mjs:66-88`). Both are in
  `files:`. `src/cli.mjs` is **not** — a registry-routed `work:*` verb needs no CLI edit.
- **`DOCS_BY_TYPE` is module-private** (`insert-shared.mjs:57-61`), and `runInsertTopLevel` performs no
  type validation: a bad type is a **TypeError at `insert-shared.mjs:182`, not a refusal**. FF-7103
  leg (a) source-parses rather than forcing an export for a test's convenience.
