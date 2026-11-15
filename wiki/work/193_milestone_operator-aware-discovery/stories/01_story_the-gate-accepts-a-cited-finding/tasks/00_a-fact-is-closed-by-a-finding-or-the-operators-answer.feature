@executable @cli @work @validate
Feature: A fact is closed by a cited finding or by the operator's own answer

  WHY. Until now the lane knew one way to close a question a person owns: their recorded answer.
  A `domain` question has two (ADR-001 §4): a finding the research document holds, with its
  source, or the answer of an operator who is expert in that domain. Either satisfies the lane,
  and an open fact says what it is waiting for (ADR-002 §1).

  Background:
    Given a project with "work.examples.enabled" true
    And story "193/01" in status "in-progress" under milestone "193"

  Rule: R1 · A fact is closed by a cited finding or by the operator's own answer

    Scenario: E1 · a sourced finding closes the question
      Given the story's map holds "- Q1 · domain · researched F2 · What notice must a landlord give before entry?"
      And the milestone's "RESEARCH.md" holds the heading "## F2 · What notice must a landlord give before entry?" with a Source line
      When "aof work doctor 193/01 --json" runs
      Then it reports no "example-question-open" and no "example-research-unanchored" for the story

    Scenario: E2 · an open fact says it is waiting on research
      Given the story's map holds "- Q1 · domain · open · What notice must a landlord give before entry?"
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-question-open" at severity "error" for the story's "EXAMPLES.md"
      And the message names "Q1" and its line, calls it a domain question, and says research must settle it or the operator must answer it

    Scenario: E3 · the operator's own answer closes the question
      Given the story's map holds "- Q1 · domain · answered · What notice must a landlord give before entry?"
      And an answer record carries the token "193/01 Q1"
      When "aof work doctor 193/01 --json" runs
      Then it reports no finding for "Q1"

    Scenario: an answered fact with no answer record is unanchored, as any answered question is
      Given the story's map holds "- Q1 · domain · answered · What notice must a landlord give before entry?"
      And no answer record carries the token "193/01 Q1"
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-provenance-unanchored" for "Q1"

    Scenario Outline: a fact in any other state is still open
      Given the story's map holds "- Q1 · domain · <state> · x"
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-question-open" for "Q1", and the message gives its state as "<state>"

      Examples:
        | state             |
        | open              |
        | asked             |
        | defaulted ADR-004 |

    Scenario Outline: the finding takes the acceptance horizon
      Given the story is in status "<status>"
      And its map holds "- Q1 · domain · open · x"
      When "aof work doctor 193/01 --json" runs
      Then "example-question-open" is reported at severity "<severity>"

      Examples:
        | status      | severity |
        | not-started | error    |
        | in-progress | error    |
        | in-review   | error    |
        | done        | warn     |
