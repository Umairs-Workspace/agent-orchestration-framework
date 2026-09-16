# 04 · The signals that are not the mesh — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Three non-mesh trigger sources that answer only *which scope*
`src/work-trigger/sources.mjs` resolves a cadence, a CI signal and an inbound feedback finding to a scope and nothing else — no source carries a level, a cap, a gate or a launch.

### A finding-triggered wake never classifies
The family cannot reach a feedback record's body: neither `RAW_FEEDBACK_KEYS`'s text field nor `FEEDBACK_CLASSIFICATION_KEYS`'s verdict field is reachable from it, and two planted captures whose bodies differ and whose attribution is identical resolve byte-identically. Only existence and attribution are read.

### A CI signal is read for its ref, never for its outcome
No source reads a build status, a pipeline name or a failure class, asserted over a planted signal carrying all three.

### Every scope resolves through the loop's own forms, or is refused by name
Scope is resolved only through `LOOP_SCOPE_FORMS`; no scope pattern, range grammar or item-ref regex is authored in the family. A story-shaped signal is a coded refusal naming the driver it belongs to rather than an implicit widening to a whole-stream walk, and a well-formed driver ref bearing no item resolves — the leaf performs no filesystem read at all.

### A source that cannot answer refuses, never resolves to nothing
An unresolvable signal produces a coded refusal naming the source and what it could not resolve; the refused and resolved sets are disjoint and together account for every signal, so nothing is dropped between them.

## Assumptions

- **`decideLoopScope` remains the one scope resolver** — the family's answers move when the loop's own forms move only because it imports them rather than restating them.
- **55/ADR-005's raw-capture rule holds at its declaring module** — the classification vocabulary this family is asserted against is read from `src/feedback-records.mjs` and `src/commands/feedback.mjs`, so a vocabulary that grows is covered with no edit here.
