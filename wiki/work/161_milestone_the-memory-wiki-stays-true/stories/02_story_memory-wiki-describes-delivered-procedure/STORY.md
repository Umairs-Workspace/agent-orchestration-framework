---
type: story
number: 2
slug: memory-wiki-describes-delivered-procedure
title: "The memory wiki describes the delivered procedure"
parent: 161
status: not-started
owner: product-owner
created: 2026-10-14
updated: 2026-10-14
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/161_milestone_the-memory-wiki-stays-true/ARCHITECTURE.md#adr-002, wiki/memory.md, wiki/acceptance-criteria.md, wiki/agents.md, wiki/codex-support.md, wiki/documents.md, wiki/glossary.md, wiki/philosophy.md, wiki/planning.md, wiki/README.md, wiki/ROADMAP.md, wiki/STATE.md, wiki/workflow.md, .aof/aof.config.json, packages/knowledge/src/memory.mjs, packages/knowledge/src/memory/local-retrieval.mjs, packages/knowledge/src/memory/local-indexing.mjs, packages/knowledge/src/memory/episodic-indexing.mjs, packages/knowledge/src/memory/recurrence.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/knowledge/src/memory/none-backend.mjs, packages/work/src/feedback-records.mjs, packages/work/src/doctor/memory-effectiveness.mjs, packages/work/src/cited-path-resolve.mjs, packages/work/src/citation-history.mjs, packages/work/src/audit/controls.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#adr-004, wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-001, wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-002, wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-003, wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-004, wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-005, wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-001, wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-002, wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-003, wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-004]
files: [wiki/memory.md]
---
# 161/02 · The memory wiki describes the delivered procedure

## User story

As a reader learning how AOF remembers prior work,
I want the memory wiki to describe the delivered procedure and link to its sources,
so that I can use recall, evidence and promotion without relying on obsolete claims.

## Tasks

- [ ] `tasks/01_describe-memory-as-delivered.feature` — delivered layers, records and memory procedure.
- [ ] `tasks/02_preserve-scope-and-resolve-citations.feature` — preserved adapter section and a green whole-wiki citation check.

## Notes

Documentation-only ownership. The proposal retained memory.md, removed the doctor
command citation as irrelevant, and added the delivered memory evidence listed in
reads. The graph is unavailable; no complete coupling proposal is claimed.
The optional Claude auto-memory section is preserved byte-for-byte. No other wiki
page currently has a broken source citation; add a precise declaration before
repairing any newly discovered one. Do not modify delivered source contracts.

All inherited dependencies are done. The story can verify its page and the wiki
inventory through the existing resolver before 01 lands. The milestone's final
acceptance additionally runs the new doctor probe after both stories land.
