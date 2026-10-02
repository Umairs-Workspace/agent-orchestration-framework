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
| 7280a2dbd80276e8c86badfe3f2375acdca724b4 | 2026-10-02T12:01:39.502Z | override | override | The whole-tree gate already ran from a clean detached worktree at 5035a225 through scripts/test-sharded.mjs: all 11,539 registered cases, plus the workspace suites, cargo, UI build, supply-chain audit and the Windows distribution gate (recorded in plans/09-REVIEW.md, Final gate 5035a225). The only red was the record-doc finding this AOF.md import resolves. The serial aof test --scope all run would repeat the same cases over about 1.75 h. |
