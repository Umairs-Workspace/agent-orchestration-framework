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
| 3bd522d3a5d5070e611a2f0096d88dbba1aa6153 | 2026-09-27T19:07:49.663Z | all | red | arch/124/00 FF-12401 (task 03): the census over this stream closes against the edge set `validateWork` resolves, and is not vacuous, claude-settings/03 every pre-existing key survives the merge byte-identical, autonomous-shell-out/black-box: b01-b04 and h01-h03 prove source-local human drive, halt, accepted milestone and inert JSON probe, work/this-tree-holds-what-is-live: 00 the repository's config carries the intake key between work.dir and work.agents, and the diff that added it is exactly one line, work/this-tree-holds-what-is-live: 02 validate over the whole tree, archive included, holds the ratchet — no finding names an archived path that the move broke, no finding of any class the move could produce |
| 5c3786df296f7d1c305f74aa1be7cce447ad5954 | 2026-09-27T20:10:41.342Z | all | green | — |
