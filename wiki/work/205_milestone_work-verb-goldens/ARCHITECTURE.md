---
doc: architecture
---
# 205 · Work stream golden tests

## ADR-001 · Capture the CLI and export the stream at a single fixture boundary

Accepted 2026-11-22.

The existing golden runner accepts a fixture program as a step. That program can run the checkout CLI and hand the existing comparer plain UTF-8 artifacts. This keeps comparison, normalisation, diff reporting and explicit updates on the path delivered by milestone 203. See RESEARCH.md for the text, SQLite and date constraints.

- Describe the seed with item refs, types, status, location, dependencies, documents and opaque attachments. Describe cases with argv, fixture changes, expected exit, output mode and a scenario name. A single test-side file adapter materialises this seed and exports the entire configured stream under stable relative names, including unrecognised files and an inventory of empty directories. The compatibility view a future store must export is today's visible tree. It includes path moves, document formatting and uninterpreted user bytes. Keep text readable in diffs and encode binary attachments losslessly in the export with an unambiguous type marker.
- Run the real CLI in the disposable project. Give each invocation its own scenario's isolated AOF home and each independent mutation a fresh seed. Keep operational SQLite files outside the exported stream. One practical arrangement is a subject project inside the harness project and a subject home inside the harness home. The fixture program takes its observations and removes these private inputs before the outer runner captures the evidence. The harness temp roots still cover paths in the CLI's response. Check child exit against its declared value before the outer step returns.
- Export the pre-verb seed as a common baseline. A case with a modified seed has its own before-image. A successful write must match the complete expected after-image and its reviewed delta against that case's before-image. A refusal must have a measured empty before/after delta. A stream export error fails the case. File order is stable by relative path, while CLI row order and document bytes remain observable.
- Capture stdout and stderr separately for every read and refused write. Pass their untrimmed contents through as captured artifacts, including the final newline. Keep the exit status and argv. Parse JSON additionally for named assertions. A successful write is judged by exit and stream delta. A generated event id in its success envelope is outside that comparison. An unexpected exit always shows the diagnostics.
- Hold fixture clock, timezone and seeded mtimes fixed, including the clock seen by CLI children that write bare dates. A test-only Node preload can freeze Date in those children. This makes scaffolds, status dates and freshness comparisons repeatable. The existing six normaliser rules apply. A change to padding, record order, a numeric ref, a relative link, or a date-only field must remain visible.
- Keep the flat CLI list row intact, including fields that expose the file store today. Alternate stores can supply the seed and export through the same boundary. Every case continues to call the public verb and use the same oracle. A different configured work directory exercises the seam today without implementing 208.

The architecture recall `2dcf54e9-f2de-47c4-b295-dbd4eebe5722` surfaced the item 118 near-miss R3 about probing refusals on the live stream. This milestone deliberately departs from that practice. Comparing every byte before and after a refused mutation requires a known, isolated starting state. Milestones 203 and 204 supply the existing normalisation and the precedent for recording observed behavior.

## ADR-002 · Use the same seed for readiness, placement and lifecycle cases

Accepted 2026-11-22.

| Fixture entry | Distinguishing fact |
|---|---|
| 10 orchard | In-progress milestone with a recognised Stories checklist. Story 10/00 pick is ready. Story 10/01 pack depends on bare sibling 00. Both are not-started. Include a task feature under a story. |
| 11 labels, 12 yield, 13 taste | Not-started chore, blocked spike and in-review UAT depending on 12. |
| 14 weigh | Standalone task with a feature and the status the CLI actually reports for a task without a record. |
| 15 through 18 | Four distinct prototypes, in order active, paused, done and abandoned. |
| 19 receipt, 30 ledger | Done live chore and done archived chore. Give a live document a real relative link to receipt, plus an unrelated numeric mention as a preservation witness. |
| queued, waiting | Backlog chores. Waiting depends on the slug queued. Promotion at the tail mints 31. |
| Attachments | Include a user-authored file with trailing whitespace, a binary attachment and an empty directory under a movable item. Use a satisfied edge to archived 30 as well as the two unresolved readiness edges above. |

Use declarative variations for malformed records and specialty doctor inputs. Keep the basic seed valid where a clean result is claimed. For doctor, exercise the installed command in its ordinary read mode. Use deterministic variants to elicit each registered lane whose inputs come from work items or their documents, including optional practices when enabled. Keep cluster state, daemon metrics, git tracking, external operator profiles, board and live loop orchestration out of the fixture. A committed execution record can be diagnostic input without running a loop.

The comparison preserves the currently observed outcomes, including archive selection of a done prototype and renumber's treatment of a bare sibling dependency. Changing those semantics requires separate product work.

## ADR-003 · Register the fixture once and give each verb family its own cases and baselines

Accepted 2026-11-22.

The fresh code graph contained 22,594 nodes and 49,848 edges at 2026-11-22T23:43:35.528Z with no extraction egress. Impact shows the golden harness imports the CLI spawn helper, lane registry, normaliser and baseline store. The update script consumes the same harness and registry. The golden suite index is imported by the test runner. Next, insert-uat, archive and renumber sit behind separate command bindings. Their production handlers serve as references for the test cases.

Register one work-stream suite in the existing golden index. Let the lane registry consume the same sorted family manifests as that suite. A family contributes one data-only case file in the work-stream fixture directory and one corresponding golden lane. Each case has a stable id and scenario title usable by the registered runner. Reject duplicate ids and empty manifests. A checked-in family baseline left without a manifest or a declared case without a baseline fails normal verification. Explicit updating continues through scripts/golden.mjs.

| Story | Owns | Prerequisite |
|---|---|---|
| 00 · Portable fixture | Seed, adapter, CLI capture, case reader, registry entries, base lane and the portability control | Milestone 203 |
| 01 · Read output | Read cases, doctor diagnostic variations and work-stream-read baselines | 00 |
| 02 · Placement | Promote and insert cases, including rollback, and work-stream-place baselines | 00 |
| 03 · Lifecycle and identity | Archive, status and renumber cases, including refusals, and work-stream-life baselines | 00 |

The three family stories have disjoint writes. Store their fixture variations with the family that needs them. Only 00 changes the runner index, registry and directory budgets. A single file adapter interprets logical inputs such as an extra item sharing ref 11, an absent document, or a changed item date. The application CLI supplies the behavior.

## Fitness functions

| ID | Invariant | enforced by | Source |
|---|---|---|---|
| FF-20501 | Conformance cases can be replayed with a new fixture adapter. The family manifests contain logical seed variations, public work argv and observations. The case vocabulary rejects direct storage paths for setup, shell programs, internal command entry points and executable callbacks. | `test/arch/work/acd-work-stream-golden-boundary.test.mjs` | ADR-001, ADR-003 |

Register the control in `test/arch/work/index.mjs`. Exercise the actual case loader on a planted direct storage edit and an internal function call. Record the rejected case id and diagnostic in VERIFICATION.md when the control lands. Milestone 203's registered controls m203/FF-20301, m203/FF-20302 and m203/FF-20303 continue to govern normalisation, writing and baseline storage.
