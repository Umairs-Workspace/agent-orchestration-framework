@executable @cli @work @work-stream
Feature: L3 is earned by a workspace, and no setting can hand it over

  The cheap way to ship this was rejected in writing a milestone ago: a configuration flag makes the
  most dangerous rung reachable by editing a file, with no diff a reviewer sees. That rejection
  binds this story. Whatever else happens, L3 must not become available by configuration.

  So admission is computed at the moment it is requested, from two facts the system already knows
  how to produce: a readiness score over the checks that matter, and a groundedness report with
  nothing floating free and nothing decayed. Both are gathered at the command boundary and handed
  in — the gate never reaches into the registry itself, for the same reason the readiness score
  never does.

  The gate is per workspace, which is the substance of it. Anchors existing in the framework say
  nothing about the repository where an unattended loop would actually run.

  ADR-006. FF-5508.

  Scenario: a workspace with anchors and a passing score is admitted
    Given a workspace whose report has no floating and no decayed components and whose score passes
    When a loop is requested at L3
    Then it is admitted

  Scenario Outline: both halves are required
    Given a workspace whose score <score> and whose report <report>
    When a loop is requested at L3
    Then it is <outcome>

    Examples: readiness alone would open unattended operation on the weakest possible ground
      | score   | report                       | outcome  |
      | passes  | is clean                     | admitted |
      | passes  | has a floating component     | refused  |
      | passes  | has a decayed anchor         | refused  |
      | fails   | is clean                     | refused  |
      | fails   | has a floating component     | refused  |

  Scenario: a workspace grounded only by the human does not qualify
    Given a workspace whose every component is grounded by exogenous ground alone
    When a loop is requested at L3
    Then it is refused

  Scenario: no setting admits L3
    Given a workspace that does not pass the gate
    When a loop is requested at L3 with every available setting turned on
    Then it is refused

  Scenario: the gate reads the registry through the command boundary
    Given a loop requested at L3
    When the gate is evaluated
    Then the report and the score are obtained through registered commands

  Scenario: a refused request spawns nothing and records nothing
    Given a workspace that does not pass the gate
    When a loop is requested at L3
    Then no session is started
    And no run record is created
