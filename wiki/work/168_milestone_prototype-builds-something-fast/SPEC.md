---
type: milestone
number: 168
slug: prototype-builds-something-fast
title: "A prototype builds something fast — one light command gets something working inside the aof work tree, with its asks and shortcuts on record"
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
tags: [work, scaffold, work-stream]
---
# 168 · A prototype builds something fast

## Objective

An operator can say "build me X" and get something working quickly, without the forward loop's
ceremony: no refine, no Three Amigos, no acceptance criteria, no `.feature` contract, no architect
or QA review lanes, no accept door. A prototype is a few markdown files and the code. It is still a
work item in the aof work tree, so nothing is lost. What was asked, how the asks changed, what
works, and every shortcut taken are all on record.

A prototype's requirements are **expected to change**. The operator adds to them, drops them, or
changes them between sessions or in the middle of one. That is normal, not a scope violation.
Nothing is locked, so nothing needs a change process.

Speed comes from carrying less ceremony, not from a clock. One place it is meant for is a timed
test, where the aim is to get something working quickly. The prototype itself has no notion of
time.

An outsider can check it:

- `aof:prototype "<what>"` creates a prototype folder in `wiki/work` holding two markdown files,
  then starts building on the current branch.
- A later `aof:prototype <ref> "<addition>"` picks up where it stopped and adds the new ask.
- Stopping leaves a hand-off that the next session resumes from.
- `aof work validate` stays green over a prototype that has no stories, features or criteria.

## Design (to be ratified at refine)

**A new work-item type, `prototype`**, the lightest driver beside `spike` and `chore` (milestone
37 is the precedent). It lives in `wiki/work` like every other work item, with the same folder
naming and numbering (`NN_prototype_<slug>/`), and `aof work find`, `status`, the board and
`aof:explain` resolve it like any other ref.

A prototype is **fixed as a prototype**. It is never promoted or converted into a story or a
milestone.

Code changes are made **on the current branch**: no prototype branch and no dispatch worktree.

### Files: two markdown files, plus diagrams if wanted

| File | Answers | Contents |
|---|---|---|
| `PROTOTYPE.md` | What are we building, right now? | Frontmatter (`type: prototype`, `number`, `slug`, `title`, `status`, `created`, `updated`). `## Intent`: one paragraph, editable. `## Wants`: the current list of what it should do. It is freely edited; additions are appended with their date, and dropped items are struck through, not deleted. `## Shortcuts`: a running ledger of what was faked, hard-coded, skipped or left untested. `## Diagrams` (optional): one `### <name>` brief per picture, each with its link once drawn. |
| `STATE.md` | Where did we get to? | `## Hand-off`: overwritten at each stop. What works now, where it stopped, what is next, and how to run it. `## Log`: an append-only list of dated session entries, including every change to the wants. |
| `diagrams/` | (only if a diagram was drawn) | The exported files that `aof:add-diagram` writes, the same layout a milestone uses. |

There are no acceptance criteria, stories, tasks, `.feature` files, ARCHITECTURE, DESIGN,
RESEARCH, VERIFICATION or RETROSPECTIVE.

### Diagrams through `/aof:add-diagram`

A prototype has no ADRs, so `aof:add-diagram` gains a prototype target rather than a sibling
command. It uses the same `aof diagram plan` / `aof diagram export` step.

- `aof:add-diagram <prototype-ref> "<what to draw>"` writes a `### <name>` brief under
  `## Diagrams` in `PROTOTYPE.md`, draws it into `diagrams/`, and pastes the link under the brief.
- `aof:add-diagram <prototype-ref>` with no description draws every brief that has no link yet.
- `aof:add-diagram <prototype-ref> <name>` redraws that one diagram. A prototype's wants change, so
  unlike an ADR picture, a prototype diagram can be replaced.

### One verb, four moves

`aof:prototype` (backed by `aof work prototype`) is the only command. It is not a family of
sibling verbs.

| Move | Command | What happens |
|---|---|---|
| **Start** | `aof:prototype "<what>"` | Creates the item in `wiki/work` (`status: active`), writes Intent and the first Wants from the ask, and builds inline in one session on the current branch. |
| **Continue / add** | `aof:prototype <ref> ["<addition>"]` | Reads `PROTOTYPE.md` and the `STATE.md` hand-off, folds any addition into Wants (logged), sets `active`, and keeps building. Continuing a `paused` or `done` prototype simply reopens it. |
| **Stop** | `aof:prototype <ref> --stop` | Writes the hand-off and a log entry, then sets `paused`. If a session ends without `--stop`, the log written as it went still stands; the next continue rebuilds the hand-off from the log and the code. |
| **Complete** | `aof:prototype <ref> --done` or `--abandon` | The operator decides, since there are no criteria to pass. It writes a final hand-off and sets `done` (it works well enough) or `abandoned` (the finding stays on record). Neither is terminal: a later continue reopens it. |

**Lifecycle:** `active` ⇄ `paused` → `done` | `abandoned`, with either one reopenable.

## Scope

In scope:
- **The `prototype` item type.** Template (`.aof/templates/work/prototype/`), `NN_prototype_<slug>`
  folder naming in `wiki/work`, and the status vocabulary, recognised by `aof work find`,
  `status`, `validate`, `aof:explain` and the board.
- **`aof work prototype` + the `/aof:prototype` bundle command**, covering the four moves above.
  It builds inline in one session on the current branch, with no subagent spawns and no review
  lanes. Tests are optional. It ships in the bundle and is reachable through `aof work update`,
  with CLI↔bundle parity for every rendered runtime.
- **Changing requirements as a first-class move.** Additions to Wants, on start, on continue or
  mid-session, are applied without ceremony and logged.
- **Diagrams for a prototype through `/aof:add-diagram`.** The command accepts a prototype ref and
  reads and writes briefs under `PROTOTYPE.md` `## Diagrams`; the ADR path is unchanged.
- **A lenient validate lane.** Validate checks only the two files' shape and frontmatter. A
  prototype is exempt from lifecycle gates (no stories, features, criteria or accept door).

Out of scope:
- **Promoting or converting a prototype** into a story or a milestone. For now a prototype stays
  a prototype.
- **Acceptance criteria of any kind in a prototype.**
- **Branches or worktrees for prototype code.** It goes on the current branch.
- **Time-boxing of any kind.** There is no timebox flag, no clock in the record, and no timeout. A
  timed test is just one use of a prototype; timing it is the harness's job.
- **The loop driving prototypes.** `aof:autonomous` and dispatch lanes stay for governed work.
- **Mesh dispatch of a prototype to a worker node.**
- **Quality gates on prototype code.** Lint, fitness functions and coverage do not apply. The
  Shortcuts ledger is the trade-off.

## Stories

- [x] [00 · A prototype is a work item](stories/00_story_a-prototype-is-a-work-item/STORY.md) (ADR-001, ADR-002, ADR-003, ADR-005)
- [x] [01 · One verb builds a prototype](stories/01_story_one-verb-builds-a-prototype/STORY.md) (ADR-004; after 00)
- [x] [02 · A prototype draws its diagrams](stories/02_story_a-prototype-draws-its-diagrams/STORY.md) (ADR-006; after 00, 01)
- [x] [03 · The board shows a prototype](stories/03_story_the-board-shows-a-prototype/STORY.md) (ADR-007; after 00)

Waves: 00 → 01 ∥ 03 → 02. Everything composes 00's type, map and lifecycle. 02 follows 01 only
because both change the bundle's shipped `manifest.json` hashes and the codex `workflow.md`.
They share no code. 03 is UI-only.

## Dependencies

- `37_milestone_spike-chore-item-types` (archived): the precedent and the code paths for registering
  a new top-level driver type (template, validate, find, board).
- `aof:add-diagram` and `aof diagram plan` / `export`: the diagram step a prototype reuses. Today
  it is bound to ADR briefs in `ARCHITECTURE.md`.
