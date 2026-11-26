# 210/01 · Importer scan — build plan

## Mechanism

One pure factory in `importers.mjs`, in the same `createX({ seams })` shape as the other testing
leaves. Its inputs are the project root, the changed files, the suite predicate (roots, suffixes,
exclude, passed in, not imported, because story 04 moves it), an export-map function (the census's
`workspaceExportMap`) and a file reader. Its output is
`{ selected: [{ suite, reached: [{ file, how }] }], unreached: [file], unresolved: [{ specifier, importer }] }`.

Walk the test roots once per call: classify each file as a suite or a helper, read its text, and
pull the static `import … from "…"`, `import("…")` and `export … from "…"` specifiers with a regex.
Do not parse. Resolve each specifier relatively, or through the export map, to a project-relative
posix path. Build helper → targets edges. A suite reaches a changed file directly, through a
helper closure (memoised per call, cycle-safe), or by the changed path appearing as a whole token
in its text. Never follow a non-test-root file's own imports.

The old selector's `resolveSpecifier` in `select.mjs` already resolves workspace specifiers against
the export map. Lift that logic, but do not import it: `select.mjs` is deleted in story 04.

## Verification step

Run the scan over this repository for `packages/work/src/testing/record.mjs` and check the answer by
hand against `grep -rl "testing/record" test packages/*/test`. Every grep hit that is a suite or
that reaches a suite through `test/support` must be selected, and nothing that only imports the
assembly may be. Time it: tens of milliseconds to low seconds over ~3,300 files is expected. If it
is slower than about 5 s, look for re-reading per changed file.

## Out of scope

Wiring it to `--suggest` and `--failed` (04, 05). The changed set itself (04/05 hand it in).
Following source imports: deliberately excluded, see ADR-003.
