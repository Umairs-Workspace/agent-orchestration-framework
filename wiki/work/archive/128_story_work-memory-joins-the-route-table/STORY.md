---
type: story
number: 128
slug: work-memory-joins-the-route-table
title: "work memory joins the route table"
status: done
owner: product-owner
created: 2026-09-12
updated: 2026-09-13
depends: []
schema: 1
aofVersion: 0.1.0
# DERIVED by hand at refine (2026-09-12, solo): the seam being moved, the face it moves onto, the
# ladder it leaves, the four gates whose frozen lists move with it, the integration ritual a
# migrated verb owes, the 42 record this story supersedes, and the 125 control that found the gap.
reads:
  - src/work/memory.mjs
  - src/spine/face.mjs
  - src/cli.mjs
  - src/command-core.mjs
  - src/commands/loop-document.mjs
  - src/commands/find.mjs
  - test/command/command-core-contract.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/command/acd-console-log-confined.test.mjs
  - test/arch/command/acd-command-route-derived.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/integration/README.md
  - test/integration/features/command-spine.feature
  - test/support/source-slice.mjs
  - wiki/work/42_structural-overhaul/WAVE-D-MIGRATION.md
  - test/arch/command/acd-readme-names-what-ships.test.mjs
  - README.md
files:
  - src/commands/work/memory.mjs
  - src/command-core.mjs
  - src/work/memory.mjs
  - src/cli.mjs
  - src/spine/face.mjs
  - test/command/work-memory-command.test.mjs
  - test/command/index.mjs
  - test/command/command-core-contract.test.mjs
  - test/arch/command/acd-work-memory-routed.test.mjs
  - test/arch/command/index.mjs
  - test/arch/command/acd-console-log-confined.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/integration/features/work-memory.feature
  - test/integration/steps/work-memory.steps.mjs
  # ADDED at review (2026-09-12): the 124/02 control whose leg 4 asserted the door is UNROUTED — the
  # premise this story supersedes, flipped as code — and the shipped loop record whose prose said the
  # memory surface is reached by the ladder, with the manifest and installed copy that follow it.
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - src/bundle/loops/retrospective-memory-ingest.md
  - src/bundle/manifest.json
  - .aof/loops/retrospective-memory-ingest.md
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A standalone story (no parent) is self-contained.
-->
# 128 · work memory joins the route table

## User story

As the operator whose README is now guarded by a control that resolves every spelled `aof`
invocation against the registry's route table,

I want `aof work memory` to be a registered command on that route table, dispatched through the
one generic face like every other `work:*` verb,

so that the one thing the README says about memory — five true lines — is vouched for by the same
derivation as the other hundred and five routes, and the CLI has one door fewer that the registry
cannot see.

## Why this is a real gap, measured

Story 125's control (`test/arch/command/acd-readme-names-what-ships.test.mjs`) does exactly what its
scenario asks: it extracts every `aof …` invocation from the README's fenced blocks and command
tables and resolves each against `deriveRouteTable()`. Run at HEAD on 2026-09-12 it reds on
precisely five lines — `README.md:139`, `:175`, `:176`, `:177`, `:229` — and every one of them is
`aof work memory <verb>`, which works. It reds because `work memory` carries no `cli.route`:
`src/cli.mjs:601` calls it one of "the deliberately-unrouted doors (work memory, session)", and
42's `WAVE-D-MIGRATION.md` (d1 wave 2) recorded the reason — "they delegate wholesale", so the
memory seam's own argv parser was left as the face.

That reason was about who owns the parser, and it still holds: `parseMemoryArgv`, `runMemory` and
the per-verb projections stay in `src/work/memory.mjs`. What the 42 record did not anticipate is a
control whose premise is that the route table is the whole CLI. Two doors make it false. This story
closes the one the README spells; `aof session` is not spelled there, is fired from editor hooks
rather than typed, and stays laddered — deliberately out of scope, and still named by the
`acd-console-log-confined` PRINTERS row that exists for it.

## The load-bearing design idea

**Migrate the door; keep the seam.** A registered `work:memory` command declares its route, its flag
vocabulary and its render/json projections on itself — the WAVE-D class-A shape, an unregistered
ladder verb becoming a registry Command with its branch deleted — and its `run`
calls the memory seam's core with the parsed input. The seam keeps parsing semantics (scope flags,
`--item` as both filter and rebuild scope, `--all`, a non-positive `--limit` falling back to the
backend default) and keeps the verb dispatch; what moves is only the printing, which the face owns
for every routed command. Nothing a hook or a bundle prompt reads changes byte: `recall --block`,
the `--json` records array, the `status` line.

**One door, no second.** The `subcommand === "memory"` branch and its shim leave `src/cli.mjs`,
and the help text's static "Also:" tail stops naming a verb the registry now lists under Work.
`acd-command-route-derived` already refuses a routed verb with a surviving ladder branch; this
story is what lets that control say so about memory.

**Placement is decided by a delivered control, not by preference.** `src/commands/` stands at its
budget ceiling (67 direct children, allowance 0 — "never a 68th flat sibling"), and every control
that judges a command module walks `src/commands/**`. So the module founds `src/commands/work/`,
the family its own id declares, with a budget row of its own. The fold of the other `work:*`
commands into that directory is the item the parent row asks somebody to take; it is named here
and not taken, because it re-points every dependent of forty modules and belongs in no other
story's blast radius.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. -->

- [x] `tasks/00_the-memory-door-rides-the-route-table.feature` — `aof work memory` resolves through `deriveRouteTable`, and every verb answers byte-for-byte what it answered before
- [x] `tasks/01_the-ladder-door-closes-and-the-frozen-lists-move.feature` — the ladder branch and shim go, the help tail stops naming it, the four frozen lists move, and 125's control goes green

## Notes

**Scope boundary.** The memory seam's parsing rules and verb semantics are not changed, its
backends are not touched, and no new verb is added. `aof session` stays laddered. The
`src/commands/work/` fold is founded, not completed.

**Supersedes** 42/WAVE-D-MIGRATION d1 wave 2's "work memory … stays laddered by design" for the
memory door only, on the grounds above. That record is history and is not edited. **It also
supersedes one delivered scenario of 124/02** —
`124/stories/02/tasks/01_the-recall-form-exists-in-the-cli.feature`, "no registered command's
route is `work memory`" — whose premise was the same unrouted door; the delivered `.feature` is
not edited (a shipped contract is immutable), the rule lands here as the accepting item's own,
and its control (`acd-learning-edge-reaches-every-cut`, leg 4) is flipped as code and declared in
`files:` above.

**Raised by** story 125's task 02 (`acd-readme-names-what-ships`), whose red is the measured gap.
