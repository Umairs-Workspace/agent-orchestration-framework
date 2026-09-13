---
type: story
number: 01
slug: independence-and-the-gate
title: "Independence computed, and the gate — an unpaired optimizer stops being a warning"
parent: 57
depends: [05]
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-28
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · Independence computed, and the gate

## User story

As an operator who has to trust that this system's improvement loops are actually being watched,
I want a watcher's independence to be derived from what the records say — not from a badge the
watcher wears — and an optimizing loop with no watcher to fail the validate run rather than add a
line to a report nobody reads,
so that the pairing is a property of the tree that a CI step can enforce, instead of a convention
that survives exactly as long as everyone remembers it.

Milestone 52 ended one step short, on purpose. `checkPairing` (`src/work-loops-checks.mjs:297`)
already finds an optimizing loop with no inbound monitoring edge and already refuses a
self-referential one. But every finding it emits is `severity: "warn"` from a hardcoded constant
(`:100`), and `work:loops validate` declares no exit policy at all — so today the check reports three
unpaired optimizers (`loop:build-to-green`, `loop:review-fix-rereview`, `loop:autonomous-cascade`,
measured 2026-08-27) and absolutely nothing happens.

This story is both halves of the fix: the legs that make independence a computed fact, and the
severity and exit code that make the absence of it a failure.

## Tasks

- [x] `tasks/00_a-watcher-that-reads-the-optimizers-own-number.feature` — a watcher whose measurement overlaps the loop's is reading the optimizer's own artifact, and is named
- [x] `tasks/01_the-maker-does-not-grade-itself.feature` — a judging watcher whose authority is the agent that also actuates the loop is the maker grading itself; and every judge is reported, always
- [x] `tasks/02_the-counter-is-a-different-quantity.feature` — a counter equal to the loop's controlled variable is decoration, and a record calling itself deterministic may not point at prose
- [x] `tasks/03_an-unpaired-optimizer-fails-the-run.feature` — severity is a property of the code, the face owns the exit, inherited non-gating codes stay warnings, and `aof:validate` runs it

## Notes

- **Independence is computed because a declared one is worthless.** ADR-002. An
  `independence: true` key would be a claim the maker writes about itself, in an artifact the maker
  can reach — the same failure 55/ADR-002 refused when it computed the missing anchor edge instead of
  requiring a key.
- **Each leg gets its own code, so one slip yields one finding.** 52/ADR-012's rule. Four codes join
  `loop-self-referential-edge`: `loop-watcher-shares-measurement`, `loop-watcher-shares-actuator`,
  `loop-counter-equals-controlled`, `loop-counter-not-deterministic`. A fifth,
  `loop-watcher-is-judge`, is a permanent non-gating census.
- **`loop-watcher-is-judge` is deliberately not a gate, and that is not weakness.** Whether a metric
  *admits* a deterministic computation is not decidable from a record, so no check can demand one.
  What a check can do is refuse to let a judge be invisible — which is the input 59 audits.
- **No inherited red, and this is a hard constraint on the story.** ADR-003 §2: the five exact
  `GATING_CODES` are the only check codes newly promoted, including `loop-unpaired-optimizer`;
  every other inherited check code stays `warn`, and every loader code retains its existing
  `warn`/`error` severity. 54/04 made the same call for the same reason — a gate that creates a wall
  of unrelated new red is a gate that gets silenced.
- **The gate does not go into `work.mjs` and does not become a doctor lane.** ADR-003 §5, on two
  measurements: `src/work.mjs` has **262 dependents**, and `src/work-doctor.mjs:594` carries a
  recorded ratchet that a sixth lane folds the family into a directory. This story's three files have
  a combined production dependent count of **2**.
- **The ordering edge lives here as data.** `depends: [05]`, from ADR-007 §6: 57/05 lands its records
  before this story's gate turns on, or the tree goes red for three loops that are merely not paired
  *yet*. This is the milestone's only sequencing constraint.
- **`src/work-loops-checks.mjs` imports nothing and must still import nothing.** Measured: 0 imports,
  2 production dependents (`aof graph impact`, 2026-08-27). `FF-5702` extends 52's existing purity
  guard rather than adding a sibling to it.
