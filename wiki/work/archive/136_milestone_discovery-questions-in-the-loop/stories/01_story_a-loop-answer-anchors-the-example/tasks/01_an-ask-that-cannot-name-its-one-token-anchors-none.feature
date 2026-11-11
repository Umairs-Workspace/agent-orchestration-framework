@executable @cli @work @work-stream
Feature: An ask that cannot name its one token anchors none, and the ask is read as an answer in one place

  WHY. 131's answer is one text. An ask whose question carries two tokens cannot say which part of
  the answer settled which token, so it anchors neither: an unanchored claim, never a wrong one
  (ADR-001 §2). The token is read only by the package's "readMapToken", at the head of a line.
  FF-13601 keeps the read of "asks" inside the one collector, so the doctor lane and the build door
  cannot grow a second checker.

  THE FIXTURE BELOW: story "7/2", with "work.examples.enabled" true, and one run of the story whose
  "asks" holds the entry under test, answered "Yes" at "2026-10-03T10:02:00.000Z" via "cli".

  Rule: R2 · A loop question that cannot say which token it answered anchors none

    Scenario: E4 · an ask carrying two tokens anchors neither
      Given the ask's question is "7/2 Q1 · Does a reserved book count?", a blank line, then "7/2 Q2 · May a member swap a book?"
      When "collectAnswers" is called for "7/2"
      Then it returns no record whose token is "7/2 Q1"
      And it returns no record whose token is "7/2 Q2"

    Scenario: E5 · an ask with no token at its head anchors nothing, and the reader does not fail
      Given the ask's question is "Decision needed: does a reserved book count?"
      When "collectAnswers" is called for "7/2"
      Then it resolves without throwing
      And it returns no record

    Scenario Outline: which question shapes anchor
      Given the ask's question is <question>
      When "collectAnswers" is called for "7/2"
      Then it returns <records>

      Examples:
        | question                                                            | records                            |
        | "7/2 Q1 · Discovery question …" then the lines "- Yes" and "- No"   | one record whose token is "7/2 Q1" |
        | "7/2 E2 · Is a sixth loan refused while five are out?"              | one record whose token is "7/2 E2" |
        | "7/2 Q1"                                                            | one record whose token is "7/2 Q1" |
        | "7/2 Q1 · Unlike 7/2 Q2, does a reserved book count?"               | one record whose token is "7/2 Q1" |
        | "7/2 Q1 · Does a reserved book count?" then the line "7/2 E3 · …"   | no record                          |
        | " 7/2 Q1 · a leading space"                                         | no record                          |
        | "Q1 · no story ref"                                                 | no record                          |

    Scenario Outline: an entry with no answer anchors nothing
      Given the ask's question opens "7/2 Q1 · " and its <field> is <value>
      When "collectAnswers" is called for "7/2"
      Then it returns no record

      Examples:
        | field      | value         |
        | answer     | null          |
        | answer     | an empty text |
        | answeredAt | null          |

    Scenario Outline: a run whose asks cannot be read yields no ask records and does not stop the others
      Given one run of "7/2" carries asks that are <shape>
      And another run of "7/2" carries an answered ask whose question opens "7/2 Q1 · "
      When "collectAnswers" is called for "7/2"
      Then it resolves without throwing
      And it returns exactly one record whose token is "7/2 Q1"

      Examples:
        | shape                               |
        | not an array                        |
        | an array holding a number           |
        | an array holding null               |
        | an entry whose question is a number |

  Rule: The ask is read as an answer in one place

    Scenario: FF-13601 holds on the tree
      When "test/arch/examples/acd-example-answer-one-reader.test.mjs" is run
      Then its FF-13601 case passes

    Scenario: FF-13601 goes red on a second reader of the ask
      Given a line reading a run record's "asks" is added to "packages/specification-by-example/src/doctor-lane.mjs"
      When "test/arch/examples/acd-example-answer-one-reader.test.mjs" is run
      Then its FF-13601 case fails and names "doctor-lane.mjs"

    Scenario: FF-13601 goes red on a token pattern of the reader's own
      Given a regular expression matching "Q" followed by digits is added to "packages/specification-by-example/src/answers.mjs"
      When "test/arch/examples/acd-example-answer-one-reader.test.mjs" is run
      Then its FF-13601 case fails and names "answers.mjs"
