---
type: story
number: 01
slug: the-seam-is-named-in-config
title: "The seam is named in config — `work.diagrams` and its one reader, the layout's one home, a generator registry with one adapter, and `aof diagram plan`"
parent: 133
depends: []
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-001
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-002
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-004
  - src/config-inspect.mjs
  - src/command-core.mjs
  - src/cli.mjs
  - src/command-error.mjs
  - src/commands/resolve.mjs
  - src/commands/doc.mjs
  - src/commands/graph/build.mjs
  - src/commands/graph/impact.mjs
  - schemas/aof.schema.json
  - scripts/test.mjs
  - test/command/config-inspect.test.mjs
  - test/arch/graph/index.mjs
  - test/arch/graph/acd-graph-command-cli-bijection.test.mjs
  - test/arch/command/acd-command-route-derived.test.mjs
  - test/arch/command/acd-command-namespace.test.mjs
  - test/arch/command/acd-command-layer-imports-downward.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - src/config-inspect.mjs
  - schemas/aof.schema.json
  - src/diagrams/layout.mjs
  - src/diagrams/generators.mjs
  - src/diagrams/generator-diagram-design.mjs
  - src/commands/diagram/plan.mjs
  - src/command-core.mjs
  - src/cli.mjs
  - scripts/test.mjs
  - test/command/config-inspect.test.mjs
  - test/diagrams/index.mjs
  - test/diagrams/diagram-layout.test.mjs
  - test/diagrams/diagram-generator.test.mjs
  - test/diagrams/diagram-plan-command.test.mjs
  - test/arch/diagrams/index.mjs
  - test/arch/diagrams/acd-diagram-generator-named-once.test.mjs
  - test/arch/diagrams/acd-diagram-layout-single-home.test.mjs
  - test/arch/command/acd-command-route-derived.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · The seam is named in config

## User story

As **the architect about to draw a design, and the operator who picks the tool that draws it**,
I want **`work.diagrams` validated and read through one reader, absent meaning off; the diagram's
folder, stem, brief and link block owned by one module; the generator reached through a registry
whose one adapter locates the skill by path and hands back instructions; and `aof diagram plan`
to answer, from config alone, whether to draw, where, and how**,
so that **turning diagrams on, off or to another generator is a config edit, and nothing outside the
adapter knows which tool draws**.

What lands (ADR-001 to ADR-004): `validateWorkDiagrams` + `resolveWorkDiagrams` beside the
`work.plan` pair, and the schema object. `src/diagrams/layout.mjs` (the `diagrams` segment, the
`ADR-NNN-<slug>` stem, `diagramPaths`, `readDiagramBrief`, `renderDiagramBlock`,
`parseDiagramLinks`). `src/diagrams/generators.mjs` (`generatorIds`, `generatorFor`) and the one
adapter with `locate`, `instructions`, `toSvg` and `readBack: null`. `diagram:plan` registered in
the core, with the `diagram` family in the CLI's help and fallback. The family exemptions for
`src/diagrams`, `src/commands/diagram`, `test/diagrams` and `test/arch/diagrams`, naming their
future members. FF-13301 and FF-13302.

## Tasks

- [x] `tasks/00_the-config-names-the-generator-and-absent-means-off.feature` — `validateWorkDiagrams` + `resolveWorkDiagrams`: absent and `off` resolve alike, `formats` canonical, every bad shape a coded error that still resolves off, unknown ids listed from `generatorIds()`, the schema object
- [x] `tasks/01_the-layout-owns-the-stem-the-brief-and-the-link-block.feature` — `src/diagrams/layout.mjs`: the stem grammar, forward-slash `diagramPaths`, `readDiagramBrief` bounded by its ADR, `renderDiagramBlock` exactly as ADR-003 §3, and a `parseDiagramLinks` round trip
- [x] `tasks/02_the-adapter-locates-the-skill-and-answers-instructions-and-an-svg.feature` — one registered adapter with the six-key contract and `readBack: null`; `locate` over a fixture home (newest of any scope, then the marketplace clone, else a coded miss that installs nothing); `instructions` content; `toSvg` over literal fixtures
- [x] `tasks/03_aof-diagram-plan-answers-from-config-alone.feature` — `aof diagram plan`: off and generator-missing are exit-0 answers, the plan carries paths/brief/instructions and writes nothing, each malformed request a coded refusal in a stated check order, the `aof diagram` family help

## Notes

- `toSvg` belongs here, not in 02: it is the adapter's half of the contract (ADR-002 §2). Story 02
  composes it.
- `locate` takes the home directory as an input. Suites run against a fixture home with a fake
  `installed_plugins.json`, never the real one, under `AOF_GLOBAL_HOME=$(mktemp -d)`.
- The `instructions` text is the adapter's. The contract pins only that it carries the absolute skill
  path, the style path (or the no-style wording), the brief and the absolute source path, and that it
  says to write nothing else and not to export.
- `src/commands/` counts files, so the new family directory costs that row nothing. The exemption's
  `why` names `plan.mjs` and `export.mjs` so story 02 edits no budget line.
