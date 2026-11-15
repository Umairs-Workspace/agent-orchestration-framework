---
doc: examples
---
# 192/03 · A project sees its practices and hears of a stale render — example map
<!--
Drafted at refine's discovery beat, 2026-11-13. Struck because the record answers them: that
`aof work update` lists each optional practice, whether it is on and the key that turns it on;
that `aof work doctor` says when a key has changed, naming the key and the command; and that the
update re-renders (SPEC Scope, the last two bullets). Relabelled technical: how the doctor knows
a render is stale, how severe each direction is, what an install made before this milestone is
told, and whether `aof work init` prints the list.
-->

## R1 · `aof work update` lists each optional practice, whether it is on, and the key that turns it on
- E1 · In this checkout: the list shows `discovery` on with `work.examples.enabled`, and `build-brief` on with `work.plan.enabled` [proposed]
- E2 · In a new project with neither key: both are listed off, under a line that says to set every key to `true` in `.aof/aof.config.json` and run `aof work update` [proposed]
- E3 · `aof work update --json` in the same project: `practices` holds two entries, each with its id, title, summary, keys and `on: false` [proposed]

## R2 · A key changed since the commands were rendered is reported by the work doctor, naming the key and the commands
- E4 · A project rendered with discovery off sets `work.examples.enabled` to `true` and does not update: `aof work doctor` reports one `practice-render-stale` error that names the key, the refine command and the PO, architect and QA briefs, and ends "Run `aof work update`." [proposed]
- E5 · The same project runs `aof work update`: the finding is gone [proposed]
- E6 · A project rendered with discovery on removes the key and does not update: the same code is reported as a warning [proposed]

## R3 · An install made before practices were recorded is told once to update
- E7 · A project whose lock has a `work` section with no `practices`: `aof work doctor` reports one `practice-render-unrecorded` warning, and after `aof work update` it is gone [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · How does the doctor know a render is stale? (Init and update record, in the install manifest, which practices the render was built with; the doctor compares that with the project's config.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-006 · How severe is each direction? (On and not rendered is an error: the operator asked for a practice and refine would ignore it. Off and still rendered is a warning: the prose tells itself to stand down.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · What is an install made before this milestone told? (One warning that it has no record, cleared by its first update.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-007 · Does `aof work init` print the list? (No. It renders before a config exists.)
