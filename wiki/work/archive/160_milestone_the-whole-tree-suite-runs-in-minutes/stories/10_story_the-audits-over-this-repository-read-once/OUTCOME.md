# 160/10 · The audits over this repository read once — Outcome

## Delivered

### The source scanner is linear
`stripComments` and `blankStringLiterals` decide regex-or-division from the token before the slash, never by re-scanning the prefix; their output over every `.mjs` under `test/`, `packages/` and `scripts/` is byte-identical to the previous scanner's, and blanking the test tree takes 977 ms (10,116 ms before).

### The tune corpus lists the stream once
`assembleCorpus` lists the stream once per assembly and hands each item's row to the snapshot read, so one assembly over this repository takes 0.7 s (12.6 s before) and produces a byte-identical corpus.

### Memory ingest lists the stream as often for one item as for many
`aof work memory ingest` hands each milestone's listing row to the snapshot read, so its episodic indexing no longer lists the stream once per milestone (a fixture of 12 milestones is listed as often as one of 1; before, 14 times against 3).
