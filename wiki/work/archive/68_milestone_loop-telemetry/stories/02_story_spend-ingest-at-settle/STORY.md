---
type: story
number: 02
slug: spend-ingest-at-settle
title: "Spend ingest at settle — the transcript's own numbers, copied once, priced once"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-22
depends: [68/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Spend ingest at settle — the transcript's own numbers, copied once, priced once

## User story

As the framework closing out a run,
I want the session's own reported token counts read once and stamped onto the run record as it
settles,
so that what the run cost is recorded while the evidence is still there, rather than re-derived
later from a corpus that has since been overwritten.

## Why

Story 68/00 defines the shape and the writer that guards it. **This story is its producer** — and
without one, `spend` stays `null` on every record and the milestone delivers a schema instead of a
number.

**The ingest source is the transcript, and that is a measured choice, not a fallback.** Claude
Code's per-turn `usage` object carries exactly the four buckets ADR-003 adopts —
`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` — already
mutually exclusive, so ingestion is a **straight copy with no arithmetic**. It also carries `model`
and `effort` per turn. What it does **not** carry, verified on a live transcript, is cost of any
kind: there is no `costUSD` key. That is why ADR-004 splits `costSource` into `reported` and
`priced`, and why the price-table version travels with the number.

**Why a new module rather than a home in an existing one.** `aof graph impact` shows
`src/work-observe.mjs` already parses transcript `usage` — but ADR-006 demotes that module to a
*diagnostic companion*, explicitly not the primary source of spend. Putting the authoritative
ingest inside the module whose authority was just narrowed would re-merge the two roles the
architecture separates. A new module has no inbound edges to disturb and reads only the record
contract, which is also what makes this story **parallel-eligible with 68/01**: 01 populates
`sessionId` at runtime, 02 consumes a record that already has one.

**Absence must stay distinguishable from zero.** A run whose transcript cannot be found, or which
ends before anything is ingested, leaves `spend: null` — *not measured*. A genuinely free run
records `costUsd: 0`. Collapsing those two is how a reconstruction starts lying.

## Tasks

- [x] `tasks/00_transcript-to-spend.feature` — the four buckets, model, effort, turns and tool calls are read from the session's own transcript, subagents included, and copied without arithmetic
- [x] `tasks/01_settle-once-and-degrade.feature` — spend is stamped once as the run settles; a missing or unreadable transcript leaves `spend: null` and never fabricates a zero

## Notes

- **Subagent transcripts live under `<projectsDir>/<sessionId>/`** and are already walked
  recursively by `latestSessionActivityMtimeMs` (`src/agent-session-driver.mjs:431-466`) — the
  existing precedent for "the session's whole transcript tree", and the shape this ingest follows
  so the two never disagree about what a session includes.
- **This story declares no fitness function of its own.** FF-6803 and FF-6804 (story 68/00) already
  bind its output: an overlapping bucket set or a recomputed cost is refused by the writer this
  story calls, which is the point of enforcing in the writer rather than in each producer.
- **ADR-008 applies:** ingest reads what already happened. It introduces no bound, kills nothing,
  and nothing branches on `exitReason` here.
