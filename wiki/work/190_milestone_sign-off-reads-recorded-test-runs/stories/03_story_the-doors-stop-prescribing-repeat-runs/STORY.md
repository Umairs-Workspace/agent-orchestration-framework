---
type: story
number: 03
slug: the-doors-stop-prescribing-repeat-runs
title: "The commands' prose asks `aof test` once at each door and stops prescribing whole-tree repeats"
parent: 190
depends: ["190/00", "190/02"]
status: done
owner: product-owner
created: 2026-11-09
updated: 2026-11-10
adrs: [ADR-004, ADR-006]
reads:
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/SPEC.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-002
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-004
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-005
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-006
  - packages/work/src/commands/test.mjs
  - packages/work/src/commands/regression-gate.mjs
  - test/arch/command/acd-prompt-gate-ladder-parity.test.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
files:
  - packages/core/assets/commands/continue.md
  - packages/core/assets/commands/verify.md
  - packages/core/assets/commands/review.md
  - packages/core/assets/commands/add-uat.md
  - packages/core/assets/templates/uat/SESSION.md
  - packages/core/assets/templates/uat/STATE.md
  - packages/core/assets/variants/codex/workflow.md
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/verify.md
  - .claude/commands/aof/review.md
  - .claude/commands/aof/add-uat.md
  - .agents/skills/aof-add-uat/SKILL.md
  - .agents/skills/aof-add-uat/agents/openai.yaml
  - .agents/skills/aof-continue/SKILL.md
  - .agents/skills/aof-continue/agents/openai.yaml
  - .agents/skills/aof-continue/procedure.md
  - .agents/skills/aof-review/SKILL.md
  - .agents/skills/aof-review/agents/openai.yaml
  - .agents/skills/aof-review/procedure.md
  - .agents/skills/aof-verify/SKILL.md
  - .agents/skills/aof-verify/agents/openai.yaml
  - .agents/skills/aof-verify/procedure.md
  - .codex/aof/workflows/workflow-contract.md
  - .opencode/commands/aof/add-uat.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/review.md
  - .opencode/commands/aof/verify.md
  - .aof/templates/work/uat/SESSION.md
  - .aof/templates/work/uat/STATE.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - packages/core/assets/manifest.json
  - test/work/lifecycle/work-test-declared.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 190/03 · The commands' prose asks `aof test` once at each door and stops prescribing whole-tree repeats

## User story

As **an operator whose agents follow the commands' prose to the letter**,
I want **the prose to describe what `aof test` now does: answer repeats from its record, resume an
unfinished gate, and serve a UAT sweep from the gate's run, instead of telling each party to run
the suite again**,
so that **the cost the code no longer charges is not charged anyway by an agent obeying stale
instructions**.

What lands (ADR-006 §1, §2, §4, and ADR-004 §2 as the reason the prose names no tiers):
- `continue.md`'s `<build_terminator>` and `<review_lanes>`;
- `verify.md`'s UAT sweep and its `not-finished` repair;
- `review.md`'s test step;
- the UAT command and its templates;
- their Codex variants and renders.

## Tasks

- [x] 00 [each door asks once and says what an answer from the record means](tasks/00_each-door-asks-once-and-says-what-an-answer-from-the-record-means.feature)
- [x] 01 [a UAT session sweeps once and a stopped gate resumes](tasks/01_a-uat-session-sweeps-once-and-a-stopped-gate-resumes.feature)
- [x] 02 [the verify prose keeps the words 160/05 reads](tasks/02_the-verify-prose-keeps-the-words-160-05-reads.feature) — `@bug` F-01, fixed at verify

## Notes

- `manual.md` already runs `aof test` once per manual run, which is correct as written, so it is
  not in `files:`.
- The `.claude/` and `.aof/templates/` renders come from `aof work update`, never from hand edits.
  They are in `files:` because the render writes them.
- Depends on 00 and 02: prose that describes behaviour not yet shipped would tell agents something
  false.
