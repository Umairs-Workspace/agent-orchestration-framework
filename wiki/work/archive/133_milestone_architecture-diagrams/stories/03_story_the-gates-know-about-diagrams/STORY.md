---
type: story
number: 03
slug: the-gates-know-about-diagrams
title: "The gates know about diagrams — a doctor lane that reports a missing linked file, a missing export, a link under the wrong ADR, and an orphan"
parent: 133
depends: [01]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-006]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-003
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-006
  - src/diagrams/layout.mjs
  - src/config-inspect.mjs
  - src/work/doctor.mjs
  - src/work/doctor-budget.mjs
  - src/work/doctor-depends.mjs
  - src/work/doctor-identity.mjs
  - test/work/doctor-depends-lane.test.mjs
  - test/work/index.mjs
  - test/work/delivered-story-records-reported.test.mjs
  - test/arch/work/acd-advisory-lane-never-gates.test.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - src/work/doctor-diagrams.mjs
  - src/work/doctor.mjs
  - test/work/doctor-diagrams-lane.test.mjs
  - test/work/index.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The gates know about diagrams

## User story

As **anyone validating the stream**,
I want **`aof work doctor` to report a `diagrams/` link whose file is not in the tree, a linked
diagram without its SVG (or its PNG, when the project exports PNG), a link sitting under a different
ADR from the one its name claims, and a diagram file nothing links**,
so that **a diagram in an ADR is either really there, exported and in the right place, or the item
is red and says why**.

What lands (ADR-006): `diagramsGroup` in `src/work/doctor-diagrams.mjs`, parsing only through the
layout. It is appended to `CHECK_GROUPS` and named in FF-5905's lane roster. The `src/work` row
rises 43 → 44 with its reason. Codes `diagram-link-missing`, `diagram-export-missing` and
`diagram-adr-mismatch` are errors, and `diagram-orphan` is a warning.

## Tasks

- [x] `tasks/00_a-linked-diagram-missing-or-unexported-is-an-error.feature` — a pure lane over `docTexts` plus one new `diagrams/` listing fact; `diagram-link-missing` and `diagram-export-missing` at `severityFor(status)`; PNG owed only when enabled with png; cache-only rows skipped; the engine end to end
- [x] `tasks/01_a-wrong-adr-link-is-an-error-an-orphan-a-warning-and-no-diagrams-is-silent.feature` — `diagram-adr-mismatch` (including a link under no ADR), `diagram-orphan` at `warn` by stem, silence for items with no diagrams and for this repo's stream, the lane registered and rostered

## Notes

- The lane reads `formats` through `resolveWorkDiagrams`. With diagrams off, only the SVG is owed.
- The suite sits beside its sibling lane suites in `test/work/` and takes that directory's one free
  slot. That keeps this story write-disjoint from 02.
