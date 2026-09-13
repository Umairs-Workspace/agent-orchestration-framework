---
type: milestone
number: 127
slug: backlog-and-archive
title: "Backlog and archive — the work tree holds what is live"
status: in-progress
owner: product-owner
created: 2026-09-11
updated: 2026-09-12
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 127 · Backlog and archive — the work tree holds what is live

## Objective

**The work directory is a file tree an operator reads, and today it shows everything that ever
happened in the order it was numbered — 127 folders, 123 of them `done`, with the four live items
somewhere in the middle.** The tree's shape carries no information about what is live, and every
item is numbered the moment it is thought of, so the stream's order is the order of ideas rather than
the order of work.

Measured on 2026-09-11, at `9b64eb32`:

| fact | value |
|---|---|
| items at the stream root | 127 — 67 milestones, 35 chores, 17 stories, 4 spikes, 1 uat |
| of which `done` | 123 |
| live (`in-progress` / `not-started` / `blocked`) | 4 |
| cross-item citations by NUMBER in `wiki/work` (`m52/ADR-003`, `119/00`, `depends: [121]`) | 3,102 |
| relative prose links between sibling items | 82 — 81 of them done → done |
| files outside `wiki/` that READ a live item path at runtime | 1 (`test/arch/planning/acd-tune-carries-no-second-rule.test.mjs:21`) |
| modules that enumerate the work root with their own `readdir` + `ITEM_RE` match | 8 — `listItems` in `src/work.mjs` and seven others |
| homes of `ITEM_RE` | 3 (`src/work.mjs`, `src/work/doctor.mjs`, `src/commands/migrate-folder.mjs`) |
| places a number is minted for a new item | 2 — the `aof:add-*` prompts ("max NN + 1", agent arithmetic) and `appendPosition` in `src/commands/insert-shared.mjs` |
| the `insert-*` family that exists because numbering happens at add time | 4 verbs, `insert-shared.mjs` 622 lines, `reindex.mjs` 373 lines |

Two things are wrong, and they are one design decision seen from both ends.

**A number is minted too early.** `aof:add-milestone` computes `max NN + 1` and writes the folder
into the stream, so an idea captured today is ordered ahead of everything captured tomorrow — before
anyone has decided whether it is next, or ever. The `insert-*` verbs and the reindex engine exist to
repair that ordering after the fact, and they are the second-largest command family in the tree.
Every renumber invalidates a citation somewhere.

**A number is never retired.** An accepted item keeps its folder at the root beside the live ones,
because the number is its identity — 3,102 citations say so, and renumbering is not on the table.
But identity is a number, not a location: the same `ITEM_RE` resolves `52_milestone_…` wherever the
folder sits, and 81 of the 82 prose links between items would survive a move together.

This milestone gives the tree two more roots and one rule for each:

- **`backlog/` — un-numbered, in.** A new item is born in `<work.dir>/backlog/`, identified by its
  slug, grouped by whatever sub-folders the operator likes, carrying no number and gating nothing.
  It gets its number at the moment it is **promoted** into the stream — one verb, one home for
  "the next number", and `--at P` is what `insert-*` becomes.
- **`archive/` — numbered, out.** An accepted item is **archived** by moving its folder, name
  verbatim, under `<work.dir>/archive/`. Nothing is renumbered, nothing is rewritten that a citation
  depends on, and every reader that resolves by ref still finds it. Only the walkers that answer
  "what is next" stop seeing it.

The root of `<work.dir>` then holds exactly the items that are live, and reads as the answer to
"what is happening" rather than "what has ever happened".

An outsider can verify this milestone was met by: adding an item and finding it under `backlog/`
with no number; promoting it and finding it at the root with the next number, with `aof work find`,
`validate`, `next` and the board all seeing the same item; archiving a done milestone and finding
`aof work find 52`, `aof work read 52`, `memory ingest`, `depends` resolution and `validate` all
still answering for it while `next`, `loop` and the default listings do not; and reading the root
of `wiki/work` as a short list of live items.

## Scope

In scope:

- **Un-numbered intake.** `<work.dir>/backlog/[<group>/…/]<type>_<slug>/` holds a driver
  (milestone, chore, spike, uat, or parentless story) with no number. Its identity is its slug, which
  is already an admitted ref form (`findWork`'s free-text branch), so `aof work find <slug>` resolves
  it with no new grammar. The type stays in the folder name so the scanner never opens a doc to
  classify. Sub-folders are permitted at any depth and carry **no semantics** — the group is the
  relative path shown in listings, nothing more.
- **One enumerator, three roots.** `listItems` in `src/work.mjs` scans the stream root, `backlog/`
  and `archive/`; a backlog row carries `number: null, ref: <slug>, backlog: <group path>`, an archived
  row carries `archived: true` with its folder name and number untouched. The seven other modules
  that `readdir` the work root with their own `ITEM_RE` match are pointed at `listItems`, the three
  `ITEM_RE` homes become one, and a fitness function holds both: no second root-scanner, no second
  `ITEM_RE`. Every consumer of `.number` (33 `parseInt` sites) either handles `null` or filters the
  backlog first, and a control says so.
- **`aof work promote <slug> [--at P]`** — the one place a number is minted. Default appends
  (absorbing `appendPosition`); `--at P` inserts and re-indexes through the existing reindex engine.
  The `insert-*` verbs become thin aliases of `promote --at` or are retired — whichever the
  architect finds smaller; the reindex engine gains no second caller. A backlog item's `depends:`
  (numeric, naming stream items) is validated at promotion; a backlog → backlog dependency is refused
  as a planning note rather than a gate. `aof:refine` and `aof:continue` call `promote` as step 0 when
  handed a backlog ref, so every type — including chore and spike, which have no refine step — has one
  door into the stream.
- **`aof work archive <NN> | --done`** — moves an accepted driver's folder, name verbatim, to
  `<work.dir>/archive/`; a story done under a live milestone stays in its milestone and moves with it.
  Explicit only — never automatic on `done`, so the verify ceremony never moves a folder the same
  session is still citing. The verb updates the one live path-reader, rewrites the relative prose
  links that cross the archive line, and publishes the new `dir` to the fleet cache; the memory index
  is regenerated by the existing `memory ingest`.
- **Archived is not invisible.** `find`, `read`, `doc`, `memory ingest`, `depends` resolution,
  `validate` and `doctor` see the archive as part of the stream. `next`, `loop` scope, and the
  default `list` / `recent` / board views exclude it, each with an `--all` (or equivalent) that
  includes it.
- **`work.intake: "backlog" | "stream"`** — the write-side default for where `aof:add-*` lands.
  `aof work init` writes `"backlog"` for a new project; an absent key reads as `"stream"`, so an
  existing project is unchanged without a migration. The READ side is mode-less: the scanner reads
  `backlog/` and `archive/` whenever they exist, under either setting. This repository sets
  `"backlog"` explicitly as part of the milestone.
- **Backlog holds drivers only.** A backlog milestone has no `stories/`; `aof:refine` creates them
  after promotion, and `aof:add-story` under a backlog milestone refuses with "promote first".
- **Fleet cache shape.** The synced item view (`view.items`, `answeredFrom: cache`) carries the
  `number: null` and `archived` shapes, so a remote node's `find` answers for a backlog or archived
  item exactly as the owning node does.
- **Bundle parity.** `promote` and `archive` each ship an `/aof:*` wrapper reachable via
  `aof work update`; the `aof:add-*` prompts are rewired to the intake setting; `aof:insert-*` follow
  whatever `insert-*` becomes.
- **The old reader survives the new tree.** A pre-127 `aof` scanning a post-127 project ignores
  `backlog/` and `archive/` (neither matches `ITEM_RE`) rather than failing — measured today by
  `wiki/work/TECH_DEBT.md`, which already sits at the root unmatched.

Out of scope:

- **Group semantics** — an epic, a theme, a fourth hierarchy level. A group is a folder and nothing
  else; if it ever needs meaning, that is another milestone.
- **Renumbering, ever.** Archive is a move; promotion mints a number once. No verb in this milestone
  changes a number an item already has, and no citation is rewritten to a different number.
- **Automatic archiving on `done`** — deferred deliberately (see in-scope: explicit only).
- **Hiding `done` items in place** as an alternative to moving them — the tree is the requirement.
- **Moving an already-numbered item INTO the backlog** — a backlog item is born there; a numbered item
  that is not wanted is `blocked` or deleted, not de-numbered.
- **`promote-finding-to-chore` / `promote-gap-to-chore` landing in the backlog** — these are
  loop-driven and append to the stream without renumbering so the loop can schedule them; the intake
  setting governs `aof:add-*` only. Revisit if the backlog turns out to be where they belong.
- **Archiving items that are not `done`** — a `blocked` uat or an abandoned milestone is a status
  question, not a location one.

## Stories
- [x] `01_story_one-enumerator-three-roots` — One Enumerator Three Roots.
- [ ] `02_story_promote-mints-the-number` — Promote Mints The Number.
- [ ] `03_story_archive-is-a-move` — Archive Is A Move.
- [ ] `04_story_the-fleet-and-the-board-see-the-shapes` — The Fleet And The Board See The Shapes.
- [ ] `05_story_this-tree-holds-what-is-live` — This Tree Holds What Is Live.

<!-- The stories that compose this milestone. Each is its own NN_story_<slug> item with parent: NN.
     Populated at the Break-down stage (refine); "to be broken down" until then. The milestone is
     accepted when all its stories are. -->

- [x] `stories/01_story_one-enumerator-three-roots` — `listItems` walks the stream, `backlog/` and `archive/`; `ITEM_RE` has one home; the seven second-scanners retire onto it; one live-row predicate decides which walkers filter (ADR-001, ADR-002)
- [ ] `stories/02_story_promote-mints-the-number` — `aof work promote <slug> [--at P]` is the one mint; `insert-*` become what `promote --at` is; `work.intake` is the write-side default the `aof:add-*` prompts read (ADR-003, ADR-005) — depends on 01
- [ ] `stories/03_story_archive-is-a-move` — `aof work archive <NN> | --done` moves an accepted driver under `archive/` name verbatim, rewriting only the crossing prose links (ADR-004) — depends on 01
- [ ] `stories/04_story_the-fleet-and-the-board-see-the-shapes` — the synced view carries `number: null` / `archived`; the board shows the backlog and hides the archive behind one toggle (ADR-006, DESIGN.md) — depends on 01
- [ ] `stories/05_story_this-tree-holds-what-is-live` — this repository sets `work.intake: "backlog"`, archives its done items, and the outsider check passes on the real stream — depends on 01–04

## Dependencies

- `src/work.mjs` `listItems` / `ITEM_RE` (41/ADR-001 exported the regex so `reindex.mjs` consumes
  the same identity) — the one enumerator every new root is added to; this milestone extends it and
  retires the seven second-scanners onto it.
- `src/work/reindex.mjs` + `src/commands/insert-shared.mjs` `appendPosition` — the number-minting
  and re-indexing machinery `promote` absorbs; no new engine.
- The fleet item cache (`view.items`) — the synced shape must carry `number: null` / `archived`
  before a remote node can answer for either kind of item.
- `aof work update` bundle parity — every new verb ships its `/aof:*` wrapper in the same milestone.
