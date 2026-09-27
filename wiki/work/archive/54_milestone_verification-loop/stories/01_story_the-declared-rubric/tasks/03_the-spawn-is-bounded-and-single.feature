@executable @cli @work @validate
Feature: The spawn is bounded and single — one child, both streams, a deadline, and no recursion

  This is the one impure edge in the milestone (ADR-003 §2), and it is the edge where a grader
  becomes a hazard: an unbounded child hangs the loop it was meant to bound, a half-captured child
  reports green while its reds go to a stream nobody read, and a rubric that invokes aof forks a
  grader tree. All three are closed here, and the shape is not invented — `graphifySpawnOptions`
  (`src/graphify.mjs:210-218`) already ships the envelope: `stdio: ["ignore", "pipe", "pipe"]`, a
  resolved `timeout`, `killSignal: "SIGKILL"`. ADR-005 §5 names it as the shape, *in shape, not in
  code*.

  **Both streams, and the reason is measured on this very repo.** `scripts/test.mjs` writes
  `ok - <name>` to **stdout** (`:3764`) and `not ok - <name>` to **stderr** (`:3767`). A stdout-only
  capture of a failing run of this repo's own suite therefore reads as an **all-green report beside
  a non-zero exit** — the milestone's own worst failure mode, reachable from its own runner, and the
  reason `m11/R2` (*a command that wraps a subprocess must check the subprocess's exit status before
  reading its expected output*) is a bug rather than a preference.

  **54 enforces a bound and chooses none.** `53/ADR-009` §1, unchanged. The deadline is
  `69/ADR-002`'s `startToClose` — **30 minutes**, derived from 47/01 and 47/02 each burning 11h07m
  then succeeding in 15.9 minutes — resolved through `69/ADR-001`'s single home
  `src/loop-bounds.mjs` from the `work.loop.*` subtree. Measured today: that file is **not on disk**
  and all six of 69's stories are `not-started`. **If this story lands first it creates that leaf at
  69's declared path, with 69's declared key, default and resolver shape, and 69/00 extends it.** It
  opens **no rival bound home**: `acd-loop-cap-single-home` (extended by 69, not joined by a
  sibling) and `69/ADR-001`'s non-annexation rule remain the authority, and neither
  `work.dispatch.concurrency` nor `work.autonomous.maxAttempts` is moved.

  **Re-entrancy is refused structurally, not by convention** (ADR-003 §5). The stamp is set in the
  child's environment on every spawn; a `--run` that finds it already set refuses rather than
  recursing. A rubric that invokes aof — directly, or transitively through a script it calls — must
  not be able to fork a grader tree, and this repo is exactly such a project: bare `aof` on PATH
  symlinks into this working tree.

  ADR-003 §2, §5; ADR-005 §5; `69/ADR-001`, `69/ADR-002`.

  Scenario: a runner that reads stdin gets an end-of-file, not a hang
    Given a project whose declared rubric reads from standard input before doing anything
    When the rubric is graded with `--run`
    Then the runner observes end-of-file on standard input
    And the run completes rather than waiting for input that never arrives
    And the grade is decided within the deadline

  Scenario: both output streams are captured, so a red on stderr is not a green
    Given a project whose declared runner writes its passes to stdout and its failures to stderr
    And a run of it in which at least one case fails
    When the rubric is graded with `--run`
    Then the observed failing-case count is greater than zero
    And the verdict reads `fail`
    And the verdict does not read `pass`
    And the failure the runner wrote to stderr appears in the record's failures

  Scenario: the exit status is read before the report is, and a non-zero exit is never overridden by a green report
    Given a project whose runner exits non-zero while its report enumerates only passing cases
    When the rubric is graded with `--run`
    Then the verdict does not read `pass`
    And the record reports the non-zero exit status that was observed
    And the report's own counts are still reported alongside it

  Scenario: the deadline force-kills, and the kill is reported as a timeout
    Given a project whose declared rubric does not terminate
    When the rubric is graded with `--run`
    Then the child is killed once the deadline elapses
    And the verdict reads `indeterminate`
    And the codes contain `runner-timeout`
    And the record reports the deadline that bound the run and the duration observed
    And no process from that run is still alive afterwards

  Scenario Outline: the deadline is resolved, never chosen here
    Given a project whose configuration sets <declaration>
    When the plan for an item is read
    Then the plan reports the deadline it will enforce as <deadline>
    And that value was resolved from the loop-bounds home rather than from a literal in the grade path

    Examples: one home, one key
      | declaration                                 | deadline                    |
      | no loop bound at all                        | the documented default      |
      | a start-to-close bound of its own           | the value it declared       |
      | a start-to-close bound that is not a number | the documented default      |

  Scenario: no second home for the bound is opened
    Given the sources under `src/`
    When they are searched for a default or resolver for the runner deadline
    Then exactly one module declares it
    And `work.dispatch.concurrency` still resolves from its existing single home
    And `work.autonomous.maxAttempts` still resolves from its existing closed reader set

  Scenario: a runner that cannot be launched at all is reported as such
    Given a project whose declared rubric names a program that does not exist
    When the rubric is graded with `--run`
    Then the verdict reads `indeterminate`
    And the codes contain `runner-spawn-failed`
    And the record reports the command that was attempted
    And the message distinguishes a launch failure from a runner that ran and failed

  Scenario: a grade cannot re-enter itself
    Given a project whose declared rubric itself invokes the grade
    When the rubric is graded with `--run`
    Then the outer run launches exactly one child
    And the inner invocation refuses rather than launching a further child
    And the inner refusal reports `runner-spawn-failed`
    And the number of processes launched in total is bounded and does not grow with the depth attempted

  Scenario: the stamp is set on the child, and only on the child
    Given a project that declares a `work.rubric`
    When the rubric is graded with `--run`
    Then the child observes the re-entrancy stamp in its environment
    And the invoking process's own environment is unchanged after the run
    And a subsequent `--run` from that same invoking process is not refused

  Scenario: one `--run` is one spawn, whatever the rubric reports
    Given a project that declares a `work.rubric`
    When the rubric is graded with `--run`
    Then exactly one process is launched, whether the run passes, fails or times out
    And no retry of the runner is attempted inside a single grade
