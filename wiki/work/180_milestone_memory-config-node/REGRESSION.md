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
| c8a236e3404dc7ca7fc52c1271f06164e869f5eb | 2026-10-30T22:24:37.328Z | override | override | Environment: this MacBook cannot host a whole-tree run. Its live control daemon (aof mesh serve --serve, pid 77647) holds :4182, which global-work-propagation binds, and the deploy rules forbid the full suite here while it does (m175's and m179's override, same condition). 180's three impacted lanes each widened to all 1,259 suites at bd4fb4bd. Every red file was re-run alone at bd4fb4bd and at 179's accept e9aec287: all reproduce with the same case names except 180/03's three App.tsx controls (F-02), fixed at c8a236e3 and green with the UI, surfaces and arch indexes (2,335 cases) apart from the reds recorded before 180. FF-18001 and FF-18002 are green with red probes. |
