---
type: story
number: 01
slug: episodic-records-resolve-to-their-sources
title: "Episodic records resolve to their sources"
parent: 157
status: not-started
owner: product-owner
created: 2026-10-11
updated: 2026-10-11
schema: 1
aofVersion: 0.1.0
reads: ["wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-001-existing-sources-become-three-episodic-record-types","wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-002-source-locators-grow-without-a-new-record-field","wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-003-every-consumer-accounts-for-the-new-pool","packages/work/src/declared-id.mjs","packages/work/src/feedback-records.mjs","packages/work/src/observe.mjs","packages/execution/src/runs.mjs","packages/core/src/application/bindings/run-store.mjs","packages/core/src/application/bindings/work-tune/corpus.mjs","packages/core/src/application/bindings/memory/graphify-backend.mjs","packages/knowledge/src/memory/local-backend.mjs","packages/knowledge/src/memory/local-retrieval.mjs","test/arch/memory/acd-memory-retrieval-eval.test.mjs","test/integration/support/feature-runner.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","test/integration/support/cli-context.mjs","test/support/cli-spawn.mjs","scripts/test.mjs"]
files: ["packages/knowledge/src/memory/episodic-indexing.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/core/src/application/bindings/memory/local-indexing.mjs","packages/core/src/application/assemble.mjs","packages/knowledge/test/episodic-records.suite.mjs","packages/knowledge/test/index.mjs","test/memory/memory-indexing.test.mjs","test/graph/graphify-reindex.test.mjs","test/arch/memory/acd-episodic-source-provenance.test.mjs","test/arch/memory/acd-memory-derived-index.test.mjs","test/arch/memory/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/integration/features/memory-episodic-records.feature","test/integration/steps/memory-episodic-records.steps.mjs"]
---

# 157/01 · Episodic records resolve to their sources

## User story

As an agent building, verifying or reviewing an item,
I want the item's findings, raw feedback and terminal runs indexed as memory records,
each pointing at the exact line or JSON value it came from,
so that what already happened on an item can be recalled and checked against its source
instead of re-read from every ledger by hand.

## Tasks

- [ ] `tasks/00_findings-feedback-and-terminal-runs-become-records.feature` — the three types are compiled from existing sources on both backends
- [ ] `tasks/01_every-episodic-record-resolves-to-its-source.feature` — the locator grammar, its resolver and the index version

## Notes

- Read and write sets were derived from source imports, not the graph: the graph build timed out
  at refine (ARCHITECTURE, Recall and source evidence). The owning suite of every declared source
  file is in `files:`, and so is the source-directory budget control (153/02 measured it rising).
- FF-15701 lands here, registered in `test/arch/memory/index.mjs`.
- m148/FF-14801's live-corpus eval runs over the records this story adds, so it must stay green
  here; a red is fixed in the ranking, never in its expected pairs.
- The layer map, counters, block line and `--all` are 157/02's. Until it lands, status counts the
  new types as `unmapped`, which m148/ADR-004 already reports honestly.
