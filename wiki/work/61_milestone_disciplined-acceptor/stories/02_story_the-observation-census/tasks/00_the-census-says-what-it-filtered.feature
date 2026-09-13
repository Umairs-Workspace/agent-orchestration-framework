@executable @cli @work @validate
Feature: Every population the acceptor counts declares what it swept, and what it threw away

  The store this acceptor counts over has no boundary between production and test: the overwhelming
  majority of its run events were written by the test suite, and worktrees created for dispatched work
  register as workspaces of their own. A count that filters neither is not a smaller truth — it is a
  different number wearing a truth's clothes, and it will be read as evidence about the work when it
  is mostly evidence about the suite.

  So the filtering is not optional and it is not silent. The number the report leads with is the
  filtered one; the raw total appears only as part of what was excluded, where it cannot be mistaken
  for the count. And every population states the sweep it ran, the root it walked, and the floor it
  expected — because a lane that reports a clean zero without saying what it looked at is the shape
  that survives longest while measuring nothing.

  The last rule is the one that keeps this honest over time: a census that filtered nothing at all,
  or that came back under its floor, is reported as a finding rather than as a count. At HEAD that
  finding is the expected result, which is exactly why it must be visible rather than rendered as a
  quiet zero.

  ADR-006 §5, §6. FF-6107.

  Scenario Outline: where an observation was written decides how it is counted
    Given an observation written <location>
    When the acceptor counts this workspace's population
    Then it is <counted>

    Examples: the two traps the store sets, and the two answers
      | location                                       | counted                                  |
      | under a temporary fixture directory            | not counted                              |
      | under a dispatch worktree of this workspace    | counted once, under the parent workspace |
      | under this workspace's own root                | counted                                  |
      | under a different workspace's root             | counted for that workspace, not this one |

  Scenario: the number reported is the filtered one
    Given a population in which the great majority of events came from test fixtures
    When the count is reported
    Then the count it leads with excludes every fixture event
    And the unfiltered total appears only as part of what was excluded

  Scenario: a dispatch worktree does not become a second workspace
    Given observations written inside a worktree the framework created to dispatch an item
    When the workspaces in the population are counted
    Then the worktree is not counted as a workspace of its own
    And its observations are counted under the workspace it was dispatched from

  Scenario: the folding follows the worktrees the framework actually creates
    Given a dispatch worktree created through the framework's own dispatch path
    When its observations are counted
    Then they fold into the parent workspace
    And the folding did not depend on the path being spelled out by hand

  Scenario: every population says what it read
    Given an acceptor report over any population
    When each population's record is read
    Then it names the sweep it ran, the root it walked, and the floor it expected
    And it names how many events it excluded as fixtures and how many worktrees it folded

  Scenario: a population declaring no floor is refused rather than reported
    Given a population the acceptor counts that declares no floor
    When the report is assembled
    Then the run is refused, naming that population
    And no report is produced that states its count without a floor

  Scenario: a count below its floor is a finding, not a silent zero
    Given a population whose filtered count falls below its declared floor
    When the report is read
    Then it carries a finding that the acceptor ran on nothing
    And the finding names the sweep, the root walked, and the floor it missed

  Scenario: a census that filtered nothing at all is a finding, not a count
    Given a population over which the sweep excluded no event and folded no worktree
    When the report is read
    Then it carries a finding naming that population
    And its number is not presented as a filtered count

  Scenario: what was filtered is reported even when the count is healthy
    Given a population whose filtered count is well above its floor
    When its record is read
    Then it still states what it excluded and what it folded
