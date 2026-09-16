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
| 9289989f7861128654a31d3f06043fe4a00f0147 | 2026-09-10T10:37:52.979Z | all | red | the runner exited 1 and enumerated no failure |
| 5ee0788e0cb0408688831ededbf5f73c070b9e47 | 2026-09-10T11:34:17.047Z | all | green | — |
| e84f1a668caa9a9e18ec6a437af029f213a76113 | 2026-09-10T16:18:48.595Z | all | green | — |
