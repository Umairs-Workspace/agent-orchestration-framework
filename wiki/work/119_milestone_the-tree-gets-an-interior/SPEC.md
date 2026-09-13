---
type: milestone
number: 119
slug: the-tree-gets-an-interior
title: "The tree gets an interior — three flat layers, two god-nodes, and the guard that forbids the fix"
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
origin: [../TECH_DEBT.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 119 · The tree gets an interior — three flat layers, two god-nodes, and the guard that forbids the fix

## Objective

The debt ledger's heaviest entries are all one finding measured in different directories: **this
repository has no interior structure, and every control that exists is blind to that.** Re-measured
at HEAD, 2026-09-06:

| subject | measured now | ledger entry |
|---|---|---|
| `src/` — 315 `.mjs`, 98,929 lines | **159 flat root modules** (31 `mesh-*`, 40 `work-*`) | item 10 |
| `src/commands/` | **99 flat siblings**, 21,715 lines (17 `mesh-*`, 9 `assets-*`, 6 `graph-*`) | item 78 |
| `test/` / `test/arch/` | **589** and **433** flat siblings; `scripts/test.mjs` **5,142** lines / **1,030** spreads | item 63 |
| `src/mesh-worker-execution.mjs` | **2,482** lines, 54 dependents, 29 imports — the mesh's god-node on both axes | item 83 |
| `src/command-core.mjs` | **581** lines, 59% prose, two lines of code per command arrival | item 84 |

Nothing here is broken, and that is the whole argument. Each number is a **trend line**, and each
trend is still climbing: `src/commands/` was 18 siblings on 2026-07-01 and 91 on 2026-08-31 — it is
99 six days later. `test/arch/` gained 48 siblings and `scripts/test.mjs` 580 lines in the three days
before the last re-measure. A per-diff review cannot see any of this; only the trend line can, and the
ledger is the only place the trend line lives. Item 78 states the trap exactly: item 10's
measurements walk `src/` root and stop, item 63's walk `test/arch/`, and **the fastest-growing flat
directory in the tree is the one neither entry can see.**

Two entries are not symptoms but **blockers**, and they are why previous stories routed this work here
instead of paying it:

- **Item 61 — the purity guard forbids the only decomposition that would fix a module's size.** A
  zero-import ruling reads "may not import even a node builtin", so a `src/<name>/` family is illegal
  and the file must keep growing. `phase-brief.mjs` is **1,651** lines under that ruling (432 when the
  rule was written); `work-loops-checks.mjs` is **1,284** (380). The reviewer who reaches for the
  obvious fix finds it fails CI.
- **Item 81 — a control that STORES a fact about the tree sends its next bill to a stranger.** Six
  carriers in three families: closed member censuses, ratchet constants whose failure message says
  moving them needs an ADR, and `<path>:<line>` citations that any inserted line invalidates. It has
  already forced **four consecutive stories** of one milestone outside their declared write sets. A
  milestone that moves several hundred files trips every one of them, from stories that have never
  read the controls.

So the order is forced: **rule the class before moving the tree.** This milestone gives each flat
layer an interior named by the families the filenames already declare, splits the two god-nodes on
seams that a previous split already proved tractable (`mesh-worker-execution.mjs` went 3,286 → 2,313
once, and has regrown +169 since), and replaces stored tree-facts with derived ones so the next move
does not send its bill to a stranger.

**No behaviour changes.** Every move is a move plus an import rewrite; a command's route is declared
in the command, not derived from its path. The verifiable outcome is that the same suites pass, the
counts fall, and the ratchets that watch them can no longer be blind to a layer.

## Scope

In scope:

- **`src/` root gets an interior** — the families the names already declare (`mesh-*` 31, `work-*` 40
  are 45% of the flat root), plus the subject-named home item 10 names for the face-named module the
  spine imports (`board-worker-stream.mjs`, 9 dependents). — item 10
- **`src/commands/` gets an interior** — `mesh/` (17), `assets/` (9), `graph/` (6) first, and the
  layer gains a column in the measurement that is currently blind to it. — item 78
- **The test tree gets an interior** — `test/` and `test/arch/` grouped by subject with a
  per-directory index the registry spreads, so `scripts/test.mjs` stops growing a spread per suite. — item 63
- **The two god-nodes are split** — `mesh-worker-execution.mjs` on the seam its own prior extraction
  proved, and `command-core.mjs`'s per-command rationale moves out of the registry. — items 83, 84
- **The blockers are ruled, first** — a purity guard constrains a module's *external* dependencies,
  not its file count; and a control derives its fact about the tree rather than storing it. — items 61, 81
- **Discharge, not annotation** — items 10, 61, 63, 78, 81, 83, 84 are **deleted** from `TECH_DEBT.md`
  at accept. The ledger carries no closed entries; git history and this milestone's ref are the record.

Out of scope:

- **`ui/src` and its budget table** (items 18, 28, 33) — a second toolchain with its own ratchet at
  its ceiling; grouping it is the same species and a different milestone's subject.
- **The bundled prompt layer** (item 79) — flat and repetitive for the same reason, but it is prose,
  not modules, and its consumers are agents rather than importers.
- **Suite-size entries** (items 64, 65, 66) — three oversized `work-loops-*` suites. Downstream of
  item 63's partition: split them before the tree has an interior and they land back in a flat
  directory.
- **The ledger's sharp-edged defects** (items 27, 36, 9, 25, 30) — red suites, the junction that eats
  `ui/`, the silent co-authored overwrite, the four-homed port map. Real and severe, but a different
  axis; they stay open on the ledger with their numbers intact.
- **Any behaviour change, ratchet raise, or new capability.** A count-only cap with no admitted
  decomposition is item 61's measured failure and is explicitly not the fix here.

## Stories

Five, in a forced order: the blockers are ruled first, the three flat layers gain interiors, and the
god-node is split last — inside the family it needs `119/01` to have created. See
`ARCHITECTURE.md#ADR-004` for the third blocker this refine measured, which the framing above missed.

- [x] `119/00` — **Rule the guards that forbid the fix** — purity is external, a control derives its
      facts, a cited path survives a rename. Items **61**, **81** + ADR-004. **Nothing moves before
      this merges.**
- [x] `119/01` — **`src/` gets an interior** — `src/mesh/` (31), `src/work/` (40), one subject-named
      home. 159 flat root modules -> 88. Item **10**.
- [x] `119/02` — **`src/commands/` gets an interior, and the registry stops explaining itself twice**
      — `mesh/` (17), `assets/` (9), `graph/` (6); 99 -> 67. Sole writer of `src/command-core.mjs`.
      Items **78**, **84**.
- [x] `119/03` — **The test tree gets an interior** — 589 + 433 flat siblings grouped by subject, a
      per-directory index the registry spreads. Item **63**.
- [x] `119/04` — **The mesh god-node is split** — launch composition, then repo admission; the
      exported surface held identical. Item **83**. **Last.**

## Dependencies

- **Item 61's ruling and item 81's derive-don't-store seam gate everything else.** A `src/mesh/`
  family is illegal under the current purity reading, and any file move trips a stored census, a
  ratchet constant or a `<path>:<line>` citation that the moving story cannot know exists.
- **`test/arch/acd-debt-ledger-budget.test.mjs`** — the shrink-only ratchet on `TECH_DEBT.md`. Seven
  discharged entries move it down; it may never rise.
- **`aof graph impact`** — the fan-in/fan-out measurements every split is planned against, and the
  before/after evidence each story records.
