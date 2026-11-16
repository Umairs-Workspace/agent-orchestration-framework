---
doc: architecture
---
# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — Architecture

Decided at refine, 2026-11-09, solo (the main session played the architect). Inputs: the SPEC, 72's
ADR-002 (the selection and its one-directional widening rule) and its FF-7201–FF-7204, 96/ADR-008
(the regression gate as a refusal at the accept door), 160 (the sharded runner, `not-finished`, the
PR CI run), and four measurements taken for this refine and recorded in `RESEARCH.md`.

## Memory recall: what was surfaced, and what it changed

- Architect (recall `5a9a33a4-eb11-49a2-933d-4b63a9a43764`): `aof memory recall "record test runs
  keyed to tree hash, doors read the record instead of re-running" --area architecture --block`
  returned five records. **m167/01 R1 (near-miss) is honoured**: "the stat digest alone would have
  served a new folder stale". A key built from tracked files or from stat data would answer a run
  over a tree that has gained an untracked file from the record of a tree that had not, so ADR-001
  §2 keys on content, untracked files included. m167/ADR-003 (single-flight read, remembered by
  digest) is honoured as the shape of ADR-002 §4. m20/ADR-004, m35/ADR-004 and m167/ADR-007 are
  irrelevant here.
- PO (recall `629285a0-9ce6-4ba8-b32a-84edeebe586a`): the item-scoped recall returned an empty block.

## ADR-001 — Every `aof test` run leaves one record, written by the command, keyed to the tree's content

### Decision

1. **One writer.** `aof test` writes a record for every run it launches, and nothing else writes one.
   No flag, input field or verb accepts a result from a caller: the evidence is produced by the
   party that ran the suite, never by the party being checked (96's rule, carried down to every
   run). FF-19001.
2. **The key is the tree's content, untracked files included.** The key is the tree id git computes
   for the working tree with every untracked, non-ignored file added, made in a throwaway index so
   the real index is untouched (`GIT_INDEX_FILE=<tmp> git add -A && git write-tree`). Measured on
   this repo with a dirty tree: 0.23 s. A file created this turn changes the key; a file
   `.gitignore` excludes does not. The work directory is **inside** the key: some suites read the
   live stream (`test/work/story-plan-document.test.mjs` reads `<repo>/wiki/work`), so a key that
   left records out would answer a changed outcome from an unchanged key. One module produces the
   key. FF-19004.
3. **The environment is part of the match, not the key.** A record names the platform, the
   architecture and node's major version. A record made on `win32` never answers a run on `darwin`.
4. **What a record holds:** its id, the key, the environment, the instant, the scope it ran as, the
   story ref when there was one, the selected files (or `all`), every widening with its reason, the
   `gate` flag exactly as the selection computed it, the result (`green`, `red` or
   `not-finished`), each failure's case name and message, the exit code, the wall time, and `fresh`
   when it was a deliberate repeat (ADR-002 §3).
5. **Where records live: `<git common dir>/aof/test-records/`.** They are outside the tree, so
   writing one never changes a key. Every worktree of one clone shares the git common dir, so a
   review lane in a dispatched worktree can be answered by a run its sibling made on the same
   content. A project that is not a git repository gets no key: the run happens exactly as today,
   and its summary says `not recorded: no git`.
6. **The store keeps the newest 200 records** and prunes the oldest when it writes. Records are
   evidence for the doors of one story or one milestone, not history: the history of a milestone's
   whole-tree runs stays in its `REGRESSION.md`.

### Alternatives considered

- **Key on `HEAD`.** Rejected: every build round is uncommitted, so the key would answer a dirty
  tree from a clean one.
- **Key on `git status` or on mtimes.** Rejected by m167/01 R1: a stat-shaped key serves a tree
  with a new file stale.
- **Leave `wiki/work` out of the key** so that writing `STATE.md` or `VERIFICATION.md` does not
  invalidate a record. Rejected for now: some suites read the live stream, and nothing yet says
  which. The cost is measured by the records themselves, and a later item can narrow the key with a
  census of the suites that read records.
- **Records in `.aof/`.** Rejected: `.aof/` is project state that ships and is partly tracked, and
  a dispatched worktree has its own copy.

## ADR-002 — A run already made on the same content is answered from its record

### Decision

1. **Before it launches, `aof test` looks for a record that already answers the question.** A record
   answers when its key and environment match, its result is not `not-finished`, and either:
   - it is **green**, and it ran `all` or a set of files that contains this run's selection; or
   - it is **red**, and it ran exactly this run's selection. A red result is never split by file:
     a case name does not reliably name its file, and a red answered as green for a subset is the
     confidently-wrong-once failure 72 exists to refuse.
2. **An answered run says so.** The result carries `reused: { id, instant }`, the summary line says
   `answered from the run of <instant> (tree <first 7 of the key>)`, the failures are the record's
   own, and the exit code is the record's. `--json` and the text are still projections of one
   result object (72/ADR-003).
3. **`--fresh` runs anyway**, and its record carries `fresh: true`. It exists to chase a suspected
   flake, and the doors' prose never asks for it (ADR-006).
4. **Single-flight.** When a run that would answer this one is already in flight on the same key,
   `aof test` waits for its record instead of launching a second runner. Three review lanes started
   together on one diff therefore make one run. The wait is bounded by the toolchain's own
   `deadlineMs`, and a lock whose owner process has gone, or that is older than that deadline, is
   reclaimed. Neither case is ever reported as a pass.
5. **The selection is still computed and still reported** on an answered run, and its `gate` flag
   is the selection's own. An answered run is never more of a verdict than the run it reuses.

### Diagram

Why: there are three parties and an ordering. Two concurrent callers, the lock, the runner and the
store, and which caller waits for whom, are what a builder gets wrong. View: a sequence across two
`aof test` callers, the record store's lock, the project's runner and the store. Flows: caller A
computes the key and finds no answering record, takes the lock, launches the runner, writes the
record and releases; caller B computes the same key, finds A's lock, waits, then reads A's record
and returns it as `reused`; a third caller after the release finds the record at once.

### Alternatives considered

- **Let every door decide whether to re-run.** Rejected: each door would need its own reading of the
  record, and the agent at the door is the party a recorded run exists to keep out of the evidence.
- **Reuse a red record for any subset.** Rejected in §1.

## ADR-003 — `impacted` narrows on what is positively known, and still widens on anything else

Supersedes 72/ADR-002 §2a for the two cases in §3, and widens §1a's path predicate (§1). The rule
72 set is unchanged: **coupling the graph knows narrows the run; coupling nothing knows widens it.**
What changes is how much is known.

The measurement this answers (`RESEARCH.md` Q1): replayed over the 76 stories that declare `files:`
in milestones 160–180, **every one** widens `aof test --scope impacted --story` to the whole suite.
Of those, 58 declare a file the story created, 38 a document or data file, and 65 a present file
with no suite under `test/` among its direct importers (41 of those are covered only by
package-owned suites). Had they narrowed, the median story would have selected 8 suites of 1,096
(75th percentile 14). That is a floor, because direct importers only.

### Decision

1. **Package-owned suites are suites.** The suite predicate becomes a declared suffix list,
   `work.test.suiteSuffixes` (default `[".test.mjs"]`), read by `toolchain.mjs`, the one reader of
   `work.test.*` (FF-7201). This repo declares `[".test.mjs", ".suite.mjs"]` and lists every
   `packages/<p>/test` and `apps/<a>/test` directory in `work.test.roots`. Every suite file the
   runner registers must be a suite by the declared predicate, or `impacted` could never select it.
   That becomes a second leg of FF-5903's census (FF-19005).
2. **Dependents are followed transitively.** The code corpus's `relations` verb gains a transitive
   form that walks import edges to a fixpoint. It is still one artifact read, with a visited set for
   cycles (179/ADR-002's one-walk rule). The selector takes every suite in the closure. Today it
   takes direct importers only: `item-status.mjs` imports `regression-record.mjs`, yet no suite of
   `item-status` is selected by a change to the record module. Widening hides that gap now, and it
   would surface the moment widening stops.
3. **A changed file absent from the graph narrows only when its place is known:**
   - **it is a suite by the predicate:** it selects itself (reason `suite-itself`). A new suite has
     no dependents, because a suite is a leaf;
   - **another file in the changed set imports it:** a static `import … from`, `export … from` or
     literal `import("…")` in a changed file that resolves to it. It then inherits that importer's
     selection (reason `imported-by-changed`). Only the changed files are scanned, so the scan
     costs milliseconds. An importer that is itself new is placed the same way, recursively;
   - **under `--story` only, a declared path that exists neither on disk nor in the graph**
     contributes nothing and is reported `not-yet-written`. It has no behaviour to test.

   Anything else absent from the graph still widens as `not-in-graph`.
4. **A file that is not code narrows only through a declared coupling.** `work.test.couplings` is
   a list of `{ paths, suites }` glob pairs. A changed file that matches a coupling's `paths`
   selects that coupling's `suites`, and an empty `suites` is the declaration that no suite reads
   those paths (reason `declared-coupling`). A changed non-code file that matches no coupling still
   widens as `not-in-graph`. This repo's couplings are declared from a measured reader census
   (story 01), each with its reason, and the summary line names every coupling it applied.
5. **The narrowing reasons are a closed set**, frozen beside 72's four widening reasons:
   `graph-dependent`, `suite-itself`, `imported-by-changed`, `declared-coupling` and
   `not-yet-written`. Every one names positive knowledge, and a fifth needs an ADR. FF-19003.
6. **72's guarantees stand unchanged:** no flag narrows, no widening is silent, and a widened run is
   the whole suite (FF-7202, FF-7203).

### Alternatives considered

- **Narrow a new source file on the strength of the graph's silence.** Rejected: silence is the
  unknown 72 refuses to read as "none affected". A dynamic import by computed string is exactly
  what a text scan cannot see, so §3 widens there.
- **A text-reference index from every suite to every path it names**, to place documents without a
  declaration. Rejected: a suite that walks a directory or a manifest names no path, so the index
  would be confidently wrong for exactly the bundle and asset suites that read documents most.
- **Rebuild the graph before selecting.** Rejected for the reason 72/ADR-002 §1 gives: 2:41 on this
  repo, measured at this refine.

## ADR-004 — No tier declaration: the end-to-end lanes already run only in whole-tree runs

### Decision

1. **This milestone declares no unit, integration or end-to-end tiers.** The SPEC proposed them.
   The measurement (`RESEARCH.md` Q3) says they would buy little once ADR-003 lands:
   - the integration feature lanes and the cargo lane run only through `scripts/test.mjs`'s whole
     run (`--lanes-only` in the sharded gate). An `impacted` run never selects them;
   - the browser smoke suites are `*.smoke.mjs`, which no predicate selects;
   - the remaining cost is spread across 1,096 suite files, mostly ones that spawn the CLI. It is
     not concentrated in a directory a tier could name. `test/arch` alone is 2,170 s of 17,515.
2. **So the end-to-end tier is "whole-tree runs".** A story pays for it only when its selection
   widens. After ADR-003, that leaves the milestone gate and an explicit `--scope all`.
3. **Revisit only if 190's verification shows narrowed story runs still slow.** If it does, the
   follow-up is a cost-based split derived from `.tmp/test-timings.json`, not a hand-kept
   directory list.

Pending the operator's confirmation at the end of this refine, because it narrows the SPEC. It stood when the
operator had 190 completed (2026-11-10). §3's revisit is open as VERIFICATION F-08.

## ADR-005 — A gate that did not finish resumes, and every gate run is also a test record

### Decision

1. **`aof work regression-gate <NN> --resume`** re-runs only what the newest `not-finished` row
   left: the units it killed and the units it never started, plus the lanes if they did not
   finish. It needs the clean tree's key to equal the key of the run it resumes. If the code has
   changed it refuses with `regression-gate-resume-tree-changed`, because half a run of one tree
   plus half a run of another is no run of either. It also refuses when the newest row is not
   `not-finished` (`regression-gate-nothing-to-resume`), and when the stored report of the run it
   would resume is gone (`regression-gate-resume-report-missing`): the store keeps the newest 200
   records, and a resume with no record of what finished would be a guess.
2. **The gate keeps what it needs to resume.** A gate run that ends `not-finished` stores its
   sharded report (each unit's result, and which units were killed or never started) in the
   record store beside its test record. `scripts/test-sharded.mjs` gains an input naming the files
   to plan, so a resumed run plans only those files and never re-splits a finished one.
3. **A resumed run appends one row** whose result is the union of the finished units' recorded
   results and the resumed units' new ones, and whose detail says
   `resumed from <instant>: <n> of <m> units re-run`. The accept door reads it like any other row.
   The SPEC already set this ("re-runs only its unfinished units"), so it is not a question for the
   operator.
4. **Every finished gate run also writes an ADR-001 test record**, scope `all`, through the same
   writer. A later `aof test --scope all` on that content and environment, such as a UAT session's
   regression sweep, is then answered from the gate's run. The gate itself always runs: it is the
   accept door's evidence, and it never answers itself from a record.
5. **The accept door is unchanged.** It still reads only the newest `REGRESSION.md` row
   (96/ADR-008).

### Alternatives considered

- **Let the gate answer itself from a green `--scope all` record.** Rejected: `aof test --scope all`
  runs `scripts/test.mjs` serially, without the sharded run's assignment census and alone-retry,
  and 96's door is the one place where the evidence's provenance is the point.

## ADR-006 — The doors keep calling `aof test`; the prose stops prescribing repeat runs

### Decision

1. **No door stops testing, and no door reads a record itself.** The build terminator, each review
   lane, `aof:review`, `aof:manual` and the story verify still run
   `aof test --scope impacted --story <ref>`. The command decides whether that is a run or an
   answer (ADR-002). What changes is what the prose says it costs, and what it no longer asks for:
   - **the review lanes:** the lanes start together on one diff, so the first runs and the rest are
     answered from its run;
   - **the story verify:** it runs the story's selection, not the whole tree; the "Scope the suite
     to the item" paragraph already says so;
   - **a UAT session:** one `aof test --scope all` for the whole session, not one per accepted
     milestone, answered from the newest gate run when nothing has changed since;
   - **a `not-finished` gate:** `--resume` is the repair, not a fresh run.
2. **`--fresh` appears in the prose only as the way to chase a suspected flake**, and the result
   must say that is what it was for.
3. **No transition reads a test record.** The status, doctor, loop, audit and bundle doors import
   nothing from the record store. 72/ADR-002 §4 and 09/ADR-004 hold: a record reports, and only the
   regression gate's `REGRESSION.md` row feeds a door. FF-19002 adds the store to FF-7204's census.
4. **The prose sources are the bundle's own** (`packages/core/assets/commands/`,
   `packages/core/assets/templates/uat/`, and the Codex variants in
   `packages/core/assets/variants/codex/workflow.md`). The `.claude/` renders follow through
   `aof work update`, never by hand.

## ADR-007 — Four stories, cut along the seams the graph and the write sets draw

`aof graph impact` on the subject modules (graph built 2026-11-09T23:01:03Z) puts the four seams
in four places with no shared importer between them. Only `test.mjs` itself, and the directory
budget census, are shared write targets.

| story | seam | ADRs |
|---|---|---|
| 00 · a repeat is answered from its record | `packages/work/src/commands/test.mjs` plus one new leaf in `packages/work/src/testing/` | 001, 002, 006 §3 |
| 01 · impacted narrows on what it knows | `packages/work/src/testing/select.mjs`, `toolchain.mjs`, `packages/knowledge/src/graphify-code-relations.mjs` | 003 |
| 02 · a gate that did not finish resumes | `packages/work/src/commands/regression-gate.mjs`, `scripts/test-sharded.mjs` | 005 |
| 03 · the doors' prose stops prescribing repeats | `packages/core/assets/commands/*.md`, the UAT templates and the Codex variants | 004, 006 §1, §2, §4 |
| 04 · an existing project declares its test layout (added at verify) | one new leaf `packages/work/src/testing/layout.mjs`, the project doctor's check list, `test.mjs`'s `--plan`/`--commit`, and the new `map-tests.md` command | 008 |

- **00 and 01 both write `test.mjs`.** 00 adds the record lookup around the launch, and 01 passes
  the new predicate and couplings to the selector. The wave planner serialises them on the shared
  path. There is no `depends:` edge between them, because neither needs the other's behaviour.
- **02 depends on 00**, because the gate writes through 00's record writer (ADR-005 §4).
- **03 depends on 00 and 02**, because its prose describes their behaviour, and prose ahead of the
  code would tell agents something false.
- **04 was added at verify** (ADR-008). It depends on 01 and 02, because the doctor reads their
  keys and the skill declares them. It shares `test.mjs` with 00 and 01 (the `--plan` flag), which
  the wave planner serialises.

## ADR-008 — An existing project is told what its test declaration leaves out, and one skill declares it

Added at verify (operator, 2026-11-10). ADR-003 §1, §4 and ADR-005 §1 each add a key that keeps
the old behaviour when it is absent. That is right for the code: a missing declaration never
narrows. But for a project already on aof, it means `aof work update` delivers 190 and nothing
changes, with nothing to say so. Before this milestone, this repo's own declaration
(`roots: ["test"]`, the default suffix) left 265 tracked package-owned suites outside the
predicate. `impacted` could never select one of them, and nothing reported it.

### Decision

1. **`aof project doctor` gains a `test-layout` check family**, beside `managed-tool` and
   `notion-auth` (12/ADR-003, 17/ADR-004). It belongs to the project doctor, not `aof work doctor`:
   it judges a config's fit to its tree, and 15/ADR-001 keeps the work doctor about the stream. The
   check is a pure function in `packages/work/src/testing/layout.mjs`. It takes the compiled
   toolchain and gate from `toolchain.mjs` (the one reader of `work.test.*`, FF-7201), the tracked
   file list (`git ls-files`, read at the doctor's edge) and the work dir. It reads no test record
   and no graph, and it never runs a test. Each finding is `ok` or `warning`, never `error`, and each
   warning names its repair, `/aof:map-tests`:
   - **`test-layout-suites`**: tracked files that look like tests (a frozen, language-neutral name
     set: `.test.`, `.spec.`, `.suite.`, `_test.`, `test_*.py`, or anything under `__tests__/`)
     but are not suites under the declared roots and suffixes. Membership is decided only by
     `isSuiteFile` (FF-19006). Files under the work dir are exempt, because 66/ADR-004 already
     prohibits test-shaped files there. So is any file a coupling's `paths` matches, because the
     declaration has accounted for it. The warning gives the count and up to five directories,
     largest first.
   - **`test-layout-couplings`**: `work.test.couplings` is absent. Declaring it as `[]` is the
     considered answer that no document is read by a suite, and it makes the check `ok`. Absent
     means nobody has asked the question, and every changed document then widens the run.
   - **`test-layout-resume`**: `work.test.gate` is declared without `reportArgs` or `filesArgs`, so
     a `not-finished` gate can only re-run the whole tree. A project with no gate gets no check:
     its gate is serial, and a serial gate has nothing to resume.
   - With `work.test` undeclared or malformed, the family emits nothing. `aof test` already refuses
     loudly there, naming the key.
2. **`aof test --plan` selects without running.** It prints the selection (selected suites, every
   narrowing and widening reason) and stops. It launches nothing, writes no record, and is answered
   from none, so FF-19001 holds unchanged. It takes a new changed-set source, **`--commit <rev>`**:
   exactly the files that commit changed against its first parent. It is the one source a replay of
   history needs, and like `--story` and `--since` it is exclusive of the other sources. `--commit`
   without `--plan` is refused: a run is of the working tree, and running a past commit's selection
   on today's tree would name a run that never happened. The replay uses the current graph, so a
   file deleted since that commit widens as `not-in-graph`, honestly.
3. **`/aof:map-tests` declares the layout and proves it.** It is a bundle command
   (`packages/core/assets/commands/map-tests.md`). In order, it:
   - replays the last 30 non-merge commits that touch a file outside the work dir through
     `aof test --scope impacted --commit <sha> --plan --json` (the before);
   - reads the project's runner and layout;
   - authors `work.test.roots` and `suiteSuffixes`;
   - authors `couplings` from a reader census, each with its `why`, or `[]` when no suite reads a
     document;
   - authors the gate's resume templates **only when the gate program honours the resume
     contract**: it takes a newline-separated file list at `{files}`, and writes the JSON report
     `{ units: { <unit>: [files] }, lanes, notFinished, notStarted }` at `{report}`. Otherwise it
     says resume is unavailable for this runner, names that contract as the way to change the
     answer, and leaves the gate as it is;
   - replays again (the after), reports both, and runs `aof project doctor`.
   It writes `.aof/aof.config.json` `work.test.*` and nothing else. It edits no test, no runner
   config and no source. With no flag it writes, then shows the diff and both replays (operator,
   2026-11-10, 190/04 Q2). **`--dry-run`** stops after the before replay and the proposed change,
   and leaves the config byte-identical.
4. **The report is the replay, never a promise.** The skill prints, before and after, how many
   commits widened, the median and 75th-percentile number of suites selected among those that
   narrowed, and the total. It names every reason that still widens. It does not estimate time
   saved. 190/01's review found that a composition root reached by nearly every suite makes a
   narrowed selection near-total. When that is so, the replay shows it, and the skill says so in
   one line.
5. **`aof work update` prints the same warnings** (operator, 2026-11-10, 190/04 Q1). A check that
   shows up only in `aof project doctor` is one the operator has to remember to run, and that is how
   the gap stayed hidden. After its `Updated ACD:` line, `work:update` prints one line per
   `test-layout-*` warning, each naming `/aof:map-tests`, and prints nothing when the family is all
   `ok`. This follows the memory-config lines it already prints. It runs the same function as §1,
   so the two cannot disagree, and it prints under `--dry-run` too, because the check only reads.

### Amendment — one answer to "what is a suite" (aof:verify 190, F-05, F-06, F-07; 2026-11-10)

Verify found the doctor and the selector giving different answers to "what is a suite". The
selector's whole suite came from `walkSuiteFiles`, which collected `.test.mjs` and `.suite.mjs`
whatever the declaration said. A `.test.ts` project was told `ok` and then selected `0/0` (F-06).
The doctor had no way to accept a test-shaped file the runner does not run. Its only repair,
declaring the file a suite, makes it selectable, and the runner then rejects it (F-05). So:

6. **The whole suite honours the declared suffixes.** `walkSuiteFiles(repoRoot, root, suffixes)`
   collects files ending in a declared suffix. It still takes only `.suite.mjs` from a workspace
   `test/` directory that registers array suites (its `index.mjs`), because that is how this
   repo's runner runs them. With `suiteSuffixes` absent, the walk keeps its pre-190 pair, so an
   undeclared project's whole suite does not change.
7. **`work.test.exclude` declares the test-shaped files the runner does not run.** It is an array
   of `{ paths, why }`, where `paths` is non-empty globs and `why` is the stated reason, the same
   shape and reasoning as a coupling. A file it matches is never a suite. `isExcludedTest` in
   `select.mjs` decides that, and `isSuiteFile` calls it, so membership stays one decision
   (FF-19006). The selector's whole suite drops excluded files. The suites check does not count
   them, because the declaration has accounted for them. Its warning now names both repairs:
   declare the files as suites, or exclude them with a reason.
8. **A declaration that selects no tracked file is a warning.** When the tracked list holds no
   suite under the declared roots, suffixes and exclusions, `test-layout-suites` warns that the
   whole suite is empty and `impacted` selects nothing, even when no test-shaped file is left
   over. An empty whole suite is never `ok`.
9. **`/aof:map-tests` authors the whole resume contract.** It declares `noLanesArgs` beside
   `reportArgs` and `filesArgs` when the gate program takes a flag that skips its lanes (F-07).
   It authors `exclude`, with a reason, for test-shaped files the runner does not run.

### Amendment — the work dir and the graph's freshness join the family (operator, 2026-11-11)

The consumer-monorepo map-tests run (ADR-009) found two more ways a project keeps widening with
nothing saying why. Two checks join the family, through the same one function, so the update and
the project doctor still cannot disagree:

- **`test-layout-workdir`**: asked once couplings are declared (until then `test-layout-couplings`
  already says every document widens). It warns when no coupling's paths cover a record under
  `work.dir`, since every `aof:continue` edits STATE, SPEC and feature files there.
- **`test-layout-graph-fresh`**: warns when there is no code graph, or when HEAD's commit time is
  later than the graph's `builtAt`, so every file added since widens as `not-in-graph`. Its repair
  is `aof graph build . --offline`. The binding hands in `builtAt` (the artifact's mtime, the one
  derivation) and HEAD's commit time; `layout.mjs` still reads no graph and no file (FF-19006), and
  the check is omitted when there is no HEAD to compare.

### Alternatives considered

- **Have the doctor ask the runner's own registry what it runs (F-05).** Rejected: that is a
  second membership predicate in the layout module, which FF-19006 forbids, and a registry is
  runner-specific. The declaration is the project's own answer, and an exclusion that states its
  reason can be read and challenged.
- **Put the check in `aof work doctor`, as first proposed to the operator.** Rejected: the work
  doctor reports the stream's health (15/ADR-001), and FF-19002 keeps it away from test records.
  The project doctor is where m12 and m17 put config-fit checks, and its findings already carry a
  repair line.
- **Find recent widenings from the test records.** Rejected: FF-19002, and a record shows only the
  runs that happened. The skill's replay asks every recent commit.
- **Have `aof work update` write the keys.** Rejected: suffixes can be inferred, but couplings are
  judgement (ADR-003 §4), and a generated coupling would narrow on a guess.
- **Template the resume flags for any runner.** Rejected: a template the program ignores would make
  `--resume` run the whole tree under a resume's name, which ADR-005 §1 refuses.

## ADR-009 — A coupling that names readers reaches code, and `via` names a helper

Amends ADR-003 §4 (operator, 2026-11-11). A map-tests run on a consumer monorepo (a Next.js app and
two TypeScript packages, 75 Vitest suites) found two failures that §4's "a code file is placed by the
graph or by a changed importer, never by a coupling" causes:

- **Wrong narrowing.** Guard suites read source from disk rather than importing it: a fitness test
  scans `packages/application/src/**` for framework imports, authorization tests read every route
  page, and two suites spawn `prisma/seed.ts`. A change to a scanned file selected only its
  importers and skipped the guard.
- **Needless widening.** Code that no suite imports (route `page.tsx`/`error.tsx`/`loading.tsx`
  that the framework loads, `seed.ts`) widened every run, and nothing could be declared to place
  it. That was 10 of the 12 widened files in the latest replayed commit.

Separately, a coupling had to list every reader by name. Four migration suites reached the
migrations only through a non-suite helper (`viewings/test-support.ts`), so a grep for the coupled
path missed them: 4 of the 9 suites that apply the SQL.

### Decision

1. **A coupling that names readers applies to code.** For a file that is code for the suites (the
   selector's `suitesAreCode`, so a `.ts` file under Go suites keeps its document rules):
   - when the graph or a changed importer places it, the coupling's readers **join** that selection,
     under the same reason, with a `coupled` field naming them. Adding suites only widens;
   - when no import reaches it (present with no suite dependent, or absent from the graph), the
     coupling **places** it as `declared-coupling`. That narrows on a declaration, the trust a
     document coupling already gets;
   - **an empty coupling never places code.** It is skipped for code, not refused: whether a glob
     matches code depends on the tree, not the config. The file then widens as before.
2. **`via: [helper…]` names helpers, not suites.** At selection time, each helper expands to its
   transitive suite dependents through the same `relations` port, so the list cannot go stale as
   suites start or stop importing it. A helper the graph does not hold expands to nothing, and a
   coupling left with no runnable reader places nothing, so the file widens.
3. **The narrowing reasons stay the closed five of ADR-003 §5** (FF-19003). The union case keeps its
   placement's reason and records `coupled`.

### Alternatives considered

- **Refuse `suites: []` on code at config validation.** Rejected: a glob matches code only on a
  given tree, so validation cannot decide it. Skipping at selection time is decidable and keeps the
  file widening.
- **A `reads: "code"` marker on the coupling.** Rejected: the glob already says what it matches.
- **Have map-tests snapshot a helper's suites into `suites`.** Rejected: the snapshot goes stale the
  first time a suite starts or stops importing the helper.
- **A sixth narrowing reason for the union.** Rejected: the placement's reason is already true, and
  `coupled` names the extra readers.

### Amendment — overlapping couplings combine, and a dead glob is named (operator, 2026-11-11)

Adopting §1 on the consumer project found two silent failures:

- **First match won.** A code file under `features/**` (reader A) and `features/viewings/**`
  (reader B) got one coupling's readers, by order. For a document it was a wrong narrowing: an
  earlier `wiki/**` → `[]` dropped a wiki page that a later coupling names a reader for.
- **Route-group folders are glob syntax.** `app/(crm)/projects/**/page.tsx` reads `(crm)` as a
  pattern group: it matches `app/crm/projects/…` and never the real folder, so the coupling did
  nothing. A glob with no wildcard still matches literally; parentheses beside `*` or `**` do not.

Decision:

1. **Every matching coupling that names readers contributes them**, `via` expanded, so order never
   matters. An empty coupling declares "nothing reads this" only when no matching coupling names a
   reader, and still never for code. Readers that are all unrunnable place nothing, so the file
   widens; one coupling's stale suite does not cancel another's live readers. The resolution's
   `why` names every coupling that contributed.
2. **`test-layout-couplings-match`** joins ADR-008's family: it warns, naming each one, about a
   coupling glob that matches no tracked file and a `via` helper that is not a tracked file. It
   catches the route-group trap and every typo or moved folder like it. A coupling written ahead of
   its files warns until they exist, and says so. `/aof:map-tests` tells the author to escape
   `()` (and `[]`, `{}`) in folder names inside a glob: `\(crm\)` or `[(]crm[)]`.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-19001 | **A test record has one writer.** Only `packages/work/src/testing/record.mjs` writes under `<git common dir>/aof/test-records/`, and no command's input schema carries a field that supplies a result, a failure or a record id to be written. | `test/arch/testing/acd-test-record-one-writer.test.mjs` — pending (190/00) | ADR-001 §1 |
| FF-19002 | **No transition reads a test record.** No module under the status, doctor, loop, audit or bundle doors that FF-7204 censuses imports `packages/work/src/testing/record.mjs`. | a second leg in `test/arch/testing/acd-test-command-reports-not-decides.test.mjs` — pending (190/00) | ADR-006 §3 |
| FF-19003 | **Narrowing is closed and positive.** The selector's narrowing reasons are exactly the frozen five of ADR-003 §5, every selected suite carries one, and a result that widened carries none. | a second leg in `test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs` — pending (190/01) | ADR-003 §3–§5 |
| FF-19004 | **The tree key has one producer.** No module outside `packages/work/src/testing/record.mjs` spawns `git write-tree` or sets `GIT_INDEX_FILE`. | a second leg in `test/arch/testing/acd-test-record-one-writer.test.mjs` — pending (190/00) | ADR-001 §2 |
| FF-19005 | **Every registered suite is selectable.** Every suite file the runner's registry assembles is a suite by the declared roots and suffixes. | a second leg in `test/arch/testing/acd-suite-registration-single-decider.test.mjs` — pending (190/01) | ADR-003 §1 |
| FF-19006 | **The test-layout check has no predicate of its own.** `packages/work/src/testing/layout.mjs` decides suite membership only through `isSuiteFile`, reads `work.test.*` only through `toolchain.mjs`, and imports neither `record.mjs` nor the code corpus. | a third leg in `test/arch/testing/acd-suite-registration-single-decider.test.mjs` — pending (190/04) | ADR-008 §1 |

Only FF-19001's file is new, so `test/arch/testing` moves 11 → 12, with its reason restated in the
budget row. Every other control is a leg in an existing file of the subject it guards.
