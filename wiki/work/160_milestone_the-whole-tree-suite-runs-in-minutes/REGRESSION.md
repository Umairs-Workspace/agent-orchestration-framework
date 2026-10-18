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
| 4dbd05b895e42120558394fd0bd368e6aacbb74f | 2026-10-18T12:27:12.586Z | all | red | 160/13 The workflow runs the shards, then the summary, on every pull request, 53/00 task03 — a parent that finished over a still-writing subagent is never quiet: it settles only after the WHOLE tree stops moving, 154/08 task01 — Liveness is distinct from useful progress: owned server process exits · not isolated: 129/07 task01 a narrowed loop runs one lane at a time over a two-member wave, and an unset key runs both at once, 160/11 The site build's copy of the tree runs the gate as the workflow spells it, 158 task01 E6 task03 — native worker binding withdrawn preserves run ownership and review evidence, declared completion: the DIRECTIVE_COMPLETE sentinel settles after the SHORT confirmation window, not the long fallback, 131/01 ask-request/02 the poll reads the file on its unref'd interval, arms only for a positive finite pollMs, and a corrupt file answers null without rejecting · sharded · 40.3 min |
| feffa4a29885804df5073d01a9ef1017c1f2d03b | 2026-10-18T15:08:46.536Z | all | red | arch/item-24 (acd-comment-stripper-order): every hand-rolled comment stripper removes LINE comments before block comments — a line comment containing a block opener can never blind a source-reading gate · sharded · 12.1 min |
