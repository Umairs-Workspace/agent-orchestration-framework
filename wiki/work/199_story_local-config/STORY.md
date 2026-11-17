---
type: story
number: 199
slug: local-config
title: "Each person on a shared repository keeps their own settings in an uncommitted .aof/aof.config.local.json, laid over the project's config, so one person's operator profile is never another's"
status: done
owner: product-owner
created: 2026-11-17
updated: 2026-11-17
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/199_story_local-config/EXAMPLES.md
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-003
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-003
  - packages/core/src/application/bindings/work.mjs
  - packages/core/src/workspace.mjs
  - packages/core/src/aof-gitignore.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/commands/project-show.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/contracts/src/operator-profile.mjs
  - packages/execution/src/runtime-selection.mjs
  - packages/messaging/src/commands.mjs
  - packages/mesh/src/worktrees.mjs
  - packages/core/test/workspace.suite.mjs
  - packages/core/test/work-init.suite.mjs
  - test/command/config-inspect.test.mjs
  - test/examples/operator-profile.test.mjs
files:
  - .aof/.gitignore
  - packages/contracts/package.json
  - packages/contracts/src/local-config.mjs
  - packages/contracts/src/operator-profile.mjs
  - packages/core/src/aof-gitignore.mjs
  - packages/core/src/application/bindings/commands/doctor.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - packages/core/src/application/bindings/commands/project-show.mjs
  - packages/core/src/application/bindings/commands/validate-shared.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/work.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/workspace.mjs
  - packages/core/test/work-init.suite.mjs
  - packages/messaging/src/discord-buttons.mjs
  - packages/messaging/src/discord-commands.mjs
  - packages/messaging/src/replies.mjs
  - scripts/workspace-runtime-audit.json
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/command/acd-cli-entry-executes.test.mjs
  - test/arch/session/acd-session-driver-mesh-blind.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/command/config-inspect.test.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/fixtures/application/command-inventory.json
---
# 199 · Each person on a shared repository keeps their own settings in an uncommitted local config

## User story

As **one of several people working in the same aof repository**,
I want **my own settings, my operator profile first, to live in `.aof/aof.config.local.json`: kept
out of git, laid over the project's committed `.aof/aof.config.json` when aof runs in this checkout,
and shown with where each value came from**,
so that **discovery pitches its questions at what I know rather than at what whoever last committed
the profile knows, and I can set my own values without a commit that changes them for everyone else**.

## Tasks

- [x] `tasks/00_the-local-file-wins-and-says-where-each-value-came-from.feature` (R1): local wins over project, which wins over global; each block keeps its merge; inspection names each value's source; a loop lane reads its starting checkout's file.
- [x] `tasks/01_the-local-file-holds-only-per-person-keys.feature` (R2): only `work.operator`, `work.notify.channels` and `work.agents.session.effort` are accepted; anything else is refused and never loaded.
- [x] `tasks/02_the-local-file-is-never-committed.feature` (R3): init and update keep it in `.aof/.gitignore`; the doctor warns when git tracks it.
- [x] `tasks/03_init-config-writes-the-operator-profile-locally.feature` (R4): the operator profile goes to the local file by default and to the committed file with `--project`.
- [x] `tasks/04_the-runtime-audit-covers-every-child-process-199-touched.feature` (`@bug`, F-03): `config-inspect.mjs`'s three audit entries are re-stamped and `work/doctor.mjs`'s new `git ls-files` probe is audited.

## Notes

**Why now.** Config has two layers today: the machine-wide `~/.aof/aof.config.json` and the
project's committed `.aof/aof.config.json`. Measured 2026-11-17, nothing reads a local file.
`work.operator` (193/ADR-003) is a profile of one person, with a `role` and an `expertise` map, and
its only per-project home is the committed file. Two people in one repository therefore share one
profile, or overwrite each other's. The machine-wide layer cannot fix this: it holds one profile for
every project on the machine, and a person's level differs between projects.

**Where the layer goes.** The global layer is applied in one place: `loadWorkspace` in
`packages/core/src/application/bindings/work.mjs` (around L185–195) merges mesh, notify channels
and the operator profile, each with its own rule. The local layer belongs in the same place, on
top: **global < project < local**. Each key keeps the merge rule it already has; for example,
`expertise` merges per domain through the operator profile's one merge. Refine needs to measure how
many of the roughly 34 runtime files that read `aof.config.json` skip that seam. That count decides
whether this stays one story or becomes a milestone.

**Constraints the refine must honour:**
- **Rendering never reads it.** Rendered commands are committed, so the render reads the project's
  own file only, never the machine-wide config (192/ADR-003). The local file is a third input that
  must be excluded the same way. Otherwise two clones of one commit render different commands.
  Practice keys such as `work.examples.enabled` therefore stay project decisions. A local value for
  one is either refused or reported as having no effect on the render, which refine decides.
- **It is never committed.** `aof work init` and `aof work update` add `aof.config.local.json` to
  `.aof/.gitignore`. The doctor warns when git tracks one.
- **It is validated and visible.** The validator reads the local file with the same diagnostics,
  naming the file in each diagnostic. Config inspection and the doctor show which keys the local
  file overrides, so a person can see why their aof behaves differently from a teammate's.
- **Writes go where the key belongs.** A command that writes a per-person key, such as
  `init-config`'s operator profile, writes it to the local file once one is in use, or when given a
  switch such as `--local`. Team keys still go to the project file.
- **Store compatibility.** A repository with no local file behaves exactly as today.

**Settled at refine (2026-11-17, see `EXAMPLES.md`):**
1. **Keys.** An allow-list: `work.operator`, `work.notify.channels` and `work.agents.session.effort`.
   Anything else is refused (Q1, the operator's answer). None of the three reaches a render.
   `work.agents.session.effort` is read only by the loop's runtime selection
   (`packages/execution/src/runtime-selection.mjs:117`).
2. **Writes.** `init-config` writes the operator profile to the local file by default, and with
   `--project` to the committed file (Q2, the operator's answer).
3. **Loop lanes** honour the local file of the checkout that started them, resolved through git's
   common directory (Q3, a technical default). A mesh worker on another machine reads its own
   checkout's local file, as it reads its own config today.
4. **The layer** is applied on top, in `loadWorkspace` (Q4, a technical default). The read-merge-write
   `readConfig` copies (delegation, headroom, orchestrator) keep writing the project file: they
   write team keys.
5. **Tests** supply a local file as a fixture in the project directory under test, with
   `AOF_GLOBAL_HOME` isolated as today (Q5, a technical default).

**Out of scope:** `aof messaging enable` keeps writing channels to the project file (or the global
one with `--global`). A person who wants their own channels for one repository puts them in the
local file by hand. A `--local` switch there is a follow-up if one is wanted.
