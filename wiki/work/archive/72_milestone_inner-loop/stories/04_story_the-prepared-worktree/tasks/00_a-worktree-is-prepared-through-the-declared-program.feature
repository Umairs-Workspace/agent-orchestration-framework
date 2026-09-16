@executable @cli @adapter @work-stream
Feature: A worktree arrives with its dependencies, installed through the program the project declared

  A git worktree is materialised empty of dependencies, nothing in the worker runtime installs them,
  and the tree is discarded on completion. So every assignment begins with the agent paying for an
  install out of its own tokens, and ends by throwing the result away for the next one to pay again.

  The step belongs to the project, not to aof. What to run to make a checkout usable is a fact about a
  repository's toolchain, and aof guessing it is the same error as guessing a test runner: it works in
  the repo the guess was written in. So the prepare step is declared, and it runs through the one
  bounded seam, inside the worktree, with a deadline — the same seam, resolver and bound the test
  runner uses, because a second one is a second set of defaults.

  An absent declaration is not an error. A project that needs no prepare step should say nothing and
  get nothing, silently — an optional declaration that warns when omitted trains everyone to ignore
  the warning.

  A failed prepare, though, must be loud. The dangerous outcome is not a failure; it is a half-installed
  tree handed to an agent as if it were ready, which then fails somewhere far from the cause and reads
  as the agent's fault. That is the guard-that-passes-when-absent species this project has already been
  bitten by, in a new place. A non-zero exit or a deadline expiry is its own coded outcome on the
  assignment.

  ADR-007 §1, §4. FF-7207.

  Scenario: a declared prepare step runs inside the new worktree after it is created
    Given a project that declares a worktree prepare step
    When a worktree is created
    Then the prepare step is run
    And it is run with the worktree as its working directory
    And it is run after the worktree exists

  Scenario: the prepare step goes through the one bounded seam with a deadline
    Given a project that declares a worktree prepare step
    When it is run
    Then it went through the shared bounded spawn seam
    And a deadline was armed from the declaration

  Scenario Outline: what each declaration shape launches, and what it says when it launches nothing
    Given a project whose worktree prepare declaration is <declaration>
    When a worktree is created
    Then <launch>
    And the result reports <reported>

    Examples: complete, absent, missing its command, and a deadline that is absent or non-positive
      | declaration                                    | launch                                                 | reported                                              |
      | complete — a command, arguments and a deadline  | the declared program is launched once, in the worktree | the run's own outcome                                 |
      | absent entirely                                | nothing is launched                                    | nothing at all — no error and no warning is raised    |
      | present but naming no command                  | nothing is launched                                    | a coded refusal told apart from an absent declaration |
      | present, its deadline absent, zero or negative  | nothing is launched                                    | a coded refusal naming the deadline, raised at compile time |
      | present, its arguments not a list              | nothing is launched                                    | a coded refusal naming the field, raised at compile time    |
      | present, its command resolving nowhere         | nothing is launched                                    | a coded refusal told apart from a command that is missing   |
    And no declaration shape yields a run with no bound, and the bound applied is named in the result

  Scenario Outline: the outcome each prepare run reports, and whether the tree is handed over as ready
    Given a declared prepare step
    When the prepare run <run>
    Then the assignment carries <reported>
    And the worktree <ready>

    Examples: exit zero, exit non-zero, a deadline expiry, and a run that never started
      | run                                   | reported                                                      | ready                 |
      | completes with exit status zero       | no prepare outcome beyond the ordinary success                | is reported ready     |
      | completes with a non-zero exit status | a coded outcome naming the failed prepare and its exit status | is not reported ready |
      | is killed at its deadline             | a coded outcome naming the deadline expiry                    | is not reported ready |
      | never starts                          | a coded outcome naming the failure to start                   | is not reported ready |
    And the three failing outcomes are told apart by three distinct codes, never folded into one
