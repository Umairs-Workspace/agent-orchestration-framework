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
- Run `aof work loop <ref>` with a model and effort for refine, continue (build) and verify: each phase's
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
- **Per-phase model and effort from the command line**, on one repeatable flag (agreed with the operator
  2026-10-02):

  ```
  aof work loop <ref> --model sonnet:high --model refine=opus:xhigh --model verify=fable:high
  ```

  - **Shape.** `--model [<phase>=][<model>][:<effort>]`. A value with no phase applies to every phase; a
    `<phase>=` value overrides that phase. The phases are the loop's existing names: `refine`, `continue`,
    `verify`. Every part is optional: `--model opus`, `--model verify=fable`, `--model verify=fable:high`,
    `--model refine=:xhigh` (effort only, the model stays as configured), `--model sonnet:medium`.
  - **Parsing.** Split on the LAST `:` only, and only when what follows is an effort spelling
    (`low|medium|high|xhigh|extra-high|max`, through the existing `normalizeEffort`). A full model id
    that itself contains a colon (Bedrock-style `…-v1:0`) is therefore read as a model. An unknown phase
    or effort is refused with a coded error, never guessed at.
  - **`--thinking` keeps working, with no double meaning.** It stays the effort-only flag and gains the
    same per-phase form (`--thinking verify=max`). If both flags set an effort for the same phase, the
    command refuses with a coded error naming the conflict; it does not pick a winner.
  - **Precedence, per phase.** The flag wins, then `work.agents.session` (`.models` / `.effort`), then
    the built-in default (`DEFAULT_EFFORT`; no model, so the launch passes no `--model`).
  - **The record.** The resolved model and effort for each phase, and where each came from (flag, config
    or default), are recorded on the run. `--resume` reruns on the recorded choices unless new flags
    are given.

Out of scope:

- **Changing what review or verify judge.** Only the model that runs them changes.
- **A new model-routing surface beside the existing ones.** The per-phase SESSION model and effort
  already resolve from `work.agents.session` (`packages/execution/src/session-model.mjs`, 70/01). ADR-005
  keeps that distinct from the ROLE map `work.agents.models` for subagents. This milestone extends those
  homes and adds no third one.

## Open questions (settle with the operator at refine)

- **Whether subagent role models are in scope.** Should `--model` also override the role map
  (`work.agents.models`), or only the session that aof spawns? Proposed: the session only. Subagent
  models stay in config, which keeps ADR-005's two surfaces apart.
- **Where the autonomous-refine setting lives.** Candidates: `work.autonomous`, the loop declaration, or
  both. Proposed: `work.autonomous.refine: "whole-item" | "per-story"` (default `per-story`, today's
  behaviour), overridden per run by `--refine whole-item|per-story`.

## Stories

To be broken down (`aof:refine`).

## Dependencies

- Story 141 (`--thinking`, the effort vocabulary) and milestone 70/01 (per-phase session model config),
  both delivered: this milestone builds on their resolvers.
- The promote door (`aof work promote`) and the loop's `refine_first` decision (129/01).
