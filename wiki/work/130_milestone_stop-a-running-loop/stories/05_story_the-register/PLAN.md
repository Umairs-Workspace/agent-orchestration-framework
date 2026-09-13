# 05 · The register — build plan

## Mechanism

Three arch files in the harness shape every sibling under `test/arch/loop/` already has: an
exported `archTests` array of `{ name, run }`, registered by one import and one spread in the
directory's `index.mjs`. Each control has the two legs the register prescribes — a STRUCTURAL leg
read from source (resolved import specifiers through `test/support/module-family.mjs`, the one
extractor FF-11901 allows; comment-stripped text sweeps through `read-src-files.mjs`; the
enclosing-function textual rule `acd-number-null-safe` already applies) and a FIXTURE leg that
drives the delivered code against the isolated home and the loop fixture (`loopFixture`,
`completingDriver` from `loop-command-probe.test.mjs`; the engine's own fixtures in
`work-loop-declarations.test.mjs`; the fleet's `mesh-ui-assign-fixture.mjs`). Non-vacuity is a
leg of its own in each: a sweep that finds nothing reds, never passes.

The budget table moves once, here: `test/arch/loop` 55 → 58 by exactly the three files, with the
row's `why` naming them and which of the three subjects (registry / record / ladder) each is, and
the `src/loop` exemption's `why` naming `stop-request.mjs` and `stop.mjs` as members. The
`VERIFICATION.md` fitness register gets one row per control after the probe is run: the mutation
applied, the assertion that fired, the message.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`: `node scripts/test.mjs --only test/arch/loop/acd-loop-stop-request-single-home.test.mjs test/arch/loop/acd-loop-stop-settles-the-run.test.mjs test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs test/arch/testing/acd-source-directory-budget.test.mjs` — seven green.
Then the red probes, one at a time and reverted each time: spell `"loop-stops"` in
`src/commands/loop.mjs` → FF-13001 reds naming the file; insert `return state;` between
`drivePhase` and `settleDriven` → FF-13002's structural leg reds; make the fake `run({ scope, stop:
true })` write a second file → FF-13003 reds; drop the `stopped` skip in the engine → FF-13004
reds; make `assemblePresenceRecord` emit `loops: []` → FF-13005 reds; return a button for a remote
node → FF-13006 reds; form the argv in the shell → FF-13007's node leg reds. `aof work doctor 130`
reports no `control-unresolved` after the files land.

A wrong build shows as: a control green under its own mutation (a vacuous guard), a sweep that
finds zero modules and passes, a fourth file under `test/arch/loop/` (the row over-raised), or a
register row in `VERIFICATION.md` with no observed message.

## Out of scope

- Any change to the subject files — a control that needs the code changed to pass is a finding
  against the story that owns the file, fixed there inline, never here.
- FF-13007's cargo tests — story 04's, in `supervision.rs`.
- The live run — story 06.

## Known traps

- `test/arch/loop/index.mjs` is also touched by 125 (uncommitted in this checkout) and by 129/05
  when it lands: register by APPENDING an import + spread, never by re-ordering.
- The budget control asserts the table and the tree agree in BOTH directions; a raise of 3 with
  only 2 files landed reds it.
- `acd-loop-probe-contract`'s first leg runs `run({ scope })` and reads `treeFiles(projectRoot)` —
  FF-13003's fixture must isolate the HOME, not the tree, to see the one file it expects.
