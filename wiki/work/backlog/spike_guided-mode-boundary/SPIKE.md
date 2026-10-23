---
type: spike
number:
slug: guided-mode-boundary
title: "Which runtime paths can preserve a human-owned guided session?"
status: not-started
owner: architect
created: 2026-10-23
updated: 2026-10-23
timebox: 1d
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-human-led-learning.md
depends: [149, 150]
---
# Which runtime paths can preserve a human-owned guided session?

## Question

Can extended coaching preserve AOF's existing manual boundary across supported runtimes and
resume/review transitions, and which paths must be narrowed or refused? This resolves PRD Q2 and
gates `human-led-problem-solving`; it does not reopen the operator's existing unattended-approval
policy or authorize a general permission subsystem.

The finding is a capability/effect matrix, not a promise inferred from a prompt:

- Inspect direct manual invocation, the CLI door, resumed sessions, the review handoff, an already-
  running item, contradictory agent/manual flags, and attempted milestone/remote dispatch. The human
  owns implementation; no path silently converts a request for guidance into builder execution.
- For Claude Code and Codex, separate instructions, native tool/sandbox enforcement, command
  execution, source edits, test artifacts and lifecycle bookkeeping. Audit configured OpenCode
  rendering and state precisely what is proven, unsupported or not tested; don't claim parity.
- Account for tests and graph/inspection commands that can write artifacts. Preserve 149's status/
  run effects rather than call manual mode wholly read-only; preserve 150's genuinely read-only
  explanation contract. Identify the minimum extension needed for coaching, or a safe limited path.
- Keep permission, human learning feedback and acceptance distinct. Check that a persisted session
  or permission observation cannot be treated as fresh authority after mode changes or resume.
- Require before/after content hashes and observed tool activity in a representative external
  repository, including missing test-runner configuration. Native behavior needs live evidence;
  mocked fixtures and prompt inspection alone cannot prove human control.

Grounding: `packages/work/src/commands/continue.mjs`,
`packages/core/assets/commands/explain.md`, and the canonical continue/review assets named by 149.
Host capabilities determine enforcement; AOF must not claim to prevent actions outside its controlled
path. Narrow support or escalate a missing boundary rather than build a new permission engine here.

Recall applied: `wiki/work/149_story_continue-manual-mode-guides-the-operator/RETROSPECTIVE.md`
R3 says run closure must agree with the run reactor (`packages/work/src/effects.mjs`), or a review
can undo the operator's started status. R5 requires a real external-repository walk and content hashes:
its original guide/review walk left generated files that fixtures missed. Read
`wiki/work/158_story_native-permission-approvals/ARCHITECTURE.md` ADR-001/002; native grants stay with
the runtime, approvals are not successful work, and replayed observations are not authorization.

## Dependencies

- `149` — delivered local manual story/task guide and review handoff are the behavior to preserve.
- `150` — delivered explanation-only behavior is a distinct boundary that coaching must not mutate.
- No dependency on the agent-checkpoint experiment: human-led learning is independently valuable.

## Timebox

- Box: `1d`, a proposed investigation ceiling. Operator-authorized live testing and budget are
  prerequisites (PRD Q5); no runtime permissions or defaults change merely because this is framed.
- Stop when the matrix names supported/refused/unproven paths, observed effects, and a minimal
  implementation recommendation. If evidence is incomplete at the boundary, record that honestly
  and leave the affected milestone blocked; extension needs explicit re-scoping.

## Investigation

## Finding

## Outcome / Next
