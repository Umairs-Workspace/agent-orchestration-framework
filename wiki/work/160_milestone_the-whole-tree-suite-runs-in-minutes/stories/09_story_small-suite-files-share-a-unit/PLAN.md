# 160/09 · Small suite files share a unit — build plan

## Mechanism

Planning already turns each file into one unit, or into case chunks when the file declares
independent cases (`suiteCaseChunks` in the harness). Add a sibling pure function there that
takes the unchunked short units and bins them, largest first, into units whose estimates sum to
about the target. Bin by whole file. The plan entry for a packed unit carries a list of
`{ file, positions }` and a key that names it as packed. That key is what the not-finished line
and the alone-retry log use.

The shard entry learns one more argv form for a list of files with positions. Pick a spelling
that the two existing forms cannot be mistaken for: today a trailing `^\d+(,\d+)*$` is the
positions of the single file before it, and anything else is a selection. Keep one `runCases`
call over the concatenated cases, so `# executed N cases` stays single, and print a `# file` line
as each file finishes.

The pool's `unitResult` counts lost cases against `unit.positions.length` today. For a packed
unit, read the `# file` lines and compare each file's executed count with its own positions.
`fileTimings` in the report module then reads the same lines, so timings stay keyed by file. A
stopped run still writes no timings.

## Verification step

`node scripts/test-sharded.mjs --plan` before and after: the unit count falls from about 1,270
toward a few hundred, and the heaviest units are unchanged. Then run twenty short arch suites
through the shard entry as twenty units and as one packed unit, and time both. Drive the pool's
packed-unit paths (a lost case, a failure, a budget stop) with fake children, as
`test-sharded-report.test.mjs` already does. The whole-tree effect is measured at the milestone's
gate, not here.

## Out of scope

- Changing the chunking rule for files that declare independent cases.
- A cross-file fixture cache (each file still builds its own state).
