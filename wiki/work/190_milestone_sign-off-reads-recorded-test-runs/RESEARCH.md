---
doc: research
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — Research

Measured at refine, 2026-11-09, on the MacBook (darwin x64), against `HEAD` 4ff7fba6 with this
branch's uncommitted work in the tree, and a code graph built at this refine
(`aof graph build .`, 2026-11-09T23:01:03Z, 21,327 nodes, 2:41 wall).

## Q1 · How often does `aof test --scope impacted --story` actually narrow?

**Never, on the recent record.** A replay of `packages/work/src/testing/select.mjs`'s rule over
every story in milestones 160–180 that declares `files:` (76 stories). Each declared set went
through `aof graph impact`. A file whose first `git add` falls on or after the story's `created:`
date stands in for "absent from the graph when the story was built". The script is
`widen-census.mjs`, kept in the session scratchpad. It reimplements the predicate as
`*.test.mjs` under `test/`, exactly as `work.test.roots: ["test"]` declares it.

| what | stories |
|---|---|
| widen to the whole suite | **76 of 76** |
| declare a file the story created (`not-in-graph`) | 58 |
| declare a document or data file (`not-in-graph`) | 38 |
| declare a present file with no `test/` suite among its direct importers (`no-registered-dependent`) | 65 |
| … of which the file is covered only by a package-owned suite | 41 |
| would widen for no reason other than a created file | 7 |

Had nothing widened, the median story would have selected **8** suites, the 75th percentile 14,
and the largest 265, of 1,096 timed suite files. Those numbers are a floor, because the graph's
`dependents` are direct importers only (Q2).

## Q2 · Does the graph's `dependents` list follow imports transitively?

**No, direct importers only.** `aof graph impact packages/work/src/regression-record.mjs` lists
`packages/work/src/commands/item-status.mjs` as a dependent, but none of the suites that exercise
`item-status`. `packages/knowledge/src/graphify-code-relations.mjs` returns
`{ file, present, dependencies, dependents }` from one edge pass. While every run widens, this is
invisible. Once runs narrow, it is a gap that misses suites two hops away (ADR-003 §2).

## Q3 · Where does the suite's time go, and would tiers separate it?

From `.tmp/test-timings.json` (the sharded runner's per-file timings, 2026-10-30): **17,515 s of
test time over 1,096 files**, about 4.9 h serial. The largest areas are `test/work` 2,437 s,
`test/arch` 2,170 s, `test/mesh` 2,147 s, `test/loop` 1,769 s and `test/command` 1,349 s. The
integration feature lanes are small (the largest, `lifecycle`, is 230 s). The cost is spread across
suites that spawn the CLI, in every directory, rather than sitting in a tier a directory could name.
The integration and cargo lanes, and the `*.smoke.mjs` browser suites, are reached only by a
whole-tree run: `impacted` never selects them.

## Q4 · What does a content key cost, and what must it include?

- `GIT_INDEX_FILE=<copy of the index> git add -A && git write-tree` took **0.23 s** on this repo
  with a dirty tree. Its result differs from `HEAD^{tree}`, so it sees uncommitted and untracked
  changes, and it leaves the real index untouched.
- **The work directory must be in the key.** Some suites read the live stream rather than a
  fixture: `test/work/story-plan-document.test.mjs` reads `<repo>/wiki/work`, and
  `test/bundle/core-workspace.test.mjs` reads `<repo>/wiki/work`. A record edit can therefore change
  a suite's outcome.
- **Package-owned suites run through the per-file runner.** `scripts/test-shard.mjs` imports
  whatever path it is named, so `packages/<p>/test/*.suite.mjs` is selectable once the predicate
  admits it. There are 265 such files (201 `*.suite.mjs`, 64 `*.test.mjs`) outside today's single
  root.

## Q5 · Does the accept door check that the gate ran on the code being accepted?

**No.** `packages/work/src/commands/item-status.mjs` reads the newest `REGRESSION.md` row and
refuses a missing, red, `not-finished` or partial-scope row. It does not compare the row's commit
with the item's head. That is out of 190's scope (ADR-005 §5), and recorded here so a later item can
take it up.
