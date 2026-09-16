@executable @cli @work @validate
Feature: An anchor says when it was last checked, and cannot opt out of saying so

  Milestone 55 can already tell an operator that an anchor's cited authority no longer resolves. It
  cannot tell them that a live-soak observation is four months old. Those are different facts and an
  operator acts on them differently: one is broken, the other has simply stopped being evidence.

  This adds the date and nothing more. Whether a given date is too old is a window, and the window is
  a later story's; what lands here is the field that story reads, on the one kind for which it means
  anything, so the checks module can stay the pure leaf that imports nothing.

  It is optional on purpose. An anchor that has never declared a date is not thereby stale — it is
  undated, which is a third state and a real one. What is refused is the shape that would let an
  anchor look dated while declaring nothing: a sentinel in place of a date.

  ADR-005 §2. FF-5902.

  Scenario: an anchor records when it was last checked
    Given an anchor record declaring an ISO date it was last checked
    When the registry is loaded
    Then the date is readable off the anchor
    And the anchor's existing ground and authority are unchanged

  Scenario: an anchor that has never declared a date is still a valid anchor
    Given the anchor records shipped before this milestone
    When the registry is loaded
    Then each is parsed
    And none of them gains a finding for the absent date
    And each is reported as undated rather than as stale

  Scenario Outline: a value that is not a date is refused
    Given an anchor whose checked value is <value>
    When the registry is loaded
    Then a bad-value finding names the checked key and quotes the value
    And no date is readable off the anchor

    Examples:
      | value                        |
      | the unknown sentinel         |
      | the none sentinel            |
      | a prose pointer              |
      | a module pointer             |
      | a date that is not a date    |

  Scenario Outline: no other kind admits the key
    Given a <kind> record declaring a checked date
    When the registry is loaded
    Then the existing not-admitted-for-kind finding names the checked key

    Examples:
      | kind    |
      | loop    |
      | actor   |
      | watcher |
      | arbiter |
      | auditor |

  Scenario: the anchor's other rules are untouched by the new key
    Given an anchor declaring a checked date and an unknown ground
    When the registry is loaded
    Then the ground finding is exactly the one it was before this milestone
    And the checked date is still readable
