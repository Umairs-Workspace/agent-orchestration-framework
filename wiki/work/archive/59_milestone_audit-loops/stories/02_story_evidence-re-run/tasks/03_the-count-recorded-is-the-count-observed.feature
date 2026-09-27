@executable @cli @work @validate
Feature: A recorded case count that no longer matches the observed one is drift

  A milestone's evidence does not only say that a suite was green. It says how big it was — nine
  lanes, twenty-two cases, fifty-nine rows — and those numbers are what a reviewer uses to judge
  whether the proof was substantial. They are also the numbers that decay silently: a suite can lose
  half its cases and stay green, and the register will go on quoting the number it had on the day it
  was written.

  So where the register records a size, the size is re-derived from the control that actually ran and
  compared. A smaller observed count is the interesting direction and is reported as drift against the
  item that recorded it; a larger one is reported too, because a register that under-reports its own
  proof is a register nobody re-measured.

  This never becomes an oracle for pass or fail — that is the message's job. It is a claim about the
  size of the evidence, and it is reported as its own finding.

  ADR-004 §1, §3. FF-5906.

  Scenario: a recorded count that matches the observed one is confirmed
    Given a fitness register row recording the number of cases its control holds
    And the control holds that many when it runs
    When the evidence lane runs
    Then the row's recorded size is reported as confirmed

  Scenario: a recorded count larger than the observed one is drift
    Given a fitness register row recording more cases than its control now holds
    When the evidence lane runs
    Then the row is reported as size drift
    And the finding quotes both the recorded number and the observed one
    And the finding is anchored on the item whose register records it

  Scenario: a recorded count smaller than the observed one is also drift
    Given a fitness register row recording fewer cases than its control now holds
    When the evidence lane runs
    Then the row is reported as size drift
    And the finding says which direction it drifted

  Scenario: a row that records no size is not invented one
    Given a fitness register row that records no case count
    When the evidence lane runs
    Then no size drift is reported for that row
    And the row is reported as recording no size

  Scenario: size drift does not change the pass or fail verdict
    Given a control that passes and whose recorded size no longer matches
    When the evidence lane runs
    Then the row is reported as confirmed on its result
    And it is separately reported as size drift

  Scenario: the observed size comes from the run, not from the file's text
    Given a control whose declared cases and executed cases differ
    When the evidence lane runs
    Then the observed size is the number the run produced
