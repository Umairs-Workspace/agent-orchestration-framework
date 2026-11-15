@executable @cli @work @validate
Feature: A question is a fact about the world, a decision, or an engineering choice

  WHY. One label, `business`, covered both "what does the regulation require" and "what risk will
  you accept", so both could only wait for the operator (ADR-001). The grammar gains `domain` for
  the first and `policy` for the second. `business` stays readable, and a class the parser does not
  know still reads as the strictest one, so a typo can only make the gate stricter (ADR-001 §5).

  Rule: R1 · A question is a fact about the world, a decision, or an engineering choice

    Scenario: E1 · a domain question parses as a fact
      Given a map whose Questions section holds "- Q1 · domain · open · What notice must a landlord give before entry?"
      When the map is parsed
      Then question Q1 has class "domain" and state "open"
      And the map reports no malformed line

    Scenario: E2 · a policy question parses as a decision
      Given a map whose Questions section holds "- Q2 · policy · open · How many days of arrears before we chase?"
      When the map is parsed
      Then question Q2 has class "policy"
      And the map reports no malformed line

    Scenario: E3 · a class the grammar does not know reads as the strictest one
      Given a map whose Questions section holds "- Q3 · regulatory · open · Which body licenses this?"
      When the map is parsed
      Then question Q3 has class "business"
      And the line is reported malformed with reason "bad-class"

    Scenario: the class vocabulary is four words, exported once
      When the package's question classes are read
      Then they are exactly "domain", "policy", "technical" and "business"
      And the list is frozen

    Scenario Outline: a question's class is read by position, and only an exact word is admitted
      Given a map whose Questions section holds "<line>"
      When the map is parsed
      Then question Q1 has class "<class>" and state "<state>"
      And its malformed reason is <reason>

      Examples:
        | line                                         | class     | state     | reason      |
        | - Q1 · domain · asked · x                    | domain    | asked     | none        |
        | - Q1 · policy · answered · x                 | policy    | answered  | none        |
        | - Q1 · technical · defaulted ADR-004 · x     | technical | defaulted | none        |
        | - Q1 · business · open · x                   | business  | open      | none        |
        | - Q1 · Domain · open · x                     | business  | open      | "bad-class" |
        | - Q1 · policy/domain · open · x              | business  | open      | "bad-class" |
        | - Q1 ·  · open · x                           | business  | open      | "bad-class" |
        | - Q1 · domain · pending · x                  | domain    | open      | "bad-state" |

    Scenario: a question's text may itself hold the separator
      Given a map whose Questions section holds "- Q1 · domain · open · Notice · in days or hours?"
      When the map is parsed
      Then question Q1 has the text "Notice · in days or hours?"
