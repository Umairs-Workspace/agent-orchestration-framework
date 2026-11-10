@executable @cli @work @distribution
Feature: An owed sync retries until it lands, with backoff

  WHY. A journal step that failed five times was never retried, so a publish that hit a locked or
  missing store was owed forever and never paid. A reactor that is safe to re-run now declares that
  it retries until done. Its steps are retried past the ceiling, with backoff so a broken store is
  not hammered, and every other reactor keeps the ceiling it has today.

  Background:
    Given an isolated effects journal and an injected clock

  Rule: R1 · An owed sync is retried until it lands, without hammering a broken store

    Scenario: E1 · a publish that failed five times is retried and lands
      Given a "workspace.changed" step for "aof" has failed 5 times because the store was locked
      And its backoff has elapsed
      And the store now accepts writes
      When the journal is drained
      Then the step is "done"

    Scenario Outline: E2 · a failed publish waits out its backoff before the next attempt
      Given a "workspace.changed" step for "aof" failed <ago> ago after <attempts> attempts
      When the journal is drained
      Then the step is <outcome>

      Examples:
        | example | attempts | ago        | outcome         |
        | E2      | 3        | 2 seconds  | not attempted   |
        | E2      | 3        | 3 minutes  | attempted again |
        | E2      | 9        | 10 minutes | not attempted   |
        | E2      | 9        | 16 minutes | attempted again |

    Scenario: E3 · a reactor that does not declare retry-until-done keeps the ceiling
      Given a step of a reactor that does not declare "retry: until-done" has failed 5 times
      When the journal is drained
      Then the step is not attempted again

    Scenario: an unknown retry declaration is refused when the reactor table is built
      Given a reactor entry declares "retry: forever"
      When the reactor table is assembled
      Then assembly fails naming the reactor and the value "forever"
