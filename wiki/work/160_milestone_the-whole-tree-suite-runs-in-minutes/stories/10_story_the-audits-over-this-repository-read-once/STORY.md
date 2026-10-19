---
type: story
number: 10
slug: the-audits-over-this-repository-read-once
title: "The audits over this repository do their reading once — a linear source scanner, and a tune corpus that lists the stream once"
parent: 160
status: done
owner: product-owner
created: 2026-10-15
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-011-the-audits-over-this-repository-do-their-reading-once, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-007-citation-history-is-read-only-when-a-citation-misses-on-disk, packages/work/src/discovery.mjs, packages/core/src/application/bindings/work/observe.mjs, packages/core/src/application/bindings/work-tune/corpus.mjs, test/arch/audit/acd-control-derives-its-census.test.mjs, test/arch/audit/acd-observe-snapshots-append-only.test.mjs, test/arch/audit/acd-observe-attribution-by-join.test.mjs, test/arch/planning/acd-candidate-formation-is-lossless.test.mjs, test/arch/planning/acd-tune-is-non-vacuous-over-this-repo.test.mjs, packages/work/test/tune.test.mjs, packages/work/test/work-observe-snapshots.suite.mjs, test/run/run-spend-ingest.test.mjs]
files: [test/support/source-slice.mjs, test/arch/audit/acd-comment-stripper-order.test.mjs, packages/work/src/tune/corpus.mjs, packages/work/src/observe.mjs, test/arch/planning/acd-tune-corpus-declares-its-reads.test.mjs, test/planning/tune-corpus.test.mjs]
---
# 10 · The audits over this repository do their reading once

## User story

As the operator waiting on the whole-tree gate, and as anyone running `aof work tune`,
I want the source scanner and the tune corpus to do their work in one pass,
so that the arch audits stop spending minutes on a quadratic regex and the corpus stops re-listing the whole stream for every item.

## Tasks

- [x] `tasks/00_the-source-scanner-is-linear.feature`: `startsRegex` looks back a bounded distance, and both scanners' output is byte-identical over the whole test tree (FF-16011).
- [x] `tasks/01_the-tune-corpus-lists-the-stream-once.feature`: one listing per corpus, a snapshot read that takes a resolved folder, unchanged output (FF-16012); the measured cuts.

## Notes

ADR-011 is the decision. Both causes were found by profile at refine.

- `acd-control-derives-its-census` spent 110 s of 140 s in `/\s+$/u`, inside `startsRegex`
  (`test/support/source-slice.mjs`), which receives the whole stripped-so-far prefix at every `/`.
  Over the whole test tree, blanking took 7,424 ms and stripping 953 ms; with a bounded look-back
  (a trial copy in scratch) they took 764 ms and 407 ms, with identical output. One file,
  `acd-source-directory-budget`, went from 1,427 ms to 10 ms. 190 suites import the module.
- `assembleCorpus` over this repository took 24.7 s, 18 s of it idle `readdir`, with no spawns.
  `corpus.mjs` calls `readLatestSnapshot` per item, and `resolveMilestoneFolder` lists the stream
  for each call (`packages/work/src/observe.mjs:1338`).

The trial look-back kept the last 64 characters for the keyword test. An identifier longer than that
would be misread, so the real one walks back over the whole trailing identifier.

Discovery: not applicable (EXAMPLES.md).
