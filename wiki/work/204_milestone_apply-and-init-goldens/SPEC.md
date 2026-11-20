---
type: milestone
number: 204
slug: apply-and-init-goldens
title: "What aof apply, init and clean write is held to baselines, including their merges into files the user owns"
status: not-started
owner: product-owner
created: 2026-11-20
updated: 2026-11-20
depends: [203]
schema: 1
aofVersion: 0.1.0
---
# 204 · What aof apply, init and clean write is held to baselines, including their merges into files the user owns

## Objective

`aof apply` renders a project's own assets from `.aof/` into each runtime's folder. It also merges
into files the user owns: `.claude/settings.json`, Codex's config and `AGENTS.md`. It writes
`.aof/aof.lock.json` and the apply journal. `aof init` scaffolds a project and its `.gitignore`
entries, and `aof clean` removes what aof wrote.

The merges are where drift hurts a user most, because a wrong merge damages their file, not
aof's. This milestone puts all of that output under the golden-diff harness from
203.

It is met when every asset kind renders to a baseline for every runtime, a merge provably leaves
the user's own entries unchanged, and `clean` provably removes exactly what aof wrote.

## Scope

In scope:
- **A fixture `.aof/`** covering every asset kind (agents, commands, skills, rules, hooks, MCP),
  rendered for Claude Code, Codex and opencode.
- **Merges into pre-existing user files.** Starting states hold user entries in
  `.claude/settings.json`, Codex's config and `AGENTS.md`. The baseline shows that only aof's
  entries move.
- **Lock and apply-journal contents.**
- **`aof init`.** The scaffold and its `.gitignore` entries.
- **`aof clean`.** It removes exactly what aof wrote, and the user's files survive it.
- **`--global`.** It writes into the temp global home, never the real one.
- **Re-apply.** Applying twice changes nothing.

Out of scope:
- The harness itself, which is built in 203.
- The ACD bundle that `aof work init` and `update` write, which is covered there too.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- **203.** It provides the harness, the normaliser and the update flow.
