@executable @cli @work @work-stream
Feature: The answer resumes the same conversation and the same run — never a second attempt

  Releasing the slot is only half of it. The other half is that answering must be cheap: a park
  that resumes by starting over pays the full cold-start cost this whole arc exists to remove —
  927k cache-create tokens per spawn, roughly 3.6 MB of rediscovered context.

  The mechanism is already built and already used, for exactly one purpose. `--resume` attaches a
  NEW process to the SAME persisted conversation; the session id is persisted at spawn; and the
  worker already carries a branch that continues a paused run rather than minting a second one,
  whose own log line reads *"a needs-input park is the same run resuming, never a second record."*
  What was missing was a park for it to resume FROM.

  The negative in this contract is the load-bearing one. A resumed park must not become attempt
  two. If it does, three parks exhaust a three-attempt ceiling and the run is reported as failed
  for having asked questions.

  **The resume's clear lands before the spawn** (review blocker, 2026-08-22). The park's code is the
  thing that released capacity, so the mirror of "publish only after the process is gone" is "clear
  only before a process exists again". One property serves both: the counted set never under-counts
  a live process. This is an ordering on this story's own publish, not a bound — a target that is
  over its bound refusing an answer is **69/04's door**, and putting a second admission check here
  would be the second concurrency-resolution site FF-6907 forbids. Two answers for one park are one
  process, because the answer arrives on a channel that can deliver it twice.

  ADR-006, ADR-007 (2026-08-22 amendment). FF-6909.

  Scenario: answering a parked run resumes its conversation
    Given a parked run with a preserved conversation
    When the answer arrives
    Then a session is started against that same conversation
    And the run continues rather than restarting

  Scenario: a resumed park is the same run record
    Given a parked run at a known attempt
    When it is resumed
    Then the same run record continues
    And no second run record was minted

  Scenario: a resumed park does not consume an attempt
    Given a parked run at attempt one of three
    When it is resumed
    Then it is still at attempt one

  Scenario: repeated parks do not exhaust the attempt ceiling
    Given a run that parks and resumes three times
    When its record is read
    Then it has not exhausted its attempts
    And it was never reported as failed for parking

  Scenario: a resume is counted again before its process starts
    Given a parked run whose slot was released
    When it is resumed
    Then its row stops carrying the park before any process is started for it
    And it is counted against its target's bound from that moment

  Scenario: a resume that never starts a process does not keep the slot
    Given a parked run whose resume fails before a process exists
    When the counted set is computed
    Then it is parked again rather than counted
    And the reason it could not resume is reported

  Scenario: two answers for one park start one process
    Given a parked run for which an answer is already in flight
    When a second answer arrives for the same park
    Then only one process is started
    And the duplicate is reported rather than silently dropped

  Scenario: an answer for a run that is no longer parked is rejected cleanly
    Given a run that has already settled
    When an answer arrives for it
    Then nothing is resumed
    And the attempt is reported rather than silently dropped

  Scenario Outline: what resuming does and does not change
    Given a parked run being resumed
    When its record is compared with how it parked
    Then <field> is <change>

    Examples: the same run, continuing
      | field                | change     |
      | the run identifier   | unchanged  |
      | the attempt count    | unchanged  |
      | the state            | unchanged  |
      | the conversation     | unchanged  |
      | the liveness stamp   | advancing again |
