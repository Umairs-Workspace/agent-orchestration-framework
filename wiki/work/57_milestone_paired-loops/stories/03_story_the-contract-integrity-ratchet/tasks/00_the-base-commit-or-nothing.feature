@executable @cli @work @validate
Feature: The ratchet has a defined baseline or it refuses to produce a number

  Every leg of this counter is a comparison against the state of the contract when the work started.
  That state has to be a specific commit, and this repository does not supply one: there are no merge
  commits, so there is no branch point to take a merge-base from.

  So the baseline is defined from the record rather than from the branch — the commit at which the
  item's own record document first said it was in progress. That is the moment the contract was
  locked and the build began, it is a property of the item rather than of anybody's branch layout,
  and it survives a rebase of the work that followed.

  The other half of this task matters more than the definition. When that commit cannot be found, the
  ratchet produces nothing at all. It does not fall back to the previous commit, to the item's
  creation, or to any other plausible guess, because a counter that invents a baseline still reports
  a number and a number is what people act on.

  ADR-004. FF-5705.

  Scenario: the baseline is the commit at which the item went in-progress
    Given an item whose record document was committed as in-progress
    When the ratchet resolves its base commit
    Then it resolves to that commit

  Scenario: the earliest such commit wins when the status moved more than once
    Given an item that went in-progress, was blocked, and went in-progress again
    When the ratchet resolves its base commit
    Then it resolves to the first of those commits

  Scenario: an item that was never committed in-progress refuses
    Given an item whose record document has never carried in-progress in any commit
    When the ratchet runs
    Then it reports that the base commit is unresolved
    And no leg is computed

  Scenario: a shallow history refuses rather than guessing
    Given a repository whose history does not reach the item's base commit
    When the ratchet runs
    Then it reports that the base commit is unresolved
    And no leg is computed

  Scenario: the refusal never falls back to the previous commit
    Given an item whose base commit cannot be resolved
    When the ratchet runs
    Then it does not compare against the previous commit
    And it reports no leg result at all

  Scenario: an operator may supply the base explicitly
    Given an operator supplying a base commit
    When the ratchet runs
    Then it compares against the supplied commit
    And the output records that the base was supplied rather than resolved

  Scenario: the resolved base is reported alongside the result
    Given an item whose base commit resolves
    When the ratchet runs
    Then the output names the commit it compared against

  Scenario: resolution happens at the command boundary
    Given the ratchet engine
    When it is called directly
    Then the base commit and the two trees arrive as arguments
    And it reads no repository of its own
