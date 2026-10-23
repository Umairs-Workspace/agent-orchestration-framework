# Research — Human-led learning and evidence-led agents

Research date: 2026-10-23. Companion to [PRD-human-led-learning.md](PRD-human-led-learning.md).
This is evidence and synthesis, not an accepted architecture or a claim of measured AOF improvement.

## Source video and its limits

[V1: JetBrains Academy, *Therapy for the Vibe-Coded Brain*](https://www.youtube.com/watch?v=DkhhE97Swmo)
argues that obtaining working code is not the same as learning to program. Its advice is to attempt
problem interpretation before delegating, tolerate confusion, recognize common thinking traps,
and reflect on them with a partner. The transcript and description were reviewed; timestamps below
refer to the video chapters. The eight traps are a useful vocabulary, not diagnoses of a person or
proof that a model has human cognition.

The video cites [H1] and [H2]. Prefer the primary research when they differ: [H1] reports 20 of 21
participants completing the task within the 35-minute session, rather than the video's all-students,
30-minute summary. [H2] does not establish durable long-term benefits, despite the video's stronger
wording about lasting changes. Do not repeat either overstatement as an AOF product claim.

## Evidence register

| ID | Finding | Limits and relevance |
| --- | --- | --- |
| H1 | [Prather et al., The Widening Gap, ICER 2024](https://arxiv.org/html/2405.17739): observation, interviews and eye tracking of 21 novice programmers; generated solutions could conceal weak problem understanding and an illusion of competence. | Small, single-site observational study of one task, not a randomized demonstration of long-term deterioration. Supports testing understanding separately from task completion. |
| H2 | [Loksa et al., Programming, Problem Solving, and Self-Awareness, CHI 2016](https://faculty.washington.edu/ajko/papers/Loksa2016ProgrammingProblemSolving.pdf): a bundled intervention in two two-week camps with 48 students improved productivity, independence, self-efficacy and metacognitive awareness. | Instruction, stage visualization, reflection prompts and contextual hints were bundled; merely naming traps was not the treatment. Persistence over time was not established. |
| H3 | [Shen and Tamkin, How AI Impacts Skill Formation, 2026](https://arxiv.org/html/2601.20245v2): randomized coding study found poorer subsequent unaided understanding/debugging with AI assistance and no statistically significant average time saving; explanation-seeking and conceptual inquiry were associated with better learning. | Small sample and an unfamiliar Python library; interaction-pattern comparisons are observational. Not proof that any particular hint ladder works in AOF. |
| H4 | [Bastani et al., PNAS 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/): unguided AI improved assisted math performance but harmed subsequent unaided performance; teacher-informed hint safeguards largely removed the deficit. | Mathematics, not coding. The guarded tutor did not demonstrate a positive unaided-test effect over control. |
| H5 | [Kestin et al., Scientific Reports 2025](https://www.nature.com/articles/s41598-025-97652-6): an expert-designed AI tutor improved immediate learning in a two-lesson undergraduate physics comparison with active learning. | Structured, content-specific tutoring; not generic chat and not evidence of long-term retention. Prevents the unsupported conclusion that AI always harms learning. |
| A1 | [Huang et al., ICLR 2024](https://arxiv.org/html/2310.01798): intrinsic self-correction without external feedback often failed or reduced reasoning accuracy in the tested models/tasks. | Not an impossibility theorem or a benchmark of current AOF models. Compare at equal inference cost. |
| A2 | [Shinn et al., Reflexion, 2023](https://arxiv.org/html/2303.11366v4): task feedback and verbal episodic memory improved performance on several benchmarks without weight updates. | Results varied across tasks; self-generated tests can produce false positives. A reflective paragraph is not an independent verifier. |
| A3 | [Kumar et al., SCoRe, ICLR 2025](https://arxiv.org/abs/2409.12917): specialized multi-turn reinforcement learning improved intrinsic self-correction. | Training a model differs from adding a reflection prompt to an orchestrator. AOF should not promise weight learning from ordinary runs. |

## Eight traps translated into candidate controls

These translations are recommendations to evaluate, not results established by the video.

| Video trap | Human-led guidance | Agent analogue and externally observable evidence |
| --- | --- | --- |
| Forming (4:22): right problem, wrong model | Restate the problem and trace a candidate on a concrete example before code. | Link the proposed approach to confirmed examples; a counterexample can invalidate it. |
| Dislodging (4:48): cannot abandon a bad model | Ask what observation would change the approach; compare an alternative when stuck. | After repeated equivalent failure, surface the failed assumption and an alternative or stop; do not reset retry caps. |
| Assumption (5:09): solves the wrong problem | Predict awkward/boundary cases; ask the owner about genuine business ambiguity. | Check against the locked contract and confirmed examples, not an invented requirement. |
| Location (5:28): skipped stages feel like progress | Distinguish understanding, choosing, implementing and checking; revisiting stages is normal. | Separate implementation, test evidence, review and acceptance; a narrated stage is not a gate pass. |
| Achievement (5:50): patching because it feels almost done | Compare continued patching with revisiting the approach, without shaming the learner. | Use failure evidence and existing budgets to choose bounded replanning or escalation. |
| Progression (7:10): output hides prerequisite gaps | Try an unaided explanation, diagnosis or changed example after assisted completion. | Evaluate an agent/component on held-out tasks; downstream success is not proof of independent capability. |
| Interruption (3:15, 7:51): suggestions disrupt thought | Pull-based hints, one focused question at a time, user-controlled help depth. | Keep checkpoints at existing phase/failure boundaries, not unsolicited commentary every tool call. |
| Mislead (8:21): plausible advice points the wrong way | Label suggestions as hypotheses; check them against repository facts and executable evidence. | Cite evidence, test counterexamples, and preserve disagreement; agreeing agents may share the same error. |

[H2]'s six stages are reinterpret the problem, find analogies, search for solutions, evaluate a
candidate, implement, and evaluate the implementation. They are a navigable teaching model, not a
replacement for AOF's lifecycle or a requirement to complete a rigid six-step ceremony every time.

## Recommendations for the two tracks

### Agents: test the marginal value, not the rhetoric

AOF already has contracts, maker/checker roles, verification, bounds and memory. Compare its current
baseline with a compact task-model checkpoint and evidence-triggered rethink. Use the same tasks,
model/effort, independent graders and total budgets; where feasible include reflection-only and
verification-only ablations. Record correctness, regressions, false completion, recovery, attempts,
cost and latency. Keep evaluation cases separate from the evidence given to the maker. A negative
or inconclusive result is a valid finding and does not authorize rolling out more prompts.

Use concise, reviewable summaries of assumptions, observations and next experiments; do not demand
private chain-of-thought. Reuse existing evidence, retry and memory mechanisms rather than introduce
a parallel reflection store or claim that model weights learned from a session.

### Humans: guide the work, do not merely narrate an autonomous build

Extend existing manual guidance with an optional thinking-first interaction: the human supplies a
problem interpretation, predicts an example and chooses an approach. Offer progressively stronger
help: question, conceptual hint, analogous example, partial scaffold, worked explanation on request.
The human can ask directly for more help or skip an exercise; assistance is disclosed, not punished.
No forced delay or automatic takeover is justified by the research.

A passing software contract and a successful teach-back answer different questions. Report human
understanding through optional unaided prediction, debugging and transfer exercises, with evidence,
uncertainty and assistance level visible. Keep learning feedback separate from software acceptance,
native permissions and human sign-off. Session-local feedback is enough for an initial experiment;
learner profiling and durable learning telemetry require a separate product/privacy decision.

## Unresolved evidence

- Incremental benefit over AOF's existing safeguards needs an AOF-specific, cost-controlled trial.
- Extended coaching must prove its manual boundary across supported runtimes, including resume,
  review and delegated native approvals; a prompt-only no-edit promise is not a security boundary.
- The operator owns pilot audience, rollout choice and acceptable cost/time trade-offs. Research
  cannot supply those business answers. See the PRD's open questions and backlog spike gates.
