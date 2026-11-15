@executable @cli @work @work-stream
Feature: the end is confirmed from presence

  WHY. The relay push returns nothing, so the verb confirms the end from the record the node itself
  removes, and answers the truth when it cannot confirm it (ADR-004 §3–§4).

  Background:
    Given a fake relay and a fake mesh status
    And live session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" named "aof-0b9e6c1e" on node "node-6eb3"

  Scenario: a session can be named by its name instead of its id
    When `aof mesh session end aof-0b9e6c1e --json` runs and the row leaves presence after 2 s
    Then a session-end envelope for node "node-6eb3" and session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is pushed
    And it answers `ended: true`

  Rule: R1 · Only a session aof launched can be ended, and the answer is the truth

    Scenario: E1 · the record leaving presence confirms the end
      When `aof mesh session end 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10 --json` runs and the row leaves presence after 4 s
      Then it answers `ended: true` with session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" and node "node-6eb3"

    Scenario: E2 · an end the node never carries out is reported as unconfirmed
      When `aof mesh session end 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10 --json` runs and the row is still in presence after 15 s
      Then it answers `ended: false`, saying the request was sent and the session is still listed

    Scenario: E3 · an id no live session carries is refused and nothing is sent
      When `aof mesh session end 11111111-2222-4333-8444-555555555555 --json` runs
      Then it refuses `session-not-found`
      And nothing is pushed to the relay

  Rule: R2 · A session started from Discord does not run forever

    Scenario: E5 · an untouched session is still running and listed the next morning
      Given session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" was started at 09:00 and has had no input or output since
      When the clock reaches 08:00 the next day
      Then the handler has not ended it
      And `mesh:session-list` still answers it, so `/session end` is how it is ended
