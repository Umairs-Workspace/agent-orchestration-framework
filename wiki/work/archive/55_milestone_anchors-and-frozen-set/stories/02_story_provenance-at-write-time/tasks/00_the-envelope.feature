@executable @cli @work @work-stream
Feature: Four keys, two of which may be null and mean something by it

  A claim this system records is currently undefendable in a specific way: the grade record knows
  when it was compiled and not who compiled it, on what commit, or under which run. Every one of the
  missing values is already available and cheap. None is stamped.

  The envelope is four keys and the interesting design is in which of them may be absent. The run
  and the commit are genuinely sometimes not there — a claim produced outside a run, or in a
  checkout with no git, is a weaker claim, and the record should say so rather than pretend. The
  producing node and the instant are never absent, because a claim whose producer or moment is
  unknown is not defensible in any degree; admitting a null there would recreate the collapse the
  registry schema spent a whole decision preventing, where a declared gap becomes indistinguishable
  from a filled field.

  ADR-003. FF-5504.

  Scenario: a stamped claim carries all four keys
    Given a claim produced by a known node, under a run, in a checkout with history
    When it is recorded
    Then the record carries the producing node, the run, the commit and the instant

  Scenario Outline: which values may be absent, and what absence means
    Given a claim whose <key> is unavailable
    When it is recorded
    Then the record is <outcome>

    Examples: nullable where absence is a real state, required where it is not
      | key            | outcome                                  |
      | run            | accepted with the run recorded as absent |
      | commit         | accepted with the commit recorded as absent |
      | producing node | refused                                  |
      | instant        | refused                                  |

  Scenario: an absent run is distinguishable from a run that was not looked for
    Given one claim produced outside any run and one produced inside one
    When both are recorded
    Then the first records its run as absent
    And the second records the run it was produced under

  Scenario: a checkout with no history still produces a defensible claim
    Given a workspace that is not a repository
    When a claim is recorded
    Then it is accepted
    And the commit is recorded as absent rather than as an empty value

  Scenario: the envelope carries no fifth key
    Given a caller supplying an extra provenance field
    When the claim is recorded
    Then the extra field does not enter the envelope
