@executable @cli @work @validate
Feature: The framework ships an auditor of its own, and it cannot audit the thing that watches it

  A grammar nobody writes in is a grammar nobody has tested. Every previous widening of this registry
  shipped the records that use it in the same milestone, and this one does the same: one auditor,
  declared in the framework's own bundle, installed into every project that runs aof.

  Its declaration is where the milestone's rules become concrete. It names the instruments it reads,
  and none of them is a work item. It names how it reads them, and that reading is a command rather
  than a document. It names its cadence, so "how often" is a fact rather than a habit. It names the
  actor it can reach directly. And it declares no edge back to anything in its own subject list,
  because an auditor that reported to the thing it audits would be the arrangement this milestone
  exists to replace.

  ADR-001, ADR-006, ADR-007 §1. FF-5910.

  Scenario: the framework ships exactly one auditor
    Given the loop records this framework ships
    When they are loaded
    Then exactly one of them declares the auditor kind

  Scenario: everything the auditor says it reads resolves
    Given the shipped auditor record
    When each instrument it names is resolved
    Then every one of them resolves to a file, a registered command, or a declared node

  Scenario: the auditor's subject holds no work item
    Given the shipped auditor record
    When its subject list is read
    Then none of its entries names a work item

  Scenario: the auditor's reading is a command, not a document
    Given the shipped auditor record
    When its measurement is read
    Then it names a registered command
    And it does not cite a document as its authority

  Scenario: the auditor declares where it can go directly
    Given the shipped auditor record
    When its escalation endpoint is read
    Then it names a declared actor grounded outside this system

  Scenario: the auditor does not report to anything it audits
    Given the shipped auditor record
    When its reporting edges and its subject list are compared
    Then no node appears in both

  Scenario: the shipped registry still produces no gating finding
    Given the loop records this framework ships, including the auditor
    When the registry is validated
    Then no finding is raised whose code stops the run

  Scenario: the cadence is declared even though nothing schedules it yet
    Given the shipped auditor record
    When its cadence is read
    Then it declares one
    And the audit is runnable on demand without any scheduler existing
