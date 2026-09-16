---
type: story
number: 03
slug: the-reference-corpus
title: "The reference corpus and the declared bounds — a bound is compared against what everyone else ships"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-007, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-008, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-004, src/loop-bounds.mjs, src/work-loops.mjs, src/work-audit/reads.mjs, src/work-audit/census.mjs, src/commands/audit.mjs, .aof/aof.config.json, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs, src/command-core.mjs, scripts/install-local.mjs]
files: [src/harness-reference.mjs, src/work-audit/declared-bounds.mjs, scripts/refresh-harness-reference.mjs, wiki/reference/harness-baselines.md, test/harness-reference.test.mjs, test/work-audit-declared-bounds.test.mjs, test/arch/acd-reference-corpus-offline-and-sourced.test.mjs, scripts/test.mjs]
---
# 03 · The reference corpus and the declared bounds

## User story

As whoever has to answer "is this bound reasonable?" without re-reading thirty vendor docs,
I want the defaults everyone else ships to be a versioned artifact on disk with a source URL and a `checked:` date, joined against what this project actually declares,
so that "everyone else caps at 250 steps and $3" becomes a deterministic join a reviewer can diff in a PR, instead of a research task whose answer depends on the day it ran.

## Tasks

- [x] `tasks/00_the-reference-corpus-is-sourced-dated-and-travels.feature` — frozen rows of `{id, bound, value, system, source, checked}`, each with a non-empty source URL and a parseable date, non-vacuous, importing nothing, reached by module resolution from any directory — and `baseline` not extended
- [x] `tasks/01_a-declared-bound-is-joined-against-the-reference.feature` — the join: an `uncapped`/`unknown` ceiling → `audit-bound-undeclared` at `error`; a reference row declared nowhere → the same code at `warn`; a bound outside the range → `audit-bound-off-reference`; a stale row → `audit-reference-stale`; the model injected and never parsed here
- [x] `tasks/02_the-refresh-is-hand-run-and-the-view-is-generated.feature` — the hand-run refresh confirms and stamps rather than scrapes, the markdown view is a generated rendering nothing reads, no CLI door names the program, and the audit path reaches no network

## Notes

- **The corpus ships as `src/harness-reference.mjs`, NOT as the `wiki/reference/harness-baselines.md` the SPEC proposed.** Measured at the decision point: `scripts/install-local.mjs:243` copies `src/` recursively, and the live payload at `~/.aof/bin/` carries **no `scripts/` and no `wiki/`**. A corpus under `wiki/` cannot be read in any governed project — it would make the bounds rule the one rule in 77 that cannot travel, in the milestone whose whole thesis is that the rules travel. The markdown file still ships, as a **generated view with a stamp**, written only by the refresh program and read by nothing.
- **`--refresh-baselines` is a separate hand-run program, not a flag** (`scripts/refresh-harness-reference.mjs`, `ADR-007 §3`). `STATE.md` is emphatic that the corpus's value is determinism — *"a rule that silently fetches is a rule whose result depends on the day it ran"*. A flag makes that a promise; a program no registered command names and the family's import closure cannot reach makes it structural, and FF-7705 asserts it.
- **`baseline` keeps ONE meaning inside the audit family.** `UNREGISTERED_BASELINE` (`src/work-audit/census.mjs:96`) already owns the word for the shrink-only exemption ledger, with its own `audit-baseline-stale` / `audit-baseline-unreasoned` codes. This story's codes are `audit-bound-undeclared`, `audit-bound-off-reference` and `audit-reference-stale` (`ADR-007 §4`).
- **`loop-ceiling-uncapped` is not a rule here — it is ONE ROW of this join** (`ADR-008`). `69/FF-6902` already hard-gates this repo's own registry, so a second rule would be a duplicate; what is open is a governed project's registry. The existing `warn` emitter at `src/work-loops.mjs:696` is left untouched, and the lane takes the model INJECTED — importing `src/loop-bounds.mjs` (0 imports) and never `src/work-loops.mjs` (a god-node with 50+ dependents).
