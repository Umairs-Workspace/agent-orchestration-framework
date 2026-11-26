---
type: story
number: 01
slug: importer-scan
title: "A change is matched to the suites that import or name it, from a fresh scan"
parent: 210
depends: []
status: not-started
owner: product-owner
created: 2026-11-26
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-003]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-003, packages/work/src/testing/select.mjs, packages/work/src/audit/census.mjs, packages/core/src/application/bindings/work/test-select.mjs, test/testing/index.mjs]
files: [packages/work/src/testing/importers.mjs, packages/work/package.json, scripts/workspace-runtime-audit.json, test/testing/test-importer-scan.test.mjs, test/testing/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 01 · A change is matched to the suites that import or name it, from a fresh scan

## User story

As an agent checking a change,
I want the suites that import a changed file, reach it through a test helper, or name its path,
read fresh from the tree on every call,
so that I am offered tens of suites that can actually see my change rather than the whole tree, and
a suite that reads a file's text is not missed.

## Tasks

- [ ] [import and helper reach](tasks/00_import-and-helper-reach.feature)
- [ ] [path mentions and honest misses](tasks/01_path-mentions-and-misses.feature)

## Notes

A pure leaf with no caller yet: story 04 composes it into `--suggest`, and story 05 into
`--failed`. Its export goes in `packages/work/package.json`, and the runtime audit stamp follows.
The `packages/work/src/testing` and `test/testing` budgets each rise by one, with the reason stated
in the budget row.
