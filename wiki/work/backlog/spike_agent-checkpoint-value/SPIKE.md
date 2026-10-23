---
type: spike
number:
slug: agent-checkpoint-value
title: "Do evidence-led checkpoints improve AOF beyond its existing safeguards?"
status: not-started
owner: architect
created: 2026-10-23
updated: 2026-10-23
timebox: 2d
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-human-led-learning.md
---
# Do evidence-led checkpoints improve AOF beyond its existing safeguards?

## Question

Which compact task-model checks and evidence-triggered replanning interventions, if any, improve
correctness or recovery over current AOF at matched total cost without increasing false completion?
This resolves PRD Q1 and gates `evidence-led-agent-checkpoints`. A negative or inconclusive finding
is valid and leaves that milestone unscheduled; a completed spike is not automatic rollout approval.

Research establishes a hypothesis, not the answer. [Intrinsic self-correction](https://arxiv.org/html/2310.01798)
can fail without external feedback; [Reflexion](https://arxiv.org/html/2303.11366v4) combines feedback
and episodic context; [SCoRe](https://arxiv.org/abs/2409.12917) requires specialized training. The
[video](https://www.youtube.com/watch?v=DkhhE97Swmo) concerns human learning. See
`wiki/planning/RESEARCH-human-led-learning.md` for limitations and the eight-trap mapping.

The finding must distinguish existing controls from a genuinely incremental intervention:

- Pin current baseline and candidate revisions, runtime/model/effort, task corpus and total budgets.
  Compare current AOF against a compact interpretation/assumption checkpoint and a rethink tied to
  contradictory test/contract evidence. Where feasible, separate reflection-only from verification-
  only and combined variants; report omitted comparisons rather than invent results.
- Use representative misunderstanding, repeated-patch, misleading-advice and false-completion cases,
  with held-out evaluation cases not supplied to the maker. Do not rewrite locked project contracts
  to make an intervention win. Repeat stochastic comparisons within the agreed budget and disclose
  sample size, variance and selection bias; no claim of broad statistical certainty from a small pilot.
- Report task correctness, regressions, false completion, recovery, attempts, wall time and total
  cost, including additional model calls and evaluation overhead. Existing attempt/time ceilings
  remain in force; replanning is not a way to reset them.
- Separate model self-report from independent execution/review evidence. Record where evidence is
  missing. A more persuasive explanation or more agreeing agents is not a correctness measure.
- Identify an adoptable minimum, or recommend no change, with the safe trigger/stop conditions and
  the uncertainty that remains. PRD Q3/Q5 still belong to the operator.

Repository grounding: `README.md` (loop machinery), `.aof/aof.config.json` (current caps/mode),
`packages/work/src/commands/continue.mjs` (phase door), and the existing memory work in
`wiki/work/153_milestone_memory-closes-the-loop/SPEC.md`. Do not duplicate the active
`wiki/work/backlog/spike_memory-retrieval-precision/SPIKE.md` investigation.

Recall applied: `wiki/work/153_milestone_memory-closes-the-loop/RETROSPECTIVE.md` R2 and
`wiki/work/149_story_continue-manual-mode-guides-the-operator/RETROSPECTIVE.md` R4 require separating
pre-existing failures from candidate regressions. Run comparisons on isolated, pinned revisions;
never attribute all failures on a stacked branch to the intervention.

## Timebox

- Box: `2d`, a proposed investigation ceiling, not authorization for paid runs. Resolve the
  operator's evaluation budget (PRD Q5) before live execution. Use disposable experiments only;
  no shipping implementation or edits to completed record documents in this spike.
- Stop when a reproducible comparison and an adopt/no-change/inconclusive recommendation exist.
  At the boundary, record the best available finding and uncertainty; extension needs explicit
  re-scoping. Missing evidence does not become a successful gate by assertion.

## Investigation

## Finding

## Outcome / Next
