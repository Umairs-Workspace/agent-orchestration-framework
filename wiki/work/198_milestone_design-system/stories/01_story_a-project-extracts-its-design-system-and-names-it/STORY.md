---
type: story
number: 01
slug: a-project-extracts-its-design-system-and-names-it
title: "A Claude project extracts its design system from its code tokens and exported mocks into a Design System artifact, and names it in config"
parent: 198
status: not-started
owner: product-owner
created: 2026-11-17
updated: 2026-11-26
adrs: [ADR-003, ADR-004, ADR-005, ADR-008]
reads:
  - wiki/work/198_milestone_design-system/SPEC.md
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-003
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-004
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-005
  - wiki/work/198_milestone_design-system/RESEARCH.md#R3
  - wiki/work/198_milestone_design-system/RESEARCH.md#R4
  - wiki/work/198_milestone_design-system/RESEARCH.md#R6
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-003
  - packages/specification-by-example/package.json
  - packages/specification-by-example/assets/bundle.json
  - packages/specification-by-example/src/contribution.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/cli.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/contracts/src/operator-profile.mjs
  - packages/integration-hyperagent/assets/bundle.json
  - apps/ui/src/index.css
  - test/command/config-inspect.test.mjs
  - test/arch/practices/index.mjs
  - package.json
files:
  - packages/design-system/package.json
  - packages/design-system/README.md
  - packages/design-system/src/contribution.mjs
  - packages/design-system/src/tokens.mjs
  - packages/design-system/src/config.mjs
  - packages/design-system/src/commands.mjs
  - packages/design-system/assets/bundle.json
  - packages/design-system/assets/commands/design-system.md
  - packages/design-system/test/index.mjs
  - packages/design-system/test/tokens.suite.mjs
  - packages/design-system/test/config.suite.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/cli.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - test/command/config-inspect.test.mjs
  - test/arch/practices/acd-design-system-verbs-offline.test.mjs
  - test/arch/practices/index.mjs
  - package.json
  - yarn.lock
schema: 1
aofVersion: 0.1.0
---
# 198/01 · A Claude project extracts its design system and names it in config

## User story

As **the operator of a Claude project whose look lives in Claude Design mocks and a CSS token
block, with no design system anywhere**,
I want **one command that reads my code's tokens and the mocks I have exported, shows me the
inventory it found, builds a Design System artifact from it once I agree, and then records it in
`work.ui.designSystem`**,
so that **every later mock is drawn on one shared system instead of reinventing the product's
look, and the AOF look is captured before standalone Claude Design closes on 2026-12-14**.

## Tasks

To be authored (`aof:refine 198/01`).

## Notes

- **New package `@aof/design-system`,** registered like `@aof/specification-by-example`. It
  declares the `design-system` practice (key `work.ui.designSystem.enabled`) with no fragments yet:
  02 and 03 add them.
  - Adding a workspace package changes `yarn.lock`, so run `node scripts/supply-chain-audit.mjs`.
- **CLI verbs** (ADR-003): `aof design-system tokens`, `check` and `use`. `check` lands here because
  the extraction's own review uses it. 03 wires it into verify.
- **A system is named by `name` or by `artifact`, exactly one** (ADR-005, amended 2026-11-26).
  - `use` takes `--name <title>` or `--artifact <url>`, and writing one removes the other.
  - The validator's codes: both set, neither set while `enabled: true`, an empty `name`, a bad
    URL, a bad mode, a missing or stray `source`.
  - `extract` writes `--name` with the title it published under. It first resolves that title
    (ADR-005 §4); a title that already matches another system is a stop, naming every candidate.
  - The CLI never resolves a name. Resolution is the session's one `list` call, and its stop on
    no match or several is @manual.
- **The command `aof:design-system extract`** is a whole member with `runtimes: ["claude"]`, always
  installed, needing no 00. It follows the Design System type's `from-code.md`, read from the type at
  run time and never copied into the bundle.
- **The first real run is AOF's own.** Its inputs are `apps/ui/src/index.css` and the exported AOF
  mocks. It is the @manual acceptance.
