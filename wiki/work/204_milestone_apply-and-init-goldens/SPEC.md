---
type: milestone
number: 204
slug: apply-and-init-goldens
title: "What aof apply, init and clean write is held to baselines, including their merges into files the user owns"
status: in-progress
owner: product-owner
created: 2026-11-20
updated: 2026-11-22
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

- **The four defects that falsify the acceptance above, fixed at their source** (decided at refine,
  2026-11-21, STATE): `clean` deleting a merged file whole; `apply` replacing a user's `CLAUDE.md`,
  `.mcp.json` or opencode `AGENTS.md`; the Codex TOML merge misplacing a top-level setting; and
  `init` replacing `.aof/.gitignore`. Each lands with the baseline that shows it fixed.

Out of scope:
- The harness itself, which is built in 203.
- The ACD bundle that `aof work init` and `update` write, which is covered there too.
- Two measured behaviours that damage no user content. They are held in the baselines as they are
  and filed: `clean` leaving aof's entries in `.claude/settings.json`, and an `AGENTS.md` that two
  runtimes render refusing (ARCHITECTURE ADR-006).

## Stories

- [x] `00_story_every-asset-kind-applies-to-its-baseline` — `aof assets apply` over a fixture `.aof/` holding every asset kind is held to a baseline on three runtimes and on each alone, applying twice changes nothing, and the Codex TOML merge writes a setting where Codex reads it
- [x] `01_story_apply-merges-keep-the-user-s-entries` — over a project holding the user's own files at every merge point, `apply` moves only aof's entries, `CLAUDE.md`, `.mcp.json` and opencode's `AGENTS.md` become merges rather than replacements, a second apply changes nothing, and two writers claiming one file or entry refuse before any write
- [x] `02_story_clean-removes-exactly-what-aof-wrote` — `aof assets clean` removes the files aof wholly owns, hands every merged file back holding only the user's content, keeps a file the user edited, and a second clean changes nothing
- [x] `03_story_init-keeps-the-ignore-lines-it-did-not-write` — `aof init` is held to a baseline on an empty folder, over a user's `.gitignore` files, after `aof work init`, and on a second run, it adds its `.aof/.gitignore` line instead of replacing the file, and `--global` writes only into the temp home

Refine recall (refine-po, id `57ee8760-c07a-4f92-86f9-cb20db8d3e62`): five records; two shaped the
break-down (ARCHITECTURE "Memory recall").

## Dependencies

- **203.** It provides the harness, the normaliser and the update flow.
