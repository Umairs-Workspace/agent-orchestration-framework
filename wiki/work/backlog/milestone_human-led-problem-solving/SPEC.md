---
type: milestone
number:
slug: human-led-problem-solving
title: "AOF guides the human through problem solving without taking over"
status: not-started
owner: product-owner
created: 2026-10-23
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-human-led-learning.md
depends: [guided-mode-boundary, 149, 150]
---
# AOF guides the human through problem solving without taking over

## Objective

An operator working on one contracted story or task can choose a learning-oriented manual interaction:
understand the problem, predict behavior, choose an approach, write the implementation, and interpret
evidence with AOF's help. The human chooses how much help to reveal and retains the keyboard. This
extends 149's guide and 150's explanation, rather than inventing a competing manual mode.

## Scope

In scope:

- An explicit opt-in teaching interaction in the existing terminal workflow. Show the active mode,
  what the human owns, and which tests/bookkeeping AOF may perform. Preserve normal manual and
  explanation-only behavior when teaching is not selected; exact invocation is settled at refine.
- Ground the guide in the real story contract, confirmed examples, inherited ADRs, `reads:`/`files:`
  and test locations. Ask the human to restate the problem, predict an example and suggest an
  approach before revealing a solution, while allowing them to skip or ask directly for help.
- Offer the six-stage problem-solving map: reinterpret, find analogies, consider solutions,
  evaluate a candidate, implement, evaluate the implementation. It is navigable and iterative,
  not a new lifecycle or a mandatory sequence of approval clicks.
- Pull-based progressive help: diagnostic question, conceptual hint, analogous example, partial
  scaffold, worked explanation on request. Label assistance and uncertainty; keep one focused
  question at a time and avoid unsolicited code dumps, forced waiting or endless Socratic loops.
- Teach the eight video traps through the current problem, without diagnosing/shaming the human.
  Examples and counterexamples address Forming/Assumption; revisiting an approach addresses
  Dislodging/Achievement; stage awareness addresses Location; prerequisite questions address
  Progression; pull-based hints address Interruption; source/test checks address Mislead.
- Apply the boundary spike's supported-path finding. No implementation edits, developer delegation,
  auto-fixes or silent transition to unattended execution in the teaching interaction. A request to
  hand off implementation must visibly leave it through existing execution semantics, not happen
  because the user requested a stronger hint. Unsupported paths are explained or refused.
- Preserve the human-code review handoff and existing verification. AOF returns findings to the
  human instead of repairing their implementation. Tests and normal manual run/status effects are
  explicit; a guide is not falsely advertised as a zero-write operation.
- No new learning transcript store or profile. `aof:explain` remains terminal-only and does not
  save output, mint a run or move status. Existing provider-session retention is not overridden.

Out of scope:

- A new manual command family, milestone cascade, remote guide, desktop/board redesign, autonomous
  tutor implementation, curriculum/LMS, model training or changes to native permission policy.
- Claims of mastery or learning efficacy from completing the work; the next milestone supplies
  optional checks. The guide itself must remain usable without those checks.

[Loksa et al.](https://faculty.washington.edu/ajko/papers/Loksa2016ProgrammingProblemSolving.pdf)
provide the stage model; [the video](https://www.youtube.com/watch?v=DkhhE97Swmo) and
[Prather et al.](https://arxiv.org/html/2405.17739) motivate the trap vocabulary. See
`wiki/planning/RESEARCH-human-led-learning.md` for the evidence limits; this design is a hypothesis.

Recall applied: 149's `RETROSPECTIVE.md` R3/R5 make run-reactor semantics and an external-repository
walk part of the boundary, not afterthoughts. R2 and 153's `RETROSPECTIVE.md` R1 require the eventual
refinement write sets to include affected bundle/test censuses, not just prompt files.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `guided-mode-boundary` — waits for the capability/effect matrix and supported entry/resume/review
  paths. Incomplete boundary evidence is not a successful gate; scope must be narrowed explicitly.
- `149` — reuses its local manual guide, human implementation and review handoff, rather than replacing them.
- `150` — reuses purpose explanation while retaining its separate read-only contract.
- The agent-checkpoint track is not a prerequisite. Normal automated delivery remains unchanged.
