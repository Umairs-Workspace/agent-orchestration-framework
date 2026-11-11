# 177 · Retrieval replay — per-edge scores

The scorer's output for the 127 judged recalls (pooled, graded 0/1/2 by an opus judge). Method and caveats: [SPIKE.md](SPIKE.md) `## Investigation`. Per candidate, the columns are averaged per query: records shown, graded 2 (strong), graded ≥1 (relevant), graded 0 (noise), nDCG@5, and recalls with a strong record in the block out of those whose pool held one.

## All judged queries (127)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 127 | 5.00 | 1.31 | 2.98 | 2.02 | 0.55 | 74/98 |
| 1g lexical + graphify re-rank | 127 | 5.00 | 1.31 | 2.98 | 2.02 | 0.55 | 74/98 |
| 5a embeddings | 127 | 5.00 | 0.88 | 2.21 | 2.79 | 0.37 | 55/98 |
| 5b hybrid (RRF lexical+embeddings) | 127 | 5.00 | 1.25 | 2.87 | 2.13 | 0.51 | 70/98 |
| 2 lexical top-20 + haiku pick | 127 | 4.21 | 1.67 | 3.53 | 0.69 | 0.72 | 85/98 |
| 3 always-loaded index + sonnet pick | 126 | 4.62 | 1.56 | 3.41 | 1.21 | 0.62 | 84/97 |

### continue-developer (55)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 55 | 5.00 | 1.04 | 3.04 | 1.96 | 0.49 | 36/54 |
| 1g lexical + graphify re-rank | 55 | 5.00 | 1.04 | 3.04 | 1.96 | 0.49 | 36/54 |
| 5a embeddings | 55 | 5.00 | 0.58 | 2.22 | 2.78 | 0.31 | 23/54 |
| 5b hybrid (RRF lexical+embeddings) | 55 | 5.00 | 0.93 | 2.93 | 2.07 | 0.43 | 35/54 |
| 2 lexical top-20 + haiku pick | 55 | 4.05 | 1.55 | 3.45 | 0.60 | 0.66 | 46/54 |
| 3 always-loaded index + sonnet pick | 55 | 5.00 | 1.53 | 3.89 | 1.11 | 0.65 | 47/54 |

### refine-architect (18)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 18 | 5.00 | 1.56 | 3.28 | 1.72 | 0.51 | 15/18 |
| 1g lexical + graphify re-rank | 18 | 5.00 | 1.56 | 3.28 | 1.72 | 0.51 | 15/18 |
| 5a embeddings | 18 | 5.00 | 0.94 | 2.72 | 2.28 | 0.37 | 12/18 |
| 5b hybrid (RRF lexical+embeddings) | 18 | 5.00 | 1.78 | 3.78 | 1.22 | 0.56 | 15/18 |
| 2 lexical top-20 + haiku pick | 18 | 4.83 | 2.83 | 4.56 | 0.28 | 0.79 | 18/18 |
| 3 always-loaded index + sonnet pick | 18 | 5.00 | 2.33 | 4.50 | 0.50 | 0.68 | 17/18 |

### verify-finding (40)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 40 | 5.00 | 0.40 | 2.10 | 2.90 | 0.52 | 9/12 |
| 1g lexical + graphify re-rank | 40 | 5.00 | 0.40 | 2.10 | 2.90 | 0.52 | 9/12 |
| 5a embeddings | 40 | 5.00 | 0.23 | 1.20 | 3.80 | 0.30 | 6/12 |
| 5b hybrid (RRF lexical+embeddings) | 40 | 5.00 | 0.33 | 1.65 | 3.35 | 0.45 | 6/12 |
| 2 lexical top-20 + haiku pick | 40 | 3.90 | 0.45 | 2.67 | 1.23 | 0.71 | 8/12 |
| 3 always-loaded index + sonnet pick | 40 | 3.80 | 0.38 | 1.75 | 2.05 | 0.46 | 7/12 |

### refine-po (13)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 13 | 5.00 | 4.92 | 5.00 | 0.00 | 0.99 | 13/13 |
| 1g lexical + graphify re-rank | 13 | 5.00 | 4.92 | 5.00 | 0.00 | 0.99 | 13/13 |
| 5a embeddings | 13 | 5.00 | 4.08 | 4.54 | 0.46 | 0.87 | 13/13 |
| 5b hybrid (RRF lexical+embeddings) | 13 | 5.00 | 4.69 | 4.92 | 0.08 | 0.96 | 13/13 |
| 2 lexical top-20 + haiku pick | 13 | 4.92 | 4.15 | 4.92 | 0.00 | 0.88 | 12/13 |
| 3 always-loaded index + sonnet pick | 13 | 5.00 | 4.23 | 5.00 | 0.00 | 0.92 | 13/13 |

### shatter-po (1)
| candidate | queries | shown/q | strong/q | relevant/q | noise/q | nDCG@5 | strong hit (of q with any strong) |
|---|---|---|---|---|---|---|---|
| 1 lexical (today) | 1 | 5.00 | 2.00 | 4.00 | 1.00 | 0.50 | 1/1 |
| 1g lexical + graphify re-rank | 1 | 5.00 | 2.00 | 4.00 | 1.00 | 0.50 | 1/1 |
| 5a embeddings | 1 | 5.00 | 1.00 | 3.00 | 2.00 | 0.31 | 1/1 |
| 5b hybrid (RRF lexical+embeddings) | 1 | 5.00 | 2.00 | 5.00 | 0.00 | 0.67 | 1/1 |
| 2 lexical top-20 + haiku pick | 1 | 5.00 | 4.00 | 5.00 | 0.00 | 0.90 | 1/1 |

Queries where no pooled record is relevant (the correct block is empty): 2/127 — by edge {"verify-finding":2}
- 2 lexical top-20 + haiku pick returned an empty block on 1/2 of those
- 3 always-loaded index + sonnet pick returned an empty block on 1/2 of those

Ledger verdicts vs judge, on the 511 records the original recalls returned: agreement 73% — agent→judge {"relevant→relevant":195,"irrelevant→relevant":98,"irrelevant→irrelevant":178,"relevant→irrelevant":40}
- pick: 127 calls, p50 8.9 s, p95 10.7 s, mean input 38866 tokens, API-equivalent $0.0051/call
- index: 126 calls, p50 6.7 s, p95 10.1 s, mean input 61997 tokens, API-equivalent $0.1783/call
- judge: 127 calls, p50 15.9 s, p95 23.7 s, mean input 39983 tokens, API-equivalent $0.2033/call