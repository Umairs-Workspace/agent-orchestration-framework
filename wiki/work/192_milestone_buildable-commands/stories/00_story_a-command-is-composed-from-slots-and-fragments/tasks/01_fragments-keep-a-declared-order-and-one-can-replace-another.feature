@executable @cli @assets @distribution
Feature: Fragments keep a declared order and one can replace another

  WHY. Two practices may add to one slot, and a practice may ship a variant of its own beat. The
  result must be the same on every machine, so the order is read from where a fragment is
  declared, and a replacement is declared, never inferred (ADR-002 §4, §5).

  The fixture is the command "demo" with the block slot "demo.notes". The practice "alpha" is
  contributed by the package registered first and "beta" by the package registered second. Each
  is keyed on its own key, "work.alpha.enabled" and "work.beta.enabled", and each has one
  fragment in the slot: the line "Alpha." and the line "Beta.".

  Rule: R2 · Fragments fill a slot in a declared order, and a fragment can replace another from its own package

    Scenario: E4 · the contributor registered first comes first
      Given a project whose config turns both practices on
      When "demo" is rendered
      Then the slot holds "Alpha.", a blank line, "Beta."

    Scenario: within one contributor, the order is the order of its members
      Given the first package declares a second fragment in the slot, the line "Alpha two.", after "Alpha."
      And a project whose config turns both practices on
      When "demo" is rendered
      Then the slot holds "Alpha.", "Alpha two." and "Beta.", in that order

    Scenario: the order does not follow the order of the keys in the config
      Given a project whose config names "work.beta" before "work.alpha", both on
      When "demo" is rendered
      Then the slot still holds "Alpha." before "Beta."

    Scenario: E5 · a fragment that replaces another is rendered in its place
      Given the first package declares a practice "alpha-plus", keyed on "work.alpha.enabled" and "work.alpha.plus"
      And its fragment, the line "Alpha plus.", replaces the fragment "Alpha."
      And a project whose config turns "alpha" and "alpha-plus" on
      When "demo" is rendered
      Then the slot holds "Alpha plus."
      And it does not hold "Alpha."

    Scenario: E6 · with the replacement off, the original renders
      Given the same two fragments
      And a project whose config sets "work.alpha.enabled" to true and leaves "work.alpha.plus" out
      When "demo" is rendered
      Then the slot holds "Alpha."
      And it does not hold "Alpha plus."

    Scenario: a replacement leaves the other fragments of the slot alone
      Given "alpha", "alpha-plus" and "beta" are all on
      When "demo" is rendered
      Then the slot holds "Alpha plus." and "Beta.", and not "Alpha."

    Scenario Outline: the same input renders the same bytes
      Given a project whose config turns both practices on
      When "demo" is rendered twice, <how>
      Then the two renders are byte for byte the same

      Examples:
        | how                                        |
        | for the same project directory             |
        | for two project directories at other paths |
