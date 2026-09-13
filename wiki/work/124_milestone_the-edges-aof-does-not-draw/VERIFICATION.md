---
doc: verification
---
# 124 · The edges aof does not draw — Verification

## Verification evidence

### `124/00` — the census, its one home, and the class ratchet

- **`node scripts/test.mjs --only <11 suites>`** — the story's two unit suites
  (`story-context-contract`, `doctor-depends-lane`), its three delivered controls (FF-12401,
  FF-12402, FF-12403), the doctor spine's frozen roster (`acd-controls-never-execute`), the budget
  table it moved (`acd-source-directory-budget`), the two other `ready-wave` consumers
  (`story-contract-derive`, `acd-derivation-proposes-never-writes`) and the sibling never-gates
  control with its lane suite (`acd-loop-record-never-gates`, `doctor-loop-record-lane`):
  **114 pass / 0 fail**.
  `verifies → tasks/00_the-contract-set-has-one-home.feature`,
  `tasks/01_ready-wave-adopts-the-predicate.feature`,
  `tasks/02_the-lane-names-each-unwitnessed-edge.feature`,
  `tasks/03_the-lane-reports-its-denominator.feature`,
  `tasks/04_an-advisory-lane-cannot-gate.feature`
- **`aof work doctor 124`** over this stream at accept — the lane's one `depends-edges-unchecked`
  finding reads 230 considered = 38 witnessed + 10 unwitnessed + 125 unchecked by type + 57
  unchecked as undeclared, and no `control-unresolved` is reported at either severity.
  `verifies → tasks/03_the-lane-reports-its-denominator.feature` (the census over this stream closes)

### `124/01` — cap exhaustion returns to the plan

- **`node scripts/test.mjs --only <20 suites>`** — the story's driven suite
  (`loop-cap-exhaustion-carries-the-record`, twelve task cases), its control (FF-12404, ten legs),
  and every suite in the tree that names the `cap-exhausted` stop: the loop family's stop set, gate
  order, gate-cost ladder, review bounds, only-fail redrives, warm fix loop, command gate and stops,
  doctor-gate scope, driven-row grade, the shell-out prompt suite, the mesh assignment directive,
  the grade writer, four-deadlines and the assignment control: **217 pass / 0 fail**.
  `verifies → tasks/00_the-shell-asks-the-engine.feature`,
  `tasks/01_the-return-is-the-existing-refine-phase.feature`,
  `tasks/02_the-escalation-is-bounded-twice.feature`,
  `tasks/03_the-other-stops-are-unchanged.feature`

### `124/02` — the learning edge reaches shatter

- **`node scripts/test.mjs --only <4 suites>`** — FF-12405's ten legs plus the three bundle-parity
  controls (`acd-declared-writes-include-generated-siblings`, `acd-bundle-manifest-hashes`,
  `acd-install-manifest-contract`): **23 pass / 0 fail**.
  `verifies → tasks/00_shatter-recalls-before-it-cuts.feature`,
  `tasks/01_the-recall-form-exists-in-the-cli.feature`,
  `tasks/02_every-cut-making-command-carries-a-recall.feature`,
  `tasks/03_the-bundle-mirrors-stay-in-parity.feature`

### The fitness lane — `node scripts/test-rubric.mjs` over the whole of `test/arch/**`

- First run at accept: **1,861 pass / 3 fail** — FF-11903 (66 unresolvable citations against a
  ceiling of 65), FF-9603 (2), and FF-6607b ADR-011/E. All three red at HEAD; none inside any 124
  story's lane.
- After `F-01`'s repair: **1,862 pass / 2 fail** — FF-9603 (2) and FF-6607b remain (`F-04`, `F-03`).
- After `F-03`'s and `F-04`'s repairs, each control re-run alone: FF-9603 **5 pass / 0 fail**,
  FF-6607b **6 pass / 0 fail**. The whole lane is green in the gate's second run below.

### The whole-tree regression gate — `aof work regression-gate 124`, in a detached worktree

Run on a clean detached worktree at the accept commit (`119/R4`'s route: this checkout carries
another lane's untracked 126 folder, which the gate rightly counts as dirty). Two rows in
`REGRESSION.md`:

- **`2e88f946` — RED, 33 cases.** Two were real and both this milestone's: FF-12405 leg 9, because
  the lock names `.aof/templates/work/task/example.feature` and no `.gitattributes` pin covered it, so
  the fresh checkout handed the control a CRLF copy the recorded hash could never match (`F-15`); and
  53/00's driver census, because `124/00`'s FF-12403 control names the session driver's suite path in
  its coverage table and was not in the closed allowlist (`F-16`). The other 31 — the SEA asset seam,
  the bundle manifest census, and every `aof work ui` / `aof mesh ui` server lane — pass in isolation
  in the same worktree and are `119/F-41`'s contention species: Codex runtimes and an AWS deploy were
  running on this node during the window (`F-17`).
- **`cb3c2cdf` — GREEN, scope `all`, "may stand as the accept gate."** Both real reds repaired, no
  override.

### Lanes that did not run, and why

- Every scenario in every 124 feature is `@executable`; no `@manual` procedure was owed and none
  is recorded.
- No `@uat` scenario exists, so no human sign-off step ran.
- No `DESIGN.md` and no UI surface, so no design-conformance render was attempted.
- The gate refused this checkout as dirty on its first invocation (124's own work was uncommitted,
  and 126's folder is untracked beside it), so the run above took a detached worktree at the commit
  rather than a `--gate-override`: this node can host the run.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-12401 | `test/arch/work/acd-census-reports-its-denominator.test.mjs` | GREEN (5/5) | Made the coverage finding conditional on at least one unwitnessed edge; observed the identity leg fail: `no edge evaluable at all: 3 excluded edge(s) → expected 1 depends-edges-unchecked finding(s), got 0`. Subject restored and `cmp`-verified. |
| FF-12402 | `test/arch/work/acd-advisory-lane-never-gates.test.mjs` | GREEN (6/6) | (a) Set the lane's severity constant to `"error"`; observed the CLASS leg name both the literal and the constant (`names an "error" severity literal`; `its severity constant is ADVISORY_SEVERITY = "error"`) and the task-04 leg fail with `'error' !== 'warn'`. (b) Added `depends-edge-unwitnessed` to `CONTROL_FINDING_CODES`; observed three legs fail — the CLASS leg with `depends-edge-unwitnessed is in CONTROL_FINDING_CODES, which is the gate's source`, and the exemption leg with `is not admitted: true !== false`. |
| FF-12403 | `test/arch/planning/acd-contract-set-has-one-home.test.mjs` | GREEN (5/5) | (a) Authored a second `covers` helper in `ready-wave.mjs` (a `Set` over raw strings) and called it from the collision test; observed leg 2 name all three: `the collision test does not call the shared predicate both ways`, `a Set intersection over raw declared strings`, `a second coverage helper`. (b) Dropped the authored separator from `contractSetCovers` (`startsWith` on the bare path); observed leg 3 fail on the retired flat commands module — `{src/commands/} covers … expected false, got true — THE BOUNDARY — a shared prefix is not containment` — with leg 1 red beside it. |
| FF-12404 | `test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs` | GREEN (10/10) | (a) Removed the decider's re-entry bound so the plan hand-off returns unconditionally; observed eight failures across the control and the driven suite — leg 2 `124 with 3 re-entries is terminal: 'drive' !== 'halt'`, leg 8 `engine:plan-re-entry>=cap is this story's, and it is the engine's`, the non-vacuity leg, and the driven bounds (`the plan was re-entered once, not once per unit`; `a plan is re-entered at most cap times in one invocation`; `the plan counter survives a resume … 2 !== 1`). (b) Derived the plan from an authored `meta.plan` key; observed leg 3 fail: `the derivation names no meta: true !== false`. |
| FF-12405 | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` | GREEN (10/10) | (a) Spelled `--scope architecture` in shatter's recall; observed leg 5 fail (`--scope resolves in the shipped surface — an invented flag exits 0 and folds its value into the query`) and leg 6 (`shatter's invocation spells --block alone`, actual `['--block', '--scope']`); legs 8–9 red beside them because the mirrors no longer matched the edited source. (b) Moved the block after step 2; observed leg 1 fail: `…and before step 2 identifies the drivers`; legs 8–9 red again on parity. |

Every probe was applied to a backed-up copy of its subject, run through
`node scripts/test.mjs --only <control>` under an isolated `AOF_GLOBAL_HOME`, and the subject
restored and `cmp`-verified before the next probe ran.

## Findings

Reported unnumbered by the build lanes (`STATE.md` `## Feedback (for retro)`) and by this accept;
ids allocated here, at the moment of landing.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | FF-11903 was red at HEAD (66 unresolvable `src/` citations against a ceiling of 65, 67 once the accept's own observability snapshot landed) and could not fall by document repair: the sweep read every file under `wiki/work/**`, three graded run records persist the control's own failure text (49 of the 66 tokens), and `aof work observe` records every path an agent typed. | defect | high | blocker for the milestone gate → **fixed in-item**: the sweep skips an item's two machine-written subtrees (`runs/`, `observability/`), the ceiling falls 65 → 47 on the re-measured `47 8498 357 2110`, and the ledger's stale citation of the moved debt module (a real move git recorded as delete-plus-add) is repaired. The control's own planted-citation probe still reds. | architect (119's control) | closed |
| F-02 | FF-11903 counts deliberately fictional paths — fixtures, counterexamples, proposed modules in the living ledger — as casualties; this milestone's ADR-003 and two locked features spell a retired-module counterexample that is one of the 47. | design-gap | medium | non-blocker → a ruling: a declared fictional-token allowlist with reasons (119/ADR-003 §2 admits one), or a spelling convention for counterexamples — never a laundered fixture | architect | open |
| F-03 | FF-6607b ADR-011/E is red at HEAD: six `enforced by` cells in five ACCEPTED registers (52/FF-5202, 53/FF-5302, 70/FF-7002, 70/FF-7005, 71/FF-7103, 72/FF-7203 — the last still `pending`) cite pre-move flat control paths. `b088825c` squash-merged 119's moves with later rewrites, so git records them as delete-plus-add at 23–47% similarity and the rename map's 50% threshold cannot see them; `aof work doctor` reports each as `control-unresolved`. | defect | high | blocker for the milestone gate → **fixed at accept**: the six `enforced by` cells re-pointed to the moved controls (the doctor's own remedy — land the file or re-point the declaration); 72/FF-7203's stale `pending` token left in place because the row now resolves. A squash-safe resolution rule (lowering `-M` risks false pairings) stays a ruling for the architect. | architect | closed |
| F-04 | FF-9603 (2) is red at HEAD: `wiki/work/125_story_the-loop-graph-gets-a-published-face/PLAN.md` restates declared paths at lines 28 and 58 (path-enumeration). 125 is another lane's in-progress item. | defect | medium | blocker for the milestone gate → **fixed at accept**: the two lines of 125's advisory brief rephrased so the document carries one path literal (the admitted inline reference); the brief's meaning is unchanged | — | closed |
| F-05 | The fitness lane had been VACUOUS since `b088825c`: `scripts/test-rubric.mjs` swept `test/arch/` non-recursively after the tree gained an interior, matched zero controls, and `work:grade` failed on its non-vacuity guard rather than banking a green. | defect | high | fixed in `124/00` (recursive sweep; the zero-lane diagnostic reports modules swept / names registered / names matched) | — | closed |
| F-06 | `124/01` and `124/02` each declared a new control under a budgeted layer without declaring `acd-source-directory-budget`, whose row is a shrink-only ceiling at the delivered count; both builds had to write outside their contract. `124/00` declared it. Nothing derives the obligation. | test-gap | medium | non-blocker → backlog: a check that a `files:` entry new under a budgeted directory implies the budget table | backlog | open |
| F-07 | Three controls that executed nothing were green under `--only`: `test/arch/loop/index.mjs` gained FF-12404's import and not its spread (a scripted edit whose second replace matched nothing), FF-12404 carried a hand-rolled comment stripper, and FF-12405 two fixed-line-window slices. All caught by the restored fitness lane and the review. | test-gap | high | fixed in-story (spread added; the shared `test/support/source-slice.mjs` scanner; structural slices) | — | closed |
| F-08 | `.aof/aof.lock.json` was wrong at HEAD for four paths unrelated to 124 while `aof work update` reported them up-to-date (it compares disk with a fresh render, never with the lock); no control compares a recorded hash with a file, and the manifest declares no `.opencode/` entries. | test-gap | medium | fixed for the lock by `124/02` (FF-12405 leg 9 asserts lock-versus-disk); the general control is non-blocker → backlog | backlog | open |
| F-09 | `parseMemoryArgv` skips an unknown flag without consuming its value, so `recall "seam" --scope architecture --block` exits 0 with the value folded into the query; `--block` is real and absent from `aof work memory --help`. | defect | medium | non-blocker → backlog (the memory face) | backlog | open |
| F-10 | `TECH_DEBT.md` sat at exactly its shrink-only ceiling, so ADR-006's instruction to append a 12-line entry could not be honoured as written. | design-gap | low | closed in `124/01` by compacting item 76 (47 → 13 lines) before landing item 91 | — | closed |
| F-11 | `test/loop/autonomous-shell-out-prompt.test.mjs`'s 20-second spawn budget was sized for a range that ended at its first cap exhaustion; under `124/01` the range takes one refine first and crossed it (47s against a 180s diagnostic budget). | defect | low | closed in `124/01` (60s, with the reason at the constant) | — | closed |
| F-12 | `aof test --scope impacted --story 124/00` widened nine times (every new file `not-in-graph` or `no-registered-dependent`) and collapsed to `scope all` — the run this control node must not take. Second instance after `m119/F-09`. | defect | medium | non-blocker → backlog; the build used `node scripts/test.mjs --only <files>` | backlog | open |
| F-13 | The refine's first feasibility agent stalled 5h44m with zero progress and completed in eight minutes on re-run; `observability/` records 33h56m idle in a 36h07m span. | defect | medium | non-blocker → backlog: the stall watchdog aof does not have | backlog | open |
| F-14 | The engine's own cycle cap is dead on the `nextDecision` path (no `cycle` at six call sites; three decider branches unreachable) — ruled at refine (ADR-006) and deliberately not half-wired. | design-gap | medium | non-blocker → `TECH_DEBT.md` item 91 | TECH_DEBT 91 | open |
| F-15 | The lock names `.aof/templates/work/task/example.feature` and the `.gitattributes` pin for the rendered templates covered `*.md` only, so a fresh `core.autocrlf=true` checkout holds a CRLF copy whose hash the lock cannot match: FF-12405 leg 9 red on every clean Windows checkout, green on the node that rendered it. No control asserts that every path the lock names is line-ending-pinned. | defect | high | blocker for the milestone gate → **fixed at accept**: `.aof/templates/**` pinned `text eol=lf` (the counterpart of the `src/bundle/**` and installed-tree pins); the general control is non-blocker → backlog | backlog | closed |
| F-16 | `124/00`'s FF-12403 control names the session driver's suite path in its coverage table (a real 119/04 → 119/03 contract entry, asserted non-vacuously), and 53/00's closed census allowlist did not name it — red only at the whole-tree gate, one directory over from everything the story declared (`119/R3`). | defect | medium | blocker for the milestone gate → **fixed at accept**: named in `NAMES_THE_NEW_MODULE` with its reason (a naming consumer; imports neither driver nor sink; the 44+4 split untouched) | — | closed |
| F-17 | 31 spawn-heavy cases (SEA asset seam, bundle manifest census, every `aof work ui` / `aof mesh ui` server lane) red in the gate's first run and green in isolation in the same worktree and in the gate's second run; the node was carrying Codex runtimes and an AWS deploy during the first window. Second instance of `m119/F-41`. | defect | medium | non-blocker → backlog: the gate cannot tell contention from regression, and the row it writes cannot explain a red it did not enumerate (`m119/F-42`) | backlog | open |

## Accept decision

**ACCEPTED** — 2026-09-08, on a green whole-tree regression gate at `cb3c2cdf`
(`REGRESSION.md`: `scope all`, `green`, "may stand as the accept gate"). No override was used.

`124/00`, `124/01` and `124/02` are accepted on their own lanes (114/0, 217/0, 23/0), with
`aof work validate 124` PASS, `aof work loops validate` exit 0, every declared control resolving
under `aof work doctor 124` at both severities, and all five red probes observed. No `@manual`,
`@uat` or design lane was owed.

**The gate took two runs, and five reds had to be repaired before the door — none of them inside a
124 story's lane.** Three sat at HEAD when verify began: FF-11903 could not fall because it read its
own persisted failure text (`F-01`, the sweep scoped and its ceiling lowered 65 → 47); FF-6607b was
refusing on six register cells the b088825c squash stranded (`F-03`, re-pointed); FF-9603 was
refusing on another lane's build brief (`F-04`, rephrased). Two more appeared only in the whole-tree
run: an unpinned template the lock names (`F-15`) and a driver-census allowlist miss by this
milestone's own control (`F-16`). The first gate run also carried 31 contention reds that pass in
isolation (`F-17`, `119/F-41`'s species) and the second run had none.

Every blocker finding is closed (`F-01`, `F-03`, `F-04`, `F-05`, `F-07`, `F-15`, `F-16`). The open
findings are triaged non-blocker and routed: `F-02` (fictional paths in the citation sweep — a
ruling), `F-06` (the budget-table obligation nothing derives), `F-08`, `F-09`, `F-12`, `F-13`,
`F-14`, `F-17`.
