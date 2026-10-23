---
type: milestone
number:
slug: evidence-led-agent-checkpoints
title: "Agent checkpoints change course on evidence, not confidence"
status: not-started
owner: product-owner
created: 2026-10-23
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-human-led-learning.md
depends: [agent-checkpoint-value]
---
# Agent checkpoints change course on evidence, not confidence

## Objective

An operator can see why an agent trusts or changes its approach: the contracted outcome, the
assumption under test, the contradictory or supporting observation, and the next bounded action.
Ship only the minimum intervention supported by the preceding spike, with a comparison to unchanged
AOF. Improved prose alone is not success. A negative or inconclusive finding keeps this milestone
unscheduled until the operator explicitly re-scopes it.

## Scope

In scope:

- Compact checkpoints at existing planning/build/failure boundaries, not a second workflow engine.
  Link the proposed approach to confirmed examples and repository facts. Surface genuine business
  ambiguity to the owner instead of letting an agent silently settle it.
- Evidence-triggered replanning: repeated equivalent failure or a counterexample yields a revised
  hypothesis, a bounded next experiment, or escalation/stop. Preserve existing attempt/deadline
  limits and failure classes; no automatic increase in autonomy or reset of a budget.
- Distinguish built, tested, reviewed and accepted. Cite actual verification artifacts and unknowns;
  a model's confidence, rationale or agreement with another model cannot satisfy a gate.
- Reuse existing feedback/run evidence and memory paths where applicable. No new reflection store,
  automatic memory promotion, private chain-of-thought capture, or claim of model-weight learning.
- Maintain baseline behavior when the intervention is not selected. Selection syntax, compact
  artifact placement and exact triggers are refinement decisions grounded in the spike; PRD Q3/Q5
  gate any default rollout and additional spending.
- Independently check the candidate on held-out cases and report correctness, false completion,
  regressions, recovery, attempts, total cost and latency against the pinned baseline. Keep negative
  results visible; broader rollout is not a prerequisite for shipping a bounded, opt-in capability.

Out of scope:

- Rebuilding contracts, verification, retry control, provider policy or the memory system; the
  existing `memory-retrieval-precision` spike retains ownership of retrieval redesign.
- Changing locked acceptance criteria to fit an agent's answer, unbounded self-critique, model
  training, mandatory delays, human learning assessment, or new UI surfaces.

[Research](../../../planning/RESEARCH-human-led-learning.md) maps all eight video traps to candidate
controls and cites [Huang](https://arxiv.org/html/2310.01798) and
[Reflexion](https://arxiv.org/html/2303.11366v4). These are motivations, not measured AOF benefits.

Recall applied: `wiki/work/153_milestone_memory-closes-the-loop/RETROSPECTIVE.md` R1 requires refine
read/write sets to include census and roster controls affected by added files; R2 requires baseline
failure attribution. `wiki/work/158_story_native-permission-approvals/ARCHITECTURE.md` ADR-002 keeps
permission approval distinct from phase success and forbids using activity to reset deadlines.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `agent-checkpoint-value` — waits for a reproducible incremental-value finding, its supported
  trigger conditions, and known failure modes. Completion alone is insufficient if the finding is
  negative or inconclusive; the operator must review it before scheduling this milestone.
- Existing loop and memory capabilities are the baseline, not new sibling deliverables. Read
  `packages/work/src/commands/continue.mjs`, the current canonical phase assets and bound owners at
  refine. Do not mistake historical PRD proposals for shipped code.
