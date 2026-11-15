---
type: story
doc: retrospective
number: 01
parent: 191
slug: a-launched-session-runs-claude-with-remote-control
title: "Retrospective — a launched session runs Claude with Remote Control"
created: 2026-11-15
updated: 2026-11-15
promotionFrom: 1
---
# 191/01 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A record key was chosen without measuring the other writer of the same record

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** 191/01 verify · **Promoted to:** none

**What happened.** ADR-002 §4 had the launcher register a Claude launch as `claude`. Claude's own
hooks register the same session as `claude-code`. Verify measured two records and two presence
entries for one id against a real `claude`, and a pane that read as not relaying for up to 30 s
after each hook ping. Every scenario was green, because the fixture had only one writer.

**Why.** The ADR named a label for the launcher's record and did not read what the hook path keys
the same record with. The contract tested the launcher alone.

**Lesson.** When two writers upsert one record, the refine reads both writers' keys at source, and
the contract has a scenario where both write. A key that one writer chooses alone is an assumption
until the other writer has been measured.

**Refs:** 191/F-05 · ADR-002 §4 amendment (2026-11-14) · FF-19110

## R2 — A real-launch `@manual` was scheduled at a story gate that could not run it

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** 191/01 verify · **Promoted to:** none

**What happened.** Task 03 needs the deployed build, the operator's restart and the Claude app on a
phone. At 191/01's verify none of these were available, and a stand-in sign-off was refused (F-06).
The operator carried it to the milestone's outsider check, which needed all three anyway.

**Why.** The scenario was written as the story's own `@manual`, and its preconditions were not
checked against what a story gate has.

**Lesson.** A `@manual` scenario that needs the deployed build and the operator's device is written
as part of the milestone's outsider check at refine time, not as a story task.

**Refs:** 191/F-06 · m49/F-49-04-c
