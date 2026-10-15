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
| ba23c7d90ee50cfc6c63941de89a794474892a53 | 2026-10-15T10:42:40.225Z | all | not-finished | not finished: the gate's own 12-minute deadline expired · sharded · 12.0 min · over budget (10 min) |
| bf7832488959ffa828ccc3211970cf9dcde7c7db | 2026-10-15T17:04:27.797Z | all | not-finished | not finished: test/run/run-lifecycle-restart.test.mjs, test/grade/gate-propagation-reuse-door-advance.test.mjs, test/loop/lane-is-local-slot.test.mjs, test/grade/gate-propagation-create-path-regression.test.mjs, test/loop/lane-is-local-slot.test.mjs, test/assignment/blocked-run-parking.test.mjs, test/grade/gate-propagation-reported-on-base-channel.test.mjs, test/assignment/blocked-run-parking.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/grade/gate-propagation-refusals-leave-branch.test.mjs, test/assignment/blocked-run-parking.test.mjs, test/work/roundtrip-install-proof.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/loop/loop-command-reconcile.test.mjs, test/mesh/assignment/mesh-assignment-loop-directive.test.mjs, test/loop/loop-cap-exhaustion-carries-the-record.test.mjs, 165 units not started · sharded · 10.9 min · over budget (10 min) |
