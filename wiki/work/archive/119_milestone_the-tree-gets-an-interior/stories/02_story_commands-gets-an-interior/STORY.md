---
type: story
number: 02
slug: commands-gets-an-interior
title: "src/commands/ gets an interior, and the registry stops explaining itself twice — mesh/ (17), assets/ (9), graph/ (6), and 68 comment blocks of which 10 are genuinely two-homed"
parent: 119
depends: [119/00]
status: done
owner: product-owner
created: 2026-09-06
updated: 2026-09-07
adrs: [ADR-006, ADR-008]
reads:
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-006
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-008
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-004
  - src/cited-path-resolve.mjs
  - src/cli.mjs
  - src/spine/face.mjs
  - src/work.mjs
  - test/command-core-contract.test.mjs
  - test/arch/acd-mesh-command-cli-bijection.test.mjs
  - test/arch/acd-graph-command-cli-bijection.test.mjs
  - test/arch/acd-work-command-cli-bijection.test.mjs
  - test/arch/acd-work-command-route-coverage.test.mjs
  - test/arch/acd-command-route-derived.test.mjs
  - wiki/work/TECH_DEBT.md
files:
  - src/command-core.mjs
  - src/commands/
  - src/cli.mjs
  - test/
  - test/arch/acd-mesh-ui-single-data-command.test.mjs
  - test/arch/acd-graph-no-face-spawn.test.mjs
  - test/arch/acd-console-log-confined.test.mjs
  - test/arch/acd-registry-cites-never-explains.test.mjs
  - scripts/test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 02 · `src/commands/` gets an interior, and the registry stops explaining itself twice

## User story

As **the author of the next command**,
I want **the command directory to have the families its filenames already declare, and the registry
to cite rather than explain**,
so that **registering a command costs one import and one array entry instead of one import, one array
entry and the same rationale written twice in prose that nothing keeps in step** — which is the
measured arrival today: milestone 63's command landed 18 lines in `src/command-core.mjs`, of which
**2 were code and 16 were prose in two places**.

## Tasks

- [x] `tasks/00_the-command-families-get-homes.feature` — `src/commands/{mesh,assets,graph}-*.mjs`
      (17 + 9 + 6) → `src/commands/{mesh,assets,graph}/`, and the import specifiers in
      `src/command-core.mjs` that name them. 99 flat siblings → 67.
- [x] `tasks/01_the-registry-cites-never-explains.feature` — FF-11908: each command's registry comment
      becomes a **single line** whose content is a citation (`m?<itemRef>/<ID>`), with the prose moved
      to the command module's own header. The deferred-import comments that document the TDZ ring
      (TECH_DEBT item 26) are the one **exempt** class and must still be present afterwards.

## Notes

- **This story is the milestone's SOLE writer of `src/command-core.mjs`** (ADR-006). That is the
  reason items 78 and 84 are one story rather than two, and it is graph-derived rather than a
  preference: `aof graph impact src/command-core.mjs` (graph built 2026-09-06T00:48:13.342Z) reports
  it importing **all 93** `src/commands/*.mjs` modules by path, so the family move and the prose sweep
  land on the same lines. Item 78's own ledger entry says "the route table is unaffected" — true of
  the *route*, false of the *import block*.
- **The two god-nodes do not pair with each other** (ADR-007). The graph reports **no edge in either
  direction** between `src/command-core.mjs` and `src/mesh-worker-execution.mjs`; they share a ledger
  paragraph and nothing else. Item 84 belongs here, with the directory that owns its lines; item 83
  stands alone as `119/04`. This answers the open question the milestone `STATE.md` left for refine.
- **No comment-density number is asserted** — a count-only cap with no admitted decomposition is item
  61's measured failure, and this story declines to repeat it one directory over. FF-11908 claims a
  *shape* (one line, a citation) over the file that exists.
- **`src/commands/` may be written broadly** because the move rewrites relative import specifiers
  inside the moved modules themselves; the story writes no behaviour. 36 files outside
  `src/command-core.mjs` carry an import of a moved command module (measured 2026-09-06).
- **Depends on `119/00` merging first** — ADR-004's resolver, or the bijection controls' path
  citations strand.
- **FF-11908’s exempt-class leg is VACUOUS over the subject the register row names — a Blocker,
  absorbed by the contract, still owed a register amendment.** `grep -c 'await import('
  src/command-core.mjs` returns **0**: the deferred-import comments TECH_DEBT item 26 names are not in
  the registry at all, they are one directory over in `src/commands/` (10 sites across 8 modules).
  Item 84’s phrase “this file’s deferred-import comments” is where the error entered. Authored as the
  row states, the exempt-class leg would pass over the empty set **permanently** — the silent carrier
  ADR-003 §4 forbids — and the deletion the row says it must not cause would go unguarded in the
  directory where it can actually happen. `tasks/01` scopes the exempt class to `src/commands/**` with
  a derived set and a floor, so the build is correct; the ADR row’s wording is a **finding for the
  structural review**, not an ADR re-opened here.
- **The measured decomposition, replacing the “93 rationale blocks” this story’s title first carried.**
  `src/command-core.mjs` holds **68** contiguous `//` blocks: 1 module header, **47** above
  `./commands/*` imports, 13 inside the `COMMANDS` array, 6 over the registry’s own API. Of 105
  registered commands, 55 bindings carry an import block, and the genuinely **two-homed** set is
  **10** (`loopDocument`, `loopRecord`, `audit`, `trigger`, `test`, `meshAssign`, `workOrchestrator`,
  `resync`, `assetsList`, `assetsShow`), with 3 more carrying an array block and no import block. 93
  was the import count, not a block count — a number without its command, which is the species this
  milestone exists to prevent, in this milestone’s own record. Corrected at refine.
- **ADR-006 §1 is wrong for two of its four “intra-directory leaves”.** `src/commands/mesh-gate.mjs`
  is imported by **seven siblings that stay flat** (`doc`, `doctor`, `loop`, `resume`, `run-retry`,
  `run-start`, `tasks`) plus two suites; `src/commands/mesh-session.mjs` is imported by
  `src/cli.mjs:44` and 13 test files. Only `mesh-face-shared.mjs` (13 intra-family importers) and
  `graph-shared.mjs` (3) are genuinely intra-directory. The post-move shape is therefore a mesh-family
  leaf that seven non-mesh commands reach into — loud on arrival, so not a build blocker, but it is
  not “the shape the directory was always describing”. Finding for the structural review.
- **Two filename-prefix sweeps are affected, not one**, and they fail differently:
  `test/arch/acd-mesh-ui-single-data-command.test.mjs:73` filters `startsWith(“mesh-”)` inside a
  `try/catch` that sets `files = []` — **silent**, exactly ADR-003’s species; and
  `test/arch/acd-graph-no-face-spawn.test.mjs:165` filters `/^graph-.*\.mjs$/` behind
  `assert.ok(commandFiles.length >= 3)` — **loud**. Both are now in `files:`.
- **The write set gained `src/cli.mjs` and `test/`.** Measured as required by the move: `src/cli.mjs`
  (imports `./commands/mesh-session.mjs` at `:44`), **27 test suites + 2 `test/support/` fixtures**
  importing moved modules, and **21 arch controls holding a moved path as a stored string literal**
  (28 occurrences) — the item-81 species again, and the reason `119/00` lands first.
