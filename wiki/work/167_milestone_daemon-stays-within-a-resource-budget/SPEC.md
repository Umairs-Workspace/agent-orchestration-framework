---
type: milestone
number: 167
slug: daemon-stays-within-a-resource-budget
title: "The daemon stays within a resource budget — the mesh daemons measure their own cost, hold a tested CPU budget on a user's device, and the desktop app surfaces a sustained overrun"
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
tags: [mesh, desktop, performance]
---
# 167 · The daemon stays within a resource budget

## Objective

The desktop app's daemons (`aof mesh serve --serve` and `aof mesh ui`) cost almost nothing while
the operator is not working, and stay inside a stated budget while a view is open. When something
makes them expensive, the cost is visible and attributed, by one command, before anyone has to dig
through logs. A daemon on a user's device must never quietly burn a core.

The case that prompted this, measured on the Windows control node on 2026-10-19/20: `mesh serve`
held more than one core for about 17 hours (≈38,000 CPU-seconds). Three faults compounded, and
none was visible:

- **An empty cache under a poller.** The global work cache held no rows for the aof workspace,
  so every read fell back to parsing the whole `wiki/work` tree from disk. That logged
  `work-read-cache-unavailable` about every 6 s (≈600 an hour) whenever a view was open, and
  13,728 times in all.
- **A permanent sync failure, retried every tick.** The sync pass for that workspace failed 83
  times on `event-id-conflict` (`workspace-changed:<ws>:<digest> already names a different
  fact`), because a linked worktree published the same workspace id under a different root
  (164/F-06). The change stayed owed and was re-fingerprinted on every tick, so the cache never
  filled.
- **Dead registrations.** 58 registered workspaces were deleted dispatch worktrees, and each was
  tried and reported `workdir-missing` on every tick.

An outsider can check it. Run the daemon over a work tree as large as aof's own, with a viewer
polling: its measured CPU stays under the budget, `aof mesh status --json` reports what the daemon
spent its time on, and a planted fault (empty cache, failing sync) is named there instead of only
in a log file.

## Scope

In scope:
- **Self-measurement.** The daemon records its own CPU and event-loop utilisation, plus counters
  by cause: full-disk reads, cache hits and misses, sync passes and their failures, and requests
  by route and by client. They are reported by `aof mesh status --json` and a `doctor` lane.
- **A budget, and a test that enforces it.** An idle budget and a viewer-open budget (the numbers
  are the operator's to set at refine). A soak test drives `mesh serve` over a large fixture tree
  with a polling viewer and goes red over budget. It runs in the regression gate.
- **The amplifiers removed:**
  - a read of an unchanged tree costs a stat walk, not a parse: concurrent requests collapse into
    one, and the answer is remembered by stat digest;
  - an idle view costs almost nothing: polling is conditional, or it backs off;
  - a permanent sync failure (such as `event-id-conflict`) is surfaced once and backed off,
    never retried every tick;
  - registrations whose workspace no longer exists are pruned, or stop being walked.
- **A supervisor guard.** The desktop app samples its children's CPU. A sustained overrun is
  shown in its UI and logged as a degrade. Nothing is ever killed silently.

Out of scope:
- **Fixing 164/F-06 itself.** It shipped in `74a3a714`. This milestone makes the next fault of
  that kind cheap and visible, not that one.
- **The Mac and WSL workers.** The budget and the soak test are written against the control
  node's daemons first. A worker daemon follows once the shape is proven.
- **CPU profiling in production.** Self-measurement counts causes. A profiler stays a developer
  tool.

## Stories

- [x] [00 · The daemon says what it costs](stories/00_story_the-daemon-says-what-it-costs/STORY.md) (ADR-001, ADR-002)
- [x] [01 · An unchanged work tree costs a stat walk](stories/01_story_an-unchanged-tree-costs-a-stat-walk/STORY.md) (ADR-003; after 00)
- [x] [02 · An idle view costs almost nothing](stories/02_story_an-idle-view-costs-almost-nothing/STORY.md) (ADR-004; after 00)
- [x] [03 · A permanent fault is said once and backed off](stories/03_story_a-permanent-fault-is-said-once-and-backed-off/STORY.md) (ADR-005; after 00, 01)
- [x] [04 · The budget is proven by a soak test](stories/04_story_the-budget-is-proven-by-a-soak-test/STORY.md) (ADR-007; after 01, 02, 03, 05, 06, 07)
- [x] [05 · The desktop shows a sustained overrun](stories/05_story_the-desktop-shows-a-sustained-overrun/STORY.md) (ADR-006; after 00, 02)
- [x] [06 · Local runs reach the store through the ledger](stories/06_story_local-runs-reach-the-store-through-the-ledger/STORY.md) (ADR-008; found by 04's soak)
- [x] [07 · An idle tick walks nothing](stories/07_story_an-idle-tick-walks-nothing/STORY.md) (found by profiling F-04; after 00, 01, 03, 06)

Waves: 00 → 01 ∥ 02 → 03 ∥ 05 → 04. 03 composes 01's digest. 05 and 04 each follow a sibling
only because they share `acd-source-directory-budget.test.mjs` (the arch-test and new-directory
rows), not because they share code.

## Dependencies

- `164_milestone_project-changes-reach-the-global-store`: the sync pass, the effects journal
  and the cache read path that the amplifiers live in.
- `160` (the sharded regression gate): the gate the soak test joins.
- The desktop supervisor (`apps/desktop/`, Rust): it owns both daemons and hosts the guard.
