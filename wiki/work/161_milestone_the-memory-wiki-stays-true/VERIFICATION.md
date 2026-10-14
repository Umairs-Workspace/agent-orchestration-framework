---
doc: verification
---
# 161 · Verification

## Refine checks

Both example maps passed scoped doctor with zero errors before task authoring.
The first map initially contained un-commented explanatory prose; doctor rejected
those lines and they were corrected before any feature was written. Story 02's
map is not applicable: it documents delivered behavior rather than deciding policy.

No implementation, production test run, manual acceptance execution or human UAT
has occurred in this phase. All build evidence remains owed. The pre-build wiki
inventory in ARCHITECTURE is research evidence only.

At the consolidated refine review, `aof work validate 161` passed and scoped
doctor exited 0 with zero errors and five warnings. The warnings are the pending
control, unconfigured runner/rubric evidence and pre-existing stream-level
numbering/dependency checks. `git diff --check` passed. This settles document
well-formedness only, not the feature scenarios or the control's red probes.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16101 | `test/arch/command/acd-wiki-citation-resolver.test.mjs`, registered in `test/arch/command/index.mjs` (story 01 build; all 3 cases pass) | Resolves: the probe imports and calls the shared `resolveCitedPath` and `pathCitationsIn`, names no rename reader, git or execution door, and the command edge calls it once with the snapshot's history. | **Bypass** (resolver import and call removed, replaced by a direct `renameMap.get`): observed red — `does not import the shared resolver`; `never calls the shared resolver`; `looks a citation up in a rename map directly`. **Severed call** (the `probeWikiCitations` line removed from `doctor.mjs`): observed red — `does not call the probe with the history read for the snapshot`. Both asserted in-suite by mutating the shipped source text; the unmutated sources report no violations. |

## Verification evidence

Run 2026-10-14 by `aof:verify 161` on `milestone/160-161` after both lanes merged
(`2f6d5afb`). The loop's lane grade for 161/01 timed out at its 30-minute deadline
(`runner-timeout`), so it recorded no case result. The selection below replaces it.

### Story 01 · executable lane and importer sweep

`AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only <38 files>`: the story's
three suites (`test/work/wiki-citations.test.mjs`,
`test/work/doctor-command-core.test.mjs`,
`test/arch/command/acd-wiki-citation-resolver.test.mjs`) plus every test that imports
the doctor command or the new module. Result: 566 cases, 1 failing, which is
`yarn-installation/extracted kernels cannot import core, legacy source, providers or
sibling internals`. See F-01. After the fix the suite re-ran 13/13 green. Each
scenario in both task features maps to a case in the first two suites, and all of
those cases passed.
verifies → `stories/01_story_wiki-source-citations-are-checked/tasks/01_report-unresolved-source-citations.feature`,
`tasks/02_check-the-workspace-wiki.feature` (executable rows), FF-16101.

### Story 01 · the shipped command detects a planted citation (@manual)

Procedure: a disposable project (isolated `AOF_GLOBAL_HOME`; config `work.dir`
`./wiki/work`; one not-started milestone; `src/real.mjs`; `wiki/guide.md` citing
`src/real.mjs`). The command is the shipped entry `packages/core/bin/aof.mjs work doctor`.

| step | normal exit | `--strict` exit | wiki findings |
|---|---|---|---|
| clean page | 0 | 0 | none |
| append `src/aof-wiki-negative-probe.mjs` | 0 | 1 | `warn wiki/guide.md cites src/aof-wiki-negative-probe.mjs (first at line 5), which resolves to no current file and has no recorded move to one`, in both runs |
| remove the citation | 0 | 0 | none; page byte-identical to before (`cmp`) |

The human face prints the same warning. Result: pass.
verifies → `stories/01_story_wiki-source-citations-are-checked/tasks/02_check-the-workspace-wiki.feature`
· "The shipped command detects a planted citation without changing the real wiki".

### Story 02 · the memory page describes the delivered procedure (@manual)

Procedure: read `wiki/memory.md` at `2f6d5afb` and compare each topic row with source.
Checks:
- `RECORD_TYPE_LAYERS` in `packages/knowledge/src/memory/local-retrieval.mjs` lists
  8 types in 3 layers, and `DEFAULT_LIMIT = 5`. `--all` overrides the limit at line 317.
- The six edge names each appear in
  `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`.
- `continue.md` gates `continue-episodic` on attempt ≥ 2 and `retryOf`; `verify.md`
  recalls findings stream-wide.
- `RECURRENCE_CANDIDATES = 3`.
- `DEFAULT_UNPROMOTED_AGE_THRESHOLD = 5` under `work.doctor.memory.unpromotedAfterMilestones`.
- The index paths `.aof/aof.memory.index.json` and `.aof/aof.memory.graphify.index.json`.
- The extractor list in `graphify-backends.mjs`.
- `aof work memory brief` answers `Unknown memory verb "brief"`.
- Every cited source file exists.

The page names no live backend or record count, and it sends readers to
`aof work memory status --json`. Each of the 11 topic rows and both edge and
operations scenarios matches. Result: pass.
verifies → `stories/02_story_memory-wiki-describes-delivered-procedure/tasks/01_describe-memory-as-delivered.feature`
(all three scenarios).

### Story 02 · scope preserved and the whole wiki resolves (@manual)

- The `## Optional source: your local Claude auto-memory` section, compared up to the
  next peer heading at `6eabd803` and at HEAD, is 54 lines in both. `cmp` reports
  identical bytes, with the same sha256 (`d7ebef1b546418d…`).
- The story-02 lane (`a6e780e7`) changed only `wiki/memory.md` outside `wiki/work`.
  No other direct wiki page, index source set or runtime asset changed.
- Combined gate over the 12 direct pages:

| run | exit | wiki-source-unresolved | wiki-source-unreadable |
|---|---|---|---|
| `aof work doctor 161 --json` | 0 | 0 | 0 |
| `aof work doctor --json` | 1 | 0 | 0 |

  The unscoped run exits 1 because of findings from other items, recorded here
  separately: `story-done-under-not-started` ×16 and `verification-register-missing`
  ×1, both errors. Neither names 161. The scoped run's four warnings are the
  refine-time stream warnings: numbering gap, unchecked depends, unchecked control
  runner, and unchecked rubric join.

Result: pass.
verifies → `stories/02_story_memory-wiki-describes-delivered-procedure/tasks/02_preserve-scope-and-resolve-citations.feature`
(both scenarios).

No human-only UAT rule or UI surface is introduced. The documentation checks are
agent-run manual checks, not human sign-off.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The extracted-kernel boundary case in `test/bundle/yarn-installation.test.mjs` went red. 161/01's new `packages/work/src/wiki-citations.mjs` imports `node:path`, `node:fs` and `node:fs/promises`, and has no entry in the `work` package's allow-list of native imports. The story lane never selected that suite. The loop's grade, which would have caught it, timed out at its 30-minute deadline. | defect | high | Blocker. Fixed inline: the module was added to the allow-list (the doctor command edge's wiki probe reads the filesystem by design, per ADR-001), and `test/bundle/yarn-installation.test.mjs` was added to 161/01's `files:`. The suite re-ran 13/13 green. The existing case is the regression proof, so no `@bug` scenario was added, matching m153/F-01. Recall: another case of the m145/F-145-01 class (a new import outside a module's declared native imports). The file and evidence differ, so it is a distinct incident, not a duplicate. | product-owner (161) | closed |
