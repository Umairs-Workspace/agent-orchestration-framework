---
doc: architecture
---
# 169 · Hyperagent plans the work — Architecture Decisions

**Measured at refine (2026-10-22, read-only).** The only way a package can plug into core today is
the contribution object: `createXContribution(...)` returns `{ name, commands }`, and
`assembleCommandCore` (`packages/core/src/application/bindings/command-core.mjs:211`) collects
them. It carries CLI verbs only. The bundle loader reads one descriptor, `readDescriptor()` →
`readAssetText("bundle", "bundle.json")` (`packages/core/src/work/bundle.mjs`), and resolves every
member file against core's asset root through the one SEA-safe seam
(`packages/core/src/asset-base.mjs`, guarded by `acd-sea-safe-asset-base` and
`acd-bundle-location`). Project config reaches the render in one place, `synthesizeBundleConfig`
(`packages/core/src/work/bundle-synthesis.mjs`, "the ONLY project-config read on the render
path").

The delivered branch (169/00) modelled Hyperagent as a fourth runtime. `model.mjs` imports
`@aof/integration-hyperagent/runtime` to add a `RUNTIMES` row and a `CAPABILITIES` column, a new
`defaultRuntimes()` keeps it out of about fifteen defaulting sites, and `bundle-runtime.mjs` maps
commands to Hyperagent skills only for members that carry a `hyperagent` variant. Its prompts are
in `packages/core/assets/` (169/00 F-1, F-4).

The asset seam already resolves one sibling workspace package: the `ui` class finds `@aof/ui`
through `createRequire(...).resolve.paths` (`devClassBase("ui")`). The payload install copies each
production workspace package's whole directory into `~/.aof/bin/node_modules/@aof/<name>/`
(`scripts/install-local.mjs`, `copyTreeTolerantly`), so a package's `assets/` reaches the payload
unchanged. Only the packaged binary's sidecar (`bundle/`, filled from the bundle manifest by
`scripts/build-sea.mjs` and `install-local.mjs`) has to learn about package assets.

---

## ADR-001: Hyperagent is an integration, not a runtime

**Status:** Accepted (operator, 2026-10-22)
**Date:** 2026-10-22

**Context.** A runtime is an assistant aof renders its whole asset model into: claude, codex,
opencode. Hyperagent is an external service a project hands planning to. It imports a fixed set
of skills and runs nothing else of aof's.

**Decision.** The `hyperagent` runtime is removed. `RUNTIMES` and `CAPABILITIES` go back to
claude, codex and opencode. `defaultRuntimes()` and its call sites go back to `supportedRuntimes()`.
The `requiresVariant` mapping and the `outside-runtime-subset` status are removed. The schema's
runtime enum loses `hyperagent`, and `--runtime hyperagent` is an unknown runtime again. The files
Hyperagent imports become the integration's own assets (ADR-004).

**Consequences.** The six planning skills stop being variants of core's commands. They are the
package's own skill texts, already full rewrites, so nothing they shared with core is lost.

## ADR-002: An integration's contribution is one object that carries its verbs and its bundle assets

**Status:** Accepted
**Date:** 2026-10-22

**Decision.** The package exports one static contribution from
`@aof/integration-hyperagent/contribution`:

```js
{ id: "hyperagent",                                   // the work.integrations key that enables it
  name: "@aof/integration-hyperagent",
  assets: { package: "@aof/integration-hyperagent" }, // reads <package>/assets/bundle.json
  commands: (services) => [...] }                     // lazy verb implementations, as today
```

The contribution module is a data leaf. It imports the command descriptors, never a verb
implementation, so FF-16004's per-verb module ceilings move by at most the one module.
`createHyperagentContribution` is replaced by the contribution's `commands` member, so there is no
second spelling.

## ADR-003: One registry module is the only core module that names an integration package

**Status:** Accepted
**Date:** 2026-10-22

**Context.** esbuild bundles the packaged binary from static imports, so a runtime scan of
`node_modules` would break the embedded fallback.

**Decision.** `packages/core/src/integrations.mjs` statically imports each integration's
contribution and exports `INTEGRATIONS` (frozen, in order). `bundle.mjs`, `bundle-synthesis.mjs`
and `command-core.mjs` read the registry. FF-16901 forbids `@aof/integration-*` imports anywhere
under `packages/core/src` except `integrations.mjs`. Notion's existing import in
`command-core.mjs` is the one named exception, which the chore removes.

**Amended at 169/01's verify (2026-10-23).** Notion is not imported from `command-core.mjs` alone:
measured, `@aof/integration-notion` is imported from ten modules under `packages/core/src`
(`application/bindings/{command-core,commands/notion-associate,commands/notion-sync-work,effects/table,integrations/routing,notion/cli,notion/mapping,notion/sync-work,notion/sync}.mjs`
and `effects/stores.mjs`). The named exception is therefore the Notion **package**, once, by name,
and the chore that moves Notion onto the seam removes all ten imports.

## ADR-004: The bundle descriptor is core's plus each integration's fragment, and every member reads from its owning package

**Status:** Accepted
**Date:** 2026-10-22

**Decision.** `readDescriptor()` returns core's `bundle.json` with each contribution's
`assets/bundle.json` members appended. Each appended member records its owning integration, and
its text is read from that package's `assets/`. A member id that already exists is refused at
load, naming the member and the package. Hyperagent's fragment holds:

- `hyperplan`: a command for claude and opencode, plus its own Codex variant file. The Codex
  section leaves core's shared `variants/codex/workflow.md`.
- `hyperagent-planner-instructions` and the seven skills Hyperagent imports, as `asset` members
  with targets `.hyperagent/AGENT.md` and `.hyperagent/skills/aof-<id>/SKILL.md`. The asset kind
  already writes a file verbatim at a declared target. Each source holds its full `SKILL.md`,
  frontmatter included, without the old `aof-runtime: hyperagent` line.

**Amended by ADR-007 (2026-10-23).** The fragment holds `hyperplan` alone. The planner instructions
and the seven skills are no longer members: the fragment lists them as `packageFiles`, and the
`package` verb writes them to `~/.aof/hyperagent/`.

`asset-base.mjs` gains a package-bundle class, resolved the way `ui` is: in dev and payload,
`<resolved package dir>/assets`; packaged, `<sidecar>/bundle/packages/<package basename>/`. The bundle
manifest, `build-sea.mjs` and `install-local.mjs` copy each contributing package's assets under that
sidecar path.

## ADR-005: An integration's members render only for a project that enables it

**Status:** Accepted — option (b) (operator, 2026-10-22; 169/00 F-3)
**Date:** 2026-10-22

**Decision.** An integration is enabled when `work.integrations.<id>` is present; an empty object
is enough. That is the switch Notion already uses ("absent ≡ off"), so there is no second list.
`synthesizeBundleConfig` drops every resource and asset whose owning integration is not enabled,
before partitioning. Core's own members are never gated. `/aof:hyperplan` never shipped on main,
so the gate takes nothing from an existing project.

**Amended by ADR-007 (2026-10-23).** An enabled project renders `/aof:hyperplan` alone. The
planner files are written to the aof home by `aof work integrations hyperagent package`.

**Consequences.** This repository enables Hyperagent in `.aof/aof.config.json` to keep rendering
`/aof:hyperplan`. A project turns Hyperagent on by adding the block, then running
`aof work update`. The doctor says so when the block is missing.

## ADR-006: Text handed to git as a path uses forward slashes

**Status:** Accepted
**Date:** 2026-10-22

**Decision.** `check.mjs` builds `checkout-index --prefix=` with forward slashes (169/00 F-2). The
package's check case, red on Windows today, is the regression test.

## ADR-007: The Hyperagent package is written to the aof home by one verb, never rendered into a project

**Status:** Accepted (operator, 2026-10-23). Amends ADR-004 (the fragment's `asset` members) and
ADR-005 (what an enabled project renders).
**Date:** 2026-10-23

**Context.** Measured on Hyperagent's docs on 2026-10-23 (`/docs/concepts/skills`,
`…/skills-edit-and-import`, `…/invocations/mcp-server`):

- Hyperagent reads no repository folder.
- A skill is created by uploading "a JSON skill export or a Markdown SKILL.md file … (up to 5MB)",
  by linking documentation, by building it in chat, or by saving one from a thread.
- "Importing always creates a new skill." A re-import never updates an existing one.
- The branch's "Import from GitHub" step appears nowhere in the docs.

An uploaded skill belongs to the account, so it is the same for every project: the Cowork case
(165/ADR-006). A `.hyperagent/` folder rendered into each project's tree is read by nothing.

**Decision.**
- **What a project renders.** Hyperagent's `assets/bundle.json` fragment holds `hyperplan`
  alone. With the integration enabled, a project renders `/aof:hyperplan` and nothing else of
  Hyperagent's. The eight `asset` members leave the fragment.
- **Where the files stay.** `AGENT.md` and `skills/aof-*/SKILL.md` stay in the package's
  `assets/`, as planner files. Core injects a reader that resolves them through the package's
  asset class, so dev, payload and packaged installs all work. The fragment declares them as
  `packageFiles`, a list core never renders, so the bundle-membership control (every asset file is
  declared) still holds.
- **The verb.** `aof work integrations hyperagent package [--dry-run]` writes them to
  `<aof home>/hyperagent/`: `AGENT.md` and `skills/<id>/SKILL.md`. The aof home is `~/.aof`, or
  `AOF_GLOBAL_HOME`.
  - aof owns that directory whole and rebuilds it on every run.
  - `--dry-run` writes nothing.
  - The run prints the upload steps, naming every file by its full path, and never claims an
    upload.
  - It writes nothing in the project, records no lock entry, and needs no
    `work.integrations.hyperagent` block, because the package belongs to the account, not the
    project. Cowork records a lock entry because it pins an external commit. This package is the
    installed aof's own bytes.
- **The doctor.** It compares `<aof home>/hyperagent/` byte-for-byte with the installed package's
  files and reports `missing`, `stale` or `current`, naming the verb when the package is not
  current.

**Consequences.** This repository's `.hyperagent/` leaves on its next `aof work update` (the lock
recorded it), and its `.gitattributes` pin goes with it. Updating an uploaded skill stays a manual
edit in Hyperagent, which the hand-over says.

---

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-16901 | No module under `packages/core/src` imports `@aof/integration-*`, except `integrations.mjs`. The Notion package is the one named exception (ADR-003, amended), removed by the chore | `test/arch/command/acd-integration-registry-one-home.test.mjs` | ADR-003 |
| FF-16902 | `packages/core/assets` holds no file that only an integration renders, and the model's runtimes are exactly claude, codex and opencode | `test/arch/command/acd-integration-registry-one-home.test.mjs` | ADR-001, ADR-004 |
