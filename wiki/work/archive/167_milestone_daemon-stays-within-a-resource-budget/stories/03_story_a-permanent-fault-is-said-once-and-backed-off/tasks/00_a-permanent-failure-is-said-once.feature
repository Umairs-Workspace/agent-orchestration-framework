@executable @cli @work @distribution
Feature: A permanent sync failure is said once and backed off

  WHY. A sync pass that failed with `event-id-conflict` was retried and warned about on every 15 s
  tick, 83 times, though nothing would change the answer until the workspace changed. The tick
  now says a permanent failure once, with its workspace, and then leaves that workspace alone. It
  tries again when the backoff runs out or the workspace's files change. Transient failures keep
  today's retry.

  Background:
    Given an isolated global home with this node "node-7297"
    And a launcher driven by an injected 15-second ticker and clock
    And workspace "aof" is registered on "node-7297"

  Rule: R1 · A permanent sync failure is said once, then retried only after a backoff or a change

    Scenario: E1 · ten failing ticks give one warning and nine counted skips
      Given every sync pass of "aof" fails with "event-id-conflict"
      When 10 ticks run
      Then the warnings hold exactly 1 line, naming the workspace id of "aof" and "event-id-conflict"
      And the meter counts 1 "sync-failure" for "aof" with code "event-id-conflict"
      And every tick that did not run the pass is counted as a "sync-pass" labelled "backoff"

    Scenario: E2 · an edit in a backed-off workspace ends its backoff
      Given the sync pass of "aof" failed with "event-id-conflict" on the last tick
      And a record doc in "aof" is edited
      When the next tick runs
      Then the sync pass of "aof" runs on that tick

    Scenario Outline: E3 · the gap between attempts doubles up to an hour
      Given every sync pass of "aof" fails with "event-id-conflict"
      When the pass has failed <failures> times
      Then the next attempt is <gap> after the last

      Examples:
        | example | failures | gap        |
        | E3      | 1        | 15 seconds |
        | E3      | 2        | 30 seconds |
        | E3      | 3        | 60 seconds |
        | E3      | 9        | 60 minutes |
        | E3      | 12       | 60 minutes |

    Scenario: E4 · a failure outside the permanent set is retried on the next tick
      Given the sync pass of "aof" fails with "database is locked"
      When the next tick runs
      Then the sync pass of "aof" runs on that tick
      And its failure is warned about as today

    Scenario: E5 · a restart says a backed-off failure once more
      Given the sync pass of "aof" has failed with "event-id-conflict" and is backed off
      When the launcher is stopped and started again
      And the first tick runs
      Then the warnings hold 1 line naming the workspace id of "aof" and "event-id-conflict"

    Scenario: a pass that succeeds clears its backoff
      Given the sync pass of "aof" failed with "event-id-conflict" twice
      And the conflict is resolved and a record doc in "aof" is edited
      When the next two ticks run
      Then the sync pass of "aof" runs on both ticks
      And no further warning is raised for "aof"
