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
| 15629d531d63585dcdf9324ebaec05873d38b2e0 | 2026-09-25T22:08:28.233Z | all | red | arch/96/02 FF-9603 (2) THE BAN IS A PROPERTY OF THE STREAM — every PLAN.md under wiki/work is admitted, not only the template, arch/47 F-47-04-ARCH-2 (acd-test-suite-registration): no fitness function grows a NEW positional slice over source text — a fixed character window, or a slice whose end is a second indexOf sentinel; the surviving instances are ledgered and may only shrink, autonomous-shell-out/black-box: b01-b04 and h01-h03 prove source-local human drive, halt, accepted milestone and inert JSON probe, 63/02 task02 — every attended launch resolves exactly the program, argv and env it resolved before the fourth point compiled, 63/02 task02 — every attended session still carries the instruction that produces the needs-input signal, unchanged, 81/03 the object the driver receives carries exactly the transport's own keys, 53/00 task01 — only the closed named set under test/ may name agent-session-driver; the 48 census members split as 44 zero-name importers plus four named re-aimed gates, global-work-propagation/03 launcher publishes an initial snapshot and retries on each propagation tick without stopping the peer loop, 70/05 task02 the declared-ADR path is exercised by a real story, not by emptiness — at least one real story in the stream declares its ADRs, that story's brief carries those rather than the milestone's register, and the guard fails if no story in the stream declares any, 70/05 task02 outline what every real item's brief must satisfy (6 rows: a story with contracts at continue and at verify; a story whose milestone records architecture; a story that declares its ADRs at refine; a milestone at refine; any item at every phase), 96/02-00 the ban is a property of the stream, not of one file — every PLAN.md in the work tree is admitted, work/this-tree-holds-what-is-live: 02 the link ratchet holds — the total equals LINKS_BEFORE.total, the resolving count is >= LINKS_BEFORE.resolving, every link into archive/ resolves, no link targets a root path whose folder now lives under archive/, and the four wiki/memory.md links resolve |
| 9d6353ae30071169b91adf05614a37b606c84e6a | 2026-09-25T23:33:47.408Z | all | red | arch/FF-6604: exactly ONE module under src/ carries an id pattern — src/declared-id.mjs, 69/04 task 00 wiring: the production work:dispatch command sends a multi-ref ready set through the bounded pool, 129/04 task03 [outline] the delta is applied per lane against the one baseline (5 rows) |
| ec5231556f24d8dc882161e0df1c56430fb29a4b | 2026-09-26T09:34:33.841Z | all | red | the runner exited with no verdict and enumerated no failure |
| ec5231556f24d8dc882161e0df1c56430fb29a4b | 2026-09-26T10:36:02.458Z | all | red | the runner exited with no verdict and enumerated no failure |
| fef237c36d5212dff1170bb098b86041ff71d756 | 2026-09-26T12:05:15.305Z | all | red | 53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch, so the outcome does not settle on the original clock |
