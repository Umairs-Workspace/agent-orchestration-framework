---
type: milestone
number: 164
slug: project-changes-reach-the-global-store
title: "Every project change reaches the global store — local files stay canonical, every change is noticed and owed in the existing journal, and one sync pass lands it whether or not the desktop app is running"
status: done
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
tags: [mesh, sync, global-store]
---
# 164 · Every project change reaches the global store

## Objective

The global store (`~/.aof/mesh/work/projection.sqlite`) shows what each project's work tree
actually says, and every reader answers a project's own items from its own files. Today a change
reaches the store only when a verb raises an event. Hand edits, skill-written records, `git pull`
and scaffolds raise none, so they never arrive. The desktop app does not help: its daemon publishes
only the workspace in its own cwd, which has no config, so no daemon pass ever re-reads a project.
Meanwhile `aof work find`/`list`/`next` lay the cached status over the local frontmatter
unconditionally, so a stale copy hides a correct file.

The operator's rulings at framing (2026-10-19) set the design:

- **Local files are canonical on reads and on writes**, for a project's own items. The store is
  a projection updated only from files (34/ADR-003). It adds what this project's disk does not
  hold: other projects, and work another machine owns.
- **Every change is noticed.** One sync pass compares each workspace with the last state it
  observed, and runs on three occasions: every daemon tick, over every registered workspace; the
  daemon's start, as catch-up; and every CLI command, for its own workspace.
- **The ledger is the existing effects journal.** It is extended with idempotent, per-workspace
  "workspace changed" marks. No sibling ledger store is added. An owed sync never gives up, so a
  change made while the desktop app is off lands on the next drain.

An outsider can check it. Stop the desktop app. Hand-edit a story's status and `git pull` a commit
in another project. `aof work find` in the first project shows the edit immediately. Start the
app: both changes appear in fleet and in the global store's rows, without a single `aof work` verb
being run. (`aof work find` answers the workspace it runs in, so the cross-project view is fleet;
corrected at verify, 164/F-03.)

## Scope

In scope:
- Files win for a node's own records. A local change takes authorship of its row; another
  machine's live work is still protected by the assignment lock. ADR-001.
- One "changed since observed" baseline that only a successful write advances. ADR-002.
- `workspace.changed` marks in the existing journal, collapsed per workspace. ADR-003.
- One sync pass with three drivers: CLI command, daemon start, daemon tick over every registered
  workspace. ADR-004.
- Reads answer a node's own records from its files. ADR-005.
- An idempotent publish retries until done, and the operator can see owed syncs and lag.
  ADR-006 and story 03.

Out of scope:
- Cross-machine transport (the :4182 worker frames and outbox acks): unchanged.
- Deleting foreign-authored rows (TECH_DEBT item 13).
- cwd-derived workspace identity (TECH_DEBT item 4), beyond the daemon no longer publishing by
  cwd.
- A new store engine, a file watcher, or any write of a stored row or doc back onto a checkout.

## Stories

- [x] [00 · A local change is noticed and owed](stories/00_story_a-local-change-is-noticed-and-owed/STORY.md) (ADR-001, ADR-002, ADR-003; ADR-004 driver 3)
- [x] [01 · The desktop app syncs every workspace and catches up when it starts](stories/01_story_the-desktop-app-syncs-every-workspace/STORY.md) (ADR-004; after 00)
- [x] [02 · My own items read from my files](stories/02_story_my-own-items-read-from-my-files/STORY.md) (ADR-005; after 00)
- [x] [03 · Owed sync never gives up and shows how far behind it is](stories/03_story_owed-sync-never-gives-up-and-shows-its-lag/STORY.md) (ADR-006; after 00, 02)

## Dependencies

- 34 (global mesh work store): ADR-003 defines the rebuildable projection, and ADR-004 a
  periodic loop that converges direct edits. This milestone delivers what ADR-004 assumed.
- 43 (mesh artifact authority): the authorship rules (ADR-004/ADR-010) and the lock (ADR-003) are
  kept. The cache-first read rule (ADR-005) is narrowed by 164/ADR-005.
