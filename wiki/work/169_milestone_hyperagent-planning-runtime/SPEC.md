---
type: milestone
number: 169
slug: hyperagent-planning-runtime
title: "Hyperagent plans the work — a self-contained integration that hands planning to Hyperagent"
status: in-progress
owner: product-owner
created: 2026-10-19
updated: 2026-10-23
schema: 1
aofVersion: 0.1.0
---
# 169 · Hyperagent plans the work — a self-contained integration that hands planning to Hyperagent

## Objective

An operator can hand planning to Hyperagent: from an idea, it researches and writes the planning PRD,
shatters it into backlog milestones and spikes, and — once a milestone is promoted — breaks it into
stories and task contracts, delivering each step as a draft pull request that passes
`aof work validate` on its branch. A project that does not enable the integration renders exactly
what it rendered before.

Hyperagent is an **integration, not a runtime**. Everything Hyperagent-specific — the planning
skills and instructions it imports, `/aof:hyperplan`, and its CLI verbs — lives in
`packages/integration-hyperagent` and reaches core through one contribution. Core holds no Hyperagent
asset and no Hyperagent entry in its runtime tables, and no core module outside the integration
registry imports an integration package.

## Scope

In scope:
- The Hyperagent integration, enabled per project by `work.integrations.hyperagent` (absent ≡ off,
  the switch Notion already uses).
- The files Hyperagent needs, written once to the aof home by
  `aof work integrations hyperagent package` for upload to the operator's Hyperagent account
  (169/ADR-007; Hyperagent reads no repository folder): `~/.aof/hyperagent/AGENT.md` (planner
  instructions) and `~/.aof/hyperagent/skills/aof-*/SKILL.md` — full rewrites of shatter, refine,
  add-milestone, add-story, add-task and validate, plus `aof-prd`, each carrying the Hyperagent
  execution contract and the embedded validate checklist. aof writes and owns them like any
  rendered file.
- `/aof:hyperplan` (Claude, OpenCode; `$aof-hyperplan` in Codex), rendered only for an enabled
  project: delegate a planning step to the AOF Planner over Hyperagent's MCP endpoint, relay its
  questions, and check the returned branch without touching the operator's checkout.
- The deterministic `aof work integrations hyperagent brief | result | check | doctor | package` verbs.
- Self-contained integration packages: a package's contribution carries its CLI verbs and its bundle
  assets. Core merges the assets into its bundle, reads each from its owning package (dev, payload
  and packaged), renders them only when the integration is enabled, and a fitness function forbids
  `@aof/integration-*` imports in core outside the registry.
- Removing the branch's `hyperagent` runtime: the model's runtime tables, `defaultRuntimes()` and
  the opt-in plumbing go back to the three runtimes.
- Documentation: `wiki/hyperagent-support.md`, the README, the prompt audit.

Out of scope:
- Moving the other integration packages (Notion) onto the contribution seam — a follow-up chore.
- Hyperagent executing work (`aof work loop`, continue, review, verify) — planning only.
- Refreshing already-imported Hyperagent skills automatically — Hyperagent's import creates new skills;
  updating is a documented manual (or planner-driven) step.

## Stories

- [ ] 00 — Hyperagent plans the work, assimilated from the delivered branch work
- [x] 01 — integration packages are self-contained, and Hyperagent is an integration rather than a runtime
- [x] 02 — the Hyperagent package lives in the aof home, written by one verb for upload; no project renders it
- [x] 03 — the Hyperagent package carries one zip of the seven skills, the single upload Hyperagent's dialog takes

## Dependencies

- None in the stream. The acceptance still owed is live: upload the packaged skills to Hyperagent,
  run one plan from idea to promoted-and-refined milestone, and confirm `aof work validate` passes on
  the branch it produced; and run `/aof:hyperplan` once from a Claude Code or Codex session connected
  to Hyperagent over OAuth.
