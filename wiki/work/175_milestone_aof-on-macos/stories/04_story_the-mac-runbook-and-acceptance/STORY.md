---
type: story
number: 04
slug: the-mac-runbook-and-acceptance
title: "The Mac runbook — set this laptop up as a single-node mesh, deploy, restart and verify at the source on macOS, and accept the milestone on it"
parent: 175
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-10-29
schema: 1
aofVersion: 0.1.0
depends: [00, 01, 02, 03]
reads: [wiki/work/175_milestone_aof-on-macos/SPEC.md, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-001, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-002, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-003, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-004, wiki/work/175_milestone_aof-on-macos/ARCHITECTURE.md#adr-005, wiki/work/175_milestone_aof-on-macos/RESEARCH.md, wiki/work/175_milestone_aof-on-macos/DESIGN.md, scripts/install-local.mjs, packages/mesh/src/commands/desktop.mjs, packages/mesh/src/commands/desktop-preflight.mjs, packages/mesh/src/registry.mjs, apps/desktop/crates/app/src/supervisor.rs]
files: [.claude/rules/build-deploy-restart.md, apps/desktop/README.md, wiki/work/ROADMAP.md]
---
# 04 · The Mac runbook and acceptance

## User story

As **an operator, or an agent, working on this laptop**,
I want **one written path from a fresh clone to a supervised single-node mesh, with a restart
and a check at the source for each deploy**,
so that **this Mac runs the same supervised product as the Windows control node, and nobody has
to rediscover the macOS steps.**

## Tasks

- [ ] [00 · The deploy rules carry a macOS section](tasks/00_the-deploy-rules-carry-a-macos-section.feature)
- [ ] [01 · This laptop goes from clone to a supervised single-node mesh with only the documented commands](tasks/01_a-mac-goes-from-clone-to-a-supervised-fleet.feature)

## Notes

- **This laptop is isolated and part of no mesh** (ADR-005). The runbook's first-time setup
  nominates it as its own control node, so the app starts both daemons. The section assumes no
  other machine.
- **The restart is legal over SSH only through launchd**
  (`aof mesh desktop stop && aof mesh desktop run`, with the LaunchAgent registered, ADR-003 §2).
  Starting a daemon by hand over SSH stays forbidden. The acceptance tests it over `ssh localhost`.
- **The Mac's deploy loop has two halves.** The npm-linked `aof` CLI is live from the checkout;
  the daemons run the payload, so they need `install-local --skip-ui` and a restart (ADR-002 §6).
  The rule says which is which.
- **The crash gap is written down twice** (ADR-001 §5): once in `ROADMAP.md` as a deferred item,
  and once in the runbook as a recovery.
- **The deploy rules' other node sections are unchanged.** This story adds the macOS section
  beside them.
- **Task 01 is the milestone's `@uat`,** run on this laptop (x86_64) with a GUI login. arm64 is
  not verified (RESEARCH Q3).
