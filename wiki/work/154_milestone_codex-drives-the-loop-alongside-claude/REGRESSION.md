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
| 3dec8d1e33fe95c2bda879996b7620ec02435b9b | 2026-10-08T19:05:42.279Z | all | red | workspace-boundaries/all actual owners are scanned and every owned array case is registered exactly once, yarn-installation/extracted kernels cannot import core, legacy source, providers or sibling internals · not isolated: work-ui-fleet-origin/01 a standalone `aof work ui` serves the resolved fleet origin and names it "default", work-ui-fleet-origin/01 an explicit fleet-origin configuration overrides the default verbatim (all eight rows), work-ui-fleet-origin/01 a standalone board neither starts nor waits for a fleet, and --json still answers its HEAD envelope without binding a port, work-ui-fleet-origin/01 the standalone default is the FLEET's documented default and none of the four other numbers in the port map, task04/38-06 (F-38.06d) while the worker is STREAMING live PTY bytes, the card resolves THAT stream's (nodeId, sessionId) from the REAL read shape, task04/38-06 (F-38.06e) when the worker's session ENDS, an open terminal-view stops reading `streaming` — a dead stream never keeps a live pulse, 53/00 task03 — a parent that finished over a still-writing subagent is never quiet: it settles only after the WHOLE tree stops moving · sharded --jobs 16 · 20.6 min · over budget (15 min) |
