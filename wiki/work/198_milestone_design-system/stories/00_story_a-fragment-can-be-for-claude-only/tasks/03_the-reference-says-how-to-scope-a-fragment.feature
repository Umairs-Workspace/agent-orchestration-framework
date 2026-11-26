@executable @docs @assets @distribution
Feature: The reference says how to scope a fragment to its runtimes

  WHY. 198/02 writes the first Claude-only practice, and the next practice's author will read
  "wiki/reference/practice-prose.md" rather than the loader. The page says how to declare a
  fragment's runtimes, what it then needs and what is refused, in the order an author needs it
  (ADR-001).

  Scenario Outline: the page answers each question about a scoped fragment
    When "wiki/reference/practice-prose.md" is read
    Then it says <answer>

    Examples:
      | answer                                                                                              |
      | how a fragment names its runtimes with "runtimes", with one written out                             |
      | that leaving "runtimes" out means every runtime, as before                                          |
      | that a scoped fragment needs a body only for the runtimes it names, and that a body for any other is refused |
      | that a runtime it names takes the common body when that runtime renders the member's common source   |
      | that OpenCode and Claude Code are given different texts when a scoped fragment is on for only one of them |
      | that a scoped replacer replaces only in its own runtimes                                            |
      | that the practice list names the runtimes of a practice whose fragments are all scoped              |

  Scenario: the page's refusals list names the scoped fragment's refusals
    When the section of "wiki/reference/practice-prose.md" on what is refused at load is read
    Then it names a runtime outside the capability matrix, an empty list, and a body for a runtime the fragment does not name

  Scenario: the scoped specimen on the page is one the loader accepts
    Given each bundle fragment specimen on the page that declares "runtimes", taken out of its code block
    When it is handed to the loader beside a fixture member that carries the slot it names
    Then the load succeeds
    And a render for a runtime the specimen does not name holds none of its body

  Scenario: the page stays within its budget
    When "wiki/reference/practice-prose.md" is read
    Then it is at most 150 lines
    And it holds no "Alternatives" section
