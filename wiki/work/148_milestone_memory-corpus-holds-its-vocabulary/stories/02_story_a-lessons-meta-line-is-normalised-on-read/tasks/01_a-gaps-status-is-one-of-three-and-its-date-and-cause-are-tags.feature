@executable @cli @work @memory
Feature: A gap's status is indexed as open, discharged or open-by-decision, with its date and cause as tags

  WHY. 381 gaps were measured with 11 spellings of their status: authors write the discharge date and
  cause into the field ("discharged (2026-08-23, at 54's verify)"). "--status discharged" matches
  them only by substring, and nothing can count them. ADR-002 §5 applies the same rule as a lesson's
  meta line: the leading vocabulary word is the status, and the rest becomes a tag. Longer words are
  tried first, so "open by decision" is never "open" with a tag.

  THE FIXTURE BELOW: an OUTCOME.md whose "## Gaps" section holds "### A cited path in a shipped
  asset" with the Status line each scenario names, then "- **Discharge condition:** a probe resolves
  every cited path". It is parsed by "parseOutcome" with item "119/03".

  Rule: R3 · A gap's status is open, discharged or open-by-decision, and its date and cause become tags

    Scenario: E9 · a discharge with its cause in parentheses
      Given the Status line "- **Status:** discharged (by story `86`, 2026-09-04)"
      When the outcome is parsed
      Then the gap's status is "discharged"
      And its tags are ["by story 86, 2026-09-04"]

    Scenario: E10 · "open by decision" is its own status, not "open" with a tag
      Given the Status line "- **Status:** open by decision"
      When the outcome is parsed
      Then the gap's status is "open-by-decision"
      And its tags are []

    Scenario: E11 · a gap with no Status line is open
      Given the gap carries no Status line
      When the outcome is parsed
      Then the gap's status is "open"
      And its tags are []

    Scenario Outline: the spellings measured on the live corpus
      Given the Status line "- **Status:** <written>"
      When the outcome is parsed
      Then the gap's status is "<status>"
      And its tags are <tags>

      Examples:
        | written                                                                     | status           | tags                                                                       |
        | open                                                                        | open             | []                                                                         |
        | discharged                                                                  | discharged       | []                                                                         |
        | discharged 2026-08-23 by `m70/05`                                           | discharged       | ["2026-08-23 by m70/05"]                                                   |
        | discharged (2026-08-23, at 54's verify) — **but not by the mechanism**      | discharged       | ["(2026-08-23, at 54's verify) — but not by the mechanism"]                 |
        | open-by-decision                                                            | open-by-decision | []                                                                         |
        | pending                                                                     | pending          | []                                                                         |

    Scenario: a gap's other fields are unchanged
      Given the Status line "- **Status:** discharged (by story `86`, 2026-09-04)"
      When the outcome is parsed
      Then the gap's title, summary, text and source equal those a parse with the Status line "- **Status:** discharged" yields

    Scenario: a gap-status scope is exact on the vocabulary word
      Given two gaps, one "discharged (by story `86`, 2026-09-04)" and one "open by decision"
      When "recall" runs with scope status "discharged"
      Then it returns the first gap and not the second
