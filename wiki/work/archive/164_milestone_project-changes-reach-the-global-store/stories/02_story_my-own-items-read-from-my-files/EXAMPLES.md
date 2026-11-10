# 164/02 · My own items read from my files — example map

## R1 · A record this node authored answers from its file
- E1 · The store's row for 164/00 (reported by node-7297, this node) says `not-started`; my STORY.md says `in-progress`: `aof work find 164/00` shows `in-progress`, answered from disk [proposed]
- E2 · The same row and file agree on `in-progress`: shown `in-progress`, answered from disk [proposed]

## R2 · Another machine's report stands in for my untouched scaffold
- E3 · node-9549 reported 05/01 `in-review`; my STORY.md still holds the scaffold `not-started`, unchanged since I last observed it: `find 05/01` shows `in-review`, answered from the cache, reported by node-9549 [proposed]
- E4 · node-9549 reported 05/01 `in-review`; I then hand-edited my STORY.md to `done`: shows `done`, answered from disk [proposed]
- E5 · node-9549 reported 05/01 `in-review` and I have no baseline for 05/01 (a new store): shows `in-review` from the cache [proposed]

## R3 · Doctor reads the same way the stream does
- E6 · 164/00 as in E1: doctor reads status `in-progress` (`statusFrom: disk`) and raises no `cache-status-divergence` against it [proposed]
- E7 · 05/01 as in E3: doctor reads `in-review` (`statusFrom: cache`), exactly as `find` does [proposed]

## R4 · What the store alone knows is still shown
- E8 · The store holds 07/02, which this checkout has no folder for: `aof work list` shows it with no folder, answered from the cache [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-005 · Does `title` follow the same rule as `status`? Yes, the overlay is one rule for both fields.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-002 · With no baseline, does the cache answer for another node's row? Yes, a missing baseline is never a change.
