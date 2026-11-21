---
type: story
number: 00
slug: the-harness
title: "The harness — a verb runs isolated in a temp project and home, both trees are normalised and compared with a committed baseline stored as a delta, drift fails with a summary and a diff per file, and only the update script writes"
parent: 203
status: done
owner: product-owner
created: 2026-11-20
updated: 2026-11-21
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/203_milestone_generated-output-goldens/stories/00_story_the-harness/EXAMPLES.md
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-001
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-002
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-003
  - wiki/work/203_milestone_generated-output-goldens/ARCHITECTURE.md#ADR-004
  - test/support/cli-spawn.mjs
  - packages/core/src/work/bundle-manifest.mjs
  - packages/core/src/build-info.mjs
  - test/arch/bundle/acd-bundle-install-eol-pinned.test.mjs
  - test/arch/testing/acd-test-suite-registration.test.mjs
  - test/support/source-slice.mjs
files:
  - test/support/golden/harness.mjs
  - test/support/golden/normalise.mjs
  - test/support/golden/baseline-store.mjs
  - test/support/golden/baseline-writer.mjs
  - test/support/golden/line-diff.mjs
  - test/support/golden/lanes.mjs
  - scripts/golden.mjs
  - test/golden/index.mjs
  - test/golden/golden-harness.test.mjs
  - test/golden/fixtures/fixture-verb.mjs
  - scripts/test.mjs
  - .gitattributes
  - test/arch/testing/acd-golden-normaliser-closed.test.mjs
  - test/arch/testing/acd-golden-baselines-written-by-the-script.test.mjs
  - test/arch/testing/acd-golden-baselines-eol-pinned.test.mjs
  - test/arch/testing/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 203/00 · The harness

## User story

As **a developer changing what aof generates**,
I want **a check that runs a verb in a throwaway project, compares everything it leaves with a
committed baseline, and shows me a diff per file when they differ**,
so that **I see what my change does to a user's files before it ships, and accept it by
reviewing that diff, rather than learning only that a hash changed**.

What lands (ADR-001 to ADR-004): the runner, the closed normaliser, the baseline store with its
delta form, the line diff, the report, `scripts/golden.mjs` and its `--update`, the LF pin and the
three fitness functions. The harness is proven on a fixture verb, a small script that writes a
tree as told. No aof verb is a subject here. Stories 01 and 02 add the lanes.

## Tasks

- [x] `tasks/00_a-scenario-runs-isolated-and-both-trees-are-captured.feature` (R1): each step runs as a child process in a temp project with a temp `AOF_GLOBAL_HOME`, both trees and every step's record are captured, an unexpected exit fails by name, and the temp root is removed either way.
- [x] `tasks/01_output-is-normalised-by-a-closed-rule-list.feature` (R2): the six rules, in order, rewrite exactly what they name and nothing else, and a non-UTF-8 file fails by name.
- [x] `tasks/02_drift-fails-with-a-summary-and-a-diff-per-file.feature` (R3): the expected tree is materialised from a base and a delta, and a mismatch fails with counts, paths, a unified diff per file and the update command.
- [x] `tasks/03_only-the-update-script-writes-a-baseline.feature` (R4): a plain run never writes, `--update` writes the minimal delta and re-derives dependents, and a second `--update` writes nothing.

## Notes

- FF-20301, FF-20302 and FF-20303 land here, each with its red probe in `VERIFICATION.md`.
- FF-20303's `.golden` sweep has nothing to sweep until story 01 commits the first baselines. Its
  `git check-attr` half holds from this story on, because attributes match on paths.
- `test/golden/` is a new directory, so `scripts/test.mjs` gains its one import, and
  `acd-source-directory-budget` gains rows for `test/golden` and `test/support/golden` and raises
  `test/arch/testing` by three.
