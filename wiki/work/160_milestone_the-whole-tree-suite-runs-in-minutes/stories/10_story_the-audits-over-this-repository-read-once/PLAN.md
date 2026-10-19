# 160/10 · The audits over this repository do their reading once — build plan

## Mechanism

**The scanner.** Both scanners call `startsRegex(out)` with the whole output so far. Change the
call to `startsRegex(out, out.length)`. Inside, walk back from the index over whitespace to the
last significant character. If it is a preceder, the slash opens a regex. If it ends an
identifier, walk back over the whole identifier and test it against the keyword set. Do not cap
the walk at a window: 160/10's trial used 64 characters, and a longer identifier ending in `in`
would be misread. Nothing else changes. Keep the previous function in FF-16011's control, which
lives in `acd-comment-stripper-order`, the stripper's own suite, as the oracle for the whole-tree
equality leg.

**The corpus.** `assembleCorpus` already lists the stream once (`allItems`). The per-item snapshot
read (`readLatestSnapshot`) re-resolves the ref, and that resolution lists the stream again. Let
`readLatestSnapshot` accept the resolved item, or its folder, as well as a ref, and have the corpus
pass the row it already holds. The ref path keeps its own listing and its refusal. Look for the
same per-item listing in the corpus's other lanes while you are there (`readRuns`,
`readAccountingSources`). Count the listings through the discovery seam the corpus declares its
reads in: FF-16012 sits in `acd-tune-corpus-declares-its-reads`, which already records what the
corpus reads.

## Verification step

Run the bench from refine again: strip and blank every test file, time each, and compare the output
with the old scanner's, which should be identical. Then run `acd-control-derives-its-census`,
`acd-source-directory-budget`, `acd-candidate-formation-is-lossless` and
`acd-tune-is-non-vacuous-over-this-repo` through the shard entry before and after. Time
`assembleCorpus` over this repository in-process before and after, and deep-compare the two
corpora. The refine figures were 7,424 → 764 ms blanking, 953 → 407 ms stripping and a 24.7 s
corpus.

## Out of scope

- The other uses of `/\s+$/` in production (`regression-record.mjs`, `import/recovery.mjs`). They
  run on short strings; change one only if a profile names it.
- Caching the corpus across processes.
