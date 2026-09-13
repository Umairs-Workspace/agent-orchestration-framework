@docs @work @round-trip
Feature: The review lenses are spawned together, with a stagger, and waited on together
  In order to stop paying an hour of serialisation on lanes that never read each other's output
  the review step must say what the build step already says — spawn them together and wait for all
  of them — and stagger the spawns so the first warms the prefix the rest read.

  # Contract, not restated: ADR-006. The lanes are independent lenses over one diff; nothing in the
  # review step reads another lane's output. No fitness function is declared for this, by decision.

  Background:
    Given the bundled command "src/bundle/commands/continue.md" as it ships
    And a story whose build is green and whose gate ladder is clean

  @executable
  Scenario: the review step spawns its lanes together
    When the review step is read
    Then it instructs the lanes to be spawned together and waited on together
    And it uses the same terms the build fan-out uses
    And no lane's spawn is instructed to wait on a prior lane's return

  @executable
  Scenario Outline: which lanes are in the concurrent set
    Given a story that <condition>, driven in <mode> mode
    When the review step runs
    Then the set spawned is <lanes>

    Examples:
      | condition | mode         | lanes                                                          |
      | has no UI | orchestrated | structural, behavioural and the automated craft pass           |
      | has UI    | orchestrated | structural, behavioural, design conformance and the craft pass |
      | has no UI | solo         | none — each lane is performed in this session, in turn         |
      | has UI    | solo         | none — each lane is performed in this session, in turn         |

  @executable
  Scenario: the spawns are staggered
    When the review step is read
    Then it instructs a short interval between spawns
    And it states the reason — the first spawn warms the shared prefix the rest read
    And the interval is declared neither as a config key nor as a "work.loop.*" bound

  @executable
  Scenario: no lane waits on another lane's output
    When the review step is read
    Then no lane is instructed to read another lane's verdict or findings
    And the lanes' findings are merged only after all of them have returned
    And a lane that returns findings does not cancel the lanes still running

  @executable
  Scenario: concurrency stays inside the dispatch bound
    Given the bound reported by "aof work dispatch --list --json"
    When the review lanes are spawned together
    Then the number spawned concurrently does not exceed that bound
    And the remainder is spawned as earlier lanes return

  @manual
  Scenario: a real milestone's review lanes overlap in time
    When a milestone with several UI stories is driven through review
    Then the architect and QA sessions for one story overlap in the run record
    And the review wall-clock is below the sum of the lanes' durations
    And no lane's start time follows another lane's end time by construction
