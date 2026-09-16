---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what evidence do we have that this milestone
  works? Owner: aof:verify (the product owner is the SINGLE WRITER of the findings register).
  The evidence rows are filled as each story lands, and the accept decision at the close.
-->
# 78 · The loop execution record — Verification

## Verification evidence

### 78/00 — the execution projection

Both task contracts are `@executable` only. No `@manual` scenario exists in this story and no `@uat`
scenario exists, so no agent-run lane and no human lane was opened. The story delivers a pure module
with no UI surface and no `DESIGN.md`, so the design-conformance step does not apply — its
renderability precondition is not reached, rather than reached and failed.

- **`node scripts/test.mjs --only test/loop-record-projection.test.mjs`** — 29 behavioural cases
  green, run under `AOF_GLOBAL_HOME` isolation. Traceability is 1:1 and slightly over: the 16
  scenario instances of `tasks/00` (four named scenarios, the six-row ceiling outline, the
  capped-versus-uncapped inequality, the three-row terminal-outcome outline, the in-flight case and
  the determinism case) map to 17 tests — the extra one drives the CANONICAL ORDER paragraph
  (`startedAt` then `loopRunId`), which the feature states in its preamble and asserts in no
  scenario. The 10 scenario instances of `tasks/01` map to 10 tests.
  `verifies → tasks/00_the-execution-model.feature`, `tasks/01_coverage-and-gaps.feature`
- **The two fixture-pin cases in the same suite** — the registry ceiling shapes the fixtures build
  are asserted against `loadLoops` reading the real `.aof/loops`, and the projection is run over the
  REAL registry and this repository's real run records, reporting zero coverage loudly. This is
  m77/R8 ("the fixture was written against a belief about the loader") made executable rather than
  remembered, and it is what turns finding **F-78-B** below from a silent pass into a recorded one.
- **`node scripts/test.mjs --only test/arch/acd-loop-record-projection-pure.test.mjs`** — 4/4 green:
  FF-7801's three arms (own body, direct imports, no bare dependency) plus the FF-7810 naming clause.
- **Registration proven inside the runner's own process** — `loopRecordProjectionTests`,
  `loopRecordRegistryShapeTests` and `acdLoopRecordProjectionPureTests` are imported at
  `scripts/test.mjs:3402-3403` AND spread into the assembled suite at `:4757-4759`. An imported suite
  that is never spread is the 59/FF-5903 shape; it was checked rather than assumed.
- **Write-set fidelity** — the story's declared `files:` set (`src/loop-record.mjs`,
  `test/loop-record-projection.test.mjs`, `test/arch/acd-loop-record-projection-pure.test.mjs`,
  `scripts/test.mjs`) is exactly what landed. Nothing outside it was written by this story.
- **`aof work validate 78/00`** — **PASS**, `78/00 is well-formed`.
- **`aof work doctor 78/00`** — **no `control-unresolved` finding at either severity**. FF-7801's
  file is on disk, so the accept does not stand on a `pending` marker. Advisory warns only:
  `numbering-gap` (stream-wide, pre-existing) and `rubric-join-unchecked` (no `work.rubric.report.path`
  is configured — the same project-config gap already ledgered as m77/D-03). Loop-Ready 80% (8/10).

### 78/01 — the item-scoped renderer

Both task contracts are `@executable` only. No `@manual` and no `@uat` scenario exists in this story,
so no agent-run lane and no human lane was opened. The story delivers two pure functions, milestone 78
carries no `DESIGN.md` and there is no frontend surface, so the design-conformance step's renderability
precondition is not reached rather than reached and failed.

- **`node scripts/test.mjs --only test/loop-record-render.test.mjs test/arch/acd-loop-record-renderer-additive.test.mjs test/arch/acd-loop-record-ceiling-legible.test.mjs`**
  — **33/33 green, 0 failures**, exit 0, under `AOF_GLOBAL_HOME` isolation: 26 behavioural cases and 7
  control cases.
  `verifies → tasks/00_the-scoped-graph.feature`, `tasks/01_the-document-body.feature`
- **Traceability, counted rather than asserted.** `tasks/01`'s 15 scenario instances (four named
  scenarios, the five-row ceiling outline, the three-row gap-class outline, and the three
  determinism/frontmatter scenarios) map 1:1 to 15 tests. `tasks/00`'s 8 scenarios map to 11 — the
  three extra drive the PASS TWO edge-scope rule (a declared edge between two engaged loops is drawn
  whichever sorts first; an edge to a loop the item never engaged is not drawn; an edge to an authority
  a later-sorting loop brings into scope still is), which the module states in a comment and no
  scenario asserts. Two scenarios have one half carried by a control instead of the behavioural case,
  deliberately: "no glyph literal appears in this renderer that is not obtained from that table" and
  "`src/commands/loops-graph.mjs` is unmodified by this story" are both FF-7802's arms.
- **Registration proven inside the runner's own process** — `loopRecordRenderTests`,
  `acdLoopRecordRendererAdditiveTests` and `acdLoopRecordCeilingLegibleTests` are imported at
  `scripts/test.mjs:3410-3412` AND spread into the assembled suite at `:4761-4763`. An imported suite
  that is never spread is the 59/FF-5903 shape; it was checked rather than assumed.
- **Write-set fidelity** — the story's declared `files:` set (`src/loop-record-render.mjs`,
  `test/loop-record-render.test.mjs`, `test/arch/acd-loop-record-renderer-additive.test.mjs`,
  `test/arch/acd-loop-record-ceiling-legible.test.mjs`, `scripts/test.mjs`) is exactly what landed.
  FF-7802's third arm is itself the standing proof that `src/commands/loops-graph.mjs` was not touched.
- **The one-table claim holds across all THREE faces, measured at this gate.** Story 79's
  `src/loop-document.mjs` renders no graph of its own — it takes the graph as text, and its command
  reaches those bytes through `invokeRegistered("work:loops-graph", …)`
  (`src/commands/loop-document.mjs:81`), the frozen renderer itself. So 52's command, 79's committed
  document and this story's item-scoped renderer are all served by one `KIND_SHAPES`, and **F-78-D**'s
  overlap does **not** extend to the rendering conventions; it stays confined to the writer and gate
  machinery that 78/02 and 78/03 own, which is where that finding is already routed.
- **`aof work validate 78/01`** — **PASS**, `78/01 is well-formed`.
- **`aof work doctor 78/01`** — **no `control-unresolved` finding at either severity**. Both controls
  this story declares are files on disk, so the accept does not stand on a `pending` marker. Advisory
  warns only: `numbering-gap` (stream-wide, pre-existing) and `rubric-join-unchecked` (no
  `work.rubric.report` is configured — the project-config gap already ledgered as m77/D-03).
  Loop-Ready 80% (8/10). At MILESTONE scope `aof work doctor 78` additionally reports seven
  `control-unresolved` warns — FF-7803, FF-7804, FF-7805, FF-7807, FF-7808, FF-7809 and FF-7810, every
  one of them declared against stories `02` and `03` — plus `control-runner-unchecked` for the whole
  ten-entry register (no `work.controls.runners` is configured, so leg B never ran). That is read here
  as evidence about the milestone, not about this story.

### 78/02 — the record command

All three task contracts are `@executable` only. No `@manual` scenario exists in this story and no
`@uat` scenario exists, so no agent-run lane and no human lane was opened. The milestone carries no
`DESIGN.md`, the story adds no frontend surface and no `work.ui.baseUrl` is configured, so the
design-conformance step's renderability precondition is not reached rather than reached and failed.

- **`node scripts/test.mjs --only test/loop-record-command.test.mjs test/arch/acd-loop-record-idempotent.test.mjs test/arch/acd-loop-record-signature-preserved.test.mjs test/arch/acd-loop-record-is-a-face.test.mjs test/arch/acd-loop-record-board-deferred.test.mjs test/arch/acd-loop-record-write-scope.test.mjs test/arch/acd-work-command-route-coverage.test.mjs test/command-core-contract.test.mjs`**
  — **75/75 green, 0 failures**, exit 0, under `AOF_GLOBAL_HOME` isolation: 17 behavioural cases, one
  fixture pin, 27 control cases across this story's five controls, and 30 inherited cases from the two
  frozen-list suites the story edits.
  `verifies → tasks/00_the-read-face.feature`, `tasks/01_the-writer.feature`,
  `tasks/02_registration-and-deferral.feature`
- **Traceability, counted rather than asserted.** `tasks/00`'s 7 scenarios map 1:1 to the 7
  `loop-record-command/00` cases; `tasks/01`'s 10 scenarios map 1:1 to the 10
  `loop-record-command/01` cases. `tasks/02`'s 7 scenarios are carried by the controls rather than by
  a behavioural suite of their own — the registration, census, carve-out and UI clauses by FF-7807's
  first five arms, the FF-5201 clauses by FF-7810's third and fourth — 7 scenarios over-covered by 12
  control cases. The extras drive FF-7807's bundle-wrapper carve-out and FF-7810's one-write-door and
  home-derivation arms, neither of which any scenario states. The one remaining case is the fixture
  pin against the real `loadLoops`, carried forward from 78/00 for the same reason (**F-78-B**).
- **The command was run against THIS repository, not only against fixtures.** `aof work loop-record 78
  --json` answers `runsFound: 0, runsCarryingDeclaration: 0, ratio: 0`, zero engagements, and all
  seven registry loops under `declared-never-ran` — the honest-absence behaviour `SPEC.md` scopes in
  ("Absence is the finding, stated rather than omitted"), measured on the real registry rather than
  asserted. `written: false` on the bare face, and no file was created.
- **Registration proven inside the runner's own process** — `loopRecordFixtureShapeTests`,
  `loopRecordCommandTests`, `acdLoopRecordIdempotentTests`, `acdLoopRecordSignaturePreservedTests`,
  `acdLoopRecordIsAFaceTests`, `acdLoopRecordBoardDeferredTests` and `acdLoopRecordWriteScopeTests` are
  imported at `scripts/test.mjs:3422-3427` AND spread into the assembled suite at `:4793-4799`. An
  imported suite that is never spread is the 59/FF-5903 shape; it was checked rather than assumed.
- **Write-set fidelity** — the story's declared `files:` set is exactly what landed. The three tracked
  files it edits (`scripts/test.mjs`, `test/arch/acd-work-command-route-coverage.test.mjs`,
  `test/command-core-contract.test.mjs`) carry **insertions only** (`git diff --stat`: 83 insertions,
  0 deletions across the three plus `src/work-doctor.mjs`), so the frozen lists were widened by
  documented carve-out and no existing member was removed.
- **`aof work validate 78/02`** — **PASS**, `78/02 is well-formed`.
- **`aof work doctor 78/02`** — **no `control-unresolved` finding at either severity**. All five
  controls this story declares are files on disk, so the accept does not stand on a `pending` marker.

### 78/03 — the frozen sign-off block and the doctor lane

Both task contracts are `@executable` only. No `@manual` and no `@uat` scenario exists in this story,
so no agent-run lane and no human lane was opened, and the design-conformance precondition is not
reached for the same reason as 78/02.

- **`node scripts/test.mjs --only test/doctor-loop-record-lane.test.mjs test/loop-record-signoff-shape.test.mjs test/arch/acd-loop-record-signoff-shape.test.mjs test/arch/acd-loop-record-never-gates.test.mjs`**
  — **28/28 green, 0 failures**, exit 0, under `AOF_GLOBAL_HOME` isolation: 18 behavioural cases and 10
  control cases.
  `verifies → tasks/00_the-frozen-signoff-block.feature`, `tasks/01_the-doctor-lane.feature`
- **Traceability, counted rather than asserted.** `tasks/00`'s 7 scenarios map 1:1 to the 7
  `loop-record-signoff/00` cases, its `Scenario Outline`'s six signed/unsigned rows folded into that
  outline's own case as a table the case iterates — 12 scenario instances over 7 scenarios. `tasks/01`'s
  8 scenarios (7 named plus a four-row outline, 11 instances) map to 11 `doctor-loop-record/01` cases,
  over-covered by three: the orphaned-signed-row case, the no-engagement-list case and the
  record-with-no-engagements case each drive a staleness branch the feature states in its preamble and
  asserts in no scenario.
- **Registration proven inside the runner's own process** — `loopRecordSignoffShapeTests`,
  `doctorLoopRecordLaneTests`, `acdLoopRecordSignoffShapeTests` and `acdLoopRecordNeverGatesTests` are
  imported at `scripts/test.mjs:3436-3439` AND spread into the assembled suite at `:4802-4805`.
- **The three-copy freeze is real, and was measured as three.** FF-7809 holds the writer's literals
  (`src/commands/loop-record.mjs:70-72`), the checker's independent copy
  (`src/work-doctor-loop-record.mjs:86-88`) and the gate's own third copy byte-equal, and the checker's
  direct imports are exactly `["node:path"]` — so the instrument cannot inherit the writer's opinion of
  the shape it is meant to police. Probes (a), (b) and (d) below each moved exactly one of the three.
- **The lane's position in `CHECK_GROUPS` was measured, not assumed** — `loopRecordLane` is registered
  once at `src/work-doctor.mjs:645`, after `rubricTraceabilityGroup`, and over a stream carrying a
  record every other lane's findings are identical with and without it, code for code and path for path.
- **Write-set fidelity** — the story's declared `files:` set is exactly what landed;
  `src/work-doctor.mjs` carries insertions only.
- **`aof work validate 78/03`** — **PASS**, `78/03 is well-formed`.
- **`aof work doctor 78/03`** — **no `control-unresolved` finding at either severity**.

### The milestone gate — the whole of 78's lane, over the restored tree

- **`node scripts/test.mjs --only <all 17 files across 78/00–78/03>`** — **172/172 green, 0 failures**,
  exit 0, run under `AOF_GLOBAL_HOME` isolation AFTER every red probe below had been reverted. This is
  the run that stands behind the accept: it is over the bytes that ship, not over the bytes any probe
  left behind.
- **The suite was NOT widened to the whole repository, and that is a stated limit rather than an
  oversight.** `test/global-work-propagation.test.mjs` binds `:4182`, which the live control daemon on
  this machine holds, so a full-suite run here fails on the port rather than on the code. The narrowest
  lane containing every scenario of this milestone's four stories was run instead — all 17 files, all
  ten controls, plus the two frozen-list suites 78/02 edits. The honest cost is that a cross-suite
  regression this milestone caused outside those 17 files is not caught at this gate; it is caught in
  CI, where the port is free.
- **No probe residue.** The eight tracked files any probe touched are either unchanged in `git status`
  (`src/commands/loops-graph.mjs`, `src/work-doctor-controls.mjs`, `src/declared-id.mjs`,
  `src/commands/item-status.mjs`, `src/work-acceptor/rule.mjs`) or carry only the insertions their own
  story declared. Every probe's restore was confirmed byte-identical by sha256 before the next began.
- **`aof work validate 78`** — **PASS**, `78 is well-formed`.
- **`aof work doctor 78`** — **no `control-unresolved` finding at either severity**; all ten declared
  controls resolve to files on disk, so this accept stands on landed files rather than on a `pending`
  marker. The register's seven stale `pending` tokens were corrected to `green` at this gate, which
  closes **F-78-G**. Advisory warns: `numbering-gap` and `rubric-join-unchecked` ×4 (both stream-wide
  and pre-existing — the project-config gap ledgered as m77/D-03), and `control-runner-unchecked` for
  the ten-entry register (no `work.controls.runners` is configured, so doctor's leg B never ran —
  registration was proven here instead, by reading the runner's own import and spread lines). One
  `error`-severity finding stands and is **false**: `depends-blocked-in-progress`, recorded as
  **F-78-I** below.


## Fitness functions

<!-- CITING register (66/ADR-008 ruling 4): every row resolves to a declaration in the sibling
     ARCHITECTURE.md `## Fitness functions` register and declares nothing itself. The red-probe cell
     records WHAT WAS CHANGED to make the control fail and THE MESSAGE OBSERVED.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control, and this row is where a reviewer reads that it was observed failing. An
     assertion nobody has ever seen red cannot be falsified by its own green.

     An untouched placeholder cell is a MISSING red probe, not a recorded one.

     Every row below cites a control declared in the sibling ARCHITECTURE.md register. All TEN
     have now landed and every one carries a red probe recorded at the story gate that delivered it:
     FF-7801 at 78/00; FF-7802 and FF-7806 at 78/01; FF-7803, FF-7804, FF-7805, FF-7807 and FF-7810
     at 78/02; FF-7808 and FF-7809 at 78/03. Nothing here stands `pending`.

     ONE PROBE BELOW DID NOT GO RED, and it is recorded as such rather than quietly replaced with one
     that did: FF-7803's probe (c). That is finding F-78-H, not a missing probe.
-->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-7801 | `test/arch/acd-loop-record-projection-pure.test.mjs` | **green** — 4/4, 2026-09-03. The non-vacuity floor is cleared (the module under test is 281 lines and the sweep asserts >1000 source bytes after comment-stripping), and the direct-import set is PINNED to `["src/loop-bounds.mjs"]` so a new import re-opens the question rather than riding through. | TWO probes, one per arm, each applied to the working tree, run in a fresh `node` process, reverted, and the restore confirmed byte-identical by sha256 — `src/loop-record.mjs` `17913522…779d0f` and `src/loop-bounds.mjs` `236930bc…afdf21`, each identical before and after. **(a) The own-body arm** — planted `const _probe = Date.now();` at `src/loop-record.mjs:237`. RED: *"AssertionError: src/loop-record.mjs reaches a clock"*, the other three cases staying green. **(b) The TRANSITIVE arm, which is the one this control exists for** — planted `import { readFileSync } from "node:fs";` at the head of `src/loop-bounds.mjs`, leaving `src/loop-record.mjs` itself untouched. RED: *"AssertionError: src/loop-bounds.mjs, imported by src/loop-record.mjs, reaches the filesystem"* — and arm (a) stayed GREEN throughout, which is the proof the two arms are separately armed rather than one assertion wearing two names. A purity gate that only read its own module would have passed probe (b) while the impurity sat one hop away. Over the restored tree the story's whole lane re-ran 33/33 green, 0 failures. |
| FF-7802 | `test/arch/acd-loop-record-renderer-additive.test.mjs` | **green** — 4/4, 2026-09-03. Four arms: the import of `KIND_SHAPES`, a sweep asserting no DECLARED kind's glyph is spelled as a literal in the new renderer, the frozen module's git-cleanliness, and the export still standing with no second table declared. Non-vacuity is asserted inline (`KIND_SHAPES.size >= 6`), so a table emptied upstream cannot pass the sweep by leaving it nothing to look for. | THREE probes, each applied to the working tree, run in a fresh `node` process, reverted, and the restore confirmed byte-identical by sha256 — `src/loop-record-render.mjs` `523d833b…4bb3c41b` and `src/commands/loops-graph.mjs` `cfe68058…e687eab8`, each identical before and after. **(a) The glyph arm** — planted `const _probeGlyph = '(["';` (the `actor` open glyph) at `src/loop-record-render.mjs:29`. RED: *"AssertionError: src/loop-record-render.mjs spells the actor glyph \"([\\\"\" as a literal instead of taking it from KIND_SHAPES"*, the other three arms staying green. **(b) The frozen-bytes arm** — appended one comment line to `src/commands/loops-graph.mjs`. RED: *"AssertionError: src/commands/loops-graph.mjs is modified — FF-5208 freezes its bytes and ADR-006 keeps this milestone additive"*, the other three staying green. **(c) The drift ADR-006 exists to prevent** — replaced the import with a hand-copied six-entry glyph table. RED on three arms at once: *"the glyph table is imported, not restated"*, *"spells the loop glyph …"*, *"and the new renderer does not declare a second one"* — while the frozen-bytes arm stayed GREEN, which is what proves that arm separately armed rather than one assertion wearing four names. **And under probe (c) the behavioural lane stayed 29/29 GREEN**, which is the finding this row exists to record: a hand-copied glyph table changes no rendered byte on the day it is copied, so this control is not redundant with the scenarios — it is the only thing in the suite that can see the drift, exactly as ADR-006 argued. Over the restored tree the story's lane re-ran 33/33 green, the same 33 test names as before the probes. |
| FF-7806 | `test/arch/acd-loop-record-ceiling-legible.test.mjs` | **green** — 3/3, 2026-09-03. Asserted over the RENDERED BYTES, not the model — the model's states being distinct is 78/00's contract, and a renderer folding two branches together is what regresses silently. The inequality is PAIRWISE over all four declarations, so `none` versus `unknown` is covered rather than only each against the capped case, and the fixtures declare a numeric bound the one way the loader admits one (a `config:` pointer), which is finding **F-78-B** honoured in the construction rather than remembered. | TWO probes, one per arm, same procedure and the same sha256 restore. **(a) The non-numeric arm** — collapsed the three sentinel states into one shared phrase (the branch returning `` `${cycles} ${plural}, no limit` ``). RED: *"AssertionError: a ceiling declared none renders the same bytes as one declared unknown"*, plus the remedy-wording arm going red on *"did not match /ceiling \`none\` — terminates by construction/"* — with the numeric arm GREEN. **(b) The numeric arm** — dropped the declaration from the bounded branch (returning `` `${cycles} ${plural}` ``). RED: *"did not match the regular expression /4 cycles against a declared ceiling of 6/"* — with BOTH non-numeric arms GREEN. The two arms are therefore separately armed: the probe that collapses the sentinels leaves the numeric assertion green, and the probe that erases the bound leaves the sentinel assertions green. |
| FF-7803 | `test/arch/acd-loop-record-idempotent.test.mjs` | **green** — 4/4, 2026-09-04. Three behavioural scales (in-process, across processes, from another working directory) plus one structural arm cutting `composeSignoffBlock`'s body by the language's own braces. | FOUR probes, each applied to the working tree, run in a fresh `node` process, reverted, and the restore confirmed byte-identical by sha256 — `src/loop-record-render.mjs` `523d833b3a5e0e53…` and `src/commands/loop-record.mjs` `7d354da913039c27…`. **(a) The byte-identity arms** — planted `` `<!-- probe ${Math.random()} -->` `` as the document's first line. RED on all three behavioural arms: *"AssertionError: the composed bytes do not move"* and *"two fresh processes produce byte-identical records"*, with the structural arm GREEN. **(b) The structural arm, alone** — planted `const _probeCwd = process.cwd();` at the head of `composeSignoffBlock`, unused, so no byte moved. RED: *"AssertionError: the sign-off composition reaches no /\bprocess\.cwd\b/"* — with all THREE behavioural arms green, which is the proof this arm exists: a `Date` stamped into the document passes two runs milliseconds apart and moves the bytes at midnight on somebody else's machine. **(c) The vacuity complement — DID NOT GO RED, and that is finding F-78-H below.** The whole document body was replaced by a well-formed constant and all 4/4 stayed GREEN. **(d) The complement, armed** — made the writer return the existing file verbatim once it exists (`existing !== null ? existing : …`). RED on exactly one arm: *"AssertionError: a new run record carrying a declaration moves the bytes"*, the two byte-identity arms and the structural arm green. So the arm is armed; probe (c) measures that what it is armed against is the SIGN-OFF block, not the body. |
| FF-7804 | `test/arch/acd-loop-record-signature-preserved.test.mjs` | **green** — 7/7, 2026-09-04. Preservation and re-derivation asserted in the same breath on every entry, and the signed/unsigned boundary asserted row by row over the six-row table — including the untouched placeholder every freshly written record is full of. | THREE probes, same procedure, `src/commands/loop-record.mjs` restored to `7d354da913039c27…` each time. **(a) Truncate-and-emit** — dropped the carry-forward (`rows.push(placeholderRow(loop))`). RED 5/7: *"AssertionError: carried forward byte-identically: [\"| loop:build-to-green | — | — | — |\",\"| loop:review-fix | — | — | — |\"]"* — the operator's signature gone. **(b) The placeholder mistaken for a signature** — dropped the `!== SIGNOFF_PLACEHOLDER` clause from `isFilled`. RED 4/7: *"AssertionError: | loop:one | — | — | — | is unsigned — 1 !== 0"* and *"and the writer reports what it carried — 2 !== 1"*, with the verbatim-carry arm GREEN, so the boundary is armed separately from the carry. **(c) The subtle one, and the reason the word VERBATIM is in the invariant** — re-rendered the carried row from its parsed cells instead of carrying its line. RED on exactly ONE arm: *"AssertionError: carried forward byte-identically: [… \"| loop:review-fix | U. Butt | 3 Sep 2026 | rejected |\"]"* — the human's own spacing normalised away — with the other SIX arms green. A writer that preserved the signature's meaning and lost its bytes would satisfy every other assertion in this control. |
| FF-7805 | `test/arch/acd-loop-record-is-a-face.test.mjs` | **green** — 4/4, 2026-09-04. Asserted three ways — structurally (the basename is named in exactly two modules, and the only thing parsed out of the text is the sign-off), by dependency direction (both consumers import 78/00's projection; the renderer is imported once and only written to), and behaviourally (a tampered record moves no field of the answer). | THREE probes, same procedure, `src/loop-record.mjs` `17913522a4462432…` and `src/commands/loop-record.mjs` `7d354da913039c27…` restored identical. **(a) A THIRD reader** — appended `export const _probeBasename = "EXECUTION.md";` to the projection. RED 1/4: *"AssertionError: the record's basename is named in exactly the sanctioned modules"*, the diff naming `src/loop-record.mjs` as the intruder. **(b) A second read of the document** — added one more `readFile(target, "utf8")` in the writer. RED 1/4: *"AssertionError: the document is read exactly once — 2 !== 1"*. **(c) The answer RECOVERED from the document** — made `coverage.runs` come off the text when the document says `41 runs found`. RED 2/4, and the important one is the behavioural arm: *"a tampered record does not move the command's answer by one field"* went red, which is the arm a structural sweep alone would have missed. Arms 1 and 3 stayed green under it, so the three ways are three and not one wearing three names. |
| FF-7807 | `test/arch/acd-loop-record-board-deferred.test.mjs` | **green** — 6/6, 2026-09-04. Registration into the shared core, the CLI face as a real subprocess, the two frozen lists, the `ui/` sweep, and the bundle-wrapper carve-out read out of the parity control's own source rather than asserted about it. | THREE probes, one per frozen surface, each reverted and confirmed: `test/arch/acd-work-command-route-coverage.test.mjs` `8160dd27eedd4309…`, `test/command-core-contract.test.mjs` `9f4d55c6dd45c4f8…`, `src/commands/loop-record.mjs` `7d354da913039c27…`. **(a) The carve-out dropped** — commented `"loop-record"` out of `BOARD_DEFERRED`. RED 1/6: *"AssertionError: loop-record is a member of the BOARD_DEFERRED set"*, the other five green. **(b) The census** — commented `"work:loop-record"` out of the frozen `WORK_IDS`. RED 1/6: *"AssertionError: the frozen WORK_IDS census carries work:loop-record"*. **(c) The name ADR-009 forces** — refiled the route as `["work", "loops", "record"]`, the registry family's noun. RED 1/6: *"AssertionError: reachable as `aof work loop-record`"* with the actual/expected diff showing `loops`/`record` against `loop-record`. Three probes, three disjoint single-arm reds: the two frozen lists and the route are separately armed. |
| FF-7808 | `test/arch/acd-loop-record-never-gates.test.mjs` | **green** — 5/5, 2026-09-04. The property asserted four independent ways — a constant severity swept over every cause on every item status, the codes held out of the array `DOCTOR_GATE_CODES` is derived from, a vocabulary sweep over the four doors plus the acceptor family wholesale, and the behavioural `done`-succeeds case. | SIX probes, one per arm and two extra on the sweep, every restore confirmed. **(a)** `ADVISORY_SEVERITY = "error"`. RED 2/5: *"AssertionError: loop-record-unsigned is warn on a not-started item — 'error' !== 'warn'"*. **(b)** added `"loop-record-unsigned"` to `CONTROL_FINDING_CODES`. RED 1/5: *"AssertionError: loop-record-unsigned is not a control finding code"* — the structural claim that the lane's codes cannot reach the gate ladder even at `error`. **(c)** a status door reading the block — `export const _probeGate = (doc) => doc.includes("## Sign-off");` in `src/commands/item-status.mjs`. RED 1/5: *"src/commands/item-status.mjs carries no token naming the record or its signature (Sign-off)"*. **A NEGATIVE RESULT WORTH RECORDING:** the same probe planted as a COMMENT left all 5/5 green — the sweep strips comments first, so it measures code and not documentation, which is correct and is now recorded rather than assumed. **(d)** the same token in `src/work-acceptor/rule.mjs`. RED: *"src/work-acceptor/rule.mjs carries no token naming the record or its signature (isSignedRow)"* — the acceptor family is swept wholesale, not only its two named leaves. **(e)** the doctor ENGINE judging rather than reading — `isSignedRow` in `src/work-doctor.mjs`. RED: *"but it renders no verdict about it (isSignedRow)"*, which is the one module permitted to name the record and forbidden to judge it. **(f)** the lane moved to the head of `CHECK_GROUPS`. RED 1/5: *"and appended after the lanes that existed before it, never inserted among them"*. |
| FF-7809 | `test/arch/acd-loop-record-signoff-shape.test.mjs` | **green** — 5/5, 2026-09-04. Three independent copies of the frozen shape held byte-equal AND round-tripped — the block the writer emits is read back by the checker's own parser — plus the m66 positional rule, m66's closed `REGISTER_BLOCKS`/`ID_FORMS` sets, and the checker's import closure. | FIVE probes, one per arm, every restore confirmed. **(a) The WRITER's copy** — `SIGNOFF_HEADING` to `"## Sign off"`. RED 2/5: *"AssertionError: the writer's heading is the frozen literal"*, `'## Sign off'` against `'## Sign-off'`. **(b) The CHECKER's independent copy** — a fifth column on its `SIGNOFF_HEADER`. RED 2/5: *"the checker's header is the frozen literal"*. That (a) and (b) red the SAME arm from opposite sides is the point of holding three copies: neither module can move without the gate seeing it. **(c) The positional rule** — `| ${loop} (unsigned) |` in the placeholder row. RED 2/5, and the message is the one that matters: *"the checker reads the writer's block: sign-off row 1's first cell carries more than the loop id (`loop:build-to-green (unsigned)`)"* — the ROUND-TRIP arm caught it, so the freeze is over a real document and not only over four strings. **(d) The instrument inheriting its subject's opinion** — made the checker import the writer. RED 1/5: *"the checker's direct imports are exactly node:path"*. **(e) m66's closed set re-opened** — declared `EXECUTION.md`/`sign-off` as a `REGISTER_BLOCKS` entry. RED 1/5: *"EXECUTION.md is not a register file"*. |
| FF-7810 | `test/arch/acd-loop-record-write-scope.test.mjs` | **green** — 6/6, 2026-09-04. One filesystem snapshot diffed across a write, the home derived from the item with no caller-supplied path in the input schema, FF-5201's discovery patterns and expected list restated independently rather than read out of that gate, and its read-only sweep re-measured here. | FOUR probes, one per claim, every restore confirmed — `src/commands/loop-record.mjs` `7d354da913039c27…`, `src/commands/loops-graph.mjs` `cfe68058e2c58c5a…`, `test/arch/acd-loop-record-write-scope.test.mjs` `e6a460c0dda6634e…`. **(a) A leaked second file** — a second `writeText` into `.aof/loops/STRAY.md`, the registry directory 52/FF-5201 forbids outright. RED 2/6: *"AssertionError: exactly one file is created or modified"*, the snapshot diff naming `.aof/loops/STRAY.md` beside the record. **(b) A second write door** — a second `writeText(target, text)` behind `if (false)`, so no byte moved and no file was added. RED 1/6: *"and there is exactly one write, to exactly that target — 2 !== 1"*, with the file-count arm GREEN — the two arms are separately armed, and this is the one that catches a second atomicity story before it can lose a signature. **(c) FF-5201's own law, re-measured here** — appended a `writeFile` call form to `src/commands/loops-graph.mjs`. RED 1/6: *"src/commands/loops-graph.mjs: no write call form"*. **(d) The list widened to admit a writer** — added `src/commands/loops-record.mjs` to the restated `FF_5201_EXPECTED`. RED 1/6: *"the registry family on disk is still exactly FF-5201's six — this milestone neither joined it nor grew it"*, which is the clause that makes ADR-009's forced name checkable rather than merely explained. |

**Probe procedure.** Each probe is applied to the working tree, the control run in a FRESH `node`
process under `AOF_GLOBAL_HOME` isolation, the message recorded verbatim, then REVERTED and the
restore confirmed byte-identical (sha256 before and after) before the next probe begins.

## Findings

<!-- The seven columns, with the id ALONE in the first cell. A reviewer reports findings UNNUMBERED;
     the single writer allocates each id here, at the moment of landing it. Findings live here, never
     in a task folder. -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-78-A | **The join key has no producer.** `tasks/00_the-execution-model.feature` states that a run belongs to a loop when its `brief.loop` envelope carries "a `loopRunId` and a loop id the registry resolves". Re-measured at the MILESTONE gate against the source: `buildLoopDeclaration` (`src/work-loop.mjs:903-923`) still returns exactly `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle`, `startedAt` — and **no loop id**. `declarationOf` therefore requires `brief.loop.id`, a key nothing in the repository writes, so join coverage stays 0 here even once the loop shell is driven. Measured live rather than inferred: `aof work loop-record 78 --json` answers `runsFound: 0, runsCarryingDeclaration: 0, ratio: 0` with all seven registry loops under `declared-never-ran` | defect | high | **RE-TRIAGED at the milestone gate, 2026-09-04: non-blocker for 78.** The triage recorded at 78/00's gate — "it must be closed before 78 is accepted" — over-reached against `SPEC.md`'s own scope boundary, which puts the producer OUT of scope in as many words: *"Instrumenting the loops. The join key is `brief.loop` and it belongs to 53. This milestone reads it; if 53 has not populated it, this milestone renders the absence honestly and says so."* That behaviour is delivered and was measured live at this gate. The deliverable is met; the CAPABILITY stays latent until 53's writer mints a registry-resolvable loop id, which is a declared gap rather than an accept veto | **story 102** (`102_story_the-declaration-names-its-loop`, `not-started`) — the producer change in 53's writer; plus 78 `OUTCOME.md` `## Gaps`, open with a discharge condition | open |
| F-78-B | **A registry `ceiling:` is never a bare number.** `tasks/00`'s outline rows say `ceiling: 6`, but the loader (`src/work-loops.mjs`) admits only a pointer list or one of the three sentinels — a literal `ceiling: 6` is a `loop-bad-value`. Measured across the real 17 records: 4 pointer ceilings, 3 `none`, no `unknown`, no `uncapped`. The build realised a numeric bound the only way the registry admits one, a `config:` pointer resolved against injected config, which is why the green cases read `{"config":"work.autonomous.maxAttempts"}` rather than `6` | test-gap | medium | **non-blocker.** The delivered `.feature` is immutable and is not edited. The residual is that its outline text names a shape the loader forbids, so a later reader could write a fixture against it; the suite's fixture pin against the real `loadLoops` is what stops that being silent, and it is already in place. Carried as a refine-time lesson | `RETROSPECTIVE.md` — contract text measured against the producer at refine, not at build | open |
| F-78-C | **`authority-unresolved` is only half computable in a pure leaf.** ADR-005 names "an actuator or reference owner the endpoint grammar cannot resolve". Measured: `actuator`/`reference` parse through `machineField` and admit `module:`/`command:`/`config:`/`prose:` alone — never an intra-registry scheme — so whether one resolves is a question about a file on disk or the command registry, which FF-7801 forbids this module from asking. `owner` and the edge keys DO cite intra-registry nodes, and those are exactly what the class covers today (`AUTHORITY_FIELD_KEYS = ["owner"]`). The class is therefore narrower than the ADR's wording | design-gap | medium | **non-blocker.** Named in the module and in 78/STATE rather than quietly dropped, and the narrowing is sound given FF-7801. The decision owed is whether 78/02 passes the registry's own grounding findings in (it already reports 11) or ADR-005's wording is narrowed to match | 78/02 refine — architect, before the writer lands | open |
| F-78-D | **A parallel implementation of this milestone's ADRs already ships beside it.** Standalone story 79 states it conforms to `78/ADR-001`, `ADR-002` and `ADR-009` "rather than re-deciding them", and has landed `src/loop-document.mjs`, `src/commands/loop-document.mjs` and four structural gates — write-scope, board-deferred, idempotent, and a drift check — that mirror the subjects 78 declares as FF-7810, FF-7807 and FF-7803 against its own not-started stories 78/02 and 78/03. Story 79's gates deliberately carry no `FF-NNNN` id (it has no `ARCHITECTURE.md`), so neither register can see the other | design-gap | low | **non-blocker for 78/00**, which shares no surface with 79. Raised here because it is the cheapest moment to decide: 78/02 either builds on 79's writer or supersedes it, and discovering the overlap at 78/02's build is the expensive order. No control is currently duplicated in the assembled suite | 78/02 refine — architect | open |
| F-78-E | **One glyph literal IS hand-copied, and nothing compares the two copies.** `UNDECLARED_SHAPE` is spelled identically in `src/loop-record-render.mjs:27` and `src/commands/loops-graph.mjs:50`. This is permitted by design and documented where it sits — FF-7802's sweep iterates `KIND_SHAPES` entries, so it reaches DECLARED kinds' glyphs alone, and the renderer's own comment explains that the frozen const is private and that exporting it would modify the bytes FF-7802 holds unmodified. The residual is that ADR-006's drift argument applies verbatim to this one pair: if a later milestone changes 52's parallelogram, the two faces draw undeclared endpoints differently and nothing in the suite is red. Probe (c) at this gate measured why that would go unnoticed — a copied glyph table left the whole behavioural lane 29/29 green | design-gap | low | **non-blocker.** FF-7802's scope is exactly what ADR-006 specified, the copy is named rather than hidden, and the two copies agree today (verified byte-for-byte at this gate). The cheap closure is one assertion comparing the renderer's literal against the frozen module's source, or an additive `export` of `UNDECLARED_SHAPE` the next time 52's module is legitimately touched — the latter being the change ADR-006 already anticipates as "a later, additive change" | 78/02 refine — architect | open |
| F-78-F | **An assertion's message describes a heading while it checks a body line.** `tasks/01_the-document-body.feature` says "And the heading names the remedy: `<remedy>`". The renderer emits the remedy as a separate line under the `h2` (`src/loop-record-render.mjs:239` — `## Ran, undeclared`, then `Remedy: declare the loop, or fix the id it named.`), and `test/loop-record-render.test.mjs:370` asserts that body line under the message *"the heading names the remedy"* | test-gap | low | **non-blocker**, and no rendering change is wanted: an `h2` carrying a full remedy sentence would be a worse document, the delivered `.feature` is immutable, and the section does name the remedy where the reader meets the gap. The residual is only the assertion message, which claims something the assertion does not check — a later auditor reading messages rather than code would take the heading text as pinned. Tests are code and this line is correctable at any time | 78 `RETROSPECTIVE.md` — an assertion's message states what the assertion checks | open |
| F-78-G | **The declaring register's preamble contradicts its own table.** `ARCHITECTURE.md` `## Fitness functions` opens with "Every entry names its INTENDED PATH in the runnable test tree; **none has landed**, so each carries the token `pending`", while three rows now read `green` (FF-7801, FF-7802, FF-7806) with their files on disk and probed at their stories' gates | defect | low | **non-blocker.** The machine-read half — the `status` column — is correct, and `aof work doctor` reads that rather than the prose, which is why the seven genuinely-pending controls report and the three landed ones do not. The stale sentence is a reader hazard only, and the architect is next in that file when 78/02's controls land | 78/02 refine — architect (the register's owner) | open |
| F-78-H | **FF-7803's vacuity complement does not reach the document body.** The arm is titled "a changed input is the ONLY thing that moves the bytes", and its comment argues it is what stops a composer that "emitted a constant" from satisfying byte-identity perfectly. Probed at this gate: `renderExecutionDocument` was replaced by a well-formed constant and **all 4/4 of FF-7803 stayed GREEN**. The cause is that the input the arm perturbs — a run record with a NEW `loopRunId` (`lr-c`) — adds a sign-off ROW, and the sign-off block is composed by the writer, not by the renderer; so the bytes move for a reason that is true whatever the body says. Probe (d) confirms the arm is armed at all (a writer that never re-derives reds it), which is what isolates the defect to its REACH rather than to its existence | test-gap | medium | **non-blocker.** The body is not unguarded — the same constant-body probe run against the milestone's behavioural lane went **19 red** across `loop-record-render.mjs`'s own suite, so the property holds and is enforced; it is enforced somewhere other than where this control's comment claims. The residual is that a reader of FF-7803 would believe the body is covered by it and could weaken the render suite on that belief. The cheap closure is one more assertion in FF-7803 perturbing an input that moves a body line WITHOUT adding an engagement — a new cycle on an EXISTING `loopRunId` | 78 `RETROSPECTIVE.md`, and a follow-on assertion in FF-7803 whenever that control is next touched | open |
| F-78-I | **`aof work doctor` reports a met dependency as unmet, at severity `error` — and the fix for this exact class already exists one module away.** `aof work doctor 78` emits *"error: depends-blocked-in-progress — driver 78 is in-progress but depends on driver 79 which is not yet done"*; story 79's `STORY.md` carries `status: done`. The mechanism: `src/work-doctor-coherence.mjs:162,229` gates on `isDriver` (`src/work-doctor.mjs:87-88`), which admits `milestone`/`uat`/`spike`/`chore` and **not `story`** — so a TOP-LEVEL, parentless story never enters `driverStatusByNumber`, and `undefined !== "done"` reports it unmet. **`src/work.mjs` already solves this**, with a comment naming this very pair: `const isDependTarget = (item) => isDriver(item) || (item.type === "story" && item.parent == null)`, introduced because *"resolving over `drivers` alone missed it, read its status as null, and scored an edge that was already satisfied as unmet — blocking 78 on a story that was done"*. It was applied to `work:next`'s readiness walk and to `validate`, and the doctor coherence lane — a THIRD reader of the same question — was missed. `isDependTarget` is a module-local `const`, not exported, so that third reader could not have shared it. The same blind spot has a second symptom: `numbering-gap` counts 79 among the top-level numbers "missing between 00 and 101" although the folder exists | defect | medium | **non-blocker for 78, and the finding is FALSE rather than the dependency unmet** — 52, 53 and 79 are all `done`. It is an instrument defect, not a milestone defect. It also has a fuse: the check fires only for `in-progress` drivers, so accepting 78 silences it — confirmed at this gate, where the error disappeared the moment `status` moved to `done` — and the next parentless story depended on by a driver rediscovers it from scratch. This is the enumerate-every-reader failure: one concept, three readers, two updated. The fix is therefore NOT a new index — it is to **export `isDependTarget` from its one home and have `src/work-doctor-coherence.mjs` use it at both sites**, plus the same widening in `numbering-gap` | **chore 104** (`104_chore_the-coherence-lane-is-the-third-reader-that-was-missed`, `not-started`) — export `isDependTarget` from `src/work.mjs` and adopt it at `src/work-doctor-coherence.mjs:162,229`, widen `numbering-gap`, leave `isDriver` unchanged | open |
| F-78-J | **`src/loop-record-render.mjs` is the only CRLF file among the milestone's four new source modules.** Measured: `src/loop-record-render.mjs` is CRLF, while `src/loop-record.mjs`, `src/commands/loop-record.mjs` and `src/work-doctor-loop-record.mjs` are LF. It changes no behaviour and no test — the renderer joins its own output on `\n` regardless — and it was noticed only because a probe anchor authored with LF failed to match the file | defect | low | **non-blocker.** No rendered byte depends on it and no control reads it. It is the same class of drift chore **101** (`committed-generated-markdown-under-wiki-work-has-no-eol-pin`) already exists for, one layer down in the source tree rather than in the rendered output, so it belongs to that chore's scope rather than to a new one | **chore 101** — a DoD item was added there naming this file, so the routing is not a dead end | open |
| F-78-K | **`aof work doctor` reports a FALSE GREEN when run from any subdirectory of the workspace.** Measured at this gate, three cwds, same ref: from the repo root `aof work doctor 78` emits 8 findings (1 error, 7 warns) and `Loop-Ready: 70% (7/10)`; from `wiki/work/78_milestone_loop-execution-record/` and from `src/` the same command emits **`healthy — 78 is coherent.`** with an empty finding set and `Loop-Ready: 50% (2/4)`. Every item behaves the same way — `aof work doctor 79` and `77` also answer `healthy` from a subdirectory. `aof work validate 78` from those same cwds correctly answers `PASS — 78 is well-formed`, so the ref RESOLVES from a subdirectory and it is the stream scan that comes back empty: `work.dir` (`"./wiki/work"`) is resolved against the process cwd rather than against the project root the config was found at, and an empty stream has no findings, which doctor renders as health. This is TECH_DEBT item 4 (*"workspace identity is still partly cwd-derived"*) with a concrete, reproducible victim | defect | high | **non-blocker for 78** — the answer this accept stands on was taken from the repo root and is recorded above with its findings. But it is the sharpest finding at this gate and it nearly landed: `aof:verify` step 4 instructs the gate to *"run `aof work doctor <ref>` and read the `control-unresolved` findings at BOTH severities before you set `status: done`"*, and the confirmation run taken after filling the register was made from the item's own folder — it returned `healthy` and would have been accepted as proof had the earlier repo-root run not contradicted it. An instrument that answers "healthy" when it can see nothing does not fail loudly; it fails in the direction of accepting. The fix is to resolve `work.dir` against the directory the config was resolved from, and — belt and braces — to refuse rather than report health on an empty stream | **chore 103** (`103_chore_doctor-reports-health-over-a-stream-it-cannot-see`, `not-started`) — resolve `work.dir` against the config's own directory at the shared site, and make a zero-item scan an error rather than a pass. Split from **F-78-I**'s chore 104 deliberately: same instrument, different mechanism and different severity, so they schedule independently | open |

## Accept decision

**78/00 — ACCEPTED, 2026-09-03.** `in-review → done`. Both task features green with 1:1 scenario
traceability (29 behavioural cases, including two fixture pins against the real loader), FF-7801 green
4/4 with **both** of its arms separately probed red — the transitive arm proved armed by an impurity
planted one hop away while the module itself stayed clean — and the tree restored byte-identical by
sha256 before the lane re-ran 33/33. `aof work validate 78/00` **PASS**, and `aof work doctor 78/00`
reporting **no `control-unresolved` finding at either severity**. No `@manual` and no `@uat` scenario
exists in this story, so no agent-run lane and no human lane was opened; the story has no UI surface,
so the design-conformance step does not apply. Four findings landed at this gate — **F-78-A**,
**F-78-B**, **F-78-C**, **F-78-D** — all triaged **non-blocker for this story**, none of them a defect
in the delivered projection. Outcome authored at
`stories/00_story_execution-projection/OUTCOME.md`.

**78/01 — ACCEPTED, 2026-09-03.** `in-review → done`. Both task features green with counted
traceability (33/33, 0 failures: 26 behavioural cases mapping 1:1 to `tasks/01`'s 15 scenario instances
and over-covering `tasks/00`'s 8 with 11, the extra three driving the two-pass edge-scope rule). Both
controls this story declares are green and red-probed to their arms: **FF-7802** 4/4 with three probes —
the glyph arm, the frozen-bytes arm, and the hand-copied table ADR-006 exists to prevent, that last one
leaving the behavioural lane 29/29 GREEN and so proving the control is not redundant with the
scenarios — and **FF-7806** 3/3 with one probe per arm, each leaving the other arm green. The tree was
restored byte-identical by sha256 after every probe (`src/loop-record-render.mjs` and
`src/commands/loops-graph.mjs` both), and the lane re-ran 33/33 with the same test names over the
restored tree. `aof work validate 78/01` **PASS**, and `aof work doctor 78/01` reporting **no
`control-unresolved` finding at either severity**. No `@manual` and no `@uat` scenario exists in this
story, so no agent-run lane and no human lane was opened; the story has no UI surface and the milestone
carries no `DESIGN.md`, so the design-conformance step does not apply. Three findings landed at this
gate — **F-78-E**, **F-78-F**, **F-78-G** — all **low** and all **non-blocker**, none of them a defect
in the delivered rendering: one documented glyph copy with no control over it, one assertion message
that describes a heading while checking a body line, and a stale sentence in the declaring register's
preamble. Outcome authored at `stories/01_story_item-scoped-renderer/OUTCOME.md`.

**78/02 — ACCEPTED, 2026-09-04.** `in-review → done`. All three task features green with counted
traceability (75/75, 0 failures: `tasks/00`'s 7 and `tasks/01`'s 10 scenarios mapping 1:1, and
`tasks/02`'s 7 carried by 12 control cases). All five controls this story declares are green and
red-probed arm by arm: **FF-7803** 4/4 with four probes, **FF-7804** 7/7 with three — the third
isolating the word VERBATIM by re-rendering a carried row from its own parsed cells and reddening one
arm out of seven — **FF-7805** 4/4 with three, **FF-7807** 6/6 with three disjoint single-arm reds
across the two frozen lists and the route ADR-009 forces, and **FF-7810** 6/6 with four. The tree was
restored byte-identical by sha256 after every probe, and the milestone's whole lane re-ran 172/172
green over the restored tree. Beyond the fixtures, the command was run against THIS repository —
`aof work loop-record 78 --json` answering zero coverage and all seven registry loops under
`declared-never-ran`, which is `SPEC.md`'s "absence is the finding" measured rather than asserted.
`aof work validate 78/02` **PASS**, `aof work doctor 78/02` reporting **no `control-unresolved`
finding at either severity**. No `@manual` and no `@uat` scenario exists, so no agent-run lane and no
human lane was opened; the milestone carries no `DESIGN.md` and no `work.ui.baseUrl` is configured, so
the design-conformance step's renderability precondition is not reached. Two findings landed at this
gate — **F-78-H** (medium) and **F-78-J** (low) — neither a defect in the delivered command. Outcome
authored at `stories/02_story_the-record-command/OUTCOME.md`.

**78/03 — ACCEPTED, 2026-09-04.** `in-review → done`. Both task features green (28/28, 0 failures)
with `tasks/00`'s 7 scenarios mapping 1:1 and `tasks/01`'s 8 over-covered by 11. Both controls are
green and probed to every arm: **FF-7808** 5/5 with six probes — including one that recorded a
NEGATIVE result worth keeping, that the door sweep strips comments before reading, so it measures code
and not documentation — and **FF-7809** 5/5 with five, the writer's copy and the checker's independent
copy each moved from opposite sides of the same arm, which is what three copies buy. The round-trip
arm, not the byte-comparison arm, is what caught the positional-rule probe, so the freeze is over a
real document rather than over four strings. `aof work validate 78/03` **PASS**, `aof work doctor
78/03` reporting **no `control-unresolved` finding at either severity**. No `@manual` and no `@uat`
scenario exists, so no agent-run lane and no human lane was opened, and the design-conformance
precondition is not reached. One finding landed at this gate — **F-78-I** (medium), a false `error`
from `aof work doctor` itself rather than a defect in this story. Outcome authored at
`stories/03_story_signature-and-the-doctor-lane/OUTCOME.md`.

**78 — ACCEPTED, 2026-09-04.** `in-progress → done`. All four stories are `done`, every box under
`SPEC.md` `## Stories` is ticked, and **all ten declared controls have landed, are green, and carry a
red probe recorded above** — 24 probes across the four story gates, every one of them applied to the
working tree, run in a fresh `node` process, reverted, and the restore confirmed byte-identical by
sha256 before the next began. `aof work validate 78` **PASS**. `aof work doctor 78` reports **no
`control-unresolved` finding at either severity**, so this accept stands on landed files rather than on
a standing `pending` marker; the register's seven stale `pending` tokens were corrected to `green` at
this gate, closing **F-78-G**.

**The suite that ran, and the one that did not.** 172/172 green over the milestone's own 17 files,
after the probes were reverted. The repository-wide suite was **not** run here: `global-work-propagation`
binds `:4182`, held by the live control daemon on this machine. The narrowest lane containing every
scenario of all four stories was run instead. A cross-suite regression outside those 17 files is
therefore caught in CI rather than at this gate — a stated limit of this machine, not of the milestone.

**No `@uat` scenario exists anywhere in this milestone** — all nine task features are `@executable` —
so no human acceptance step was opened and the operator was not asked to perform a procedure. There is
no `## User sign-off` section below because there is nothing true to put in one.

**Four findings are open and none is a blocker.** **F-78-K** is the sharpest and was found by this gate turning its own instrument on itself: `aof work doctor` answers `healthy` over an empty stream when run from any subdirectory, and the confirmation run taken here after filling the register did exactly that. The answer this accept stands on was re-taken from the repo root and is the one recorded above. Of the rest: **F-78-I** is `error`-severity in doctor's own
output and is **false** — 52, 53 and 79 are all `done`; the instrument cannot see a top-level story.
**F-78-H** and **F-78-J** are `medium` and `low` gaps in a control's reach and in a file's line
endings, neither touching delivered behaviour. **F-78-A** is re-triaged at this gate, in the open,
rather than carried as a blocker it never was: `SPEC.md` puts the producer **out of scope** in as many
words — *"Instrumenting the loops. The join key is `brief.loop` and it belongs to 53. This milestone
reads it; if 53 has not populated it, this milestone renders the absence honestly and says so"* — and
that behaviour was measured live at this gate, not assumed. The milestone's deliverable is met; the
capability it enables stays latent until 53's writer mints a registry-resolvable loop id. That is
recorded as a declared gap with a discharge condition in the milestone's `OUTCOME.md`, which is where a
latent capability belongs, rather than as an accept veto the SPEC does not ask for.

**What an operator can do today that they could not before.** Run `aof work loop-record <ref>` and read
a per-item execution record; run it with `--write` and commit that record beside the work; regenerate it
at any time knowing the bytes move only when an input moved and that a signature already in the file
survives verbatim; and see `aof work doctor` report the record's staleness or its missing signature as a
warning that gates nothing.
