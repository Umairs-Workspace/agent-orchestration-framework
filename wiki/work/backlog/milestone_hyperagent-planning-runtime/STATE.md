---
doc: state
---
# State

## Progress

- 2026-10-19 — Implementation drafted on branch `feat/hyperagent-planning-runtime` by Hyperagent:
  runtime + opt-in default set, planning-subset mapping, six variants, `aof-prd`, planner
  instructions, this repository's `.hyperagent/` render, `hyperagent-runtime` suite (10 cases) and two
  lifecycle BDD scenarios.
- 2026-10-19 — `@aof/integration-hyperagent` package and `/aof:hyperplan`: runtime declaration moved
  out of core; brief / result / check / doctor verbs (12 package cases, 4 more lifecycle scenarios);
  the `hyperplan` bundle command with its Codex variant; `work.integrations.hyperagent` schema.

## Notes & decisions

- Opt-in rather than default: about fifteen call sites default to "every runtime"; a fourth default
  runtime would have rendered `.hyperagent/` into every existing project. `defaultRuntimes()` is used at
  the defaulting sites only; `config-inspect.mjs` keeps `supportedRuntimes()` (its defaults are
  pre-normalised by the DSL, and the file is pinned by the workspace runtime audit).
- Variants are full rewrites, not prefixed copies: a Hyperagent session has no checkout and no `aof`
  binary, so every CLI step is replaced (never simulated) and `aof work promote` is never attempted.
- `packages/core/test` budget 42 → 43 for the one new suite, reason stated in the budget table.
- The package owns code, not prompts: the prompt bodies stay in `packages/core/assets/` where the one
  asset seam and release packaging read every shipped prompt.
- `check` extracts the branch through a private index (`read-tree` + `checkout-index --prefix`) rather
  than `git worktree add`: `execution/worktrees.mjs` stays the one worktree materializer (38/ADR-006),
  and nothing is registered in the operator's repository.
- Each verb lazy-loads its implementation; `aof work find`'s module ceiling 708 → 710 for the two
  modules the registry and model need (descriptors, runtime leaf), reason recorded in FF-16004's row.
- The brief does not read `work.intake` (FF-12704 keeps that token to init/promote): the planner reads
  the config itself, and drivers are always written to the backlog.

## Verification

- Pre-existing failures in the sandbox were left untouched and are environmental (no built
  `ui/dist`, no GPG, the SEA sentinel, native node-pty): 19 in the bundle subset, 3 in core, the
  `work ui` board suites. No new failure in: core, bundle, planning, command, every arch suite,
  execution, work, surfaces, and the lifecycle / dsl / config-family / packages / adapter-policy /
  setup-ui features.
