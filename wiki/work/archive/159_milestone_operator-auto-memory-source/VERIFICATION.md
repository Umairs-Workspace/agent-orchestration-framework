# 159 · Verification register

Refine evidence, the 159/01 verify session, then the milestone regression gate (green at
`ae767636` after seven red runs). No independent review is claimed; business discovery is answered.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-15901 | `test/arch/memory/acd-auto-memory-source.test.mjs` | pass (3 cases, 2026-10-12) | Plant: `if (autoMemory && autoMemoryEnabled(ctx.configMemory)) {` → `if (autoMemory) {` in `local-indexing.mjs`. Observed: "an operator record appeared for undefined" (and for `{}`, `{backend:"local"}`, `sources:[]`) plus "12 read(s) while disabled"; the shipped module returns no violations. |
| FF-15902 | `test/arch/memory/acd-auto-memory-source.test.mjs` | pass (2 cases, 2026-10-12) | Plant: the memory root replaced by `path.dirname(path.resolve(absolute))` (a resolver that trusts the locator). Observed: "a forged locator resolved: <outside.md>:1" and the `..`-traversal form; a second plant dropping the enabled check was caught as a disabled source resolving. |
| FF-15903 | `test/arch/memory/acd-auto-memory-source.test.mjs` | pass (2 cases, 2026-10-12) | Plant: the graph build's `workDir` re-pointed at the operator memory directory in `graphify-backend.mjs`. Observed: "extraction path is not the work stream: <memory dir>" and "the external source reached extraction". |

## Refine checks

The first discovery stop identified Q1 and authored no tasks. On resume the actual
operator answer was written into the map, and the pre-formulation doctor of 159/01
returned zero errors. The four features were then authored in one beat.

Post-authoring `aof work validate 159 --json` returned [] with exit 0. Doctor 159
returned healthy true, zero errors and seven warnings: the three declared pending
controls, unchecked control-runner configuration, no executable-run report to join,
the existing top-level numbering gap and unchecked dependency edges. Its task check
reports 1 of 1 stories authored. Global loop registry grounding and anchor-grounding
remain reported as unmet; this refine neither changes nor claims to repair them.
`git diff --check` found no whitespace errors. These are document checks only.

## Consolidated solo review

One round, bounded by the configured/default resolver in
packages/contracts/src/loop-bounds.mjs (default 1, maximum 3). All lenses were
performed inline by the same session; this is not independent review.

Review surface:

- SPEC and RESEARCH: one source-based vertical story; dependency 148 is done;
  measured nested metadata and unavailable advisory graph are explicit.
- ADR-001 through ADR-003: opt-in shared indexing, the approved fixed kind, and
  a constrained external source branch. Three pending registered control paths
  carry planned negative probes; there are no staged tests under the work tree.
- 159/01 STORY, EXAMPLES and PLAN: declared read/write scope, answered Q1 and
  executable/manual lane ownership; integration runner limitations are explicit.
- Task 00: opt-in, backend parity, invalid settings and local discovery.
- Task 01: measured grammar, original content, locators, omissions and diagnostics.
- Task 02: near-miss with original-type tags, filters and honest conformance counts.
- Task 03: distinct duplicate sources, edits/deletes/disable, scoped rebuilds,
  a read-only live comparison and the operator documentation walkthrough.

PO lens: the objective and exclusions are covered; no new business default or
unanswered question. E7/E8 trace Q1 and retain their own R3 headlines.
QA lens: edge tables complement headlines, with unsupported types, malformed
frontmatter, permission errors and lifecycle transitions. Every scenario has one
verification lane and configured layer/refinement/domain tags. The live corpus
comparison is manual evidence, not a fabricated automated pass.
Developer/architect lens: both backends share buildRecords; core already provides
the directory and diagnostic services; ownership includes schema, binding, suite
registries and integration steps. No package installation or UI edit is needed.
Security lens: existing containment guards remain intact and the external source
requires a specific enabled namespace/root; canary-based controls cover graph and
mesh boundaries. Personal corpus bodies are not committed as fixtures or evidence.

Result: no surviving Blocker or Important contract finding; no rereview is owed.
No acceptance or build status move was made. Controls, executable bindings, manual
evidence and the later milestone regression gate remain build/verify obligations.
Next is `$aof-continue 159`.

## Verification evidence — 159/01 (verify session, 2026-10-12, solo, inline)

Lane scoped to the story: its own cases plus the fitness functions; the whole tree runs once at the
milestone gate. Every run under a fresh `AOF_GLOBAL_HOME`, read from exit code and both streams.

- **`@executable` — registered cases.** `node scripts/test.mjs --only packages/knowledge/test/claude-auto-memory.suite.mjs test/arch/memory/acd-auto-memory-source.test.mjs test/memory/memory-indexing.test.mjs` → exit 0, 68 `ok`, no `not ok`.
- **`@executable` — integration feature.** `node test/integration/cli.mjs memory-auto-source` → exit 0, 45 `ok`, 0 `not ok` (every Outline row expanded to its own scenario, as the build recorded).
- **Manual 1 — the live junction example, verifies → task 03 "The measured live junction example is reproducible on the owning node".** Procedure: in-process `createApplication().knowledge.memory.localIndexing.buildRecords` over this workspace (`wiki/work`, project root = the checkout), no index persisted, isolated global home, then `rankRecords("junction", limit 50)`. Result: disabled build 4553 records, 0 operator; enabled build 4620 = 4553 + 67 operator records. The junction recall names the operator record `worktree-node-modules-junction-destroys-source.md:1` (`owner` operator, `near-miss`, tag `feedback`, Why and How-to-apply present in `text`, area/stage/status blank) beside 68/R10, 45/R13 and 72/ADR-007, each with its own locator. The 77 files of the memory directory hashed identically before and after, and `originSessionId` appears in the work stream only in 159's own format notes, not as copied entry content.
- **Manual 2 — the guide walk, verifies → task 03 "The operator can enable and undo the source using the memory guide".** Procedure: scratch project + scratch `CLAUDE_CONFIG_DIR`, `node packages/core/bin/aof.mjs` following `wiki/memory.md`: enable → `work memory ingest --all` (2 records) → `recall ZZQUOKKA --owner operator` (1 hit, `near-miss`, locator `…/memory/j.md:1`) → set `sources: []` → ingest (1 record) → the same recall (0 hits) while the work lesson still recalls. The source file hash is unchanged. The guide states the read-only source, no deduplication and the promote-for-workers rule.
- **Design conformance / UAT.** Not applicable — CLI adapter, no UI surface; no `@uat` scenario exists.
- **Gate.** `aof work validate 159/01` → PASS. `aof work doctor 159` → no `control-unresolved`; warnings are only the unconfigured control runner, rubric join, numbering gap and unchecked depends edges (all pre-existing and unrelated).

## Milestone regression gate — 2026-10-12..14

`REGRESSION.md` holds eight whole-tree runs; the door reads the last. Run from a clean detached
worktree, isolated `AOF_GLOBAL_HOME`, launch environment stripped of `GIT_ASKPASS`/`CLAUDE_*`/`AOF_RUN_*`.

| commit | result | what it showed |
| --- | --- | --- |
| `67e7797e` | red | 159's own reds (budgets, kernel ports, wire-kind, citation, extractor, scrub) → F-1 |
| `75549342` | red | a stale bundle manifest → F-1; integration lane killed at its 20-min unit limit → F-2 |
| `206c8877` | red | clone-credential cases red from an inherited VS Code `GIT_ASKPASS` → F-2 |
| `d9fddda9` | red | stopped by the operator mid-run (loop 159 halted) |
| `b4f81341` ×2 | red | no verdict: cut off at the 2-h `work.test.deadlineMs`; integration lane killed at 45 min, its solo retry past the deadline → F-2 |
| `79b926b7` | red | 54.7 min with a verdict after the lane split and doctor speed-up; five cases red alone: two regressions from the 156 loop fixes (runtime audit, silent catch), F-3, F-4, one load flake |
| `ae767636` | **green** | 47.7 min; five load flakes red in the pool and green on their solo retry |

## Findings

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| F-1 | The gate found 159's own reds: directory budgets, kernel ports, wire-kind, a citation, an extractor, the private-terms scrub, and a bundle manifest left stale by the loop-record repair | defect | high | blocker, fixed | 159 | closed — `75549342`, `76e884cb`, `206c8877` |
| F-2 | The whole-tree gate could not finish inside its deadline on this host: the integration lane ran ~350 scenarios serially (~25 min), doctor re-scanned history and read items one at a time, and the gate inherited the session environment | defect | high | blocker for the door, fixed; residual suite speed open | test runner; suite-speed milestone | closed for 159 — `ae1495a6`, `79b926b7`, `1366680d`; residual open as m156/F-4 |
| F-3 | Withdrawing a native run during a permission review settled `failed/persistence_failed` under load: the post-stop review write raced the child's 1-s close grace (158 task01 E6, 2 of 6 parallel runs) | defect | high | blocker, fixed | execution | closed — `69171bfa` |
| F-4 | 130/01's test timed spawn-to-exit while its scenario's 3 s run from the end of the script; importing the application alone takes ~2.8 s here | defect | medium | blocker, fixed | test | closed — `ae767636` |

Recall preceded triage (one `--kind finding` recall per finding, submitted with `record-recall`).
F-1 repeats m57/F-57-M-3 (a bundle change left the manifest un-derived) and m138/F-13 (an extractor
red at the gate). F-2 shares cause and evidence with m127/F-30 ("the runner exited with no verdict",
the deadline too short for the whole tree) and m156/F-4, which stays open for the suite-speed work.
F-3 and F-4 are distinct incidents. The two regressions in the `79b926b7` row came from commits made
during 156's verification, not from 159, and were fixed in `ef74f7d5` and `ae767636`. The build's three
process notes are lessons, carried in the story RETROSPECTIVE.

## Accept decision — 159/01

Accepted 2026-10-12: scoped lane green, both manual scenarios reproduced, FF-15901..03 each shown to bite, validate PASS, no open finding. The milestone regression gate stays owed at 159's own acceptance.

## Accept decision — 159

Accepted 2026-10-14: 159/01 done; the whole-tree regression gate green at `ae767636`
(`REGRESSION.md`, last row); FF-15901..03 resolve to `test/arch/memory/acd-auto-memory-source.test.mjs`
with their red probes recorded; validate PASS; doctor reports no `control-unresolved`. No blocker
finding is open; F-2's residual (suite speed) is routed to its own work.
