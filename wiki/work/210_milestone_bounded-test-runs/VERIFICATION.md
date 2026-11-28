---
doc: verification
updated: 2026-11-28
---
# 210 · Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-21001 | `test/arch/testing/acd-test-selection-reads-no-graph.test.mjs` | green (210/04) | planted `import { createCodeRelations } from "@aof/knowledge/graphify-code-relations"` at line 1 of `packages/work/src/testing/importers.mjs` (2026-11-27): `not ok - arch/210 FF-21001 (acd-test-selection-reads-no-graph): no testing module and not the test command opens a route to the code graph`, naming `packages/work/src/testing/importers.mjs:1`. Restored. |
| FF-21002 | a rewritten leg in `test/arch/testing/acd-one-selector-one-changed-set.test.mjs` | green (210/04) | planted `const SPECIFIER = /\bimport\s*["']([^"']+)["']/gu;` at line 48 of `packages/work/src/commands/test.mjs` (2026-11-27): `not ok - arch/210 FF-21002 (acd-one-selector-one-changed-set): only importers.mjs parses import specifiers or searches suite text for a path`. Restored. |
| FF-21003 | a leg in `test/arch/testing/acd-test-command-reports-not-decides.test.mjs` | green (210/04) | planted `form === "named" \|\| form === "all" ? [] : selected` in `packages/work/src/commands/test.mjs` (2026-11-27): `not ok - arch/210 FF-21003 (acd-test-command-reports-not-decides): the whole tree has two doors — the --all branch after the story-work check, and the regression gate`. Restored. |

## Verification evidence

### 210/00 E12 · a structural lane raises a finding for an importer left unrun with no reason

- **Procedure (2026-11-27, verify).** I built a scratch git project under the session scratchpad
  (`e12/`). It holds `src/record.mjs`, `test/record.test.mjs` (which imports it) and an empty
  `test/other.test.mjs`, with a minimal TAP runner and a `work.test` declaration. I committed it,
  changed `src/record.mjs` in the working tree, and recorded one named run with
  `aof test test/other.test.mjs --reason "the story's own suite"` (isolated `AOF_GLOBAL_HOME`). I
  then spawned an independent `aof-architect` as the structural lane. I gave it only the rendered
  continue skill's "The structural lane checks the choice of suites" paragraph, verbatim, plus where
  the diff and the records live. It was not told the expected result.
- **Result.** It ran `aof test --suggest` (`test/record.test.mjs — imports src/record.mjs`), read
  the record (`selected: ["test/other.test.mjs"]`) and raised exactly one finding, naming
  `test/record.test.mjs` and `src/record.mjs`. **Pass.**
- verifies → `stories/00_story_testing-instructions/tasks/01_skills-test-step.feature` E12

### 210/00 E13 · a stated exclusion is accepted

- **Procedure.** The same project, copied to `e13/`. Its only record is a named run whose reason is
  `the story's own suite; test/record.test.mjs left out: it binds :4182`. A second, independent
  `aof-architect` lane got the same paragraph and the same pointers.
- **Result.** `--suggest` reached the same suite, and the lane raised **no finding** because the
  recorded reason names it as deliberately left out. **Pass.** The lane also remarked that the stated
  cause was false, since the suite binds no port. That is the designed boundary (210/00 Q1: a stated
  exclusion is accepted), not a defect.
- verifies → `stories/00_story_testing-instructions/tasks/01_skills-test-step.feature` E13

### Verify sweep: every story's suites plus all of `test/arch` (2026-11-27)

- **Procedure.** I read `wiki/TESTING.md`, then made one named run of 584 suites with an isolated
  `AOF_GLOBAL_HOME`: every suite the six stories named in STATE, plus all 562 `test/arch` suites,
  so control reds surface before the milestone gate (one-gate-run). The recorded reason excludes
  `test/store/global-work-propagation.test.mjs` (binds `:4182`) and `test/memory/recall-replay.test.mjs`
  (slow, recall unchanged). The native `node:test` files `packages/work/test/status-gate.test.mjs`
  and `packages/work/test/testing.test.mjs` ran separately under `node --test`.
- **Result: red, 6 failing cases plus 1 native.** `arch/38 ADR-006` (F-07), `arch/FF-16801` (F-08),
  both codebase-grounding controls (F-09), `arch/FF-6607b` (F-10), `autonomous-shell-out/door`
  (F-14, already red at HEAD) and `160/04 The pool stops when its parent dies` (F-13, green 4 of 4
  alone). Native: status-gate "regression gate records the configured whole-tree runner result" is
  red (F-12), and `testing.test.mjs` is green. The run's pre-existing labels were all `unmeasured`
  (F-11). Every other case of the 584 suites passed, including FF-21001, FF-21002 and FF-21003 and
  all of 210/01, 210/02 and 210/03's suites (test-importer-scan, test-run-record,
  test-command-contract, grade-record-envelope, loop-suite-registration, grade-report-normalisers,
  test-record-one-writer, gate-result-is-evidence, regression-gate, example-map-parse,
  example-answer-one-reader, application-assembly, loop-record-never-gates).
- verifies → 210/01, 210/02 and 210/03's `@executable` scenarios. They are green, and none of the
  reds is in a module those three stories changed.

### Verify round 2 sweep: the same suites, after the fix round (2026-11-28)

- **Procedure.** I read `wiki/TESTING.md`, then made one named run of 586 suites with an isolated
  `AOF_GLOBAL_HOME` (record `20261128T010618568Z`): round 1's 584 suites, plus
  `test/audit/cited-path-resolve.test.mjs` and `test/work/wiki-citations.test.mjs`, which read the
  rename-ledger forwards 210/04 added. The same two suites were excluded, for the same reasons. The
  native `status-gate.test.mjs`, `testing.test.mjs` and `citation-history.test.mjs` ran under
  `node --test`.
- **Result.** Native: 13 of 13 green. Sweep: every case F-07, F-08, F-09, F-10 and F-12 named is
  green (`arch/38 ADR-006`, `arch/FF-16801`, both codebase-grounding controls, `arch/FF-6607b`).
  The sweep was red on eight cases. 198's session committed `1a0419dd` at 00:56 while the sweep ran
  (00:39–01:06), so the run measured a tree that changed partway through. Seven of the reds are on
  198's design-system surface: three `198/02` practice cases, the `design-system` descriptor in
  `application/registration`, `FF-12405 leg 9` and `FF-20106 leg 3` (renders of `design-system.md`
  and `refine.md`), and `autonomous-shell-out/door` (F-14). The eighth is `160/04` (F-13). A named
  rerun of those five suites on the settled tree (tree `d4f04ae`) is red on F-14 alone, and
  labels it **pre-existing** against base `1a0419dd`. None of the reds is in a file 210 changed.
- **F-11 proved live on this repo.** Round 1 labelled every red `unmeasured`. In round 2 the base
  tree answered, and both runs labelled their HEAD reds pre-existing, under
  `# pre-existing — also failing on the base (HEAD), not this work's to fix`. This is the SPEC's
  third outsider check, on this repo.
- verifies → 210/00, 210/04 and 210/05's `@executable` scenarios, including the six `@bug
  @finding-F-07…F-12` scenarios; `stories/05_story_bounded-fix-rounds/tasks/02_pre-existing-reds.feature`
  (F-11) on this repo.

### Regression gate 1 (2026-11-28)

- **Procedure.** `aof work regression-gate 210` on a clean tree at `f42f9a9e`, with an isolated
  `AOF_GLOBAL_HOME`: 16,274 of 16,274 cases, 235 units, 51.7 min, 8 workers.
- **Result: red, 4 cases in 3 units** (F-15, F-16). Nine units were red in the pool and green
  alone ("not isolated"). These are load flakes, which the gate logs but does not fail on.
  `global-work-propagation` ran in the gate beside the live daemon on `:4182` without conflict:
  since the 129 gate it uses a fake listener, so `wiki/TESTING.md`'s hazard note about it is
  out of date.
- verifies → the milestone gate (REGRESSION.md row 1).

### Regression gate 2 (2026-11-28)

- **Procedure.** F-15 and F-16 were fixed and checked with one named run of 572 suites (all of
  `test/arch`, the four red suites and the consumers of continue's prose), which was green, plus
  core's native `application.test.mjs` (2 of 2). The fixes were committed (`1a9037dd`), then
  `aof work regression-gate 210` ran on a clean tree at `ef8b280f` with an isolated
  `AOF_GLOBAL_HOME`.
- **Result: green.** 16,274 of 16,274 cases ran in 255 units over 51.0 min, and no unit failed.
  Nine units were red in the pool and green alone; these are load flakes, logged and not failed.
- verifies → the milestone gate (REGRESSION.md row 2, "may stand as the accept gate").

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `wiki/TESTING.md` still said "`aof test --failed` lands with milestone 210's fix-round story; until then, rerun the failing suites by name", after 210/05 shipped `--failed`. An agent reading the instructions would skip the fix round this milestone exists to provide. Distinct: no prior finding has this cause. | defect | low | closed at this accept: the paragraph was removed. No suite reads the file's text (the tests use its path only) | product-owner | closed |
| F-02 | `ARCHITECTURE.md`'s register still marked FF-21001, FF-21002 and FF-21003 "— pending (210/04)" after all three controls had landed and gone green. Doctor resolves them from disk, so nothing refused the stale text. This is the same cause and evidence as m126/F-06 and m126/F-10, m127/F-07, m71/F-71-C and m58/F-58-02-3: the sixth time across milestones. | defect | low | closed at this accept: the markers were dropped, as each prior occurrence was. The recurrence goes to `RETROSPECTIVE.md` | product-owner | closed |
| F-03 | ADR-004 says every red summary ends with `aof test --failed`, but 210/05 ends a run whose round latches its chain with the hand-over instead, and flagged this for verify. Printing a command that ADR-005 refuses (`test-fix-stopped`) would contradict the latch. The operator's 210/05 Q1 also holds that a stopped chain is never re-opened. The behaviour is right and the ADR wording was incomplete. Distinct. | design-gap | low | closed at this accept: ADR-004 now states the exception, ratifying the build | architect (ADR-004) | closed |
| F-04 | The structural lane's prose says to compare with "`aof test --suggest` for the story's changed files", but `--suggest` takes no files (a file argument is refused `test-form-conflict`) and reads the whole working tree against HEAD. Both independent E12/E13 lanes hit the refusal. In a checkout that also holds another session's uncommitted work (this one holds 198's), the suggestion includes that work's reach, so the lane would ask for suites the story never touched. Distinct from the concurrent-tree gate findings (m71/F-71-K, m63/F-63-I), which concern whole-tree measurement. | design-gap | medium | non-blocker: E12/E13 pass with the bare form. Deferred to backlog: either `--suggest <file>…` or prose naming the bare form and its whole-tree scope | product-owner backlog | open |
| F-05 | `aof test --failed`'s reach can select a suite the project's instructions say must not run on this machine (`test/store/global-work-propagation.test.mjs` binds `:4182`). Nothing lets a project declare that to the tool, and 210/05's smoke round on this checkout had to be stopped by hand. Raised at 210/05's review and routed to the operator, and no item has been created yet. Distinct from m129/F-72 and m96/F-96-D, which concern the gate's run. (2026-11-28: the example is wrong. That suite has injected a fake server since the 129 gate and ran green beside the daemon in gate 1. The general gap, no declared hazard exclusions, stands.) | design-gap | medium | non-blocker for 210, whose ADR-004 reach is as designed. Deferred: a story "a fix round honours the project's declared machine-hazard exclusions", awaiting the operator's go | operator → backlog story | open |
| F-06 | `aof work run-start` resolved `sessionSource: live-store` to the wrong session three times (210/02 and 210/03's first runs, and 210/02's attempt 2 all name Claude session 916fbe69, the 198 session in the same checkout). With two live sessions in one checkout the live-store rung guesses, so observe's cost join for those runs is wrong. Distinct: no prior finding has this cause. | defect | low | non-blocker: run attribution, not delivered behaviour. Deferred to backlog | product-owner backlog | open |
| F-07 | The verify sweep is red on `arch/38 ADR-006 (acd-worker-checkout-reuses-worktree)`: "one materialization implementation across all runtime packages". `packages/work/src/testing/baseline.mjs` spawns `git worktree add` itself, beside `packages/execution/src/worktrees.mjs`. 210/05 chose its own `launchStep` path rather than widening mesh, and ran no `test/arch/assignment` control. | defect | high | blocker → `@bug @finding-F-07` in 210/05 task 02; 210/05 returned to `in-progress` | 210/05 (`aof:continue`) | closed: fixed in 210/05 (run 20261127T221322033Z-0001); arch/38 green in round 2's sweep |
| F-08 | The verify sweep is red on `arch/FF-16801 (acd-record-doc-map-one-home)`: `baseline.mjs` declares its own type → record-doc map instead of importing `RECORD_DOC_BY_TYPE` from `packages/work/src/identity.mjs` (168/ADR-002). | defect | medium | blocker → `@bug @finding-F-08` in 210/05 task 02 | 210/05 (`aof:continue`) | closed: fixed in 210/05; FF-16801 green in round 2's sweep |
| F-09 | The verify sweep is red on both `arch/codebase-grounding-no-parse` and `arch/codebase-grounding-via-commands`: their allow-lists still name `packages/core/src/application/bindings/config-inspect.mjs` as a graph reader, and it no longer is, since 210/00 removed the graph-freshness probe. Each control checks its own allow-list is honest. | defect | medium | blocker → `@bug @finding-F-09` in 210/00 task 00; 210/00 returned to `in-progress` | 210/00 (`aof:continue`) | closed: fixed in 210/00 (run 20261127T220729015Z-0003); both controls green in round 2's sweep |
| F-10 | The verify sweep is red on `arch/FF-6607b`: accepted items still declare controls that no longer resolve: `190/FF-19003 → test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs` and `72/FF-7202 → test/arch/acd-test-selection-widens-never-narrows.test.mjs`. 210/04 deleted the file and retired the control in 210's own notes, but not in 72's or 190's registers. | defect | high | blocker → `@bug @finding-F-10` in 210/04 task 02; 210/04 returned to `in-progress` | 210/04 (`aof:continue`) | closed: fixed in 210/04 (run 20261127T220903045Z-0001); FF-6607b green in round 2's sweep |
| F-11 | The sweep's red named run labelled every failure `unmeasured`: "the base's run did not answer: the declared testing instructions file "wiki/TESTING.md" does not exist or is not a file". The baseline reruns the failing suites in the base tree with the WORKING tree's test declaration, and that declaration names an instructions file the base does not hold. So on this repo today nothing can be labelled pre-existing, which is the SPEC's third outsider check. The same run also built a 471 MB baseline worktree with `yarn install --immutable` at `f6297600`, as ADR-006 designs. | defect | high | blocker → `@bug @finding-F-11` in 210/05 task 02 | 210/05 (`aof:continue`) | closed: fixed in 210/05; round 2's runs label HEAD reds pre-existing on this repo |
| F-12 | `packages/work/test/status-gate.test.mjs` (native `node:test`) is red: "regression gate records the configured whole-tree runner result" expects `runTest` called with `{ scope: 'all' }`, and 210/04 changed the gate to `{ all: true }`. 210/04 ran the native `testing.test.mjs` but not this file. | defect | medium | blocker → `@bug @finding-F-12` in 210/04 task 02 | 210/04 (`aof:continue`) | closed: fixed in 210/04; the native file is 4 of 4 green |
| F-13 | `160/04 The pool stops when its parent dies` (`test/testing/test-sharded-report.test.mjs`) timed out ("the runner started its two workers", a fixed 20 s window) inside the 584-suite sweep, then passed 4 of 4 alone. It is the fixed-window-under-load species that this Mac's gate memory names. 210 did not change `scripts/test-sharded.mjs`. | test-gap | low | non-blocker: a load flake, not 210's change. It recurred in round 2's 586-suite sweep and passed again alone. Deferred to backlog: replace the window with a boot-measured one | product-owner backlog | open |
| F-14 | `autonomous-shell-out/door: … complete pre-existing command-member set are unchanged` is red: its pinned inventory lacks `design-system`. It was already recorded at 210/00's build as red at HEAD, against unchanged bundle-composition code, and comes from 198's committed command. It is not 210's change, but the milestone gate will be red on it. | defect | medium | non-blocker for 210's stories → blocker for the milestone gate. Routed to 198, whose command it pins | 198 | closed 2026-11-28: with 198 idle, 210's verify added `design-system` (198/01) to the pinned set; the suite is green |
| F-15 | Gate 1 (`f42f9a9e`, REGRESSION.md row 1) is red on `154/05 01 high-risk row: continue` in `packages/core/test/bundle-runtime-variants.suite.mjs`: `claude:continue obligation /tests|test gate/i`. 210/00 rewrote continue's test step, and no render of continue said "tests" any more. No story's named run or verify sweep included that suite. Prior occurrence by cause: m168/F-03 (a first gate red on a check no story lane selected). | defect | high | blocker for the gate → fixed in this verify: the test step opens "**Run the story's tests on the suites you choose.**" in `continue.md` and the Codex workflow; renders, manifest, lock and the three continue goldens regenerated | 210/00 (fixed at verify) | closed |
| F-16 | Gate 1 is also red on three of 198's pins, none of them 210's: core's native catalog count (`application.test.mjs` 150 ≠ 149, since 198 F-05 added `design-system:canvas-pages`); the prompt audit's member count and its missing `command:design-system` row (51 ≠ 50); and `169/01 E2`, whose sidecar fixture lists the practices by hand and lacks `@aof/design-system`. Prior occurrences: m167/F-09 (a gate on a shared tree red on another milestone's reds) and m147/F-147-01 (a new command against pinned counts). | defect | high | blocker for the gate → fixed in this verify because 198 is idle (operator, 2026-11-28): count 150, member count 51 with an audit row on `command:teach`'s pattern, and `design-system` added to the fixture's practices | 198 (fixed by 210's verify) | closed |
| F-17 | Found by the operator after accept (2026-11-28). 210 removed `work.test.couplings` as a hard refusal and gave existing repos no migration: `aof test` refuses in every repo that still has the key (the portal holds 216 entries), and `/aof:map-tests` drafted a fresh file and ignored them. Verify never asked how an existing repo adopts the change; this is the case the opt-in-config adoption rule names. | defect | high | blocker missed at accept → fixed after it: `/aof:map-tests` carries each coupling into the instructions as an area row and deletes the key in the same write (Claude, OpenCode and Codex renders), and the refusal now points at `/aof:map-tests` | 210 (fixed after accept) | closed |
| F-18 | Found by the operator after accept (2026-11-28). The instructions file lived at `wiki/TESTING.md`, outside `work.dir`, which is aof's folder in a project and holds all its artifacts, and `/aof:map-tests` made that the default for every repo. Nothing decided the location; ADR-001 only gave this repo's path as an example. | defect | medium | fixed after accept: the default is `TESTING.md` under `work.dir`, and this repo's file moved to `wiki/work/TESTING.md` | 210 (fixed after accept) | closed |
| F-19 | Found at the first migration (`ai-workforce-platform`, 2026-11-28). `aof test --suggest` left 229 import specifiers unresolved there, including every `@workforce/runtime-contracts/<name>` import: the census export map placed exact `exports` keys only, and that package exports a subpath pattern (`"./*": "./src/*.ts"`). So a change to a contracts file suggested no suite. 210/01's outcome assumed the map resolved workspace specifiers. | defect | high | fixed after accept: the map expands a pattern export into every file its target matches, as Node does (229 → 133 unresolved, all third-party; a contracts change now reaches `apps/agent-runner/test/identity.test.ts`); native case red-probed | 210/01 (fixed after accept) | closed |

Prior occurrences (recalled at triage; none closes a finding here): F-07 is another worktree door
beside the common one, as m72/F-72-B was. F-09 is a milestone's own code turning the
codebase-grounding pair red, as m96/F-96-A and m72/F-72-U did. F-10 is FF-6607b on an accepted
register, as m55/F-55-M-1 and m124/F-03 were. F-13 is the fixed-window-under-load species of
m54/F-54-01-1, m96/F-96-H and m172/F-172-13. F-14 is a new command reddening a pinned census, as
m145/F-145-02 and m147/F-147-01 were, and a gate red on another milestone's change, as m167/F-09
was. F-08 and F-11 are distinct incidents.

## Accept decision

- **2026-11-27 — 210/01, 210/02 and 210/03 accepted.** Their scenarios are green in the verify
  sweep, validate passes, and no blocker finding is theirs. F-06, run attribution in 210/02's and
  210/03's runs, is a non-blocker.
- **2026-11-27 — 210/00, 210/04 and 210/05 declined, returned to `in-progress`.** Each now carries
  `@bug` scenarios for its blockers: 210/00 F-09; 210/04 F-10 and F-12; 210/05 F-07, F-08 and F-11.
  Next is `aof:continue` on each.
- **The milestone is not accepted.** Three stories are open. The gate also needs a clean commit of
  210's work. 210's work is uncommitted and shares generated files with 198's uncommitted work in
  this checkout. F-14 (198's) would make the gate red as well.
- **2026-11-28 — 210/00, 210/04 and 210/05 accepted (round 2).** Their blockers F-07 to F-12
  are closed: the `@bug` scenarios and every control those findings named are green in round 2's
  sweep, and the native files are green. The only red on the settled tree is F-14, 198's census
  pin, which 210's own tooling labels pre-existing at HEAD. Stream validate passes, and doctor
  reports no unresolved control. F-04, F-05, F-06 and F-13 stay open as non-blockers.
- **The milestone is not accepted: the regression gate has not run.** `aof work regression-gate
  210` needs a clean checkout, and 210's work is still uncommitted, in the same tree as 198's
  edits. F-14 (198's) will make the gate red until 198 updates its census pin.
- **2026-11-28 — Milestone 210 accepted.** All six stories are done. Gate 2 is green at
  `ef8b280f` (REGRESSION.md row 2). Validate passes, doctor reports no unresolved control, and no
  blocker finding is open: F-15 and F-16 were fixed in this verify. F-04, F-05, F-06 and F-13 stay
  open as non-blockers.
