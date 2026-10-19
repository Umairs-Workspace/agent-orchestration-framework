---
doc: state
---
# State

## Progress

- 2026-10-19 — Implementation drafted on branch `feat/hyperagent-planning-runtime` by Hyperagent:
  runtime + opt-in default set, planning-subset mapping, six variants, `aof-prd`, planner
  instructions, this repository's `.hyperagent/` render, `hyperagent-runtime` suite (10 cases) and two
  lifecycle BDD scenarios.

## Notes & decisions

- Opt-in rather than default: about fifteen call sites default to "every runtime"; a fourth default
  runtime would have rendered `.hyperagent/` into every existing project. `defaultRuntimes()` is used at
  the defaulting sites only; `config-inspect.mjs` keeps `supportedRuntimes()` (its defaults are
  pre-normalised by the DSL, and the file is pinned by the workspace runtime audit).
- Variants are full rewrites, not prefixed copies: a Hyperagent session has no checkout and no `aof`
  binary, so every CLI step is replaced (never simulated) and `aof work promote` is never attempted.
- `packages/core/test` budget 42 → 43 for the one new suite, reason stated in the budget table.

## Verification

- Pre-existing failures in the sandbox were left untouched and are environmental (no built
  `ui/dist`, no GPG, the SEA sentinel, native node-pty): 19 in the bundle subset, 3 in core, the
  `work ui` board suites. No new failure in: core, bundle, planning, command, every arch suite,
  execution, work, surfaces, and the lifecycle / dsl / config-family / packages / adapter-policy /
  setup-ui features.
