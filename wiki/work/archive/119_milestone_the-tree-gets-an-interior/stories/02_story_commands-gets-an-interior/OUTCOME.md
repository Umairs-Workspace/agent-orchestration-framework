# 119/02 · `src/commands/` gets an interior, and the registry stops explaining itself twice — Outcome

## Delivered

### `src/commands/` has an interior
`mesh/` (17), `assets/` (9) and `graph/` (6) hold the families their filenames already declared, and
the flat command layer fell from 99 siblings to 67. The layer is now a row in the one budget table
that meters flat layers, which it was previously invisible to — the fastest-growing flat directory in
the tree was the one neither ledger entry could see.

### The registry cites; it does not explain
No entry in `src/command-core.mjs` carries a rationale paragraph: each command's registry comment is
a SINGLE line whose content is a citation in `m?<itemRef>/<ID>` form, and the prose lives in the
command module's own header. The file fell from 582 lines to 323. The deferred-import comments that
document the TDZ ring are the one exempt class and are asserted still present, because deleting them
is the failure this rule must not cause.

### The claim is over SHAPE, never over a count
FF-11908 asserts no comment-density number, no comment ratio and no line budget other than one per
entry. A cap with no admitted decomposition is item 61's measured failure, and this story declines
the same trap over the layer item 78 names.

## Assumptions

- **A mesh-family leaf that non-mesh commands reach into is the delivered shape** —
  `src/commands/mesh/gate.mjs` is imported by seven siblings that stayed flat and `mesh/session.mjs`
  by `src/cli.mjs` and 13 suites, so ADR-006 §1's "intra-directory leaves" describes two of its four
  wrongly. The move is still right and nothing broke (`m119/F-22`).
- **A move story cannot reach green before its own commit** — the 32 renames here are invisible to
  `git log --diff-filter=R` until committed, so FF-11903 reds during the build by construction
  (`m119/F-18`).

## Gaps

### The LINE axis of a stranded citation
- **Status:** open
- **Discharge condition:** an instrument that reports drifted `<path>:<line>` citations under a
  shrink-only ceiling, exactly as FF-11903 carries one for unresolvable paths.
361 stored `<path>:<line>` citations name a file this story changed: 46 still say what they said, 307
drifted in place, 8 are past EOF. Six of the eight are in DELIVERED, IMMUTABLE records, so the repair
is forbidden and the decay is unreported — the exact pair of conditions ADR-004 was written to break
for paths. What is owed is an instrument, not a repair (`m119/F-24`).

### The segment-spelled stored path
- **Status:** open
- **Discharge condition:** a resolver that reads a citation spelled as `path.join` argument segments,
  not only as a path token.
`path.join(repoRoot, "src", "commands", "mesh-session.mjs")` is the same fact as a path and outside
ADR-004's resolver by construction — 25 sites in 16 controls, found only because seven suites went
red (`m119/F-21`).
