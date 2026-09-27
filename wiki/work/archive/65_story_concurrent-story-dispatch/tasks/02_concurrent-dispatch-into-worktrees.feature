@cli @work @distribution
Feature: The ready set is dispatched concurrently, each session in its own worktree

  Tasks 00 and 01 make the ready set knowable. This task makes acting on it sound, and then
  actually acts on it.

  ISOLATION IS A PRECONDITION, AND THE EVIDENCE IS MEASURED. In
  `vista-app-web/wiki/work/352_milestone_multi-provider-agent-templates/observability/report.md`,
  `src/sandbox/provisionSandboxAgent.ts` was edited ×9 during the `352/02` build and ×8 during the
  `352/05` build — two stories the architect had partitioned as INDEPENDENT. A partition's
  independence claim is therefore not reliable, and concurrency without a worktree per story would
  have corrupted that file. Isolation is not a hardening pass to be done later; without it this
  task is a data-loss feature.

  THE MACHINERY EXISTS AND IS GATED, SO THIS IS WIRING. `src/mesh-worktree.mjs` (659 lines) already
  does worktree-per-item, branch-per-item (`meshItemBranchName`), cleanup-on-done
  (`removeWorktree`) and stranded recovery (`sweepRetainedWorktrees`, `findItemWorktree`). It is
  reachable from exactly two callers, neither of which is the local build loop: assignment dispatch
  (`src/mesh-worker-execution.mjs:2444`) and the session lane
  (`src/mesh-session-spawn-handler.mjs:136-151`) — and the session lane already resolves a per-item
  tree under `.aof/mesh/session-worktrees/` AND already survives two callers racing the same
  `git worktree add` (the loser reads the winner's tree rather than failing). No new machinery is
  authored here; a local, non-mesh door onto the existing seam is.

  THE FAN-OUT IS BOUND, AND THE REASON IS MEASURED TOO. The same reports record agents spending
  33–44% of active time waiting on the toolchain, worst case 90%, with one file edited ×70 inside a
  single run. Six lanes each at 40% toolchain wait contend for one test runner. An unbounded fan-out
  trades a serialisation problem for a contention problem; the bound's VALUE is not chosen here
  (that is `PRD-acd-loop-performance.md`) — only that a bound is enforced and reported.

  WHO DISPATCHES IS DELIBERATELY NOT NARROWED. Today it is a session executing
  `src/bundle/commands/continue.md:59`, which names "the parallelism across independent stories" at
  `:30` but is never told what may run at once. This task tells it. Any later code-owned dispatcher
  reads the same ready set from the same command — the concurrency lives in what the CLI answers,
  not in who asks.

  @executable
  Scenario: a story is dispatched into its own worktree on its own branch
    Given a ready story with no worktree of its own
    When it is dispatched
    Then a worktree exists for that story alone, under the local lane's own root
    And it is on a branch named for that story
    And the operator's main working tree is untouched

  @executable
  Scenario: two stories dispatched together never share a tree
    Given a ready set holding stories "00" and "01"
    When both are dispatched
    Then each has its own worktree and its own branch
    And a file edited in one is not visible in the other until it is merged back

  @executable
  Scenario: the same-file overlap that motivated this cannot corrupt either lane
    Given stories "00" and "01" whose builds both edit the same source file
    When both are dispatched concurrently
    Then each edits its own copy
    And neither build observes the other's partial edit
    And the overlap is reported rather than silently merged

  @executable
  Scenario: two dispatchers racing the same story resolve to one tree
    Given two callers dispatching the same story ref at the same moment
    When both attempt to resolve its worktree
    Then exactly one tree exists and both callers use it
    And the loser is not refused, because the tree it asked for is the outcome it wanted

  @executable
  Scenario: an existing worktree for the story is reused, not re-created
    Given a story that already has a worktree from an earlier dispatch
    When it is dispatched again
    Then the existing tree is reused
    And no second tree is created for the same ref

  @executable
  Scenario Outline: the fan-out never exceeds the bound
    Given a ready set of <ready> items and a concurrency bound of <bound>
    When the set is dispatched
    Then at most <bound> run at once
    And the remainder are dispatched as lanes free

    Examples:
      | ready | bound |
      | 6     | 3     |
      | 2     | 3     |
      | 1     | 1     |

  @executable
  Scenario: the bound is read, never invented
    Given the configured concurrency bound
    When a dispatch resolves it
    Then it comes from one configured key with one default
    And this task adds no second resolution site for it

  @executable
  Scenario: a finished lane is cleaned up
    Given a story whose dispatched session reached a terminal outcome and whose work is merged back
    When cleanup runs
    Then its worktree and branch are removed
    And nothing is removed for a lane that is still running

  @executable
  Scenario: a stranded lane is recoverable rather than lost
    Given a dispatched story whose session died leaving its worktree behind
    When the stranded lanes are swept
    Then that worktree is reported with its ref and its branch
    And its commits are recoverable
    And the sweep never removes a tree holding uncommitted work

  @executable
  Scenario: every lane is individually reportable
    Given three stories dispatched concurrently
    When the dispatch is inspected
    Then each lane reports its ref, its worktree and its current state
    And a lane that has gone quiet is distinguishable from one that is working

  @executable
  Scenario: the prompt fans out over the ready set instead of taking its head
    Given `src/bundle/commands/continue.md`
    When a milestone with two or more ready stories is built
    Then the prompt asks for the ready set and dispatches its members together, up to the bound
    And it no longer builds one story at a time when the set holds more than one

  @manual
  Scenario: a real milestone measures above 1.00× on the story builds
    Given a milestone with at least three genuinely independent stories
    When it is built with concurrent dispatch enabled
    And `aof work observe <ref>` is run over the result
    Then the `aof-developer` role reports a parallelism factor above 1.00×
    And the serial-chain cost for that role is materially below the chain total
    And the evidence is recorded in VERIFICATION.md with the report path, so it can be re-run
