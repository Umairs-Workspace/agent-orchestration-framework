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
| 7aac83100ea71e66d2de771228cd95157b666b50 | 2026-09-04T18:04:16.420Z | all | red | arch/53 FF-5308 (acd-loop-scope-guard): SCOPE-PC-01 then SCOPE-NEC-01 — the real nextWork scopes the admitted driver form, and the story form leaks to an earlier ACTIVE milestone's ready competitor, arch/FF-7102 (b): in both commands the precondition is stated BEFORE the render — asserted by order, not by presence — and names the skip-and-record outcome, arch/71 FF-7106: every OPEN story declaring a bundle member also declares the manifest and every git-tracked render of that member, arch/68 FF-6807 (acd-observe-snapshots-append-only): no module in src/** truncates an observability snapshot |
| e64e5d4647f73b219328e4a98f5213f271a9b963 | 2026-09-04T19:25:40.504Z | all | red | arch/53 FF-5308 (acd-loop-scope-guard): SCOPE-PC-01 then SCOPE-NEC-01 — the real nextWork scopes the admitted driver form, and the story form leaks to an earlier ACTIVE milestone's ready competitor, arch/68 FF-6807 (acd-observe-snapshots-append-only): no module in src/** truncates an observability snapshot |
| 74aece7ca73a7f11f0d438d979a8b306b02ced6c | 2026-09-04T19:34:05.729Z | all | red | mesh-coordination-launcher/03 the healthy launcher refreshes this node's durable presence on each propagation tick |
| 74aece7ca73a7f11f0d438d979a8b306b02ced6c | 2026-09-04T19:50:27.212Z | all | red | the runner exited with no verdict and enumerated no failure |
| 845db88a99ba7d5668089b7eb55c1036dd52bb57 | 2026-09-04T20:22:15.345Z | all | red | mesh-coordination-launcher/03 the healthy launcher refreshes this node's durable presence on each propagation tick |
| 9fe8df374e587912b33196629833842b7a048f9c | 2026-09-04T20:54:51.963Z | all | green | — |
