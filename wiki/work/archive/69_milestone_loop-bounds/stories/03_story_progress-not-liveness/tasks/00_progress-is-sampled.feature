@executable @cli @work @work-stream
Feature: Progress is sampled from things that are true, not from an opinion about them

  Liveness answers "is anything happening". Progress answers "is anything changing". The 11h07m
  burns were alive the whole time; what they were not was moving.

  The proxies are chosen because they are already computable without a model and, in one case,
  already computed: files touched and lines changed come from `git status --porcelain` inside the
  lane's own tree, which the lane sweep already reads in order to know whether a lane holds
  uncommitted work. Commits made and failing-scenario count complete the set.

  What is deliberately absent is a judge. Magentic-One re-evaluates `IsProgressBeingMade` with a
  model every round; this repo has direct evidence against that. Huang et al. measured
  self-correction without an external oracle as net-negative, and Anthropic's own guidance states
  the mechanism: *"A reviewer prompted to find gaps will usually report some, even when the work is
  sound."* A ledger that asks a model whether it is making progress inherits exactly that bias, in
  the one place where a false positive is most expensive — it would keep an 11-hour loop alive.

  Samples are APPENDED. A ledger rewritten in place cannot answer "was it moving an hour ago",
  which is the only question it exists for. This is the same discipline 68 applied to observability
  snapshots after regenerated reports made retrospectives unfalsifiable.

  ADR-005. FF-6906.

  Scenario: a sample records what changed, not what someone thought of it
    Given an attempt running in a worktree
    When a progress sample is taken
    Then it carries the files touched, the lines changed, the commits made and the failing-scenario count
    And it carries no judgement about whether that constitutes progress

  Scenario: a later sample is appended, never overwritten
    Given an attempt with a sample already recorded
    When a second sample is taken
    Then both samples are readable
    And the first is byte-identical to how it was written

  Scenario: two samples with identical measures constitute no progress
    Given two consecutive samples whose measures are identical
    When progress between them is evaluated
    Then the verdict is that no progress was made

  Scenario Outline: what counts as progress between two samples
    Given two consecutive samples in which <change>
    When progress between them is evaluated
    Then the verdict is <verdict>

    Examples: any movement in any proxy counts; the absence of all of them does not
      | change                                       | verdict     |
      | the failing-scenario count fell              | progress    |
      | a commit was made                            | progress    |
      | new files were touched                       | progress    |
      | the line count changed                       | progress    |
      | the failing-scenario count rose              | progress    |
      | nothing changed at all                       | no progress |

  Scenario: the ledger reads no model surface
    Given the module that evaluates progress
    When its imports are inspected
    Then it reaches no agent, prompt or model surface
    And every signal it reads is deterministic

  Scenario: the ledger is invisible to the run-record reader
    Given an attempt with progress samples recorded beside its run
    When the run records for that item are read
    Then the samples are not among them
    And the run record itself is unchanged

  Scenario: a torn or unreadable sample degrades to one missing sample
    Given a ledger in which one sample cannot be parsed
    When the samples are read
    Then the remaining samples are returned
    And the fault is reported rather than thrown
