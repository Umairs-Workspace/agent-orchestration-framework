---
type: story
number: 02
slug: the-operator-says-who-they-are
title: "The operator says who they are — a role and a level per domain in `work.operator`, with a machine-wide default a project overrides, resolved one way"
parent: 192
depends: []
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
adrs: [ADR-003]
reads:
  - wiki/work/192_milestone_operator-aware-discovery/SPEC.md
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - packages/contracts/src/agent-mode.mjs
  - packages/contracts/src/loop-bounds.mjs
  - packages/core/src/workspace.mjs
  - packages/core/src/application/bindings/commands/project-validate.mjs
  - packages/core/src/application/bindings/commands/validate-shared.mjs
  - test/examples/examples-config-gate.test.mjs
  - test/bundle/schema.test.mjs
  - test/support/source-slice.mjs
  - test/support/read-src-files.mjs
  - packages/core/src/application/assemble.mjs
  - packages/core/src/application/workspace.mjs
  - packages/core/test/support/assets-services.mjs
files:
  - packages/contracts/src/operator-profile.mjs
  - packages/contracts/package.json
  - packages/contracts/README.md
  - schemas/aof.schema.json
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/work.mjs
  - packages/core/src/application/bindings/commands/project-show.mjs
  - test/command/config-inspect.test.mjs
  - test/examples/operator-profile.test.mjs
  - test/examples/index.mjs
  - test/arch/examples/acd-operator-profile-one-resolver.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 192/02 · The operator says who they are

## User story

As **an operator who knows some of my projects' subjects well and others hardly at all**,
I want **to say once who I am and how well I know each domain, for every project on this machine,
and to correct it for one project where it differs**,
so that **discovery can pitch itself at what I actually know, in each project, without my
repeating myself or being treated as a specialist I am not**.

What lands (ADR-003): the pure leaf `operator-profile.mjs` in `@aof/contracts` (the three levels,
the merge, the resolver, the level lookup); `work.operator` in the schema and the validator, for
the project file and the global one; `loadWorkspace` laying the global block under the project's;
`aof project show` answering the resolved profile with each value's source. FF-19203 lands with it.

## Tasks

- [ ] 00 [the operator states a role and a level per domain](tasks/00_the-operator-states-a-role-and-a-level-per-domain.feature)
- [ ] 01 [a project overrides the machine-wide default, key by key](tasks/01_a-project-overrides-the-machine-wide-default.feature)
- [ ] 02 [a domain nobody listed is new](tasks/02_a-domain-nobody-listed-is-new.feature)

## Notes

- `packages/contracts/src` moves 9 → 10 in its budget row, with its reason: the operator profile's
  vocabulary and resolver, read by core and by specification-by-example. `test/examples` and
  `test/arch/examples` each gain one file and restate their rows.
- Nothing here gates anything. No refusal, no doctor finding: the warning is 03's.
- Every test names its own global home through `AOF_GLOBAL_HOME`, as `examples-config-gate` does.
  None reads the real `~/.aof`.
