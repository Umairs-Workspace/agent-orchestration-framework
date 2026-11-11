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
| 3aae0b5c791de1d7324ddc805c62688858e37619 | 2026-10-30T17:10:03.177Z | override | override | Environment: this MacBook cannot host a whole-tree run. Its live control daemon (aof mesh serve --serve, pid 77647) holds :4182, which global-work-propagation binds, and the deploy rules forbid the full suite here while it does (m175's override, same condition). 179's scoped lane at 3aae0b5c is green apart from the reds recorded before 179: 1641/1641 across the ten indexes it touched, 159/160 on its five other suites (the one red is work-memory/00 --json, 178/F-02's tmpdir-realpath red), and yarn-installation's three realpath reds (m175, red at e2eba906). FF-17901..17904 are green with red probes. |
