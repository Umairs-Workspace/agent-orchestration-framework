@executable @cli @work @validate
Feature: A scenario knows the rule it sits under, and a rule's tags apply to every scenario in it

  WHY. Gherkin 6's `Rule:` groups the scenarios that illustrate one business rule. Today the parser
  accepts the keyword but forgets the grouping, and a tag written above a `Rule:` lands on the next
  scenario only (RESEARCH R2): in the measured probe, a rule tagged `@manual` gave its second
  scenario two verification tags. ADR-003 makes the grouping a fact the parser reports, under new
  keys only. A feature with no `Rule:`, which is every delivered feature, parses to the same value
  under the old keys. FF-5704 holds that over the whole corpus.

  THE FEATURE USED BELOW, in words: a feature named "loans", tagged executable, holds scenario S0
  outside any rule. Then comes rule "R1 · A member may hold at most five loans" with scenarios S1
  and S2. Then rule "R2 · An overdue loan blocks new loans", tagged manual, with a one-step
  Background and then scenarios S3 and S4.

  Scenario Outline: each scenario reports the rule it sits under
    When the feature above is parsed
    Then scenario "<scenario>" reports rule <rule>

    Examples:
      | scenario | rule                                                     |
      | S0       | none                                                     |
      | S1       | "R1 · A member may hold at most five loans" at its line  |
      | S2       | "R1 · A member may hold at most five loans" at its line  |
      | S3       | "R2 · An overdue loan blocks new loans" at its line      |
      | S4       | "R2 · An overdue loan blocks new loans" at its line      |

  Scenario: the parse lists the feature's rules in file order with their own tags
    When the feature above is parsed
    Then it lists 2 rules
    And the first is "R1 · A member may hold at most five loans" with no tags
    And the second is "R2 · An overdue loan blocks new loans" with the tag "@manual"

  Scenario Outline: a rule's tags apply to every scenario in the rule and to no other
    Given the feature-level tag is "<feature tag>" and rule R2's tag is "<rule tag>"
    When the feature is parsed
    Then scenario "<scenario>" has the verification tags "<verification>" and the lane "<lane>"

    Examples:
      | feature tag | rule tag | scenario | verification         | lane       |
      | @executable | @manual  | S1       | @executable          | executable |
      | @executable | @manual  | S3       | @executable, @manual | none       |
      | @executable | @manual  | S4       | @executable, @manual | none       |
      | (none)      | @manual  | S0       | (none)               | none       |
      | (none)      | @manual  | S3       | @manual              | manual     |
      | (none)      | @manual  | S4       | @manual              | manual     |

  Scenario: a tag above a rule is listed once among the feature's tags
    When the feature above is parsed
    Then the tag list holds "@manual" exactly once, at the line above "Rule: R2"

  Scenario: validate reports a doubly tagged scenario under a tagged rule, naming that scenario
    Given a task feature tagged "@executable" whose rule is tagged "@manual"
    When "aof work validate" is run on its story
    Then it reports each scenario in that rule as carrying 2 verification tags
    And it reports no scenario outside that rule

  Scenario: a feature with no Rule parses as it did before
    Given any task feature in the work tree with no "Rule:" line
    When it is parsed
    Then every scenario's rule is none
    And the rule list is empty
    And with the new keys removed, the parse equals the pre-135 parse of the same text
