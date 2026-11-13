@executable @cli @assets @distribution
Feature: A slot holds what is on and leaves nothing behind

  WHY. A practice's prose is loaded by every project today and then skipped by most of them. A
  slot is a place in a source where a practice may add prose, and it must cost a project nothing
  when no practice does (ADR-001, ADR-003 §1).

  The fixture is a command "demo" whose source is:
    a line "Before.", a blank line, the marker for the slot "demo.notes", a blank line, and a line "After."
  and a practice "notes", keyed on "work.notes.enabled", whose fragment for that slot is the two
  lines "Note one." and "Note two.". A second fixture command, "inline", has the marker for
  "inline.notes" directly under a line "Before." and directly above a line "After.".
  "Rendered" means loaded with the project's config and rendered for Claude.

  Rule: R1 · A slot holds the prose of the practices that are on, and leaves nothing behind when none is

    Scenario: E1 · a practice that is on fills its slot
      Given a project whose config sets "work.notes.enabled" to true
      When "demo" is rendered
      Then its body is "Before.", a blank line, "Note one.", "Note two.", a blank line, "After."
      And it holds no slot marker

    Scenario: E2 · a slot with nothing on leaves nothing behind
      Given a project with no "work.notes" in its config
      When "demo" is rendered
      Then its body is "Before.", a blank line, "After."
      And it holds no slot marker, no empty heading and no doubled blank line

    Scenario Outline: E3 · only the boolean true turns a key on
      Given a project whose config sets "work.notes.enabled" to <value>
      When "demo" is rendered
      Then the fragment is <rendered>

      Examples:
        | value         | rendered |
        | true          | present  |
        | false         | absent   |
        | "true"        | absent   |
        | 1             | absent   |
        | null          | absent   |
        | { "on": true }| absent   |

    Scenario Outline: a practice with two keys is on only when both are
      Given a practice "strict" keyed on "work.notes.enabled" and "work.notes.strict"
      And a project whose config sets them to <first> and <second>
      When "demo" is rendered
      Then the practice's fragment is <rendered>

      Examples:
        | first | second | rendered |
        | true  | true   | present  |
        | true  | absent | absent   |
        | absent| true   | absent   |
        | true  | false  | absent   |

    Scenario Outline: an inline slot joins the text around it
      Given a project whose config sets "work.notes.enabled" to <value>
      When "inline" is rendered
      Then its body is <body>

      Examples:
        | value  | body                                              |
        | true   | "Before.", "Note one.", "Note two.", "After."     |
        | absent | "Before.", "After."                               |

    Scenario: a fragment's own indentation is kept
      Given the fragment's lines are each indented by two spaces
      And a project whose config sets "work.notes.enabled" to true
      When "demo" is rendered
      Then both lines are still indented by two spaces

    Scenario: a source with no slot renders as it did before
      When the shipped bundle is rendered with an empty config
      Then every rendered file has the hash the shipped manifest records for it

  Scenario: FF-19205 · a slot leaves nothing behind
    When "test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs" runs
    Then it fails unless no text the loader returns holds a slot marker, for an empty config and for a config with every declared practice on
    And it fails unless no rendered file holds one, for the same two configs
    And it fails unless composing each source with every practice off equals that source with each marker line removed, and the blank line above a block slot removed

  Scenario Outline: FF-19205 · each planted leak turns the control red
    Given <planted>
    When the FF-19205 cases run
    Then the control fails and names the member and the text that still holds a marker

    Examples:
      | planted                                                              |
      | a reader that returns a member's source without composing it         |
      | a composition that leaves the marker line when no fragment is on     |
      | a composition that leaves the blank line above an empty block slot   |
