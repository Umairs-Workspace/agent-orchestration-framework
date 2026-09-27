@executable @cli @work @validate
Feature: The report is a face with a frozen contract, and the resolving happens outside the checks

  Four milestones read whatever this returns. That makes the shape of the answer a contract rather
  than an output format, and it makes one structural property non-negotiable: the checks that
  compute verdicts must stay pure functions over a parsed model. They import nothing today, which is
  why they can be tested trivially and built in parallel with everything around them.

  Resolution is the opposite of pure — it opens files, asks the command registry what it knows,
  reads config. So it happens at the command boundary and arrives as an argument. The command
  gathers; the check decides. That is the same division the grade record already uses, where the
  impure edge collects an observation and a pure compiler turns it into a verdict.

  ADR-002. FF-5503.

  Scenario: the report is reachable as a registered command
    Given a workspace with a loop registry
    When the groundedness report is requested
    Then it is produced by a registered command rather than an ad-hoc script

  Scenario: the machine contract carries every component and its verdict
    Given a registry with anchored, exogenous-only, self-referential and stale components
    When the report is requested in its machine form
    Then each component appears with its members and its verdict
    And each grounded verdict carries the ground class that supported it

  Scenario: the same registry produces the same report
    Given an unchanged registry and an unchanged repository
    When the report is produced twice
    Then the two outputs are identical

  Scenario: the checks receive resolution as an argument
    Given a resolution result stating which authorities resolve
    When the verdicts are computed
    Then they are computed from that argument alone
    And computing them opens no file and runs no process

  Scenario: a registry that cannot be read is reported as such, never as green
    Given a workspace whose registry cannot be read
    When the report is requested
    Then the failure is reported by name
    And no component is reported as anchored

  Scenario: a workspace with no registry at all is not an error
    Given a workspace that has never installed a loop registry
    When the report is requested
    Then the absence is reported plainly
    And the command does not fail
