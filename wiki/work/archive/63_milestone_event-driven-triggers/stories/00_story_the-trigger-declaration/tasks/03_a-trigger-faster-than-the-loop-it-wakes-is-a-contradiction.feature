@executable @cli @work @validate
Feature: A trigger that fires faster than the loop it points at is reported by name, and a pair that was never compared says so

  A cadence merely stored would not have been worth importing. This is what earns it: a trigger pointing
  at a loop-registry entry, both declaring a cadence, is a pair a machine can find in contradiction —
  waking every five minutes a loop that declares it runs hourly is not a matter of taste, and it is the
  kind of thing an unattended caller discovers by watching the same work start eleven times before the
  first attempt finished.

  The comparison is on the operands the parsed cadence already carries, never on the strings. Sixty
  minutes and one hour are the same duration spelled two ways, and an implementation comparing text, or
  comparing amounts without their units, calls one of them faster than the other. So the table below
  puts those spellings next to each other on purpose, along with the millisecond either side of the
  boundary, because "faster" is a strict comparison and equal is not faster.

  The ordinals have their own trap. They rank by containment, not by the order they happen to be listed
  in, and two of them share a rank — a run-start and a phase are the same rung. An implementation that
  compared positions in a list would report a contradiction for a pair that has none, and that finding
  would be indistinguishable from a real one to whoever read it.

  A duration and an ordinal are not comparable at all, and the answer must say so rather than answer
  "no contradiction". Those two sentences look the same in a report and mean opposite things: one is a
  pair that was checked and agreed, the other is a pair nobody could check. An implementation that
  returns the same value for both — and the shortest one does — hides every incomparable pair behind a
  clean result, which is the failure this milestone indicts everywhere else. The same applies to a
  trigger whose pointer names a loop that does not exist: a pointer resolving to nothing is not a pair
  that agreed.

  ADR-002 §2, §3a. FF-6302.

  Scenario Outline: a trigger's cadence against the cadence of the loop it points at
    Given a loop registry entry whose cadence is <loop>
    And a trigger pointing at that loop, whose cadence is <trigger>
    When the declaration is compiled against that registry
    Then the answer <verdict>

    Examples: two durations, compared in milliseconds and not in text
      | trigger            | loop        | verdict                                                  |
      | periodic:5m        | periodic:1h | reports a contradiction naming the trigger               |
      | periodic:1h        | periodic:5m | reports no contradiction                                 |
      | periodic:1h        | periodic:1h | reports no contradiction — equal is not faster           |
      | periodic:60m       | periodic:1h | reports no contradiction — one duration spelled twice    |
      | periodic:59m       | periodic:1h | reports a contradiction naming the trigger               |
      | periodic:3599999ms | periodic:1h | reports a contradiction naming the trigger               |
      | periodic:3600000ms | periodic:1h | reports no contradiction                                 |
      | periodic:3600001ms | periodic:1h | reports no contradiction                                 |
      | periodic:1ms       | periodic:7d | reports a contradiction naming the trigger               |

    Examples: two ordinals, compared by rank and not by list position
      | trigger             | loop                | verdict                                              |
      | event:per-item      | event:per-milestone | reports a contradiction naming the trigger           |
      | event:per-milestone | event:per-item      | reports no contradiction                             |
      | event:per-item      | event:per-item      | reports no contradiction — equal is not faster       |
      | event:per-run-start | event:per-phase     | reports no contradiction — the two share a rank      |
      | event:per-phase     | event:per-run-start | reports no contradiction — the two share a rank      |
      | event:per-run-start | event:per-milestone | reports a contradiction naming the trigger           |
      | event:per-phase     | event:per-item      | reports a contradiction naming the trigger           |

    Examples: a duration against an ordinal, and the sentinel — nothing is converted, and nothing is assumed
      | trigger        | loop                | verdict                                                     |
      | periodic:5m    | event:per-milestone | reports the pair as not comparable, and no contradiction     |
      | event:per-item | periodic:5m         | reports the pair as not comparable, and no contradiction     |
      | unknown        | periodic:5m         | reports the pair as not comparable, and no contradiction     |
      | periodic:5m    | unknown             | reports the pair as not comparable, and no contradiction     |
      | unknown        | unknown             | reports the pair as not comparable, and no contradiction     |

  Scenario: not comparable and not in contradiction are two different answers
    Given a trigger and a loop whose cadences are both durations and agree
    And a trigger and a loop one of whose cadences is an ordinal and the other a duration
    When the declaration is compiled against that registry
    Then the first pair is reported as compared and in agreement
    And the second is reported as not comparable
    And the two are distinguishable from each other in the answer without reading either cadence again

  Scenario: the contradiction says which trigger, which loop, both cadences, and which is faster
    Given a trigger that fires faster than the loop it points at
    When the contradiction is read
    Then it names the trigger by its id
    And it names the loop it points at
    And it states both cadences as they were declared
    And it says which of the two is the faster

  Scenario: a contradictory declaration never reads as a clean one
    Given a declaration containing one contradictory trigger and three that are not
    When it is compiled against the registry
    Then its answer differs from the answer for the same declaration with the contradictory trigger removed
    And the difference is the contradiction, not a missing trigger
    And the three that are not contradictory are compiled exactly as they would be alone

  Scenario Outline: there is nothing to compare, and that is not agreement
    Given a trigger that <situation>
    When the declaration is compiled against the registry
    Then the answer <verdict>

    Examples: silence is reported as silence
      | situation                                    | verdict                                                       |
      | points at a loop but declares no cadence      | reports it as not compared, and no contradiction              |
      | points at a loop that declares no cadence     | reports it as not compared, and no contradiction              |
      | points at no loop at all                      | reports it as not compared, and no contradiction              |
      | points at a loop id no registry entry declares | reports it by name as a pointer that resolves to nothing      |

  Scenario: every trigger that points at a loop is accounted for, one way or another
    Given a declaration whose triggers between them cover every case above
    When it is compiled against the registry
    Then each trigger appears exactly once in the answer
    And each is either compared, or not compared, or in contradiction, and never two of those
    And no trigger that points at a loop is absent from the answer
