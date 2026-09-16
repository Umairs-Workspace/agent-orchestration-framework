@executable @cli @work @validate
Feature: A counter-metric that is the loop's own metric is decoration, and determinism is a claim that must hold

  The point of a counter-metric is that it pulls the other way. Throughput is paired with rework
  because rework goes up when throughput is bought too cheaply; build-green is paired with contract
  integrity because integrity falls when green is bought by editing the test. A "counter" that
  restates the loop's controlled variable pulls in the same direction as the optimizer and therefore
  measures nothing the optimizer was not already measuring.

  The second half is where this milestone's preference for counters over judges stops being a
  preference. A record may declare that its number is computed by code. If it does, every authority
  it cites must be a pointer at something code can run. A record cannot call itself deterministic
  while pointing at prose — that combination is a claim contradicted by the record making it.

  ADR-002. FF-5702.

  Scenario: a counter equal to the loop's controlled variable is named
    Given a loop and a watcher whose counter restates the loop's controlled variable
    When the checks are run
    Then the counter-equals-controlled finding names the watcher

  Scenario: the comparison ignores incidental formatting
    Given a watcher whose counter differs from the loop's controlled variable only in spacing and case
    When the checks are run
    Then the counter-equals-controlled finding is raised

  Scenario: a genuinely different counter is not flagged
    Given a loop controlling scenarios green
    And a watcher counting whether the contract shrank
    When the checks are run
    Then no counter-equals-controlled finding is raised

  Scenario: a deterministic claim backed by prose is refused
    Given a watcher declaring deterministic counting whose measurement includes a prose authority
    When the checks are run
    Then the not-deterministic finding names the watcher
    And it names the prose authority

  Scenario: a deterministic claim backed entirely by pointers holds
    Given a watcher declaring deterministic counting whose measurement is a command pointer
    When the checks are run
    Then no not-deterministic finding is raised

  Scenario: several executable pointers remain deterministic
    Given a watcher declaring deterministic counting whose measurement contains command and module pointers
    When the checks are run
    Then no not-deterministic finding is raised

  Scenario: a judging watcher may point at prose
    Given a watcher declaring that a model produces its number, with a prose authority
    When the checks are run
    Then no not-deterministic finding is raised

  Scenario Outline: what a deterministic watcher may cite
    Given a watcher declaring deterministic counting whose measurement is <authority>
    When the checks are run
    Then it <outcome>

    Examples: a number code produced is cited as something code can run
      | authority         | outcome                         |
      | a command pointer | holds                           |
      | a module pointer  | holds                           |
      | a config pointer  | is refused as not deterministic |
      | a prose authority | is refused as not deterministic |
