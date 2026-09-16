---
doc: verification
updated: 2026-09-05
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 102 truly done, and what is the evidence?
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's own verification record; there is no
  milestone SPEC box to tick and no milestone regression gate at this door.
  NO @uat scenarios (all three tasks are @executable alone) → no ## User sign-off section.
  NO UI surface and no DESIGN.md → no design-conformance section.
  NO sibling ARCHITECTURE.md → no FF-NN controls are declared here → no ## Fitness functions
  register; the reasoning is stated under ## Verification evidence rather than left as an absence.
-->
# 102 · The declaration names its loop — Verification

## Method

Lanes in scope: **`@executable` only**. All three tasks carry `@executable @cli @work @work-stream`
and nothing else — no `@manual`, no `@uat`, no UI.

Run **inline** by the product owner who authors this record — also the single writer that allocates
the finding ids below, which is why no id was checked against a register before being allocated.

Every run was made under an isolated `AOF_GLOBAL_HOME`, through `node scripts/test.mjs --only <files>`
rather than `node --test` (which passes these files silently, with zero assertions), and never as the
whole repo lane — `global-work-propagation.test.mjs` binds `:4182`, which the live control daemon
holds. `aof work doctor` was run **from the repository root**, where an empty-stream false green is
not possible.

**This record spans TWO gate runs on 2026-09-05, and the second is why the verdict changed.** The
first DECLINED on **F-102-A**. The fix was then made inline at the operator's instruction, and every
lane was RE-RUN WHOLE rather than re-reported — the story's fourteen suites and the entire
`test/arch/**` lane, each under its own fresh isolated global home. Where a row below carries two
readings, the second is the one the accept decision rests on.

**The checkout is shared with two concurrent lanes, and the boundary is drawn by ref.** At this gate
the tree also carried `src/workspace.mjs`, `src/commands/doctor.mjs` and
`test/doctor-cwd-independence.test.mjs` (chore 103) and an edited `118/STORY.md` (story 118). None is
in story 102's `files:` envelope; each red they cause is attributed to its own lane below rather than
inherited silently or blamed on this diff.

## Verification evidence

Run 2026-09-05 at the accept gate. Each row names the procedure and the observation; the outcome is
never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | an isolated `AOF_GLOBAL_HOME` and a focused runner over the story's own fourteen suites — `work-loop-declaration`, `work-loop-determinism`, `work-loop-stop-set`, `loop-command-board-state`, `loop-cap-exhaustion-carries-the-record`, `loop-only-fail-redrives`, `loop-record-reaches-the-redrive`, `loop-resumed-redrive-declares-its-grade`, `loop-record-projection`, `loop-record-command`, `loop-declaration-join`, and the three `test/arch/` loop suites | **124 cases, 0 failures, exit 0** — the same reading at BOTH gate runs | tasks 00–02 |
| `@executable` (fitness) | the ENTIRE `test/arch/**` lane — every suite file, imported by path under an isolated global home | first gate **1753 cases, 3 failed** (F-102-A, F-102-B, F-102-C); after the fix **1756 cases, 1 failed** — F-102-B alone, which implicates no lane in this tree. The exit code was read from `node` itself and not through a pipe: a `\| tail` at the first gate would have reported `tail`'s status as the runner's | the standing fitness lane |
| `@executable` (fitness), over the FINAL tree | the same lane run AGAIN after this record, `RETROSPECTIVE.md` and `OUTCOME.md` were written — several controls read the `wiki/work` corpus, so a lane run that predates the record documents has not seen the tree being accepted | **1756 cases, 1 failed** — the same single control, F-102-B, its reading moved by one citation to 3316/3687 = 89.94%. No control went red from the record documents | the accept decision below |
| the fix, at the source | `acd-shell-loop-id-is-declared` re-routed off its own recursive copy of `src/bundle` onto `withShippedRegistry(null, …)`, the one closing helper; both new files then classified in FF-5809's lane register — the arch suite into lane 1 (it takes the helper's route), `loop-command-board-state` into lane 4 (its only mention of the directory is the header line handing the registry-facing scenarios to its sibling) | FF-5809's three cases green, and the drift probe still ARMS through the new route | F-102-A |
| producer, at the source | `buildLoopDeclaration` driven in a live process on an admitted invocation carrying `id` | the envelope is `loopRunId, scope, level, cap, phase, cycle, startedAt, id` — eight keys, the original seven in their original order and `id` appended last; serialised, `id` is the final key | task 00 sc. 1–3 |
| producer, at the source | the same invocation with `id` omitted | no envelope: `{"code":"loop-id-missing","field":"id","resolution":"the registry id of the loop this run belongs to, supplied by the caller"}` | task 00 sc. 4 |
| producer, at the source | reading the exported `LOOP_REFUSALS` members in order | `loop-scope-unsupported, loop-level-locked, loop-level-gate, loop-level-unknown, loop-bound-unresolved, loop-id-missing` — the five prior codes unmoved, the new one sixth and last | task 00 sc. 6 |
| shell, at the source | reading the binding the shell mints from | `SHELL_LOOP_ID === "loop:autonomous-cascade"`, exported from `src/commands/loop.mjs`; `declarationFor` passes it as an input and opens no registry to obtain it | task 01 sc. 4–5 |
| drift check, armed | the arch/102 control materialises the shipped records through the closing helper, re-points the `id:` of the record that declares the shell's id — found BY that id, not by filename — and re-runs the check | it FAILS, naming both the id the shell mints and `loop:renamed-by-drift`; the unmutated fixture passes first in the same case, so what failed was the drift and not the copying | task 01 sc. 7 |
| join, end to end | `test/loop-declaration-join.test.mjs` — the real four in series: `buildLoopDeclaration` → the run store's own mint verb → `readRuns` → `projectExecution`, with no `brief.loop` literal written by hand anywhere in the file | **8 cases green**, covering the round trip, ratio 1, `declared-never-ran` leaving, `ran-undeclared` for an undeclared id, the empty-brief run counted at ratio one half, one id under two loop run ids as two engagements, and the store's frozen sixteen keys unmoved | task 02, all scenarios |
| delivered criteria | `git status` over milestones 53, 55 and 78 | **empty** — `53/01/tasks/05_declaration-and-resume.feature` is superseded in task 00's own contract and is not edited, annotated or tagged; no delivered `.feature` moved | task 00 preamble |
| the instrument, over THIS repository | `aof work loop-record 102 --json`, and both of the story's own run records read directly | `runsFound: 2, runsCarryingDeclaration: 0, ratio: 0`; both records carry `brief: {}`; all seven registry loops, `loop:autonomous-cascade` included, are still under `declared-never-ran`. Zero run records under `wiki/work` carry any `brief.loop` | F-102-D |
| the SECOND instrument, over this story | `aof work observe 102 --write --if-enabled` at the close | **0 agent runs across 0 sessions, 392 unattributed** — the story's own `## Why` names this instrument as the second customer of a missing join key, and it is still dark, because its key is the `sessionId` ladder (96/00) and not `brief.loop.id`. Fixing one join did not fix the other, exactly as the Boundary says | the story's `## Why`, second customer |
| gate | `aof work validate 102` | `PASS — 102 is well-formed.` | step 4 |
| gate | `aof work doctor 102`, from the repository root | **no `control-unresolved` at either severity**; warns only — `numbering-gap` (stream-wide) and `rubric-join-unchecked` | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless story
with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` control of its own, and the red-probe
obligation reaches declared `FF-NN` ids alone. The control this story ADDS —
`test/arch/acd-shell-loop-id-is-declared.test.mjs` — ships without an `FF-NN` id for the same reason,
and its red probe is run and recorded as an evidence row above rather than as a register row.
`aof work doctor 102` confirms the position: zero `control-unresolved` findings at either severity.

## Findings

Ids are allocated here by the single writer of this record, at the moment of landing them.
**No blocker finding is open.** F-102-A was raised at the first gate, fixed inline at the second and
re-run green; F-102-C was fixed by the lane it was routed to. The two that remain are Important, and
neither is a story 102 defect.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-102-A | **This story's diff turns a fitness function red.** `arch/58 FF-5809` (`test/arch/acd-registry-fixture-closed.test.mjs`) requires every test file that reaches the shipped registry to be classified into exactly one of its four lanes. Two files this story writes now trip its sweep and are in none of them: `test/arch/acd-shell-loop-id-is-declared.test.mjs`, which really does read `src/bundle/loops/` in place (`loadLoops(BUNDLE)`) **and** copy the whole directory into a temp tree; and `test/loop-command-board-state.test.mjs`, which trips the text-match proxy on the `src/bundle/loops/` citation its new header comment plants while reaching nothing shipped. The diff is exactly two additions and no removals, so nothing else moved. The control is behaving as designed — *"a new one fails here until it is [classified]"* — and classifying is an act its author must take | defect (unregistered control reach) | **blocker** | **No `@bug` task scenario is authored, and that is the triage call.** FF-5809 already asserts this red by name, in the register that is the fix's own home; a second scenario asserting the same classification would be a second authority over one question. The fix is the classification itself, with its reason: the arch suite into `WHOLE_DIRECTORY` (it copies the directory listing) or `READS_WITHOUT_COPYING`, and the board-state suite into `IN_ITS_OWN_FIXTURE_TREE` — each lane carries its own qualifying leg, so the choice is not free. **The fix taken DEPARTED from that first sentence, and the departure is the finding's real lesson:** neither offered lane admits the arch suite honestly — its `cp -r` is not lane 2's `readdir` of the listing, and lane 3 is for files that copy NOTHING — so classifying it either way would have been a false statement to satisfy a leg. It was re-routed onto the closing helper instead and classified lane 1, which is what 58/ADR-007 §3a asks of any suite copying shipped records into a temp registry. Only the board-state suite was classified as first triaged | fixed inline at the second gate | **fixed** — FF-5809 green, 2026-09-05 |
| F-102-B | **`arch/FF-6603`'s union-resolution floor is red from the COMMITTED corpus, not from this tree.** `acd-register-declaration-form`'s ROUND 3/1 leg asserts that register-only resolution leaves >90% of qualified citations dangling; it measures 3309/3680 = **89.9%** at the first gate and 3315/3686 = **89.93%** at the second. Held out: with story 102's folder removed the reading is 3305/3676 = **89.91%**, and with 118's removed as well it is unchanged — so neither lane's documents move it below the floor; they nudge the ratio UP, toward it. **The direction is the whole argument.** The leg asserts that register-only resolution leaves MORE than 90% of qualified citations dangling, so a document whose ids are declared in a proper register lowers the reading — this record's own findings register does exactly that. The floor eroded as the corpus adopted register declarations, which is the instrument aging against its own success rather than a regression | pre-existing red control | Important | not a story 102 defect, and not fixable inside this story's contract: re-basing a `done` milestone's control is a decision about the corpus, not about the loop declaration. The assertion needs re-basing against a measured corpus, or restating as a property that does not decay as adoption grows | its own chore, unraised at this gate | open |
| F-102-C | **`arch/43 ADR-014/E7 + 59 FF-5903` is red from a concurrent lane, mid-flight in this shared checkout.** `acd-test-suite-registration` reports `test/doctor-cwd-independence.test.mjs` as `audit-suite-imported-never-spread`: `scripts/test.mjs:447` imports `doctorCwdIndependenceTests` and never spreads it into the exported `tests` array, so the file looks registered and executes nothing. The file is untracked and its first missing case names *"chore 103 — work doctor answers the SAME findings for one ref from the repo root, a source dir and a work-item folder"*. Story 102's own two new suites ARE imported and spread (`scripts/test.mjs`, both blocks), and neither is named by this red | red control, another lane | Important | route to the lane that is landing it; recorded because a red fitness lane must never be inherited silently | chore 103 | **closed** — the routing worked: chore 103's lane spread the import (`scripts/test.mjs:4232`) between the two gate runs, and the control is green in the second |
| F-102-D | **The producer exists; the join is still empty over this repository, so 78's `OUTCOME.md` gap is only half discharged.** That gap's own words are *"`buildLoopDeclaration` mints a registry-resolvable loop id into the declaration envelope, **and at least one run record on disk carries it**"*. The first half is delivered and confirmed at the source. The second is not: `aof work loop-record 102 --json` reports `runsFound: 2, runsCarryingDeclaration: 0, ratio: 0`, both of this story's run records carry `brief: {}`, zero run records under `wiki/work` carry any `brief.loop`, and `loop:autonomous-cascade` remains under `declared-never-ran`. The cause is the boundary this story draws in the open — the runs `aof:refine`/`aof:continue`/`aof:verify` mint are not instrumented here, and only driving the loop shell writes a carrying record. Recorded so the discharge is not claimed by inference from a green suite, which is the F-78-A species one turn later | scope boundary, correctly declared | Important | do NOT mark 78's gap discharged in this story's `OUTCOME.md`; the discharge condition is met when the shell is driven over this repository, or when the phase-command path the story's Boundary raises is scheduled and lands | 78's `OUTCOME.md` gap + the phase-command instrumentation item 102 raises | open |

**What is green.** The story's own three tasks: **124 cases, 0 failures** across fourteen suites,
covering the eighth key appended last with the seven unmoved, the byte-identical cross-process
serialisation, the refusal on an absent, empty-string or non-string id, the earlier guards still
deciding first, the resume reader still recovering exactly five keys, a pre-change seven-key run still
resuming, the shell minting one constant id across every phase, cycle and resume, a tree with no
`.aof/loops/` running unchanged, the drift check armed against a mutated shipped record, and the join
proved end to end through the real producer, store and reader. `aof work validate 102` reports `PASS`
and `aof work doctor 102` reports no `control-unresolved` at either severity.

**And the standing fitness lane is green but for one control this story does not implicate**: 1756
cases with a single failure, `arch/FF-6603`'s ROUND 3/1 floor (F-102-B), which is red with this
story's folder in the tree and redder with it out.

## Accept decision

**DECLINED at the first gate, 2026-09-05; ACCEPTED at the second, the same day, after the fix.**
`aof work status 102 done` was run at the second gate and stamped the acceptance.

**The first verdict, kept rather than overwritten**, because a record that only ever shows the
accepted state teaches nothing about what the gate caught. It read: *the gate the story fails is not
`validate` and not its own scenarios — both are green — it is the fitness lane. F-102-A is open and is
a blocker: two files this story writes make `arch/58 FF-5809` red, and the red is caused by this diff
and by nothing else in the tree.* That is the rule doing its job on a story that shipped a red control
it created.

**What changed between the two.** The fix was made inline at the operator's instruction, and it was
not the one the first triage sketched: the arch suite was re-routed onto the closing helper rather
than classified into a lane whose leg it does not satisfy (F-102-A). Both new files are now in
FF-5809's register, the control is green, and the whole `test/arch/**` lane was re-run rather than
re-reported. **Nothing in `src/` moved between the gates** — the producer, the shell constant, the
refusal and the join were each confirmed at the source in a live process at the first gate and are
unchanged, so the eight-key envelope this story delivers is the one that was measured there.

**Two findings remain open, both Important, neither a story 102 defect.** F-102-B is a red
control this gate inherited from the committed corpus and would be redder without this story's
documents; F-102-C is closed by the lane it was routed to; F-102-D records a discharge this story
must NOT claim — 78's `brief.loop.id` gap stays `open`, because a producer that exists is only half
of a condition whose other half is a run record on disk carrying the id.
