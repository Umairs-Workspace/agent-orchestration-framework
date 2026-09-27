---
type: milestone
number: 136
slug: discovery-questions-in-the-loop
title: "Discovery questions in the loop — a loop-driven refine asks its business questions through the human in the loop, the lane waits, and the answer confirms the example"
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
origin: wiki/planning/research/RESEARCH-specification-by-example.md
depends: [131, 134]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 136 · Discovery questions in the loop — a loop-driven refine asks its business questions through the human in the loop, the lane waits, and the answer confirms the example

## Objective

**When `aof work loop` drives a refine, the example map's business-rule questions reach the operator
through 131's ask-and-wait path, only that lane waits, and the recorded answer upgrades the example's
provenance.** 134 makes discovery work in an interactive session. Under the loop the same open
question would stop the lane at the readiness gate, which is correct but blind: the question stays in
the lane and the operator is not told. 131 provides the channel, the wait and the answer record.
This milestone connects discovery to them.

**The outcome an outsider can verify:** a loop driving the refine of a story with an unanswerable
business rule posts that question on 131's channel, marked as a discovery question, with the rule
it bears on and the example it would settle. The other lanes keep building. The answer, given with
`aof work answer`, lands in the map as a `stated` or `confirmed` example whose provenance check reads
131's answer record. The lane continues to formulation. No business question takes a default in a
loop-driven refine.

## Scope

In scope:

- **A driven refine asks, it does not default.** The loop's refine drive treats an open business-rule
  question as 131's `NEEDS_INPUT`, never as a documented default. Technical questions keep their
  default path.
- **The ask carries the map.** The question names its rule, the example it would settle, and the
  options the PO weighed, in the form 131's producer paragraph sets. Contract-stage asks are the
  cheapest a loop makes, and the envelope's `phase` says so.
- **131's answer record is a provenance source.** 134's provenance check accepts 131's recorded
  answer (verbatim, who, when) as the person's record beside the interactive one. It is one more
  input to the same checker, not a second checker.
- **The live run.** One loop, one story with a real business question, the message received, the
  answer given, and the map read at the source showing the example's upgraded provenance.

Out of scope:

- **The channel, the wait and the answer verb**, which are **131**'s. This milestone uses them and
  changes none of them.
- **The map, the gate and the checker**, which are **134**'s.
- **Answering from Discord**, which 131 already defers.

## Stories

To be broken down at refine.

## Dependencies

- **131** provides ask-and-wait, the notifier envelope and `aof work answer` with its answer record.
  Without them a loop-driven discovery question can only stop the lane silently.
- **134** provides the example map, the business-versus-technical classification and the provenance
  checker this milestone feeds a second record into.
