@executable @cli @work @validate
Feature: Evidence that cannot be run says what was tried, and never passes for having been tried

  The most dangerous outcome for a re-run lane is the quiet one: a citation that cannot be resolved,
  a control that is not registered anywhere, a run that timed out — and a report that shows nothing.
  Each of those is a finding about the instrument, which is exactly this milestone's subject, and each
  of them is different from the others in a way an operator acts on.

  So the lane distinguishes them and names what it attempted in each case: the path it tried to
  resolve, the runner it looked in, the deadline it applied. "It did not run" is never rendered as
  "it is fine", and "it timed out" is never rendered as "it failed".

  ADR-004 §1, §3. FF-5906.

  Scenario: a citation that resolves to nothing on disk reports the path it tried
    Given a fitness register row naming a control that is not on disk
    When the evidence lane runs
    Then the row is reported as unrunnable
    And the finding names the path it tried to resolve

  Scenario: a control on disk that no runner assembles is reported as unregistered
    Given a fitness register row naming a control that exists but is not part of what any runner assembles
    When the evidence lane runs
    Then the row is reported as unregistered
    And the finding is distinguished from a control that does not exist

  Scenario: a control that exceeds its deadline is reported as timed out
    Given a control that does not finish within its deadline
    When the evidence lane runs
    Then the row is reported as timed out
    And the finding names the deadline that was applied
    And the row is not reported as a failing control

  Scenario: a control that cannot be started is reported as unrunnable
    Given a control that cannot be started at all
    When the evidence lane runs
    Then the row is reported as unrunnable
    And the finding names what was attempted

  Scenario Outline: each reason is its own verdict
    Given a fitness register row whose control is <situation>
    When the evidence lane runs
    Then the row's verdict is <verdict>

    Examples:
      | situation                       | verdict      |
      | absent from disk                | unrunnable   |
      | present but assembled by nobody | unregistered |
      | slower than its deadline        | timed out    |
      | failing on its own assertions   | contradicted |

  Scenario: a row that carries no control at all is reported as declaring nothing
    Given a fitness register row that names no control
    When the evidence lane runs
    Then the row is reported as declaring no control
    And the finding names the row

  Scenario: nothing that could not be run is counted as evidence
    Given a register in which every row is unrunnable
    When the evidence lane runs
    Then no row is reported as confirmed
    And the report says that no evidence was reproduced
