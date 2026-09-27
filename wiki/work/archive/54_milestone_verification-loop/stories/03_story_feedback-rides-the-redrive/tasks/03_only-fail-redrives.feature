@executable @cli @work @work-stream
Feature: Only `fail` re-drives, only `pass` advances, and `indeterminate` halts — with one named exception

  This is the rung's routing, and it is the last place the milestone could quietly turn an absence of
  evidence into a green light. The rule is stated as a closed table so it cannot:

  | verdict                                | loop act                                                        |
  |----------------------------------------|-----------------------------------------------------------------|
  | `pass`                                 | cross to `drive verify` — the existing clean-gate path            |
  | `fail`                                 | re-`drive continue` carrying the record, up to `cap`              |
  | `indeterminate`                        | halt `grade-indeterminate`                                        |
  | `indeterminate` / `rubric-unconfigured`| **proceed exactly as today** — validate and the doctor decide     |

  That last row is the whole no-regression rule (`ADR-002` §3, `ADR-004` §4). It is **not**
  "indeterminate read as `pass`": no path ever records a `pass`, and the record says `indeterminate`
  while the loop behaves byte-for-byte as it does today. A repository that never configured a runner
  meets no new refusal.

  **One new stop id, and the set stays CLOSED.** `LOOP_STOPS` (`src/work-loop.mjs:21-30`) is eight
  frozen members and `53/ADR-005` explicitly rejected an open set because 54 and 63 both read it. It
  gains exactly one producer-backed member — `grade-indeterminate`, produced by `work:grade`
  returning `indeterminate` with a code other than `rubric-unconfigured` — and
  `acd-loop-probe-contract`'s `STOPS` literal widens by exactly one line, which is `53/ADR-014` §4's
  own idiom. The cost to 62, 63 and 78 is named: `stops` is returned in full on every `LoopState`, so
  all three see a ninth member; none of them pattern-matches a stop string, which is precisely why
  the set is closed.

  **The producer is drawn from a code, never from a message match.** `acd-loop-probe-contract`
  already forbids stop attribution by rendered prose, and `68/03` retired that instrument by name.

  ADR-007 §3, §4; ADR-005 §3; `53/ADR-005`; FF-5409.

  Scenario Outline: the verdict decides the act, and nothing else does
    Given a story whose build phase completed
    And a grade returning <verdict> with code <code>
    When the loop reaches its gate block
    Then the loop's act is <act>
    And the loop state records the verdict as <verdict>

    Examples: the closed routing table
      | verdict       | code                  | act                        |
      | pass          | none                  | drive verify               |
      | fail          | case-failed           | drive continue             |
      | indeterminate | runner-timeout        | halt grade-indeterminate   |
      | indeterminate | runner-spawn-failed   | halt grade-indeterminate   |
      | indeterminate | report-missing        | halt grade-indeterminate   |
      | indeterminate | report-unreadable     | halt grade-indeterminate   |
      | indeterminate | report-vacuous        | halt grade-indeterminate   |
      | indeterminate | rubric-unconfigured   | proceed as today           |

  Scenario: an unconfigured rubric meets no new refusal anywhere in the loop
    Given a repository that declares no `work.rubric`
    And a story whose validate and doctor gates report clean
    When the loop reaches its gate block
    Then the loop crosses to `verify`
    And no halt was produced by the grade rung
    And the grade recorded `indeterminate` with `rubric-unconfigured`
    And no path recorded a `pass`

  Scenario: a failing grade re-drives up to the cap and then exhausts
    Given a story whose grade returns `fail` on every cycle
    When the loop runs to its cap
    Then each cycle re-drives `continue`
    And the cycle at the cap halts on `cap-exhausted`
    And the halt carries the accumulated record

  Scenario: an indeterminate grade halts immediately rather than retrying
    Given a story whose grade returns `indeterminate` with `runner-timeout`
    When the loop reaches its gate block
    Then the loop halts on `grade-indeterminate`
    And it does not re-drive the build
    And the cycle count was not consumed by a retry

  Scenario: the stop's producer names the code, never a message
    Given a story whose grade returns `indeterminate` with `report-vacuous`
    When the loop halts
    Then the halt's producer names the grade command and that code
    And no part of the attribution matched rendered prose

  Scenario: the stop set every loop state reports gains exactly one member
    Given any loop state this shell returns
    Then the stop set it reports is exactly nine ids
    And `grade-indeterminate` is one of them
    And the other eight are the ones reported today, unrenamed
    And the refusals the loop can report are unchanged

  Scenario: a passing grade crosses to verify by the path that already exists
    Given a story whose validate and doctor gates report clean
    And a grade returning `pass`
    When the loop reaches its gate block
    Then the loop drives `verify` for that story
    And it does so without asking `work:next` for a fresh decision
    And the grade is recorded on the run that produced it
