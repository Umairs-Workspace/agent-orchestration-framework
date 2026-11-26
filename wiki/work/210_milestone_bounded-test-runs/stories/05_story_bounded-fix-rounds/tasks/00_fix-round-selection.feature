@cli @work @validate
Feature: a fix round reruns the failing suites plus everything the fix can reach

  WHY. A fix raises two questions: did I fix it, and did my fix break a neighbour? The failing
  suites answer the first. The suites that import or name what the fix changed answer the second.
  Both together are tens of suites, not the whole tree (ADR-004). The cases drive `runTest` against
  a temporary git repository with an injected runner and story 01's scan.

  Rule: R1 · A fix round reruns the failing suites plus everything the fix can reach

    @executable
    Scenario: E1 · the failing suite and the suite the fix reaches run, and nothing else
      Given a red named run over suites A, B and C whose one failure is in A
      And the fix changes "src/util.mjs", which suite B imports
      When I run "aof test --failed --json"
      Then the runner is launched with exactly A and B
      And the record written has mode "failed", the red run as its parent, and round 1

    @executable
    Scenario: E2 · a round can start from a gate red
      Given a gate record whose failures are in 3 suites, each attributed
      And the fix changes only files those 3 suites already import
      When I run "aof test --failed --json"
      Then the runner is launched with exactly those 3 suites

    @executable
    Scenario Outline: a round that cannot start is refused, and runs nothing
      Given <state>
      When I run "aof test --failed"
      Then it is refused as <code>, naming <named>
      And no runner is launched

      Examples:
        | state                                                         | code                          | named                          |
        | no red record for this worktree                               | "test-failed-no-red"          | a named run                    |
        | a red record for another worktree of this clone only          | "test-failed-no-red"          | a named run                    |
        | the newest red has a failure with no suite                    | "test-failed-unattributed"    | the case and a named run       |

    @executable
    Scenario: E4 · every red summary ends with the fix-round command
      When a named run goes red
      Then the last line of its summary is "aof test --failed"
      When a fix round goes red
      Then the last line of its summary is "aof test --failed"

    @executable
    Scenario: a round follows the newest red of its chain
      Given a red named run R0 with failures in A and B, then a red round R1 with a failure in A only
      When I run "aof test --failed --json"
      Then the runner is launched with A, plus the suites the changes since R1 reach
      And the record written has parent R1 and round 2

    @executable
    Scenario: a round whose fix touched nothing new reruns only the failing suites
      Given a red named run whose failure is in A, and no file has changed since
      When I run "aof test --failed --json"
      Then the question is answered from the red run, and no runner is launched
