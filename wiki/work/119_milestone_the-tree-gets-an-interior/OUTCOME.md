# 119 · The tree gets an interior — Outcome

## Delivered

### Every flat layer in this repository has an interior
`src/` root fell 160 → 89 modules, `src/commands/` 99 → 67, and `test/` and `test/arch/` went 591 and
439 flat siblings to **zero**, across 35 and 17 subject directories. The largest directory in the test
tree is now 68. Each layer's interior is named by the families its filenames already declared, so no
grouping is an invention.

### One table meters every flat layer, and it cannot be blind to one
Before this milestone three ledger entries each measured their own directory — item 10 walked `src/`
root, item 63 walked `test/arch/`, and **the fastest-growing flat directory in the tree was the one
neither could see.** A single named table now carries a per-directory ceiling for all four layers,
equal to the measured count with no headroom, asserted in BOTH directions so a table naming three of
four cannot pass on the fourth (`m119/01`).

### A cited path survives a rename, across three readers
One resolver derived from git's own rename records, with no hand-kept redirect table, serves all
three: `aof work doctor`'s control probe, FF-11903's sweep of `src/` citations under `wiki/work/**`,
and — added at `119/03` — suite paths cited in delivered `.feature` files. The third reader is what
made a 1,030-suite move legal without editing 156 immutable records (`m119/00`, `m119/03`).

### Nothing changed behaviour, and that is asserted rather than trusted
The assembled test registry is membership-identical across the restructure — 9,203 entries, 0 added
and 0 removed. `createMeshWorkerExecutionHandler`'s exported surface is identical in both directions.
No route, command name or registry key is derived from a filename. A command's route is declared in
the command, never in its path.

### Five ledger entries are discharged; two are re-measured and kept open
Items **10, 61, 63, 78, 84** are deleted from `TECH_DEBT.md`, taking it 78 entries / 4,082 lines to
73 / 3,634 with the shrink-only ceiling re-stamped down. Items **81** and **83** are deliberately kept
— see Gaps.

## Assumptions

- **The rename map is prospective** — it pays only for moves committed AS renames; a delete-plus-add
  is not recorded as one, so the discipline is load-bearing for every future move.
- **A move story cannot reach green before its own commit** — the resolver reads committed history, so
  a story's own renames are invisible to it until it commits. Three consecutive stories hit this and no
  ADR states it (`m119/F-18`).
- **The purity ruling constrains EXTERNAL dependencies only** — a `src/<name>/` family is legal under
  every purity guard in this tree, which is the precondition that made the whole milestone possible.

## Gaps

### The LINE axis of a stranded citation
- **Status:** open
- **Discharge condition:** an instrument reporting drifted `<path>:<line>` citations under a
  shrink-only ceiling, as FF-11903 carries one for unresolvable paths.
ADR-004 solved the PATH axis and left the line axis untouched; six drifted citations sit in delivered,
immutable records where the repair is forbidden and the decay is unreported (`m119/F-24`).

### A cited path in a SHIPPED asset
- **Status:** open
- **Discharge condition:** a control that resolves the paths a bundle member's PROSE names.
A move silently broke a runnable command this framework ships to every consuming repo, and it was
found by a sweep rather than by a control (`m119/F-33`).

### `TECH_DEBT` item 81 — ruled, not discharged
- **Status:** open
- **Discharge condition:** chore **120** converts the four named carriers, AND the four further
  species this milestone measured are covered.
The ruling landed and the class is detected for sweeps, but 119 found four species FF-11902 cannot
see by construction — a stored specifier, an `existsSync` early return with no subject set, a
non-recursive walk of a newly-interior directory, a segment-spelled path, and a stored number about a
file. The entry is more alive than when it was written (`m119/F-02`).

### `TECH_DEBT` item 83 — half split
- **Status:** open
- **Discharge condition:** worktree lifecycle and run bracketing are extracted.
Seams 2 and 1 landed at `119/04` (2,462 → 1,957 lines); seams 3 and 4 remain (`m119/F-37`).
