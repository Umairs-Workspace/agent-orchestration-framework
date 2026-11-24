---
type: milestone
number:
slug: autonomous-mode
title: "Autonomous mode — refine, continue, verify and the loop decide for themselves, and ask only when blocked"
status: not-started
owner: product-owner
created: 2026-11-22
updated: 2026-11-22
schema: 1
aofVersion: 0.1.0
depends: [193]
---
# Autonomous mode

## Objective

An operator can start `/aof:refine`, `/aof:continue`, `/aof:verify` or `aof work loop` with
`--autonomous` and walk away. The session then asks the operator nothing unless it is completely
blocked. Every question it would otherwise ask is settled by the session itself, from:

- the project's own record (SPECs, ADRs, prior decisions, the operator profile);
- the chat history and decisions already made;
- research.

Each such decision is written down beside the question it settles, with the evidence it rests on.
That way the operator can audit afterwards what was decided for them, and why.

"Completely blocked" means the session cannot go on without the operator. For example:

- access or a credential it does not have;
- a contradiction the record cannot settle;
- an action that cannot be undone.

A `@uat` acceptance is a human sign-off by definition, so it is always a stop. It stops only the
work item that owns it. Autonomous mode delivers as much of the rest as it can, such as a
milestone's other stories, before it stops.

Outsiders can check the objective is met: an autonomous run of a milestone with open `policy`
questions, a design-mock question and a `@uat` story ends with every other story delivered, a
recorded decision for each question it settled, and one stop naming the `@uat` item.

## Scope

In scope, as candidates to be cut at refine:
- **Free the name first.** Rename the internal `autonomous` field to `all`. It is chore 200's
  leftover and means "refine the whole item": `ctx.loopDrive.autonomous`, `drivePhase({ autonomous })`
  and its uses in `cycle.mjs`, `drive.mjs` and `loop.mjs`. Otherwise two meanings of `autonomous`
  would share one option bag. Nothing an operator sees changes.
- **`/aof:refine --autonomous`.**
  - The operator-aware and discovery fragments decide `policy` questions and `expert`-level
    `domain` questions instead of asking them. Today a `policy` question is never defaulted, so
    this needs a new recorded form, a decision with its evidence.
  - The design-mock question is decided the same way.
  - `--all` drops its single end-of-run review stop.
  - The Codex and Hyperagent rendered variants carry the same.
- **`/aof:continue --autonomous` and `/aof:verify --autonomous`.**
  - Continue settles its own judgement calls.
  - Verify runs everything except `@uat`. A `@uat` scenario stops only the item that owns it.
- **`aof work loop --autonomous`.**
  - The flag is kept on the loop's saved settings, so `--resume` inherits it.
  - The loop adds `--autonomous` to every phase command it drives.
  - The `NEEDS_INPUT` instruction (`session-driver.mjs`) changes from "a genuine judgment call" to
    "completely blocked".
  - A `uat-gate` parks the item that owns the `@uat` and leaves its siblings going. Today it halts
    the whole loop.
- **`/aof:autonomous` passes `--autonomous` through** to the loop it runs (operator, 2026-11-22).

Out of scope:
- The `work.autonomous.*` config keys (`maxAttempts`, `refine`) keep their names. They are config,
  and the name only overlaps.
- The `loop:autonomous-cascade` loop id and the mesh assignment phase `autonomous` keep their
  names. They are internal ids that no operator types.
- A standing config switch for autonomous mode. It is a flag only, until use shows a need. A new
  config key would also need a way for existing projects to find and adopt it.
- Removing `@uat` or deciding it automatically. Human acceptance stays human.

## Stories

To be broken down (`aof:refine`).

## Dependencies

- `193_milestone_operator-aware-discovery` (in progress): it owns the refine discovery fragments
  this milestone gives an autonomous branch. They should settle before this builds on them.
- `200_chore_rename-refine-autonomous-to-all` (done): it renamed the operator-facing flag and left
  the internal `autonomous` field this milestone renames first.
- `181_story_unattended-loops-survive-declines` (done): the current unattended-loop and stop
  behaviour that the per-item `uat-gate` parking changes.
