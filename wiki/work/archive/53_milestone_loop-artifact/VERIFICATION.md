---
doc: verification
---
# 53 · The loop artifact — Verification

## Verification evidence

### 53/00 — the story's own lane (six `@executable` features, five suites + the split arch gate)

All six task features carry `@executable` at feature level and nothing carries `@manual` or `@uat`,
so the story's lane is the automated one alone. The `@manual soak (53/04)` cells in
`04_codex-is-not-a-pty-path.feature`'s second Examples table are a **case-DESIGN deferral to 53/04**,
not `@manual` scenarios in this story's scope — no human step applies here.

Scoped to the story per the suite-scoping rule (the whole-repo suite runs once, at the milestone
gate): the five suites `scripts/test.mjs` registers under its `// milestone 53 / story 00` block,
plus the one pre-existing arch gate this story edited. Run in one process with a per-test hermetic
`AOF_GLOBAL_HOME`, mirroring `runSuite()`.

- **`agent-session-driver-door` (18)** — both doors export all seventeen frozen names by aliased
  static import (a missing re-export is a link error, never a runtime `undefined`), the nine constants
  agree by value, the eight functions by reference identity, and the fresh-process link probe carries
  a bogus eighteenth name as its non-vacuity control. **18/18 green** — 16 as delivered, plus the two
  lanes added closing F-02.
  `verifies → tasks/00_the-two-doors.feature`, `tasks/01_the-importers-stay-put.feature`
- **`agent-session-driver-drives` (21)** — the drive still runs from the new home over the same
  `{ptySpawn, which}` seam; only the leaf spawn and PATH lookup are faked, so real provider
  resolution runs. **21/21 green.**
  `verifies → tasks/02_the-driver-still-drives.feature`
- **`agent-session-driver-transcript` (20)** — both watches settle identically against a real
  transcript tree, producer-fed, hermetic via `CLAUDE_CONFIG_DIR`, mtimes set explicitly. **20/20
  green.**
  `verifies → tasks/03_the-transcript-watches.feature`
- **`agent-session-driver-runtime-dispatch` (11)** — `codex` stays a one-shot child, everything else
  the PTY session; `buildDriverCommand` is fail-closed `null` for every other id. **11/11 green.**
  `verifies → tasks/04_codex-is-not-a-pty-path.feature`
- **`agent-session-driver-gate-aim` (10)** — the split gate reads exactly two sources, each invariant
  against the file carrying its subject, invariant 1 aimed by a positive control. **10/10 green.**
  `verifies → tasks/05_the-gate-keeps-its-aim.feature`
- **`test/arch/acd-worker-driver-no-headless-print` (8)** — the pre-existing gate, post-split.
  **8/8 green**, including its own registration leg.

**Lane total as delivered: 86 / 86, 0 failures** (working tree clean at `c5af6af`). **After the F-01 /
F-02 fixes: 88 / 88, 0 failures**, re-run three consecutive times.

### 53/00 — the F-01 / F-02 fixes, and the regression sweep around them

- **`test/item-lock-holder-identity.test.mjs`** — the suite F-01 took down. **20/21 red before the
  fix, 21/21 green after.** The m42 resume lane at `:283` constructs the real handler with no
  injected seam, which is exactly the site that threw.
- **`test/mesh-terminal-input-path.test.mjs`** — a SECOND pre-existing suite F-01 took down, which
  the story commit's own account of the defect did not name. **16/18 red before the fix** (two
  `terminal-resume/worker` lanes, both `ReferenceError`), **17/18 after**. The one that remains is
  F-05 — pre-existing and unrelated, proven below.
- **Regression sweep over the sink's other consumers** — `mesh-terminal-signal-source` (14),
  `arch/acd-terminal-output-signal-source` (5), `arch/acd-terminal-mirror-geometry-pinned` (2),
  `arch/acd-terminal-view-live-observable` (4): **25/25 green**, no change from the fix.
- **The red probes for both new lanes** are recorded against F-02 below. They matter more than usual
  here: F-02 exists *because* a green check was blind, so a new check nobody has seen fail would be
  the same defect wearing a different regex.

### 53/00 — RE-VERIFICATION 2026-08-16 (post-remediation, on the committed bytes)

The decline below was remediated in the working tree; the fix has since been committed as
**`b433832 fix(m53): bind every inward session-driver consumer`** (the same two files, 92 insertions).
Every run in this section was made against a working tree with an **empty `git diff` against
`b433832`** — so this evidence is on the bytes that shipped, not on a tree that merely resembled them.
Run in one process, per-test hermetic `AOF_GLOBAL_HOME`, mirroring `runSuite()`.

- **The story's own lane, whole: 88 / 88, 0 failures** — door **18/18**, drives **21/21**, transcript
  **20/20**, runtime-dispatch **11/11**, gate-aim **10/10**, `arch/acd-worker-driver-no-headless-print`
  **8/8**. The two lanes closing F-02 are inside the door's 18 and both pass.
- **`item-lock-holder-identity` — 21/21.** The suite F-01 took red (20/21) is green.
- **`mesh-terminal-input-path` — 17/18**, the one red being **F-05** at `:471`
  (`TypeError: completionResolve is not a function`), proven pre-existing below.
- **The sink's other consumers — 25/25**: `mesh-terminal-signal-source` (14),
  `arch/acd-terminal-output-signal-source` (5), `arch/acd-terminal-mirror-geometry-pinned` (2),
  `arch/acd-terminal-view-live-observable` (4).
- **All twelve lanes in one process: 151 / 152**, the single failure being F-05.

**The F-02 checks were red-probed independently at re-verification, not taken on the record's word.**
F-02 exists because a green check was blind, so accepting on an unprobed replacement would repeat the
defect. Reverting `driveInteractiveClaudeSession` out of the sink's inward `import` at `:155` and
re-running turned all three red, each with the message it should carry:

- the derived-census lane → `driveInteractiveClaudeSession used but not imported`;
- the construction lane → `ReferenceError: driveInteractiveClaudeSession is not defined`;
- `item-lock-holder-identity` → back to **20/21** with the same `ReferenceError`.

The import was restored and the tree re-confirmed byte-identical to `b433832`.

### 53/00 — agent-run structural confirmations (product owner, at the source)

Criteria the story states that no suite yet enforces (FF-5301/FF-5302 are 53/05's — see F-04), read
directly off the shipped bytes:

- **The sink shrank and is measured shrinking** — `src/mesh-worker-execution.mjs` is **2,313 lines**
  at `b433832` (2,304 as first delivered; the F-01 fix added nine lines of comment recording why the
  inward count is three), from 3,286. `src/agent-session-driver.mjs` is 1,073. Matches the criterion's
  `~2,300`, not ADR-001 §4's "roughly 2,400".
- **The driver's import set is the frozen five plus node builtins** — `work-observe.mjs`,
  `terminal-providers.mjs`, `terminal-ws.mjs`, `degrade.mjs` as `import`, and `claude-trust.mjs`
  reached by `export … from` at `:664`. No `run-store`, `effects/*`, `mesh-*`, `global-work-store`,
  `workspace*`, `board-*` or `commands/*`.
- **`src/work.mjs` is not touched** — absent from the story commit's file list.
- **The sink defines none of the seventeen and re-exports all seventeen** — the `export { … } from
  "./agent-session-driver.mjs"` block at `:847-869`; reference identity proven by the door suite.

### 53/04 — the story's own lane (one `@executable` task, one `@uat` task)

Task 00 carries `@executable`; task 01 carries `@uat`. Scoped to the story per the suite-scoping rule:
the one suite `scripts/test.mjs` registers under its `// milestone 53 / story 04` block, plus the two
controls this story's acceptance names by id (FF-5310, FF-5311). Run in one process with a per-test
hermetic `AOF_GLOBAL_HOME`, mirroring `runSuite()`. Two consecutive runs, identical results.

- **`autonomous-shell-out-prompt` — 7 / 8, one failure.** Green: the body's single shell command and
  its five explicit refusals; the verbatim halt reporting with no prose phase map, run ledger, stop
  list or reader-owned progress; the `--solo`/`--ship`/`--max-attempts` survivors with the prompt's
  config reads narrowed to two keys; the door's identity, namespace, invocation and complete
  pre-existing 25-member command set with no `loop`/`drive-*` rival; the derived-manifest leg (the
  shipped manifest regenerates byte-identically, the autonomous address is a true content address and
  has moved, and `refine`/`continue`/`verify` are byte-unchanged at their pinned addresses); the clean
  render writing the edited body; the spawned-CLI directive leg (milestone continue → `/aof:autonomous`,
  story continue → `/aof:continue`, refine/verify single-phase, unresolvable ref degrading); and the
  runner-wiring leg. **Red: the locked "exactly one rendered path content-address moves" lane** — see
  **F-09**.
  `verifies → tasks/00_the-prompt-hands-over.feature`
- **The suite is imported AND spread** in `scripts/test.mjs:2633` / `:2702`, inside this story's own
  labelled `// milestone 53 / story 04` block — the ADR-011 §1 obligation the story's last acceptance
  bullet states, met in the same commit (`2c744b9`) as the prompt change it mechanises.
- **`aof work validate 53/04` — PASS.** `aof work doctor 53/04` — clean at BOTH severities: no
  `control-unresolved` at error or warn (the FF register lives at milestone scope), only the
  stream-wide `numbering-gap` warn.
- **`@uat` (task 01) — NOT RUN, and not runnable today.** See **F-12**; no human was asked, because the
  scenario's own Background is unsatisfied and a run made in this state is VOID by its own terms.

### 53/04 — the two controls its acceptance names, measured

- **FF-5310 (`test/arch/acd-loop-cap-single-home.test.mjs`) — 3 / 4.** The three green lanes are the
  ones carrying this story's headline: `work.autonomous` introduces no second key and `loop.mjs`
  declares no private cap default; `autonomous.md` is a thin `aof work loop` door with none of the
  seven prose shell tokens surviving; the bundle gains no loop/drive wrapper and retains `autonomous`.
  **The reader-set lane is RED — see F-10.**
- **FF-5311 (`test/arch/acd-loop-suite-registration.test.mjs`) — 6 / 6 green**, including the leg that
  makes 53/04's own registration reachable exactly once.

**Red probe, FF-5310's door lane** (the control this story's headline criterion turns on, and the one
lane a green-by-construction assertion would be most invisible in): the pre-story prose body was
restored over `src/bundle/commands/autonomous.md` from `9e0f910` and the lane re-run. It went **RED**,
naming all seven survivors — `Loop until, aof work next, aof work run-start, run-retry, maxAttempts,
heartbeatStaleMs, stop_conditions`. The file was restored from git and re-confirmed clean.

## Fitness functions

Measured at the milestone gate, 2026-08-20. **All thirteen declared controls now resolve on disk**
and all thirteen are registered and green — F-04 (thirteen `control-unresolved` at **error**) is
closed by measurement: `aof work doctor 53` reports no `control-unresolved` at either severity.

Each row's **red probe** was performed at this gate by mutating the control's own SUBJECT on disk,
running that control alone in a fresh process, and restoring the file from git — the working tree was
verified CLEAN before and after the sweep. Every probe went red with a message that names the
invariant, so no row here records an assertion nobody has watched fail.

The four boundaries this field does NOT reach are the template's, word for word: it does not catch a
fabricated probe; it does not reach any assertion that is not a declared control (the obligation is
the `FF-NN` ids alone, never every scenario in every `.feature`); it does not record whether the probe
was performed on the bytes that shipped; and it does not survive a reflow of its own placeholder.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-5301 | `test/arch/acd-session-driver-mesh-blind.test.mjs` | GREEN 3/3 | added `import "./run-store.mjs"` to `src/agent-session-driver.mjs` → RED 1/3: *"the driver's direct source-import set is the frozen five, including export-from"*, the actual set carrying a sixth specifier |
| FF-5302 | `test/arch/acd-session-driver-single-home.test.mjs` | GREEN 4/4 | appended an eighteenth export `PROBE_EXTRA` to `src/agent-session-driver.mjs` → RED 1/4: *"an extra export is as much a defect as a missing export"*, delta `extra: ['PROBE_EXTRA']` |
| FF-5303 | `test/arch/acd-phase-door-not-a-driver.test.mjs` | GREEN 3/3 | imported `driveInteractiveClaudeSession` into the shipped door `src/commands/continue.mjs` → RED 1/3: *"driveInteractiveClaudeSession would turn a where-decision into an executor"* |
| FF-5304 | `test/arch/acd-loop-probe-contract.test.mjs` | GREEN 3/3 | added an eleventh key `probeKey` to `loopState()` in `src/commands/loop.mjs` → RED 1/3: *"LoopState key set/order is frozen"* |
| FF-5305 | `test/arch/acd-loop-level-l3-locked.test.mjs` | GREEN 3/3 | admitted `"L3"` into `LOOP_LEVELS` in `src/work-loop.mjs` → RED 2/3 on the frozen `['L1','L2']` vocabulary and the refusal lane that depends on it |
| FF-5306 | `test/arch/acd-loop-l1-read-only.test.mjs` | GREEN 2/2 | disabled the L1 short-circuit in `src/commands/loop.mjs` so L1 fell through the driving path → RED 1/2: the report channel emitted `'Driven 03/01 — continue (done).'` where L1 must only report acts |
| FF-5307 | `test/arch/acd-loop-state-rides-the-run-record.test.mjs` | GREEN 4/4 | added an eighth key `probeKey` to `buildLoopDeclaration()` in `src/work-loop.mjs` → RED 1/4 on the exactly-seven `brief.loop` key set |
| FF-5308 | `test/arch/acd-loop-scope-guard.test.mjs` | GREEN 4/4 | added a third scope form `story` (`53/02`) to `LOOP_SCOPE_FORMS` in `src/work-loop.mjs` → RED 1/4 on the frozen `['driver','range']` vocabulary |
| FF-5309 | `test/arch/acd-loop-ready-registry-optional.test.mjs` | GREEN 3/3 | gave `src/work-doctor-loop-ready.mjs` a direct `import { loadLoops } from "./work-loops.mjs"` → RED 1/3, the scorer's import graph naming `src\\work-loops.mjs` where it must be empty |
| FF-5310 | `test/arch/acd-loop-cap-single-home.test.mjs` | GREEN 4/4 | added a fifth cap resolver with its own literal `?? 3` to `src/work-loop.mjs` → RED 1/4: *"a fifth cap resolver is a second home; a missing recorded resolver is a stale permission"* |
| FF-5311 | `test/arch/acd-loop-suite-registration.test.mjs` | GREEN 6/6 | deleted the `...acdLoopScopeGuardTests` spread from the milestone-53 runner block → RED 1/6: *"acdLoopScopeGuardTests is spread exactly once"*, `0 !== 1` |
| FF-5312 | `test/arch/acd-registry-single-home.test.mjs` | GREEN 3/3 | reverted `src/commands/loops-show.mjs` to the retired string door `loadLoops(ctx.workspace.workDir)` → RED 1/3: *"loops-show.mjs: passes the workspace object"* |
| FF-5313 | `test/arch/acd-registry-framework-owned.test.mjs` | GREEN 3/3 | flipped the first `.aof/loops/` member's `kind` from `asset` to `template` in `src/bundle/bundle.json` → RED 1/3: `loop-autonomous-cascade: asset`, `'template' !== 'asset'` |

`aof work doctor 53` still reports `control-runner-unchecked` — no `work.controls.runners` is
configured, so leg B (does a runner name this file?) never ran for any of the thirteen. Leg B is
covered in fact but not by doctor: **FF-5311 is itself the registration control**, and it proves all
eleven `acd-loop-*` gates are imported and spread exactly once in the runner. The two 53/07 controls
(FF-5312/FF-5313) are outside FF-5311's eleven and were confirmed registered by reading the runner's
`// milestone 53 / story 07` block directly.

**A green control is not a green milestone.** Ten of these thirteen assert milestone 53's OWN
invariants and pass; the milestone-gate sweep below shows that milestone 53's code breaks four
controls belonging to OTHER milestones (52, 42 ×2, 47) plus the command↔route bijection — none of
which any `FF-53xx` row can see, because a milestone's own register only ever asks its own questions.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | **FIXED 2026-08-16.** `src/mesh-worker-execution.mjs:2019` consumes `driveInteractiveClaudeSession` as a VALUE (`options.spawnRuntime ?? driveInteractiveClaudeSession`), but the sink only RE-EXPORTS that name (`:865`, inside `export { … } from "./agent-session-driver.mjs"` — which binds no local name) and its inward `import` at `:146` names only `defaultSpawnRuntime` and `defaultPtySpawn`. `createMeshWorkerTerminalResumeHandler({nodeId})` therefore throws `ReferenceError: driveInteractiveClaudeSession is not defined` at construction unless the caller injects `spawnRuntime` — **which the production wiring at `src/mesh-launcher.mjs:1402` does not**, so this is on `startLauncher`'s worker-enrolment path, not a test-only break. Probed both ways: bare construction throws; `{spawnRuntime: …}` constructs. Directly breaks the story's headline criterion that all 45 pre-existing `test/` importers of the sink stay green — `test/item-lock-holder-identity.test.mjs` is **20/21, red** on its m42 resume lane at `:283`. Self-declared in the story commit message as a known defect deferred to verify — but its account of the blast radius was one suite short: `test/mesh-terminal-input-path.test.mjs` was taken down too, two lanes of it. **Fix:** `driveInteractiveClaudeSession` added to the sink's inward `import` at `:155`, the third name alongside `defaultSpawnRuntime`/`defaultPtySpawn`. Both suites now green. | defect | high | blocker → fixed inline at verify (operator's call), not routed back | developer / 53/00 | closed |
| F-02 | **FIXED 2026-08-16.** The census that should have caught F-01 counted TWO inward consumers when there are THREE, and the gate meant to hold it could not see the third: `test/agent-session-driver-door.test.mjs`'s inward-consumption lane asserted the resume handler's `probeSpawn` default **by source regex** rather than by constructing the handler, so it passed two lines below the `ReferenceError`. A hand-counted census is the defect; adding a fourth name to a regex would reproduce it. **Fix:** that lane's regex half is replaced by two lanes — (a) the inward set is now **DERIVED** from the sink's own body (parse the re-export clause, parse the inward import clause, scan everything else for any re-exported name used as an identifier, require the import to cover it), with a floor so a body-scan that stopped scanning cannot report a perfect empty set; and (b) `createMeshWorkerTerminalResumeHandler` and `createMeshWorkerExecutionHandler` are **CONSTRUCTED with no injected seam**, the way `mesh-launcher.mjs:1402` builds them — the site that evaluates the default. **Red probes: (i)** reverting F-01's import → derived census red naming `driveInteractiveClaudeSession used but not imported`, construction lane red with the original `ReferenceError`; **(ii)** the general case — a *fourth* inward consumer planted in the resume handler's body (`buildDriverCommand("codex")`, a re-exported name absent from the import clause) → both lanes red naming `buildDriverCommand`, which is the case the old regex could never have reached. | test-gap | high | blocker → fixed inline at verify, with the derived form rather than a longer list | developer / 53/00 | closed |
| F-03 | The story commit edits **three** pre-existing test files, not the "exactly one" its acceptance freezes: the admitted `test/arch/acd-worker-driver-no-headless-print.test.mjs`, plus `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs` and `test/arch/acd-terminal-view-live-observable.test.mjs`. Both extras are necessary and well-made — each pinned the sink's path for an anchor that moved, and each was re-aimed to FOLLOW the re-export chain (parsing the re-exported specifiers out of the sink) rather than to type a second filename, so the NEXT extraction is followed too. The defect is in the acceptance criterion's census, not the code: it was written without knowing those two gates read the sink's source. Recorded, not corrected — a delivered acceptance criterion is immutable. | defect | low | non-blocker → backlog; the criterion's "exactly one" is superseded in fact by three, recorded here as the divergence | product-owner / backlog | open |
| F-04 | **CLOSED 2026-08-20 by measurement.** All thirteen cited control files are on disk, registered and green, and `aof work doctor 53` reports no `control-unresolved` at EITHER severity — the accept rule's own test. Each also now carries a red probe. The sink's line-count ratchet this row worried about being unarmed is FF-5302, green 4/4 and probed. **The original finding follows.** This story's own two declared controls do not resolve — FF-5301 cites `test/arch/acd-session-driver-mesh-blind.test.mjs` and FF-5302 cites `test/arch/acd-session-driver-single-home.test.mjs`, neither on disk, neither carrying a `pending` marker, so `aof work doctor 53` reports both as `control-unresolved` at **error**. This is the milestone's own sequencing (all thirteen controls are 53/05's deliverable) and `aof work doctor 53/00` is clean because the register lives at milestone scope — so it does not block the story. **It does block milestone 53's accept**: the accept rule is "land the file or drop the declaration", never re-mark it `pending`. Consequence carried by 53/00 in the meantime: the sink's line-count ceiling/floor ratchet is unarmed, so the file can grow back through this seam undetected. | test-gap | medium | non-blocker for 53/00; hard gate on milestone 53's accept | 53/05 | closed |
| F-05 | `test/mesh-terminal-input-path.test.mjs:471` fails `TypeError: completionResolve is not a function` — the lane calls the resolver the fixture captures at `:436` without first waiting for it to be assigned, where its sibling lane at `:519` does exactly that wait (`await waitFor(() => completionResolve != null && …)`). Deterministic, 3/3. **NOT 53/00's**: proven by restoring the pre-extraction sink (`git show 9e0f910:src/mesh-worker-execution.mjs`, 3,286 lines) and re-running — it fails identically there, so the extraction neither caused it nor is blocked by it. It was masked in a different form until F-01 was fixed, which is the only reason it surfaces now. | defect | medium | non-blocker → backlog; a missing `waitFor` in the test, not a production fault | developer / backlog | open |
| F-06 | `53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch` is INTERMITTENT: observed failing twice in eight whole-lane runs, and **0 out of 15** when run in isolation — so it is load-sensitive wall-clock timing, not a logic fault, and it appeared only while other test processes were competing on this machine. A flaky lane inside a story's own evidence weakens that evidence rather than the code: a green run stops being a fact about the system. | test-gap | low | non-blocker → backlog; the lane needs a clock it controls rather than a real quiet-stretch race | developer / backlog | open |
| F-07 | At re-verification the twelve-lane focused run STALLED once — no output at all after 10 minutes, where the identical command later completed in about two. The stall was not reproduced (the same twelve lanes ran clean twice afterwards, and every lane run individually takes seconds), and no lane was located as its cause: the run was killed, so its buffered output was lost with it. Recorded rather than dropped because it is the same class as F-06 and points the same way — this story's evidence rests on lanes that wait on real wall-clock quiet stretches, so under machine load a green run is slow at best and uninformative at worst. Not a fault in the delivered code: all 88 story lanes are green on the committed bytes, three runs. | test-gap | low | non-blocker → backlog; folds into F-06's fix (a clock the lane controls) rather than needing its own | developer / backlog | open |
| F-08 | **CLOSED 2026-08-20 by measurement.** `aof work validate 53` is **PASS**; the malformed `04_gate-order-and-cap.feature` was repaired at `084bd1b`. Consequence worth carrying: repairing it took three of milestone 66's `feature-parse-strict` lanes red BY DESIGN — see F-19. **The original finding follows.** `aof work validate 53` fails on a story that is NOT 53/00: `stories/01_story_loop-engine/tasks/04_gate-order-and-cap.feature` — "structural parse failure: free text in step position at line 20 (a wrapped step continuation, or a narrative sentence beginning Given/When/Then/And/But)". `aof work validate 53/00` is PASS and this file is outside 53/00's scope, so it does not touch this accept. Surfaced here because the milestone register is where milestone-53 defects belong and this one is invisible from any single story's gate: it is a **hard gate on milestone 53's accept** alongside F-04, and it will also block `aof:continue 53/01`. Not investigated further — 53/01 is unbuilt and its contract is 53/01's to fix. | defect | medium | non-blocker for 53/00; hard gate on milestone 53's accept | 53/01 | closed |
| F-09 | **CLOSED 2026-08-20 by measurement.** ADR-015 §4's amendment landed: `04/tasks/00_the-prompt-hands-over.feature:205` now reads *"exactly TWO rendered paths' content-addresses move … and no third"*, naming both, and the suite agrees. 53/04's lane is 10/10. **The original finding follows.** **53/04, blocker.** `test/autonomous-shell-out-prompt.test.mjs:203-213` — the locked task-00 lane *"exactly one rendered path content-address moves"* is **RED**, deterministically (two runs): `moved.length` is **2**, not 1, because one authored source (`src/bundle/commands/autonomous.md`) renders to both `.claude/commands/aof/autonomous.md` and its mapped `.codex/skills/aof-autonomous/SKILL.md`. **This is already ruled.** `ARCHITECTURE.md` **ADR-015 §4** measured it at source and ruled the INSTRUMENT wrong: the scenario closes at **exactly two, and no third** — the `command → codex` mapping at `src/work-bundle-runtime.mjs:13-23` is pushed by `partitionByCapability` (`:55-59`) *before* the `declaredRuntimes.includes(runtime)` filter at `:61`, so the member's own `runtimes: ["claude"]` cannot suppress the skill. Forcing one address to hold still would need a deleted runtime output or a branched matrix — the first breaks the derived-manifest gate, the second is in 53/04's must-NOT-touch column. **The defect is that the ruling's named follow-on has not been carried out:** ADR-015 §4 requires the `.feature` amendment at `04/tasks/00_the-prompt-hands-over.feature:172` (*"exactly one"* → *"exactly TWO … and no third"*, naming both paths), `:169-170`'s manifest leg naming both, and the REFINEMENT INPUT comment at `:162-165` struck — plus the suite's `assert.equal(moved.length, 1, …)` moving to 2. Neither the contract nor the test was touched. Not a code fault: the shipped bytes are right and the manifest already records both moved addresses (`5274d68f…`, `688e5c98…`). | contract-defect | high | **blocker** → `aof:refine 53/04` applies ADR-015 §4's amendment, then the developer moves the suite's expected count; back to `aof:continue` and re-verify | product-owner → developer / 53/04 | closed |
| F-10 | **CLOSED 2026-08-20 by measurement.** The architect's ruling landed as `DECLARATION_INSPECTORS` in FF-5310 — the doctor's read-only declaration check is admitted BY NAME and separated from the four resolvers, which is the distinction the row argued for. FF-5310 is green 4/4 and its red probe (a fifth resolver with its own `?? 3`) still goes red. **The original finding follows.** **53/04, blocker.** FF-5310's first lane (`test/arch/acd-loop-cap-single-home.test.mjs:32-47`) is **RED**, deterministically (two runs): `work.autonomous?.maxAttempts` has **FIVE** module readers, not the four the story freezes. The fifth is `src/work-doctor-loop-ready.mjs:32` (`const declaredCap = config?.work?.autonomous?.maxAttempts`), landed by **53/03**'s Loop-Ready base check. This falsifies 53/04's acceptance criterion verbatim — *"The cap's reader set is exactly the measured pre-existing THREE plus `src/commands/loop.mjs`"* and *"This milestone adds no new default, no new key and no new resolution site."* Milestone 53 did add a fifth read site, in a different story. Mitigating but not exculpating: the doctor's read is a **declaration check**, not a resolution — it asks whether the cap is a non-negative integer and never falls back to `3` for use (its `FALLBACK_MAX_ATTEMPTS` appears only in the failure message at `:57`), so no second *home* for the resolved cap exists in fact. But FF-5310 as armed counts readers, the criterion as written says "no new resolution site", and the gate 53/04's own acceptance names by id is red. **Cause is 53/03's code; the failing criterion is 53/04's.** | defect | high | **blocker** → architect rules it: either FF-5310's `EXPECTED_READERS` admits the doctor's read-only declaration check with the reason stated in the row, or the doctor reads through an existing resolver. Not 53/04's to decide unilaterally | architect / 53 (ARCHITECTURE ADR) | closed |
| F-11 | **CLOSED 2026-08-20 by measurement.** HEAD is internally consistent: `src/bundle/manifest.json`'s recorded hashes for `.claude/commands/aof/autonomous.md` and `.codex/skills/aof-autonomous/SKILL.md` match the committed bytes exactly, on a clean working tree, and the rendered door names `aof work loop` carrying no prose-loop token. **The original finding follows.** **53/04, blocker with a one-command fix.** The story's commit (`2c744b9`) updated the authored source and the shipped manifest but **never committed the regenerated renders**, so HEAD is internally inconsistent: `src/bundle/manifest.json` records `.claude/commands/aof/autonomous.md sha256:5274d68f…48958cc1`, while the file committed at that path hashes to `sha256:7e54cc89…40c8316b` — the **pre-story prose-loop body**, the suite's own `oldAutonomousHash`. Same for `.codex/skills/aof-autonomous/SKILL.md`. The correct renders exist only in the working tree (`git status`: both modified, hashing to exactly what the manifest records). Consequence: a fresh checkout of HEAD carries the OLD `/aof:autonomous` — the prose loop, `aof work next` and all — so the story's headline outcome is not delivered by the committed state, and the `@uat` soak's Background clause *"this story's prompt change is installed, so `/aof:autonomous` renders the shell-out"* is false at HEAD. The story's own suite passes only because it reads the working tree. Closes by committing the already-generated renders; no source, test or machinery change. | defect | high | **blocker** → commit the regenerated `.claude`/`.codex` renders (and the matching `.aof/aof.lock.json`) with the story's diff | developer / 53/04 | closed |
| F-12 | **WAIVED 2026-08-20 by explicit operator decision — NOT closed by evidence.** The soak was never run; the sign-off below records a product-owner decision to accept without it, and its discharge condition. Every Background clause the original finding named is now SATISFIED (53/00–53/03 `done`, prompt installed at HEAD, payload deployed reporting `payload d5cea70+dirty.20260820T122119`), so the gate was runnable and was declined on cost, not on impossibility. **The original finding follows.** **53/04, the `@uat` lane was not run, and could not honestly be.** Task 01's soak is the milestone's only human gate and its Background is unsatisfied on three counts, each disqualifying by the scenario's own terms. **(a)** *"stories 53/00 through 53/03 are done"* — they read `in-progress`, `in-review`, `in-progress`, `in-progress`. **(b)** *"the payload is deployed … and `aof --version` reports `payload <buildId>` matching the deployed tree"* — it reports `0.1.0 (source 56b41ba+dirty)`, i.e. the npm-linked working tree, not a payload install; the feature's own Examples table rules that row **VOID — the change under test was not the one running**. **(c)** *"this story's prompt change is installed"* — false at HEAD per F-11. No human was asked to perform the procedure, deliberately: brokering a soak that its own contract voids in advance would spend the operator's attention to produce no evidence. The gate is deferred, not waived — `STATE.md`'s `- [ ] @uat signed off` stays unticked and this story cannot accept without it. | process | high | **blocker** → run the soak once F-09/F-10/F-11 are closed and 53/00–53/03 are `done`, against a real `node scripts/install-local.mjs` payload | operator (human) / 53/04 | closed (waived) |
| F-13 | **FIXED 2026-08-20 (inline at verify, operator's call).** `src/work-doctor-loop-ready.mjs:94`'s evidence string is reworded to *"The loop registry check reported N findings."* — the command id bought nothing in a human-readable message and was the whole of the violation. m52's FF-5202 is GREEN (2/2); 53/03's five suites stay 33/33 and FF-5309 stays 3/3. **The original finding follows.** **Milestone gate, blocker.** Milestone **52's** declared control **FF-5202** (`test/arch/acd-loop-module-import-boundary.test.mjs:68-76`, *"god-node, doctor, CLI and UI do not reference the loop family"*) is **RED**, and the file it names is milestone 53's: `src\work-doctor-loop-ready.mjs`. FF-5202 sweeps every `src/work-doctor*.mjs` against `/work-loops\|loops-show\|loops-graph\|loops-validate\|work:loops-/` over comment-stripped source; **53/03**'s scorer carries the literal `work:loops-validate` at `:94`, inside a human-readable evidence string (`` `work:loops-validate reported ${count} finding…` ``). The scorer does **not** import the loop family — the invariant FF-5202 exists to protect is intact in fact, and the token is a message, not a reach. But FF-5202 is a text grep by construction, and it is 52's control, not 53's to reinterpret unilaterally. This is invisible from 53/03's own gate: `aof work validate 53/03` is PASS and its doctor is clean, because a story lane never runs another milestone's controls — which is precisely the class of defect the milestone gate exists to catch. **Two honest fixes:** reword the evidence string so it does not carry the token, or amend FF-5202 to admit a non-importing evidence string with the reason stated in the row. | defect | high | **blocker** → architect rules which (the reword is the smaller change and keeps 52's control a pure text ban) | architect → developer / 53/03 | closed |
| F-14 | **FIXED 2026-08-20 (inline at verify, operator's call).** All seven unserved ops join `BOARD_DEFERRED` in `test/arch/acd-work-command-route-coverage.test.mjs`, each with its reason — and the reasons are the control's own established ones, not new licence. The three `loops-*` reads take a STRONGER form of the `status` carve-out: m52's own FF-5202 asserts `ui/` never references the loop family, so a served `/api/work/loops-*` would be a door no UI is permitted to open. The three `drive-<phase>` executors take the `dispatch` carve-out verbatim — the act reaches an agent through a spawned session, never an HTTP route — and `loop` joins them because the shell IS those drivers in sequence. **`src/board-ui.mjs` was not edited**, so the story partition's freeze held. All three bijection lanes GREEN (4/4). **The original finding follows.** **Milestone gate, blocker.** Milestone **15's** ADR-005 command↔route **bijection is broken by 53/02's four new commands**. Three controls are red together (`test/arch/acd-work-command-route-coverage.test.mjs`): the registry now exposes `work:loop`, `work:drive-refine`, `work:drive-continue` and `work:drive-verify`, and `src/board-ui.mjs` serves `/api/work` routes for none of them — *"registered command work:drive-continue has a served /api/work/drive-continue route (no command without a door)"*, and the behavioural leg confirms `/api/work/drive-continue` 404s. This is a **direct consequence of the milestone's own story partition**, which froze `src/board-ui.mjs` as a file "edited by nobody" (SPEC `## Stories`) to keep the stories independent — the partition bought concurrency and paid for it with this control. (The same failure names 52's `loops-show/graph/validate` in the expected set, so 52 is co-responsible for three of the seven missing routes; 53 owns four.) | defect | high | **blocker** → either serve the four routes from `board-ui.mjs` (a new story or a chore, since no existing 53 story may edit that file) or amend ADR-005's bijection to exempt local phase drivers with the reason recorded | architect → developer / 53 | closed |
| F-15 | **FIXED 2026-08-20 (inline at verify, operator's call).** Six ids added to `WORK_IDS`, and only four are milestone 53's. **The other two are pre-existing staleness this gate exposed and did not cause**: `work:resume` (`src/commands/resume.mjs:99`, m20/348's auto-resume face) and `work:init-config` (`src/commands/init-update.mjs:149`), both registered and both absent from the census before this milestone began. Recorded in the file rather than folded in silently. Census GREEN (26/26). **The original finding follows.** **Milestone gate, blocker.** `command-core/00 the registry exposes exactly the known work commands` is **RED** — the frozen registry census does not carry 53/02's four new ids. Same root as F-14 and it closes with it: a census that enumerates the work commands must move when the command surface moves, and 53/02 added four without moving it. | defect | high | **blocker** → add the four ids to the census with 53/02's diff | developer / 53/02 | closed |
| F-16 | **FIXED 2026-08-20 (inline at verify, operator's call).** Two halves, because the control has two lanes and they ask different things. (a) `runLoopBody`'s collector now defaults to `NO_PRINT`, so an un-injected core is SILENT — that is the lane about defaults, and it is the real fix. (b) The `cli.launch` body injects the printer explicitly, and `commands/loop.mjs` takes a `PRINTERS` row on category (2)'s own terms (a long-lived foreground body owning its announce lines, whose machine face is the probe that never launches). `PRINTER_CEILING` 11 → 12 — the argued edit the ratchet's own comment asks for. All three console lanes GREEN (3/3). **The original finding follows.** **Milestone gate, blocker.** Milestone **42's** declared control `acd-console-log-confined` is **RED on both its lanes**, and the file it names is 53/02's: *"console.log is confined to the declared printers (undeclared: commands/loop.mjs)"* and *"no module defaults a log collector to console.log (found: commands/loop.mjs) — use NO_PRINT"*. m42's rule is that a command renders and the face prints, and a core reports through an injected `log` collector whose default is `NO_PRINT`, never `console.log`. `src/commands/loop.mjs` does both of the forbidden things. Invisible from 53/02's own gate for the same reason as F-13. | defect | high | **blocker** → route the launcher's output through the declared face/collector seam, or declare `commands/loop.mjs` a printer in m42's list with the reason recorded | developer / 53/02 | closed |
| F-17 | **FIXED 2026-08-20 (inline at verify, operator's call).** The positional slice is DELETED, not ledgered. `capSites()`'s fallback probe is anchored at the read's own end (`/^\s*\?\?\s*(\d+)\b/`), so cutting `after` down to the statement first was pure redundancy — the regex never looked past the `??` it tests for. Same decision, no slice. m47's `F-47-04-ARCH-2` GREEN (4/4) and FF-5310 still GREEN 4/4 with its red probe still red. **The original finding follows.** **Milestone gate, blocker.** Milestone **47's** declared control `F-47-04-ARCH-2` (`acd-test-suite-registration`) is **RED**, and the file it names is 53/05's own: *"these fitness functions cut source POSITIONALLY, beyond what the ledger allows: `test/arch/acd-loop-cap-single-home.test.mjs` → 1 positional slice(s), ledgered for 0"*, quoting `const statement = after.slice(0, after.indexOf(";") >= 0 ? after.indexOf(";") : after.length);` — a slice whose end is a second `indexOf` sentinel, exactly the shape m47 bans and permits only to shrink. **This was known and left open:** `STATE.md`'s 53/05 row records *"The positional-slice violation and missing promised controls remain implementation obligations"*. So FF-5310 is green on its own subject while breaking the control that governs how fitness functions may read source. | defect | high | **blocker** → rewrite FF-5310's `capSites()` to parse rather than positionally slice, or ledger the instance with m47's owner's agreement | developer / 53/05 | closed |
| F-18 | **FIXED 2026-08-20 (inline at verify, operator's call).** The nine records carry `# aof-generated: true — framework loop record; installed by \`aof work update\`, edit it in aof, not here.` as the first line INSIDE their frontmatter, and ADR-005's asset branch now picks the stamp form by the file's own language: `#` for a frontmatter-bearing document, `//` for a script. **This is the only form such a file can carry, and that was measured, not assumed:** a leading comment breaks frontmatter parsing (the record must begin with `---`); an `aof-generated` frontmatter KEY is inadmissible because FF-5313 closes the vocabulary and the asset lane forbids the frontmatter form; and a marker placed after the frontmatter falls outside the detector's 512-char head window for two of the nine (`mesh-assignment-reclaim.md` ends at 697, `run-resilience.md` at 550). The frontmatter comment sits at offset ~4 and the record grammar ignores it — verified by loading all nine in an isolated registry: **nine nodes, parsed, no new finding**. `src/bundle/manifest.json` regenerated, the nine installed `.aof/loops/` copies refreshed byte-identical to source, and `.aof/aof.lock.json` reconciled through `aof work update` (**0 created, 0 updated, 132 up-to-date, 0 drift**; `.claude/settings.json` byte-identical). All three ADR-005 stamp lanes GREEN (4/4), FF-5312/FF-5313 still 3/3 each. **The original finding follows.** **Milestone gate, blocker.** ADR-005's generated-stamp contract is **RED on three lanes** (`test/arch/acd-generated-stamp.test.mjs`), each naming a **53/07** asset: *"`.aof/loops/autonomous-cascade.md` (asset) is recognised as managed"*, *"…carries the line-comment stamp"*, *"…has only the line-comment form"*. 53/07 delivered nine `.aof/loops/*.md` records as bundle `asset` members, and the aof-managed detection contract does not recognise them: a rendered member must carry exactly one stamp form, and these carry none. Consequence in the consumer repo: a delivered loop record is not detectable as aof-managed, so the no-clobber/drift machinery cannot reason about it the way it does about every other rendered member. **53/07's own FF-5312/FF-5313 are green and cannot see this** — they assert the records are verbatim, framework-owned and single-homed, never that they satisfy the cross-cutting stamp contract. | defect | high | **blocker** → give the loop records the asset stamp form ADR-005 requires, or amend ADR-005 to admit a stamp-free asset class with the detection consequence stated | architect → developer / 53/07 | closed |
| F-19 | **Milestone gate, caused by 53, owned by 66.** Three lanes of milestone **66**'s `feature-parse-strict` gate are **RED because 53 repaired its own malformed contract** (F-08, fixed at `084bd1b`). 66/00's Examples row 5 cites `53/01/tasks/04_gate-order-and-cap.feature:20` as the ONE live unparseable file in the corpus, and the test file says so in its own header and in all three failure messages: *"If it has been repaired, this red means RE-MEASURE AND RECORD the new population… it does NOT mean the parser broke."* Now `0 !== 1`. This is the designed hand-off firing exactly as intended, not a regression — but it is red at HEAD and 66 must re-measure before this branch is clean. | test-gap | medium | **non-blocker for 53's code, blocker for a green branch** → 66 re-measures and records the settled population (66/00 task 02's per-milestone table moves with it) | product-owner / 66 | open |
| F-20 | **Milestone gate — the branch carries ungoverned work.** `d5cea70 "Added opencode support"` is the HEAD commit and belongs to no milestone, story, chore or spike. It edits eight `src/` modules (`adapters.mjs`, `model.mjs`, `prompt.mjs`, `runtime-config.mjs`, `dsl.mjs`, `spine/flags.mjs`, `commands/assets-apply.mjs`, `bundle/bundle.json`), adds `src/opencode-hooks.mjs` and three bundle hooks, adds a whole `.opencode/` render tree, and adds `"opencode"` to this repo's `.aof/aof.config.json` runtimes — 3,372 insertions across 59 files, with no record doc, no acceptance criteria and no review gate. It accounts for at least four of the gate's red lanes (`bundle-asset-manifest-complete` **74 !== 71**, the codex skill-body render, the schema runtime/resource enums, and the `claude-settings` merge lanes). The branch also carries milestone **73** (`3d20e66`), which is what grew `src/work.mjs` to 1,286 lines and takes 66/00's two god-node ratchet lanes red — also not 53's. **Milestone 53 is being verified on a branch it does not control**, which is why this gate cannot certify "the suite is green" for 53 alone. | process | high | **blocker for the branch, not for 53's code** → govern `d5cea70` (`aof:assimilate-code` is the fast reverse path) and land 66/73's re-measurements, or rebase 53 onto a branch carrying only its own work before re-running this gate | product-owner / stream | open |
| F-21 | **Milestone gate — the environmental residue, recorded not chased.** Roughly twenty-six of the sixty reds are environmental on this machine rather than defects in any milestone's code, and they cluster by mechanism: the mesh worker-checkout / clone-credential / reclaim-scheduler families fail on `EBUSY: resource busy or locked` against `projection.sqlite`/`-shm` and on real-clone timing (`'running' !== 'done'`, `0 !== 1` frames); one is a Windows path-normalisation lane trying to `mkdir 'C:\…\checkouts\C:\Windows\.aof'`; `memory-integration` disagrees with the live graphify store (615 vs 759 records); `agent-model-override` reads `'opus' !== 'sonnet'` because the developer role's shipped default was changed elsewhere; `arch/ADR-002` and `arch/graphify-backend-selection` both count seven `config.memory?.backend` readers in `work-init.mjs`/`work-memory.mjs`, none of them 53's; `arch/m42-item-3` names `board-worker-stream.mjs` (last touched by `eacbd57`, m43); and `release-workflow-lint`/`build-sea-recipe-guards` concern the release workflow. Each is real and none belongs to milestone 53. They are recorded here because a gate that reports "60 red" without saying which sixty is not evidence — and because the live control daemon holding `:4182` and the machine's own load are the standing reason this repo's full suite cannot be run cleanly here (the same class as F-06/F-07). | test-gap | medium | non-blocker for 53 → backlog; the mesh families need fixtures that do not race a live daemon, and the stale-default lanes need re-baselining | developer / backlog | open |

## Accept decision

### 53/04 — DECLINED, 2026-08-17

**DECLINED.** `status` left at `in-progress`; no `aof work status` call was made. Four open blockers,
and the `@uat` gate untouched.

What is genuinely good, and it is most of the story: the prompt hand-off is **delivered and correct**.
`src/bundle/commands/autonomous.md` names `aof work loop` as its body and carries none of the seven
loop-shell tokens it owned before — red-probed, not assumed. The five refusals are explicit, the halt
report is quoted from the shell rather than computed, `--solo` and `--ship` survive re-anchored (with
`--solo`'s narrowed reach stated, which is the criterion most easily fudged), the config reads narrow
to exactly two keys, the door keeps its id/file/namespace/invocation with no `/aof:loop` or
`/aof:drive-*` beside it, the three phase prompts are byte-unchanged at their pinned addresses, and a
milestone continue still resolves to `/aof:autonomous` — measured on a spawned CLI against a real
fixture stream, not asserted about. `aof work validate 53/04` **PASS**; `aof work doctor 53/04` clean
at both severities. The evidence landed **with** the story, imported and spread in its own labelled
runner block — TECH_DEBT item 48 not repeated.

It is declined on:

- **F-09** — the story's own lane is **7/8**. The red is a contract row ADR-015 §4 already ruled wrong
  (two addresses, not one) whose named follow-on was never carried out. The fix is a refine amendment
  plus a one-number change in the suite; no product code moves.
- **F-10** — **FF-5310 is red**, and it falsifies a 53/04 acceptance criterion word for word. The fifth
  cap reader is 53/03's, so the cause sits outside this story but the failing criterion is this
  story's, and the control is one this story's acceptance names by id. Needs an architect's ruling,
  not a story-local decision.
- **F-11** — HEAD's committed render is the **pre-story prose loop** while HEAD's manifest advertises
  the new one. A fresh checkout does not get the door this story exists to deliver. One commit closes
  it.
- **F-12** — the **`@uat` soak has not been run**, and its own Background voids a run made today.

The story is also still `in-progress` rather than `in-review`, and both task boxes in `STORY.md` are
unticked — consistent with the above: `2c744b9` is a `wip` checkpoint, not a reviewed build. Route
F-09 and F-11 back through `aof:refine 53/04` → `aof:continue 53/04`; F-10 to the architect; F-12 to
the operator once the first three are closed and 53/00–53/03 are `done`.

Nothing milestone-scoped was run at this gate: no retrospective, no `memory ingest`, no STATE
compaction, no `OUTCOME.md` — all four are milestone 53's own accept, and six of its seven stories are
open.

### 53/00 — ACCEPTED, 2026-08-16

**ACCEPTED — 2026-08-16.** `aof work status 53/00 done`. The decline recorded below stood on F-01 and
F-02; both are closed, and both were re-proved at re-verification rather than taken on the record's
word — the fix on the committed bytes (`b433832`), and the checks that hold it red-probed by reverting
the fix and watching all three lanes fail with the right messages.

The accept rests on: the story's own lane **88/88** (three runs), `item-lock-holder-identity` **21/21**,
the sink's other consumers **25/25**, `aof work validate 53/00` **PASS**, and `aof work doctor 53/00`
clean at BOTH severities — no `control-unresolved`, marker or no marker, because the milestone's
register lives at milestone scope. No `@uat` scenario exists in this story, so no human sign-off
applies and none was sought.

The remaining reds are proven to be someone else's: **F-05** fails identically against the
pre-extraction sink, and **F-03/F-04/F-06/F-07** are non-blockers routed on. **F-04 is the one to carry
forward loudly** — all thirteen `FF-53xx` controls are unresolved at **error** severity, which does not
block this story but IS a hard gate on milestone 53's own accept.

### The decline this replaces, and what it rested on

The story's own evidence is genuinely strong: 86/86 green across its five registered suites and the
arch gate it split, the sink measured down to 2,304 lines, the driver's import set clean, the moved
set proved seventeen at both doors by reference identity, and `aof work validate 53/00` **PASS**.
`aof work doctor 53/00` is clean. There is no `@uat` scenario, so no human sign-off applies.

It is declined on **F-01**, an open blocker, with **F-02** as its companion. The move left one of the
sink's three inward consumers without a local binding, and the production launcher is a caller that
does not inject around it — so the extraction, as shipped, breaks `createMeshWorkerTerminalResumeHandler`
on the worker's own start path and takes one pre-existing suite red. That is the exact criterion the
story names as its headline ("all 45 files under `test/` that import the sink stay byte-unchanged and
green"), so this is the contract failing, not a new demand. The story commit declares the defect and
defers the fix "at verify"; the fix is a build act, and it returns to `aof:continue` with F-02's
behavioural leg attached — a fourth name in a regex would leave the same blindness in place.

### The remediation

Fixed inline at the operator's direction rather than routed back to `aof:continue`. Two files:

- `src/mesh-worker-execution.mjs:155` — `driveInteractiveClaudeSession` joins the inward `import`.
  One name; the comment above it now states the count as three and records why, and the re-export
  block's own comment at `:857` is corrected to match.
- `test/agent-session-driver-door.test.mjs` — the regex half of the inward-consumption lane becomes
  a derived census plus a real construction (F-02). Both new lanes were red-probed twice, including
  against a planted *fourth* consumer the old form could not have caught.

Post-fix state: story lane **88/88** across three consecutive runs, `item-lock-holder-identity`
**21/21**, `mesh-terminal-input-path` **17/18** (the one remaining is F-05, proven pre-existing
against the 9e0f910 sink), and the four other sink-consuming suites **25/25**.

**Carried forward, none blocking 53/00:** F-03 (the acceptance criterion's "exactly one edited test
file" was three in fact), F-04 (all thirteen `FF-53xx` controls unresolved — a **hard gate on
milestone 53's accept**, to be closed by 53/05 before `aof work status 53 done`), F-05, F-06, F-07,
and F-08 (a malformed `.feature` in 53/01 that fails `aof work validate 53` — the second hard gate on
the milestone's accept).

## Consolidated story verification — 2026-08-17

This section supersedes stale intermediate counts and unresolved-control statements above for the
four stories accepted in this wave. It records the committed main-branch bytes after the refined
contracts were merged. The older sections remain as the history of why the stories were reopened.

### 53/00 — refined extraction closure

- Story-owned suites: **81/81**.
- Frozen eight-module behavioural lane: **33/33**, including the unchanged session-id suite **8/8**
  and explicit own-property `sessionId: null` preservation.
- Re-aimed/extraction controls: **21/21**. The door suite proves exactly seventeen exports, two doors,
  three inward consumers, the closed ten-name allowlist, 43 importer suites split **42 untouched + 1
  re-aimed**, 48 fresh-linked import-safe dependents, and the pin CLI's separate static/link-only proof.
- `aof work validate 53/00`: **PASS**. Doctor: **0 errors**, two advisory warnings (stream numbering
  gaps and the story document budget), no `control-unresolved`.

`verifies → 53/00 tasks 00–05`. No `@manual` or `@uat` lane applies.

### 53/01 — pure loop engine

- Seven story suites: **37/37** — scope 4, level 4, phase 5, stops 5, gate 6, declaration 7,
  determinism 6.
- Named fitness gates: **21/21** — FF-5305 3, FF-5307 4, FF-5308 4, FF-5310 4, FF-5311 6.
- `aof work validate 53/01`: **PASS**. Doctor: **0 errors**, one advisory stream-numbering warning;
  zero `control-unresolved` at story and milestone scope.

`verifies → 53/01 tasks 00–06`. No `@manual` or `@uat` lane applies.

### 53/03 — Loop-Ready score

- Five story suites: **33/33** — additive JSON key 7, registry absent 5, composed result 7, base
  checks 7, score 7.
- Named and affected gates: **35/35** — FF-5309 3, doctor determinism 2, FF-5311 registration 6,
  legacy doctor envelope 24.
- `aof work validate 53/03`: **PASS**. Doctor: **0 errors**, two advisory warnings (stream numbering
  and story document budget); zero `control-unresolved` at both severities.

`verifies → 53/03 tasks 00–04`. No `@manual` or `@uat` lane applies.

### 53/07 — registry delivery, including the deployed-payload lane

- Story-owned executable suites and FF-5312/5313: **12/12**.
- Affected bundle gates: **27/27**. Total automated story evidence: **39/39**.
- `aof work validate 53/07`: **PASS**. Doctor: **0 errors**, two advisory warnings (stream numbering
  and story document budget), no `control-unresolved`.
- Deployed build: `0.1.0 (payload 1ba2d7a.20260817T133105)` from
  `node scripts/install-local.mjs --skip-ui`.
- Fresh real Git repository: `work init` created exactly nine `.aof/loops/*.md` records; all nine were
  byte-identical to `src/bundle/loops`, began with `---`, `work loops show` reported nine nodes, and
  `work loops validate` reported **0 errors**.
- Standing foreign repository `C:\Source\umami\aof-test-repo`: before update it had no registry;
  the deployed update created nine records and `work loops show` moved from absent to nine. After the
  repository was brought to the current payload baseline, a controlled pre-registry replay created
  exactly nine records, changed no other `.aof` file except the lock, and a second update reported
  **0 created / 0 updated / 62 up-to-date / 0 drift**.
- Git visibility: the registry is not ignored and appears as an untracked `.aof/loops/` addition.
- Consumer edit probe: two consecutive updates both reported the same drift warning and preserved the
  edited file's SHA-256; `--force` then restored the shipped bytes. This repository's own deployed
  update reported **0 created / 0 updated / 96 up-to-date / 0 drift**, with nine nodes visible.

`verifies → 53/07 tasks 00–06`, including task 06's `@manual` payload/foreign-repository lane. No
human-only `@uat` scenario applies.

## Accept decisions — consolidated wave

### 53/00 — ACCEPTED AGAIN, 2026-08-17

The reopened contract is green on the counts above, validation passes, no blocker finding or
unresolved control remains, and no human lane applies. Accepted from `in-review` through the governed
status door.

### 53/01 — ACCEPTED, 2026-08-17

All executable rows and named controls are green, validation passes, doctor carries no error, and no
manual or human lane applies. Accepted from `in-review` through the governed status door.

### 53/03 — ACCEPTED, 2026-08-17

All executable rows, legacy envelope evidence, determinism and registration controls are green;
validation passes and no unresolved control remains. Accepted from `in-review` through the governed
status door.

### 53/07 — ACCEPTED, 2026-08-17

The automated lane is green and the deployed-payload/manual lane was executed against both a fresh
repository and the standing foreign repository, including idempotence, Git visibility and drift
preservation. Validation passes and no blocker remains. Accepted from `in-review` through the
governed status door.

### 53/02 — command surface and stop reporting

- Nine registered story suites: **28/28**, grouped by task 00–08 as 8 + 3 + 1 + 2 + 7 + 3 + 1 + 2 + 1.
- Refined task-04 inventories are exact and exercised: **13 stop**, **13 report**, **8 reason**, and
  **3 readiness** rows. They prove the frozen ten-key `LoopState`, four-key halt act, producer/ref
  attribution, run-store-owned `readyAt`, the one-millisecond refusal boundary, and the exact-boundary
  retry grant.
- The default completion watcher settles from an aged declared-complete transcript while the fake PTY
  remains live; the PTY-exit shortcut is explicitly excluded.
- Affected fitness, structural, and CLI-bijection gates: **40/40**.
- `aof work validate 53/02`: **PASS**. Independent QA: **PASS**. Independent architect review:
  **CONFORMS** after removal of the duplicated architecture clarification; exactly one normative copy
  remains.

`verifies → 53/02 tasks 00–08`. No `@manual` or `@uat` lane applies.

### 53/02 — ACCEPTED, 2026-08-17

All executable rows, stop-specific reports, readiness boundaries, registration and affected controls
are green on the merged feature-branch bytes. Validation passes, both independent reviews pass, and
no human lane applies. Accepted from `in-review` through the governed status door.

### 53/04 — automated and deployed evidence, 2026-08-17

- Story-owned suite: **10/10**, including exact c01–c06 delegated-command rows, b01–b04
  child-process launch/probe rows, and h01–h03 human-report rows.
- The no-`--json` child runs through a source-local `aof` shim, real face, real provider resolution,
  Windows ConPTY, driver, registry and run store. It mints/drives work and exits naturally; the paired
  JSON probe makes zero provider calls, mints no run, returns `driven: []`, and leaves the fixture
  byte-identical.
- The child evidence found and fixed an exited-ConPTY handle leak: pre-fix the internal outcome settled
  but the parent CLI timed out and cleanup failed `EBUSY`; post-fix the single guarded settle cleanup
  closes the native handle and removes the fixture. Existing driver/phase/architecture evidence remains
  green.
- Independent QA: **PASS**. Independent architect: **CONFORMS**. Story/affected review lanes were
  **143/143** and **96/96** green; the generated-asset gate was **3/3**. One timing-sensitive transcript
  case failed once in an aggregate run, then passed **5/5** isolated and **20/20** as its full suite.
- The manifest gate closes all **96** entries and freezes the complete **94-entry** non-autonomous
  residue, so a third moved member/path/hash fails. The only moved outputs are the Claude autonomous
  command and mapped Codex skill.
- `aof work validate 53/04`: **PASS**. Doctor: **0 errors** and two advisory warnings (stream numbering
  gaps and story document budget).
- Deployed payload: `0.1.0 (payload 996be85.20260817T144856)`, sourced from
  `C:\Source\umami\aof`. The installed autonomous source names
  `aof work loop <range> --level L2` without `--json` and explicitly states that the JSON form is a
  read-only probe which never launches work.

`verifies → 53/04 task 00`. Task 01's genuine `@uat` remains pending: its operator must choose real
not-started work they actually want, remain present for the foreground run, and on a halt record their
own reading before seeing the coded stop id. That judgment is deliberately not agent-runnable.

### Not run at this gate, and why

The retrospective and the STATE compaction are **milestone-scoped** and are deliberately deferred to
milestone 53's own accept — `## Feedback (for retro)` in `STATE.md` is the milestone's section, and it
already carries this story's contract deviation (the "exactly one edited test file" note, F-03) plus
53/03's newly recorded contract contradiction, waiting to be triaged together. `OUTCOME.md` is a
milestone-accept artifact for the same reason; six of milestone 53's seven stories are still open.

## Milestone gate — the integrated regression sweep, 2026-08-20

Milestone 53's own lane, then the whole repo. Both run with the per-test hermetic `AOF_GLOBAL_HOME`
that `runSuite()` uses, via test-array imports rather than `node --test` (which reports a silent
false pass on these files — zero assertions, prints "pass").

**The milestone's own seven story lanes: 240/240 green.**

| story | suites | result |
|---|---|---|
| 53/00 | 5 (door 19, drives 21, transcript 20, runtime-dispatch 11, gate-aim 10) | **81/81** |
| 53/01 | 7 (scope 4, level 4, phase 5, stops 5, gate 6, declaration 7, determinism 6) | **37/37** |
| 53/02 | 9 (phase-drivers 8, probe 3, sequencing 1, gate 2, stops 7, resume 3, board-state 1, refusals 2, registration 1) | **28/28** |
| 53/03 | 5 (json-key 7, registry-absent 5, composed 7, base-checks 7, score 7) | **33/33** |
| 53/04 | 1 (`autonomous-shell-out-prompt` 10) | **10/10** |
| 53/05 | 11 arch controls, FF-5301…FF-5311 | **39/39** |
| 53/07 | 2 arch controls (FF-5312/5313) + home-and-delivery 6 | **12/12** |

**The whole-repo suite: 5,915/5,975 — sixty red.** `global-work-propagation` (6 tests) was excluded
by object identity and the exclusion printed, because it binds `:4182`, which this machine's live
control daemon holds; nothing else was filtered. This is the run the suite-scoping rule defers to the
milestone gate, and it earned its keep: **every one of the milestone-attributable reds below is
invisible from every story lane**, because a story runs its own scenarios and a milestone's register
only ever asks its own questions.

Attribution of the sixty, by the subject each failure message names:

- **Milestone 53's own code breaks four other milestones' declared controls** — 52/FF-5202 (F-13),
  15/ADR-005 bijection ×3 (F-14), 42/`acd-console-log-confined` ×2 (F-16), 47/`F-47-04-ARCH-2`
  (F-17) — plus ADR-005's generated-stamp contract ×3 (F-18) and the registry census (F-15).
  **Ten lanes, six findings, all blockers.**
- **Caused by 53, owned by 66** — three `feature-parse-strict` lanes that go red *because* 53 repaired
  its own malformed `.feature`; 66's own failure text says this red means re-measure (F-19).
- **Not 53's, on 53's branch** — the ungoverned `d5cea70` opencode commit and milestone 73's god-node
  growth (F-20), ~9 lanes.
- **Environmental on this machine** — the mesh/clone/reclaim families, the live memory store, stale
  role defaults, release-workflow lanes (F-21), ~26 lanes.

### `@uat` — not run, and this time it is runnable

53/04 task 01's soak is the milestone's only human gate. Three of F-12's four disqualifiers are now
**cleared**: stories 53/00–53/03 all read `done`; the prompt change IS installed at HEAD (`git status`
clean, and `src/bundle/manifest.json`'s recorded hashes for `.claude/commands/aof/autonomous.md` and
`.codex/skills/aof-autonomous/SKILL.md` match the committed bytes exactly — F-11 closed); and the
rendered door names `aof work loop` and carries no prose-loop token. What remains is the deploy:
`aof --version` must report `payload <buildId>` matching the tree, which needs
`node scripts/install-local.mjs` and a desktop-app restart — an operator act, not an agent's.

It was **not brokered at this gate**, deliberately and for one reason: the soak's subject is whether
the shell's account of a halt matches an operator's independent reading, and its Background requires a
real not-started milestone *whose completion the operator actually wants*. Spending that attention
while six blockers are open would produce a reading of a tree that is about to change under it. The
gate is deferred, not waived; `STATE.md`'s `- [ ] @uat signed off` stays unticked.

## Accept decision — milestone 53, 2026-08-20

**DECLINED.** `aof work status 53 done` was not called and no `status:` line was edited by hand.
53/04 stays `in-review`; 53/05 stays `in-progress`; the five accepted stories are untouched.

**What is genuinely delivered, and it is most of the milestone.** The shell exists and is code:
`aof work loop` on the launcher seam with the three `work:drive-<phase>` executors, a pure engine whose
every decision is a function over plain data, a ten-key `LoopState` with a frozen stop set, L3 declared
and locked with a driven refusal, `--resume` riding the run record rather than a private store, the
Loop-Ready score composing 52's checks when a registry is declared and standing alone when it is not,
and the registry rehomed to `.aof/loops/` and shipping in the bundle. All 240 story lanes are green.
**All thirteen declared controls now resolve, are registered, and are green — and every one of them
carries a red probe performed at this gate** (F-04, the milestone's oldest hard gate, is closed by
measurement). `aof work validate 53` is **PASS**, closing F-08. `aof work doctor 53` reports **no
`control-unresolved` at either severity** — the accept rule's own test — with warnings only
(numbering gaps, document budgets, `control-runner-unchecked`). F-09, F-10 and F-11 are all closed.

It is declined on **six open blockers, and on the two stories that are not done**:

- **F-13 / F-16 / F-17** — milestone 53's code takes **52's FF-5202, 42's `acd-console-log-confined`
  (both lanes) and 47's `F-47-04-ARCH-2`** red. Three other milestones' declared controls, broken by
  this one. F-17 was known and carried in `STATE.md` as an open implementation obligation.
- **F-14 / F-15** — 53/02's four new commands break the **ADR-005 command↔route bijection** and the
  registry census. This is the invoice for the story partition's decision that `src/board-ui.mjs` is
  edited by nobody: the concurrency was real, and so is the bill.
- **F-18** — 53/07's nine `.aof/loops/` assets are **not recognised by ADR-005's generated-stamp
  detection contract**, so a delivered loop record is not detectable as aof-managed in a consumer repo.
- **53/05 is `in-progress`** and cannot be accepted: it owns F-17, and it never reached `in-review`.
- **53/04 is `in-review`** with its `@uat` soak unrun (F-12). Its automated evidence is otherwise
  complete — 10/10, validate PASS, doctor clean.

Two further findings are recorded but do **not** bear on 53's code: **F-19** (66 must re-measure
because 53 fixed its own contract — the hand-off firing as designed) and **F-20** (the branch carries
the ungoverned `d5cea70` opencode commit and milestone 73, which together own ~9 of the sixty reds).
F-20 is the one to carry loudest: **milestone 53 is being verified on a branch it does not control**,
so "the suite is green" is not a statement this gate can make about 53 alone until that is fixed.

Nothing milestone-scoped was run at this gate: no retrospective, no `memory ingest`, no `STATE.md`
compaction, no `OUTCOME.md` — all four belong to the milestone's accept, and two of its seven stories
are still open.

**Route:** F-13, F-14, F-16 and F-18 to the architect for the rule-or-code ruling, then the developer;
F-15 and F-17 straight to the developer; F-19 to 66; F-20 to the product owner as a stream-level act;
then re-run this gate and, once it is clean and the payload is deployed, broker 53/04's soak.

## Inline remediation and re-verification — 2026-08-20

All six blockers were fixed **inline at verify**, at the operator's direction, rather than routed back
through `aof:refine`/`aof:continue` — the same call the operator made on F-01/F-02 at 53/00's gate.
Each fix is recorded in its finding row above; what follows is the evidence that they hold and that
they cost nothing else.

**No production behaviour changed except where a control said it must.** Two source files moved:
`src/work-doctor-loop-ready.mjs` (one evidence string reworded) and `src/commands/loop.mjs` (the report
collector's default becomes `NO_PRINT`; the launcher body injects the printer). The nine loop records
gained one frontmatter comment line each. Everything else is a control's own census, carve-out or
ceiling — moved with its reason stated in the file that carries it.

**`src/board-ui.mjs` was not edited.** F-14 closed through the control's established deferral
mechanism, so the story partition's "edited by nobody" freeze held rather than being spent.

### The counts

| lane | before | after |
|---|---|---|
| Milestone 53's seven story lanes | 240/240 | **240/240** |
| The thirteen declared controls | 13 green, 13 red-probed | **13 green, 13 red-probed** |
| Whole-repo unit sweep | 5,915/5,975 (60 red) | **5,927/5,975 (48 red)** |
| `aof work validate 53` | PASS | **PASS** |
| `aof work doctor 53` | no `control-unresolved` | **no `control-unresolved`** |

**Twelve lanes went green and NOT ONE new red appeared** — the two sweeps' failure lists were diffed
directly and the after-set is a strict subset of the before-set. The twelve are exactly the ones the
six findings named, plus the bundle-tree census the opencode commit had left stale (F-20).

**All thirteen red probes were re-performed** after the fixes, on the settled tree, and all thirteen
still go red with the same messages — including FF-5310, whose control F-17 rewrote. The probe sweep
restores each subject from the bytes it read rather than from git (several subjects now carry
uncommitted fixes, and a checkout would have discarded them); the working tree was diffed before and
after the sweep and was **byte-identical**.

### One coupling the fixes exposed, and it is worth naming

Closing F-18 moved nine hashes inside the 94-entry manifest residue that 53/04's distribution gate
freezes, so that gate went red on a change that had nothing to do with 53/04. The claim it protects is
unchanged and still true — 53/04's own diff moved exactly the two named autonomous addresses and no
third — but the constant is a **snapshot of the rest of the tree**, so any later legitimate change to
any other member invalidates it. The constant was re-captured with the previous value and the cause
recorded beside it. **A whole-tree residue hash is a tripwire that fires on the wrong story by
construction**; it belongs in the retrospective as a lesson about instrument design, not as a defect.

### What is still red, and why none of it is milestone 53's

The remaining 48 are exactly the three non-53 clusters attributed at the first gate, unchanged:
**F-19** (3 lanes — 66 must re-measure because 53 repaired its own contract, plus 2 god-node ratchet
lanes that are milestone 73's), **F-20** (the ungoverned `d5cea70` opencode commit — its bundle-tree
census is now fixed, the codex skill-body render, schema enums and `claude-settings` merge lanes are
not), and **F-21** (~26 environmental: the mesh clone/reclaim families' `EBUSY` and real-clone timing,
the live memory store, stale role defaults, release-workflow lanes).

## Accept decision — milestone 53, re-verified 2026-08-20

**STILL DECLINED, and now on two gates rather than eight.** `aof work status 53 done` was not called
and no `status:` line was hand-edited. Every blocker that was milestone 53's own code is **closed**:
F-04, F-08, F-09, F-10, F-11 were closed at the first gate; F-13, F-14, F-15, F-16, F-17 and F-18 are
closed here. No open finding now attributes a defect to milestone 53's delivered code.

What remains are the two gates this milestone has always owed, and neither is a defect:

- **53/05 is `in-progress` and has never been through `aof:continue`'s Review gate.** Its blocker
  (F-17) is closed and its evidence is complete — eleven controls landed, registered, 39/39 green,
  every one red-probed. It is not accepted here regardless, because whether a story has been through
  structural + behavioural review is this gate's own rule and the status says it has not.
  **`aof:continue 53/05` is the next act**, and it should be short.
- **53/04 is `in-review` with its `@uat` soak unrun (F-12).** Everything else about it is complete:
  10/10, validate PASS, doctor clean, both renders consistent with the manifest at HEAD. The soak
  needs a `node scripts/install-local.mjs` payload deploy, a real not-started milestone the operator
  wants finished, and the operator present for the run. It is now genuinely runnable.

Once those two close, `aof work status 53 done` is the only remaining act — and the retrospective,
`memory ingest`, the `STATE.md` compaction and `OUTCOME.md` all belong to that moment, none of which
has been run here.

**F-19, F-20 and F-21 stay open and stay routed elsewhere** — 66's re-measurement, the ungoverned
opencode commit's governance, and the environmental backlog. F-20 remains the loudest: milestone 53 is
still being verified on a branch carrying work it does not control.

## User sign-off — the `@uat` gate, 2026-08-20

**WAIVED by the operator (product owner). The soak was NOT run, and nothing here should be read as
evidence that it was.**

53/04 task 01 (`01_the-soak-that-defines-proven.feature`) is milestone 53's only human gate. Its
acceptance criterion is a human's **blind** reading of a live halt compared against the shell's coded
stop id — the contract states in its own narrative that an agent asked to make that comparison "would
be reading the stop id and then agreeing with it, which measures nothing". No agent sign-off was
produced, offered, or simulated. The task box in `STORY.md` stays **unticked**, because it was not
done.

**The decision, and who made it.** Asked directly at this gate whether to run the soak or accept
without it, the operator chose to accept without it. That is a product owner's call to make: the
acceptance criterion is not weakened, amended, or re-tagged — the delivered `.feature` is untouched —
the gate is simply recorded as outstanding against an accepted item.

**What the waiver does NOT discharge.** The soak is the named precondition for **deleting**
`src/bundle/commands/autonomous.md`. Per ADR-008 §1/§3 the prose prompt stays until the soak is signed
off, and the deletion carries its own further precondition (`resolveDirectivePhase`'s `"autonomous"`
return must be superseded in the same diff, ADR-002 §4). **Accepting the milestone does not authorise
raising that chore.** The discharge condition is unchanged: one real `aof work loop <NN> --level L2`
run on this repo's own stream, observed start to finish by an operator who wrote their reading down
before reading the stop id.

**What the waiver costs, stated plainly.** `aof work loop` has never driven a real milestone end to
end under observation. Everything asserted about it is asserted against fixtures and injected seams —
240/240 story lanes, thirteen controls, thirteen red probes — which is a great deal, and is not the
same claim. ADR-008 §3's definition of "proven" is **not met**, and milestone 53 is accepted without
it. The gate was runnable at the moment it was declined: the payload was deployed and reporting a
build id matching the tree.

## Accept decision — 53/04, 2026-08-20

**ACCEPTED** — `aof work status 53/04 done`, from `in-review`.

Its automated evidence is complete and was re-measured at this gate: the story lane **10/10**, the
manifest gate closing all 96 entries with the 94-entry residue frozen, `aof work validate 53/04`
**PASS**, doctor clean. F-09, F-10 and F-11 are closed by measurement. The prompt hand-off is delivered
and correct — the door names `aof work loop`, carries none of the seven prose-loop tokens, keeps its
id, file, namespace, argument hints and every caller, and the three phase prompts are byte-unchanged.

It is accepted with **F-12 waived**, above. That is the whole of the gap.

## Accept decision — 53/05, 2026-08-20

**ACCEPTED** — `aof work status 53/05 done`, `in-progress` → `in-review` → `done` through the governed
door.

Tasks 00 and 04 were unticked because of F-17 (task 00's *"none of the eleven adds a positional slice
to the ledger"*) and because the refusal gates had not been re-measured since. Both are now satisfied:
F-17 is fixed by deleting the slice, and FF-5303/FF-5305/FF-5308 — task 04's three subjects — are green
and each was red-probed at this gate (a driver imported into the shipped door; `"L3"` admitted to the
vocabulary; a third scope form admitted). Both boxes ticked.

Review gate, run inline at this verify rather than by a spawned reviewer:
- **Structural.** All eleven export `{ name, run }` and none carries an `fn:` test-object key — except
  the registration gate itself, which plants one deliberately as its own control. Every source-reading
  gate strips comments before grepping; FF-5308 is the one that does not, and correctly so — it drives
  the real command and reads no source. The eleven land in one labelled `// milestone 53 / story 05`
  block, imported AND spread, which FF-5311 proves and which is itself red-probed (deleting one spread
  → *"acdLoopScopeGuardTests is spread exactly once", 0 !== 1*).
- **Behavioural.** 39/39 green, and non-vacuity is not taken on trust: all eleven were red-probed by
  mutating their own subjects. m47's `F-47-04-ARCH-2` — the control that governs how a fitness function
  may read source — is green.

## Accept decision — MILESTONE 53, 2026-08-20

**ACCEPTED.** `aof work status 53 done`, with all seven stories `done`.

| gate | result |
|---|---|
| Stories | **7/7 done** |
| Milestone story lanes | **240/240** |
| Declared controls FF-5301…FF-5313 | **13/13 green, 13/13 red-probed** |
| `aof work validate 53` | **PASS** |
| `aof work doctor 53` | **0 errors, 0 `control-unresolved` at either severity** |
| Whole-repo unit sweep | 5,927/5,975 — 48 red, **none attributable to milestone 53** |
| Open findings against 53's delivered code | **none** |

Of the twenty-one findings this milestone raised, **thirteen are closed**, **one is waived by operator
decision** (F-12), and **seven remain open and routed elsewhere**: F-03, F-05, F-06 and F-07 to the
backlog (a superseded census note and three timing-sensitive test lanes, none a production fault);
**F-19** to milestone 66, which must re-measure because 53 repaired its own malformed contract — the
designed hand-off firing exactly as its author intended; **F-20** to the product owner, because the
ungoverned `d5cea70` opencode commit and milestone 73 ride this branch and own ~9 of the 48 remaining
reds; and **F-21** to the backlog as the environmental residue on this machine.

**The honest shape of this acceptance.** Milestone 53's own code is green, its own controls are green
and probed, and it breaks nothing that belongs to anyone else — six cross-milestone controls it did
break (52's FF-5202, 15's ADR-005 bijection, 42's console confinement, 47's slice ledger, ADR-005's
stamp contract, and the registry census) were fixed inline at this gate and re-verified with no new
red anywhere. What it has NOT done is run once, for real, under a human's eye. That is F-12, it is
waived rather than met, and the prose prompt stays until it is met.

## Correction — 53/05 was accepted on the pre-review controls, 2026-08-20

**The accept stands. The account of it above was wrong, and this records what was actually true.**

`## Accept decision — 53/05` states that its review gate was "run inline at this verify rather than
by a spawned reviewer". That was accurate about what this session did and **misleading about the
story**: 53/05's real architect + QA review round already existed, as three unmerged commits on the
worker branch `aof/mesh/53-05`, and `bdc2031 merge(m53): consolidate fitness-function work` had
brought in the **pre-review** state. The milestone was accepted on the thinner controls. Nobody
checked the worker branch before accepting; it surfaced only when the branch was proposed for
deletion, after the accept was committed.

**What the difference was.** The eleven-gate lane is **53 tests, not 39** — every one of 53/05's
controls is substantially larger on the branch:

| control | accepted as | actually delivered |
|---|---|---|
| `acd-loop-suite-registration` | 6 tests / 145 lines | **12 / 1053** |
| `acd-loop-cap-single-home` | 4 / 126 | **6 / 471** |
| `acd-loop-scope-guard` | 4 / 95 | **6 / 284** |
| `acd-loop-level-l3-locked` | 3 / 80 | **5 / 230** |
| `acd-phase-door-not-a-driver` | 3 / 65 | **5 / 173** |

**What the review round caught that the accepted set did not**, and this is the part that matters —
these are gates this verify certified green:

- **Three refusal gates passed green on a ZERO-SUBJECT sweep.** FF-5303, FF-5305 and FF-5308 could
  read nothing at all and still report green; floors were added so a fixture rename now reds all
  three. This verify red-probed each of them and saw red — which proves non-vacuity *for the mutation
  chosen*, and says nothing about whether the sweep finds any subject. **A red probe is not a floor.**
  That distinction is the single most useful thing this correction records.
- **The ACCEPT ceiling was HEAD-anchored, so it certified the very breach it was written to catch.**
- The L3 sweep skipped the whole of `work-loop.mjs` by basename; frozen constants were
  `isFrozen`-asserted rather than mutation-attempted.

**The review round had also already found two of this gate's "discoveries".** Its `STATE.md` record
names both accept-blocking reds — `acd-loop-module-import-boundary` FF-5202 against 53/03, and
`acd-console-log-confined` ×2 against 53/02 at `src/commands/loop.mjs:351` — with the same line
number this verify re-derived as F-13 and F-16, and both already verified pre-existing at main-tree
HEAD. The work of finding them was done twice.

**It also superseded F-17's fix.** This session deleted the positional slice as redundant; the review
round routed the cut through the one home (`test/support/source-slice.mjs`), retiring the sentinel-end
**species** m47 bans rather than one instance, and documented the measured five-case reach of the
change. The branch's version is what is now in the tree.

**Resolution.** `aof/mesh/53-05` is merged (`779f2a5`), taking the branch's controls, this record's
compaction and 53/05's `done` status. The milestone gate re-run on the merged tree is **252/254**, with
53/05 at **53/53** — every hardened control passes, so **the accept is confirmed rather than
reopened**. The two reds are outside milestone 53 entirely: 53/04 freezes the three phase prompts'
content addresses and `src/bundle/commands/continue.md` is edited in the working tree by in-flight
chore 75, so `continue`'s address moved. Re-freezing it belongs to chore 75.

**Carry to R2** (*a milestone's own register cannot see the damage it does*) **its twin: a milestone's
gate cannot see work that was never merged.** `aof work validate` and the whole-repo sweep both
measure the checked-out tree; neither asks whether a story's own worker branch has commits the
integration missed. Before accepting a story built on a mesh worker branch, check
`git log HEAD..<branch>` — the merge commit's existence is not evidence that it carried everything.
