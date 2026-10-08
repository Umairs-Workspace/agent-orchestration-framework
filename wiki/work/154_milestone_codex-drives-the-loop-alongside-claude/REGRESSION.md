<!-- The regression gate's evidence (96/ADR-008). Appended by the gate command; never hand-written. -->
# Regression gate

## Gate runs

One row per gate run, appended by `aof work regression-gate <ref>`. A rerun APPENDS: the newest row is the one
the accept door reads, and the earlier rows are the milestone's history. A row whose commit,
instant, scope or result is missing makes this document UNREADABLE rather than green — repair it
by hand rather than deleting the row, because a row nobody can read and a gate nobody ran are the
same fact. A `override` row is a recorded reason for accepting WITHOUT a green gate
(ADR-008 §4), never a gate result.

| commit | instant | scope | result | detail |
|---|---|---|---|---|
| 53b99b1cd81c1896fa7bfed251fb0ae9f6f27706 | 2026-10-08T15:07:46.198Z | all | red | arch/71 FF-7106: every OPEN story declaring a bundle member also declares the manifest and every git-tracked render of that member · sharded --jobs 8 · 23.9 min · over budget (15 min) |
