---
type: milestone
number:
slug: human-understanding-checks
title: "The human can check understanding separately from shipping success"
status: not-started
owner: product-owner
created: 2026-10-23
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-human-led-learning.md
depends: [human-led-problem-solving]
---
# The human can check understanding separately from shipping success

## Objective

After guided work, the human can see evidence of what they understand, where assistance was needed,
and what remains uncertain. A working implementation and a passing review are reported separately
from unaided explanation, debugging and transfer. The capability includes a repeatable pilot method,
not a promise of improved learning or a new prerequisite for accepting software.

## Scope

In scope:

- Optional, task-grounded checks: explain a consequential design choice in one's own words, predict
  an unseen input, diagnose a small faulty example, or adapt the approach to a changed requirement.
  Keep seeded defects and exercises in disposable examples, never injected into project source.
- Separate unaided attempts from assisted ones. Reveal hints/answers on request, disclose their use,
  and mark skipped or unavailable checks as unmeasured rather than passed. Human confidence and a
  fluent answer do not establish correctness; use observable outcomes and grounded reference facts.
- Feedback names specific observed gaps and a next practice opportunity, with uncertainty visible.
  If an explanation is ambiguous, ask rather than issue a confident mastery verdict. The human may
  disagree or skip; no punitive grades, employee ranking or mandatory teach-back approval ritual.
- Preserve software lifecycle and acceptance. Passing an exercise, accepting a hint, granting tool
  permission and passing a contract are different events. None supplies a missing human sign-off,
  bypasses `@uat`, or changes a delivery gate. Learning feedback remains session-local, outside
  authoritative work status; no new learner profile or retained raw answer dataset is authorized.
- A reproducible, operator-reviewed pilot comparing today's manual guide with the guided path on
  comparable tasks. Identify baseline knowledge, help used, assisted completion and quality,
  immediate unaided debugging/transfer, time and perceived effort. Use separate held-out examples
  and counterbalanced tasks where practical; add a delayed check only where it can actually occur.
- Report the pilot's audience, sample size, missing observations and limitations. PRD Q4/Q5 must be
  answered before recruiting participants or spending on the pilot. Aggregate findings are a
  human-reviewed research deliverable, not automatic learner telemetry or proof for every audience.

Out of scope:

- Certification, a competence gate on ordinary AOF work, grading people for management, compulsory
  retention tracking, remote learning telemetry, new permission policy or autonomous fixes.
- Claiming that this intervention produces durable learning before delayed evidence exists, or
  that a coding task's green tests measure its author's understanding.

[Prather et al.](https://arxiv.org/html/2405.17739) and the
[skill-formation experiment](https://arxiv.org/html/2601.20245v2) motivate separate learning evidence;
[structured tutoring results](https://www.nature.com/articles/s41598-025-97652-6) show that outcomes
depend on design and context. See `wiki/planning/RESEARCH-human-led-learning.md` for limitations.

Recall applied: `wiki/work/158_story_native-permission-approvals/STORY.md` records that an approval-
review message was incorrectly treated as human acceptance. This milestone therefore never uses a
learning answer or an agent's assessment to write a delivery sign-off. Its boundary also honors
158/ADR-002 in the adjacent `ARCHITECTURE.md`: permission is not completed work.

## Stories

To be broken down after promotion; no stories or task contracts are authored in this shatter.

## Dependencies

- `human-led-problem-solving` — supplies the guided interaction and explicit assistance levels the
  checks evaluate. The guide can ship first; learning checks do not become a mandatory gate on it.
- PRD Q4/Q5 are owner decisions at pilot execution, not invented answers or extra technical spikes.
  No dependency on the agent-efficacy experiment is needed to evaluate human learning.
