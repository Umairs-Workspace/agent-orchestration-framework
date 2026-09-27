---
type: story
number: 04
slug: session-launcher-affordance
title: "The new-session affordance — and an honest answer about what happened"
parent: 50
status: done
owner: product-owner
depends: [50/02, 50/03]
created: 2026-08-14
updated: 2026-08-14T20:30:00+01:00
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The new-session affordance — and an honest answer about what happened

## User story

As an **operator on the terminals home**,
I want to start a session by picking a node and a repo from the grid itself — and to be told plainly
when that fails and why,
so that the fleet's second verb is usable without `curl`, and a session that never appears is a
stated reason rather than an empty slot I have to go read a daemon log to explain.

## Why this story exists (added 2026-08-14, mid-milestone)

This story was **not** in the milestone's original breakdown, and its absence was a defect in that
breakdown rather than a change of scope. ADR-005 partitioned milestone 50 from `aof graph impact`
over `src/` modules, so it reasoned entirely about backend coupling clusters and never crossed into
`ui/`. The result: stories 01-03 deliver a complete, well-tested backend verb that **no operator can
invoke**, while SPEC scope bullet 1 ("The 'new session' affordance on the terminals home") and the
"Honest failure" bullet had no story carrying them.

The honest-failure half is the sharper of the two. A behavioural review of story 02 measured that
all three failure modes the SPEC names by name — *a node that cannot spawn, a repo that does not
exist on the chosen node, a worktree that cannot be created* — are worker-side and happen **after**
the fleet face has already answered `200 { ok: true, sessionId }`, and that ADR-002 decision 6
discards the `session-spawn-ack` carrying their coded reason. Nothing in `src/` reads
`SESSION_SPAWN_ACK_KIND` except the builder. So the milestone as designed ships the exact thing its
own SPEC forbids: a spinner that ends in an empty grid slot.

That is why this story is the affordance **and** the outcome surface. A picker on its own would be a
button that lies.

## Context

- The surface is milestone 49's terminals home at route `/` — **`ui/src/home/`**, not `ui/src/fleet/`
  (that is the separate `/fleet` surface; the two are gated apart — `ui/src/home/` may import nothing
  from `ui/src/fleet/`). This composes with that grid and does not get its own page (SPEC).
  `ui/src/home/` is at its declared file ceiling of 15 with allowance 0
  (`test/arch/acd-ui-directory-budget.test.mjs`), so **where the launcher's module lives is an ADR
  decision, not a diff**.
- The route is `POST /api/mesh/session` (story 02), body `{ nodeId, workspaceId, assistant?,
  itemRef? }`, answering an optimistic `200 { ok, sessionId, nodeId, workspaceId }` plus a coded
  error set.
- The worker half (story 03) opens the PTY, registers the session through m48's session API, and
  sends a `session-spawn-ack { ok, code? }` up-frame that currently has no reader.
- Per **ADR-007** a launched session runs the operator's **default shell**; `assistant` is a session
  LABEL, not a spawn instruction. The UI must not imply it launches Claude.
- **ADR-008** (authored for this story) decides how a spawn outcome travels from the worker's ack
  back to the operator's browser across the mesh-ui / mesh-serve process split.
- **DESIGN.md** (authored for this story) holds the picker's shape, the operator-visible state
  machine, the code→language mapping, and the binding conformance checklist. There is no committed
  mock, so that checklist is the conformance baseline.

## Acceptance

- The terminals home carries a "new session" control that opens a picker for node + workspace, with
  an optional item ref **picked from the payload's items (never a free-text box)**. It composes with
  the grid.
- **No assistant control** (PO ruling 2026-08-14, on the designer's escalation). ADR-007 made
  `assistant` a session LABEL rather than a spawn instruction, and `assistant` is rendered nowhere in
  `ui/src` today. A control for it would be either invisible in effect or actively dishonest — a
  `claude` label over a `cmd.exe` shell. The route keeps its optional field and its `"claude"`
  default; the UI simply does not offer it.
- **A launched session renders as a LIVE session, not a dead tile.** m49's feed axis classes a
  session with `workItem: null` as `no-producer` (`ui/src/home/feed-axis.mjs:79-98`) → no socket,
  read-only, "no live output", no expand/watch — while story 03 is streaming its bytes and accepting
  input. A launched session has no work item by construction, so without an explicit producer fact on
  the wire the milestone's headline feature appears dead. ADR-008 owns that fact; task 00 carries it.
- Submitting dispatches `POST /api/mesh/session` and reflects the optimistic `sessionId`.
- A successful spawn resolves into the grid as an ordinary session — indistinguishable from one
  started any other way (SPEC: "a launcher that produces a second class of session defeats its own
  purpose").
- **Every** control-side coded error renders as operator-facing language stating the reason, per
  DESIGN's mapping. No raw code is shown alone; no failure renders as a silent no-op.
- **A worker-side spawn failure reaches the operator** with its coded reason, via ADR-008's lane.
- A dispatch that produces no outcome within ADR-008's stated bound resolves to an honest
  "no answer" state, never an indefinite spinner.
- The fleet face keeps its posture: zero fs write, zero shell-out, and the write allowlist stays the
  named set the fitness function enumerates.

## Tasks

<!-- Authored at refine; each is an @executable feature whose scenarios are the acceptance criteria. -->

- [ ] `tasks/00_*.feature` — the spawn-outcome lane (ADR-008): the worker's ack reaches the browser,
  **and the stated producer fact that makes a launched session render live** (see DG-50-1)
- [ ] `tasks/01_*.feature` — the new-session picker on the terminals home: options from the payload
  alone, no eligibility filtering (annotate, don't hide), a derived-not-remembered target, the empty
  cases
- [ ] `tasks/02_*.feature` — the operator-visible state machine: seven states, the POST deadline and
  the outcome window as two separate numbers, late-arrival clears "no answer", a NEW sessionId on
  every retry, one scenario per coded refusal

## Notes

- Depends on **both** 02 (the route) and 03 (the worker handler + the ack this story surfaces).
- Design conformance is judged at build against DESIGN.md's binding checklist at the `390`/`768`/
  `1280` breakpoints, rendered against the fleet route — there is no committed mock.
