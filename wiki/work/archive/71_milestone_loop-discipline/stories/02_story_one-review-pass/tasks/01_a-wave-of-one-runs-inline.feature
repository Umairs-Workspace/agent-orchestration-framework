@docs @work @work-stream
Feature: Execution mode is read off the wave the CLI answered, not off static config
  In order that a fan-out is never paid for work that could not have been parallel
  the milestone lane must derive its execution mode from the wave — a wave of one runs inline — while
  never adding fan-out against a solo setting.

  # Contract, not restated: ADR-006. `wave` is `aof work next <NN> --through-review --json`'s own
  # answer; this feature never recomputes it.

  Background:
    Given the bundled command "src/bundle/commands/continue.md" as it ships
    And the wave reported by "aof work next <NN> --through-review --json"

  @executable
  Scenario Outline: the mode the lane runs in
    Given "work.agents.mode" is <config>, the --solo flag is <flag>, and the wave holds <members> member(s)
    When the milestone lane resolves its execution mode
    Then it runs <mode>

    Examples:
      | config       | flag    | members | mode                                                        |
      | orchestrated | absent  | 1       | inline — nothing is dispatched or spawned                   |
      | orchestrated | absent  | 2       | orchestrated — the wave is dispatched                       |
      | orchestrated | absent  | 5       | orchestrated — the wave is dispatched                       |
      | orchestrated | present | 1       | inline                                                      |
      | orchestrated | present | 5       | inline                                                      |
      | solo         | absent  | 1       | inline                                                      |
      | solo         | absent  | 5       | inline — the derivation never widens a solo setting         |
      | solo         | present | 5       | inline                                                      |
      | unset        | absent  | 1       | inline — a wave of one is inline whatever the static default |
      | any          | any     | 0       | nothing is dispatched or spawned; the empty wave is reported |

  @executable
  Scenario: the derivation is taken before anything is dispatched
    Given a wave of exactly one member
    When the lane proceeds
    Then no worktree is dispatched for that member
    And no build agent is spawned for that member
    And no dispatch record is written for that member
    And the member is still built and reviewed in full

  @executable
  Scenario: an empty wave is not mistaken for a finished milestone
    Given a readySet whose members are all write-held, so the wave is empty
    When the lane resolves its execution mode
    Then nothing is dispatched and nothing is spawned
    And the held members are reported as held rather than as done
    And the accept hand-off is not printed

  @executable
  Scenario: breadth is unchanged by the derivation
    Given a wave of one that resolved to inline
    When the walk continues
    Then it re-asks "aof work next" after the member closes
    And every story of the milestone is still driven

  @executable
  Scenario: the derivation drops no review lens
    Given a wave of one that resolved to inline
    When the member reaches its review step
    Then every lens the story's shape calls for is still applied
    And no lens is dropped on the strength of the wave's size

  @executable
  Scenario: the derivation reads the wave and never recomputes it
    When the mode-derivation step is read
    Then it reads the member count from the CLI's own "wave"
    And it does not infer concurrency from prose, from a depends comment, or from readySet

  @manual
  Scenario: a real milestone whose wave is one pays no fan-out
    When a milestone whose stories all collide on one declared file is driven
    Then the run record shows no dispatch and no build agent for those members
    And every story of that milestone was still built and reviewed
