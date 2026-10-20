---
type: story
number:
slug: a-built-graph-travels-to-another-machine
title: "A built graph travels to another machine — a second clone reuses it instead of paying for graphify again"
status: not-started
owner: product-owner
created: 2026-10-20
updated: 2026-10-20
schema: 1
aofVersion: 0.1.0
reads: []
files: []
---
# A built graph travels to another machine

## User story

As **the operator who runs the same aof project on more than one machine**,
I want **to carry the code graph already built on one machine over to a clone on another, and have
the next `aof graph build` there update it incrementally**,
so that **I don't pay for a second full graphify extraction (time and LLM tokens) just because
the work moved machines. The graph stays out of git (10/ADR-005: derived and disposable, never a
second authoritative copy), so today copying the folder by hand is the only way to reuse it.**

## Tasks

## Notes

- Scope: the CODE graph only, `<projectRoot>/graphify-out/` (gitignored). It's read by
  `aof graph build/query/impact/triage`, test selection (`work/src/testing/select.mjs`),
  story-contract derive, the seam-liveness audit and the graph MCP server. The verb belongs in the
  existing `aof graph` family; never add a sibling.
- The memory store is out of scope. Its records are parsed from the committed `.md` stream, and
  `aof work memory reindex` rebuilds them cheaply. Its optional re-rank graph
  (`.aof/memory-graph/graphify-out/`) fails soft.
- The bundle must carry graphify's own cache. Without it, the receiving build is a full re-extract.
- Stamp the source commit (and graph age) into the bundle so the receiver can show how stale it is.
  The agent prompts already surface a reused graph's age.
- Open unknown: does `graph.json` store repo-relative or absolute source paths? If absolute, import
  must rebase them to the receiving clone root (Windows ↔ macOS ↔ WSL). Research before refine.
- Out of scope: committing either graph, or syncing graphs over the mesh automatically.
