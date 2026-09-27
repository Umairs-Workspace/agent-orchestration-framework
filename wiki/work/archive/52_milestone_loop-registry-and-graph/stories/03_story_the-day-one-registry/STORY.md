---
type: story
number: 03
slug: the-day-one-registry
title: "The day-one registry — nine evidence-cited records of the loops aof runs today"
parent: 52
status: done
owner: product-owner
depends: [52/00]
created: 2026-08-14
updated: 2026-08-14
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/03 · The day-one registry

## User story

As an **operator and as every later milestone in this arc**, I want the loops aof actually runs today
declared as nine reviewed, citation-backed records — including the ones whose owner nobody knows and
whose cap does not exist — so that the arc is built on a **faithful description** rather than the
PRD's sketch, and so that what aof does not know about its own machinery becomes an addressable list
instead of a feeling.

## Context

Nine markdown files under `<work.dir>/loops/`: seven `kind: loop` nodes and two `kind: actor` nodes.
This story writes markdown and touches **no** source file and **no** test file — which is why it can
be authored concurrently with all the code.

The content is the milestone's substance and the one part that cannot be faked. RESEARCH corrected
the PRD's table in two directions and both corrections land here:

- **An addition.** `mesh-assignment-reclaim` is a real control loop the PRD table missed — a dual
  staleness gate, a real actuator, and a genuine 15s wall-clock tick. It is also the **only** periodic
  loop on day one, which makes it load-bearing for the timescale check's honest output.
- **A subtraction.** `observe→tune` is **not** declared. Half of it does not exist and the half that
  does has no actuator — and RESEARCH's own consistency test ruled `degrade.mjs` and `work-doctor.mjs`
  out for exactly that reason. The absence is itself the finding: the day-one graph's answer to "what
  tunes aof's harness?" is *nothing*, readable in one second as the total absence of any
  `parameter-tuning` edge.

Each record's prose body carries the `path:line` evidence for every field it declares. The six
`owner: unknown` declarations are the most valuable output in the milestone, not an embarrassment —
they are milestone 58's inbox.

ADR references: 52/ADR-010 (the nine nodes, and why observe→tune is excluded), 52/ADR-002 (schema and
sentinels), 52/ADR-003 (pointer schemes), 52/ADR-004 (edges, and `actor:operator` as the exogenous
root), 52/ADR-005 (`ground: exogenous` on the operator only — an agent role is not ground).

## Acceptance

- Nine records exist under `<work.dir>/loops/`, each `id` equal to `<scheme>:<filename stem>`:
  seven `kind: loop` (build-to-green, review-fix-rereview, verify-triage-accept, autonomous-cascade,
  run-resilience, retrospective-memory-ingest, mesh-assignment-reclaim) and two `kind: actor`
  (`operator`, `product-owner`).
- All nine load with **zero `error`-severity** schema findings.
- No `kind: loop` node declares `unknown` for `controlled`, `reference`, `measurement` or `actuator` —
  every one is a pointer or an honest `prose:` path a reviewer can open.
- `run-resilience` declares every machinery field as a `module:`/`command:`/`config:` pointer and
  restates none of the transition table, the retryable set or the attempt ceiling.
- The declared gaps are declared, not hidden: `owner: unknown` where RESEARCH found no owner,
  `ceiling: uncapped` for build-to-green and review-fix-rereview, `prose:` where the only authority is
  a prompt file.
- `actor:operator` carries `ground: exogenous` and is the only ground-bearing node;
  `actor:product-owner` carries **no** `ground:` key.
- Every declared edge is defensible from evidence cited in the record's prose body — no edge is added
  to make a check pass, and no `monitoring`/`target-setting` **self-edge** is declared.
- Every `module:` pointer names the module that **defines** the symbol, never one that merely imports
  it (ADR-011 §13 carries the corrected sites; ADR-010's parentheticals had four import-site slips).
  Every `command:` pointer names a **registered** command id — so `work:memory-ingest`, which is not
  registered, may not be authored as one.
- An actuator names the **narrowest artifact that acts** — an agent definition or a defining symbol —
  never the orchestrating phase prompt, so a shared-actuator finding is a real shared lever rather
  than a citation artifact.
- No machinery or edge list is declared empty (`reference: []` is `loop-empty-list`) — the other hole
  an aspirational loop could pass through.
- No source file and no test file is modified by this story.

## Tasks

- [x] [00 — the two actor nodes and the exogenous root](tasks/00_actor-nodes.feature)
- [x] [01 — the four ACD phase loops](tasks/01_acd-phase-loops.feature)
- [x] [02 — the two engineered controllers](tasks/02_engineered-controller-loops.feature)
- [x] [03 — the declared edges between the nine nodes](tasks/03_declared-edges.feature)
- [x] [04 — the registry loads clean and reports its honest gaps](tasks/04_registry-loads-clean.feature)

## Notes

`depends: [52/00]` is a **verification-time** dependency only — the acceptance criterion "all nine
load with zero schema errors" needs the loader to exist. Authoring may (and should) overlap the code
freely.

The temptation this story must resist: declaring an operator edge to every loop so the groundedness
check comes out clean. A fabricated edge is the same failure as a fabricated owner. **Most components
being ungrounded on day one is the correct output** (ADR-012 §6/F3).

**This story owns OQ-1**, the milestone's single deliberately-open question: `actor:operator`'s edges
above its cited floor of `target-setting: [loop:autonomous-cascade]`. The rule is fixed — every further
edge needs a citation in the record body — but which edges clear that bar is answerable only with the
code open, at authoring time, and the whole grounding report is downstream of it.

**OQ-1 resolved at build time:** the operator declares the floor and no additional edge.
`src/bundle/commands/autonomous.md:3` accepts the operator-selected range and
`src/bundle/commands/autonomous.md:52` drives that range until `work:next` reports done. Inspection found
no equally direct evidence that the operator sets another day-one loop's reference, so adding another
endpoint would manufacture grounding rather than record it.

`optimizing:` is pinned by ADR-012 §6/F4 (`true` for build-to-green, review-fix-rereview and the
autonomous cascade; `false` for the rest), but it is the **only** field with no evidential anchor — so
each body must carry its own optimizer-vs-regulator justification, and the review-fix-rereview /
verify-triage-accept boundary must be written out in both records rather than left to be re-litigated.
