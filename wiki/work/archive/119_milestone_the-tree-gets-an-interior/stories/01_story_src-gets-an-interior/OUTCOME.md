# 119/01 · `src/` gets an interior — Outcome

## Delivered

### `src/` has an interior named by the families its filenames already declared
`src/mesh/` holds the 31 `mesh-*` modules and `src/work/` the 40 `work-*` modules, and the
face-named module the spine imports has a subject-named home (`src/board-worker-stream.mjs` →
`src/cache-read.mjs`). The flat root fell from 160 modules to 89 — exactly the families' size, with
the invariant "the root falls by exactly the family's size" holding to the unit.

### Every flat layer is a row in ONE table
`test/arch/testing/acd-source-directory-budget.test.mjs` carries a per-directory sibling ceiling for
`src/` root, `src/commands/`, `test/` and `test/arch/`, and the ceiling EQUALS the measured count with
no headroom — so a new sibling fails CI and a story that shrinks a layer must lower its row. The
claim holds in BOTH directions: every flat directory under `src/` and `test/` is either a row or a
declared exemption, so a table naming three of four layers cannot pass on the fourth.

### No path in this tree is load-bearing for behaviour
No route, command name, lane membership, bundle target or registry ordering is derived from a
filename or a directory name. `src/command-core.mjs` and `src/spine/face.mjs` spell no
`path.basename`/`path.dirname`/`path.parse`-derived identifier that reaches a route, a command id or
a registry key, and `COMMANDS` order is a declared array order the route table reads, never a
directory listing.

## Assumptions

- **A move story's diff has THREE kinds, not two** — the moved file, the re-based import specifier,
  and the re-pointed path citation in the module's own header (63 non-specifier lines across 45 of 71
  files, every one a path citation, no exported name or body logic touched) (`m119/F-12`).
- **A degrade code is not a path** — `src/cache-read.mjs` still emits `"board-worker-stream"`,
  deliberately: changing an emitted identifier in a diagnostic vocabulary would be the one behaviour
  change in a story whose whole claim is that it makes none (`m119/F-14`).
- **The budget table's rows carry DELIVERED counts** — the count on the day the table lands, not the
  count on the day the contract was written, which had already moved when `119/00` merged.

## Gaps

### Bare-basename prose mentions
- **Status:** open
- **Discharge condition:** a control that resolves a cited module NAME, not only a `src/**.mjs` path.
871 comment lines across 300+ files name `mesh-worker-execution.mjs` and `work-doctor.mjs` without a
`src/` prefix. They are now stale, and no gate in this tree reaches them: FF-11903 sweeps path
tokens, and a bare basename is a name (`m119/F-13`).

### The second self-located package root
- **Status:** open
- **Discharge condition:** `src/commands/loops-groundedness.mjs:8` derives its root from the package
  rather than by counting directory hops.
FF-11905's sweep covers the modules whose DEPTH this story changed (`src/mesh/`, `src/work/`), so a
hop-counted root in a file that did not move is outside it, and no later story of this milestone
moves that file either (`m119/F-17`).
