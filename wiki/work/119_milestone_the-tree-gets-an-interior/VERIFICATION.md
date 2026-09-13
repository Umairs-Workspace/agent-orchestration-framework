---
doc: verification
---
# 119 · The tree gets an interior — Verification

## Verification evidence

### `119/00` — the three rulings, and the carriers they widen

- **`node scripts/test.mjs --only <20 suites>`** — the story's own delivered controls
  (`acd-purity-is-external`, `acd-control-derives-its-census`, `acd-cited-path-resolves`), the nine
  purity carriers they widen, the doctor spine and the cited-path resolver: **169 pass / 1 fail**.
  The single red is FF-11903's ceiling, whose cause is outside this story and is `F-01` below.
  `verifies → tasks/00_purity-is-external.feature`, `tasks/01_a-control-derives-its-fact.feature`,
  `tasks/02_a-cited-path-resolves.feature`
- **Round-2 blocker, re-measured at accept** — `acd-loop-module-import-boundary.test.mjs` resolves
  each relative specifier against the module that spells it (`reachesLoopFamily`) rather than
  matching a spelling, and self-checks that a doctor module's `./loops.mjs` is caught at its own
  depth: **2 pass / 0 fail**. The stall recorded in STATE is closed. `F-39` below.

### `119/01` — `src/` gets an interior

- **`node scripts/test.mjs --only acd-source-directory-budget acd-path-is-not-behaviour`** —
  FF-11904's four legs (ceiling equals the measured count, both directions, non-vacuity, a budgeted
  subject that no longer exists is a failure) and FF-11905's path-is-not-behaviour sweep:
  **11 pass / 0 fail**.
  `verifies → tasks/00`, `tasks/01`, `tasks/02`

### `119/02` — `src/commands/` gets an interior, and the registry stops explaining itself twice

- **`node scripts/test.mjs --only acd-mesh-ui-single-data-command acd-graph-no-face-spawn acd-console-log-confined acd-registry-cites-never-explains`** —
  the three prefix sweeps over the newly-interior command layer plus FF-11908's shape claim over
  `src/command-core.mjs`: **16 pass / 0 fail**.
  `verifies → tasks/00`, `tasks/01`, `tasks/02`

### `119/03` — the test tree gets an interior

- **`node scripts/test.mjs --only acd-loop-suite-registration acd-suite-registration-single-decider`** —
  FF-11906's nine legs, including that the per-directory indexes reach the registry by import and
  spread with no index deciding its own membership: **21 pass / 0 fail**.
  `verifies → tasks/00`, `tasks/01`, `tasks/02`

### `119/04` — the mesh god-node is split

- **`node scripts/test.mjs --only <10 suites>`** — FF-11907's export-surface identity, the
  subtraction legs, the two security controls the split would have disarmed, the assignment census
  and the repo-admission join: **68 pass / 0 fail**.
  `verifies → tasks/00_launch-composition-moves-out.feature`,
  `tasks/01_repo-admission-moves-out.feature`, `tasks/02_the-split-subtracts.feature`

### Milestone lane — the gates that are not a suite

- **`aof work validate 119` and each of `119/00`–`119/04`** — **PASS**, six for six.
- **`aof work doctor 119` and each story** — **no `control-unresolved` at either severity**; all
  eight declared control files resolve on disk at their post-`119/03` paths. Remaining output is
  warn-only (`mtime-ahead-of-updated`, `numbering-gap` at 42/122, `control-runner-unchecked`, and
  `rubric-join-unchecked` × 5 — no `work.rubric.report` is configured), plus the
  `verification-register-missing` error this document discharges.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-11901 | `test/arch/audit/acd-purity-is-external.test.mjs` | GREEN | Two halves driven over literal sources: the intra-family import the old token ban reported, and the node builtin the widened rule must still report. Observed the detector naming the file and the specifier on both. |
| FF-11902 | `test/arch/audit/acd-control-derives-its-census.test.mjs` | GREEN | Planted an unguarded `readdir(...).filter(prefix)` sweep with no non-vacuity leg; observed it caught AT ITS FILTER'S LINE, and adding a floor returned it to green. |
| FF-11903 | `test/arch/command/acd-cited-path-resolves.test.mjs` | **RED — ceiling breach, cause external (`F-01`)** | Planted a citation to a `src/` path that never existed; observed the sweep name it and removing it return to green. The fall-through leg was driven separately: with NO rename map the probe answers exactly what leg A alone answered. |
| FF-11904 | `test/arch/testing/acd-source-directory-budget.test.mjs` | GREEN | Synthesized a sibling in a budgeted layer (nothing written to disk); observed the detector fire and stay quiet on the clean listing in the same lane. A renamed budgeted directory reds its row rather than emptying it. |
| FF-11905 | `test/arch/command/acd-path-is-not-behaviour.test.mjs` | GREEN | Derived one route from `path.basename(...)` in the face; observed the red probes fire on the shipped detectors while the unmodified sources stayed quiet in the same lane. |
| FF-11906 | `test/arch/testing/acd-suite-registration-single-decider.test.mjs` | GREEN | Gave one index a `readdir`-derived membership; observed each way of arriving at a second answer reported by the SHIPPED detector. `scripts/test-unit.mjs` asserted not to have become a second index. |
| FF-11907 | `test/arch/session/acd-session-driver-single-home.test.mjs` | GREEN | Copied one extracted function back into the parent; observed the subtraction leg name it. Per ADR-001 the extension also probes its ORIGINAL claim — every mutation the extension admits is named by the detector that admits it. |
| FF-11908 | `test/arch/command/acd-registry-cites-never-explains.test.mjs` | GREEN | Restored a multi-line rationale block above one registry entry; observed the failure name the entry and the block's line count. Three further probes: a decision stated in both homes, a deleted TDZ deferred-import comment, and a walk that stops at the flat layer. |

## Findings

Reported unnumbered by the build and review lanes and recorded in `STATE.md` `## Feedback (for retro)`;
ids allocated here, at the moment of landing.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | FF-11903 measures unresolved `src/` citations under `wiki/work/**` against a shrink-only ceiling of 65. Measured in the working tree it read 67, of which exactly two — a retired flat commands module and a doctor-depends module under the `work` family, both spelled as paths in milestone 124's own `ARCHITECTURE.md` — are cited ONLY by 124's uncommitted documents; 67 − 2 = 65 to the unit. The two paths are deliberately NOT spelled here: naming a module that does not exist is the false claim this control refuses, and `F-40` is what that cost when this register spelled them. | defect | medium | non-blocker → the repair is 124's citations, never the ceiling (raising it is the weakening the control exists to refuse) | milestone 124 | open |
| F-02 | `TECH_DEBT` item 81 is not discharged by `119/00`: none of its four named carriers is converted, and the story *added* a name to `NAMES_THE_NEW_MODULE`. | defect | high | non-blocker → **PO decision taken at accept: item 81 is KEPT OPEN, not deleted.** The ruling landed and the class is detected for sweeps, but the four named carriers are unconverted (chore **120**) and this milestone measured four FURTHER species FF-11902 cannot see (`F-15`, `F-16`, `F-20`, `F-21`, `F-34`) — the entry is more alive than when written. Re-measured in place | chore 120 | open |
| F-03 | `UNRESOLVED_CEILING` and `HIGH_WATER` are both `77` in one file, so FF-11903's shrink-only leg is a two-line edit away. | defect | low | non-blocker → backlog; a second home for the high-water mark is the stored-fact species one level up | backlog | open |
| F-04 | `classifyStoredLiteral`'s eight rows supply their own verdict as input, so `tasks/01`'s decision/fact table is restated rather than measured; the function has no consumer outside its own control. | test-gap | medium | non-blocker → backlog | backlog | open |
| F-05 | `sweepVacuityProblem` is called by no shipped control; three of the four "ways a sweep goes quiet" rows are driven against a helper rather than a control. | test-gap | medium | non-blocker → backlog; one home for that message needs a control→control import | backlog | open |
| F-06 | FF-11901's detector has reachable blind spots: a hoisted `const TOKEN_BAN = /\bimport\b/u`, a `doesNotMatch` whose subject expression contains a comma, and `/\bimport\b\|\brequire\b/`. | test-gap | medium | non-blocker → backlog; each re-opens the token ban for a guard written next year | backlog | open |
| F-07 | `arch/FF-6603` (`acd-register-declaration-form`) is RED at HEAD and is not 119's: `registerOnly / cited.length > 0.9` measures `3343/3748 = 0.892`, corpus drift from the milestone's own arrival. | defect | medium | non-blocker → backlog; the threshold is itself a stored ratio about the tree, i.e. FF-11902's own species | backlog | open |
| F-08 | Six suites are RED at HEAD independent of 119's diff, confirmed by stashing and re-running against a pristine registry. | defect | high | non-blocker → `TECH_DEBT` item 27's species, whose entry already records that its count "keeps moving because nothing measures it" | TECH_DEBT 27 | open |
| F-09 | `aof test --scope impacted --story <ref>` degenerates to all 1,031 suites for any tree-wide story and is killed at its 2,700,000 ms deadline reporting NOTHING — two faults: a selector that degenerates, and a deadline whose expiry produces no partial result. | defect | high | non-blocker → backlog; the build used `node scripts/test.mjs --only <failing suites>` (1m45s vs ~40min) | backlog | open |
| F-10 | `119/00`'s run was minted LATE, after build and review, so the story sat `not-started` through its whole build — lying to the board, the fleet and `aof work next` — and its run record carries `sessionId: null`, so `aof work observe` cannot say what it cost. | defect | high | non-blocker → backlog; the session id is readable only for seconds after the invoking prompt | backlog | open |
| F-11 | A contract that pins an ABSOLUTE count is stale the moment its predecessor story merges: `119/01`'s `.feature` states 159→128→88 and `test/arch/` 433; at build the tree read 160→129→89 and 436. The invariant ("the root falls by exactly the family's size") held exactly. | design-gap | low | non-blocker → for refine: pin a delta, not an absolute | refine | open |
| F-12 | A move story's diff has THREE kinds, not two: the moved file, the import specifier, and the re-pointed path citation in the module's own header — 63 non-specifier lines in 45 of 71 files, every one a path citation. | design-gap | low | non-blocker → deviation from a delivered `.feature`, flagged for structural review rather than resolved by edit | architect | open |
| F-13 | 871 BARE-BASENAME prose mentions across the tree are now stale and are invisible to every control: a name is not a path, so FF-11903's `src/**.mjs` sweep does not reach them. | defect | medium | non-blocker → candidate for a chore rather than a silent carry | backlog | open |
| F-14 | `src/cache-read.mjs` still emits the degrade code `"board-worker-stream"` after the rename — deliberate: a degrade code is an emitted identifier in a diagnostic vocabulary, not a path. | enhancement | low | non-blocker → recorded so it is a decision rather than an oversight | — | closed |
| F-15 | `acd-controls-never-execute` stored import specifiers as SPELLINGS in three carriers; `"./grade.mjs"` meant the ROOT-level grade module when it was written and means the pure leaf `src/work/grade.mjs` now, so the family rule began forbidding the module it was written to admit — simultaneously vacuous and wrong. | defect | high | fixed in-story (all three now store the RESOLVED module) → evidence that the carrier taxonomy has a FOURTH species a stored specifier fits and a census does not | architect | closed |
| F-16 | The `existsSync`-guarded early return is a silent carrier with NO subject set: five controls return green having asserted nothing when their subject moves, and none is a sweep that could go empty — so FF-11902, written over sweeps, cannot find them. | test-gap | high | fixed in-story (each now asserts its subject exists, naming the path) → a row is owed for the class, in this milestone or the next | architect | open |
| F-17 | A SECOND self-located package root exists outside every subject set 119 can reach: `src/commands/loops-groundedness.mjs:8`, the same defect as `work-loops.mjs:318`, in a file no story of this milestone moves. | defect | medium | non-blocker → named so it is scheduled rather than discovered by whoever moves it | backlog | open |
| F-18 | FF-11903 CANNOT be green in an uncommitted tree: ADR-004's resolver derives its rename map from `git log --diff-filter=R`, i.e. committed history, so a move story's own renames are invisible until it commits. Hit identically by `119/01` and `119/02`. | design-gap | medium | non-blocker → the design working, not a defect; worth pinning in ADR-004 at the milestone accept | architect | open |
| F-19 | A THIRD READER of ADR-004's rename question exists and the resolver does not reach it: `aof work validate` probes each story's `reads:` entry with a bare existence check, so a rename turns older stories' `reads:` lists into stream findings — three repairs across two stories for one missing call. | defect | high | non-blocker → the resolver is already exported and the probe is four lines from using it; a row, not a repair per story | backlog | open |
| F-20 | A NON-RECURSIVE walk of a directory that has just been given an interior is a fourth species invisible to every control 119 landed: `acd-command-layer-imports-downward.test.mjs:99` asserted its boundary over 67 of 99 modules and read green. | test-gap | high | fixed in-story (recursive walk + non-vacuity floor) → worth a row; every flat `readdir("test/arch")` is the same hazard one directory over | architect | open |
| F-21 | The stored-path species has a SECOND SPELLING the first sweep missed: `path.join(repoRoot, "src", "commands", "mesh-session.mjs")` — the same fact as argument segments rather than a path — 25 more sites in 16 controls, found only because seven suites went red. | defect | high | non-blocker → the ADR-004 resolver reads a path, so a segment-spelled citation is outside it by construction | architect | open |
| F-22 | ADR-006 §1's "intra-directory leaves" is wrong for two of its four, measured live: `src/commands/mesh/gate.mjs` is imported by seven siblings that stayed flat, and `mesh/session.mjs` by `src/cli.mjs` and 13 suites. | design-gap | low | non-blocker → the move is still right and nothing broke; the delivered shape differs from the ADR's description | architect | open |
| F-23 | A control derived a module PATH from a command ID (`` `${label.replace(":", "-")}.mjs` ``) — the direction FF-11905 forbids in production code and says nothing about in the control tree. | defect | medium | fixed in-story (split the id into its two halves, so it stays derived and moves with the family) | — | closed |
| F-24 | ADR-004 solved the PATH axis of a stranded citation and left the LINE axis untouched: 361 stored `<path>:<line>` citations name a file `119/02` changed — 46 still true, 307 drifted in place, 8 past EOF. Six of the eight are in DELIVERED, IMMUTABLE records, so the repair is forbidden and the decay is unreported. | design-gap | high | non-blocker → what is owed is an INSTRUMENT, not a repair: a shrink-only ceiling on drifted line citations, exactly as FF-11903 carries one for unresolvable paths. Routed as an ADR-004 amendment, creating nothing | architect | open |
| F-25 | `119/03` was BLOCKED: the move stranded 489 suite citations in 156 DELIVERED `.feature` files, with no legal repair and no resolver covering them. | defect | high | resolved by option (a) — ADR-004 amended to a THIRD reader (`test/support/cited-suite-path.mjs`), resolving cited suite paths at HEAD or through git rename records. FF-11903 asserts reader 3 | architect | closed |
| F-26 | The registry restructure dissolves `53/FF-5311`'s "one labelled milestone-53 block" — its eleven gates span three subject directories, so a subject partition cannot hold one contiguous block. | design-gap | medium | amended in place under triage question 1: the CENSUS is untouched and contiguity — the instrument, never the invariant — is replaced by OWNERSHIP. Also `52/FF-5209` and coverage-ledger leg 8 | architect | closed |
| F-27 | "Registered" became TRANSITIVE and three controls asked the old question: a suite is imported by its directory's index and the index spread by the runner, so `runnerImportedSuites` named ZERO suites and every suite read as an orphan. | defect | high | fixed in-story — one home (`test/support/registration-surface.mjs`) for the three readers rather than three walks; `registrationDecision` untouched and still the single decider | — | closed |
| F-28 | The recursive walk exposed a REAL pre-existing orphan: `test/integration/cli-child-process.test.mjs` is imported by neither runner and by no index — green, red or deleted with identical effect on CI. | test-gap | medium | non-blocker → not added to the shrink-only baseline (which may only shrink) and not `119/03`'s to fix; recorded so it is scheduled | backlog | open |
| F-29 | The test tree derived its repo root by counting directory hops 616 times (509 `path.resolve` + 107 `new URL`), every one a level too shallow after the move; the first membership probe died on a `test/src/work-trigger` that silently held nothing. FF-11905 forbids this in `src/` and says nothing about `test/`. | defect | high | fixed in-story (re-depthed) → the CLASS is unguarded and is the argument FF-11905 already won one tree over | architect | open |
| F-30 | `119/03`'s `files:` is incomplete and its own contract proves it: task 00 requires re-pointing 22 `test/arch/<name>.test.mjs` literals in 13 `src/` modules, and `files:` carries no `src/`. | defect | medium | non-blocker → the writes were made because the contract demanded them; the declaration should have carried `src/` | backlog | open |
| F-31 | FOUR reds on this branch were never 119's, and each was a shipped change whose own contract was not updated with it (`work:debt`, `pay-debt`, `scope-not-found`, `taskFilesState`, the bundle census). THE PATTERN: a change lands with its own tests green and leaves a control ONE DIRECTORY OVER asserting the behaviour it replaced — and `--scope impacted` cannot catch it, because the stale control's file is not in the changed set. | defect | high | fixed at `119/03`'s close (cheaper than the driver that would carry them), each amended to the behaviour that ships | — | closed |
| F-32 | A `grep -c 'not ok'` verdict reads a suite that fails to LOAD as green: a duplicate `const` made a module a SyntaxError, the runner printed a stack and no TAP line, and the check reported clean. | defect | high | non-blocker → verdicts come from the EXIT CODE; a grep is a summary, never the answer. Same shape already recorded against `node --test` on this repo | backlog | open |
| F-33 | A SHIPPED, RUNNABLE bundle command was broken by the move and no test said so: `src/bundle/commands/pay-debt.md` names a suite path that the move invalidated, in four files across three rendered trees. Found by a SWEEP, not by a control — the bundle's gates content-address each member and say nothing about whether a path its PROSE names still resolves. | defect | high | fixed in-story (four files re-pointed, three manifest entries restamped) → the CLASS (a cited path in a shipped asset, resolved by nothing) is ADR-004's axis and does not yet reach `src/bundle/**` | architect | open |
| F-34 | `119/04`'s `files:` named four controls it did not know it would write, every one pinning a NUMBER about the file the story shrinks. THE CLASS: a control that stores a number ABOUT a file is invisible to that file's write-set declaration — and `--scope impacted` selects from the declaration, so the story's own test loop cannot run it. | design-gap | high | non-blocker → two of the four named `119/04` explicitly in their own prose, so the information existed in the controls and the declaration was simply not derived from it | architect | open |
| F-35 | `119/04`'s `files:` cited five controls at flat `test/arch/acd-*.test.mjs` paths that `119/03` had removed three commits earlier. A write-set entry resolving to NOTHING narrows `--scope impacted` silently. | defect | medium | fixed at build (re-pointed) → ADR-004's subject reaching a story's own frontmatter rather than a record document | architect | closed |
| F-36 | A POSITIVE control leg went quiet WITHOUT going red — the half the contract had scored as safe. `acd-worker-clone-no-credential-persisted`'s positive leg matched tokens that `pushWorktreeBranch` also spells for its own reasons, so it went on finding both in a file that had stopped cloning. | defect | high | fixed in-story (the reset and the clone asserted to be the SAME argv, and the subject asserted to contain a clone at all) → not covered by ADR-003's loud/silent/unfixable trichotomy, which assumes a positive leg fails when its subject changes | architect | open |
| F-37 | `TECH_DEBT` item 83 is PARTIALLY discharged — seams 2 and 1 of four landed, seams 3 and 4 did not — and the ledger cannot say so: `TECH_DEBT.md` sits at 4,082 lines against a `maxTotalLines` of exactly 4,082, so any added line reds `acd-debt-ledger-budget`. | design-gap | medium | **PO decision taken at accept: item 83 is KEPT OPEN with its remaining scope narrowed to seams 3 and 4, and re-measured in place (2,462 → 1,957).** Deleting the five fully-discharged entries first created the headroom the ceiling denied, so the stale numbers were repaired rather than carried | product-owner | open |
| F-38 | A third of a delivered Scenario Outline had no test: task 01's admission-join names SIX rows and the suite delivered FOUR — the three missing ones all real branches that moved in this story. A move story verifies its claim by re-running delivered suites, so where the suite is thinner than the contract it looks exactly as green as full coverage does. | test-gap | high | fixed in-story (three rows added, fifteen lines) → **a move is the moment a coverage gap becomes load-bearing** | — | closed |
| F-39 | `119/01`'s review STALLED at round 2 with one outstanding Blocker: a re-pointed subject set whose `forbidden` token was armed against every loop-family spelling except `./loops.mjs` — the only one a doctor module can write once it is a sibling of the loader. | defect | high | resolved — `reachesLoopFamily` resolves each specifier against the module that spells it, so the control asserts the EDGE rather than the spelling. Re-measured green at accept | architect | closed |
| F-40 | **This register reproduced the milestone's own species, at the verify step.** Its first draft spelled three non-existent modules as `src/**.mjs` path tokens while REPORTING on unresolvable citations — two in `F-01`'s own text and one in `F-15`'s. FF-11903 sweeps `wiki/work/**`, so the act of recording the finding pushed the corpus from 65 to 67 and reddened the control the register was reporting green on. | defect | high | fixed here — the non-existent modules are described rather than spelled, and only paths that resolve are written as paths. The rule this yields: **a record document may spell a path only when the path resolves**; a dangling module is named in prose | product-owner | closed |
| F-44 | **THE WHOLE-TREE RUNNER COULD NOT REPORT GREEN, AND THE CAUSE WAS NEITHER 119 NOR THE FLAKY SUITES.** `test/work/single-entry-two-mode.test.mjs`'s `captureLog` runs a real CLI entry IN-PROCESS and restores `console.log`/`console.error` but NOT `process.exitCode` — which `src/cli.mjs` sets on a refusal at ten sites rather than throwing. `run(["graph","build"])` passes its assertion and leaves `process.exitCode = 1`; `scripts/test.mjs` folds a truthy `process.exitCode` into the run's result, so the whole 1,031-suite run exited 1 with **every line reading `ok`**. Measured: a run reporting **9,347 pass / 0 fail** still exited 1. | defect | high | **fixed at the root** — `captureLog` now saves, clears and restores `process.exitCode`, and RETURNS it so a case can still assert a refusal's exit status. Mirrors `test/command/cli-session-boot-closure.test.mjs`'s `invoke`, which solved this one file earlier and whose comment names the class. Verified: the CLI-invoking suites go 30 pass / 1 fail → **31 pass / 0 fail, exit 0** | — | closed |
| F-45 | **The runner cannot ATTRIBUTE a leaked `process.exitCode`, and its suite loop is digest-frozen against the fix.** A red run with nothing red in it is unactionable at the gate — the row it writes carries no failure to name (`F-42`), and it cost three whole-tree runs plus two mis-attributions (`F-43`) to trace by hand. The fix is small (report the leak against the test that left it, and clear it), but `53/FF-5311` REG-MUT-11 freezes the suite loop, the global-home handling and every runner line outside the labelled registration blocks (ADR-011 §1). | design-gap | high | **not taken here, deliberately.** The control fired on the attempt and is right to: amending a delivered control's frozen claim to admit a drive-by edit during a milestone accept is the weakening 119 exists to refuse. Owed as its own item with an ADR amendment, the way `119/03` took `F-26` | architect | open |
| F-43 | **The whole-tree run is RED on two suites that are green in isolation, and neither is reachable from 119's diff.** `test/assignment/slots-before-work.test.mjs:192` ("capacity refusals are answers, not lane faults") and `test/store/cache-read-boundary-holds.test.mjs:312` ("no finding is reported for the cache-only ref 07") fail inside the 1,031-suite run and pass together standalone — 39 assertions, exit 0 — with nothing else running on the machine. Dispatch capacity and the cache/disk boundary are both untouched by this milestone. | defect | high | non-blocker for 119 → `TECH_DEBT` item **27**'s named species ("one that the focused run reports GREEN"). **Amended after `F-44`:** these two are genuinely flaky — a later whole-tree run passed both, 9,347 pass / 0 fail — but they were NOT what kept the gate red, and attributing the red to them was wrong. They stay open as flakes; the blocker was `F-44` | TECH_DEBT 27 | open |
| F-42 | **The gate can record a red row it cannot explain.** At `49fccd25` the gate wrote `the runner exited 1 and enumerated no failure`, while the SAME tree run directly enumerated both failures in TAP. `regressionGate` reads `outcome.report.failures` and discards the runner's stdout, so when the report parse yields nothing the row carries no detail and the evidence is gone. | defect | high | non-blocker for 119 → the gate should persist the runner's output (or its tail) beside the row; a gate that can say it failed but not why is `F-09`'s second fault (a run that reports nothing is indistinguishable from one that never happened) in a different surface | backlog | open |
| F-41 | **The first regression-gate run was invalidated by concurrent activity in the same session.** Eight spawn-heavy suites (SEA asset seam, bundle manifest, advertised paths, and the four mesh/work UI server lanes) went red during the 40-minute whole-tree run and every one passes in isolation — 50 assertions, exit 0. The cause was this session running `aof work debt`, `node -e` measurements and a recursive `diff` while the gate was live. | defect | high | non-blocker for 119 → the run was discarded and re-run untouched. `119/03` already recorded the same species (14 installer suites failing on PowerShell spawns under contention); this is its second instance, and the first where the polluted run was a GATE | backlog | closed |

## Accept decision

**ACCEPTED** — 2026-09-07, on a green whole-tree regression gate at `55130976`
(`REGRESSION.md`: `scope all`, `green`, "may stand as the accept gate"). No override was used.

The five stories are accepted on their own lanes, each green with `validate` PASS and no
`control-unresolved`: `119/00` (169/1, the one red external and registered as `F-01`), `119/01`
(11/0), `119/02` (16/0), `119/03` (21/0), `119/04` (68/0). Every blocker finding raised in review is
closed — `F-25` by ADR-004's third reader, `F-39` by asserting the edge rather than the spelling —
and every remaining open finding is triaged non-blocker.

**The gate took four runs, and only the fourth measured this milestone.** Run 1 was polluted by this
session's own concurrent commands (`F-41`). Runs 2 and 3 were red on a cause that was neither 119 nor
the flaky suites first blamed (`F-43`, amended): `captureLog` in
`test/work/single-entry-two-mode.test.mjs` ran a CLI entry in-process without restoring
`process.exitCode`, so a run reporting **9,347 pass / 0 fail** still exited 1 (`F-44`, fixed at the
root). The register's own first draft reddened FF-11903 by spelling three non-existent modules as
paths while reporting on unresolvable citations (`F-40`, fixed). Two instrument gaps are left open
and routed: the gate cannot explain a row it wrote (`F-42`), and the runner cannot attribute a
leaked exit code because `53/FF-5311` freezes its suite loop (`F-45`).

**The `TECH_DEBT` discharge is five entries, not the SPEC's seven.** Items 10, 61, 63, 78 and 84 are
deleted and the shrink-only ratchet re-stamped 4,082 → 3,634 lines / 77 → 72 oversize entries. Items
**81** and **83** are kept open and re-measured in place: 83 is half split (seams 3 and 4 remain,
`F-37`), and 81's ruling landed while its four named carriers did not — and this milestone measured
four further species FF-11902 cannot see, so the entry is more alive than when it was written
(`F-02`). Deleting either would have discarded the trend line the ledger exists for.

---

*Superseded draft verdict, kept because the reasoning it rested on was wrong and the correction is
the record:* **Stories ACCEPTED; milestone NOT YET ACCEPTED** — 2026-09-07.

The five stories are accepted on their own lanes, each green with `validate` PASS and no
`control-unresolved`: `119/00` (169/1, the one red external and registered as `F-01`), `119/01`
(11/0), `119/02` (16/0), `119/03` (21/0), `119/04` (68/0). Every blocker finding raised in review is
closed — `F-25` by ADR-004's third reader, `F-39` by asserting the edge rather than the spelling —
and the remaining open findings are all triaged non-blocker.

The **milestone** stays `in-progress` on two doors that are not the stories':

1. **The regression gate has not run.** `aof work regression-gate 119` refuses a dirty checkout, and
   this tree carries three other lanes' uncommitted work (123, 124, 125) alongside `119/04`'s own.
   `aof work status 119 done` therefore refuses `regression-gate-missing`, correctly: 63/R7 records a
   story lane green while the failure appeared only at the full-suite gate, and 119 moved ~1,190 files.
   This is the last milestone whose gate should be overridden.
2. **The `TECH_DEBT` discharge is a PO decision the gate has not reached.** `SPEC.md` deletes items
   10, 61, 63, 78, 81, 83, 84 at accept. `F-02` shows item **81** is not discharged (chore 120 is
   scheduled), and `F-37` shows item **83** is only partially discharged (seams 3 and 4 remain). Both
   need deciding at the milestone accept, not assumed by it.
