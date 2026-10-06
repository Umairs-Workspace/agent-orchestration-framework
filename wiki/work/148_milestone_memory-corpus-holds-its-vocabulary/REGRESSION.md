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
| c73e7ed144853df9f9647bf51cb389db4bd6a45f | 2026-10-06T09:35:04.372Z | all | red | workspace-tests/Plan 09 ownership ledger parses and matches current files and registered case names, work/archive-is-a-move: 00 the verb is registered with its own flags, and every hand-kept ledger learned it consciously, arch/119 FF-11902: NO control retypes a member census — a derived set is never asserted equal to a string-array literal; a home is named AMONG the set, under a floor and a declared ceiling, work/this-tree-holds-what-is-live: 02 the root of wiki/work holds only live items, the archive holds only done drivers, list --all carries every archived row last with archived: true, and 42_structural-overhaul is not an item, work/this-tree-holds-what-is-live: 02 the test/work/stream budget row's ceiling is 35 with a why naming 127/05 and this file, and the lane index imports and spreads this suite, arch/119 FF-11903: the citation sweep is bounded by a shrink-only ceiling pinned to a measured count, arch/124/00 FF-12401 (task 03): the census over this stream closes against the edge set `validateWork` resolves, and is not vacuous, arch/130 FF-13002 (acd-loop-stop-settles-the-run): structural — every drive binding reaches settleDriven( before any return in its enclosing function, and there are exactly three drive sites, arch/58 FF-5810: every path a shipped loop record cites exists and is in range, and every cited defining line is the symbol's own export, grade/01 the shipped loop behaves as it did, and the evidence is the suites themselves — registered, and naming the grade nowhere, arch/55 FF-5508 extension (acd-loop-level-l3-gated): the command gathers both halves through registered commands before any drive, arch/119 FF-11908: every registry entry in src/command-core.mjs is ONE line and that line is a citation · not isolated: fleet-boards-branch-deleted/01 the orphaned wire types leave cleanly — `yarn ui:build` is green and the surface still mounts (01 scenario 6), 53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch, so the outcome does not settle on the original clock · sharded · 24.1 min · over budget (15 min) |
