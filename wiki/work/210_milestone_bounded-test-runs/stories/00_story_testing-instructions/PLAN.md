# 210/00 · Testing instructions — build plan

## Mechanism

Two halves, both in the bundle's own sources. Do not hand-edit the renders: `aof work update`
writes them, and `node scripts/golden.mjs --update` writes the goldens.

The **key** is compiled with the other `work.test.*` keys in `toolchain.mjs`, so one compile path
answers "is the declaration usable". A declared path that does not exist is a coded refusal. An
absent key compiles to `instructions: null`. The **doctor check** joins the existing test-layout
family in `layout.mjs`, which `config-inspect.mjs` (doctor) and `init-update.mjs` (`aof work update`)
already call. That makes the adoption path the existing seam rather than a new one. Drop
`test-layout-couplings`, `-couplings-match`, `-workdir` and `-graph-fresh` from the family in this
same change, and drop the coupling clause from `test-layout-suites`. Story 04 removes the key
itself.

The **prose** changes one paragraph per skill, at its test step: read the instructions file named
in `work.test.instructions`, pick suites, run `aof test <suites> --reason "<why>"`, then
`aof test --failed` after a fix. The whole tree is the gate's, `test-fix-stopped` is a hand-over,
and pre-existing reds go to `## Feedback (for retro)`. Write it once in `continue.md`'s
`<build_terminator>` and `<review_lanes>`, then mirror it into the others and into the Codex
`workflow.md`. The UAT templates and `add-uat` change `--scope all` to `--all`.

`map-tests.md` is rewritten from "declare couplings and replay commits" to "draft the instructions
file". It reads the roots, the runner scripts, the native `node:test` packages and the known machine
hazards, writes the file, sets the key, and asks the operator to edit the draft.

`wiki/TESTING.md` is this repo's instance. Its content is already on record: the memory notes on
by-file runs, the `:4182` hazard, native `node --test` packages and pre-existing reds, plus the
STATE measurement. Keep it to the five headings ADR-001 lists.

## Verification step

Point a temporary project at a missing instructions path and run `aof test` (refused, path named)
and `aof work doctor` (one warning naming `/aof:map-tests`). Then run `aof work update` here and
grep every render for `never name suite files`, `--scope` and `wearing prose`. There must be zero
hits outside `wiki/work/`. `node scripts/golden.mjs` must report no diff after `--update`.

## Out of scope

The `aof test` forms the prose names. Story 04 builds them, and the prose is a forward reference
until then. Removing `work.test.couplings` from the compiler is story 04's too.
