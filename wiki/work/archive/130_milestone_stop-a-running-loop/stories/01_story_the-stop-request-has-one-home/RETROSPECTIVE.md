---
type: story
doc: retrospective
number: 01
slug: the-stop-request-has-one-home
parent: 130
title: "Retrospective — the stop request has one home"
created: 2026-09-24
updated: 2026-09-24
---
# 130/01 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`.

## R1 — A one-speller invariant must name the export that spells for everyone else

- **Kind:** defect · **Area:** architecture · **Stage:** review · **Owner:** architect · **Raised by:** 130/01 QA review close

**What happened.** ADR-001 §2 forbade every module but `stop-request.mjs` from spelling `"requested"`
or `"honoured"`, and named `STOP_LEVELS` as the one level→word map — but named no state→word export.
Story 04's producer, which must drop an `honoured` loop, would have had to spell the word or read
`state` blind. The review close added a frozen `STOP_STATES` export.

**Lesson.** When an ADR makes one module the only speller of a vocabulary, it must name the export
every other reader uses to compare against it — for EACH vocabulary the rule forbids, not only the one
the author was thinking about.
