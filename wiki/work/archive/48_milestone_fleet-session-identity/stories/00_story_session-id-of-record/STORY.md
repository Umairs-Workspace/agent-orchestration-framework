---
type: story
number: 00
slug: session-id-of-record
title: "The session id of record — stop discarding the id the assistant already gave us, key the record by it, and reap what expires"
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
# 00 · The session id of record

## User story

As the operator watching a fleet where machines are working,
I want every live assistant session on a node to be recorded under the id that assistant itself
issued — one record per session, and gone from disk once it is gone,
so that a session can be *named* later by any surface that wants to reach it, and two sessions in one
repo stop being one lying record.

The benefit is challengeable and it is not "a field is added". Today
[mesh-session.mjs:65](../../../../../../src/mesh-session.mjs#L65) keys a record by
`(nodeId, workspaceId, assistant)` and
[commands/mesh-session.mjs:201](../../../../../../src/commands/mesh-session.mjs#L201) parses the hook
payload's `session_id` and then throws it away — so two `claude` sessions open in the same repo are
**one** record that each overwrites, and `aof session end` on either deletes the other's liveness
(RESEARCH §3, measured). After this story they are two records with two ids, `end` on one cannot kill
the other, and a session that dies without an `end` — the only way a Codex session can end at all,
since Codex has no `SessionEnd` event (RESEARCH §1) — leaves disk within one TTL instead of forever
(RESEARCH §4: no reaper exists anywhere today).

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-id-ladder.feature` — the session id is READ from the assistant through one ordered
      ladder (`--session` → payload `session_id` → `CLAUDE_SESSION_ID`) and never fabricated; no id on
      any channel lands as `sessionId: null`, and a supplied id is stored byte-identical
- [ ] `tasks/01_one-session-one-record.feature` — the record key gains its fourth component: two live
      sessions in one repo are two records, `end` deletes only its own leaf, and the record is the
      re-frozen ordered seven
- [ ] `tasks/02_orphan-reaper.feature` — `reapExpiredSessions` removes TTL-expired leaves (including
      pre-m48 3-part ones) at the `start`/`ping` write seam under the SHARED liveness predicate, and a
      reap fault never fails the session write

## Notes

**This story emits no wire change and depends on nothing.** It is the producer dimension only — the
presence projection still reads the record it always read (`record.sessionId` simply starts being
there). That is what makes it mergeable first, alone, with a blast radius the graph bounds precisely:
`src/mesh-session.mjs` has exactly two source dependents — its own CLI (in this story) and
`src/mesh-presence.mjs` (story 01's single file) — and `src/commands/mesh-session.mjs` has exactly
one, `src/cli.mjs`.

**No UI work.** Zero files under `ui/`.

**The id is never generated — that is the load-bearing negative.** ADR-001: a fabricated id would be
stable and unique and *wrong*, because the terminal mirror routes on the id the worker captured off
the assistant's own transcript ([mesh-worker-execution.mjs:975-1032](../../../../../../src/mesh-worker-execution.mjs#L975)),
and RESEARCH §2 measured those to be the same Claude Code UUID. Two spellings of one session is
exactly the second authority the SPEC forbids.

**`--session` is a real flag, not a test seam.** It is how a non-hook caller (a human, CI, a future
launcher — milestone 50) supplies an id, and it heads the ladder.

**Migration is deliberately absent (ADR-002/ADR-006).** A pre-m48 3-part leaf is an anonymous record
that goes stale within one TTL window and is unlinked by the first `start`/`ping` after deploy. The
live soak on this machine has real records — task 02 must prove exactly that, not assume it.

Governing ADRs: **001** (the ladder; never fabricated; `sessionId: null` is live-but-not-addressable),
**002** (the 4-part key, the re-frozen seven-key record, no migration), **006** (TTL is the only
mechanism; the reaper at the write seam; one staleness predicate).
Fitness functions this story authors: `acd-session-id-never-fabricated`, `acd-session-leaf-per-session`,
`acd-session-orphan-reaped`, and the in-place amendment of `acd-session-record-frozen`.
