---
type: story
number: 04
slug: the-fitness-functions
title: "The fitness functions — nine structural invariants, landed green"
parent: 52
status: done
owner: product-owner
depends: [52/00, 52/01, 52/02, 52/03]
created: 2026-08-14
updated: 2026-08-14
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/04 · The fitness functions

## User story

As a **maintainer of this codebase a year from now**, I want the nine structural promises this
milestone makes enforced in CI — the vocabulary stays closed, the checks stay pure, the loop registry
never leaks into the item vocabulary, the rendering stays deterministic — so that the next change
that quietly breaks one of them fails on the diff that introduces it, rather than being discovered as
a dead gate long afterwards.

## Context

Nine arch-tests under `test/arch/`, mechanising FF-5201…FF-5209 from the milestone's ARCHITECTURE.md
fitness-function table. The invariants are already written and reviewable there; this story turns
them into tests and lands them green.

The repository's explicit-runner invariant means authorship alone is not execution. The nine suites are
therefore registered by nine imports and nine spreads in a separately labelled milestone-52 block in
`scripts/test.mjs`; no runner logic changes, and `scripts/test-unit.mjs` remains untouched.

This story is **last on purpose**, and this repo has the scar that justifies it. TECH_DEBT item 5 is
titled "Part of the fitness gate is dead" — 10 of 700 arch-tests failing before any change, test files
reading modules that no longer existed, and the verdict "the gate reads green-ish while not running".
Authoring these tests before their surfaces exist would open a long RED window in which "red because
unbuilt" is indistinguishable from "red because broken" — which is exactly how that debt was
incurred. FF-5209 carries the direct counter-measure: an unreachable finding code is asserted to be as
much a defect as an unfrozen one.

ADR references: all ten — each fitness function names its source ADR in the milestone's table.

## Acceptance

- **FF-5201** — no `loop`/`loops` token in `ITEM_RE` or any of its copies (`src/work.mjs`,
  `src/work-doctor.mjs`, `src/commands/migrate-folder.mjs`) or the board's TS union; `src/work.mjs`
  unchanged by this milestone; no code path in `src/` writes a file under `<work.dir>/loops/`.
- **FF-5202** — the loop modules import from `./work.mjs` exactly `parseFrontmatter` and nothing else;
  nothing in `src/work.mjs`, `src/work-doctor*.mjs`, `src/cli.mjs` or `ui/` references a loop module
  or a loop command id.
- **FF-5203** — the admitted keys, kinds, edge keys, pointer schemes, endpoint schemes, sentinels,
  cadence kinds and event triggers are asserted by **exact set equality** against the ADR literals.
- **FF-5204** — every real record under `<work.dir>/loops/` loads with zero `error`-severity schema
  findings, and no `kind: loop` node declares `unknown` for a machinery field.
- **FF-5205** — the checks module imports no `node:fs`/`node:child_process`/`node:process`/`node:os`,
  reads no clock, performs no dynamic import, and is deterministic in-process and across a subprocess.
- **FF-5206** — over the closed, finite cadence-kind cross-product, an inversion is emitted **only**
  for periodic↔periodic; no `event:`→duration mapping exists in the source.
- **FF-5207** — the three commands are registered with the exact route triples and are reachable via
  `resolveRoute`; `src/cli.mjs` carries no `loops` branch.
- **FF-5208** — the rendering is byte-identical in-process and across a subprocess; no file under
  `ui/` references the loop registry.
- **FF-5209** — every emitted finding matches `{code, severity, path, message}` with an absolute path;
  the code set is **lane-scoped**, so this test imports **both** `src/work-loops.mjs` and
  `src/work-loops-checks.mjs` and asserts their sets are **disjoint** and that the union of codes
  actually emitted **equals** their union — no unreachable code, no unfrozen one.
- All nine land **green**, not red-pending.
- All nine are explicitly registered in `scripts/test.mjs`; the suite-registration gate reports no new
  orphan, and every file exports a non-empty `{name, run}` array.

One boundary correction from ADR-011: this story does **not** own the three `argsFor` cases in
`test/arch/acd-work-command-cli-bijection.test.mjs`. They fire on 52/02's registration diff and belong
in it, so "must not touch every pre-existing test" carries that one carve-out — held by 52/02, not
here.

## Tasks

- [x] [00 — the boundary guards (FF-5201, FF-5202)](tasks/00_boundary-guards.feature)
- [x] [01 — the closed vocabulary and the parsing records (FF-5203, FF-5204)](tasks/01_vocabulary-and-records.feature)
- [x] [02 — purity, determinism and comparability (FF-5205, FF-5206, FF-5208)](tasks/02_purity-and-determinism.feature)
- [x] [03 — the command surface (FF-5207)](tasks/03_command-surface.feature)
- [x] [04 — the finding envelope and the live code set (FF-5209)](tasks/04_finding-envelope.feature)

## Notes

These are **structural** invariants over the vocabulary, the import surface, the route table and the
code set. The observable behaviours — "validate reports the unpaired build loop", "show renders
run-resilience's three actuators", "an empty repo prints no registry" — are the other stories'
`.feature` scenarios and deliberately do not live here.

Partition correction: the original ownership row omitted the repository's explicit suite-registration
seam. Architect review added the minimal exception: `scripts/test.mjs` receives exactly nine imports and
nine spreads in one m52 block. The concurrent milestone-50 hunks and all runner behaviour remain
byte-for-byte unchanged.
