---
type: story
number: 01
slug: src-gets-an-interior
title: "src/ gets an interior — src/mesh/ (31), src/work/ (40), one subject-named home, and one table that can see every flat layer"
parent: 119
depends: [119/00]
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
adrs: [ADR-005, ADR-008, ADR-009]
reads:
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-005
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-008
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-009
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-004
  - src/cited-path-resolve.mjs
  - src/command-core.mjs
  - src/cli.mjs
  - src/spine/face.mjs
  - src/work.mjs
  - src/cache-read.mjs
  - test/arch/acd-controls-never-execute.test.mjs
  - wiki/work/TECH_DEBT.md
files:
  - src/
  - test/
  - scripts/
  - ui/src/
  - test/arch/acd-source-directory-budget.test.mjs
  - test/arch/acd-path-is-not-behaviour.test.mjs
  - scripts/test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 01 · `src/` gets an interior

## User story

As **a reader arriving at `src/`**,
I want **the families the filenames already declare to be directories** — `src/mesh/` (31 modules),
`src/work/` (40), and one subject-named home for the face-named module the spine imports —
so that **which layer I am in is a fact about the tree rather than something I reconstruct from a
filename prefix**, and so that the next sibling is a decision somebody takes rather than the default.
159 flat root modules today, 88 after; the count was 51 on 2026-07-01 and nothing in the tree resists
the next one.

## Tasks

- [x] `tasks/00_the-mesh-family-gets-a-home.feature` — `src/mesh-*.mjs` (31) → `src/mesh/`, and the
      import line of every dependent tree-wide. A move plus an import rewrite; no behaviour changes.
- [x] `tasks/01_the-work-family-gets-a-home.feature` — `src/work-*.mjs` (40) → `src/work/`. The five
      existing `src/work-*/` directories are **not** nested (ADR-005: priced at 536 wiki citations
      for zero root-module reduction), and `src/work.mjs` does **not** move (293 dependents).
- [x] `tasks/02_the-subject-named-home.feature` — `src/board-worker-stream.mjs` → `src/cache-read.mjs`,
      the rename item 10 names for the face-named module the spine imports (11 dependents).
- [x] `tasks/03_every-flat-layer-is-a-row.feature` — FF-11904's one directory-budget table with a row
      per flat layer (`src/` root, `src/commands/`, `test/`, `test/arch/`), ceiling **equal** to the
      measured count and shrink-only; plus FF-11905, that no route, command id or registry key is
      derived from a path.

## Notes

- **`files:` is declared at directory scale, deliberately.** 657 files carry an import of a
  `src/mesh-*` or `src/work-*` module (`grep -rlE '(from|import\()\s*"[^"]*\b(mesh|work)-[a-z0-9-]+\.mjs"'
  over `src test scripts app`, 2026-09-06). Enumerating them would be honest and unusable, and stale
  between refine and build. The trees this story may write are `src/`, `test/`, `scripts/` and the one
  desktop UI file the graph reports as a dependent — and inside them it writes **import lines and
  nothing else**, which is the invariant FF-11905 exists to hold. See the milestone `STATE.md` for the
  decision and its cost.
- **Every write here is a move plus an import rewrite** (ADR-008). No route, command name, lane
  membership or bundle target is derived from a filename, so no behaviour changes — stated positively
  and *enforced* by FF-11905, not merely asserted.
- **The 398 wiki citations of `src/mesh-*` / `src/work-*` paths are what `119/00` bought.** Without
  ADR-004's resolver every one of them would strand permanently in a delivered, immutable document.
  This story is admitted **because and only because** the resolver landed first.
- **The budget table lands here, with the first cut, not as three separate ratchets** (ADR-009) —
  three would rebuild exactly the blind spot item 78 measured, where the fastest-growing flat
  directory is the one no entry can see.
- **`59/FF-5905` reds loudly on this move** and this story re-points it: its
  `startsWith("work-doctor")` sweep is backed by a non-vacuity leg, so it fails rather than emptying.
  That is the derive-don't-store ruling working as intended, one story after it landed.
- **BLOCKER, found at contract authoring: `src/work-loops.mjs:318` derives the package root from its
  own module location, so the move changes it silently.**
  `const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));` — two hops from
  `src/work-loops.mjs` is the repository root; from `src/work/loops.mjs` it is **`src/`**. Its consumer
  at `:964` (`const pointerRoot = record.framework ? PACKAGE_ROOT : root`) resolves framework
  loop-record ceiling pointers, so every one of them would stop resolving and emit
  `loop-ceiling-pointer-unresolved`. It is the **only** self-located constant in the 71-module moving
  set (`grep -ln 'fileURLToPath(import.meta.url)' src/mesh-*.mjs src/work-*.mjs` returns it alone).
  This is a behaviour change caused by nothing but path depth — precisely the claim ADR-008 makes —
  and it is fixed inside this story, codified in `tasks/01`.
  **Note for the structural review:** FF-11905 enumerates five subjects (route, command name, lane
  membership, bundle target, registry ordering); a self-located root is none of them, so the control
  as declared would not catch the next instance even though ADR-008’s headline sentence covers it.
  A sixth leg is carried in `tasks/03` rather than by re-opening the register.
- **BLOCKER: five arch controls gate their real assertion on `existsSync` over a subject this story
  moves, and would pass green having asserted nothing.** Four over `src/work-upgrade.mjs`
  (`acd-upgrade-engine-blast-radius:65`, `acd-upgrade-idempotent:31`,
  `acd-work-item-schema-single-constant:33`, `acd-reconstructed-marker-expressible:42`) and one over
  `src/work-read.mjs` — `test/arch/acd-cache-read-surface-boundary.test.mjs:214`, whose
  `if (!existsSync(READ_SEAM)) return;` disarms 43/ADR-005’s entire direction guard. A control that
  reads green while guarding nothing is undetectable at review, which is what makes this unsafe rather
  than merely wrong. Fixed in-story, codified in `tasks/01` with `src/work-trigger/` (a directory that
  does not move) as the negative case. **Open question for the architect:** FF-11902’s non-vacuity
  claim is written over *sweeps*; an `existsSync`-guarded early `return` has no subject set, so it is
  not clear `119/00`’s control reaches this shape.
- **`src/work-audit/census.mjs:445` stores a moving module’s path as a child-process argument** —
  `export const PROBE_PROGRAM = “src/work-audit-probe.mjs”;`. Spawned, so a stale value fails at
  runtime in a subprocess rather than at import resolution, and `src/work-audit/toolkit.mjs:14` builds
  the same path a second way. Codified in `tasks/01`.
- **The write set was wrong in BOTH directions, and is corrected.** `app/desktop/ui/app.js` carried
  **zero** references to anything this story moves (its one `src/` mention is a Rust path) and is
  removed. Nine files under `ui/src` **do** carry `src/mesh-*` / `src/work-*` / `board-worker-stream`
  citations — `ui/src/board/api.ts:36` among them — and `ui/src/` is now in `files:`. They are comment
  citations, so nothing breaks behaviourally; they are included because **FF-11903’s resolver sweeps
  `wiki/work/**` only**, so an in-source stale citation is resolved by no gate in this tree — the same
  silent-and-permanent decay chore 106 refused a fold over, one universe across. Leaving them would be
  this milestone sending its own bill to a stranger.
- **“Import lines and nothing else” understates the diff class.** Measured: **178** controls under
  `test/arch/` hold **422 non-comment** `src/(mesh|work)-*.mjs` path literals that are `readFile`
  **subjects**, not import specifiers. A reviewer applying ADR-008’s “anything else in a move story’s
  diff is a finding” literally would flag 422 legitimate edits. **The diff has three kinds, not two**:
  the moved file, the import specifier, and the re-pointed control literal. Named here for the
  structural review; carried in `tasks/00` as a re-pointed-or-red Outline.
- **Two counting rules the ADRs leave open, pinned in `tasks/03`.** `test/` has 590 direct children
  but 589 `*.test.mjs` (`test/installer-shell.mjs` is the difference), so the ceiling must come from
  the same rule as the sweep. And after this story **21** flat directories exist under `src/` and
  `test/` against 4 named rows — 17 owe a row or a reasoned exemption, `test/support/` at 66 files
  being the largest unentered layer. `src/mesh/` and `src/work/` are created by the diff that authors
  the table; `test/arch/`’s row must count this story’s own two new controls (433 → 435).
