@executable @docs @work @planning
Feature: The discovery beat tells a fact from a decision

  WHY. The beat sorted every question into `business` or `technical`, and one nobody could place
  was `business`, so it went straight to the operator (SPEC Objective). The PO now labels a
  question `domain`, `policy` or `technical`, and one it cannot place is `domain`, so it is
  researched before anyone is asked (ADR-004 §1). The architect's review of `technical` labels
  learns the second destination.

  THE TEXTS UNDER TEST are renders, not sources. "The fixture" is a scratch project whose
  "work.examples" is "{ enabled: true, operatorAware: true }", rendered for Claude. "The discovery
  passage" is the story Contract's discovery passage of the fixture's refine command; "the PO
  brief" and "the architect brief" are its rendered agents. The checks pin content, not wording,
  as 134/05's suite does.

  Rule: R1 · A question the PO cannot place is a fact to research, not a question for the operator

    Scenario: E1 · a question the PO cannot place is labelled a fact
      When the discovery passage is read
      Then it says the PO labels every question "domain", "policy" or "technical"
      And it says a "domain" question is a fact about the world and a "policy" question is a choice only the operator or their client can make
      And it says a question the PO cannot place is "domain"

    Scenario: E2 · a decision is asked, and never defaulted
      When the discovery passage is read
      Then it says a "policy" question is asked of a person and never takes a default
      And it says a "technical" question may still take a documented default, recorded as "defaulted <pointer>"

    Scenario: E3 · the architect relabels a fact as a fact
      When the discovery passage and the architect brief are read
      Then each says the architect reviews every question labelled "technical"
      And each says one that is really a fact about the world is relabelled "domain"
      And each says one that is really a choice is relabelled "policy"

    Scenario: the PO brief carries the three labels and the new default
      When the PO brief is read
      Then it says to label every question "domain", "policy" or "technical"
      And it says a question the PO cannot place is "domain"
      And it says the PO never writes "researched" without a finding that names its source

    Scenario: with the switch on, nothing teaches the old label
      When the discovery passage, the PO brief and the architect brief are read
      Then none tells an agent to label a question "business"
      And the discovery passage says a map written with "business" still reads, as "policy"
      And the passage holds no sentence of the beat a project with the switch off is given

    Scenario: striking is unchanged
      When the discovery passage is read
      Then it still says to strike every question the record already answers before any question reaches a person
      And it says a map with no "policy" question left is a good outcome

    Scenario Outline: the label specimens the passage teaches are ones the parser reads
      Given a question line built from the passage's "<label>" specimen
      When it is parsed through the package's map parser
      Then it reads as class "<label>" with no malformed line

      Examples:
        | label     |
        | domain    |
        | policy    |
        | technical |

    Scenario: the passage still restates no line of the grammar
      When the discovery passage is read
      Then it points at the story template for the map's form
      And it holds no rule heading, example line or question line of the map
      And the template the fixture was given shows a "domain" and a "policy" question
