---
type: story
number: 03
slug: a-project-turns-it-on-and-is-told-what-it-needs
title: "A project turns it on and is told what it needs — `work.examples.operatorAware` is off by default, `init-config` turns it on and writes the profile, and the doctor and the update say once when it is on with no profile"
parent: 192
depends: [02]
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
adrs: [ADR-006]
reads:
  - wiki/work/192_milestone_operator-aware-discovery/SPEC.md
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-003
  - wiki/work/192_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-008
  - packages/contracts/src/operator-profile.mjs
  - packages/core/src/application/bindings/work.mjs
  - packages/core/src/workspace.mjs
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/work/src/doctor/index.mjs
  - test/arch/examples/acd-sbe-package-one-way.test.mjs
  - test/arch/examples/acd-examples-off-is-today.test.mjs
files:
  - schemas/aof.schema.json
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/commands/init-update.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/work/doctor-examples.mjs
  - packages/core/src/application/assemble.mjs
  - packages/specification-by-example/src/operator-lane.mjs
  - packages/specification-by-example/package.json
  - packages/specification-by-example/README.md
  - packages/core/test/work-init.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - packages/core/test/support/assets-services.mjs
  - test/examples/examples-config-gate.test.mjs
  - test/examples/operator-profile.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 192/03 · A project turns it on and is told what it needs

## User story

As **an operator who runs several projects, only some of them in a subject I do not know**,
I want **operator-aware discovery to stay off until I turn it on for a project, and, when I do,
to be told once what it still needs from me**,
so that **a project that does not need research and background never pays for them, and one that
does is never left quietly treating me as new to everything**.

What lands (ADR-006 §1, §4, §5): the switch `work.examples.operatorAware` in the schema and the
validator, with its one resolver; `aof work init-config` gaining `--operator-aware`,
`--operator-role`, `--expertise` and `--global`; `aof work doctor` reporting
`operator-profile-undeclared` once, from its own lane module, when the switch is on with no
profile; `aof work update` and the turn-on itself printing the same sentence.

## Tasks

- [ ] 00 [operator-aware discovery is off unless a project turns it on](tasks/00_operator-aware-discovery-is-off-unless-a-project-turns-it-on.feature)
- [ ] 01 [init-config writes the operator's own words](tasks/01_init-config-writes-the-operators-own-words.feature)
- [ ] 02 [the doctor says once that no profile is declared](tasks/02_the-doctor-says-once-that-no-profile-is-declared.feature)
- [ ] 03 [the update says it too](tasks/03_the-update-says-it-too.feature)

## Notes

- This story is code only. It writes no bundle prose and no manifest, and does not need milestone
  193. What the switch renders is 04's.
- `aof:init` is unchanged (ADR-006 §7): it renders before any config exists, so in a new project
  the switch is off. The SPEC's line about it was dropped at the review of the first refinement.
- `packages/specification-by-example/src` gains its sixth module, `operator-lane.mjs`, and its
  budget row says which part of the practice it is. It is a separate module so this story and 01
  share no file.
- The doctor and update cases join 02's `test/examples/operator-profile.test.mjs`; the switch's
  cases join `examples-config-gate`; the verb's join core's `work-init` and `work-update` suites.
  No suite file is added.
