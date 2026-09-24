---
type: milestone
number: 134
slug: discovery-the-example-map
title: "Discovery before formulation — a story's rules and key examples are mapped, and its business questions go to a person, before any contract is written"
status: in-progress
owner: product-owner
created: 2026-09-23
updated: 2026-09-24
origin: wiki/planning/research/RESEARCH-specification-by-example.md
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 134 · Discovery before formulation — a story's rules and key examples are mapped, and its business questions go to a person, before any contract is written

## Objective

**Before the Three Amigos formulate a story, the story gets an example map: the business rules it
implies, two or three key examples per rule with real values, and the questions nobody on record can
answer. The business questions go to a person, and the story cannot reach build while one is open.**
aof has formulation (Scenario Outlines, the three zoom levels, traceability) but no discovery. Its
examples are written by agents, as a coverage matrix, after the behaviour is decided. Its open
questions are answered by the agent as documented defaults and found at review, when changing one
costs an amendment round. The origin research measures the gap; this milestone adds the missing
front half and nothing else.

**The outcome an outsider can verify:** with `work.examples.enabled` on, refining a story writes an
example map before any `.feature`. Each example carries its provenance (`stated`, `confirmed` or
`proposed`), and only a person's recorded answer can make an example `stated` or `confirmed`; code
checks this, not the prompt. A story with an open business-rule question is reported by
`aof work doctor` and stops at the Contract stage. `--autonomous` refine brings those questions to
its single end review as questions, never as defaults. With the key off, refine is byte-for-byte what
it is today.

## Scope

In scope:

- **The example map artefact.** Rules, key examples under each rule (real values, always including
  the awkward edge), questions with their state (open, asked, answered; an answered question becomes
  an example), and per-example provenance. Where it lives (a `STORY.md` section or a sibling doc,
  research §7 Q1) and its line budget are the ARCHITECTURE's call. A map past one screen is a story
  to split, and the doc-budget lane holds it to that.
- **The discovery beat.** The head of the story Contract stage (`src/bundle/commands/refine.md`),
  before any headline Scenario. The PO drafts the map from the user story and the SPEC. Business-rule
  questions go to a person through `AskUserQuestion`. Technical questions (which library, which seam)
  stay with the architect and may still take a documented default. Solo and orchestrated modes do
  the same beat.
- **Who classifies a question** as business rule or technical (research §7 Q2): the PO agent
  proposes, and the ARCHITECTURE decides whether a rule in code backs the call. The line itself,
  "policy goes to a person, engineering may default", is this milestone's.
- **Provenance anchored in code.** An agent never writes `stated` or `confirmed`. The upgrade is
  checked against a record the agent did not author, such as the harness's `AskUserQuestion` result
  in the session transcript (`src/work/observe.mjs` already reads transcripts). Near-miss R6 (m62)
  applies: the ADR that names that reader owes a measured check that it returns the answer and its
  giver. If no such record can be anchored, the milestone says so and does not ship a label that
  only looks enforced. Whether `ruled` (decided by an ADR) joins the vocabulary (§7 Q5) is the
  ARCHITECTURE's call.
- **The readiness gate.** `aof work doctor` findings: an open business-rule question blocks build
  (error); a rule with no example warns (the rule is not understood); a map whose rule count
  outgrows the story warns (the Example Mapping split signal). The Contract stage stops on the error.
- **`--autonomous` keeps its one stop.** Business-rule questions are the one class that may not take
  a default. They batch into the end-of-cascade review as questions.
- **Proportion.** `work.examples.enabled`, default off (the same way `work.plan.enabled` works for
  `PLAN.md`). Off for chores, spikes and UAT sessions, which already refuse refine. A small, purely
  technical story declares the map not applicable in one line.
- **The baseline and the live run.** Before the gate ships, count the misunderstood-requirement
  review findings and amendment rounds per story on a few recent milestones (research §7 Q7). Then
  run one real story through discovery in an interactive session, with its questions asked and
  answered and its map read at the source.

Out of scope:

- **Formulation from the map.** `Rule:` blocks, key examples as headline Scenarios, and the lint that
  keeps an agreed example in the contract belong to **135**. Until 135 lands, the map informs the
  Contract but nothing enforces what reaches it.
- **Loop-driven discovery.** A refine driven by `aof work loop` asks through 131's channel, belongs to
  **136**. Here a loop-driven refine with an open business question stops at the gate, as any
  blocked Contract does today.
- **A milestone-level rules map** at Break-down, to cut stories along rules (§7 Q6). It is a
  follow-on once story maps have run. Doing it now would make an unproven artefact the input to
  every cut.
- **Changing QA's Examples tables.** The coverage matrix stays as it is.

## Stories

- [ ] `01_story_the-baseline-is-counted`: the before-number. Misunderstood-requirement findings
  and amendment rounds per story on 124, 126, 127 and 133.
- [ ] `02_story_the-map-is-a-document`: the `EXAMPLES.md` grammar and its one parser, the
  work-examples family, and the `work.examples.enabled` gate.
- [ ] `03_story_the-answer-is-read-from-the-harness`: one reader of `AskUserQuestion` answers,
  stamped onto the run record at settle from the real transcript store.
- [ ] `04_story_the-readiness-gate`: the examples doctor lane, the `EXAMPLES.md` budget row, and
  the continue door.
- [ ] `05_story_the-discovery-beat`: refine's discovery block, the PO and architect briefs, the
  template, and `--autonomous` asking at its one stop.

The live run (one real story through discovery, interactive) is the milestone's `@manual`
verification, not a story (ARCHITECTURE ADR-007).

## Dependencies

None in the stream. Interactive `AskUserQuestion` works today, so this milestone does not wait for
131. The loop-driven path does, and it is 136's.
