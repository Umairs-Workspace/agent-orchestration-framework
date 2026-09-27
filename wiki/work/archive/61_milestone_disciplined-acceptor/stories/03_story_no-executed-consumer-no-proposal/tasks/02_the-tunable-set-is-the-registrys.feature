@executable @cli @work @validate
Feature: What may be tuned at all is the registry's declaration, never a list this machinery keeps

  A machine that can widen its own tunable set has no frozen set. If the acceptor held its own list of
  knobs, then "may this be tuned?" would be answered out of a file the component wanting a yes is free
  to edit, and every control built on top of that answer would be decoration. So the set lives where
  it already lives — on the arbiter record that declares which parameters it tunes — and is read from
  there each time the question is asked.

  This is what makes enforcing rather than redrawing structural instead of aspirational. Membership
  was decided elsewhere, on a criterion this machinery gets no vote in; here the declaration is only
  consulted. The consequence to hold on to is that there is exactly one home: change the declaration
  and what may be proposed changes with it, in both directions, with nothing else edited.

  The distinction worth arguing about is between naming a key and holding one. Quoting a key inside a
  refusal so a human can read it is a diagnostic. Carrying a key as something this machinery acts on
  is a second home for the set, and a second home is the whole defect. The observable form of "it
  holds none" is that when the declaration is empty nothing may be proposed at all — there is no
  built-in list underneath to fall back on.

  ADR-008 §4, ADR-009 §5. FF-6110.

  Scenario Outline: membership in the declared set decides whether a proposal is considered at all
    Given a proposal naming <key>
    When it is assessed
    Then it is <verdict>

    Examples:
      | key                                                        | verdict                                     |
      | a key the registry declares tunable                        | considered, and judged on the other grounds |
      | a real bound that no record declares tunable               | refused as outside the declared set         |
      | a key that names no bound at all                           | refused as outside the declared set         |
      | a declared key differing only in case or surrounding space | refused as outside the declared set         |

  Scenario: a key added to the declaration becomes proposable with nothing else edited
    Given a key the registry does not declare tunable, and a proposal on it refused
    When the declaration is changed to include that key
    And the proposal is assessed again
    Then it is no longer refused for being outside the declared set
    And the only thing that changed is the registry's declaration

  Scenario: a key dropped from the declaration stops being proposable
    Given a key the registry declares tunable
    When the declaration is changed to drop it
    And a proposal on it is assessed
    Then it is refused as outside the declared set

  Scenario: an empty declaration admits nothing rather than falling back on a built-in set
    Given a registry that declares no tunable knob at all
    When a proposal naming any key is assessed
    Then it is refused as outside the declared set
    And no knob is offered as tunable in the declaration's place

  Scenario: what may be proposed and what the registry declares are the same set
    Given the registry's declaration of what it tunes
    When the set of proposable keys is asked for
    Then it is identical to the declared set
    And no key is proposable that the declaration does not carry

  Scenario: the refusal names the key and the declaration it is absent from
    Given a proposal refused for naming a key outside the declared set
    When the refusal is read
    Then it names the key that was proposed
    And it names the declaration that was consulted
    And it is distinguishable from a refusal for want of an executed consumer

  Scenario: a key quoted in a refusal is a diagnostic, not a claim of membership
    Given a refusal that quotes the key it refused
    When the set of proposable keys is asked for again
    Then the quoted key is not a member
    And the set is still exactly what the registry declares

  Scenario: consulting the declaration asks nothing new of the registry
    Given the registry's declaration as it is already written
    When the tunable set is resolved from it
    Then it resolves without any record carrying a new field or a new kind of pointer
    And the vocabulary a record may declare is unchanged
