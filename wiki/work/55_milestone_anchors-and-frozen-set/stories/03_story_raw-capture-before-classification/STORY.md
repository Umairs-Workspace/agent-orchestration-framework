---
type: story
number: 03
slug: raw-capture-before-classification
title: "Raw capture before classification — the menu never gets to ask the question first"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · Raw capture before classification

## User story

As the human whose judgment is the only exogenous ground this system has,
I want what I actually said recorded **verbatim, first**, before anything offers me a severity, a
type or a category to pick from,
so that the loop collects what I meant rather than the nearest item on a list — because a feedback
loop that presents a menu collects selections from the menu.

`aof:feedback` already does this, and it does it on nothing but conviction.
`src/bundle/commands/feedback.md:6-8` says *"capture now, classify never"* and *"must **never** stop
to ask the user how or where to file it"*; the word "never" appears three times in thirty lines. The
CLI half — `aof work feedback <ref> --note "…" --actor <who>` — takes free text and an actor and has
no classification argument at all, which is exactly right, and **nothing would fail** if someone
added `--severity` tomorrow.

That is the whole of the story. The behaviour is correct today and unprotected today, and milestone
66 measured what unprotected correctness is worth against this class: a prior lesson *"recalled,
cited by id, and marked 'Honoured' in the architecture document — then violated inside the paragraph
that cited it"*, with the conclusion that *"recall is not a weak form of enforcement; against this
class it is not a form of enforcement at all."*

## Tasks

- [x] `tasks/00_the-raw-write-is-first.feature` — the verbatim text is persisted as its own record before any classified record exists, and it is never rewritten in place
- [x] `tasks/01_no-menu-at-capture.feature` — the capture path refuses a classification argument and offers no enumerated choice, whatever the target's type
- [x] `tasks/02_triage-references-the-raw.feature` — a later classification points at the raw record rather than replacing it, so what was said and what it was filed as stay separately readable

## Notes

- **This story protects behaviour that already works.** There is no bug to fix and no user-visible
  change to make on the happy path. The deliverable is that the behaviour survives the next person
  who has a reasonable-sounding reason to add a flag. That is an unusual shape for a story and it is
  worth saying out loud in review so nobody "improves" it into a feature.
- **Emphasis is what the rule currently has.** Three "never"s in thirty lines is what a rule looks
  like when prose is holding it up. `FF-5507` is a guard, not a paragraph, for the reason milestone
  66 measured directly.
- **It is a frozen-set member.** ADR-005 §3 lists anchor integrity among the rules the optimizer may
  not touch, which means 55/04 compiles it alongside the others. The two stories touch different
  files — this one owns `src/bundle/commands/feedback.md` and the capture path; 55/04 owns
  `src/claude-settings.mjs` — so the dependency is on the frozen-set *vocabulary* declared in
  ADR-004 §1, not on 55/04's code. Parallel-eligible.
- **The rule is bigger than `aof:feedback`, and is declared once here for that reason.** Milestone 61
  (the acceptor) and milestone 78 (a human signature on an execution record) both collect human
  judgment and both are downstream of this. ADR-005 §4 — declared once so neither invents its own
  answer.
- **Two writes, ordered, never one nullable field.** A nullable classification column is a menu with
  a blank option, and it makes "was this classified at capture or after the fact" unanswerable from
  the record itself. ADR-005 §1.
