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
| e7e4dc6cb9d57797aeeb1248c7adfe1d7d53ed58 | 2026-10-19T13:33:58.003Z | all | red | workspace-boundaries/all actual owners are scanned and every owned array case is registered exactly once, yarn-installation/extracted kernels cannot import core, legacy source, providers or sibling internals, 61/05 task 00 · the events already declared are untouched — each owes the consequences it owed before, and none of them appends a ruling record, arch/61 FF-6108: EFFECTS gains exactly ONE name and no tenth — one reactor at a known locus with an async apply, and the eight already declared are byte-intact, arch/61 FF-6108: every appendEvent call site in src/ is an admitted seam — the set gained exactly the new one — and journal.mjs still imports no vocabulary · not isolated: 81/00 a runner that outlasts the derived deadline is killed and graded, not reaped, single-entry-two-mode/03 run(["mesh","relay","--json"]) invokes the non-blocking probe and returns without binding a long-lived listener, 158 task01 E6 E7 task02 E2 — real native review persists in its run without counting useful work · sharded · 24.3 min |
| 4036e782ef7262d9b6c110b783efcc16f14aef1a | 2026-10-19T17:30:44.222Z | all | red | single-entry-two-mode/03 run(["mesh","relay","--json"]) invokes the non-blocking probe and returns without binding a long-lived listener, 154/08 task01 — Liveness is distinct from useful progress: server connected but no work event, 154/08 task01 — Liveness is distinct from useful progress: owned server process exits · not isolated: 158 task01 E6 task03 — native worker binding withdrawn preserves run ownership and review evidence, 131/01 ask-request/02 the poll reads the file on its unref'd interval, arms only for a positive finite pollMs, and a corrupt file answers null without rejecting · sharded · 29.4 min |
