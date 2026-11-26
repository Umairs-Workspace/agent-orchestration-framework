# 210/01 · Importer scan — example map

## R1 · A suite is selected when it imports a changed file, directly or through test helpers
- E1 · `packages/work/src/testing/record.mjs` changes. `test/testing/test-run-record.test.mjs` imports it relatively and is selected as `imports` [proposed]
- E2 · A suite imports `@aof/work/testing/record`. The workspace export map resolves it to the changed file, and the suite is selected as `imports` [proposed]
- E3 · A suite imports `test/support/regression-gate-fixture.mjs`, which imports the changed file. The suite is selected as `via test/support/regression-gate-fixture.mjs` [proposed]
- E4 · A suite imports `packages/core/src/application/assemble.mjs`, which reaches the changed file only through source imports. It is not selected [proposed]

## R2 · A suite that names a changed path is selected, and what cannot be placed is said
- E5 · `packages/work-loop/src/commands/loop.mjs` changes. `test/loop/loop-command-wave.test.mjs` reads it by path and imports nothing of it. It is selected as `names` [proposed]
- E6 · Only `wiki/work/210_milestone_bounded-test-runs/STATE.md` changes. No suite imports or names it. The scan answers that it reaches no suite and selects nothing [proposed]
- E7 · A helper imports `@aof/missing/thing`, which the export map cannot resolve. The scan still completes, and reports one unresolved specifier with its importer [proposed]

## Questions
- Q1 · technical · defaulted ADR-003 · Does the scan follow source-to-source imports? No. Only test helpers are followed transitively.
- Q2 · technical · defaulted ADR-003 · Is a path mention matched by parsing, or by text? By the project-relative path appearing in the suite's text.
