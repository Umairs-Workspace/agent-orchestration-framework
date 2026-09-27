@executable @cli @work @work-stream
Feature: A loop can never declare its own ground, and an anchor can never be backed by a paragraph

  Two admission rules carry most of this milestone's honesty, and both are refusals.

  The first is inherited: a loop asserting its own ground is the circular confirmation the grounding
  check exists to detect. Widening the set of ground classes must not widen the set of nodes allowed
  to claim one. Five new values make this rule more load-bearing than it was, not less — it is far
  more tempting to write "this loop observes a real exit code" than "this loop is grounded".

  The second is new and applies only here. Everywhere else in the registry a paragraph is an honest
  declared gap: a field whose only authority is prose says so, and the registry counts how much of
  itself is still paragraph-backed. An anchor is the one node class where that answer is not
  available, because an anchor backed by a paragraph anchors nothing.

  ADR-001. FF-5501.

  Scenario: a loop declaring ground is refused
    Given a loop record carrying a ground class
    When the registry is loaded
    Then the key is refused on that node
    And the message says ground is not admitted on a loop

  Scenario Outline: the host does not widen with the enum
    Given a record of kind <kind> carrying a ground key
    When the registry is loaded
    Then the key is <outcome>

    Examples: five new classes, and still exactly two hosts
      | kind   | outcome  |
      | actor  | admitted |
      | anchor | admitted |
      | loop   | refused  |

  Scenario: an anchor with no authority to observe is refused
    Given an anchor record with no declared authority
    When the registry is loaded
    Then the record is refused as missing a required field

  Scenario Outline: what an anchor may name as the authority it observes
    Given an anchor whose declared authority is <value>
    When the registry is loaded
    Then it is <outcome>

    Examples: the one field in the registry where a declared gap is not admitted
      | value                             | outcome  |
      | a module pointer with a symbol    | admitted |
      | a command pointer                 | admitted |
      | a config pointer                  | admitted |
      | a prose pointer at a document     | refused  |
      | unknown                           | refused  |
      | free text describing an authority | refused  |

  Scenario: refusing an anchor's authority does not refuse the loop it points at
    Given a registry holding one malformed anchor and several well-formed loops
    When the registry is loaded
    Then the malformed anchor is reported by name
    And every well-formed record is still admitted
