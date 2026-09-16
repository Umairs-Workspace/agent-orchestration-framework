@executable @cli @work @validate
Feature: A metric that has not moved across its declared number of cycles is named

  A counter that reads the same number every cycle is either evidence of a very stable system or
  evidence that nobody is computing it. Those are indistinguishable from the number alone, and the
  second is the one this milestone exists to catch — a watcher whose counter has quietly stopped being
  produced still contributes a reassuring row to every report.

  The judgment is deliberately weak and deliberately loud: unchanged across N cycles is reported, not
  as a fault, but as something to look at. N has one declared home so it can be argued about in one
  place rather than being a literal buried in a check.

  ADR-004 §2. FF-5907.

  Scenario: a counter that has moved is not reported
    Given a watcher whose counter has changed within the declared number of cycles
    When movement is assessed
    Then the watcher is not reported

  Scenario: a counter unchanged across the declared number of cycles is reported
    Given a watcher whose counter has held the same value for the declared number of cycles
    When movement is assessed
    Then the watcher is reported as having an unmoved metric
    And the finding names the watcher, the value and how many cycles it has held

  Scenario: a counter with fewer readings than the threshold is not yet judged
    Given a watcher with fewer recorded readings than the declared number of cycles
    When movement is assessed
    Then it is reported as not yet judgeable
    And no unmoved-metric finding is raised for it

  Scenario: a counter with no readings at all is silent rather than unmoved
    Given a watcher with no recorded readings
    When movement is assessed
    Then it is reported as silent
    And it is not reported as having an unmoved metric

  Scenario: the number of cycles has one home
    Given the threshold at which a metric is called unmoved
    When it is read back
    Then it comes from a single declared source
    And no check states it as a literal of its own

  Scenario: the assessment reads no clock
    Given the same readings and the same threshold handed in twice
    When movement is assessed both times
    Then the two results are identical
