@executable @cli @work @validate
Feature: A decision is closed only by a person's answer

  WHY. Research must never decide for the operator. A `policy` question keeps the rule `business`
  had: only `answered` closes it, and neither a default nor a finding does (ADR-001 §4). A map
  written before this milestone says `business`, and its findings must not change by a word.

  Background:
    Given a project with "work.examples.enabled" true
    And story "192/01" in status "in-progress" under milestone "192"
    And the milestone's "RESEARCH.md" holds a sourced finding "F2"

  Rule: R2 · A decision is closed only by a person's answer

    Scenario: E4 · a finding does not close a decision
      Given the story's map holds "- Q2 · policy · researched F2 · How many days of arrears before we chase?"
      When "aof work doctor 192/01 --json" runs
      Then it reports "example-question-open" at severity "error"
      And the message names "Q2", calls it a policy question, and says a person must answer it before the build

    Scenario: E5 · a business question reports exactly what it reported before
      Given the story's map holds "- Q3 · business · open · Does a reserved book count toward the five?"
      When "aof work doctor 192/01 --json" runs
      Then the "example-question-open" finding's code, severity, path and message are what they were before this story

    Scenario Outline: only an answer closes a question a person owns
      Given the story's map holds "- Q1 · <class> · <state> · x"
      And an answer record carries the token "192/01 Q1"
      When "aof work doctor 192/01 --json" runs
      Then "example-question-open" is <reported> for "Q1"

      Examples:
        | class    | state             | reported     |
        | policy   | open              | reported     |
        | policy   | asked             | reported     |
        | policy   | defaulted ADR-004 | reported     |
        | policy   | researched F2     | reported     |
        | policy   | answered          | not reported |
        | business | researched F2     | reported     |
        | business | answered          | not reported |

    Scenario: an answered decision still needs its answer record
      Given the story's map holds "- Q1 · policy · answered · x"
      And no answer record carries the token "192/01 Q1"
      When "aof work doctor 192/01 --json" runs
      Then it reports "example-provenance-unanchored" for "Q1"

    Scenario: a technical question is still not gated
      Given the story's map holds "- Q4 · technical · open · Is the limit read from config?"
      When "aof work doctor 192/01 --json" runs
      Then it reports no "example-question-open" for "Q4"
