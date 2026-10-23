---
doc: state
---
# 169 · State

## Progress

- 2026-10-19 — Implementation drafted on branch `feat/hyperagent-planning-runtime` by Hyperagent:
  runtime + opt-in default set, planning-subset mapping, six variants, `aof-prd`, planner
  instructions, this repository's `.hyperagent/` render, `hyperagent-runtime` suite (10 cases) and two
  lifecycle BDD scenarios.
- 2026-10-19 — `@aof/integration-hyperagent` package and `/aof:hyperplan`: runtime declaration moved
  out of core; brief / result / check / doctor verbs (12 package cases, 4 more lifecycle scenarios);
  the `hyperplan` bundle command with its Codex variant; `work.integrations.hyperagent` schema.
- 2026-10-22 — main merged into the branch (`f2aba065`). Operator review: half of Hyperagent in its
  package and half in core is wrong. Scope widened to self-contained integration packages; the
  delivered work is assimilated as story 00, and story 01 moves it onto the contribution seam.
- 2026-10-22 — Operator: "Hyperagent is not a runtime." It becomes an integration enabled by
  `work.integrations.hyperagent`; the runtime row, `defaultRuntimes()` and the variant mapping are
  removed in story 01 (ADR-001). The slug keeps "planning-runtime" as the folder name only.
- 2026-10-23 — 169/01 built and reviewed (solo, run `20261022T222945182Z-0000`): runtime reverted
  (nine defaulting sites byte-identical to before `de0ba6ee`), `contribution.mjs` + the core registry,
  the package's `assets/bundle.json` (hyperplan, AGENT.md, seven skills) read through a package asset
  class, the `work.integrations.hyperagent` gate, sidecar copies, the `--prefix` fix. This repository
  enables the integration and was re-rendered (8 `.hyperagent/` files updated, 0 drift).
- 2026-10-23 — Milestone verify: the whole-tree gate went red on 11 test-side reds (F-04), was repaired
  in `510ee529`, and passed green. The FF register became a table, and FF-16902 became an arch case (F-05).
- 2026-10-23 — Operator: "Why is there a .hyperagent folder? Will Hyperagent pick it up?" Measured on
  Hyperagent: no repository is read on its own; skills enter the account only by an explicit upload or GitHub import, and are never refreshed (F-06, corrected after the operator's screenshot showed the GitHub import and a `.zip` upload). 169/02 moved
  the planner files to `~/.aof/hyperagent/`, written by `aof work integrations hyperagent package`
  (ADR-007). This repository's `.hyperagent/` was removed by its update, and `hyperagent` was added
  to `.mcp.json`.

## Notes & decisions

- Opt-in rather than default: about fifteen call sites default to "every runtime"; a fourth default
  runtime would have rendered `.hyperagent/` into every existing project. `defaultRuntimes()` is used at
  the defaulting sites only; `config-inspect.mjs` keeps `supportedRuntimes()` (its defaults are
  pre-normalised by the DSL, and the file is pinned by the workspace runtime audit).
- Variants are full rewrites, not prefixed copies: a Hyperagent session has no checkout and no `aof`
  binary, so every CLI step is replaced (never simulated) and `aof work promote` is never attempted.
- `packages/core/test` budget 42 → 43 for the one new suite, reason stated in the budget table.
- ~~The package owns code, not prompts: the prompt bodies stay in `packages/core/assets/` where the one
  asset seam and release packaging read every shipped prompt.~~ Reversed 2026-10-22 by the operator:
  the package owns its prompts and runtime too; the asset seam and packaging learn per-package roots
  instead (story 01).
- `check` extracts the branch through a private index (`read-tree` + `checkout-index --prefix`) rather
  than `git worktree add`: `execution/worktrees.mjs` stays the one worktree materializer (38/ADR-006),
  and nothing is registered in the operator's repository.
- Each verb lazy-loads its implementation; `aof work find`'s module ceiling 708 → 710 for the two
  modules the registry and model need (descriptors, runtime leaf), reason recorded in FF-16004's row.
- The brief does not read `work.intake` (FF-12704 keeps that token to init/promote): the planner reads
  the config itself, and drivers are always written to the backlog.

## Feedback (for retro)

- 169/01's review notes graduated at its verify (2026-10-23): lessons in
  `stories/01_story_integration-packages-are-self-contained/RETROSPECTIVE.md` (R1–R4), open residue in
  `VERIFICATION.md` F-01–F-03, ADR-003 amended.

## Verification

- Pre-existing failures in the sandbox were left untouched and are environmental (no built
  `ui/dist`, no GPG, the SEA sentinel, native node-pty): 19 in the bundle subset, 3 in core, the
  `work ui` board suites. No new failure in: core, bundle, planning, command, every arch suite,
  execution, work, surfaces, and the lifecycle / dsl / config-family / packages / adapter-policy /
  setup-ui features.
