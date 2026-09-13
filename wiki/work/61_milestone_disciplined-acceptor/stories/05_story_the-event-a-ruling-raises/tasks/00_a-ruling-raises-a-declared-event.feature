@executable @cli @work @work-stream
Feature: A ruling is a fact the system records, whether or not anything moved

  The acceptor renders rulings on the harness it runs under. Until this task there is no declared
  event that can carry one, so the seam that writes an editable harness value keeps no record of what
  it replaced, on what evidence, or who decided — the change is in git and the reason is nowhere.

  The event is named for the ruling, not for the change, and that is the one distinction worth
  arguing about. Report-only is this acceptor's permanent steady state, not a phase it grows out of.
  An event meaning "the harness changed" would therefore fire almost never, and every honest refusal
  — the overwhelming majority of the work, and the part an operator most needs to read — would leave
  no trace at all. One name covers both outcomes; the verdict inside the record tells them apart.

  Its single consequence appends the ruling beside the configuration it concerns, in the workspace's
  own tracked state rather than in a per-node store, so one revert takes back both the change and the
  reason for it. And facts precede announcements, as everywhere in this family: a committing ruling
  writes the configuration first, and a write that is refused announces nothing.

  ADR-007 §1, §2, §3. ADR-006 §2. FF-6108.

  Scenario: rendering a ruling is what records it
    Given an acceptor that has rendered a ruling on a harness value
    When the ruling is raised
    Then a record of it is appended beside the configuration it concerns
    And the record is the one the acceptor rendered rather than one re-derived afterwards

  Scenario Outline: the ruling is recorded whatever it decided
    Given an acceptor whose ruling found that <ruling>
    When the ruling is raised
    Then a record of it is appended
    And its verdict reads <verdict>
    And the configuration it concerns <configuration>

    Examples: report-only is the steady state, so the silent outcomes are the ones that must be recorded
      | ruling                                             | verdict     | configuration          |
      | the evidence is short of the threshold             | report-only | is unchanged           |
      | nothing has been observed that could measure it    | report-only | is unchanged           |
      | nothing in the system consumes the value           | report-only | is unchanged           |
      | the trial costs more than the criterion can afford | report-only | is unchanged           |
      | the evidence is decisive and the change is taken   | commit      | carries the new value  |

  Scenario: a ruling that moved nothing still leaves the same kind of trace as one that did
    Given an acceptor that refused a proposal
    When the ledger is read afterwards
    Then the refusal is readable there
    And it carries the same fields a committing ruling carries

  Scenario: the record is the only thing a report-only ruling writes
    Given an acceptor whose ruling refused a proposal
    When the ruling is raised
    Then the appended record is the only change to the working tree
    And no harness value was written

  Scenario: a committing ruling and its record are one change
    Given an acceptor whose ruling committed a change to a harness value
    When the ruling is raised
    Then the new value and the record that justifies it are one working-tree change
    And reverting that one change takes back both

  Scenario: the record is kept, not regenerated
    Given a workspace prepared by aof
    When the repository is asked whether the ledger is ignored
    Then it is tracked rather than ignored
    And it is not treated as a derived artifact that may be rebuilt from something else

  Scenario: a refused harness write announces nothing
    Given an acceptor whose committing ruling cannot write the harness value
    When the ruling is raised
    Then no record is appended
    And no consequence is left owed

  Scenario: a consequence that cannot be discharged yet stays owed
    Given a ruling raised while the record cannot be written
    When the outstanding consequences are next worked through
    Then the record appears
    And it appears exactly once

  Scenario: nothing else writes into the ledger
    Given a workspace whose harness values were edited directly rather than ruled on
    When the ledger is read
    Then no record was added by that edit
    And the acceptor's evidence is unchanged by it

  Scenario: the events already declared are untouched
    Given each event the system already declares
    When it is raised
    Then the consequences it owes are the ones it owed before
    And none of them appends a ruling record
