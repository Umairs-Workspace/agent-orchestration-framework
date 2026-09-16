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
| 4e814e2075c6a0f3eaef9eede66d45a0a7b10db5 | 2026-09-16T19:13:23.768Z | override | override | historical: the structural overhaul completed 2026-07-31 (STATE.md, eleventh pass) and shipped through m43+; its folder sat outside the item grammar (42_structural-overhaul) so it was never accepted through the verb and 127/05's archive sweep skipped it. The whole-tree run at its close is not reproducible on today's tree; accepted on its own records. |
