---
type: story
doc: retrospective
number: 01
slug: recalls-have-complete-verdict-records
parent: 153
title: "Retrospective — recalls have complete verdict records"
created: 2026-10-11
updated: 2026-10-11
promotionFrom: 1
---
# 153/01 · Retrospective

These are story-level lessons. The milestone's lessons are in `../../RETROSPECTIVE.md`. Findings are referenced, not restated (`../../VERIFICATION.md`).

## R1 — Retiring a verb or adding a word reaches suites the story lane never selects

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** aof:verify 153 · **Promoted to:** none

**What happened.** 01 retired `aof work memory brief` and added the verdict word `"honoured"`. Its lane ran its own files and passed. At the milestone gate, four `work-memory-seam` cases still asserted that `brief` composes over recall. 130/01's literal guard also refused `"honoured"` in `feedback-records.mjs`, because it owns that word for stop requests. Neither suite was in `files:`, so the build never ran it.

**Why.** A retired verb and a new literal are both read by every suite that pins the vocabulary. A `files:` list names the files the story writes, not the suites that read those words.

**Lesson.** When a story removes a verb, flag or word, or adds a literal another module already owns, grep the test tree for the spelling. Run every suite that names it before review. A vocabulary change has readers outside its own package.

**Refs:** `../../VERIFICATION.md` F-01.
