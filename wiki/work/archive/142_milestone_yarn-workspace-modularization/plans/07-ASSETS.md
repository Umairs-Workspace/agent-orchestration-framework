# Plan 07 evidence — assets, citations and skill runtime compatibility

Completed 2026-10-01 (code commits `66e3b47e`, `b0221661`).

## Canonical assets

- Inventory: 90 files under `packages/core/assets/` scanned for cited source paths and `path:line` locators
  (`node` census over the committed tree). 60 citations named files that no longer exist after the plans 03–06
  moves and removals. Every non-pointer citation was retargeted at the final owner: run-store lines →
  `packages/execution/src/runs.mjs` (and `packages/contracts/src/freshness.mjs` for `isStale`), `loop-bounds` →
  `packages/contracts/src/loop-bounds.mjs`, the `run.started` reactor → `packages/work/src/effects.mjs`,
  item-status/continue → `packages/work/src/commands/`, the gate ladder → `packages/work-loop/src/commands/loop.mjs`,
  `ITEM_STATUS_EDGES` → `packages/work/src/lifecycle.mjs`, memory → `packages/knowledge/src/`, assignment-reclaim
  wiring → the core binding, command registration → `command-core.mjs`. Defining-line claims were re-measured.
  Remaining "missing" hits are intentional: `module:src/...` pointers (framework-record identifiers, resolved
  below) and illustrative template paths (`docs/prd.md`, `test/arch/*.test.ts`).
- Manifest regenerated with `node scripts/generate-bundle-manifest.mjs` (115 entries).
- The FF-5810 floor (≥10 exported defining-line claims) is kept: the factories that now compose the moved
  symbols (`createRunStore`, `createAssignmentReclaim`, `createMemory`) are cited at their real export lines,
  and `progressMaxResetsFromConfig` at its definition.

## A migration regression found and fixed

`aof work loops groundedness` reported **6 components stale** and 3 anchor authorities unresolved: framework
anchors point at `module:src/run-store.mjs#…` / `module:src/commands/grade.mjs#…`, which the loader resolves
through the composition binding (plan 03) but the groundedness command resolved against a retired root path and
required a top-level `export`. Now: one core resolver (in the work-loops binding, supplied to the groundedness binding) used by
both the loader and the command, and one shared declaration predicate in `@aof/work-graph`
(`module-declares.mjs`: an export, or a member of the factory surface the module returns). Result on this
repository: 6 anchored, 0 stale, 3/3 authorities resolved. A package test pins the predicate.

Tuning provenance had the same defect class: archived lessons cite retired paths and the emit-time resolver
only stat'd disk, which emptied the tunable lane. It now follows recorded renames and declarative forwards
through the one cited-path resolver (119/ADR-004), checks the old line only when the file was renamed (not
forwarded), and a registered case covers rename, forward and still-absent. The real corpus again fills the
tunable lane (FF-6208 green); proposals 26 → 90.

## Generated copies (scope as approved by the operator)

Authorized and applied: all 17 `.aof/loops/*.md` records and the 18 command renders (6 commands ×
`.claude/`, `.codex/`, `.opencode/`), with **only their 35 lock hashes** changed (`generatedAt` preserved), and
the derived registry document `wiki/work/loops.md` (separately approved; text-only citation changes).
The diff was prepared first in a disposable checkout; `aof work update` reports `updated: 0` afterwards in both
this repository and a fresh fixture project. Nothing else was written: `.claude/settings.json`, hooks, rules,
skills and every other lock entry are untouched.

## Skill runtime and distribution checks

- A fresh fixture project initialised from an unrelated working directory with no source checkout cwd and no UI
  build runs `work init`, `insert-milestone`, `list`, `validate`, `next`, `run-start` (the reactor advances the
  item to in-progress), `run-status`, `status` (legal-move refusal text intact), `loops groundedness` and
  `update --dry-run` (0 drift).
- Fixture rendering parity (adapters, architect/refine, autonomous, anchors, loops census/registry, trigger
  eol ratchet, generated stamp, learning-edge) and the loop/command/bundle/memory/planning/audit suites
  (3,194 cases) pass; remaining reds are listed in Plan 08.
- Copied-payload, standalone and hook-path checks are in Plan 08's matrix.

Developer documentation: root README ("Applications"), `packages/core/README.md`, `apps/desktop/README.md`.
`UPGRADE-CHANGELOG.md` is generated from the migration registry (a hand edit cannot survive its drift guard) and
describes work-item schema transforms, not layout, so it was not edited.
