---
type: milestone
number: 190
slug: sign-off-reads-recorded-test-runs
title: "A tree is tested once per change, and every sign-off door reads that run's record instead of running it again"
status: in-progress
owner: product-owner
created: 2026-11-09
updated: 2026-11-10
schema: 1
aofVersion: 0.1.0
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again

## Objective

**A story is signed off on about two scoped test runs, and a milestone on one whole-tree run.** Today
one story with a single fix round runs the suite roughly 7–10 times, and most of those runs cover the
whole tree:

- each build round runs it (`aof:continue` build terminator);
- the architect, QA and craft review lanes each run it again, at the same time, on the same diff. The
  skill text itself measures the test runner at 54–59% of a review lane's wall time;
- a fix round runs it again for the rebuild and again for each re-review;
- `aof:verify` runs it again for the story;
- the milestone regression gate runs the whole tree. A `not-finished` row re-runs all of it, not just
  the units that didn't finish. A UAT session then sweeps the accepted milestones again.

Most of those runs are on a tree that hasn't changed since the last green run, so they tell us nothing
new. And `--scope impacted` rarely narrows anything. Any changed file the code graph hasn't seen
(`not-in-graph`) widens the run to every suite. A story almost always adds a test file, and the graph
is read, never rebuilt (`packages/work/src/testing/select.mjs`), so almost every story hits this.

AOF is right to refuse a claim as evidence that a run happened (`aof:verify`: "reporting the gate as
passed is not a form of evidence"). This milestone keeps that rule. The difference is that the
evidence is a **record the command writes**, keyed to the tree it ran on. Each door reads that record,
rather than running the suite again to produce new evidence.

An outsider can verify it:

- One story built and accepted end to end leaves a run log with **no two runs of the same scope and
  tier on the same tree hash**, unless a run was deliberately repeated to hunt a flake and is labelled
  that way.
- A story that only adds a new test file and edits one source file runs an impacted set, not the
  whole tree.
- A milestone closes on a single whole-tree run.

## Scope

In scope:
- **Every `aof test` run writes a record**, made by the command and never by the agent. It holds the
  tree hash (including uncommitted changes), the scope, the tiers that ran, the result, and what
  widened and why. This generalises the `REGRESSION.md` row to every run.
- **The doors read the record instead of re-running.** The review lanes, `aof:verify` (story) and the
  accept door ask for a green record that matches the current tree hash at the scope and tier they
  need. They run the suite only when the tree has changed since that record. Reviewers judge the diff.
  They don't re-run the tests.
- ~~**The suite is split into tiers, and each door gates on the tiers it needs.**~~ Decided against
  at refine (ARCHITECTURE ADR-004, pending the operator's confirmation). The end-to-end lanes are
  already reached only by whole-tree runs, and the rest of the cost sits in no directory a tier
  could name (RESEARCH Q3). Once `impacted` narrows, the end-to-end tier is the milestone gate.
- **New files stop widening the run to the whole tree.** A new test file is a suite in its own right,
  so it is added to the run. A new source file can only be reached through an edited existing file,
  which is already in the changed set. Either the graph is updated cheaply for the changed files, or
  these cases add the file instead of widening. Widening to everything stays for genuine unknowns: no
  graph, or an unreadable one. The one-directional rule of 72/ADR-002 still holds: what the graph
  doesn't know never narrows the run.
- **The milestone gate resumes instead of restarting.** A `not-finished` row re-runs only its
  unfinished units, which the sharded runner can already do. A UAT regression sweep reuses gate rows
  whose commit is unchanged instead of sweeping again.
- **The skills and agent briefs say this.** The `aof:continue`, `aof:verify`, `aof:review` and UAT
  texts, and the developer, QA and architect briefs, are changed to read records. Today they instruct
  each party to run the suite.
- **A project already on aof learns what its test declaration leaves out, and can declare it.**
  Added at verify (operator, 2026-11-10). Every key above defaults to the old behaviour when it is
  absent, so after `aof work update` an existing project would keep widening to the whole tree and
  restarting stopped gates, and nothing would say so. `aof project doctor` names each gap with its
  repair, and `/aof:map-tests` declares the project's layout and proves it with a before-and-after
  replay of recent commits. Measured: this repo's own pre-190 declaration left 265 package-owned
  suites unselectable.

Out of scope:
- **Making the suite itself faster.** That was milestone 160 (sharding, the time budget,
  `not-finished`). This milestone cuts how many runs happen, not how long one run takes.
- **Dropping the whole-tree gate at milestone close.** 63/R7 still holds: a story-scoped green never
  accepts a milestone. Open question for refine: should a green whole-tree CI run on the PR head
  (160's re-aim) count as the gate record, so the local run becomes the fallback?
- **Detecting flakes by re-running.** A deliberate repeat stays possible and is labelled as one. It
  is not what a door uses to sign off.

## Stories

- [x] `00_story_a-repeat-run-is-answered-from-its-record` — every `aof test` run is recorded against its content, and a repeat is answered from the record (ADR-001, ADR-002)
- [x] `01_story_impacted-narrows-on-what-it-knows` — `--scope impacted` narrows on package suites, transitive dependents, placed new files and declared couplings (ADR-003)
- [x] `02_story_a-gate-that-did-not-finish-resumes` — a `not-finished` gate resumes on the same content, and a finished gate run is a test record (ADR-005)
- [x] `03_story_the-doors-stop-prescribing-repeat-runs` — the commands' prose asks once per door, sweeps a UAT once, and resumes a stopped gate (ADR-006)
- [x] `04_story_an-existing-project-declares-its-test-layout` — `aof project doctor` names what a project's test declaration leaves out, `aof test --plan` replays a commit's selection, and `/aof:map-tests` declares the layout and proves it (ADR-008)

## Dependencies

- `72_milestone_inner-loop` (done) — `aof test --scope impacted` and its widening rule (ADR-002),
  which this milestone narrows for new files without breaking its one-directional guarantee.
- `96_milestone_the-declaration-earns-its-keep` (done) — the regression gate as a refusal at the
  accept door (ADR-008), whose recorded row this milestone generalises.
- `160_milestone_the-whole-tree-suite-runs-in-minutes` (done) — the sharded runner, `not-finished`
  units and the PR CI run that resuming and reusing gate records build on.
