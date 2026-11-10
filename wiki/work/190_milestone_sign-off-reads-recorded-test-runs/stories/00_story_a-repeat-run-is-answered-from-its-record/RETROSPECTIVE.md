---
type: story
doc: retrospective
number: 00
parent: 190
slug: a-repeat-run-is-answered-from-its-record
title: "Retrospective — a repeat run is answered from its record"
created: 2026-11-10
updated: 2026-11-10
---
# 190/00 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A "one producer" control is censused against today's tree before it is declared

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** 190/00 build

FF-19004 ("only `record.mjs` spawns `git write-tree` or sets `GIT_INDEX_FILE`") would have been red on
arrival. Two modules already did so: the loop's `readBuildBaseline` and the hyperagent plan
extraction. RESEARCH had not censused them, and the build carried them in a shrink-only baseline.

**Lesson.** A refine that declares an exclusivity control runs its search over the current tree
first, and either names the existing producers as a baseline or routes their move as a story.

**Refs:** STATE Feedback (190/00 build), OUTCOME Gaps.

## R2 — A wait rule is costed against the largest run it can wait on

- **Kind:** near-miss · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** 190/00 review

ADR-002 §4 has a caller wait on any in-flight run that covers its selection. With a 53-minute
whole-tree run and a 2-hour deadline, a 13 s ask can wait 53 minutes.

**Lesson.** A coalescing rule states its worst-case wait, and bounds it when that exceeds the cost
of simply running the asked selection.

**Refs:** STATE Feedback (190/00 review close), OUTCOME Gaps.
