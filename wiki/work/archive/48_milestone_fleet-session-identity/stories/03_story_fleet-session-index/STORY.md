---
type: story
number: 03
slug: fleet-session-index
title: "The fleet-side session index — what is live across the mesh, as a lookup that stores nothing"
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
# 03 · The fleet-side session index

## User story

As the control node serving the fleet face,
I want "what live sessions exist across the mesh, and what is each one doing" answered as a lookup on
`(nodeId, sessionId)` rather than a scan of assignments,
so that a session with no work item is a first-class answer instead of an absence, and the surfaces
that come next read one array instead of re-deriving liveness for themselves.

The benefit is challengeable and it is not "a key is added to a payload". Today the only DB-backed
session id is `global_assignments.session_id` (RESEARCH §6) — keyed by assignment, and present only
for a session that HAS one, which is the exact case this milestone is not about. So the question "is
this tuple a live session" has no answer that does not go through an assignment. After this story it
is an O(1) lookup over a projection that opens no store, writes no file and caches nothing — and a
free session answers `workItem: null` rather than being filtered out or handed a fake ref.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-index-is-a-projection.feature` — `buildSessionIndex({ nodes, assignments, now })`
      answers `lookup(nodeId, sessionId)` and its deterministic sorted array, gated by the node's
      already-derived `freshness` (a `stale`/`unknown` node contributes nothing), re-deriving no
      session-level liveness, persisting nothing, and rebuildable to a deep-equal result
- [ ] `tasks/01_attribution-and-the-free-session.feature` — `workItem` is explicitly present: `null`
      for a session with no assignment (never dropped, never a fabricated ref), `{ ref, assignmentId }`
      joined on `(target_node_id, session_id)` when one exists; the payload gains the additive
      top-level `sessions` array and `api.ts` its `MeshSession` mirror

## Notes

**Merge-order edge: after story 01** (m38/ADR-008 requires the proof be fed by the REAL producer, and
the producer only emits a `sessionId` once story 01's projection lands). Not a build order — buildable
in parallel.

**A projection, never a table — and the reason is a hard one.** ADR-007: a SQLite table would make the
control node a *writer* of session state, with its own row lifetime and therefore its own expiry rule,
because the source of truth is a TTL-expiring disk record. That is a second authority over liveness
(forbidden by the SPEC) and a second staleness rule (forbidden by `acd-session-ttl-reuses-isstale`).

**Node-level gate: yes. Session-level re-filter: no.** Membership reads the `freshness` the registry
already derived ([global-node-registry.mjs:197](../../../../../../src/global-node-registry.mjs#L197)) —
not merely the same predicate, the same *fact*, so the index and the fleet's own health dot can never
disagree. The gate is required, not defensive: a node that stops heartbeating leaves its presence file
frozen on disk with its sessions inside it, which would otherwise read live forever. Re-evaluating
session TTL here, by contrast, could disagree with the publisher (two machines, two configured TTLs) —
so it is not done.

**Anonymous sessions are absent from the index, and that is stated so it is never read as a filter.**
An index keyed on `(nodeId, sessionId)` cannot hold an entry whose id is `null`. Those sessions stay
COMPLETE in `nodes[].presence.sessions[]`: `sessions[]` is the complete liveness truth, the index is
its **addressable subset**.

**No composed string key.** A `"${nodeId}::${sessionId}"` key would be a second spelling of the tuple
the mirror already composes privately ([mesh-terminal-mirror.mjs:64-67](../../../../../../src/mesh-terminal-mirror.mjs#L64)),
and two spellings drift. A nested lookup has no spelling. This also keeps the index free of any import
edge to the mirror — the SPEC's "changing how the mirror routes is out of scope" honoured by not
touching it at all.

**No new file, no new `src/` root sibling.** `src/global-mesh-query.mjs` already IS the control node's
no-I/O shaper over `{ registry, assignments }`, already imports `global-node-registry.mjs`, and has
exactly one source dependent (`src/mesh-ui-serve.mjs`) — the graph fact that licenses growing it here
(ADR-009).

**No UI work.** One pure function plus two type declarations in `ui/src/fleet/api.ts` — shared with
story 01 at disjoint declarations (non-overlapping hunks).

Governing ADRs: **003** (authority split by fact; `workItem` derives one-directionally and is stored
nowhere), **007** (derived rebuildable projection; freshness gate; no composed key; the additive
`sessions` key), **009** (no new root sibling).
Fitness functions this story authors: `acd-session-index-derived-not-stored`,
`acd-session-attribution-single-authority`.
