# 01 · The ranking is held by an eval — Outcome

## Delivered

### Retrieval eval over the live corpus
FF-14801 (`test/arch/memory/acd-memory-retrieval-eval.test.mjs`) builds the records in memory from the real `wiki/work` and holds 25 cited `(query, scope, <item>/<id>)` pairs within the first five of `rankRecords`, the five lines an agent's `--block` shows. A red names every lost pair with its query, scope and the rank it was found at, and a record that no longer exists reds as `gone`.

- **The eval guards the base ranking only** — the graph re-rank reads a git-ignored artifact that a clean checkout does not have (ADR-005), so a re-rank change does not show here.

## Gaps

### The graph re-rank term
- **Status:** open-by-decision
- **Discharge condition:** the graph artifact is available in a clean checkout, or the re-rank is computed from tracked sources, so an eval can run it.
The re-rank that graphify applies after `rankRecords` is outside every eval pair, so a change to it shows as a quieter recall, not as a red test.

### Pairs near the pass line
- **Status:** open
- **Discharge condition:** the table holds pairs whose record ranked third to fifth when the recall ran, alongside the gist pairs.
19 of the 25 pairs are gist queries that rank their record first by a wide margin. Only the six recorded-query pairs sit near the line, so a small ranking shift moves few pairs.
