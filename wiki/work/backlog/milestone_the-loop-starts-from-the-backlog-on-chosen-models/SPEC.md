---
type: milestone
number:
slug: the-loop-starts-from-the-backlog-on-chosen-models
title: "The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose"
status: not-started
owner: product-owner
created: 2026-10-02
updated: 2026-10-02
schema: 1
aofVersion: 0.1.0
---
# The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose

## Objective

**One `aof work loop <ref>` takes an idea from the backlog to verified work without the operator
stepping in between phases, and the operator decides from the command line which model does each
phase.** An outsider can check this by doing three things:

- Point the loop at a backlog item: it promotes the item, records the number it minted, and carries on.
- Ask for an autonomous refine: the whole item is broken down and every story's contract authored in
  one refine pass, instead of one story per drive.
- Run `aof work loop <ref>` with a refine model, a build model and a verify model: each phase's
  session runs on the model named, and the run record says which model ran which phase.

## Scope

In scope:

- **A backlog ref is a valid loop target.** Today the drive refuses it with `phase-backlog-ref`
  ("promote first — a mint is never dispatched"). The loop promotes it through the one promote door
  (`aof work promote`, which alone mints a number), records the minted ref on the run, then refines and
  continues at that number.
- **An autonomous refine mode for the loop.** Under `refine_first` the loop decides
  `drive refine <unrefined[0]>`, one story per drive. It gains a mode that refines the whole item in one
  pass (break down plus every contract, the cascade `aof:refine --autonomous` performs) and then
  continues. The mode is a config setting, overridable per run from the command line.
- **Per-phase models from the command line.** For example: Opus for refine, Sonnet for build/continue,
  Opus or Fable for verify. They are set on `aof work loop <ref> --…`, layered over the existing
  per-phase session config, and recorded on the run.

Out of scope:

- **Changing what review or verify judge.** Only the model that runs them changes.
- **A new model-routing surface beside the existing ones.** The per-phase SESSION model and effort
  already resolve from `work.agents.session` (`packages/execution/src/session-model.mjs`, 70/01). ADR-005
  keeps that distinct from the ROLE map `work.agents.models` for subagents. This milestone extends those
  homes and adds no third one.

## Open questions (settle with the operator at refine)

- **The command-line layout for per-phase models.** Candidates:
  - one flag carrying a map: `--model refine=opus,build=sonnet,verify=fable`;
  - one flag per phase: `--refine-model opus --build-model sonnet --verify-model fable`;
  - a default plus overrides: `--model sonnet --phase-model verify=fable`.

  Whichever layout wins, it should match the existing `--thinking LEVEL` (story 141), which today sets one
  effort for every phase.
- **Precedence and the record.** The proposed default order is flag, then `work.agents.session`, then
  the built-in default. Open: what the run record stores, so a resumed loop reruns on the same models
  (`--resume`).
- **Whether subagent role models are in scope.** Should `--model` also override the role map
  (`work.agents.models`), or only the session that aof spawns?
- **Where the autonomous-refine setting lives.** Candidates: `work.autonomous`, the loop declaration, or
  both. Also the name of its per-run override.

## Stories

To be broken down (`aof:refine`).

## Dependencies

- Story 141 (`--thinking`, the effort vocabulary) and milestone 70/01 (per-phase session model config),
  both delivered: this milestone builds on their resolvers.
- The promote door (`aof work promote`) and the loop's `refine_first` decision (129/01).
