@executable @cli @work @validate
Feature: The frozen vocabularies — nine codes, three verdicts, and every code with a producer

  The grade record is the loop's termination evidence. If its vocabulary can drift, every decision
  downstream of it drifts too — so the verdict set is a closed triple and the code set is exactly
  nine, in their own frozen order (ADR-005 §1, §3).

  **This task is the BEHAVIOURAL half; FF-5403 is the structural half, and they must not be
  confused.** FF-5403 (`acd-grade-record-envelope.test.mjs`) asserts that the sets are frozen, that
  `GRADE_CODES` is set-equal to the nine, and that the record's key set is exact. This feature
  asserts something the arch-test cannot: **what PRODUCES each member, and what each one does to the
  verdict.** `m20/R2` names the hole it closes — *a frozen and classified key with no writer is a
  contract hole* — and `66`'s non-vacuity rule requires every one of the nine to be reachable by a
  fixture, or it is frozen and dead.

  **Ownership, so no reviewer mistakes an inert rule for a missing one.** This story is a pure leaf
  (`src/work-grade.mjs`, ADR-003 §1): no spawn, no `node:fs`, no clock, no command. It COMPILES a
  record from observations that are handed to it; the impure edge that gathers them is 54/01, and
  the code that produces the two advisory observations is 54/04's join lane (ADR-006 §5). What is
  proven here is that every member of the vocabulary has a defined effect on the verdict — including
  the two whose effect is deliberately nothing.

  ADR-005 §1, §3, §4; ADR-006 §4.

  Scenario Outline: every code in the frozen nine has a producing observation and a settled verdict
    Given a grade compiled for an item from <observation>
    When the record is read
    Then its `codes` contain <code>
    And its `verdict` reads <verdict>

    Examples: the runner aof could not launch, could not outlast, or could not read — INDETERMINATE
      | observation                                                              | code                 | verdict       |
      | a project that declares no `work.rubric` at all                          | rubric-unconfigured  | indeterminate |
      | a runner observation reporting that the process never started            | runner-spawn-failed  | indeterminate |
      | a runner observation reporting that the deadline elapsed and it was killed | runner-timeout     | indeterminate |
      | a completed runner whose declared report is absent from disk             | report-missing       | indeterminate |
      | a report present on disk that does not parse in its declared format      | report-unreadable    | indeterminate |
      | a report that parses but enumerates no named case                        | report-vacuous       | indeterminate |

    Examples: the runner reported a red — FAIL
      | observation                                                              | code                 | verdict       |
      | a report enumerating at least one case whose status is a failing one     | case-failed          | fail          |

  Scenario Outline: the two advisory codes are recorded and change nothing
    Given a grade whose evidence is otherwise complete and whose every case passed
    And the join observation <advisory>
    When the record is read
    Then its `codes` contain <code>
    And its `verdict` reads `pass`

    Examples:
      | advisory                                                   | code              |
      | an enumerated case that names no `@executable` scenario     | case-unjoined     |
      | an `@executable` scenario that no enumerated case names     | scenario-unjoined |

  Scenario: an advisory code does not rescue a failing grade either
    Given a grade whose report enumerates a failing case
    And a join observation reporting an unjoined case
    When the record is read
    Then its `verdict` reads `fail`
    And its `codes` contain both `case-failed` and `case-unjoined`

  Scenario: codes are reported in the vocabulary's own frozen order, not in the order observed
    Given a grade whose observations arrive in an order that is not the vocabulary's order
    When the record is read
    Then its `codes` appear in `GRADE_CODES`' own declared order
    And two grades carrying the same set of codes report them identically

  Scenario: the observed counts are always reported, including when there was nothing to count
    Given a grade compiled for a project that declares no `work.rubric`
    When the record is read
    Then `cases` reports a total, a failed count and a skipped count
    And each of those counts reads zero rather than being absent
    And `runner` and `report` each read null, because nothing was run and nothing was read

  Scenario: a run that happened is reported verbatim, whatever the verdict
    Given a grade compiled from a runner observation that did complete
    When the record is read
    Then `runner` reports the command that was actually run, its working directory, its exit status and its duration
    And those values are the observed ones, not values re-derived from the verdict

  Scenario: no join is performed at this layer, and none is guessed
    Given a grade compiled from a report enumerating a failing case
    And no join observation of any kind
    When the record is read
    Then the failure is listed with the case identity and the message the runner emitted
    And its `scenario` reads null
    And neither advisory code appears, because an absent join is not an unjoined one
