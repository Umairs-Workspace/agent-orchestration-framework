@executable @cli @work @validate
Feature: The audit runs code in a bounded child process, and never inside itself

  This milestone's whole value is that it re-runs things instead of reading about them, and that is
  exactly what one milestone ago was forbidden: importing a cited module executes its module scope,
  which is aof running a project's test code inside its own process. That refusal was right and it is
  not weakened here. It is honoured by moving the execution somewhere it can be bounded.

  Every execution in the audit family goes through one seam. It takes an argument vector, never a
  shell string; it carries a deadline; it kills the child when the deadline expires; and it hands back
  the exit code and the output it actually observed. A second way to start a process is refused,
  because a bound that one caller can route around is not a bound.

  ADR-002 §3. FF-5904.

  Scenario: the runner's assembled suite is obtained without importing it
    Given the audit needs to know what the runner assembles
    When it obtains that answer
    Then the answer comes from a child process
    And no project module has been imported into the audit's own process

  Scenario: a child that exceeds its deadline is killed and reported
    Given a child process that will not finish within its deadline
    When it is run through the seam
    Then it is killed
    And the result reports that the deadline expired
    And the result names the deadline that was applied

  Scenario: the exit code the result reports is the one that was observed
    Given a child process that exits non-zero
    When it is run through the seam
    Then the result carries the exit code the child actually returned
    And it carries the output the child actually produced

  Scenario: a command is passed as an argument vector
    Given a command whose arguments contain characters a shell would interpret
    When it is run through the seam
    Then the arguments reach the child unchanged
    And no shell interprets them

  Scenario: a child that cannot be started is reported rather than swallowed
    Given a command that cannot be started
    When it is run through the seam
    Then the result reports that it could not be started
    And the result names what was attempted

  Scenario: there is one way to start a process in this family
    Given the modules that make up the audit
    When they are inspected
    Then every child process they create comes from the one seam
    And no second way to start a process exists among them
