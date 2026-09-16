---
type: story
number: 01
slug: the-selection
title: "The selection — changed files to suite files through the graph, where an unknown widens and never narrows"
parent: 72
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-004, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-008, src/graph-normalize.mjs, src/work-audit/census.mjs, src/work-audit/spawn.mjs, test/arch/acd-command-layer-imports-downward.test.mjs, test/graph-impact.test.mjs, test/support/source-slice.mjs]
files: [src/work-test-select.mjs, src/work-test-changed.mjs, src/graph-impact.mjs, src/commands/graph-impact.mjs, test/arch/acd-codebase-grounding-no-parse.test.mjs, test/arch/acd-codebase-grounding-via-commands.test.mjs, test/work-test-select.test.mjs, test/arch/acd-test-selection-widens-never-narrows.test.mjs, test/arch/acd-suite-registration-single-decider.test.mjs, scripts/test.mjs]
---
# 01 · The selection

## User story

As an agent about to verify a three-line change,
I want to be told which suite files that change can actually break, and to be told plainly when the
answer is not known,
so that I run a subset when the subset is trustworthy and the whole suite when it is not — never a
subset that merely looks like an answer.

**The milestone's one open question is decided here: the graph, not a changed-files heuristic**
(`ARCHITECTURE.md#ADR-002`). The graph already covers 1,031 `test/` files, so
`dependents(changed file) ∩ suite files` is the affected-test set and it is available today. This
module reads `graphify-out/graph.json` through the SAME `normalizeGraph` + `computeImpact` that the
shipped `graph:impact` uses — it authors no second graph reader, and **it never invokes a build.** A
build is minutes even on the `unchanged: true` path (1,577 files re-extracted at 22 workers, measured
at this milestone's decision point), and an inner-loop tool that might cost minutes before it costs
seconds is not one.

**The invariant this story exists to hold: an UNKNOWN WIDENS.** A changed file the graph reports
`present: false` — a new file, a rename, a coverage gap — has UNKNOWN coupling, and recording that as
"no affected tests" is exactly the mistake the grounding protocol names. So every unknown widens the
selection to `all`, and the widening is NAMED in the result (`widened: [{ file, reason }]`). Four
reasons, exhaustively: no graph artifact, a changed file absent from the graph, a changed file whose
dependents include no registered suite, and an unreadable artifact. **No flag suppresses a widening** —
a switch that lets an agent silence this is the defect, not the fix. Correct-but-slow, never
wrong-and-fast.

Every result carries the artifact's `builtAt`, taken from the artifact rather than a call-time clock.
A silently stale graph is the failure this step exists to prevent, and the only defence that survives
contact is making the age visible in the answer.

**A selected file that is not REGISTERED is reported, not silently run.** Green on an unregistered
suite says nothing about CI — that is `59/FF-5903`'s entire finding, at the cost of twenty-six suites.
The decider is `registrationDecision()` in `src/work-audit/census.mjs` and this story reaches it by
IMPORT. It authors no second answer: no regex over a suite import line, no spread matcher, no second
baseline of unregistered suites (FF-7203).

The changed set is the WORKING TREE by default (index + working tree), with `--since <rev>` widening
the base explicitly. No default-branch inference — a worktree on a story branch has no reliable
answer, and a wrong base silently narrows, which the invariant above forbids.

This story is a pure function and ships no command. `aof test` is 72/02's.

## Tasks

- [x] `tasks/00_an-unknown-widens-the-selection.feature` — known coupling narrows and every unknown widens to `all` and is named; the selector never builds, no option suppresses a widening, every result carries the artifact's `builtAt`, and selection is pure
- [x] `tasks/01_an-unregistered-suite-is-reported-not-silently-run.feature` — a selected suite the runner does not assemble is reported as unregistered, in the census's own verdict, reached by import with no second derivation

## Notes

- Selection is PURE: the same changed set against two planted graphs must yield two different answers
  in one process. Nothing is cached across calls.
- Two controls land here and were deliberately NOT merged (`ARCHITECTURE.md` `## Fitness functions`):
  they fail for different reasons and their red probes mutate different things, so one file would make
  one probe's red indistinguishable from the other's.
- `09/ADR-004` is not crossed. Selection is not a verdict — the `gate: false` claim and the
  no-door-consumes-it census belong to 72/02's FF-7204, because neither is evaluable until the command
  composes this module.
- **`computeImpact` MOVES DOWN to `src/graph-impact.mjs`, and this story is why.** As first specified,
  importing it from `src/commands/graph-impact.mjs` reds **three shipped, currently-green CI controls**:
  the layer gate (`test/arch/acd-command-layer-imports-downward.test.mjs:63-80` forbids any `src/*.mjs`
  importing `./commands/*`, and its sanctioned `await import()` escape is shut by FF-7204), plus both
  frozen graph-reader allowlists. The remedy is the one the layer gate's own failure message prescribes.
  The command **re-exports** it so behaviour is preserved; measured blast radius is two importers. Add
  the new home and this module to both allowlists. Do not carry `matchFile`
  (`src/commands/graph-impact.mjs:47-48`) through — it is declared and never used.
- **`suites` is a PATH PREDICATE — a suite file under a declared test root — never the census's
  registered set.** The registered reading would call `assembledSuite()` (a child importing 948 test
  modules, **3.5 s measured**) and, when that child fails, answer
  `audit-runtime-membership-unavailable` — which is **not one of the four widening reasons**, so "no
  affected suites" and "I could not find out" would render identically. That is the lie this story
  exists to prevent, in this story's own vocabulary. Consequence: **`roots` is a parameter, never a
  config read**, or this module reds FF-7201's one-reader census from a parallel lane.
- **`assembled` and `suiteNames` are INJECTED; this module produces neither.** `registrationDecision`
  needs a `Map<file, exported test names>` whose only shipped producer is `await import()` of every
  suite file — forbidden here by ADR-001 §4 and FF-7204. Provenance is 72/02's. FF-7203's reuse claim
  is therefore "imports the decider and calls it with what it was given". The decider's classification
  input is `importedBy`, from **`runnerImportedSuites`** (`src/work-audit/census.mjs:348-355`).
- **Presence outranks the union.** A changed file that IS a suite but is `present: false` — a test file
  created this turn — widens; union-first alone would select it silently, and an implementation that
  checks the suite predicate before the presence check passes every other row.
- **This story authors a bounded git changed-set reader from scratch.** No reusable surface exists in
  `src/` (`src/build-info.mjs:53,60` uses `execFileSync`, `src/commands/ratchet.mjs` is
  upward-unimportable, `src/mesh-worktree.mjs` has its own `exec`), so `status --porcelain` +
  `diff --name-only` + `rev-parse --verify` go through `runBounded`, with untracked/rename handling and
  a real two-commit git fixture. FF-7202's no-spawn clause is a **text census over this story's own
  files**, never a closure walk — the decider's own closure reaches `node:child_process`.
- Measured ceiling, accepted: `computeImpact` is O(paths × (nodes + edges)) — ~80 ms for one changed
  file, ~400 ms for fifty, on the live 17 MB artifact. The obvious fix (hoist the edge walk, cache the
  normalised graph) is what the purity clause forbids.
