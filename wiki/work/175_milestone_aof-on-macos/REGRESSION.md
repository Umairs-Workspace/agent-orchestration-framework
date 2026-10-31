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
| c81c3b89a096fe602c7701911b3c08e8d9f7da3d | 2026-10-30T15:51:26.429Z | override | override | Environment: this MacBook cannot host a whole-tree run. The deploy rules forbid the full suite here while the live control daemon holds :4182 (global-work-propagation binds it), and the tree is red on this Mac's /var vs /private/var realpath baseline (178's gate row at 30b763b4, every red also red at its parent). 175's own suites are green apart from the three yarn-installation realpath cases, which fail identically at e2eba906, before 175. The operator's acceptance bar is this laptop working as its own control node, measured live (VERIFICATION, Accept decision). |
