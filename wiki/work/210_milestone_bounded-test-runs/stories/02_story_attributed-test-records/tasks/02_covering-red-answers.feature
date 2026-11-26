@cli @work @validate
Feature: a red answers a narrower question when every failure is attributed

  WHY. Concurrent review lanes may each name a subset of the suites the build already ran. Before
  this milestone a red answered only the identical question, because a case name did not reliably
  name its file (m190/ADR-002). With every failure attributed, a covering red can answer a subset
  honestly. A red with any unattributed failure keeps the old rule, so it is never split on a
  guess (ADR-002).

  Rule: R3 · A red answers a narrower question when every failure is attributed

    @executable
    Scenario: E6 · a red is answered green for suites that held none of its failures
      Given a red record on this content over suites "a", "b" and "c", whose one failure is in "b"
      When the same content is asked about suites "a" and "c"
      Then the question is answered from that record
      And the answer is green, with no failures

    @executable
    Scenario: E7 · a red is answered red for the suite that held its failure
      Given the same red record
      When the same content is asked about suite "b" alone
      Then the question is answered from that record
      And the answer is red, with the one failure in "b"

    @executable
    Scenario: E8 · an unattributed failure keeps the identical-question rule
      Given a red record over suites "a" and "b" with one failure whose file is null
      When the same content is asked about suite "a" alone
      Then the record does not answer, and a run is needed

    @executable
    Scenario Outline: what a record answers
      Given a <result> record on this content over suites "a" and "b"
      When <question> is asked
      Then the record <answers>

      Examples:
        | result                          | question                                  | answers                       |
        | green                           | suite "a" on the same content             | answers it green              |
        | red with failures in "a" only   | suites "a" and "b" on the same content    | answers it red                |
        | red with failures in "a" only   | suites "a", "b" and "c" on the same content | does not answer             |
        | red with failures in "a" only   | suite "b" on changed content              | does not answer               |
        | not-finished                    | suite "a" on the same content             | does not answer               |
