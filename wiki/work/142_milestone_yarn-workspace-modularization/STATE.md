# 142 · Yarn workspace modularization — State

## Progress

- 2026-09-28: Milestone captured from the repository assessment and subsequent design discussion.
- Status: Yarn cutover committed as `a66dd8d` on `refactor/yarn-workspace-modularization`.
  `@aof/contracts` supplies command composition and routing (`5be0e23`).
  `@aof/effects` owns dispatch/outbox algorithms (`ba8c557`), generic SQLite journal storage,
  and reactor registration through injected runtime/diagnostic/policy interfaces. Mesh and messaging own their command contributions;
  domain source extraction remains incremental.
  The earlier full root suite was stopped before completion; its limitations remain recorded below.
- Objectives: [SPEC.md](SPEC.md).
- Source findings and unresolved questions: [RESEARCH.md](RESEARCH.md).
- Proposed package map and migration stages: [MIGRATION.md](MIGRATION.md).
- Delivered changes and verification details: [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Notes & decisions

- 2026-09-28: The user clarified that this work proceeds outside AOF's workflow. This folder is
  a planning/research record only: implement directly using ordinary development and verification,
  without AOF skills, run tracking, story orchestration, or lifecycle gates. The mistakenly created
  local run record was removed and its local status change reversed. This instruction supersedes
  the workflow/refinement handoffs written during capture.
- The user explicitly requested `wiki/work/142_milestone_<appropriate_name>` as the location for
  these notes. This does not authorize managing the migration through AOF.
- The CLI belongs inside the core package. The original proposal for a separate `apps/cli`
  workspace was superseded in discussion and must not be carried into implementation.
- Core includes the bundled skills, commands, agents and templates. Skills such as `aof:continue`
  and `aof:verify` require the executable and supporting operations in the base AOF distribution.
- Feature packages contribute their own CLI commands, actions, arguments and options. Core owns
  registration/routing and shared conventions; feature packages own domain behavior.
- Domain packages must not import the core that assembles them. Shared contracts and necessary
  foundational utilities sit below both; collaborators can also be supplied through explicit interfaces.
- UI and desktop remain separate applications. Desktop retains its Rust/Cargo ownership.
- Package names beyond these agreed boundaries, the contribution API, and extraction sequence remain
  proposals to validate against the code.

## Verification

- The notes record core ownership of the CLI and package extensions. AOF lifecycle metadata and
  refinement handoffs have been removed.
- 2026-09-28: Existing supply-chain audit passed with no warnings. Unit baseline passed with
  997 successful checks; log: `.tmp/workspace-migration/baseline-unit.log` (local, ignored).
- Yarn cutover verification passes: audit, clean immutable install, production focus, lock-drift
  refusal, all 997 unit checks, nine new regression cases, focused architecture/release checks,
  UI build, CLI smoke, external payload smoke, installer dry-run, and Bash syntax.
- The broad root run was stopped after 5,221 checks: 5,209 passed and 12 failed during the run.
  Eleven failures were corrected and passed focused reruns. One loop-wave case passed unchanged
  when rerun alone; its intermittent full-run failure remains recorded. No full-suite green claim.
- Linux/macOS native builds, actual WSL deployment, release artifacts, and the unexecuted remainder
  of the root suite remain unverified. Details: [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Next

Extract foundational utilities and domain packages behind the new contribution boundary.
Split application reactor handlers into domain-owned contributions and remove the remaining
table/transition cycle. Generic journal storage and registration are extracted; file-location
policy and run/assignment-specific queries remain with the application. Mesh and messaging
still live under `src/`; core still owns the CLI and will move to `packages/core` with its assets.
`yarn.lock` is now authoritative. Carry the outstanding full-suite and platform checks into the
next verification round. Continue direct development without AOF workflow commands.
