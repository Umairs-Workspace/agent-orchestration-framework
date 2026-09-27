@executable @cli @work @validate
Feature: A marker that skips a test which already ran is a fire

  The third way to turn red green is to stop running the test. A skip, an only, a todo — one word,
  the suite still reports pass, and nobody reads the summary line that says how many were skipped.

  This leg is nearly free and nearly noiseless. Spike 56 measured it against 656 modification events
  in this repository's history and found it firing **zero** times, which means a fire here is not a
  judgement call: it is something that has never happened in the ordinary course of work.

  Scope is what keeps it that way. The marker has to be ADDED, and it has to be added to a test that
  existed at the base commit. A new test authored as a todo is a plan, not a retreat.

  ADR-004. FF-5705.

  Scenario: a skip marker added to a pre-existing test fires the leg
    Given a pre-existing test that gains a skip marker
    When the ratchet runs
    Then the marker leg fires
    And it names the test

  Scenario: an only marker added to a pre-existing test fires the leg
    Given a pre-existing test that gains an only marker
    When the ratchet runs
    Then the marker leg fires

  Scenario: a todo marker added to a pre-existing test fires the leg
    Given a pre-existing test that gains a todo marker
    When the ratchet runs
    Then the marker leg fires

  Scenario: a marker on a newly added test does not fire the leg
    Given a test added after the base commit carrying a todo marker
    When the ratchet runs
    Then the marker leg does not fire

  Scenario: a marker that was already there does not fire the leg
    Given a pre-existing test that carried a skip marker at the base commit
    When the ratchet runs
    Then the marker leg does not fire

  Scenario: a removed marker does not fire the leg
    Given a pre-existing test whose skip marker is removed
    When the ratchet runs
    Then the marker leg does not fire

  Scenario: a marker inside a comment is not a marker
    Given a pre-existing test that gains a commented-out skip marker
    When the ratchet runs
    Then the marker leg does not fire

  Scenario: the leg reports which marker it found
    Given a pre-existing test that gains a skip marker
    When the ratchet runs
    Then the finding names the marker that was added
