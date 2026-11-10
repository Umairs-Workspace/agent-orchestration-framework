---
type: story
number: 03
slug: the-pilot-kit-is-reproducible
title: "The pilot kit is reproducible — a protocol, two comparable task packs with held-out items, and a sheet that records coded observations only"
parent: 189
depends: []
status: not-started
owner: product-owner
created: 2026-11-01
updated: 2026-11-01
adrs: [ADR-005]
reads:
  - wiki/work/189_milestone_human-understanding-checks/SPEC.md
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-005
  - wiki/planning/PRD-human-led-learning.md
  - wiki/planning/RESEARCH-human-led-learning.md
  - wiki/work/187_spike_guided-mode-boundary/SPIKE.md#finding
  - packages/core/assets/commands/manual.md
  - packages/learning/assets/commands/teach.md
  - packages/learning/test/index.mjs
files:
  - packages/learning/pilot/PROTOCOL.md
  - packages/learning/pilot/OBSERVATION-SHEET.md
  - packages/learning/pilot/REPORT-TEMPLATE.md
  - packages/learning/pilot/pack-a/
  - packages/learning/pilot/pack-b/
  - packages/learning/test/index.mjs
  - packages/learning/test/pilot-kit.suite.mjs
  - packages/learning/README.md
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 189/03 · The pilot kit is reproducible

## User story

As **the operator who will run the learning pilot**,
I want **a written protocol, two task packs of matched size with their held-out check items and
facilitator answers, a counterbalanced schedule, and an observation sheet that records results and
help levels but never anyone's raw answers**,
so that **I can compare today's manual guide with the guided path fairly, run it again later the same
way, and report it without keeping data I was never authorised to keep**.

What lands (ADR-005): `packages/learning/pilot/`, with the protocol, the sheet, the report template
and packs A and B, and `pilot-kit.suite.mjs` (FF-18903). The pilot itself is run in 04.

## Tasks

- [ ] 00 [the protocol fixes the design before anyone is recruited](tasks/00_the-protocol-fixes-the-design-before-recruiting.feature)
- [ ] 01 [the two packs are comparable and reproducible](tasks/01_the-two-packs-are-comparable-and-reproducible.feature)

## Notes

- A pack's tests are `*.spec.mjs`, never `*.test.mjs` or `*.suite.mjs`, so no repository runner
  collects them (ADR-005 §2). The pack directories are declared whole in `files:`.
- `bundle-asset-manifest-complete` is in `files:` because the pilot lives inside a package; the kit
  is not shipped (`package.json` `files` stays `src` and `assets`), and that control may need saying so.
