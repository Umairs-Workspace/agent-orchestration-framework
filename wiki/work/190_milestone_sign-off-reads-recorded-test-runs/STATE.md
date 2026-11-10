---
doc: state
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — State

## Progress

- [x] `00_story_a-repeat-run-is-answered-from-its-record` — accepted at verify 2026-11-10, done
- [x] `01_story_impacted-narrows-on-what-it-knows` — accepted at verify 2026-11-10, done
- [x] `02_story_a-gate-that-did-not-finish-resumes` — accepted at verify 2026-11-10, done
- [x] `03_story_the-doors-stop-prescribing-repeat-runs` — declined at verify (F-01), fixed there, accepted 2026-11-10, done
- [ ] `04_story_an-existing-project-declares-its-test-layout` — declined at verify 2026-11-10 (F-05, F-06 blockers; F-07), back to in-progress with `@bug` task 05; next `aof:continue 190/04` after the architect amends ADR-008 §1

## Notes & decisions in flight

- Framed 2026-11-09 from the operator's review of the testing burden: "requiring several runs of
  essentially the entire test suite … a better sign-off process is required". The operator accepted
  the five-point direction as "a step in the right direction".
- ~~The run counts in the SPEC (7–10 per story) are an estimate read from the skill texts.~~ The
  per-door count is still read from the skill texts. What is now measured is that every recent
  story's run is a whole-tree run (RESEARCH Q1: 76 of 76 widen).
- **Refined 2026-11-09, `--autonomous`, solo.** Default decisions taken, each in an ADR:
  - the content key includes `wiki/work`, because suites read the live stream (ADR-001, RESEARCH Q4);
  - a red record answers only the identical selection (ADR-002 §1);
  - documents narrow only through declared couplings, not a text index (ADR-003 §4);
  - **no tier declaration (ADR-004). This narrows the SPEC, so it is raised with the operator at
    the refine's close;**
  - resume is local only, because CI's git dir does not survive the job (190/02 Notes).
- No example map holds an open business question. Every map's questions are technical and
  defaulted to an ADR, or were struck because the SPEC answers them.
- Diagram not drawn: `diagram-generator-missing` (ADR-002's brief kept; `aof diagram plan 190
  ADR-002` answered `available: false`).
- Found while measuring, out of scope: the accept door does not compare the gate row's commit with
  the accepted head (RESEARCH Q5).

- **190/00 built 2026-11-09, solo, attempt 1** (no prior attempt, so no episodic recall). Decisions
  the ADRs left to the build:
  - `runTest`'s record seam is **off by default**; only the CLI face (`testCommand.run`) hands the
    store in. The contract suite stubs runs with `projectRoot: repoRoot`, and a default-on store
    would have filed a stub's verdict as the record of this repo's real tree, which a real
    `aof test` on that content would then trust. The gate calls `runTest` in-process too, so 190/02
    turns its recording on deliberately (ADR-005 §4).
  - The key is taken **before** the launch and the record is filed under it.
  - A record or a lock is placed by write-then-`link`, so a reader never sees half of one, and the
    `link` is also the lock's exclusive create.
  - A store that fails (an unreadable store, a failed write) is reported as `not recorded: …`. It
    never costs the run.
  - The key does not see `.gitignore`d content. A hand edit inside `node_modules` keeps the key,
    and `--fresh` is the repair (167/01 R1, honoured, with this gap named in `record.mjs`).
- **190/01 built 2026-11-10, solo, attempt 1.** Decisions the ADRs left to the build:
  - **The selector reads no file.** 179/04 forbids it, and FF-7202 forbids a `JSON.parse` there.
    So what it knows about files (on disk, a changed file's text, the workspace export maps)
    arrives as an injected `sources` seam, composed in the test command's binding. The export map
    is read by the census beside its workspace-manifest walk. With no seam supplied, everything
    absent widens exactly as before.
  - **A suite is selected only if the runner can run it.** It must be a suite by the declared
    predicate AND a member of the whole suite. The census walk counts a workspace `test/`
    directory's array suites only, whether reached through `test` or declared as a root. Measured:
    `scripts/test-shard.mjs` refuses a native `node:test` file ("exports no array"), so ADR-003 §1's
    `.test.mjs` under package roots would have selected files the runner rejects.
  - **A narrowed selection of nothing launches nothing.** Examples are a not-yet-written path, or a
    document no suite reads. Launching with no selection argv would have run the whole suite
    labelled `impacted`.
  - **No coupling is declared for this repo.** The literal census cannot see suites that read the
    bundle through the CLI or a manifest walk (VERIFICATION, 190/01 task 03).
  - 96/03-01's four rows are rewritten to ADR-003 §3, which supersedes them. Their "unknown"
    files are now planted on disk, and the declared-suite row now asserts `suite-itself` and
    `not-yet-written`.
  - **The near-miss recall was taken after the build, not before.** That is a process miss. Its
    five lessons were already honoured by the build as it stood.
- **190/02 built 2026-11-10, solo, attempt 1.** Decisions the ADRs left to the build:
  - **The gate tells its program what to do through templates.** The gate declaration gains
    `reportArgs` (`{report}`), `filesArgs` (`{files}`) and `noLanesArgs`, beside `jobsArgs` and
    `budgetArgs`. The gate never spells another program's flags. This repo declares
    `--report-json`, `--files` and `--no-lanes`. A resume without `filesArgs` and `reportArgs` is
    refused as `regression-gate-resume-undeclared`, a fourth code beyond the contract's three.
    Otherwise it could only run the whole tree under a resume's name.
  - **The gate's record is keyed AFTER its row is appended.** The row is the gate's own write.
    Keyed before it, the record names a tree that stopped existing the moment it was written, and
    neither the UAT answer (ADR-005 §4) nor the resume's same-content check could ever match.
    The cost: the suite never saw the new row.
  - **The sharded report now carries `units` (unit key → files) and `lanes`.** A packed unit's
    key names only its first file. The pool already expands a killed packed unit to all its files,
    so PLAN's known trap needed nothing more.
  - **The record leaf gains** an attachment beside a record, pruned with it, plus `findGateRun`
    by row instant on any key (so a changed tree and a missing record are told apart), an
    `instant` override and a `source` field. All of it lives in the one writer.
  - **Process miss, repeated: the near-miss recall came after the build.** 165 R4 ("a gate over
    a busy machine is re-run, never repaired") is recorded as `departed`, because ADR-005 decided
    the resume.
- **190/03 built 2026-11-10, solo, attempt 1** (the recall was taken first this time). Decisions:
  - **`<build_terminator>`'s "a declared path the graph has not seen WIDENS the run" was corrected.**
    It now describes 190/01's placement. It was not in 03's contract, but left as it was the prose
    would have told agents something false.
  - **`--fresh` is named once in the commands**, in `<build_terminator>`, beside a suspected flake.
  - **The agent briefs (`packages/core/assets/agents/`) were not changed.** SPEC's Scope names them,
    but none prescribes a test run.
  - **Rendered with `aof work update`:** 14 files updated, 0 drift. The host config was snapshotted
    before the render and found unchanged after it (180/02 R1, honoured).
- **190/04 built 2026-11-10, solo, attempt 1** (near-miss recall taken before any code). Decisions:
  - **The compiled toolchain gains `couplingsDeclared`.** Absent and `[]` select the same, so
    `couplings` alone cannot tell the check a question nobody asked from one answered "none".
    `toolchain.mjs` stays the one reader of `work.test.*` (FF-7201).
  - **The family is wired through `assembleConfigInspect`'s services**: `workToolchain` is now
    assembled before `configInspect` (it has no dependencies), and `work:update` receives
    `configInspect`. Both parameters are optional, so the two test helpers that assemble these
    without them see no family. The doctor reads the RAW config: normalisation drops `work`.
  - **`--commit` reuses `since-rev-unresolvable`** for a revision that does not resolve, and the
    one-source refusal keeps its code `test-story-and-since` while naming whichever flags were
    given. `--commit` outside `impacted` is refused with `test-story-outside-impacted`, generalised
    the same way. A plan returns before the record lookup and the launch, with `gate: false`.
  - **`/aof:map-tests` writes `work.test` by Edit.** There is no config verb for `work.test`; the
    skill then runs `aof project validate`.
  - **No whole-suite run.** The story's `files:` widens `--scope impacted --story 190/04` to all
    1,273 suites (14 declared documents are not in the graph), and the live control daemon holds
    `:4182` on this machine. The suites that read the changed modules and censuses were run with
    `--scope file` instead.

## Feedback (for retro)

- **[190/00 build] FF-19004 as written would fail on today's tree.** Two modules spelled the key's
  mechanism before this milestone: `packages/work-loop/src/commands/loop.mjs` `readBuildBaseline`
  (a second producer of the same worktree-snapshot tree id, for the review diff) and
  `packages/integration-hyperagent/src/check.mjs` (sets `GIT_INDEX_FILE` to extract a plan branch;
  no key). RESEARCH did not census them. The control carries both in a named, shrink-only baseline.
  Moving the loop's baseline onto `record.mjs` is outside 190/00's write set. That is a story
  shape for the operator.
- **[190/00 build] A stale ceiling was red on `HEAD`.** `test/mesh/identity` has held 8 files since
  `cc1f1f5a`, and its row's prose said 9 -> 8, but it still declared 9, so FF-11904 was red before
  this story touched the file. Lowered to 8 in the same diff, since 190/00 already writes that
  budget file.

- **[190/00 review close] Waiting on a larger run can cost more than it saves (Important, amendment
  for the operator).** ADR-002 §4 has a caller wait on any in-flight run whose selection *covers*
  its own. With `work.test.deadlineMs` at 2 h and a whole-tree run measured at 53 min (this
  story's own impacted run, widened by `not-in-graph`), a lane asking one 13 s suite waits the
  whole 53 min. Proposed amendment: wait only on an in-flight run whose selection is identical, or
  bound the wait by the asked selection's own expected cost. Built as the ADR states. Not changed
  without a ruling.
- **[190/00 review close] Routed story shape (operator):** move `readBuildBaseline`
  (`packages/work-loop/src/commands/loop.mjs`) onto `record.mjs`'s key and shrink FF-19004's
  baseline to the hyperagent extraction only.
- **[190/00 review close] Read/write set incomplete.** Five files outside `files:` had to change:
  `packages/core/src/application/assemble.mjs` (the test binding receives `degradeServices`, for
  m42's coded degrades), `test/bundle/yarn-installation.test.mjs` (`record.mjs`'s platform
  imports), `test/arch/command/acd-cli-entry-executes.test.mjs` (`aof work find` 751 -> 752),
  `test/fixtures/application/command-inventory.json` (the `--fresh` flag) and the
  `test/mesh/identity` row in the budget file above. The wave planner did not see these, so 190/01
  should be re-checked against them.
- **[190/00 review close] Nits, recorded:** the key is taken before the run, so edits made during a
  run file its result under the pre-run key. A recycled pid makes a dead owner's lock look alive
  until the deadline (2 h here). `--verbose` over an answered run cannot restore the passing rows,
  and does not say so.
- **[190/00 build] The whole-tree run is red on this Mac for reasons outside 190.** It ran 2026-11-10
  as `aof test --scope impacted --story 190/00`, widened to all and took 53 min. Five failures were
  this story's, fixed and re-run green: m42 silent catch, FF-16006 vocabulary, kernel imports, the
  descriptor goldens and FF-16004. The rest are macOS `/var` vs `/private/var` tmpdir mismatches,
  189's PLAN/STORY records (FF-9603, FF-7106), gpg lock contention, the 131/08 command count and
  FF-5301. None names a 190 file.

- **[190/01 review close] The transitive walk reaches nearly every suite (Important, amendment
  for the operator).** Through the composition root (`aof/default-application`, imported by
  nearly every suite), a source module's transitive dependents are about 1,119 of 1,269 suites. The
  replay's 12 narrowed stories have a median of 1,119. RESEARCH's "median 8" counted direct
  importers. So SPEC's outcome ("a story that only adds a new test file and edits one source file
  runs an impacted set, not the whole tree") is met only for leaf-ish changes (167/04: 13 suites,
  3 min 28 s). Possible remedies, each an ADR change: stop the walk at the composition root and run
  an import smoke test instead, or select by the root's direct consumers.
- **[190/01 review close] ADR-003 §1's `.test.mjs` under package roots (Important, amendment).**
  This repo's per-file runner cannot run native `node:test` files. The build selects only
  runnable members of the whole suite. The ADR's text should say so.
- **[190/01 review close] Read/write set incomplete.** These were written outside `files:`:
  `packages/core/src/application/bindings/work/test-select.mjs` (exports `NARROWING_REASONS`),
  `packages/core/src/application/bindings/work-audit/census.mjs` (exports `workspaceExportMap`),
  `packages/core/src/application/bindings/commands/test.mjs` (composes the selection sources),
  `test/bundle/yarn-installation.test.mjs` (`select.mjs` imports `picomatch`) and
  `scripts/workspace-runtime-audit.json` (census.mjs's `sourceDigest` re-stamped, with its
  audited spawn expression unchanged).
- **[190/01 review close] Nit, recorded:** the specifier scan reads text, so an `import` written
  inside a string fixture of a changed file could place a pending file that has the same path.
  It is rare, and it only narrows onto the importer's own suites.

- **[190/02 review close] Read/write set incomplete.** These were written outside `files:`:
  `packages/work/src/testing/toolchain.mjs` and `.aof/aof.config.json` (the three gate templates),
  `packages/work/src/testing/record.mjs` and `packages/core/src/application/bindings/commands/test.mjs`
  (the gate records through 00's leaf), `test/work/work-toolchain-declaration.test.mjs` (the
  compiled gate's shape), `test/fixtures/application/command-inventory.json` (`--resume`) and
  `scripts/workspace-runtime-audit.json` (the gate's and the sharded runner's `sourceDigest`
  re-stamped, with every audited expression unchanged). ADR-005 does not say how the gate hands
  its program a file list. The templates are the build's answer, and refine should have named
  them.
- **[190/02 review close] Not run: the PLAN's live check** (a 1-minute-budget gate, then
  `--resume`). It needs a scratch clone with its own install. On this checkout it would append a
  spurious row to 190's own `REGRESSION.md`. Left for verify.
- **[190/02 review close] Nits, recorded:** a combined row drops the stopped run's "not isolated"
  notes. A second resume of a resumed `not-finished` run reports its `m` over the first resume's
  units only.

- **[190/03 build] FF-7106 caught an incomplete write set.** 03's `files:` named the `.claude/` and
  `.aof/templates/` renders but not the 16 tracked `.agents/`, `.opencode/` and `.codex/` renders the
  same render writes. The declaration was completed in the story, with no other change.
- Refine missed adoption: 190 added opt-in work.test.* keys (roots/suiteSuffixes, couplings, gate reportArgs/filesArgs/noLanesArgs) whose absence silently keeps the old widen-to-everything / no-resume behaviour. Nobody asked how an EXISTING project learns the keys exist or gets them declared. Caught by the operator at verify; added as story 04 (doctor check + /aof:map-tests skill). — Raised by: operator
- **[190/04 build] This repo is not all `ok` under its own check.** The PLAN expected three `ok`
  checks here. The doctor reports `test-layout-suites` (8 package suites under
  `packages/{effects,server,contracts,messaging}/test` are outside `work.test.roots`) and
  `test-layout-couplings` (190/01 deliberately left `couplings` absent, because a literal census
  would be confidently wrong, VERIFICATION.md). ADR-008 reads absent as "nobody asked", so a
  considered decision to keep widening has no `ok` spelling. Not changed here: the story never
  rewrites this repo's config.
- **[190/04 build] The read and write sets missed the bundle descriptor.** Registering a command is
  `packages/core/assets/bundle.json`, not `manifest.json` (which is generated from it by
  `scripts/generate-bundle-manifest.mjs`). The descriptor was edited, the manifest regenerated,
  and the story's `files:` completed with no other change. `.agents/skills/aof-map-tests/procedure.md`
  was dropped from it: the `init`-shaped command renders no procedure file. The declared
  `.codex/aof/workflows/workflow-contract.md` was left unchanged by the render.
  The new command also moved five censuses the PLAN did not list (150 R1, a new bundle command has
  more censuses than the PLAN lists): the bundle member counts (`bundle.suite.mjs`,
  `bundle-runtime-variants.suite.mjs`), the living prompt audit (`wiki/prompt-audit.md`), FF-12405's
  cut roster and the autonomous door's command set. Each was updated with its reason, and the
  story's `files:` completed.
- **[190/04 review close] Solo, one round, no Blocker.** Fixed at the close: `map-tests.md` step 1
  said "before reading anything else" while `<config>` must read `work.dir` to build the exclude
  path; it now says "before the layout is read". Found while running the censuses and fixed in the
  build: `layout.mjs` loaded at every start (FF-16004, 752 → 753), so config-inspect now imports
  it at the call.
- **[190/04 review close] Important, handed to the operator: a deliberate "keep widening" has no
  `ok` spelling.** ADR-008 §1 reads absent `couplings` as unasked, and `[]` claims no suite reads a
  document. This repo is the counter-example (190/01 chose to keep widening), so its own doctor
  warns forever. Changing that is an ADR-008 amendment, or a story shape: "a coupling list can
  state that unmapped documents widen on purpose".
- **[190/04 review close] Recorded (Nits):** an unresolvable `work.test.command` makes the family
  silent rather than naming the command (`aof test` refuses loudly there); `--commit` reuses the
  `since-rev-unresolvable` and `test-story-and-since` codes, whose names now undersell them; a
  replayed commit that also touches `work.dir` widens as `not-in-graph`, and `map-tests.md` does
  not tell the agent to expect that.

## Verification

- [x] `@executable` story lanes green for 00–03. The remaining reds are F-02, F-03 and two records
  that are not 190's (VERIFICATION, scoped runs).
- [x] Fitness functions FF-19001–FF-19006 green, each with a red probe
- [x] `@manual` 190/01 task 03 recorded; scenario 3 completed at verify with `--plan`
- [x] 190/02 live resume check recorded (in a clone)
- [ ] `@manual` 190/04 task 04: run; E14 partial (F-05), F-06 open
- [ ] Milestone regression gate: not run. 190 is uncommitted, the live daemon holds `:4182`, and
  F-02/F-03 are red on this Mac.
- [ ] F-08 and ADR-004: the operator's decision
