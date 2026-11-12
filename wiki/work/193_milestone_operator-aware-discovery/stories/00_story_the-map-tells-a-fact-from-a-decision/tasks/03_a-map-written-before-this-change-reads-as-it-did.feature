@executable @cli @work @validate
Feature: A map written before this change reads as it did

  WHY. Delivered maps are never rewritten, and stories in flight carry maps that say `business`
  (SPEC Scope, first bullet). The new vocabulary is added beside the old one, so every line that
  parsed before parses to the same value, and every answer the old queries gave is the answer the
  new ones give for the same map (ADR-001, Consequences).

  Rule: R4 · A map written before this change reads exactly as it did

    Scenario: E10 · a delivered map parses to the value it parsed to before
      Given a fixture copy of story 189/00's map, with one "business · answered" question and one example labelled "[stated Q1]"
      When the map is parsed
      Then its rules, examples, questions and malformed lines are what they were before this story
      And every example carries a "finding" that is null

    Scenario: E11 · a business question is open and closed as before
      Given a map holding "- Q1 · business · asked · x" and "- Q2 · business · answered · y"
      When the map is asked which questions are still open
      Then it answers Q1 and not Q2

    Scenario: the default template is untouched and is still a legal map
      When ".aof/templates/work/story/EXAMPLES.md" is parsed
      Then the map reports no malformed line
      And its four questions read as "business" three times and "technical" once
      And "aof work update --dry-run --json" plans no change to it

    Scenario Outline: every label the old grammar admitted still reads the same
      Given a rule holding "- E1 · some outcome <label>" and a question Q2
      When the map is parsed
      Then example E1 has provenance "<provenance>" and question <question>

      Examples:
        | label       | provenance | question |
        | [proposed]  | proposed   | null     |
        | [confirmed] | confirmed  | null     |
        | [stated Q2] | stated     | "Q2"     |

    Scenario: the claims a person must stand behind are unchanged for an old map
      Given a map with example E2 labelled "[confirmed]", example E3 labelled "[stated Q1]" and question Q1 "business · answered"
      When the map is asked for the claims a person must stand behind for story "134/02"
      Then it answers E2 by the token "134/02 E2", and E3 and Q1 by the token "134/02 Q1"

    Scenario: the trace still exempts only a proposed example
      Given a contract formulated from a map whose rule R1 holds E1 "[proposed]", E2 "[confirmed]" and E3 "[researched F1]"
      And the contract carries none of the three
      When the map is asked which examples the contract does not carry
      Then it answers E2 and E3, and not E1
