@executable @cli @work @work-stream
Feature: The ready set runs through the bounded pool that has been sitting there unused

  The only bounded worker pool in this repository has never run in production. Its own comment
  opens *"THE BOUND IS ENFORCED, NOT ADVERTISED"* and explains why `peak` is measured from the
  in-flight count rather than asserted from the schedule — because "we only ever start `bound` of
  them" is the claim, and a scheduler that starts them all and awaits them in chunks would satisfy
  a weaker one. It measures the right thing, isolates a throwing lane so one failed story does not
  strand five that are fine, and dispatches the remainder AS LANES FREE rather than as waves behind
  a barrier.

  Meanwhile `aof work dispatch` computes the bound and attaches it as a number for a language model
  to read. Milestone 65's own research is explicit that no measurement fixed the bound's value —
  only that a bound is ENFORCED and reported. It never was.

  This task supplies the caller. The bound keeps its existing single home, which is guarded: a
  second resolution site is how a bound ends up right in one door and silently wrong in the next.

  ADR-006. FF-6907.

  Scenario: a ready set larger than the bound never exceeds it
    Given a ready set larger than the bound
    When it is dispatched
    Then at no moment are more than the bound in flight
    And every member is eventually dispatched

  Scenario: the remainder is dispatched as lanes free, not as waves
    Given a ready set larger than the bound whose members finish at different times
    When it is dispatched
    Then a waiting member starts as soon as any lane frees
    And no member waits for the slowest of a preceding wave

  Scenario: a ready set smaller than the bound runs all at once
    Given a ready set smaller than the bound
    When it is dispatched
    Then every member is in flight together

  Scenario: one failing lane does not strand the others
    Given a ready set in which one member faults
    When it is dispatched
    Then the faulting member is recorded as failed
    And every other member still completes

  Scenario: the peak is measured, not asserted
    Given a dispatched ready set
    When its report is read
    Then the reported peak came from the observed in-flight count
    And it never exceeds the bound

  Scenario Outline: the bound in effect for a given configuration
    Given a workspace declaring <declared> for the dispatch bound
    When a ready set is dispatched
    Then the bound in effect is <effective>

    Examples: the existing resolver's matrix, reached through its existing single home
      | declared        | effective            |
      | absent          | the documented default |
      | a positive integer | that integer      |
      | zero            | the documented default |
      | a negative number | the documented default |
      | the string "3"  | the documented default |

  Scenario: no second resolution site is introduced
    Given every module that dispatches work
    When the concurrency bound's readers are enumerated
    Then exactly one module resolves it
    And that module is the one that already did
