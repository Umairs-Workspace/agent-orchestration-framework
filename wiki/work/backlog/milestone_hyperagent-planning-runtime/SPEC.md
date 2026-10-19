---
type: milestone
number:
slug: hyperagent-planning-runtime
title: "Hyperagent plans the work — an opt-in planning runtime that renders the planning procedures as importable skills"
status: not-started
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
---
# Hyperagent plans the work — an opt-in planning runtime that renders the planning procedures as importable skills

## Objective

An operator can hand planning to Hyperagent: from an idea, it researches and writes the planning PRD,
shatters it into backlog milestones and spikes, and — once a milestone is promoted — breaks it into
stories and task contracts, delivering each step as a draft pull request that passes
`aof work validate` on its branch. The procedures it follows are rendered by aof from the same bundle
as the Claude and Codex procedures, so the planning contract cannot drift between runtimes, and a
project that never names Hyperagent renders exactly what it rendered before.

## Scope

In scope:
- A `hyperagent` runtime in the model, **opt-in** (`defaultRuntimes()` excludes it; validation accepts
  it), with skills native and agents/rules not installable.
- The ACD command→skill mapping for Hyperagent, limited to members that author a `hyperagent` variant
  (`requiresVariant`), reporting every other procedure as `outside-runtime-subset`.
- Full-rewrite Hyperagent variants of shatter, refine, add-milestone, add-story, add-task and validate,
  each carrying the Hyperagent execution contract and the embedded validate checklist.
- The Hyperagent-only `aof-prd` skill and the `.hyperagent/AGENT.md` planner instructions.
- This repository's own `.hyperagent/` render, so Hyperagent can import from it.
- Documentation: `wiki/hyperagent-support.md`, the README, the prompt audit.

Out of scope:
- Hyperagent as an execution runtime (`aof work loop`, continue, review, verify) — planning only.
- An `aof:hyperplan` command delegating planning to Hyperagent over its MCP endpoint — a follow-up.
- Refreshing already-imported Hyperagent skills automatically — Hyperagent's import creates new skills;
  updating is a documented manual (or planner-driven) step.
- The pre-existing `.claude/settings.json` merge on a non-Claude `work init` — unchanged here.

## Stories

- [ ] to be broken down — the implementation landed with the change that introduced this record;
  refine should carry it as stories, and acceptance still needs the live check below.

## Dependencies

- None in the stream. The acceptance still owed is live: import the rendered skills into Hyperagent,
  run one plan from idea to promoted-and-refined milestone, and confirm `aof work validate` passes on
  the branch it produced.
