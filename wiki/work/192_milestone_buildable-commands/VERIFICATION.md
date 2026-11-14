---
doc: verification
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — Verification

Written at `aof:verify 192`. Opened at refine (2026-11-13) only to carry the red-probe register
for the controls `ARCHITECTURE.md` declares. FF-19205, FF-19206 and FF-19207 landed with 192/00 and were each probed red on 2026-11-13.

One developer-run `@manual` check is owed by 192/02 and is recorded below: this checkout's
rendered refine command, Codex refine skill and three briefs, compared with the same files at the
commit before the story, whitespace collapsed (ADR-005 §4).

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19205 | `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` | green (192/00) | red when the empty block slot keeps its blank line (`bundle-compose.mjs`), and when the loader returns the common body uncomposed (`bundle.mjs`), 2026-11-13 |
| FF-19206 | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` | green (192/00) | red when the fixture Codex procedure loses the `demo.notes` slot its common source carries, naming `notes-demo`, `codex`, `demo.notes`, 2026-11-13 |
| FF-19207 | `test/arch/practices/acd-render-reads-project-config-only.test.mjs` | green (192/00) | red when `bundle-compose.mjs` imports `node:os`, and when the update merges the machine-wide config before loading, 2026-11-13 |
| FF-19208 | `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` | green (192/02) | red when "When it is off, write no `EXAMPLES.md`." is written back into core's refine source, naming NONE's Claude and opencode refine commands and `EXAMPLES.md`, 2026-11-13; the four planted leaks of task 00 (that sentence, a discovery fragment under a practice on for every project, the map bullet in the Codex PO brief, the build brief in the Codex refine procedure) each red in the suite itself |

## Verification evidence — 192/00 (aof:verify, 2026-11-13)

The story carries `@executable` scenarios only (no `@manual`, no `@uat`), so no human was asked.
Its own suites and controls were run isolated (`AOF_GLOBAL_HOME` a fresh temp dir) with
`node scripts/test-shard.mjs` over the story's declared test files, plus the source-directory
budget its `files:` amends:

| suite | cases | result |
|---|---|---|
| `packages/core/test/bundle-compose.suite.mjs` | 84 | green |
| `packages/core/test/bundle.suite.mjs` | 36 | green |
| `packages/core/test/work-update.suite.mjs` | 52 | green |
| `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` (FF-19205) | 6 | green |
| `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` (FF-19206) | 5 | green |
| `test/arch/practices/acd-render-reads-project-config-only.test.mjs` (FF-19207) | 5 | green |
| `test/arch/testing/acd-source-directory-budget.test.mjs` | 10 | green |

verifies → `stories/00_story_a-command-is-composed-from-slots-and-fragments/tasks/00`–`05`.
FF-19208 (192/02's control) was run alongside; one of its 45 cases was red and is `F-01` below.

## @manual — 192/02 E4 and E5: the committed copies changed only at the seams

Developer-run, 2026-11-13. Before touching a source, the thirteen rendered copies were saved from
this checkout at `d86f2151` (the commit before the story). After the move, `aof work update` was run
with this tree's own CLI (`node packages/core/bin/aof.mjs`); it updated four files and skipped 232.
Each pair was then compared with every run of whitespace collapsed to one space, reporting the span
from the first difference to the last.

| copy | result |
|---|---|
| `.claude/commands/aof/refine.md` | differs only at the Contract's opening: "…under `tasks/`, opening with the discovery beat below when the project has turned it on." now reads "…under `tasks/`." |
| `.opencode/commands/aof/refine.md` | the same, and only that |
| `.agents/skills/aof-refine/procedure.md` | the same, and only that |
| `.agents/skills/aof-refine/SKILL.md` | differs only in "…before writing tasks; retain executable/manual/UAT lanes…" now reading "…before writing tasks. Retain executable/manual/UAT lanes…" |
| `.claude/agents/aof-{product-owner,architect,qa}.md` | identical (byte for byte; the update skipped them) |
| `.opencode/agents/aof-{product-owner,architect,qa}.md` | identical (byte for byte) |
| `.codex/agents/aof-{product-owner,architect,qa}.toml` | identical (byte for byte) |

E4 and E5 hold: no sentence is missing or doubled, no Claude wording reached a Codex file, and the
only changes are the two seam edits ADR-005 §4 lists. The briefs are byte-identical because their
slots are inline and the fragment bodies are the lines that stood there. A scratch project with
nothing on was then rendered (the NONE project of FF-19208): its refine command holds none of the
discovery or brief words, and is 104 lines shorter than the same command with both keys on.

## Verification evidence — 192/01 (aof:verify, 2026-11-13)

The story carries `@executable` scenarios only (no `@manual`, no `@uat`), so no human was asked.
It declares no control of its own. Its suites and the milestone's four controls were run isolated
(`AOF_GLOBAL_HOME` a fresh temp dir), each with `node scripts/test-shard.mjs <file>`:

| suite | cases | result |
|---|---|---|
| `packages/core/test/bundle-compose.suite.mjs` (tasks 00, 01 at load, 02) | 84 | green |
| `packages/core/test/work-update.suite.mjs` (tasks 00, 01 through `aof work update`) | 52 | green |
| `packages/core/test/bundle.suite.mjs` (the loader the new member kind passes through) | 36 | green |
| `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` (FF-19205) | 6 | green |
| `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` (FF-19206) | 5 | green |
| `test/arch/practices/acd-render-reads-project-config-only.test.mjs` (FF-19207) | 5 | green |
| `test/arch/testing/acd-source-directory-budget.test.mjs` | 10 | green |
| `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` (FF-19208, 192/02's) | 45 | 1 red: `F-01`, unchanged |
| `packages/core/test/practice-render-lane.suite.mjs` (192/03's) | 39 | 1 red: `F-02` below |

verifies → `stories/01_story_a-practice-ships-a-variant-of-a-template/tasks/00`–`02`. Every
`192/01`-named case is green, among them E1–E5, the four rows of "only the boolean true", the
drift-kept edit, the refused dry run, the reference page's five answers, its specimen, and its
length (148 lines, ceiling 150). The two reds are in sibling stories' suites, outside this story's
`files:`, and share one cause: no lane commit of 192 has touched `.aof/aof.lock.json`.

## Verification evidence — 192/02 (aof:verify, 2026-11-13)

**F-01 repaired first.** `aof work update --dry-run` still refused both Codex refine files
(`codex-output-conflict`). To prove the lock was stale and the copies were not wrong, a scratch
worktree at HEAD had those two files restored to `d86f2151`, the version the lock's hashes describe.
`aof work update` was then run there. It re-rendered both files byte-identical to HEAD, so its only
diff was the lock and the apply journal: four hashes changed, `generatedAt` changed, and
`work.practices` (`build-brief`, `discovery`) was added. Those two files were copied into this
checkout. `aof work update --dry-run` now plans no change.

The story's own suites and the milestone's four controls were then run isolated (`AOF_GLOBAL_HOME`
a fresh temp dir), each with `node scripts/test-shard.mjs <file>`. These are the suites under
`files:`/`reads:` and the ones that name `192/02`:

| suite | result |
|---|---|
| `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` (FF-19208; tasks 00, 01 "committed copies are what the bundle renders") | green |
| `test/examples/refine-discovery-beat.test.mjs` (task 03, the discovery prose suite) | green |
| `packages/specification-by-example/test/index.mjs` (tasks 01 "134, 135 and 136 still hold", 02, 03) | green |
| `packages/core/test/bundle.suite.mjs`, `bundle-compose.suite.mjs`, `bundle-runtime-variants.suite.mjs`, `hyperagent-runtime.suite.mjs` | green |
| `test/arch/examples/acd-sbe-package-one-way.test.mjs`, `test/arch/command/acd-learning-package-one-way.test.mjs` (task 03, one-way dependency) | green |
| `test/arch/command/acd-prompt-bounds-name-their-home.test.mjs`, `acd-cli-entry-executes.test.mjs` | green |
| `test/arch/bundle/acd-bundle-manifest-hashes.test.mjs`, `test/bundle/bundle-asset-manifest-complete.test.mjs` (task 02, assets ride the payload) | green |
| `test/arch/testing/acd-source-directory-budget.test.mjs` | green |
| FF-19205, FF-19206, FF-19207 | green |
| `packages/core/test/practice-render-lane.suite.mjs` (192/03's, the `F-02` case) | green |
| `test/arch/planning/acd-plan-restates-no-declared-path.test.mjs` (task 03, the restatement ban), `test/work/story-plan-document.test.mjs` | red: `F-03`, then green after its fix (6/6, 17/17) |

The `@manual` E4/E5 comparison above was re-run at HEAD, after 192/01 and 192/03 merged home. The
same thirteen files were compared with `d86f2151`, whitespace collapsed. The result was unchanged:
the three refine copies differ only at the Contract seam, the Codex `SKILL.md` only at the
`;`→`. Retain` seam, and the nine briefs are identical.

verifies → `stories/02_story_the-gated-prose-leaves-core/tasks/00`–`03`.

## Verification evidence — 192/03 (aof:verify, 2026-11-13)

The story carries `@executable` scenarios only (no `@manual`, no `@uat`), so no human was asked.
It declares no control of its own. Its suites, the suites it amends, and the milestone's four
controls were run isolated (`AOF_GLOBAL_HOME` a fresh temp dir), each with
`node scripts/test-shard.mjs <file>`:

| suite | cases | result |
|---|---|---|
| `packages/core/test/practice-render-lane.suite.mjs` (tasks 00–02; among them `F-02`'s case) | 39 | green |
| `packages/core/test/work-update.suite.mjs` (task 00, the list in the update's result) | 52 | green |
| `packages/core/test/work-init.suite.mjs` (init records, and prints no list) | 25 | green |
| `test/examples/doctor-examples-lane.test.mjs`, `test/work/doctor-diagrams-lane.test.mjs` (the lane-order pins the new lane moved) | 36, 12 | green |
| `test/arch/audit/acd-controls-never-execute.test.mjs` (FF-5905's lane order) | 16 | green |
| `test/arch/bundle/acd-install-manifest-contract.test.mjs` (the manifest's new record) | 4 | green |
| `test/arch/command/acd-cli-entry-executes.test.mjs`, `test/arch/testing/acd-source-directory-budget.test.mjs` | 10, 10 | green |
| FF-19205, FF-19206, FF-19207, FF-19208 | 6, 5, 5, 45 | green |

The story's product was then read as the operator reads it, in a terminal, with this checkout's
own `aof` (npm-linked to the tree):

- **This checkout.** `aof work update --dry-run` ends with the list, after the summary and before
  the one warning: `on build-brief … work.plan.enabled` and `on discovery … work.examples.enabled`,
  under "Optional practices (set every key to true in .aof/aof.config.json, then run
  `aof work update`)". `aof work doctor --json` holds no `practice-render-*` finding. (E1, and
  task 02's "this checkout has a record")
- **A scratch project** (`git init`, `aof work init`, machine-wide config isolated). The doctor
  was clean from the start. Setting `work.examples.enabled: true` gave
  `error: practice-render-stale — practice "discovery" is on (work.examples.enabled is true in
  .aof/aof.config.json), but the commands were rendered without it: the refine command and the
  aof-product-owner, aof-architect and aof-qa briefs lack its prose. Run `aof work update`.`
  The update then listed `on discovery` and `off build-brief`, and the doctor was clean again.
  Setting the key back to `false` gave the matching `warn: practice-render-stale … is off … but
  the commands still hold its prose`. Removing `work.practices` from the lock gave one
  `warn: practice-render-unrecorded … Run `aof work update`.` `aof work update --dry-run --json`
  carries `practices: [{id, title, summary, keys, on}]`, one per practice, in declared order.
  (E2–E7)
- **The scratch doctor exited 1 in each step, the clean ones included.** That comes from
  `empty-stream` (a fresh project has no work item), not from a practice finding.
- The rows are 133 and 137 columns wide, so each key wraps in a 120-column terminal: `F-04`.

`aof work validate 192/03` passes. `aof work doctor 192/03` reports no `control-unresolved` at
either severity. Its only line for the story is `rubric-join-unchecked`, a warning that
does not come from this story.

verifies → `stories/03_story_a-project-sees-its-practices-and-hears-of-a-stale-render/tasks/00`–`02`.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `192/02 01 this checkout's committed copies are what the bundle renders` (FF-19208's suite) is red: `aof work update --dry-run` plans `conflict` for `.agents/skills/aof-refine/SKILL.md` and `procedure.md`. The committed `.aof/aof.lock.json` still holds their 2026-11-10 hashes, while 192/02's lane commit (`7875e122`) changed both files. The lane's update re-stamped the lock, and the lock never reached the branch. Same cause and evidence as `m127/F-13` (the loop's lane reconcile resets `.aof/` before committing, so lane lock writes are dropped), cited as the prior occurrence. | defect | medium | non-blocker for `192/00`: not in its write set, and its own suites and controls are green. **Blocker for `192/02`'s accept and the milestone's regression gate**: re-stamp the lock so the committed copies are owned again, then re-run FF-19208. The loop's reconcile gap is still `m127/F-13`'s. | `192/02` (verify); loop lane reconcile (`m127/F-13`) | fixed at 192/02's verify: the lock was re-stamped by a real `aof work update` (see 192/02's evidence), and the case is green. The reconcile gap stays `m127/F-13`'s |
| F-02 | `192/03 task 02 · this checkout has a record and nothing to report` (`practice-render-lane.suite.mjs`) is red: "this checkout's lock records its practices". The committed `.aof/aof.lock.json` carries no `work.practices`, and `aof work doctor` warns `practice-render-unrecorded`. No 192 lane commit touched the lock, so the practices record 192/03's update writes never reached the branch. Same cause and evidence as `F-01` and `m127/F-13`, cited as the prior occurrence. It is a distinct incident because it reaches a different case, of a different story. | defect | medium | non-blocker for `192/01`: not in its write set, and its own suites are green. **Blocker for `192/03`'s accept and the milestone's regression gate**: one re-stamp of the lock (`aof work update` on the branch, committed) answers both this and `F-01`. Then re-run both cases. | `192/03` (verify), with `F-01`; loop lane reconcile (`m127/F-13`) | fixed, confirmed at 192/03's verify: the lock records `work.practices` (`build-brief`, `discovery`), `practice-render-lane.suite.mjs` is 39/39 green, and the doctor holds no `practice-render-*` finding. The re-stamped lock is in the working tree and not yet committed. It must be committed before `aof work regression-gate 192`, which refuses a dirty checkout |
| F-03 | FF-9603 (2) and `96/02-00` were red: three of 193's PLAN.md files restated a path their story declares, each as the opening path of a "Known traps" bullet. They were 193/00 @49 (`test/examples/refine-discovery-beat.test.mjs`), 193/01 @42 (`test/examples/doctor-examples-lane.test.mjs`) and 193/03 @53 (`test/fixtures/application/command-inventory.json`). The case was already red at `d86f2151`, before 192/02. The files came from `ad19ec78`, the 192↔193 swap. This is the same class as `m172/F-172-07`, `m144/F-02`, `m130/F-22` and `m124/F-04`, cited as prior occurrences. It is a distinct incident, with different documents. | defect | low | non-blocker for `192/02`: outside its write set, and pre-existing. It would have reddened 192's regression gate, so it was fixed at verify by m172's precedent: each bullet names the file by role ("the discovery-beat example suite", "the doctor examples-lane suite", "the command-inventory fixture"). Both cases are green. | 193/00, 193/01, 193/03 (PLAN.md) | fixed |
| F-04 | `aof work update`'s practice list is wider than a 120-column terminal. With this checkout's two practices the rows are 133 and 137 columns, and ADR-007 §2 puts the summary before the key, so the key is what wraps. It is the part the operator copies into the config. The review at build saw this and recorded it as a Nit. A recall over the stream's findings returned only web-UI width findings (`m127/F-32`, `m175/F-13`, `m27/F-2702`, `m47/F-47-V-6`) and `m55/F-55-M-8`. None has this cause, so this is a distinct incident. | defect | low | non-blocker: every word is printed and the JSON is unaffected. Each row still reads correctly once wrapped. Defer. The fix is to shorten the two summaries in the practices' `bundle.json`, or to amend ADR-007 §2 so the key comes before the summary (or the summary is cut to fit the terminal). | backlog (ADR-007 §2 owner): `backlog/chore_practice-list-fits-the-terminal` | open (deferred) |

## Accept decision

- **192/00 — accepted 2026-11-13.** Its `@executable` suites and the three controls it lands
  (FF-19205, FF-19206, FF-19207) are green, and each control has a recorded red probe (table
  above). There are no `@manual` or `@uat` scenarios. `aof work doctor 192/00` reports no
  `control-unresolved` at either severity. The one red found during the run (`F-01`) belongs to
  192/02 and is routed there. At this accept, the register's FF-19205–19207 rows lost their stale
  "pending" wording, as the story's notes asked.
- **192/01 — accepted 2026-11-13.** Its `@executable` suites are green (evidence above), and so
  are FF-19205, FF-19206 and FF-19207. There are no `@manual` or `@uat` scenarios and no UI.
  `aof work validate 192/01` passes. `aof work doctor 192/01` reports no `control-unresolved` at
  either severity, because the story declares no control. The two reds seen during the run are
  `F-01` (192/02) and `F-02` (192/03). They share one cause, the unstamped lock, and neither is in
  this story's write set, so neither blocks it. Both stay open for their owners and the
  milestone's regression gate. No retrospective doc was written: the story's notes (impacted
  widening to the full suite, a one-off FF-7706 load timeout, pre-existing reds outside the diff)
  repeat lessons already on record, and add none of their own.

- **192/02 — accepted 2026-11-13.** First its blocker, `F-01`, was fixed: the lock was re-stamped
  by a real render, and the lane's committed copies were proven to be what the bundle renders.
  After that, its `@executable` suites are green, and so are FF-19205–19208 (evidence above). The
  `@manual` E4/E5 comparison holds at HEAD. FF-19208, the control it lands, has a recorded red
  probe, and its register row in `ARCHITECTURE.md` carries no `pending` marker. There are no
  `@uat` scenarios and no UI. `aof work validate 192/02` passes, and `aof work doctor 192/02`
  reports no `control-unresolved` at either severity. `F-03` (pre-existing, 193's PLAN.md files) was
  fixed at verify. `F-02` is fixed by the same re-stamp and is left for 192/03's verify to confirm.
  `RETROSPECTIVE.md` and `OUTCOME.md` were written beside `STORY.md`.
- **192/03 — accepted 2026-11-13.** Its blocker, `F-02`, is confirmed fixed by `F-01`'s re-stamp.
  After that, its `@executable` suites are green, and so are FF-19205–19208 (evidence above). The
  list and the doctor's three findings were read in a terminal, on this checkout and on a scratch
  project, and each says what changed and what to run. There are no `@manual` or `@uat` scenarios
  and no UI. The story declares no control. `aof work validate 192/03` passes, and
  `aof work doctor 192/03` reports no `control-unresolved` at either severity. `F-04` (the list
  wraps at 120 columns) is a non-blocker and is deferred to the backlog. `RETROSPECTIVE.md` and
  `OUTCOME.md` were written beside `STORY.md`. Every story of 192 is now accepted. Before the
  milestone can be accepted, the re-stamped `.aof/aof.lock.json` must be committed and
  `aof work regression-gate 192` must run.
