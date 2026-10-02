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
| 9b7bd0cfdf308445e16fc1ac5c474d7e933b08f2 | 2026-10-02T23:48:44.044Z | override | override | The whole tree ran from a clean detached worktree at 0d0b8ea9 through scripts/test-sharded.mjs: 11,604 of 11,604 registered cases, plus the integration and cargo lanes, wall 60 min on 16 workers under another session's load. The serial aof test --scope all cannot finish inside its 2 h bound on this machine (131's three no-verdict rows). 8 units were red, and none is in a file 134 changed: FF-11903 x2, 119/00 task02 x2, FF-5204 and this-tree-holds-what-is-live 00/02 are 142's squash, red on main (F-134-03); 63/03 task04 reads the gate's exported CLAUDE_CONFIG_DIR; fleet-terminal-view, 53/00 task03 and 131/01 loop-diag re-ran alone green (126 cases, 0 failures). 13 load flakes are logged as F-134-04. Changes after 0d0b8ea9 are records plus the beat prose fix 5c0685e6, whose 708-case reader sweep is green. |
