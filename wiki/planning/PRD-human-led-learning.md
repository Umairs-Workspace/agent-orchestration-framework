# PRD — Human-led learning and evidence-led agents

> Incorporate the ideas in [Therapy for the Vibe-Coded Brain](https://www.youtube.com/watch?v=DkhhE97Swmo)
> into AOF in two distinct ways: test whether compact, evidence-led checkpoints improve coding-agent
> reliability, and extend AOF's existing manual path into a guide that helps the human understand,
> choose, implement and evaluate the work. The goal is not more approval clicks or more explanation
> after an autonomous build. It is competent human control, with learning and software delivery
> evaluated separately. This is a proposed roadmap for operator review, not authorization to change
> execution defaults or a claim that either intervention has already succeeded.

## Objective

**Objective.** An operator can use AOF to work through a contracted story themselves, ask for
progressively stronger guidance, and check their understanding on a new example without the agent
taking over implementation. Separately, an AOF-specific experiment determines whether task-model
checks and evidence-triggered replanning improve agent outcomes beyond the existing contract,
review, verification and retry machinery. Any shipped agent intervention is bounded, traceable to
external evidence, and independently evaluated; working code never stands in for demonstrated
human understanding or actual human acceptance.

## Context & Constraints

Repository observations are from `main` at `720254bb9047166c6529c3a346caa4a7affd2ad7` (2026-10-23).

- **Extend the manual path.** [Story 149](../work/149_story_continue-manual-mode-guides-the-operator/STORY.md)
  is done: `continue --manual` gives a terminal guide while the human implements; it starts the
  story and can run its tests. It is not globally read-only. The
  [continue door](../../packages/work/src/commands/continue.mjs) admits local stories/tasks,
  refuses milestones and remote manual dispatch, and watches already-running work rather than
  starting a rival run. Preserve these bounds and its existing review/verify handoff.
- **Preserve explanation-only semantics.** [Story 150](../work/150_story_explain-says-what-the-work-is-for/STORY.md)
  and [explain.md](../../packages/core/assets/commands/explain.md) already provide short or verbose
  purpose explanations. They do not save the explanation, mint runs, or move work status. Teaching
  must not silently turn this read-only act into a learning-record writer.
- **Do not rebuild the harness.** [README](../../README.md)
  describes the shipped code-owned loop, caps, report-only tuning and explicit acceptor.
  [PRD-acd-loop-engineering.md](PRD-acd-loop-engineering.md) owns the
  code-controlled loop shell; [PRD-agent-harness.md](PRD-agent-harness.md) covers provider/policy
  boundaries. These are historical planning context, not proof that every described capability
  shipped. Use current source and records at refine; this initiative owns neither a new execution
  engine nor a general permission system.
- **Reuse memory, do not multiply it.** [153](../work/153_milestone_memory-closes-the-loop/SPEC.md)
  already accounts for recall, recurrence and promotion. The existing
  [memory-retrieval-precision spike](../work/backlog/spike_memory-retrieval-precision/SPIKE.md)
  owns retrieval and consolidation. This plan adds no competing ranker, learner profile, memory
  database, or automatic rule promotion; existing self-assessed recall verdicts are not ground truth.
- **Permission is not acceptance.** [158's accept correction](../work/158_story_native-permission-approvals/STORY.md#accept-decision)
  records a premature `done` caused by treating an approval-review message as human sign-off.
  Its retained status is explicitly a record error. The new learning path must not infer acceptance
  from a quiz answer, a test pass, a runtime permission approval, or an agent's assertion.
  [158/ADR-001 and ADR-002](../work/158_story_native-permission-approvals/ARCHITECTURE.md)
  keep native grants with the runtime and forbid treating approval as completion or replaying it
  after restart. The boundary spike must honor those decisions, not invent a second approval UI.
- **Attribute experimental outcomes.** [153/R2](../work/153_milestone_memory-closes-the-loop/RETROSPECTIVE.md)
  records how stacked branches obscured which change caused failures. Pin the baseline and candidate
  revisions in the agent trial, and separate pre-existing failures from new regressions.
- **Repository contracts apply.** [Config](../../.aof/aof.config.json) specifies `wiki/work`, backlog
  intake, example maps, solo agent execution and an autonomous attempt cap of 3. Work modes, help
  depth and runtime permissions are different concepts; learning must not redefine `solo` versus
  `orchestrated`, reset caps, or quietly enter an unattended loop. Claude Code and Codex are the
  core targets; audit the configured OpenCode rendering honestly rather than assume parity.
- **Canonical assets, not generated output.** Future implementation belongs behind the existing
  source assets and registered command boundaries. This planning PR writes only this PRD, research
  and new unnumbered record documents, never source, tests, runtime renders or completed records.

## Scope

### In scope

- **A measured answer for agents.** Evaluate a concise task interpretation/assumption checkpoint
  and a rethink triggered by concrete contradictory evidence. Check against confirmed examples and
  existing verification; compare with current AOF under matched budgets. Report negative and
  inconclusive findings as first-class results. Human metacognition is an analogy, not an agent
  capability claim.
- **A bounded agent increment, only if justified.** At existing planning/build/failure boundaries,
  expose the assumption being checked, the observed result and the next bounded experiment or
  escalation. Ground correction in tests, contracts, repository facts and independent checks.
  Keep implementation, verification and acceptance distinct; no unbounded reflection or new retry
  controller. Use concise decision summaries, not private chain-of-thought.
- **Human-led problem solving.** Extend manual guidance with the six-stage teaching model:
  reinterpret, find analogies, consider solutions, evaluate a candidate, implement, evaluate the
  implementation. Let the human revisit stages, state an approach and predict a concrete result
  before requesting more help. Ground guidance in the story, its examples, ADRs and code paths.
- **Progressive, pull-based assistance.** Offer a focused question, conceptual hint, analogous
  example, partial scaffold, or worked explanation at the human's request. Make the help level and
  remaining uncertainty visible. The human may skip a prompt or ask directly for explanation;
  no forced timer, punitive quiz, unsolicited code flood or automatic implementation takeover.
- **Separate evidence of understanding.** Optional explain-back, prediction, debugging and changed-
  requirement exercises show what the human can do with and without help. Feedback reports observed
  gaps and assistance used, not an unearned mastery badge. Use disposable examples rather than
  injecting bugs into project code. Preserve existing software review/verification and acceptance.
- **An honest pilot.** Evaluate assisted completion and unaided transfer separately, with a delayed
  check where the operator can return. Compare guided use with today's manual guide, not only with
  a deliberately weak AI baseline. Keep feedback session-local; no new retained learner records or
  remote learning telemetry is authorized by this plan. Existing provider session storage still applies.

### Out of scope

- Recreating `--manual`, `aof:review` or `aof:explain`; making normal automated execution slower by
  default; a new autonomous tutor that writes the learner's implementation.
- A full course/LMS, curriculum marketplace, examinations, employee ranking, compulsory competence
  gates, or certification that a person understands a codebase.
- A new board/desktop UI, a manual milestone cascade or remote human-build orchestration. Start with
  the existing terminal workflow; wider surfaces need their own demand and design review.
- Model training, claims of human-like cognition in LLMs, mandatory waiting to make agents
  "struggle", or treating verbose self-critique as verification.
- Harness permission redesign, memory retrieval redesign, new runtime support, blanket approval
  changes, weakening contracts, or bypassing deterministic/human gates.

## Milestones

The list includes the two technical spike gates in delivery order. Ordering between the agent and
human tracks is presentational, not a false dependency; either gate can begin independently.

1. **Agent checkpoint value** — spike: determine the marginal value of task-model checks and
   evidence-triggered replanning over current AOF, with matched-cost comparisons and independent
   evaluation. A documented negative or inconclusive result is valid; it leaves chunk 2 unscheduled.
2. **Evidence-led agent checkpoints** — milestone: ship only the supported, bounded intervention
   and its observable evidence/recovery behavior. Depends on 1 because the incremental benefit and
   safe trigger conditions are unknown; default rollout remains an operator decision (Q3/Q5).
3. **Guided-mode boundary** — spike: establish the supported runtime/entry-point capability matrix
   for extended manual coaching, separating source writes, tests, lifecycle bookkeeping, permissions,
   resume and review. Depends on delivered 149/150 as the baseline, not on the agent experiment.
4. **Human-led problem solving** — milestone: an opt-in guided interaction over the existing manual
   story/task workflow, with thinking-first prompts, grounded explanations and user-chosen hint
   depth. Depends on 3's boundary finding and delivered 149/150; never silently takes over coding.
5. **Human understanding checks** — milestone: optional, assistance-labelled prediction/debugging/
   transfer checks and a reproducible pilot comparison of learning versus task completion. Depends
   on 4 because the guide supplies the activity being evaluated. Human cohort and pilot budget are
   not assumed (Q4/Q5); learning feedback never substitutes for software or human acceptance.

## Open questions

- **Q1 — technical, spike 1:** Which compact checkpoints, if any, improve correctness/recovery over
  current AOF at matched total cost without increasing false completion? Gates chunk 2. External
  papers establish plausibility, not an AOF-specific answer.
- **Q2 — technical, spike 3:** Which runtime and resume/review paths can uphold the manual coaching
  boundary, and which need refusal or narrower support? Gates chunk 4; distinguish behavioral
  instructions from enforceable capabilities, including test commands that can write artifacts.
- **Q3 — operator-owned, rollout:** After a positive agent trial, should checkpoints remain opt-in
  or become the normal path? Opt-in preserves existing cadence but limits uptake; default adoption
  is broader but imposes cost/latency. Recommendation: evaluate opt-in first. No default change is
  authorized; this does not block framing or the experiment.
- **Q4 — operator-owned, pilot audience:** Should the human pilot first serve programming novices
  or experienced developers learning an unfamiliar codebase? Novices need more prerequisite support;
  experienced developers provide a narrower, cheaper first test but do not establish novice benefit.
  Blocks recruiting and claiming cohort-specific efficacy, not the configurable guide specification.
- **Q5 — operator-owned, evaluation budget:** What additional cost/time is acceptable for an agent
  correctness gain and for a human learning gain? Matched-cost trials can show trade-offs without
  choosing them. The operator must set the live-run/pilot budget and adoption criteria before
  execution; existing caps are never expanded implicitly.

## Research

Detailed findings, limitations, video timestamps and the eight-trap mapping are in
[RESEARCH-human-led-learning.md](RESEARCH-human-led-learning.md).

- [Video](https://www.youtube.com/watch?v=DkhhE97Swmo): Forming, Dislodging, Assumption, Location,
  Achievement, Progression, Interruption and Mislead motivate candidate controls, not diagnoses.
- [Prather et al.](https://arxiv.org/html/2405.17739) distinguish completed novice programming tasks
  from actual understanding; [Loksa et al.](https://faculty.washington.edu/ajko/papers/Loksa2016ProgrammingProblemSolving.pdf)
  test explicit problem-solving guidance as a bundled intervention.
- [Skill formation experiment](https://arxiv.org/html/2601.20245v2) motivates unaided debugging
  and concept checks; [structured AI tutoring](https://www.nature.com/articles/s41598-025-97652-6)
  shows that AI-assisted learning can improve under a carefully designed intervention.
- [Intrinsic self-correction study](https://arxiv.org/html/2310.01798),
  [Reflexion](https://arxiv.org/html/2303.11366v4), and
  [SCoRe](https://arxiv.org/abs/2409.12917) support distinguishing prompt reflection, verified
  feedback, external memory and model training. None proves the proposed AOF change beneficial.

## Success measures

- **Control:** a supported guided session leaves implementation edits to the human; unsupported,
  contradictory, remote or already-running paths are surfaced honestly. Existing manual lifecycle
  effects and test execution remain visible; ending guidance never silently launches a builder.
- **Learning:** report assisted completion separately from unaided explanation, prediction,
  debugging and transfer; disclose hints/solutions used and skipped checks. Claim delayed retention
  only if measured. No mastery or acceptance inferred from acknowledgements or confidence alone.
- **Agents:** report paired task outcomes, false completion, regressions, recovery, attempts, wall
  time and total cost against current AOF with fixed model/effort and held-out evaluation cases.
  Inconclusive results block an efficacy claim and do not justify default rollout.
- **Compatibility:** normal manual, explain, automated and review/verify paths retain their existing
  contracts; no additional permission grant, retry-cap reset, memory store or generated-output edit.
- **Planning delivery:** one draft PR contains the PRD, research, and unnumbered backlog drivers;
  a checklist pre-flight is reported honestly and the operator still runs `aof work validate`.
