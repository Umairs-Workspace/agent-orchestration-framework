# Testing AOF

Read this file before choosing a test run. Choose suites for the behaviour you changed, and record
why with `aof test <suite>… --reason "<why these suites>"`. Use `aof test --suggest` to check direct
imports, test-helper reach and whole path mentions. The scan cannot see paths assembled from
fragments or reach through the core application assembly: use the area mapping below as well.
Name any suite deliberately left out and its reason in the recorded reason.

After a fix, use `aof test --failed` to check the failures and the importers of the fix's changes.
A `test-fix-stopped` refusal hands the problem to the operator; do not reopen an automatic chain.
Record failures labelled pre-existing by case name in the item's STATE feedback.

## Choose by area

| Change | Suites to consider |
| --- | --- |
| Testing instructions and declaration compilation | `test/testing/test-layout-check.test.mjs`, `test/work/lifecycle/work-update-test-layout.test.mjs`, `test/work/lifecycle/work-test-declared.test.mjs` |
| Importer suggestions | `test/testing/test-importer-scan.test.mjs` |
| Test CLI and run records | `test/testing/test-command-contract.test.mjs`, `test/testing/test-run-record.test.mjs`, and the relevant suites under `test/work/lifecycle/` |
| ACD command prose and runtime rendering | `test/work/lifecycle/map-tests-command.test.mjs`, `test/loop/autonomous-shell-out-prompt.test.mjs`, `test/arch/bundle/`, `test/golden/work-init.test.mjs` |
| Learning commands | the owning `.suite.mjs` files in `packages/learning/test/` |
| Work lifecycle, gates and records | the relevant suites under `test/work/lifecycle/`, `test/work/gate/`, `test/work/record/` and `packages/work/test/` |
| Work-stream placement and templates | `test/golden/work-stream.test.mjs` and `test/work/stream/` |
| Golden baselines and fixtures | `test/golden/work-stream.test.mjs` reads `test/golden/baselines/work-stream-*` and its fixtures through `test/golden/work-stream.lane.mjs`; `test/golden/golden-harness.test.mjs` exercises the runner and file adapter; `test/arch/testing/acd-golden-baselines-eol-pinned.test.mjs` and `test/arch/work/acd-work-stream-golden-boundary.test.mjs` are the path controls |
| Core application bindings | their owning feature suites plus `packages/core/test/`; many import `aof/default-application`, so direct import reach alone is incomplete |
| Memory and knowledge | `test/memory/` and the owning suites in `packages/knowledge/test/` |
| UI | the changed component's suites in `apps/ui/test/` and `packages/design-system/test/`, plus `yarn ui:build` |
| A new module, or a changed import, in a workspace package | `test/bundle/yarn-installation.test.mjs` (its package import allow-list pins each module's imports, and no importer scan reaches it) |
| Dependencies or install behaviour | `node scripts/supply-chain-audit.mjs` first, then the affected install and packaging suites |

Directory entries describe where to choose suite files; do not pass a directory as a suite. Inspect
the scenario names and the area's `index.mjs` to identify the files that exercise the change.
Architecture tests under `test/arch/` often read source text or build paths from fragments. Include
the controls for the invariant being changed even when the suggestion does not find them.

## Changes that need no run

A change to only `wiki/work/**` records needs no run. Ordinary docs-only wording edits need no run
when no executable consumer reads them. Bundle command prose, templates, test fixtures, generated
runtime instructions and golden baselines have executable consumers; they are not ordinary docs.
Changing criteria is a contract change, and does not make an already green implementation proven.

## Runners and native tests

`scripts/test.mjs` assembles the registered `{ name, run }` array suites through directory indexes.
The focused runner `scripts/test-shard.mjs` imports named suite files and uses the same test harness.
A new array suite must be imported and spread by its directory's `index.mjs`.

Workspace native `node:test` files are not array suites and are excluded from the focused array
runner. Run their workspace script with `yarn workspace <package-name> test`, or use
`node scripts/test-workspace.mjs <package-name>`. That runner executes the workspace's array suites
and its native files via `node --test --test-reporter=tap`, with an isolated `AOF_GLOBAL_HOME`.
`node scripts/test-workspace.mjs --all` is a broad gate check, not a fix-loop command. Do not add a
native file to the array registry merely to make it selectable.

## Machine hazards and slow lanes

`test/store/global-work-propagation.test.mjs` starts a real control stream server binding `:4182`.
Do not run it against the live control daemon on this machine. Use an isolated gate environment,
and state the exclusion by suite name in the recorded reason. Do not stop the live daemon to test.
Tests that launch daemons or bind ports may need the host's sandbox approval.

`test/memory/recall-replay.test.mjs` is a slow lane involving recall evaluation. Include it when
recall behaviour changes; avoid adding it to unrelated fix checks. Report its actual result and
executed count. A successful process with no trustworthy test summary is not evidence of green.

Golden changes are authored through `node scripts/golden.mjs --lane <lane> --update`, never by
editing baselines. Review the generated delta, then rerun the same lane without `--update`.

## The whole tree belongs to the gate

Never run `aof test --all` in story work. The whole tree is the regression gate's: use the milestone's
`aof work regression-gate <ref>` at acceptance. A UAT session takes one `aof test --all` sweep.
For this repo's sharded regression, run from a clean detached worktree with `AOF_GLOBAL_HOME`
isolated. Do not run the whole tree again after every fix. A story's chosen suites are evidence for
that story; the gate supplies whole-tree evidence at its own phase.
