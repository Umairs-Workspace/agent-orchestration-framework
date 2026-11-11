# 01 · A loop answer anchors the example — Outcome

## Delivered

### An answer given through the loop is a person's answer to its map token
`collectAnswers` reads the `asks` entries of a story's and its parent's runs, in any state, beside the harness transcript: an answered entry whose question opens with exactly one map token yields a record with that token, the answer verbatim, the run's session, `answeredAt` and the entry's `by`, so the doctor lane and the build door accept a `stated` or `confirmed` example anchored by it.

### An ask that cannot name its one token anchors none
An entry with no token at its head, a second token on a later line, or no answer yet yields no record.

## Assumptions

- **The run's owner writes the answer before it re-drives** — the resumed session's own doctor run reads it while the run is still `running` (131/ADR-003 §6).
- **Every channel 131 records counts** — terminal, board and an allowlisted Discord reply alike; the reader filters on no `via` (136/01 Q1).

## Gaps

### A mesh worker's answer
- **Status:** open
- **Discharge condition:** the worker records its answer under the question it posted, so the entry opens with its token.
A worker records its answer on its own run with `question: null`, so an answer given to a worker-driven refine anchors no example (136/VERIFICATION F-136-03).
