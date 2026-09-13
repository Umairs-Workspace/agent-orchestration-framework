---
doc: verification
---
# 129 · Loop concurrency — Verification

## Verification evidence

### `129/01` — the mode and the engine decide

- **`node scripts/test.mjs --only` over the story's ten declared suites plus the four standing loop
  controls its `reads:` names as the ones its `LOOP_STOPS` change reds** (`test/loop/loop-bounds`,
  `work-loop-phase-map`, `work-loop-stop-set`, `loop-record-projection`, `work-loops-resolved-ceilings`,
  `loop-only-fail-redrives`; `test/arch/loop/acd-loop-probe-contract`, `acd-cap-exhaustion-returns-to-the-plan`,
  `acd-loop-cap-single-home`, `acd-clock-counts-attempts`; `test/mesh/assignment/mesh-assignment-loop-directive`;
  `test/arch/assignment/acd-assignment-resolves-to-a-loop-call`; `test/arch/grade/acd-acceptance-horizon-single-predicate`;
  `test/arch/command/acd-prompt-bounds-name-their-home`) under an isolated `AOF_GLOBAL_HOME` —
  **385 pass / 0 fail**, exit 0. Re-run after this accept's `F-04`/`F-05` edits with `loop-diag`
  and `work-loop-determinism` added: **397 pass / 0 fail**, exit 0.
  Story-attributable within it: **140** rows named `129/01/<task>` — task 00 thirty-eight, 01
  thirty-five, 02 thirty, 03 thirty-seven — plus five rows in other suites that cite the story by
  ref (the `69/00` ceiling-grammar row for the mode pointer; the `LOOP_STOPS` literal pins in
  `FF-12404`, `63/03`, `FF-6306`; the renamed phase-map row). Every `@executable` scenario and
  every Examples row of tasks 00–03 has a case whose name carries the task prefix and the
  scenario's own headline; task 03's "probe contract's literal names the same fifteen" is
  `FF-5304`'s "stop vocabulary is frozen, exact" row, green against the fifteen-member literal.
  `verifies → tasks/00_the-mode-has-one-home.feature`, `tasks/01_the-engine-routes-on-status.feature`,
  `tasks/02_refine-first-is-three-phases.feature`, `tasks/03_the-wave-is-decided-purely.feature`
- **Read at the source, not only through the suites:** `src/work/loop.mjs` carries no `import`
  statement, no `from "…"`, no `require(` and no dynamic `import(`; the literals `"refine_first"` /
  `"sequential"` occur in code in exactly two modules — `src/loop-bounds.mjs:126` (the mode list)
  and `src/work/loop.mjs:1159` (the engine's one branch constant) — and `work.loop.concurrency` is
  read nowhere but the bounds home's two maps. That is FF-12901 leg 1 and leg 2's literal sweep,
  observed by hand ahead of the control 129/05 lands.
- **The lane was scoped to the story, deliberately.** The whole-tree run belongs to
  `aof work regression-gate 129` at the milestone door. The story's recorded grade
  (`runs/umamis-msi/20260913T005139090Z-0001.json`, `brief.grade`) is `pass` over 1,956 cases with
  0 failing against the 24-red baseline the cascade measured at `2321dce8` — the delta this story
  owes is clean.
- **`aof work validate 129/01`** — `[]`, exit 0: **PASS**. `aof work validate 129` — `[]`, exit 0.
  `aof work loops validate` — 33 warn (`loop-anchor-absent`, pre-existing), 0 error, exit 0.
- **`aof work doctor 129/01`** at accept — three warns, none of them `control-unresolved` at either
  severity: `numbering-gap` (42 and 122 are missing between 00 and 129 — the stream's),
  `rubric-join-unchecked` and `depends-edges-unchecked`. Loop-Ready 80% (8/10). At milestone scope
  the six `control-unresolved` warns are FF-12901/2/3/5/6/7, declared `pending` for 129/05 and not
  this story's to land — this story declares no control of its own.
- **No `@manual` and no `@uat` scenario exists in this story** — all four task features are
  `@executable`, so no evidence subagent ran and no human sign-off applies.
- **No UI surface** — the story writes `src/loop-bounds.mjs`, `src/loop-record.mjs`,
  `src/work/loop.mjs` and their suites; the milestone has no `DESIGN.md`. The design-conformance
  step does not apply and no renderer precondition was evaluated.

### `129/02` — the drive is a child

- **`node scripts/test.mjs --only` over the story's eight declared suites plus the three standing
  controls its `reads:` names** (`test/loop/drive-command-phase-drivers`, `test/audit/audit-spawn-bounded`,
  `test/loop/warm-fix-loop`, `test/loop/loop-fix-transport-shape`, `test/arch/audit/acd-audit-never-imports-project-code`,
  `test/arch/testing/acd-source-directory-budget`, `test/arch/audit/acd-control-derives-its-census`,
  `test/session/agent-session-driver-door`; `test/arch/work/acd-phase-door-not-a-driver`,
  `test/arch/session/acd-session-driver-single-home`, `test/arch/command/acd-cli-entry-executes`) under an
  isolated `AOF_GLOBAL_HOME` — **136 pass / 9 fail**, and re-run identically (136 / 9) after this
  accept's two edits (`F-15`'s comment, `F-20`'s message). **Story-attributable: 40 pass / 0 fail** —
  rows named `129/02 task0N`: task 00 twelve, 01 four, 02 twelve, 03 twelve (eleven scenarios plus the
  SEA-sentinel row the review added) — one named case per scenario and per Examples row of all 39
  scenarios, plus the factory row that cites the story. **Every one of the 9 reds is inherited from
  another lane's uncommitted work in this shared checkout, none of it this story's:** FF-11904 ×5
  (`src/commands` 68/67, `test/arch/work` 48/46, `test/work` 58/57, `test/work/stream` 33/32 — no
  mention of `src/loop`, whose exemption row is green); FF-11902 ×3 citing `test/bundle/site-build.test.mjs`
  and `test/arch/work/acd-one-mint.test.mjs`, both UNTRACKED (`??`) files of other lanes; `53/00 task01`
  naming `test/support/source-slice.mjs`, committed at HEAD `9b64eb32` (a `🌍` comment mentions the
  driver) — red at HEAD before this story. The run record's 24-red baseline (`runs/umamis-msi/…-0000.json`)
  carries the same reds.
  `verifies → tasks/00_the-drive-takes-a-lent-run.feature`, `tasks/01_stdin-is-the-cancel-channel.feature`,
  `tasks/02_run-bounded-gains-abort.feature`, `tasks/03_child-drive-spawns-and-parses.feature`
- **Read at the source, not only through the suites.** `src/loop/` holds exactly `child-drive.mjs`
  (146 lines), whose three imports are `node:url`, `../asset-base.mjs` and `../work-audit/spawn.mjs`
  — no session driver, no `node-pty`, no `console.` (ADR-005 §5, ADR-008's invariant, ahead of
  FF-12902). `SOURCE_DIRECTORY_EXEMPTIONS` carries `src/loop` with a `why` naming the ninth file and
  the `loop-*` root-leaf move (ADR-008 §2). In `drive.mjs` the `--fix` read precedes `transitionRunStart`
  and the stdin arm/release share one `try…finally`; `managedRunId` reads `input.run` before
  `ctx.loopDrive`; `settlementContext` rides every real result. **Through a REAL child process:**
  `node src/cli.mjs work drive continue 129/02 --run probe-run --dry-run --json` prints exactly one
  document `{ ref, phase, command }`, exit 0, mints nothing; `… --run probe-run --fix C:/nowhere/fix.json --json`
  prints exactly one refusal `{ ok: false, code: "drive-fix-unreadable", error: "… ENOENT …" }`, exit 1,
  and `runs/` still holds its three records — the refusal precedes the mint. The reworded abort message
  (`F-20`) was measured with real children: deadline 30 inside grace 100 → "its 30ms deadline expired
  inside the 100ms grace, so it was killed"; grace 30 under deadline 5000 → "did not exit within its
  30ms grace, so it was killed".
- **The lane was scoped to the story, deliberately.** The whole-tree run belongs to
  `aof work regression-gate 129` at the milestone door. The story's recorded grade (run
  `20260913T024339010Z-0001`, carried on this verify run's `brief.grade`) is `pass` over 1,956 cases
  with 0 failing against the 24-red baseline measured at `2321dce8` — after the cascade's warm fix
  ratcheted FF-11902's floors (`F-19`); the delta this story owes is clean.
- **`aof work validate 129/02`** — `[]`, exit 0: **PASS**. `aof work validate 129` — `[]`, exit 0.
  `aof work loops validate` — 33 warn (`loop-field-prose-only` 12, `loop-owner-unknown` 6,
  `loop-graph-grounded-exogenous-only` 6, `loop-graph-ungrounded-component` 5, `loop-anchor-absent` 4;
  all pre-existing), 0 error, exit 0.
- **`aof work doctor 129/02`** at accept — three warns, none of them `control-unresolved` at either
  severity: `numbering-gap` (the stream's), `rubric-join-unchecked`, `depends-edges-unchecked`.
  Loop-Ready 80% (8/10). At milestone scope the six `control-unresolved` warns are FF-12901/2/3/5/6/7,
  declared `pending` for 129/05 — this story declares no control of its own (ADR-005's "FF-12902
  holds §5" is 05's landing).
- **Observability** (`aof work observe 129/02 --write` →
  `observability/snapshots/2026-09-13T03-13-26-740Z/report.md`): 4 agents, 1h17m calendar span,
  1h13m real active, 361.6k output tokens, governance 57%; the one "stall" (developer, 25m20s) is the
  hand-off wait for review round 1, not a dropped connection; the developer's grind is real — 33% of
  active time on the toolchain, `drive.mjs` edited 10×, worst run 231 s.
- **No `@manual` and no `@uat` scenario exists in this story** — all four task features are
  `@executable`, so no evidence subagent ran and no human sign-off applies.
- **No UI surface** — the story writes `src/loop/child-drive.mjs`, `src/commands/drive.mjs`,
  `src/work-audit/spawn.mjs`, `src/agent-session-driver.mjs` and their suites; the milestone has no
  `DESIGN.md`. The design-conformance step does not apply and no renderer precondition was evaluated.

### `129/03` — the lane commits and merges home

- **`node scripts/test.mjs --only` over the story's eight declared suites, the four standing
  controls its `reads:` names, and two importers that keep their line through the re-export**
  (`test/mesh/worker/mesh-worker-commit-diff`, `test/grade/gate-propagation-refusals-leave-branch`,
  `test/grade/gate-propagation-reuse-door-advance`, `test/work/lifecycle/work-dispatch-lanes`,
  `test/loop/lane-is-local-slot`, `test/mesh/mesh-worktree-materialize`;
  `test/arch/grade/acd-gate-propagation-never-discards`, `test/arch/assignment/acd-worktree-never-linked`,
  `test/arch/assignment/acd-worktree-path-scoped`, `test/arch/bundle/acd-runs-eol-pinned`,
  `test/arch/session/acd-session-driver-single-home`, `test/arch/session/acd-session-driver-mesh-blind`)
  under an isolated `AOF_GLOBAL_HOME` — **208 pass / 0 fail**, and **208 registered = 208 reported**
  (the twelve suites' exported arrays were counted before the run, so `F-25`'s silent-exit shape is
  excluded by count, not by the exit code). Re-run after this accept's three edits (`F-38`, `F-40`,
  `F-41`): **213 / 0**. **Story-attributable: 103 rows** named `129/03 task 0N` — task 00
  twenty-four (every scenario and Examples row, plus the two `B1` rows), task 01 thirty-three (every
  row plus `I1` and `I4a`), task 02 thirty-five (every row plus `B1`/`I1`/`I2`/`I3`/`I4a`), task 03
  eleven (the ten `check-attr` rows and the three `text`/`eol` rows sit inside two named cases). Task
  01's "the mesh's callers are byte-identical" carries no row of its own: it is the two `gate-propagation`
  suites green in the same lane with their pre-existing assertions untouched (`git diff` of
  `refusals-leave-branch` outside the new block is two import lines; `reuse-door-advance` is
  unmodified). Every row runs over a REAL fixture repository — the fast-forward, the `--no-ff` merge,
  the aborted conflict and the union merge are git's own answers, never a double's.
  `verifies → tasks/00_commit-worktree-changes-moves-home.feature`, `tasks/01_advance-branch-gains-a-dirty-policy.feature`,
  `tasks/02_the-lane-merges-home.feature`, `tasks/03_state-md-merges-by-union.feature`
- **Read at the source.** `src/mesh/worker-execution.mjs` (1,914 lines, was 1,957) defines no
  `function commitWorktreeChanges`, `resolveRefInWorktree` or `worktreeWorkDir`; it re-exports the
  first from `./worktree.mjs` (`:443`) and the second from `../work/dispatch.mjs` (`:331`), and its
  two call sites (`:1377`, `:1901` — HEAD's `:1420`/`:1944` shifted by the removed definition) pass
  `pushExec` on the same lines. `src/work/dispatch.mjs` no longer imports `execFile` — it borrows
  `resolveExec` — and spells no git `merge`, `rebase`, `reset` or `--force` outside comments (ADR-002's
  invariant, ahead of FF-12904's extension); `worktree.mjs`'s only `../work.mjs` import is the
  pre-existing `loadWorkspace` line (HEAD:47), which is what makes the feasibility note's rationale
  wrong and its outcome right (`F-46`). `git check-attr merge` over the ten contract paths answers
  `union` for the three `STATE.md` shapes and `unspecified` for the seven others; `text`/`eol` are
  `unspecified` for the `acd-runs-eol-pinned` control file and for `STATE.md`, `set`/`lf` for the
  `.sh`; the attributes file carries exactly one `merge=` line.
- **The lane was scoped to the story, deliberately.** The whole-tree run belongs to
  `aof work regression-gate 129`. The story's recorded grade (run `20260913T082644174Z-0001`, carried
  on this verify run's `brief.grade`) is `pass` over 1,956 cases with 0 failing beyond the 24-red
  baseline measured at `2321dce8`. FF-11903 measured at this accept: **57 vs a ceiling of 47** (58 at
  `129/01`; `child-drive.mjs` cleared) — 03's six fixture paths are in the set and stay there, see
  `F-09`'s addendum.
- **`aof work validate 129/03`** — `[]`, exit 0: **PASS**. `aof work validate 129` — `[]`.
  `aof work loops validate` — 33 warn / 0 error, the same five codes as at `129/02`.
- **`aof work doctor 129/03`** — three warns (`numbering-gap`, `rubric-join-unchecked`,
  `depends-edges-unchecked`), no `control-unresolved` at either severity; at milestone scope the six
  `pending` warns are 05's, unchanged. The story declares no control of its own.
- **Two build runs, both accounted for.** `20260913T032426340Z-0000` (session `96eb26ce…`) worked
  03:24–03:31Z, then the host slept (loop death #4, bracketed in `STATE.md`); `--resume` reclaimed it
  `failed / runtime_offline` at 08:26:35Z and `-0001` (`retryOf` it) built and reviewed the story
  08:26–10:23Z, settled `done` — $49.88, 619 turns. The recovery path the run store promises is the
  one that ran.
- **Observability** (`aof work observe 129/03 --write` →
  `observability/snapshots/2026-09-13T10-39-51-388Z/report.md`): 5 agents, 1h45m calendar span,
  1h26m real active, 322.9k output tokens, governance 50%; the one flagged "stall" (developer, 32m28s
  at 09:13Z) resumes on the coordinator's "FIX ROUND 1" message — the review hand-off, `129/02`'s
  `R8` shape; the grind is real — the developer 31% on the toolchain, `worktree.mjs` edited 10×,
  `dispatch.mjs` 9×, worst run 302 s.
- **Three edits at this accept, each a review nit closed in item:** `resolveDispatchLane` refuses an
  `advanceTo` that is not a hex object name before any door opens (`F-38`, five rows); the traversal
  row plants a milestone-shaped directory where a joined path would land, so its null answer can fail
  (`F-40`); the unknown-policy rows run over a bare temp directory (`F-41`). TECH_DEBT item 83
  re-measured and its status line appended: 1,914 (−43), one verb of seam 3.
- **No `@manual` and no `@uat` scenario exists in this story** — all four task features are
  `@executable`, so no evidence subagent ran and no human sign-off applies.
- **No UI surface** — the story writes `src/mesh/worktree.mjs`, `src/mesh/worker-execution.mjs`,
  `src/work/dispatch.mjs`, `.gitattributes` and their suites; the milestone has no `DESIGN.md`. The
  design-conformance step does not apply and no renderer precondition was evaluated.

## Fitness functions

<!-- THE RED-PROBE REGISTER. Each row CITES a declaration in ARCHITECTURE.md's register; the id
     stands alone in its first cell. A control is `pending` until story 05 lands it; a landed
     control owes the probe its register row names, observed red, before it is called green. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-12901 | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` | pending (129/05) | — |
| FF-12902 | `test/arch/loop/acd-loop-family-boundary.test.mjs` | pending (129/05) | — |
| FF-12906 | `test/arch/loop/acd-loop-family-boundary.test.mjs` | pending (129/05) | — |
| FF-12903 | `test/arch/loop/acd-lane-records-and-the-declaration.test.mjs` | pending (129/05) | — |
| FF-12907 | `test/arch/loop/acd-lane-records-and-the-declaration.test.mjs` | pending (129/05) | — |
| FF-12905 | `test/arch/loop/acd-lane-grade-is-lane-scoped.test.mjs` | pending (129/05) | — |
| FF-12904 | `test/arch/grade/acd-gate-propagation-never-discards.test.mjs` | pending (129/05, extension) | — |

Story 01 lands no control: every row above is 129/05's, and 01's structural claims are held in the
interim by the standing controls it extended (`FF-5304`'s fifteen-member literal, `FF-6306`,
`FF-12404` leg 5, `FF-6111`'s two-way key equality). No probe row is owed by this accept.

## Findings

Reported unnumbered by the review close (`STATE.md` `## Feedback (for retro)`, 2026-09-13) and by
this accept; ids allocated here, at the moment of landing.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `decideWave` read a `Set`-typed `live` / `setAside` as empty — and `src/commands/loop.mjs` keeps its set-aside as `new Set()`, so the first real caller would have re-offered every set-aside unit on every tick. | defect | medium | fixed at the review close: `memoryRefs` reads an array or a `Set`, answers `[]` for an absent memory and `null` for any other present shape; eight rows added (`decideWave reads a Set memory`, `… is null, never a full dispatch`). | `129/01` | closed |
| F-02 | Task 00's loader-admission scenario was built as a second hand-rolled registry writer in `loop-record-projection.test.mjs`; the loader's home is `work-loops-resolved-ceilings.test.mjs`'s `grammarRows`. | test-shape | low | fixed at the review close: the row moved to `grammarRows`, which gained an R8 parse guard on every row; `files:` extended by that suite. | `129/01` | closed |
| F-03 | ADR-001 §1 said a loop record citing the mode as a ceiling "reads `unknown`"; the locked feature (task 00) and the code project `state: "bounded"`, `bound: null`, `comparison: null` — `ceilingOf` reserves `unknown` for a record that declares it. | contract-wording | low | ratified: the ADR carries the dated amendment; the `.feature` is untouched. | `129` ARCHITECTURE.md | closed |
| F-04 | Code polish left at the review close: `src/loop-bounds.mjs`'s header still said "deadlines and loop caps" though it holds a mode; `src/loop-record.mjs` inlined the predicate `positiveIntegerOrNull` names at the record's own `cycles` read, and the helper sat between `configBound` and its narrative comment. | craft | low | closed at this accept: header names every `work.loop.*` key (69's numbers, 129's mode; three lines kept, so the `:12-13` / `:48-50` citations in `.aof/loops/` still resolve); the helper moved above the narrative with its own one-line remit; the `cycles` read uses it. No behavioural change; the lane re-ran green (397/0). | `129/01` | closed |
| F-05 | Test-shape nits left at the review close: the phase-map row "only task count and uat counts affect task-derived dispatch" named a generality the engine no longer has (its rows dodge the `in-review` branch); the "engine imports nothing" scan admitted a dynamic `import()`. | test-shape | low | closed at this accept: the row renamed to state its precondition ("for a story that is not in-review … 129/01 routes in-review on status"); the scan gained `/\bimport\s*\(/`. `work-loop-determinism`'s copied-alone leg stays the strong home for the import claim. | `129/01` | closed |
| F-06 | `decideWave` passes duplicate members through, and a ref present in both `wave` and `heldSet` lands in both `dispatch` and `hold`. | edge-case | low | non-blocker, closed by ruling: `work:next` emits neither shape (the partition is disjoint by construction, 71/ADR-006) and the shell (04) is the only caller; the list's shape is the caller's contract, the members are data. Recorded so a second caller does not assume a dedupe the engine does not do. | `129/01` | closed |
| F-07 | An empty or padded string member of `unrefined` is accepted as a ref by `memberRef`; the engine would answer `drive refine ""`. | edge-case | low | non-blocker, routed: the shell produces `unrefined` from `work:next`'s answer, so the ref shape is 04's to guarantee at the source; the engine reads refs verbatim by design (the same rule that refuses `" in-review"`). | `129/04` | open |
| F-08 | Interim the STORY Notes declare, measured at the review close: from this diff on ANY loop — `sequential` included — whose head is an `in-review` story with tasks receives a fresh `gate` act, and the shell halts `unmapped-item-type` / `unexpected-engine-act` on it instead of re-driving `continue` (fail-loud, never a burned session). Also owed to the shell: `nextDecision` passes neither `concurrency` nor `unrefined`; `refineFirstDecision` does not subtract `setAside` from `unrefined`, so the shell must (or a set-aside story costs `cap` refine sessions before it halts); no lane-stop narration in the halt `details` / `renderLoopState`. The engine's `lastPhase === "verify"` tail is now unreachable for a story that is actually `in-review` (test-only). | design-gap (interim) | medium | non-blocker for 01 — the split is ADR-001 §4's and ADR-008 §3's, and 04 is the same wave's successor. **Operational rule until 04 lands: the 127 soak (any `aof work loop` over a stream holding an `in-review` story) must not run on this tree.** | `129/04` | open |
| F-09 | FF-11903 (`acd-cited-path-resolves`) is red whole-tree: 58 unresolvable `src/` citations under `wiki/work/**` against a shrink-only ceiling of 47. 129's share, none of it this story's: `src/loop/wave.mjs` (12 docs), `child-drive.mjs` (8), `cycle.mjs` (6) cited by ARCHITECTURE.md and stories 02–05 before 02/04 land them; `src/loop/lanes.mjs` — a REJECTED alternative in ADR-008 that will never land, so it can never clear by landing; and six fixture paths in 129/03's features (`src/added.mjs`, `src/c.mjs`, `src/n.mjs`, `src/new.mjs`, `src/y.mjs`, `src/promote.mjs`) that read as citations. 129/01's own documents cite nothing that does not resolve. | defect | medium | non-blocker for `129/01` → blocker for the MILESTONE door. The family modules clear when 02/04 land; `lanes.mjs` needs the architect to spell the rejected alternative without a resolvable-path form; 03's fixture paths are 03's build to respell (its `.feature` is delivered and immutable — the suite may spell the fixtures under a non-`src/` root). `m127/F-09` is the same species. **Addendum, 2026-09-13 (`129/03` accept):** the respell was never available — the six fixture paths sit in 03's DELIVERED `.feature`s and the sweep walks every `.feature` under `wiki/work/**`, so the suite's spelling is irrelevant and the contract is immutable. They are the 124/126 species (`src/a.mjs`, `src/b.mjs`, `src/x.mjs` were already in the set) and cannot clear by any act of 03's. Measured 57 vs 47 at this accept (`child-drive.mjs` cleared). The door's remedy is the control's — an Examples-table fixture is not a citation — or a reasoned ceiling row; both are the architect's, beside `lanes.mjs`. `129/03` is struck from the routing. | `aof work regression-gate 129`; architect (`129` ARCHITECTURE.md; FF-11903's reader) | open |
| F-10 | `src/work/loop.mjs` crossed 1,500 lines with this story (1,578; 51 inbound edges; no budget row and no ledger entry). 04 and 05 push it further; the review/finding-routing block (`:170-380`) has nothing to do with the phase map. | codebase-health | low | non-blocker; story-sized, not this item's — a size ratchet or a split of the routing block. Carried to the story `RETROSPECTIVE.md` and the milestone's `## Notes` for the operator to place; not a chore. | retrospective / operator (future item) | open |
| F-11 | Task 01's scenario "the engine imports nothing" is a structural invariant the register already holds (`work-loop-determinism`'s copied-alone leg; FF-12902's family boundary once 05 lands) spelled as an acceptance scenario — the litmus reads it as design, not behaviour. | contract-wording | low | non-blocker; the `.feature` is delivered and immutable. Recorded for the retrospective: structural claims go to the register, and a task cites the control rather than restating it. | retrospective | closed |
| F-12 | `src/work/loop.mjs` in this checkout also carries a hunk that is NOT this story's: `decideSupervisedDeclarations` resolving `ceilingMs` per workspace (dated 2026-09-11, another lane's uncommitted fix for the supervisor relaunch storm). It rides in the same modified file as this story's three hunks. | checkout-shared | low | non-blocker; informational for the commit batch: `aof:code-review`'s per-story batching must carve the story's hunks (`LOOP_STOPS`, `memberRef`/`memoryRefs`, `decideWave`, `refineFirstDecision`, the status route) from the supervisor hunk, or name it in the story's commit deliberately. | `aof:code-review` | open |
| F-13 | `src/loop/child-drive.mjs` discriminated the argv on `cli.mjs` EXISTING rather than on what `process.execPath` IS. Under the payload-first `aof.exe` both are true, and `aof.exe <exeDir>/src/cli.mjs work drive …` answers `Unknown command "…cli.mjs"` with zero stdout bytes — every lane drive from the installed binary would have `died` at t=0 (reproduced at the source by the orchestrator, craft and architect). | defect | blocker | fixed in item at review round 1: `isPackaged()` (`src/asset-base.mjs`, the one SEA-detection home) picks the vector; the entry is resolved lazily on the Node branch only (the embedded CJS bundle rewrites `import.meta` to `{}`); a four-row SEA-sentinel case pins the verb-only vector. ADR-005 §1 amended, dated. Round 2 (architect delta): PASS. | `129/02` | closed |
| F-14 | `drive.mjs` armed stdin OUTSIDE the driver call's `try…finally` (a throw between resume and pause would have held the child open until the parent's deadline kill), and `DEFAULT_GRACE_MS` 10 s left under 3 s of margin over the measured 7.08–7.15 s stdin-end → exit stop path (the driver's bracket plus node-pty's 5 s console-list fallback). | defect | medium | fixed at the review close: arm and release are one bracket; the grace is 20 s with QA's measurement in the comment. | `129/02` | closed |
| F-15 | Task 01's ARMING ORDER ignores an `end` seen before `onPtyLive`, so a parent cancel landing in the child's startup window (fix read → brief → trust write → ConPTY spawn, 150 ms–1.2 s measured, longer under the load 129 creates) is DROPPED: the session spawns anyway and the parent's grace SIGKILLs the child without the driver's bracket. The `setImmediate` yield after `resume()` is a latency guarantee for the already-ended case, not a structural one (a NUL / `stdio: "ignore"` stdin plus an instant fake PTY read as a cancel 8/8 without it). | design-gap (interim) | medium | non-blocker: the row "was ended before the command started → done" is a delivered contract and changing the gate here would red it. PROPOSED for 04's contract (one finding from craft #3 = QA F1 = the architect's contract question): arm only when stdin is a PIPE; on a pipe any `end` is the cancel — pre-live through the driver's own pre-spawn `signal.aborted` refusal (`processStarted: false`), live through the bracket; a TTY/file/NUL stdin is never armed; the yield goes. 04 owns the parent side, 06's live run measures it. The `drive.mjs` comment that over-claimed the yield was corrected at this accept to state the limit and cite this row. | `129/04` | open |
| F-16 | A lane drive with no `deadlineMs` inherits `runBounded`'s `DEFAULT_DEADLINE_MS` (60 s) — every real lane would be `timeout`. | design-gap (interim) | medium | non-blocker: `spawnLaneDrive` has no production caller yet. 04 derives the child's deadline from `startToCloseMs + startupGraceMs` (ADR-005 §4) and passes it. | `129/04` | open |
| F-17 | FF-12902 as declared: its `node:child_process` leg must scope to `src/loop/**` (`src/commands/loop.mjs` imports `execFile` for git, pre-existing) and its argv leg must take the packaged branch through `setSeaSentinelForTest`, per ADR-005 §1's amendment. | contract-wording | low | non-blocker; routed to the control's landing. | `129/05` | open |
| F-18 | `test/loop/` is at its ceiling (72/72) and now parks three subjects (tasks 00, 01, 03) in `drive-command-phase-drivers.test.mjs` (506 → 1,540 lines). | codebase-health | low | non-blocker; 04/05's wave/cycle suites need a stated row raise in the budget table, not more parking. | `129/04`, `129/05` | open |
| F-19 | `work:grade` flagged one case beyond the run's baseline: FF-11902 "a floor is a floor" — the driver-door census gained its 49th suite (`drive-command-phase-drivers` imports `driveInteractiveClaudeSession` through the sink for task 01's driver-level rows) and the no-headroom probe's floors are retyped at four sites across two control files. | test-shape | low | closed at the cascade's warm fix: `suites` 48 → 49, `preExisting` 54 → 55 in `acd-control-derives-its-census` and `agent-session-driver-door`; both added to `files:`; grade `pass` on the re-run. Retro: the floor should be DERIVED (or the no-headroom leg dropped), not retyped twice — the door's own doctrine says a story adding a sink importer "should not have to edit a control it has never read". | `129/02` | closed |
| F-20 | `spawn.mjs`: a deadline expiring INSIDE an abort's grace sent the one kill, but the message said "did not exit within its Nms grace, so it was killed" — blaming the grace for the deadline's kill (three lenses, one finding). | craft | low | closed at this accept: `killedBy` names the bound that sent the kill; measured with real children (see the evidence). The lane re-ran identically (136 / 9; story 40 / 0). | `129/02` | closed |
| F-21 | Nits closed by ruling: the `end` listener is never removed (task 01 row 2 pins exactly one listener; a one-shot process); a caller-supplied `agentSessionDriverOptions.signal` is replaced under `--run` (a test-only seam, unreachable from the CLI; 04 passes none); `{ ...process.env, ...env }` loses a caller key differing only in case on Windows (`AOF_GLOBAL_HOME` unaffected); the already-aborted-at-entry case asserts `sessionId: null` where task 01's literal omits it (the driver's sibling pre-spawn refusals carry it; the code is right, the literal is loose); "touches no run record" reaches `aborted` via the pre-aborted path, never a live abort. | craft / test-shape | low | closed by ruling; recorded so the next reader does not re-raise them. | `129/02` | closed |
| F-22 | A `kill()` fault other than ESRCH/EINVAL emits `error` on the child and `runBounded` settles `not-started` for a child that RAN — pre-existing on the deadline path; the abort adds a second kill site. | edge-case | low | non-blocker; pre-existing seam behaviour outside this story's contract. Carried to TECH_DEBT item 85's re-home story (whose trigger — a third caller — this story met; status line appended there). | TECH_DEBT 85 | open |
| F-23 | Task 03's "src/loop is a declared exemption" is a structural claim the unit suite re-asserts by importing the arch control — the scenario asks for it, so the case stays. | contract-wording | low | non-blocker; the `.feature` is delivered. Drop the re-assertion when 05 lands FF-12902; same species as `F-11`. | `129/05` | open |
| F-24 | `aof work drive continue <ref> --run --json` binds `--json` as `--run`'s VALUE (`parseSpecArgv`, face-general, pre-existing): with no `--json` left and a lent id `"--json"`, the command starts a REAL session in the primary checkout, heartbeating a record that does not exist. MEASURED at this accept, by mistake: the probe ran ~2 min before it was killed (session `9348716c`, read-only — no Write/Edit, no file changed; the ten `runId: "--json"` heartbeat rows it wrote to the story's `.heartbeats.ndjson` were removed by hand). | defect | medium | non-blocker for this story — `spawnLaneDrive` always supplies a value and the face is `src/spine/face.mjs`'s. A string flag whose value starts with `--` should be `missing-flag-value`, the code `--run` alone already gets. Routed as a face item. Operational rule for verifiers: a real drive is probed with `--dry-run` or not at all. | `src/spine/face.mjs` (future item) | open |
| F-25 | `scripts/test.mjs --only` exits 0 with NO summary line when a suite drains the event loop mid-await — a false-green shape met twice in this build. | defect | medium | non-blocker; the runner should treat an unsettled selection as a failure, never a silent exit 0. Routed as a runner item. | `scripts/test.mjs` (future item) | open |
| F-26 | The declared `reads:` missed eight documents the build needed (`agent-session-driver-door`, `mesh-worker-terminal-fixture`, `run-store`, `run-session-capture`, `run-spend-ingest`, `degrade`, `claude-trust`, `acd-phase-brief-bounded-in-writer`) and `files:` missed `loop-fix-transport-shape.test.mjs`, whose input-schema pin had to change. | contract-wording | low | closed at the build (both declarations extended). Retro: a story that widens a closed schema owes every pin of that schema in `files:`. | `129/02` | closed |
| F-27 | The checkout carries other lanes' hunks in this story's files: `agent-session-driver.mjs`'s tree-terminate / `onSessionStop` bracket (the 2026-09-12 loop fix) beside this story's `signal` hunks, and 127/128's ceiling rows in the budget table's diff beside the one `src/loop` exemption line. | checkout-shared | low | non-blocker; informational for the commit batch — same species as `F-12`. | `aof:code-review` | open |
| F-28 | `commitWorktreeChanges`'s `paths` scoped the `add` but not the commit: `mergeDispatchLaneHome`'s own-writes step swept an operator's pre-staged out-of-scope entry (`M  README.md`) into a mesh-authored commit, and door 2's staged-entry refusal never fired (all three lenses, one Blocker). | defect | blocker | fixed in item at review round 1: the scoped door checks `diff --cached -- <paths>` and commits `commit --no-verify -m … -- <paths>`, so the operator's staged entries stay staged and are then refused by name; the `.aof` reset runs only when the scope can reach `.aof`, and then the commit carries `:(exclude).aof` because a pathspec commit takes working-tree contents. Round 2 (QA delta): RESOLVED on the round-1 probe shape and 28/28 edge probes; two `B1` rows in task 00 and one in task 02. | `129/03` | closed |
| F-29 | `touched-paths` read plain `status --porcelain`, which collapses a wholly-untracked directory to `?? dir/` and never intersects the file-level three-dot diff — git then refused at the ff/merge door and the promised RETURNED refusal became a thrown `gate-propagation-failed`. | defect | medium | fixed at the review close: `-c core.quotePath=false status --porcelain --untracked-files=all` under `touched-paths` only (strict's invocation byte-identical; the `-c` also un-escapes non-ASCII names in `files`); `I1` rows in tasks 01 and 02. | `129/03` | closed |
| F-30 | `dispatchLaneBase` answered against the MAIN worktree's line — wrong when the primary is itself a linked worktree, which this repo's gate-in-a-worktree flow is. | defect | medium | fixed at the review close: `{ primaryRoot }` (explicit `rev-parse HEAD` there), the list-main fallback only when absent — amendment (e), additive; the `I2` row measures the disagreement the option closes. | `129/03` | closed |
| F-31 | Only a conflict answered `lane-open-failed`; a reused lane holding uncommitted work refused with the verb's own code, so the wave would have had to switch on two codes for one fact ("this lane cannot be brought to HEAD"). | design | medium | PO ruling made inline at the review: EVERY `advanceTo` refusal is `lane-open-failed` with `cause` = the verb's code — ADR-002 §7 amendment (d), ratified here, the `.feature` untouched; the `I3` row holds it. | `129/03`; `129/04` switches on one code | closed |
| F-32 | A second porcelain-v1 parser had been born beside `laneChanges`, and `defaultGitExec` / `resolveExec` / the mesh identity argv were each spelled twice across `worktree.mjs` and `dispatch.mjs`. | codebase-health | medium | fixed at the review close: one `parsePorcelainStatus`, one exported exec seam (`dispatch.mjs` borrows `worktree.mjs`'s; its `execFile` import is gone), one `meshIdentityArgs`; `laneChanges` reads through the parser (`I4a` rows). | `129/03` | closed |
| F-33 | Production passes no `pushExec`, so the moved verb's fallback runner budget fell 300 s → 30 s — right for a `rev-parse`, wrong for `git add -A` over a freshly materialised tree. | defect | medium | fixed at the review close: `WORKTREE_COMMIT_TIMEOUT_MS` (5 min) on the default runner only; injected runners still receive exactly `{ cwd, env }`. | `129/03` | closed |
| F-34 | Task 00's "`acd-session-driver-mesh-blind` is green unchanged" was INFEASIBLE: the required re-export of `resolveRefInWorktree` from `../work/dispatch.mjs` necessarily adds `work/dispatch.mjs` + `mesh/launcher-lock.mjs` to the SINK's static closure. | contract-wording | low | ratified at the review: the pin re-measured 71 → 73 (driver reach 24 unchanged); `files:` gained `acd-session-driver-mesh-blind` and `acd-worktree-path-scoped`; `SINK_CEILING` 1957 → 1914. The `.feature` is untouched; carried for `aof:verify 129`. | `129/03` | closed |
| F-35 | Task 01's intro said the refusal's `files` come "in porcelain order"; every row is only consistent with lexical sorting. | contract-wording | low | ratified: sorted and deduplicated — amendment (b); the `.feature` is untouched. | `129/03` | closed |
| F-36 | Task 00's ruling (1) said "the `.aof` reset still runs" under `paths`; in the live primary that reset unstaged an operator's staged `.aof/aof.config.json` OUTSIDE the scope. | contract-wording | low | ratified: the reset runs only when the scope can reach `.aof` (`scopeReachesAofHome`) — ADR-002 §2 "nothing else", ADR-008 §7(d); amendment (c), the `.feature` untouched. | `129/03` | closed |
| F-37 | The suites hold rows no feature states: the untracked-directory collapse, a staged out-of-scope entry across the own-writes commit, a linked-worktree primary, a dirty reused lane under `advanceTo`. | test-shape | low | recorded — delivered behaviour beyond the contract, each held by a named `fix round 1` row; amendment (f). | `129/03` | closed |
| F-38 | `resolveDispatchLane` accepted any string as `advanceTo`: a ref such as `HEAD` resolves against the LANE and answers `already-current` silently — the stale base the option exists to prevent. | edge-case | low | closed at this accept: `OBJECT_NAME` (`/^[0-9a-f]{7,64}$/i`) guards it, a thrown `dispatch-lane-advance-not-a-sha` before any door opens; five rows (`HEAD`, `main`, `refs/heads/main`, `B1`, a non-hex string) assert the code, the message, no exec invocation and no materialised lane. | `129/03` | closed |
| F-39 | `withMoveFixture` / `withDirtyPolicyFixture` re-scaffold `withDispatchRepo`, and `writeRel`/`writeUnder`, `mergeHeadAbsent`, `conflictMarkers` are spelled 2–3× across the three suites — `test/support/dispatch-lane-fixture.mjs` was outside `files:`. | test-shape | low | non-blocker; routed to 04, whose write set holds `test/support/` — fold the helpers onto `dispatch-lane-fixture.mjs` when its own fixtures land there. | `129/04` | open |
| F-40 | The traversal row asserted `existsSync(worktree/../../etc) === false`, which cannot fail. | test-shape | low | closed at this accept: the row PLANTS a milestone-shaped directory exactly where a joined path would land and asserts the null answer over four traversal shapes — a join-built resolver would now find it. | `129/03` | closed |
| F-41 | The three unknown-policy rows built a real repository to exercise a recording double that receives no invocation. | test-shape | low | closed at this accept: a bare temp directory and a placeholder sha are the fixture; the assertions are unchanged. | `129/03` | closed |
| F-42 | A `.`-shaped `paths` scope's `.aof` reset still unstages a staged `.aof` edit. | edge-case | low | closed by ruling: the loop never passes `.` (it passes `wiki/work/<milestone dir>`), and a scope that reaches `.aof` is by definition the `-A` door's behaviour — `scopeReachesAofHome` says so in its own comment. | `129/03` | closed |
| F-43 | `worktree.mjs` 964 → 1,194 and `dispatch.mjs` 582 → 790 against ADR-008's ~1,030 / ~700; 54–56% of the added lines are comments. | codebase-health | low | non-blocker; no size row exists for either file and the growth is the rulings' documentation (`F-28`, `F-29`, `F-36`), not code. Recorded for the retrospective: an ADR's line estimate is a measurement claim. | retrospective | closed |
| F-44 | `mergeDispatchLaneHome` can THROW as well as return — `commit-failed`, `gate-propagation-failed`, `gate-propagation-base-unresolved`; a `branch-missing` refusal carries `base: null, tip: null`; a scoped `commit -- <paths>` during an in-progress merge in the primary is refused by git → thrown `commit-failed`, `MERGE_HEAD` intact. | design-gap (interim) | medium | non-blocker for this story; consumer notes for the wave: a throw from the merge step is a halt, never a silent skip, and the two `null`s are a shape the narration must tolerate. | `129/04` | open |
| F-45 | `test/arch/session/acd-session-driver-mesh-blind.test.mjs` carries 127/01's `work/observe.mjs` route hunk beside this story's 71 → 73 hunk. | checkout-shared | low | non-blocker; the commit batch must carve it — `F-12` / `F-27` species. | `aof:code-review` | open |
| F-46 | The feasibility note that ruled `worktree.mjs` out as the resolver's home cited a `work.mjs` edge the module ALREADY carried (`loadWorkspace`, HEAD:47) and conflated the sink's pinned reach (71) with the driver's (24) — a rationale written into the contract before it was measured. | contract-wording | low | closed: `dispatch.mjs` stands as the home on ownership grounds alone (it owns `resolveDispatchLane` / `cleanupDispatchLane`); the delivered `.feature`'s "gains no import" clause is true as written. Retrospective. | retrospective | closed |
| F-47 | `aof test --scope impacted --story 129/03` resolved to `all` because `.gitattributes` is not a graph node — the forbidden whole run; the build's terminator was run as `--scope file` over the named suites instead. | defect | medium | non-blocker; a non-module in `files:` should widen the impacted set to nothing, not to everything. Routed as an `aof test` item (the same species the impacted-scope memory names for new files). | `aof test` — `--scope impacted` (future item) | open |

## Accept decision

**`129/01` ACCEPTED** — 2026-09-13. The story's lane is green (385 pass / 0 fail across its ten
declared suites and the four standing controls its `LOOP_STOPS` change reds; 397 / 0 on the re-run
after this accept's two polish edits), every one of its 33 scenarios and every Examples row has a
named passing case, the mode's single home and the engine's zero-import leaf were read at the source,
`aof work validate 129/01` reports PASS, `aof work loops validate` reports no error,
`aof work doctor 129/01` reports no `control-unresolved` at either severity, and no blocker finding
against this story is open: `F-01`–`F-06` and `F-11` closed, `F-07` / `F-08` routed to `129/04`,
`F-10` carried to the retrospective, `F-12` to the commit batch.

`F-09` is an inherited whole-tree red this story neither caused nor can fix — FF-11903 clears only
when 02/04 land the family modules 129's documents already cite — and it is a blocker for the
MILESTONE door, not for this story. The milestone stays open: `129/02`–`129/06` are unaccepted, all
seven declared controls are `pending` for 05, and `aof work regression-gate 129` has not run.

**`129/02` ACCEPTED** — 2026-09-13. The story's lane is green where it is the story's (40 pass /
0 fail across its 39 scenarios and every Examples row, one named case each, in 136 / 9 over the
eight declared suites and three standing controls; the 9 reds are named, inherited, and untouched by
this story), the family's zero-driver import set and the budget exemption were read at the source,
the CLI face was driven as a real child process (one document under `--dry-run`; one coded refusal
before any mint for an unreadable `--fix`), the recorded grade is `pass` over 1,956 cases with 0
beyond the baseline, `aof work validate 129/02` reports PASS, `aof work loops validate` reports no
error, `aof work doctor 129/02` reports no `control-unresolved` at either severity, and no blocker
finding against this story is open: `F-13` (the one Blocker) fixed in item with ADR-005 §1 amended,
`F-14` / `F-19` / `F-20` / `F-21` / `F-26` closed, `F-15` / `F-16` routed to `129/04`, `F-17` /
`F-23` to `129/05`, `F-18` to the 04/05 row raise, `F-22` to TECH_DEBT 85, `F-24` / `F-25` to the
face and the runner as future items, `F-27` to the commit batch.

`F-09`'s share that was this story's to clear — `src/loop/child-drive.mjs` cited by ARCHITECTURE.md
and stories 02–05 — now resolves on disk; `wave.mjs` / `cycle.mjs` wait on 04, `lanes.mjs` on the
architect's respelling, 03's fixture paths on 03. The milestone stays open: `129/03`–`129/06` are
unaccepted, all seven declared controls are `pending` for 05, and `aof work regression-gate 129` has
not run. The operational rule from `F-08` stands until 04 lands: no `aof work loop` over a stream
holding an `in-review` story on this tree.

**`129/03` ACCEPTED** — 2026-09-13. The story's lane is green (208 pass / 0 fail across its eight
declared suites, the four standing controls its `reads:` names and two re-export importers, every
registered case reported; 213 / 0 on the re-run after this accept's three edits), every one of its
37 scenarios and every Examples row has a named passing case over a real git fixture — the one
scenario without a row of its own is held by two suites green with their pre-existing assertions
untouched — the move, the re-exports, the unchanged call sites, the absent `execFile` import and the
one `merge=union` line were read at the source and through git's own matcher, the recorded grade is
`pass` over 1,956 cases with 0 beyond the baseline, `aof work validate 129/03` reports PASS,
`aof work loops validate` reports no error, `aof work doctor 129/03` reports no `control-unresolved`
at either severity, and no blocker finding against this story is open: `F-28` (the one Blocker) fixed
in item at review round 1 and resolved by QA's delta, `F-29`–`F-33` fixed at the review close,
`F-34`–`F-36` ratified as contract amendments with the `.feature`s untouched, `F-37` / `F-42` / `F-46`
closed by record or ruling, `F-38` / `F-40` / `F-41` closed by edit here, `F-43` carried to the
retrospective, `F-39` / `F-44` routed to `129/04`, `F-45` to the commit batch, `F-47` to the `aof test`
face as a future item. TECH_DEBT item 83's status line records the verb paid (1,957 → 1,914).

`F-09` is corrected rather than cleared: 03's six fixture paths live in its delivered `.feature`s,
which the sweep reads, so no act of 03's can remove them — they join the 124/126 species and the
door's remedy is the architect's (FF-11903's reader, beside `lanes.mjs`). Measured 57 vs 47 at this
accept. The milestone stays open: `129/04`–`129/06` are unaccepted, all seven declared controls are
`pending` for 05, and `aof work regression-gate 129` has not run. The operational rule from `F-08`
stands until 04 lands.
