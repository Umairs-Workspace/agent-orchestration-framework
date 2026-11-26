---
doc: architecture
---
# 210 · Bounded test runs

## Memory recall: what was surfaced, and what it changed

The architect's recall (`6d70c8aa-8311-4f87-b19b-eb5af66bb12a`, area architecture) surfaced
m72/R7: two correctly decided halves, a widening rule and a silent whole-suite run, composed into an
unpriced whole on the commonest input. It is **honoured**. Every ADR below states the cost of its
rule on the commonest input: a story's uncommitted diff in a checkout whose suites mostly import the
application assembly. That pricing is why ADR-003 never walks source-to-source imports. It also
surfaced m160/ADR-003 (a selection launches the light entry). That is **honoured**: every bounded
form below launches `work.test.selectProgramArgs`. m71/ADR-007 (re-work is bounded) is honoured by
ADR-005. m160/ADR-012 and m160/ADR-014 are **irrelevant**: they concern the sharded whole-tree
runner, which 210 leaves alone.

The product owner's recall (`e26c7409-9c13-4117-a048-72f530610f79`) surfaced m191/R4: a fix checked
by the suites that import the changed file missed a suite that reads the file's text. It is
**honoured** in ADR-003, where a suite that names a changed path is selected beside its importers.
m69/R2 (a lane chosen by what a change is filed under cannot see what it touches) is **honoured** in
the same ADR: selection follows imports and path mentions, never item filing. m160/02 R1
(`--scope impacted --story` launched the whole tree) is the failure ADR-007 makes impossible.
m190's capability record ("narrowing is positive") is **departed from**. Narrowing is no longer
the tool's to prove; the agent chooses and states why (ADR-001).

## ADR-001 · The project's own words choose the suites

**Supersedes m72/ADR-002** ("no selection by judgement, no flag") and the door command in
m190/ADR-006 §1. Neither is amended; both stop applying when 210 lands.

The project names a plain-words testing instructions file in `work.test.instructions`, a path
relative to the project root (this repo: `wiki/TESTING.md`). The key is compiled by
`packages/work/src/testing/toolchain.mjs` with the other `work.test.*` keys. A declared path that
does not exist is a toolchain refusal, `test-instructions-missing`. An absent key is not a refusal.
`aof test` still runs without it.

Every skill that tests reads the file at its test step, before it chooses suites. The skills are
continue (the build terminator and every review lane), review, verify, manual, teach and repair, in
the Claude Code bundle sources and the Codex variant. The skill wording becomes:

- read the instructions;
- choose the suites;
- state why in `--reason`;
- after a fix, check what the fix changed with `aof test --failed`;
- leave the whole tree to the gate.

"Never name suite files" and "`--scope file` wearing prose" are removed from every source.

**The structural review lane checks the choice (210/00 Q1, operator, 2026-11-26).** It reads the
story's recorded runs (their files and reasons) beside the story's changed files and `aof test
--suggest`'s answer for them. It raises a finding for each suite that imports or names a changed
file and is in no recorded run of the story, unless a recorded reason names that suite as
deliberately left out. The lane judges and records a finding. No door branches on a record
(FF-19002 stands).

**The adoption path.** The project doctor's test family gains `test-instructions`. It warns when
the key is absent and names `/aof:map-tests` as the repair. `aof work update` prints the same line,
through the same `testLayoutChecks` call it already makes. `/aof:map-tests` is rewritten to draft
the instructions file from the repository. It reads the test roots, the runner scripts, the native
`node:test` packages and the machine hazards the record holds. It writes the file, sets the key and
asks the operator to edit the draft. It no longer authors couplings, and no longer replays commits.

This repo authors `wiki/TESTING.md`. It covers:

- area-to-suite mapping;
- the record-only and docs-only changes that need no run;
- the native `node:test` packages and how to run them;
- the `:4182` hazard while the live control daemon runs;
- the slow `recall-replay` lane;
- that the whole tree is the gate's.

## ADR-002 · A named run states its reason, and the record carries it

`aof test` has four forms, and `--scope` is gone:

| Form | Runs | Recorded as |
|---|---|---|
| `aof test <suite>… --reason "<why>"` | exactly the named suites | `mode: "named"` |
| `aof test --suggest` | nothing; it lists suites (ADR-003) | not recorded |
| `aof test --failed` | a fix round (ADR-004) | `mode: "failed"` |
| `aof test --all` | the whole tree, outside story work (ADR-007) | `mode: "all"` |

`--fresh`, `--verbose` and `--json` keep their meaning. A named run without `--reason`, or with a
blank one, is refused as `test-reason-missing`. Naming a file that is not a suite under the declared
predicate is refused as `test-not-a-suite`, and the refusal names the file. Two forms at once are
refused as `test-form-conflict`.

**The record gains five fields:**

- `reason`: verbatim, or null for `--all`;
- `mode`;
- `worktree`: the absolute git dir, because records are shared by every worktree of one clone, and
  "the last red run here" must mean this worktree;
- `parent` and `round`: ADR-004;
- per failure, `file`: the suite that held it.

The existing `case` and `message` fields stay. Focused runs attribute a failure from the light
entry's `# file <path>` lines, which `normaliseTap` in `packages/work/src/grade.mjs` learns to
carry. Gate runs attribute it from the sharded report's `failures[].unit`. A failure whose file
cannot be attributed carries `file: null`.

**A covering red answers a subset.** m190/ADR-002 made a red answer only the identical question,
because a case name did not reliably name its file. With `file` on every failure, a red answers a
subset question when every failure it holds is attributed. The answer is the failures whose file
was asked about, and the result is green when none are. A red with any `file: null` failure still
answers only the identical question. The concurrent review lanes share one run on this rule.

FF-19001 (one writer) and FF-19002 (no transition reads a record) stand unchanged. The reason is
evidence for a reader. No door branches on it.

## ADR-003 · The suggestion is a fresh scan, never a graph

`packages/work/src/testing/importers.mjs` is the one scan. Given a set of changed files, it reads
every suite under the declared predicate, and every non-suite module under the test roots (a
*helper*), on every call. It caches nothing between calls and reads no code graph. It selects a
suite when any of these holds:

1. the suite **imports** a changed file. A relative specifier resolves against the importer. A
   workspace specifier (`@aof/work/testing/record`) resolves through the workspace export map,
   which the census already builds (`workspaceExportMap`);
2. the suite imports a **helper** that imports a changed file, transitively through helpers only;
3. the suite **names** a changed file's project-relative path in its text (m191/R4).

The scan never walks source-to-source imports. On this repo most suites import
`packages/core/src/application/assemble.mjs`, which reaches nearly every module. A source walk
would select the whole tree for almost any change, which is the failure this milestone removes
(STATE, the measurement). Reaching a suite through the application assembly is what the
instructions file is for. The scan reports each selected suite with each changed file that
selected it and how (`imports`, `via <helper>`, `names`). It also reports, by count and by name,
every specifier it could not resolve. A changed file that reaches no suite is listed as reaching
none, which is an answer, not a widening.

**The changed set.** `--suggest` uses the working tree against HEAD, untracked files included
(`packages/work/src/testing/changed.mjs`, trimmed to that one producer). `--failed` uses the
difference between the red record's content key and the working tree's (ADR-004). Both keys are git
tree ids, so `git diff --name-only <tree> <tree>` answers it.

**Price on the commonest input.** About 3,300 files are read and matched with regular
expressions, with no parse. A suite that builds a path at runtime from fragments is not seen as
naming it. The instructions file owns that gap, and a reviewer can raise it as a finding.

## ADR-004 · A fix round is the failures plus the fix's reach

`aof test --failed` takes as its **root** the newest red record for this worktree and environment.
That record can be named, failed, all or gate. A fix round runs:

- every suite holding one of the root chain's newest failures (by `file`), and
- every suite ADR-003 selects for the files changed between that record's content and the working
  tree.

It reruns **suites, not cases**. A case position shifts when a suite is edited, and a suite is
the light entry's unit. A failure with `file: null` makes the round refuse as
`test-failed-unattributed` and names a named run as the way on. With no red record for this
worktree, the refusal is `test-failed-no-red`.

A round's record has `parent` set to the record it follows and `round` set to the parent's plus
one. A named or `--all` red starts a new chain at round 0. Every red summary, from either face,
ends with the exact line `aof test --failed`.

## ADR-005 · A fix loop that stops converging stops itself

The record follows the **failure set** across a chain: the failing `(file, case)` pairs, minus
those ADR-006 labels pre-existing. Two rules stop it, checked after every round:

- **No progress.** A round whose set is no smaller than its parent's is a no-progress round. A
  round that shrinks the set clears the count. Reaching `work.loop.buildNoProgressRounds`
  consecutive no-progress rounds stops the chain. That is the build terminator's existing bound,
  default 2, from its one home in `packages/contracts/src/loop-bounds.mjs`. With the default, a
  chain stops at its third run if neither fix round has shrunk anything. That is the SPEC's "about
  three rounds", and it adds no second bound.
- **A new suite fails.** A round in which a suite fails that failed in no earlier record of the
  chain stops it at once, unless that suite's failures are all pre-existing.

A stopped chain is latched on its newest record (`stopped: { rule, at }`). A further `--failed`
on that chain is refused as `test-fix-stopped`. The refusal is the hand-over. It names:

- the rule that fired;
- the failure set round by round;
- the suites that newly failed;
- the two hand-overs the skills take: a blocker in the item's `STATE.md`, or in a driven session
  the loop's question to the operator.

**A named run starts afresh (210/05 Q1, operator, 2026-11-26).** A stopped chain is never re-opened.
`--failed` stays refused on it. A named run, with its stated reason on record, is not refused, and
a red named run roots a new chain at round 0. The latch stops the automatic loop and forces a stated
reason before any further run, while a person can still look at the tree.

### Diagram

A fix-round chain has moving parts that prose flattens: a root red, the rounds that follow it,
each round's selection (the failures' suites plus the fix's reach), the baseline check that removes
pre-existing reds from the set, and the two stop rules that latch the chain. The view is a sequence
from the agent's side. The components are the agent, `aof test --failed`, the record store, the
importer scan and the baseline worktree. Show two flows: a converging chain that reaches green, and
a chain that latches on no progress and hands over.

## ADR-006 · Pre-existing is measured on the work's base, in a tree of its own

A failing case is **pre-existing** when the same suite fails the same case on the work's
**base** commit. The base is the newest commit that added the working item's record doc. For a
story that is its `STORY.md`. For a milestone's gate reds it is its `SPEC.md`. Both are written at
refine or framing, before any of the item's code. The working item is the story whose run is open
(ADR-007's detection), or the milestone named by a gate record. With no such item, the base is HEAD
when the working tree is dirty. Otherwise nothing is labelled, and the run says `baseline
unmeasured`.

HEAD alone is wrong in two common states. After the story's own code is committed, HEAD contains
the change being judged. During the fix rounds that follow a gate, HEAD is the gated commit
itself. Both would label every red pre-existing.

The check runs in a detached worktree at the base under `<git common dir>/aof/baselines/<commit>`.
The project's `work.worktree.prepare` prepares it. The same `runTest` runs the failing suites
there, so its result is an ordinary record keyed to the base tree. FF-19001 holds, because the
baseline record is written by `record.mjs`. A later round asking about the same suites on the
same base is answered from that record (ADR-002). The newest two baseline worktrees are kept and
the rest pruned. If the worktree cannot be added or prepared, every failure is labelled
`unmeasured` and the reason is printed. Nothing is ever assumed pre-existing.

A pre-existing failure is shown apart in the summary. It is left out of ADR-005's set and is not
the story's to fix: the skills record it in `STATE.md` `## Feedback (for retro)` by case name. It
still makes the run red. A gate row with pre-existing reds is still red, and its detail names them
so an override has its evidence.

## ADR-007 · The whole tree belongs to the gate

**`aof test --all` refuses inside story work** as `test-all-in-story-work`, and points at
`--failed` and at a named run. Story work is:

- a session whose `AOF_RUN_ID` names a run on a story or task item, or
- with no such variable, any `running` run on a story or task item in this checkout's stream,
  read through the run store's existing `readRuns` and `isRunning`.

A UAT session's regression sweep, an operator at a shell with no open story run, and a CI job all
pass. **There is no override (210/04 Q1, operator, 2026-11-26).** No flag, environment variable or
config key lets `--all` run inside story work.

**The regression gate launches the whole tree at most twice per milestone:** the gate, and one
confirming run after its reds are fixed. `packages/work/src/commands/regression-gate.mjs` counts
the milestone's `REGRESSION.md` rows that record a launched run. An `override` row does not count.
A `--resume` completes the not-finished row it resumes, so it does not count either. A third launch
is refused as `regression-gate-runs-spent`. The refusal names both rows' results and the hand-over:
a blocker in `STATE.md`, or the loop's question to the operator. New reds from the confirming run
go back to `--failed` rounds.

**A third run needs the operator's recorded confirmation (210/03 Q1, operator, 2026-11-26).**

- `aof work regression-gate <ref> --again "<reason>"` overrides the refusal for one more launch.
  It is honoured only when the operator's answer confirming that launch is on record.
- The record is a harness-recorded answer, the same evidence the example maps rely on, read
  through the one answer reader in `packages/specification-by-example/src/answers.mjs` (FF-13401).
  The question opens with the token `<milestone ref> G<n>`, where `n` is the number of the launch
  being confirmed, starting at 3. The answer must be the affirmative option, `Run gate <n>`.
- The token grammar in `packages/specification-by-example/src/map.mjs` gains the `G` kind beside
  `E` and `Q`. Answers are collected over the milestone's own runs, so they come from an
  interactive session's transcript or a driven session's loop answer alike.
- Without a matching answer, `--again` is refused as `regression-gate-confirmation-missing`. The
  refusal prints the exact question to ask.
- An honoured `--again` row records the reason and the confirming token. Each further launch
  needs its own `G<n>`.

An agent cannot satisfy the confirmation by typing the flag, because the answer is the harness's
record, not the agent's.

The gate's own program, sharding and accept door are unchanged (SPEC, out of scope). Its record's
failures gain `file`, from the sharded report's units (ADR-002).

## ADR-008 · The old selection is removed, with no compatibility layer

Removed, with their controls and tests:

- the `impacted` scope, `--scope` itself, `--story`, `--since`, `--commit` and `--plan`;
- the selector in `packages/work/src/testing/select.mjs`: the four widening reasons, the five
  narrowing reasons, `wideningRuleProblems` and the registration report that polices them;
- the declared changed set in `packages/work/src/testing/declared.mjs`;
- `work.test.couplings`, and `via` with it;
- the doctor's `test-layout-couplings`, `test-layout-couplings-match`, `test-layout-workdir` and
  `test-layout-graph-fresh`.

The suite predicate (`roots`, `suiteSuffixes`, `exclude`, `isSuiteFile`, `isExcludedTest`) moves to
`packages/work/src/testing/suites.mjs`. `--all`, the gate, the named-run check and
`story-contract-derive.mjs` all need it. `test-layout-suites` stays, without its coupling clause:
a test-shaped file the predicate misses never runs, not even at the gate. `test-layout-resume`
stays.

A removed key is removed, not deprecated. A config that still carries `work.test.couplings` is
refused at compile time as `test-config-key-removed`, and the refusal names the key and says to
delete it. The doctor reports the same thing. This repo's `.aof/aof.config.json` drops its
couplings in the same story.

Controls retired with their subject:

- FF-19003, narrowing closed and positive, and its file
  `test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs`;
- FF-19006, the layout check has no predicate of its own. It is superseded by FF-21002, and
  `layout.mjs` keeps `isSuiteFile` as its only membership test.

FF-19005, every registered suite is selectable, stands, importing the predicate from `suites.mjs`.
The code graph keeps every other reader (SPEC, out of scope). `inheritCodeGraph` in
`packages/work-loop/src/dispatch.mjs` stays for `graph impact` in lanes, and only its comment
changes.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-21001 | **Testing reads no code graph.** No module under `packages/work/src/testing/`, nor `packages/work/src/commands/test.mjs`, imports the code-relations port or a graph reader, and the test command's core bindings are handed no `codeRelations` service. | `test/arch/testing/acd-test-selection-reads-no-graph.test.mjs` — pending (210/04) | ADR-003, ADR-008 |
| FF-21002 | **One import scan.** Only `packages/work/src/testing/importers.mjs` parses suite import specifiers or searches suite text for a path. `--suggest` and `--failed` reach it through one binding. | a rewritten leg in `test/arch/testing/acd-one-selector-one-changed-set.test.mjs` — pending (210/04) | ADR-003 |
| FF-21003 | **The whole tree has two doors.** Only the `--all` branch of `packages/work/src/commands/test.mjs`, after the story-work check, and `packages/work/src/commands/regression-gate.mjs` launch the runner with an empty selection. | a leg in `test/arch/testing/acd-test-command-reports-not-decides.test.mjs` — pending (210/04) | ADR-007 |

Register FF-21001 in `test/arch/testing/index.mjs` in place of the retired FF-19003 file, so
`test/arch/testing` stays at its count. Each control owes a red probe in `VERIFICATION.md` when it
lands:

- FF-21001: import the code-relations port into `importers.mjs`;
- FF-21002: add a specifier regex to `commands/test.mjs`;
- FF-21003: pass `[]` to the runner from the named branch.

## Story boundaries

The code graph built at 20:15:08 UTC on 26 November 2026 holds 23,042 nodes and 50,730 edges, with
no egress. `graph impact` places the subject as follows:

- `commands/test.mjs` has one dependent, its core binding
  (`packages/core/src/application/bindings/commands/test.mjs`).
- `testing/select.mjs` is read by its binding, the test command, `story-contract-derive.mjs` and
  `layout.mjs`.
- `testing/record.mjs` is read by the test binding and the gate's suite.
- `regression-gate.mjs` is reached only through its own binding.
- `layout.mjs` is reached only through `config-inspect.mjs`.

That coupling draws the cut:

- **00** owns the prose, the doctor family (`layout.mjs` behind `config-inspect.mjs`) and the
  instructions key. It touches no runner code.
- **01** is a new leaf with no dependents yet.
- **02** owns the record, and the TAP reader's per-file attribution.
- **03** owns the gate, which only its binding reaches, and the `G` token in the map grammar that
  its confirmed third launch reads.
- **04** recomposes the face and removes the selector. Every edge into `select.mjs` and
  `declared.mjs` ends in its write set. It runs after 00, 01 and 02, whose leaves it composes.
- **05** composes fix rounds and the baseline on 04's face.

`test/arch/testing/acd-source-directory-budget.test.mjs` holds the budgets for
`packages/work/src/testing` and `test/testing`. It is written by 01 (+1 leaf, +1 suite), 04
(−2 leaves +1, −1 suite) and 05 (+1 leaf). The three are in successive waves.
