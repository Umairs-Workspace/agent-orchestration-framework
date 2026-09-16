---
type: story
number: 00
slug: the-watcher-node
title: "The watcher node — a fourth kind that declares what it counts and cannot declare an actuator"
parent: 57
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-28
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The watcher node

## User story

As an operator reading this system's loop registry,
I want a watcher to be its own kind of node — one that must say what it counts and how that number is
produced, and that has no vocabulary in which to say it also acts,
so that "this loop is watched" becomes a fact I can read off five lines of frontmatter instead of a
claim the optimizer made about itself.

Milestone 52 shipped the pairing check and the `monitoring` edge it reads
(`src/work-loops-checks.mjs:297`). What it had no way to express is the *other end* of the edge: a
node whose whole purpose is to count something the optimizer cannot edit. Today the only kinds are
`loop`, `actor` and `anchor` — so a watcher would have to be a loop (which optimises), an actor
(which means a human looked), or an anchor (which means the world answered). None of those is true of
a shell command that counts scenarios.

This story adds the fourth kind and freezes its vocabulary. It ships no check — 57/01 owns those —
and no records — 57/05 owns those. What it ships is the grammar both of them are written in.

## Tasks

- [x] `tasks/00_a-fourth-kind.feature` — `watcher` joins the kind vocabulary additively, and every record 52 and 55 shipped still parses with zero new findings
- [x] `tasks/01_what-a-watcher-must-declare.feature` — the counter-metric, its determinism and its measurement are required, and an absent determinism is a missing field rather than an assumed judge
- [x] `tasks/02_a-watcher-cannot-declare-an-actuator.feature` — the key is not admitted for the kind, so a watcher that claims to act is refused by the loader with no new code
- [x] `tasks/03_the-pairing-is-the-edge-that-exists.feature` — the pairing is the existing `monitoring` edge declared outbound from the watcher, and the watched loop gains no key with which to claim one

## Notes

- **Additive, or it is a regression.** 55/ADR-001 widened this exact enum from two kinds to three and
  deleted nothing; this story does it again. The measurable form of "additive" is that the eleven
  records in `.aof/loops/` today parse with **zero new findings** — task 00's compatibility scenario
  is that assertion, and `FF-5701` is its structural twin.
- **The absent `actuator` key is the load-bearing design choice, not a tidiness.** ADR-001 §3: a
  watcher with no vocabulary for acting cannot declare that it acts on what it watches. It also costs
  nothing to enforce — `ADMITTED_KEYS.watcher` omits the key, and the loader's existing
  `loop-key-not-admitted-for-kind` fires with no new code. That is why task 02 asserts the *existing*
  finding code rather than a new one.
- **`measurement:` is reused, deliberately, rather than given a watcher-specific name.** ADR-001 §6.
  Reuse is what makes the loader's `loop-field-prose-only` fire on a prose-only watcher for free, and
  what lets 57/01's independence legs read one field shape across both kinds instead of two.
- **This story ships no check and no record.** 57/01 reads this vocabulary; 57/05 writes records in
  it. The literals are frozen in ADR-001 §1/§2/§5 precisely so all three build in parallel — 52's own
  practice, where story 03 authored records against a schema frozen in an ADR while the code that
  read them was still being written.
- **The executable boundary ends at the loader.** Graph decomposition and the findings that compare
  a watcher's determinism with its authorities are behaviours of `src/work-loops-checks.mjs`; 57/01
  contracts them in tasks 01 and 02. This story proves the grammar and parsed edge shape they consume,
  without making its completion depend on another story's sole-writer module.
- **`src/work-loops.mjs` has 4 production dependents, all of them `commands/loops-*`** (`aof graph
  impact`, 2026-08-27). Nothing outside the loops command family can be broken by this change, which
  is why it is the story that may land first.
