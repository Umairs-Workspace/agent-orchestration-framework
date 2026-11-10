---
type: story
number: 150
slug: explain-says-what-the-work-is-for
doc: retrospective
created: 2026-10-05
updated: 2026-10-05
schema: 1
aofVersion: 0.1.0
---
# 150 · Retrospective

The command did what it promised live: five kinds of ref answered in order, and two real sessions
left the work tree untouched. All four lessons are about the contract and the read set, where refine
assumed things about the tree that were not true.

## R1 — A new bundle command has more censuses than the PLAN listed

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** aof-continue (solo review)
- **What happened:** the PLAN named four literal censuses (`bundle.suite.mjs` `COMMAND_IDS`, the
  autonomous shell-out list, the learning-edge `EXCLUDED` map, the README table). The build also had
  to edit `test/fixtures/application/command-inventory.json`, `packages/work/test/index.mjs`, the
  142 Plan 09 test ledger, and the prose of the command itself to satisfy a 127 control that lets only
  `archive.md` and `verify.md` name `aof work archive`. `files:` was widened mid-build.
- **Why:** the censuses were listed from memory. Nothing enumerated them from the tree.
- **Lesson:** before freezing `files:` for a story that adds a command, grep `test/`, the fixtures and
  `wiki/work/archive/*/plans/` for an existing command's id (e.g. `recent`) and for each verb the new
  prose names. Every hit is a census or a control the story will touch.
- **Refs:** STATE `## Feedback (for retro)`, entry 1.

## R2 — The PLAN composed the command on a read verb it had not checked

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** aof-continue (solo review)
- **What happened:** the PLAN assumed `aof work doc` serves every type's record doc. It serves `SPEC`
  and `STORY` only, so `explain` reads `SPIKE.md`, `CHORE.md` and `SESSION.md` with `Read` at the find
  row's `dir`. A spike, chore or uat known only to the cache (`dir: null`) cannot be explained.
- **Why:** the read verbs' requestable sets were not run at refine; the PLAN named them as a
  composition and moved on.
- **Lesson:** when a command is "prose over existing verbs", run each verb once per item type at
  refine and write down what it refuses. The refusal is either a task or a declared gap.
- **Refs:** STATE `## Feedback (for retro)`, entry 2; OUTCOME `## Gaps`.

## R3 — The read-only contract checked the source asset, and the runtime copy drops the tool list

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** product owner at verify
- **What happened:** task 01 E1 asserts `allowed-tools` is exactly `Read, Grep, Glob, Bash`, and reads
  `packages/core/assets/commands/explain.md` to check it. The Claude renderer drops `allowed-tools` and
  `argument-hint` from every command, so the copy a session loads carries neither. E1 is green, and it
  says nothing about what a live session can do.
- **Why:** the contract named the asset as the thing read, without checking what the renderer keeps.
- **Lesson:** a scenario about what a session can or cannot do reads the rendered copy under
  `.claude/commands/`, or names the renderer as part of the claim. Only the live `@manual` run (E2)
  measured read-only.
- **Refs:** VERIFICATION `F-150-01`.

## R4 — A numeric bound stated in prose is only measured live, and the live check bounded one item

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** product owner (refine) · **Raised by:** product owner at verify
- **What happened:** the `@executable` scenarios confirm the prose says "three to five sentences".
  The `@manual` call bounded only 147's answer, which held at 5. The backlog story and 129 got 7 each,
  and the `loop` listing said "about 40" over 45 rows. The operator accepted it as-is.
- **Why:** a session writes the answer, so the prose is the only thing a suite can read; the live
  scenario named one item where the bound mattered for all of them.
- **Lesson:** when a prompt states a count or bound on output, the `@manual` scenario checks it on
  every item kind in the call, not on the first.
- **Refs:** VERIFICATION `F-150-02`.
