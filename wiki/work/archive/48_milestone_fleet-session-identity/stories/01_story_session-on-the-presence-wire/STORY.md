---
type: story
number: 01
slug: session-on-the-presence-wire
title: "The session on the presence wire — a frozen, ordered six that carries the id, and a wire that stays a pass-through"
parent: 48
status: done
owner: product-owner
created: 2026-08-10
updated: 2026-08-11
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · The session on the presence wire

## User story

As the control node that has to answer "what is live out there",
I want every session a node publishes to arrive carrying its own id and the run fact a reader needs,
in one frozen key order that survives every hop of the fabric untouched,
so that a surface built later reads an addressable session off the wire instead of inferring one from
free text.

The benefit is challengeable and it is not "the type is updated". Today
[mesh-presence.mjs:101-106](../../../../../../src/mesh-presence.mjs#L101) projects a session down to
exactly `{ workspaceId, repo, assistant, lastPingAt }` — no id — so the id story 00 records dies at
the *first* hop and nothing downstream can route on it. RESEARCH §5 traced all nine hops and found
that only two places are lossy or need teaching: that projection, and the TypeScript mirror. After
this story the id crosses the fabric intact and `src/control-stream-server.mjs` — 37 dependents, the
highest-risk file on the path — is not edited at all.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_frozen-session-entry.feature` — `readLiveSessions` emits the exact ordered six
      `{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }`, both new keys always
      present (`sessionId` null for an anonymous record, `workspaceHasRun` false by default), the m38
      four keeping their relative order
- [ ] `tasks/01_the-wire-stays-a-passthrough.feature` — a session entry survives the fabric hop whole:
      the control's `safeSessionArray` gains no per-field whitelist, the top-level presence record's
      own shape is unchanged, and `PresenceSession` in `ui/src/fleet/api.ts` is the typed mirror of the
      six with `sessionId: string | null`

## Notes

**This story is behaviour-neutral and depends on nothing.** `workspacesWithRuns` is an injected set
that DEFAULTS TO EMPTY, so with only this story merged every entry reports `workspaceHasRun: false`,
the launcher's own filter still runs, and no rendered output moves. That default is the whole reason
this can land before story 02 (ADR-005/ADR-008) — it is a contract, not a convenience.

**`ui/src/fleet/api.ts` is a type ON THE WIRE, not a UI surface.** The SPEC puts every UI surface out
of scope; a wire contract's typed mirror is in scope, because a type that lags the wire is how
milestone 49 reads a field that is not there. No component, no layout, no interaction is touched.
This file is shared with story 03 at a disjoint declaration (`PresenceSession` here,
`MeshSession`/`GlobalMeshStatus.sessions` there) — non-overlapping hunks, the m38/ADR-007 shape.

**Do not teach the pass-through hops.** ADR-005 states this as a decision because the
helpful-looking change — validating each session field at the control — converts a free-forever seam
into one every future milestone must edit, and done wrong it silently drops the very key this
milestone adds. `safeSessionArray` stays an entry-level "is this a non-array object" guard.

**Where the fan-in is.** `src/mesh-presence.mjs` has nine source dependents (`commands/mesh-heartbeat`,
`commands/mesh-identity`, `commands/run-start`, `control-stream-server`, `global-node-registry`,
`mesh-assignment-reclaim`, `mesh-clone-credential-provider`, `mesh-launcher`,
`mesh-worker-execution`). That fan-in is precisely why this story is additive projection work and
touches no predicate.

Governing ADRs: **005** (the frozen ordered six; the two-file teach-list; every pass-through stays
one), **001** (`sessionId` present-and-null, never omitted), **009** (the projection has one home —
the `workspaceHasRun` stamp lands here, not inline in the launcher).
Fitness function this story authors: `acd-session-entry-frozen-wire`.
