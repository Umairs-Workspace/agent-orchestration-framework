# 157/02 · Every consumer accounts for the episodic pool — example map

## R1 · Status counts every episodic record once, under the episodic layer
- E1 · A store of 2 lessons, 3 findings, 2 feedback and 3 runs: layers procedural 2, episodic 8, semantic 0; type counts sum to recordCount 10 [proposed]
- E2 · The same store on local and on graphify: identical types and layers; graphify's legacy lessons/adrs pair still reads 2 and 0 [proposed]

## R2 · A recall returns an item's whole episodic history when asked
- E3 · `recall "" --item 39 --area delivery --all --json` over 12 delivery records returns all 12 [proposed]
- E4 · The same recall without `--all` returns 5 [proposed]
- E5 · A failed run's block line carries its failureReason `cap-exhausted`, and the source stays the last field [proposed]

## R3 · Indexing episodes changes no lesson-only consumer
- E6 · Tune's lesson population over a stream with 3 findings ingested equals its population with none [proposed]
- E7 · A lesson block line is byte-identical before and after the change [proposed]

## Questions
- Q1 · technical · defaulted ADR-003 · Does `--all` override `--limit` on recall, or only lift the default?

<!-- No business question remains: ADR-003 decides the counters, the block line and `--all`.
     Examples stay proposed. -->
