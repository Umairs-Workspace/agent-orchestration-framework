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
| b0ea033c1e628ec1626508169e80e01a32419682 | 2026-11-14T15:24:23.980Z | all | red | workspace-boundaries/all actual owners are scanned and every owned array case is registered exactly once, arch/47 F-47-04-ARCH-2 (acd-test-suite-registration): no fitness function grows a NEW positional slice over source text — a fixed character window, or a slice whose end is a second indexOf sentinel; the surviving instances are ledgered and may only shrink, arch/71 FF-7106: every OPEN story declaring a bundle member also declares the manifest and every git-tracked render of that member, arch/126/00 FF-12602 leg 2: the classification is by ROLE — every account line is on `report`, every in-flight line is on `narrate`, arch/53 FF-5301 (acd-session-driver-mesh-blind): frozen direct imports, lifecycle denylist, named admissions, and reach ceilings stay exact, arch/m42-item-3: no NEW silent catch — every src file is at or below its shrink-only baseline, and unlisted files have none · sharded · 14.8 min |
| 2792403aea9a79c96ab65184b6f2925cb59337e9 | 2026-11-14T15:50:19.517Z | all | green | sharded · 15.0 min |
