---
type: story
number: 02
slug: layer-separation-and-the-gate
title: "Layer separation, arbitration and the gate — the timescale check finally decides something, and the structural codes become errors"
parent: 58
status: done
owner: product-owner
created: 2026-08-28
updated: 2026-08-29
depends: [58/01]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-001, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-002, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-003, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-005, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q2, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q3, wiki/work/52_milestone_loop-registry-and-graph/ARCHITECTURE.md#ADR-006, wiki/work/57_milestone_paired-loops/ARCHITECTURE.md#ADR-003, src/work-loops-checks.mjs, src/work-loops.mjs, src/commands/loops-validate.mjs, src/bundle/commands/validate.md]
files: [src/work-loops-checks.mjs, test/arch/acd-arbiter-records-the-tradeoff.test.mjs, test/arch/acd-loop-timescale-comparability.test.mjs, test/arch/acd-loop-finding-envelope.test.mjs, test/arch/acd-loop-checks-pure.test.mjs, test/arch/acd-loop-suite-registration.test.mjs, test/work-loops-checks.test.mjs, test/work-loops-registry-census.test.mjs, test/work-loops-commands.test.mjs, test/watcher-independence-gate.test.mjs, test/support/l3-gate-fixture.mjs, scripts/test.mjs]
---
# 02 · Layer separation, arbitration and the gate

## User story

As the operator of a work stream whose loops now declare who supervises whom,
I want the timescale check to decide something over the loops this system actually runs, arbitration
to clear only on a node entitled to arbitrate, and the structural findings to stop the run instead of
scrolling past,
so that a supervisor too fast to supervise, a hierarchy that skips a layer, and a conflict nobody owns
are refusals I have to answer rather than warnings I can keep not reading.

Milestone 52 built the checks and left them reporting. The timescale check has reported **nothing**
since the day it shipped — not because the graph is clean, but because it can only compare two clocks
and six of the seven loops have no clock at all (`RESEARCH §Q2`). The arbitration check clears on any
non-contending node that happens to veto every contender, which a loop could do while being party to
the very trade-off it is deciding. And every finding here is a warning, from one hardcoded constant.

This story makes the checks decide on the axis the records now carry, and turns the structural
subset into errors — after, and only after, 58/01 has landed the records that clear them.

## Tasks

- [x] `tasks/00_a-supervisor-runs-at-a-slower-layer.feature` — the timescale check decides on the declared layer where the clocks cannot decide, keeps the ratio rule where both ends have one, and reports incomparability only when neither axis can answer
- [x] `tasks/01_one-boundary-per-edge.feature` — a supervising edge crosses exactly one layer boundary; reaching two layers down and target-setting a peer inside one layer are each reported as what they are
- [x] `tasks/02_only-an-arbiter-arbitrates.feature` — a shared actuator clears only on a node whose kind is arbiter and whose priority order accounts for exactly the contenders it vetoes
- [x] `tasks/03_an-inadmissible-owner-is-refused.feature` — a target-setting edge from a node that is not a slower loop, an actor, or an anchor on a frozen rule is reported rather than accepted as ownership
- [x] `tasks/04_the-structural-codes-stop-the-run.feature` — severity is a property of the code, the promoted set is exactly the milestone's own, everything inherited keeps the severity it has, and the exit decision lives only on the face
- [x] `tasks/05_an-arbiter-is-a-node-the-checks-can-see.feature` — the traversal considers an arbiter, so the four lanes that depend on that membership can reach one at all

## Notes

- **The layer axis is additive over the cadence axis, and that is the compatibility claim.** ADR-002:
  with no `layer:` declared anywhere, this check's output over the whole cadence cross-product must be
  **identical** to what 52 shipped — including the ratio-3 boundary. `FF-5802` extends 52's own
  comparability guard rather than adding a sibling beside it, so the old behaviour and the new one are
  asserted by one authority.
- **The separation ratio stays 3 and stays a frozen literal.** Not a config key: a project that could
  lower it to 1 could declare a supervisor that runs as fast as what it supervises, which is the
  failure this milestone exists to prevent. It is exported so the arch-test can read the number rather
  than restate it.
- **The checks stay a pure leaf.** `src/work-loops-checks.mjs` imports **nothing** and must keep
  importing nothing — no filesystem, no clock, no dynamic import (52/ADR-007, extended by `FF-5804`).
  Every rank this story compares was computed by the loader and arrived on the parsed fields.
- **Nothing may derive a duration from an event trigger.** A `per-phase` trigger has no length, and
  inventing one to compare against a 15-second period is the fabricated conversion ADR-002 refuses.
  Where the two axes cannot both answer, the finding is *not comparable* — an honest absence, at `warn`.
- **The gate is severity-by-code plus the face's exit, exactly as 57/ADR-003 built it.**
  `src/work.mjs` is not edited, no seventh doctor lane is created, and `run()` returns an identical
  result whether or not anyone is gating on it. A gate that produces a wall of unrelated new red is a
  gate that gets switched off, so the promoted set is this milestone's own subject codes and nothing
  inherited moves.
- **This story lands last, and the ordering is the point.** ADR-007 §5: promoting before 58/01's
  records land delivers fifteen error-severity findings through `aof:validate`'s hard loop lane for
  work that is merely unfinished. 57 hit this exactly and 58 names it in advance.
- **`src/work-loops-checks.mjs` has 2 production dependents** — `commands/loops-validate` and
  `commands/loops-groundedness` (`aof graph impact`, 2026-08-28). The blast radius of the most
  behaviour-changing story in the milestone is two files.
