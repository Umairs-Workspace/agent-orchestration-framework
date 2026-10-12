---
type: story
number: 03
slug: retry-triage-and-retrospective-recall-episodes
title: "A retry, a triage and a retrospective recall what happened before"
parent: 157
status: done
owner: product-owner
created: 2026-10-11
updated: 2026-10-12
depends: [157/02]
schema: 1
aofVersion: 0.1.0
reads: ["wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-004-retry-triage-and-retrospective-consume-retained-recall-results","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-004-declared-edges-retain-their-original-retrieval-scope","packages/knowledge/src/commands/memory.mjs","packages/knowledge/src/memory.mjs","packages/work/src/feedback-records.mjs","packages/core/src/render-plan.mjs","packages/core/src/work/bundle.mjs","packages/core/src/work/bundle-synthesis.mjs","packages/core/src/adapters.mjs","packages/core/src/lock.mjs","test/support/cli-spawn.mjs","scripts/test.mjs"]
files: ["packages/core/assets/commands/continue.md","packages/core/assets/commands/verify.md","packages/core/assets/commands/retrospective.md","packages/core/assets/variants/codex/workflow.md","packages/core/assets/manifest.json","test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs",".claude/commands/aof/continue.md",".claude/commands/aof/verify.md",".claude/commands/aof/retrospective.md",".opencode/commands/aof/continue.md",".opencode/commands/aof/verify.md",".opencode/commands/aof/retrospective.md",".agents/skills/aof-continue/procedure.md",".agents/skills/aof-continue/SKILL.md",".agents/skills/aof-continue/agents/openai.yaml",".agents/skills/aof-verify/procedure.md",".agents/skills/aof-verify/SKILL.md",".agents/skills/aof-verify/agents/openai.yaml",".agents/skills/aof-retrospective/procedure.md",".agents/skills/aof-retrospective/SKILL.md",".agents/skills/aof-retrospective/agents/openai.yaml",".codex/aof/workflows/workflow-contract.md",".aof/aof.lock.json",".aof/aof.apply-journal.json"]
---

# 157/03 · A retry, a triage and a retrospective recall what happened before

## User story

As the developer on a retried build, the verifier triaging a finding, and the author of a
retrospective,
I want each of those steps to recall the item's earlier runs, findings and feedback before acting,
so that a retry addresses why the last attempt failed, a recurring finding is recognised as one,
and a retrospective is built from evidence the memory can prove it holds.

## Tasks

- [x] `tasks/00_a-retry-acknowledges-its-prior-attempt.feature` — continue's attempt-2+ edge
- [x] `tasks/01_triage-recalls-prior-findings.feature` — verify's finding-triage edge
- [x] `tasks/02_retrospective-gathers-its-evidence-through-recall.feature` — the retrospective's evidence path

## Notes

- Every change is to an authored bundle command or the Codex variant, regenerated through the
  normal renderer; rendered outputs, lock and journal are in `files:` for that reason only.
- FF-15702 extends m153/FF-15303's edge roster in place with `continue-episodic` and `verify-finding`;
  m153/ADR-004's four existing edges are untouched.
- Builds after 157/02, whose `--all` and `--kind finding` this story's commands spell.
