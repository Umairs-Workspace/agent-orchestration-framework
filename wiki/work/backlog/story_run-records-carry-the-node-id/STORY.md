---
type: story
number:
slug: run-records-carry-the-node-id
title: "Run records carry the node id, not the node name — a machine name never reaches source control"
status: not-started
owner: product-owner
created: 2026-09-17
updated: 2026-09-17
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# Run records carry the node id, not the node name

## User story

As **an operator whose work tree is a public repository**,
I want **every run record — its `node` field and the `runs/<node>/` folder it sits in — to name
the node by its stable mesh id rather than by the machine's hostname**,
so that **a lane commit can carry its run records into source control without disclosing a
machine name**, the private-terms guard has nothing to catch in a record the loop wrote, and a
record still resolves to the node that wrote it after a hostname changes.

Measured 2026-09-17 (127/VERIFICATION `F-12`): twelve run records and six `runs/<node>/` folders
on the `127-129` branch carried the control node's hostname, written by the loop's lane commits
(`git commit --no-verify`, headless by design) — the guard first spoke at 127's accept, and the
records were scrubbed by hand (`20582a8`). The identity already exists: `src/node-identity.mjs`
derives a stable `mesh.nodeId` (an operator-pinned or persisted id wins verbatim, the hostname is
only the derivation's seed), and the presence record, the fleet and `aof mesh identity` all speak
it. The run store is the one writer still spelling the hostname.

## Tasks

<!-- Authored by aof:refine. Expected shape: the run writer and the `runs/<node>/` folder take the
     node id from the identity seam (never the hostname); every reader that resolves a record's
     node (`run-status`, `observe`, the fleet's run attribution, `recover-push`) answers by id;
     existing hostname-named records are read through one migration or one documented alias;
     the private-terms guard gains no exemption. -->

## Notes

- Captured at 127's accept as the operator's next story; it depends on nothing in flight.
- The loop's `--no-verify` lane commit is a second guard gap (127/RETROSPECTIVE R7, routed to
  129) and is not this story's — this story removes the disclosure at its source so the guard
  has nothing to catch in a run record.
- A node whose `mesh.nodeId` is itself derived from the hostname (the documented default when no
  id is pinned) would still disclose it; the refine decides whether the id is pinned to an opaque
  value on first use or the derivation stops seeding from the hostname.
