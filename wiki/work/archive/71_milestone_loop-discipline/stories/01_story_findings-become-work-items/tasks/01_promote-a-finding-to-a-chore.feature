@cli @work @scaffold
Feature: A review finding is promoted to a top-level chore through the engine the gap promoter already uses
  In order that a finding the loop declines to chase becomes schedulable work rather than a memory
  the promotion verb must create a top-level chore seeded from the finding's own remedy, carrying a
  back-reference to where it came from, appended without renumbering, and idempotent per finding.

  # Contract, not restated: ADR-004 (one engine, two faces). The single-writer claim is FF-7104 and
  # the one-type/one-placement claim is FF-7103.

  Background:
    Given a work stream with existing top-level items
    And a reviewed item ref, a review round, and a finding with a one-line title, a file:line and a remedy

  @executable
  Scenario: the promotion creates a chore seeded from the finding's remedy
    When the finding is promoted
    Then a top-level chore is created with status "not-started"
    And its "## Definition of Done" carries the finding's remedy as an unticked box
    And no box in the created chore is ticked
    And the created folder validates clean

  @executable
  Scenario: the chore carries a back-reference to where the finding came from
    When the finding is promoted
    Then the chore's "## Notes" names the reviewed item's ref
    And it names the review round
    And it names the finding's one-line title and its file:line

  @executable
  Scenario Outline: each face states its own provenance and never the other's
    Given a chore created by "<face>"
    When its "## Notes" back-reference is read
    Then it names <names>
    And it does not name <never>

    Examples:
      | face                     | names                                   | never                    |
      | aof work promote-gap     | the originating gap                     | a finding or a review round |
      | aof work promote-finding | the reviewed item ref and the finding   | an originating gap       |

  @executable
  Scenario Outline: where the promotion lands
    Given a work stream that holds <existing> top-level item(s)
    When the finding is promoted
    Then the chore takes the position after every existing top-level item
    And its number is <number>
    And the reported shifted count is zero
    And no existing item is renumbered

    Examples:
      | existing | number                                   |
      | none     | the first number in an empty stream      |
      | one      | the next number in the sequence          |
      | several  | the next number in the sequence          |

  @executable
  Scenario Outline: promotion is idempotent on the pair (reviewed ref, finding title)
    Given a chore was already promoted from <first>
    When a promotion is attempted from <second>
    Then the result is <result>

    Examples:
      | first         | second                                          | result                                            |
      | 71/02 · "F-a" | 71/02 · "F-a"                                   | no chore is created; the existing one is reported |
      | 71/02 · "F-a" | 71/02 · "F-a" with a different remedy           | no chore is created; the existing one is reported |
      | 71/02 · "F-a" | 71/02 · " f-A " differing only in case and space | no chore is created; the existing one is reported |
      | 71/02 · "F-a" | 71/03 · "F-a"                                   | a chore is created                                |
      | 71/02 · "F-a" | 71/02 · "F-b"                                   | a chore is created                                |
      | 71/02 · "F-a" | 71/02 · "F-a" after that chore was closed       | no chore is created; the existing one is reported |

  @executable
  Scenario Outline: what the promoter refuses, and what it leaves behind
    Given a promotion request that <defect>
    When it is invoked
    Then it is refused with a coded reason
    And no chore folder is written
    And the stream's top-level item count is unchanged

    Examples:
      | defect                                   |
      | names no reviewed item ref               |
      | names an item ref that does not resolve  |
      | carries no finding title                 |
      | carries a whitespace-only finding title  |
      | carries a title that yields no slug      |
      | carries no remedy to seed                |
      | carries a whitespace-only remedy         |

  @executable
  Scenario: the gap promoter's behaviour is unchanged by the shared engine
    Given the existing "aof work promote-gap" suite
    When it is run against the refactored engine
    Then every existing assertion passes unchanged
    And a discharged gap is still refused rather than scheduled as closed work
    And its refusal reason and its coded errors are the ones it shipped with
